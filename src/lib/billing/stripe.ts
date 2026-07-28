import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { db } from "@/lib/db";
import Stripe from "stripe";

/**
 * Stripe client — only initialized if STRIPE_SECRET_KEY is set.
 * Safe to import without it; calls will throw if not configured.
 */
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return _stripe;
}

export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

// Price IDs for each tier (set these in .env after creating Stripe products)
const PRICE_IDS = {
  pro_monthly: process.env.STRIPE_PRICE_PRO_MONTHLY || "",
  pro_annual: process.env.STRIPE_PRICE_PRO_ANNUAL || "",
  trainer_monthly: process.env.STRIPE_PRICE_TRAINER_MONTHLY || "",
  trainer_annual: process.env.STRIPE_PRICE_TRAINER_ANNUAL || "",
};

export type Tier = "free" | "pro" | "trainer";

/**
 * Get the current user's tier from the database.
 * Falls back to "free" if not authenticated or no DB record.
 */
export async function getCurrentTier(): Promise<Tier> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return "free";

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { tier: true },
  });

  return (user?.tier as Tier) || "free";
}

/**
 * Check if the current user has access to a given tier level.
 * free < pro < trainer
 */
export async function hasTierAccess(required: Tier): Promise<boolean> {
  const tier = await getCurrentTier();
  const tierLevel: Record<Tier, number> = { free: 0, pro: 1, trainer: 2 };
  return tierLevel[tier] >= tierLevel[required];
}

/**
 * Get the Stripe price ID for a tier + billing cycle.
 */
export function getPriceId(tier: Tier, annual: boolean): string {
  if (tier === "pro") return annual ? PRICE_IDS.pro_annual : PRICE_IDS.pro_monthly;
  if (tier === "trainer") return annual ? PRICE_IDS.trainer_annual : PRICE_IDS.trainer_monthly;
  return "";
}

/**
 * Create or retrieve a Stripe customer for the current user.
 */
export async function getOrCreateStripeCustomer(userId: string, email: string): Promise<string> {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (user?.stripeCustomerId) return user.stripeCustomerId;

  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email,
    metadata: { userId },
  });

  await db.user.update({
    where: { id: userId },
    data: { stripeCustomerId: customer.id },
  });

  return customer.id;
}
