import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { getStripe, getOrCreateStripeCustomer, isStripeConfigured } from "@/lib/billing/stripe";
import { getNextAuthUrl } from "@/lib/env";

/**
 * POST /api/billing/portal
 * Creates a Stripe Customer Portal session for managing subscriptions.
 *
 * Uses validated `getNextAuthUrl()` so `return_url` is always a valid absolute URL.
 */
export async function POST() {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Payments are not configured" },
      { status: 503 }
    );
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const customerId = await getOrCreateStripeCustomer(session.user.id, session.user.email);
    const stripe = getStripe();

    const baseUrl = getNextAuthUrl();
    const returnUrl = `${baseUrl}/#/settings`;

    const portalSession = await stripe.billingPortal.sessions.create(
      {
        customer: customerId,
        return_url: returnUrl,
      },
      { maxNetworkRetries: 3 }
    );

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error("Portal error:", error);
    return NextResponse.json(
      { error: "Failed to create portal session" },
      { status: 500 }
    );
  }
}
