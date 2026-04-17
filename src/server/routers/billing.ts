import { z } from "zod";
import { createTRPCRouter, staffProcedure, clientProcedure } from "../trpc";
import { stripe, stripeEnabled, getOrCreateStripeCustomer, syncPackageToStripe } from "@/lib/stripe";
import { TRPCError } from "@trpc/server";

export const billingRouter = createTRPCRouter({
  /** Staff: Create Stripe Checkout session for a client + package. */
  createCheckoutSession: staffProcedure
    .input(z.object({
      clientId: z.string(),
      packageId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!stripe) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Stripe not configured" });

      const client = await ctx.db.client.findFirstOrThrow({
        where: { id: input.clientId, organizationId: ctx.organizationId },
      });

      const pkg = await ctx.db.package.findFirstOrThrow({
        where: { id: input.packageId, organizationId: ctx.organizationId },
      });

      // Ensure customer
      const customerId = await getOrCreateStripeCustomer({
        clientId: client.id,
        email: client.email,
        name: `${client.firstName} ${client.lastName}`,
        existingCustomerId: client.stripeCustomerId,
      });

      if (!client.stripeCustomerId) {
        await ctx.db.client.update({
          where: { id: client.id },
          data: { stripeCustomerId: customerId },
        });
      }

      // Ensure price
      const priceId = await syncPackageToStripe({
        id: pkg.id,
        name: pkg.name,
        description: pkg.description,
        price: pkg.price,
        packageType: pkg.packageType,
        billingCycle: pkg.billingCycle,
        existingStripePriceId: pkg.stripePriceId,
      });

      if (!pkg.stripePriceId) {
        await ctx.db.package.update({
          where: { id: pkg.id },
          data: { stripePriceId: priceId },
        });
      }

      const mode = pkg.billingCycle === "ONE_TIME" ? "payment" : "subscription";
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://carbon-gym-three.vercel.app";

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${baseUrl}/admin/clients/${client.id}?checkout=success`,
        cancel_url: `${baseUrl}/admin/clients/${client.id}?checkout=cancelled`,
        metadata: { clientId: client.id, packageId: pkg.id },
      });

      return { url: session.url };
    }),

  /** Client portal: Create checkout from client side */
  clientCheckout: clientProcedure
    .input(z.object({ packageId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!stripe) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Stripe not configured" });

      const pkg = await ctx.db.package.findFirstOrThrow({ where: { id: input.packageId } });

      const customerId = await getOrCreateStripeCustomer({
        clientId: ctx.client.id,
        email: ctx.client.email,
        name: `${ctx.client.firstName} ${ctx.client.lastName}`,
        existingCustomerId: ctx.client.stripeCustomerId,
      });

      if (!ctx.client.stripeCustomerId) {
        await ctx.db.client.update({ where: { id: ctx.client.id }, data: { stripeCustomerId: customerId } });
      }

      const priceId = await syncPackageToStripe({
        id: pkg.id,
        name: pkg.name,
        description: pkg.description,
        price: pkg.price,
        packageType: pkg.packageType,
        billingCycle: pkg.billingCycle,
        existingStripePriceId: pkg.stripePriceId,
      });

      if (!pkg.stripePriceId) {
        await ctx.db.package.update({ where: { id: pkg.id }, data: { stripePriceId: priceId } });
      }

      const mode = pkg.billingCycle === "ONE_TIME" ? "payment" : "subscription";
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://carbon-gym-three.vercel.app";

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${baseUrl}/c/profile?checkout=success`,
        cancel_url: `${baseUrl}/c?checkout=cancelled`,
        metadata: { clientId: ctx.client.id, packageId: pkg.id },
      });

      return { url: session.url };
    }),

  /** Client portal: Create billing portal session (manage own subscription) */
  createPortalSession: clientProcedure.mutation(async ({ ctx }) => {
    if (!stripe) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Stripe not configured" });
    if (!ctx.client.stripeCustomerId) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "No Stripe customer" });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://carbon-gym-three.vercel.app";
    const session = await stripe.billingPortal.sessions.create({
      customer: ctx.client.stripeCustomerId,
      return_url: `${baseUrl}/c/profile`,
    });

    return { url: session.url };
  }),

  /** Staff: List client's payment history */
  listPayments: staffProcedure
    .input(z.object({ clientId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.payment.findMany({
        where: { clientId: input.clientId, client: { organizationId: ctx.organizationId } },
        orderBy: { createdAt: "desc" },
        include: { clientPackage: { include: { package: true } } },
      });
    }),

  /** Staff: Refund a payment */
  refund: staffProcedure
    .input(z.object({ paymentId: z.string(), amount: z.number().optional() }))
    .mutation(async ({ ctx, input }) => {
      if (!stripe) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Stripe not configured" });

      const payment = await ctx.db.payment.findFirstOrThrow({
        where: { id: input.paymentId, client: { organizationId: ctx.organizationId } },
      });

      if (!payment.stripePaymentIntentId) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Payment has no Stripe reference" });
      }

      const refund = await stripe.refunds.create({
        payment_intent: payment.stripePaymentIntentId,
        amount: input.amount ? Math.round(input.amount * 100) : undefined,
      });

      // Webhook will update the payment record
      return refund.id;
    }),

  /** Staff: Sync a package to Stripe (create Product + Price) */
  syncPackage: staffProcedure
    .input(z.object({ packageId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const pkg = await ctx.db.package.findFirstOrThrow({
        where: { id: input.packageId, organizationId: ctx.organizationId },
      });

      const priceId = await syncPackageToStripe({
        id: pkg.id,
        name: pkg.name,
        description: pkg.description,
        price: pkg.price,
        packageType: pkg.packageType,
        billingCycle: pkg.billingCycle,
        existingStripePriceId: pkg.stripePriceId,
      });

      await ctx.db.package.update({
        where: { id: pkg.id },
        data: { stripePriceId: priceId },
      });

      return { priceId };
    }),

  /** Check if Stripe is enabled */
  status: staffProcedure.query(() => ({ enabled: stripeEnabled })),
});
