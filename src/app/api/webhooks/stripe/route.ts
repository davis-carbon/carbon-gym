import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { db } from "@/server/db";
import { sendPaymentFailedEmail } from "@/lib/email";
import { sendPushToClient } from "@/lib/push";
import { firePostPurchaseTrigger } from "@/lib/automation-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const body = await req.text();
  const signature = req.headers.get("stripe-signature") ?? "";

  let event: Stripe.Event;

  try {
    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } else {
      // Fallback for dev — parse without verification (NOT safe for production)
      console.warn("[stripe-webhook] STRIPE_WEBHOOK_SECRET not set — signature NOT verified");
      event = JSON.parse(body) as Stripe.Event;
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[stripe-webhook] Signature verification failed:", message);
    return NextResponse.json({ error: `Webhook signature invalid: ${message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case "payment_intent.succeeded": {
        const intent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentIntentSucceeded(intent);
        break;
      }

      case "payment_intent.payment_failed": {
        const intent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentIntentFailed(intent);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentSucceeded(invoice);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(invoice);
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(sub);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await handleSubscriptionCancelled(sub);
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        await handleRefund(charge);
        break;
      }

      default:
        console.log(`[stripe-webhook] Unhandled event: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[stripe-webhook] Handler failed:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── Handlers ────────────────────────────────────────────────────────────────

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const clientId = session.metadata?.clientId;
  const packageId = session.metadata?.packageId;

  if (!clientId || !packageId) {
    console.warn("[stripe-webhook] checkout.session.completed missing metadata");
    return;
  }

  const pkg = await db.package.findUnique({ where: { id: packageId } });
  if (!pkg) return;

  // Create ClientPackage
  const clientPackage = await db.clientPackage.create({
    data: {
      clientId,
      packageId,
      startDate: new Date(),
      endDate: pkg.expiryDays ? new Date(Date.now() + pkg.expiryDays * 24 * 60 * 60 * 1000) : null,
      sessionsRemaining: pkg.sessionCount ?? null,
      sessionsUsed: 0,
      status: "active",
      stripeSubscriptionId: typeof session.subscription === "string" ? session.subscription : null,
    },
  });

  // Create Payment record
  await db.payment.create({
    data: {
      clientId,
      clientPackageId: clientPackage.id,
      amount: (session.amount_total ?? 0) / 100,
      currency: session.currency ?? "usd",
      status: "SUCCEEDED",
      stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : null,
      description: `${pkg.name} — checkout`,
      invoiceNumber: generateInvoiceNumber(),
      paidAt: new Date(),
    },
  });

  // Update client billing status
  await db.client.update({
    where: { id: clientId },
    data: {
      billingStatus: pkg.billingCycle === "ONE_TIME" ? "PAID" : "BILLED",
    },
  });

  // Fire day-0 post-purchase automations (fire-and-forget)
  const clientRecord = await db.client.findUnique({
    where: { id: clientId },
    select: { organizationId: true },
  });
  if (clientRecord) {
    firePostPurchaseTrigger(clientId, clientRecord.organizationId).catch(() => {});
  }
}

async function handlePaymentIntentSucceeded(intent: Stripe.PaymentIntent) {
  // Update any existing pending Payment record that was created for this intent
  const existing = await db.payment.findFirst({
    where: { stripePaymentIntentId: intent.id },
  });

  if (existing && existing.status === "PENDING") {
    await db.payment.update({
      where: { id: existing.id },
      data: { status: "SUCCEEDED", paidAt: new Date() },
    });
  }
}

async function handlePaymentIntentFailed(intent: Stripe.PaymentIntent) {
  const existing = await db.payment.findFirst({
    where: { stripePaymentIntentId: intent.id },
  });

  if (existing) {
    await db.payment.update({
      where: { id: existing.id },
      data: {
        status: "FAILED",
        failureReason: intent.last_payment_error?.message ?? "Payment failed",
      },
    });
  }

  // Update client billing status and send push notification
  const clientId = intent.metadata?.clientId;
  if (clientId) {
    await db.client.update({
      where: { id: clientId },
      data: { billingStatus: "PAST_DUE" },
    });

    await sendPushToClient(clientId, {
      title: "Payment Failed",
      body: "Your recent payment didn't go through. Please update your payment method.",
      url: "/c/payments",
    }).catch(() => {});
  }
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  if (!customerId) return;

  const client = await db.client.findFirst({ where: { stripeCustomerId: customerId } });
  if (!client) return;

  // Find the ClientPackage linked to this subscription (for renewal tracking)
  const subscriptionId = typeof invoice.subscription === "string"
    ? invoice.subscription
    : (invoice.subscription as { id?: string } | null)?.id;

  const clientPackage = subscriptionId
    ? await db.clientPackage.findFirst({
        where: { stripeSubscriptionId: subscriptionId },
        include: { package: true },
      })
    : null;

  await db.payment.create({
    data: {
      clientId: client.id,
      clientPackageId: clientPackage?.id ?? null,
      amount: (invoice.amount_paid ?? 0) / 100,
      currency: invoice.currency ?? "usd",
      status: "SUCCEEDED",
      stripeInvoiceId: invoice.id,
      description: clientPackage ? `${clientPackage.package.name} — renewal` : (invoice.description ?? "Subscription payment"),
      invoiceNumber: generateInvoiceNumber(),
      paidAt: invoice.status_transitions?.paid_at
        ? new Date(invoice.status_transitions.paid_at * 1000)
        : new Date(),
    },
  });

  await db.client.update({
    where: { id: client.id },
    data: { billingStatus: "PAID" },
  });

  // Reset sessions on subscription renewal if it's a session pack
  if (clientPackage?.package.sessionCount) {
    await db.clientPackage.update({
      where: { id: clientPackage.id },
      data: {
        sessionsUsed: 0,
        sessionsRemaining: clientPackage.package.sessionCount,
      },
    });
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  if (!customerId) return;

  const client = await db.client.findFirst({ where: { stripeCustomerId: customerId } });
  if (!client) return;

  const subscriptionId = typeof invoice.subscription === "string"
    ? invoice.subscription
    : (invoice.subscription as { id?: string } | null)?.id;

  const clientPackage = subscriptionId
    ? await db.clientPackage.findFirst({ where: { stripeSubscriptionId: subscriptionId } })
    : null;

  await db.payment.create({
    data: {
      clientId: client.id,
      clientPackageId: clientPackage?.id ?? null,
      amount: (invoice.amount_due ?? 0) / 100,
      currency: invoice.currency ?? "usd",
      status: "FAILED",
      stripeInvoiceId: invoice.id,
      description: invoice.description ?? "Subscription renewal — payment failed",
      failureReason: invoice.last_finalization_error?.message ?? "Payment failed",
    },
  });

  await db.client.update({
    where: { id: client.id },
    data: { billingStatus: "PAST_DUE" },
  });

  // Email notification
  if (client.email) {
    await sendPaymentFailedEmail({
      to: client.email,
      clientFirstName: client.firstName,
      amount: (invoice.amount_due ?? 0) / 100,
    });
  }

  // Push notification
  await sendPushToClient(client.id, {
    title: "Payment Failed",
    body: "Your subscription payment didn't go through. Please update your payment method.",
    url: "/c/payments",
  }).catch(() => {});
}

async function handleSubscriptionUpdated(sub: Stripe.Subscription) {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const client = await db.client.findFirst({ where: { stripeCustomerId: customerId } });
  if (!client) return;

  const clientPackage = await db.clientPackage.findFirst({
    where: { stripeSubscriptionId: sub.id },
  });
  if (!clientPackage) return;

  const status = sub.status === "active" || sub.status === "trialing"
    ? "active"
    : sub.status === "canceled"
      ? "cancelled"
      : "paused";

  await db.clientPackage.update({
    where: { id: clientPackage.id },
    data: { status, cancelledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000) : null },
  });
}

async function handleSubscriptionCancelled(sub: Stripe.Subscription) {
  const clientPackage = await db.clientPackage.findFirst({
    where: { stripeSubscriptionId: sub.id },
  });
  if (!clientPackage) return;

  await db.clientPackage.update({
    where: { id: clientPackage.id },
    data: { status: "cancelled", cancelledAt: new Date() },
  });

  // Move client to former client lifecycle stage
  await db.client.update({
    where: { id: clientPackage.clientId },
    data: { lifecycleStage: "FORMER_CLIENT" },
  });
}

async function handleRefund(charge: Stripe.Charge) {
  const paymentIntentId = typeof charge.payment_intent === "string"
    ? charge.payment_intent
    : (charge.payment_intent as { id?: string } | null)?.id;
  if (!paymentIntentId) return;

  const payment = await db.payment.findFirst({
    where: { stripePaymentIntentId: paymentIntentId },
  });
  if (!payment) return;

  await db.payment.update({
    where: { id: payment.id },
    data: {
      status: charge.amount_refunded >= charge.amount ? "REFUNDED" : "SUCCEEDED",
      refundedAmount: charge.amount_refunded / 100,
    },
  });
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function generateInvoiceNumber(): string {
  const now = new Date();
  const prefix = `CTC-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const suffix = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
  return `${prefix}-${suffix}`;
}
