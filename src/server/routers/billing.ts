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

  /** Staff: List Stripe payment methods for a client */
  listPaymentMethods: staffProcedure
    .input(z.object({ clientId: z.string() }))
    .query(async ({ ctx, input }) => {
      const client = await ctx.db.client.findFirstOrThrow({
        where: { id: input.clientId, organizationId: ctx.organizationId },
        select: { stripeCustomerId: true },
      });
      if (!stripe || !client.stripeCustomerId) return [];
      const methods = await stripe.paymentMethods.list({
        customer: client.stripeCustomerId,
        type: "card",
      });
      const customer = await stripe.customers.retrieve(client.stripeCustomerId) as any;
      const defaultMethodId = customer.invoice_settings?.default_payment_method;
      return methods.data.map((m) => ({
        id: m.id,
        brand: m.card?.brand ?? "card",
        last4: m.card?.last4 ?? "????",
        expMonth: m.card?.exp_month,
        expYear: m.card?.exp_year,
        created: m.created,
        isDefault: m.id === defaultMethodId,
      }));
    }),

  /** Staff: Remove a Stripe payment method */
  removePaymentMethod: staffProcedure
    .input(z.object({ paymentMethodId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!stripe) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Stripe not configured" });
      await stripe.paymentMethods.detach(input.paymentMethodId);
      return { success: true };
    }),

  /** Staff: Adjust account balance */
  adjustAccountBalance: staffProcedure
    .input(z.object({
      clientId: z.string(),
      amount: z.number(),
      description: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const last = await ctx.db.accountBalanceTransaction.findFirst({
        where: { clientId: input.clientId, organizationId: ctx.organizationId },
        orderBy: { createdAt: "desc" },
      });
      const runningBalance = (last?.runningBalance ?? 0) + input.amount;
      return ctx.db.accountBalanceTransaction.create({
        data: {
          clientId: input.clientId,
          organizationId: ctx.organizationId,
          amount: input.amount,
          description: input.description,
          runningBalance,
        },
      });
    }),

  /** Staff: List account balance transactions */
  listAccountBalance: staffProcedure
    .input(z.object({ clientId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.accountBalanceTransaction.findMany({
        where: { clientId: input.clientId, organizationId: ctx.organizationId },
        orderBy: { createdAt: "desc" },
      });
    }),

  /** Staff: Adjust service balance */
  adjustServiceBalance: staffProcedure
    .input(z.object({
      clientId: z.string(),
      amount: z.number(),
      description: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const last = await ctx.db.serviceBalanceTransaction.findFirst({
        where: { clientId: input.clientId, organizationId: ctx.organizationId },
        orderBy: { createdAt: "desc" },
      });
      const startingBalance = last?.endingBalance ?? 0;
      const endingBalance = startingBalance + input.amount;
      return ctx.db.serviceBalanceTransaction.create({
        data: {
          clientId: input.clientId,
          organizationId: ctx.organizationId,
          amount: input.amount,
          description: input.description,
          startingBalance,
          endingBalance,
        },
      });
    }),

  /** Staff: List service balance transactions */
  listServiceBalance: staffProcedure
    .input(z.object({ clientId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.serviceBalanceTransaction.findMany({
        where: { clientId: input.clientId, organizationId: ctx.organizationId },
        orderBy: { createdAt: "desc" },
      });
    }),

  /** Staff: Set default payment method for a customer */
  setDefaultPaymentMethod: staffProcedure
    .input(z.object({ clientId: z.string(), paymentMethodId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!stripe) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Stripe not configured" });

      const client = await ctx.db.client.findFirstOrThrow({
        where: { id: input.clientId, organizationId: ctx.organizationId },
        select: { stripeCustomerId: true },
      });

      if (!client.stripeCustomerId) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Client has no Stripe customer" });
      }

      await stripe.customers.update(client.stripeCustomerId, {
        invoice_settings: { default_payment_method: input.paymentMethodId },
      });

      return { success: true };
    }),

  /** Staff: Generate a checkout link and return the URL without opening it */
  createCheckoutLink: staffProcedure
    .input(z.object({ clientId: z.string(), packageId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!stripe) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Stripe not configured" });

      const client = await ctx.db.client.findFirstOrThrow({
        where: { id: input.clientId, organizationId: ctx.organizationId },
      });

      const pkg = await ctx.db.package.findFirstOrThrow({
        where: { id: input.packageId, organizationId: ctx.organizationId },
      });

      const customerId = await getOrCreateStripeCustomer({
        clientId: client.id,
        email: client.email,
        name: `${client.firstName} ${client.lastName}`,
        existingCustomerId: client.stripeCustomerId,
      });

      if (!client.stripeCustomerId) {
        await ctx.db.client.update({ where: { id: client.id }, data: { stripeCustomerId: customerId } });
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
        success_url: `${baseUrl}/admin/clients/${client.id}?checkout=success`,
        cancel_url: `${baseUrl}/admin/clients/${client.id}?checkout=cancelled`,
        metadata: { clientId: client.id, packageId: pkg.id },
      });

      return { url: session.url };
    }),

  /** Staff: Org-wide payment list */
  listOrgPayments: staffProcedure
    .input(z.object({
      status: z.string().optional(),
      search: z.string().optional(),
      take: z.number().default(200),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.db.payment.findMany({
        where: {
          client: { organizationId: ctx.organizationId },
          ...(input.status ? { status: input.status as never } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: input.take,
        include: {
          client: { select: { id: true, firstName: true, lastName: true, profileImageUrl: true } },
          clientPackage: { include: { package: { select: { name: true } } } },
        },
      });
    }),

  /** Staff: Org-wide subscription list */
  listOrgSubscriptions: staffProcedure
    .input(z.object({ status: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.clientPackage.findMany({
        where: {
          client: { organizationId: ctx.organizationId },
          ...(input.status ? { status: input.status as never } : {}),
        },
        orderBy: { createdAt: "desc" },
        include: {
          client: { select: { id: true, firstName: true, lastName: true, profileImageUrl: true } },
          package: { select: { id: true, name: true, price: true, billingCycle: true } },
        },
      });
    }),

  /** Staff: Org-wide account balance summary */
  listOrgAccountBalances: staffProcedure.query(async ({ ctx }) => {
    // Get latest running balance per client
    const balances = await ctx.db.accountBalanceTransaction.findMany({
      where: { organizationId: ctx.organizationId },
      orderBy: { createdAt: "desc" },
      distinct: ["clientId"],
      include: { client: { select: { id: true, firstName: true, lastName: true } } },
    });
    return balances.filter((b) => b.runningBalance !== 0);
  }),

  /** Staff: Org-wide service balance summary */
  listOrgServiceBalances: staffProcedure.query(async ({ ctx }) => {
    const balances = await ctx.db.serviceBalanceTransaction.findMany({
      where: { organizationId: ctx.organizationId },
      orderBy: { createdAt: "desc" },
      distinct: ["clientId"],
      include: { client: { select: { id: true, firstName: true, lastName: true } } },
    });
    return balances.filter((b) => b.endingBalance !== 0);
  }),

  /** Check if Stripe is enabled */
  status: staffProcedure.query(() => ({ enabled: stripeEnabled })),
});
