import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn("[stripe] STRIPE_SECRET_KEY not set — Stripe features disabled");
}

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-12-18.acacia" as any,
      typescript: true,
    })
  : null;

export const stripeEnabled = !!stripe;

/**
 * Get or create a Stripe Customer for a client.
 * Stores the customer ID on the client record.
 */
export async function getOrCreateStripeCustomer(opts: {
  clientId: string;
  email: string | null;
  name: string;
  existingCustomerId: string | null;
}): Promise<string> {
  if (!stripe) throw new Error("Stripe not configured");

  // Reuse existing customer if we already have one
  if (opts.existingCustomerId) {
    try {
      const existing = await stripe.customers.retrieve(opts.existingCustomerId);
      if (!existing.deleted) return opts.existingCustomerId;
    } catch {
      // Customer was deleted — fall through to create new
    }
  }

  const customer = await stripe.customers.create({
    email: opts.email ?? undefined,
    name: opts.name,
    metadata: { clientId: opts.clientId },
  });

  return customer.id;
}

/**
 * Create or sync a Stripe Product + Price for a package.
 * Returns the Stripe Price ID.
 */
export async function syncPackageToStripe(pkg: {
  id: string;
  name: string;
  description: string | null;
  price: number;
  packageType: string;
  billingCycle: string;
  existingStripePriceId: string | null;
}): Promise<string> {
  if (!stripe) throw new Error("Stripe not configured");

  // Reuse existing price if unchanged
  if (pkg.existingStripePriceId) {
    try {
      const existing = await stripe.prices.retrieve(pkg.existingStripePriceId);
      if (existing.active && existing.unit_amount === Math.round(pkg.price * 100)) {
        return pkg.existingStripePriceId;
      }
    } catch {
      // Price doesn't exist or changed — create new one
    }
  }

  // Create Product
  const product = await stripe.products.create({
    name: pkg.name,
    description: pkg.description ?? undefined,
    metadata: { packageId: pkg.id, packageType: pkg.packageType },
  });

  // Create Price
  const isRecurring = pkg.billingCycle !== "ONE_TIME";
  const intervalMap: Record<string, Stripe.PriceCreateParams.Recurring.Interval> = {
    WEEKLY: "week",
    BIWEEKLY: "week", // biweekly handled via interval_count
    MONTHLY: "month",
    QUARTERLY: "month", // 3 months handled via interval_count
    ANNUALLY: "year",
  };

  const price = await stripe.prices.create({
    product: product.id,
    currency: "usd",
    unit_amount: Math.round(pkg.price * 100),
    ...(isRecurring && {
      recurring: {
        interval: intervalMap[pkg.billingCycle] ?? "month",
        interval_count: pkg.billingCycle === "BIWEEKLY" ? 2 : pkg.billingCycle === "QUARTERLY" ? 3 : 1,
      },
    }),
    metadata: { packageId: pkg.id },
  });

  return price.id;
}

/**
 * Format cents to USD dollars string.
 */
export function formatCents(cents: number | null | undefined): string {
  if (cents == null) return "—";
  return `$${(cents / 100).toFixed(2)}`;
}
