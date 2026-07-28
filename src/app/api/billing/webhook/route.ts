import { NextRequest, NextResponse } from "next/server";
import { getStripe, isStripeConfigured } from "@/lib/billing/stripe";
import { db } from "@/lib/db";
import Stripe from "stripe";

/**
 * POST /api/billing/webhook
 * Stripe webhook — handles subscription lifecycle events.
 *
 * Hardening:
 *   - Signature verification (required).
 *   - Idempotency: each event.id is recorded in `ActivityLog` (metadata).
 *     Replayed events are skipped — protects against Stripe retries
 *     re-elevating cancelled users.
 *   - Tier is validated against a known set before persisting.
 *   - Non-recoverable errors return 400 (Stripe won't retry forever);
 *     recoverable errors return 500 (Stripe retries with backoff).
 *
 * Excluded from auth + rate limiting (see `proxy.ts` SKIP_PROXY_PATHS).
 */

const VALID_TIERS = ["free", "pro", "trainer", "enterprise"] as const;
type Tier = (typeof VALID_TIERS)[number];

function isTier(value: unknown): value is Tier {
  return typeof value === "string" && (VALID_TIERS as readonly string[]).includes(value);
}

// Map Stripe price IDs to tiers (configured via env).
function priceIdToTier(priceId: string): Tier | null {
  const proPrices = [process.env.STRIPE_PRICE_PRO_MONTHLY, process.env.STRIPE_PRICE_PRO_ANNUAL].filter(Boolean) as string[];
  const trainerPrices = [process.env.STRIPE_PRICE_TRAINER_MONTHLY, process.env.STRIPE_PRICE_TRAINER_ANNUAL].filter(Boolean) as string[];

  if (proPrices.includes(priceId)) return "pro";
  if (trainerPrices.includes(priceId)) return "trainer";
  // Unknown price → return null so caller can decide to skip the update
  // rather than silently downgrading a paying user to "free".
  return null;
}

/**
 * Idempotency guard — returns true if this event has already been processed.
 * Uses the ActivityLog table: `entityType: "stripe_webhook"`, `entityId: event.id`.
 */
async function isEventProcessed(eventId: string): Promise<boolean> {
  const existing = await db.activityLog.findFirst({
    where: { entityType: "stripe_webhook", entityId: eventId },
    select: { id: true },
  });
  return !!existing;
}

async function markEventProcessed(eventId: string, eventType: string, userId: string | null): Promise<void> {
  await db.activityLog.create({
    data: {
      userId: userId || "system",
      action: `stripe_${eventType}`,
      entityType: "stripe_webhook",
      entityId: eventId,
      metadata: JSON.stringify({ eventId, eventType, processedAt: new Date().toISOString() }),
    },
  });
}

