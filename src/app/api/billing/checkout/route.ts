import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { getStripe, getPriceId, getOrCreateStripeCustomer, isStripeConfigured } from "@/lib/billing/stripe";
import { getNextAuthUrl } from "@/lib/env";
import { db } from "@/lib/db";
import { z } from "zod";

const CheckoutSchema = z.object({
  tier: z.enum(["pro", "trainer"]),
  annual: z.boolean().optional().default(false),
});

/**
 * POST /api/billing/checkout
 * Creates a Stripe Checkout session for upgrading to Pro or Trainer.
 *
 * Body: { tier: "pro" | "trainer", annual: boolean }
 *
 * Hardening:
 *   - Uses validated `getNextAuthUrl()` for redirect URLs (no `undefined` string).
 *   - Downgrade prevention: if the user is already on a higher tier, reject.
 *     (Use the billing portal to downgrade.)
 *   - Idempotency key sent to Stripe so double-clicks don't create duplicate sessions.
 */
export async function POST(req: NextRequest) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Payments are not configured. Add STRIPE_SECRET_KEY to .env" },
      { status: 503 }
    );
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = CheckoutSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { tier, annual } = parsed.data;
    const priceId = getPriceId(tier, annual);
    if (!priceId) {
      // Server config error — 503 (not 500) so the client can surface
      // "service unavailable" rather than "server error".
      return NextResponse.json(
        { error: `Stripe price not configured for ${tier} ${annual ? "annual" : "monthly"}.` },
        { status: 503 }
      );
    }

    // Downgrade prevention: trainer → pro is a downgrade; reject.
    // (User should use the billing portal to switch tiers within their plan.)
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { tier: true, stripeCustomerId: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (user.tier === "trainer" && tier === "pro") {
      return NextResponse.json(
        { error: "You're on the Trainer plan. Use the billing portal to switch to Pro." },
        { status: 409 }
      );
    }
    // Already on the requested tier — no-op.
    if (user.tier === tier) {
      return NextResponse.json(
        { error: `You're already on the ${tier} plan.` },
        { status: 409 }
      );
    }

    const customerId = await getOrCreateStripeCustomer(session.user.id, session.user.email);
    const stripe = getStripe();

    // Build absolute URLs using validated NEXTAUTH_URL.
    const baseUrl = getNextAuthUrl();
    const successUrl = `${baseUrl}/#/dashboard?upgrade=success`;
    const cancelUrl = `${baseUrl}/#/dashboard?upgrade=cancelled`;

    const checkoutSession = await stripe.checkout.sessions.create(
      {
        customer: customerId,
        mode: "subscription",
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          userId: session.user.id,
          tier,
        },
      },
      {
        // Idempotency: if the same user starts two checkouts within 60s,
        // Stripe returns the same session URL.
        idempotencyKey: `checkout-${session.user.id}-${tier}-${annual ? "annual" : "monthly"}-${Math.floor(Date.now() / 60000)}`,
        maxNetworkRetries: 3,
      }
    );

    if (!checkoutSession.url) {
      console.error("Stripe checkout session missing URL:", checkoutSession.id);
      return NextResponse.json(
        { error: "Stripe did not return a checkout URL" },
        { status: 502 }
      );
    }

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
