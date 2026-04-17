import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { db } from "@/server/db";
import { sendPaymentFailedEmail } from "@/lib/email";

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
      event = JSON.parse(body);
    }
  } catch (err: any) {
    console.error("[stripe-webhook] Signature verification failed:", err.message);
    return NextResponse.json({ error: `Webhook signature invalid: ${err.message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentSucceeded(invoice);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
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
  } catch (err: any) {
    console.error("[stripe-webhook] Handler failed:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

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
  await db.clientPackage.create({
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
      amount: (session.amount_total ?? 0) / 100,
      currency: session.currency ?? "usd",
      status: "SUCCEEDED",
      stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : null,
      description: pkg.name,
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
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  if (!customerId) return;

  const client = await db.client.findFirst({ where: { stripeCustomerId: customerId } });
  if (!client) return;

  await db.payment.create({
    data: {
      clientId: client.id,
      amount: (invoice.amount_paid ?? 0) / 100,
      currency: invoice.currency ?? "usd",
      status: "SUCCEEDED",
      stripeInvoiceId: invoice.id,
      description: invoice.description || "Subscription payment",
      paidAt: new Date((invoice.status_transitions?.paid_at ?? 0) * 1000) || new Date(),
    },
  });

  await db.client.update({
    where: { id: client.id },
    data: { billingStatus: "PAID" },
  });
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  if (!customerId) return;

  const client = await db.client.findFirst({ where: { stripeCustomerId: customerId } });
  if (!client) return;

  await db.payment.create({
    data: {
      clientId: client.id,
      amount: (invoice.amount_due ?? 0) / 100,
      currency: invoice.currency ?? "usd",
      status: "FAILED",
      stripeInvoiceId: invoice.id,
      description: invoice.description || "Subscription payment",
      failureReason: invoice.last_finalization_error?.message ?? "Payment failed",
    },
  });

  await db.client.update({
    where: { id: client.id },
    data: { billingStatus: "PAST_DUE" },
  });

  if (client.email) {
    await sendPaymentFailedEmail({
      to: client.email,
      clientFirstName: client.firstName,
      amount: (invoice.amount_due ?? 0) / 100,
    });
  }
}

async function handleSubscriptionUpdated(sub: Stripe.Subscription) {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const client = await db.client.findFirst({ where: { stripeCustomerId: customerId } });
  if (!client) return;

  // Find the ClientPackage linked to this subscription
  const clientPackage = await db.clientPackage.findFirst({
    where: { stripeSubscriptionId: sub.id },
  });

  if (!clientPackage) return;

  // Update status based on subscription status
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
}

async function handleRefund(charge: Stripe.Charge) {
  const paymentIntentId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
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