export async function POST(req: NextRequest) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not configured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Idempotency: skip if we've already processed this event.id.
  // (Stripe retries on 5xx; without this, a retry after a `subscription.deleted`
  // could re-process a checkout and re-elevate a cancelled user.)
  try {
    if (await isEventProcessed(event.id)) {
      return NextResponse.json({ received: true, deduplicated: true });
    }
  } catch (e) {
    // If the idempotency check itself fails (DB issue), it's recoverable —
    // return 500 so Stripe retries.
    console.error("Webhook idempotency check failed:", e);
    return NextResponse.json({ error: "Idempotency check failed" }, { status: 500 });
  }

  try {
    let affectedUserId: string | null = null;

    switch (event.type) {
      case "checkout.session.completed": {
        const checkout = event.data.object as Stripe.Checkout.Session;
        const userId = checkout.metadata?.userId;
        const tierRaw = checkout.metadata?.tier;
        const tier = isTier(tierRaw) ? tierRaw : null;

        if (userId && tier) {
          const subId = checkout.subscription as string;
          const customerId = checkout.customer as string;
          await db.user.update({
            where: { id: userId },
            data: { tier, stripeSubId: subId, stripeCustomerId: customerId },
          });
          affectedUserId = userId;
          console.log(`[webhook] user ${userId} → ${tier} (checkout ${checkout.id})`);
        } else if (userId && !tier) {
          // Invalid tier in metadata — non-recoverable config error.
          console.error(`[webhook] invalid tier in checkout metadata: ${tierRaw}`);
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;

        const user = await db.user.findUnique({
          where: { stripeCustomerId: customerId },
        });

        if (user) {
          affectedUserId = user.id;
          // Use the FIRST recurring price item. For multi-plan subscriptions
          // you'd want to iterate, but this app has single-plan subscriptions.
          const priceId = sub.items.data[0]?.price?.id || "";
          const priceTier = priceIdToTier(priceId);

          if (!priceTier) {
            console.warn(`[webhook] unknown price id ${priceId}; skipping tier update`);
            break;
          }

          // Map subscription status to tier. Only `active` and `trialing`
          // keep the paid tier; everything else reverts to free.
          const newTier: Tier =
            sub.status === "active" || sub.status === "trialing"
              ? priceTier
              : "free";

          await db.user.update({
            where: { id: user.id },
            data: { tier: newTier, stripeSubId: sub.id },
          });
          console.log(`[webhook] user ${user.id} → ${newTier} (sub ${sub.id}, status ${sub.status})`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;

        const user = await db.user.findUnique({
          where: { stripeCustomerId: customerId },
        });

        if (user) {
          affectedUserId = user.id;
          await db.user.update({
            where: { id: user.id },
            data: { tier: "free", stripeSubId: null },
          });
          console.log(`[webhook] user ${user.id} subscription cancelled → free`);
        }
        break;
      }

      case "invoice.payment_failed": {
        // Subscription renewal failed — Stripe will retry per its schedule,
        // but if all retries fail, `customer.subscription.deleted` will fire.
        // For now, just log so we have observability.
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        const user = await db.user.findUnique({
          where: { stripeCustomerId: customerId },
          select: { id: true },
        });
        if (user) affectedUserId = user.id;
        console.warn(`[webhook] payment failed for user ${user?.id || "unknown"} (invoice ${invoice.id})`);
        break;
      }

      case "invoice.paid": {
        // Successful renewal — confirm tier is still set correctly.
        // (Most renewals are no-ops since the tier doesn't change, but this
        // guards against the rare case where a `subscription.updated` event
        // was missed.)
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        const user = await db.user.findUnique({
          where: { stripeCustomerId: customerId },
          select: { id: true, tier: true },
        });
        if (user && user.tier === "free") {
          // In Stripe v22, `invoice.subscription` moved to
          // `invoice.parent.subscription_details.subscription`.
          const subIdOrObj = invoice.parent?.subscription_details?.subscription;
          const subId = typeof subIdOrObj === "string" ? subIdOrObj : subIdOrObj?.id;
          if (subId) {
            const subscription = await stripe.subscriptions.retrieve(subId);
            const priceId = subscription.items.data[0]?.price?.id || "";
            const tier = priceIdToTier(priceId);
            if (tier) {
              await db.user.update({
                where: { id: user.id },
                data: { tier, stripeSubId: subscription.id },
              });
              console.log(`[webhook] user ${user.id} tier restored to ${tier} via invoice.paid`);
            }
          }
        }
        if (user) affectedUserId = user.id;
        break;
      }

      default:
        // Unhandled event type — log for observability, no action needed.
        console.log(`[webhook] unhandled event type: ${event.type}`);
        break;
    }

    // Mark the event as processed (idempotency key).
    await markEventProcessed(event.id, event.type, affectedUserId);

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    // Distinguish recoverable (DB) from non-recoverable (bad data) errors.
    // For now, treat all as recoverable so Stripe retries — but log loudly
    // so we can investigate persistent failures.
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
