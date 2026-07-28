import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  verifyRazorpayWebhookSignature,
  planIdToTier,
} from "@/lib/billing/razorpay";

/**
 * POST /api/billing/razorpay/webhook
 *
 * Razorpay sends webhooks for payment events (captured, failed, etc.).
 * This endpoint is called server-to-server by Razorpay.
 *
 * Excluded from auth + rate limiting in proxy.ts (SKIP_PROXY_PATHS).
 *
 * The webhook is the backup verification path — the primary path is
 * /api/billing/razorpay/verify (called by the client after checkout).
 * Both paths update the user's tier; the webhook is idempotent (uses
 * paymentId dedup via ActivityLog).
 */

interface RazorpayWebhookEvent {
  event: string;
  payload: {
    payment: {
      entity: {
        id: string;
        order_id: string;
        amount: number;
        status: string;
        notes?: {
          userId?: string;
          tier?: string;
          planId?: string;
        };
      };
    };
  };
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("x-razorpay-signature") || "";

  // Verify the webhook signature — proves the request came from Razorpay.
  if (!verifyRazorpayWebhookSignature(body, signature)) {
    return NextResponse.json(
      { error: "Invalid webhook signature" },
      { status: 400 }
    );
  }

  try {
    const event: RazorpayWebhookEvent = JSON.parse(body);
    const payment = event.payload?.payment?.entity;

    if (!payment) {
      return NextResponse.json({ received: true });
    }

    // Idempotency: check if we've already processed this payment ID.
    const existing = await db.activityLog.findFirst({
      where: {
        entityType: "razorpay_webhook",
        entityId: payment.id,
      },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json({ received: true, deduplicated: true });
    }

    const userId = payment.notes?.userId;
    const tier = payment.notes?.tier as "pro" | "trainer" | undefined;
    const planId = payment.notes?.planId || null;

    if (!userId || !tier) {
      // Can't upgrade without user/tier info — log + return success
      // (Razorpay won't retry if we return 200).
      await db.activityLog.create({
        data: {
          userId: "system",
          action: `razorpay_${event.event}_no_metadata`,
          entityType: "razorpay_webhook",
          entityId: payment.id,
          metadata: JSON.stringify({ event: event.event, paymentId: payment.id }),
        },
      });
      return NextResponse.json({ received: true, warning: "missing_metadata" });
    }

    // Cross-check tier from planId if available.
    const tierFromPlan = planIdToTier(planId);
    const finalTier = tierFromPlan || tier;

    switch (event.event) {
      case "payment.captured":
      case "payment.authorized":
        // Payment succeeded — upgrade the user.
        await db.user.update({
          where: { id: userId },
          data: { tier: finalTier },
        });
        break;

      case "payment.failed":
        // Payment failed — don't change tier (user stays on free).
        // Just log for observability.
        console.warn(`[Razorpay webhook] payment failed: ${payment.id}`);
        break;

      case "subscription.cancelled":
        // Subscription cancelled — downgrade to free.
        await db.user.update({
          where: { id: userId },
          data: { tier: "free" },
        });
        break;

      default:
        // Unhandled event — log + return success.
        console.log(`[Razorpay webhook] unhandled event: ${event.event}`);
        break;
    }

    // Mark as processed (idempotency key).
    await db.activityLog.create({
      data: {
        userId,
        action: `razorpay_${event.event}`,
        entityType: "razorpay_webhook",
        entityId: payment.id,
        metadata: JSON.stringify({
          event: event.event,
          paymentId: payment.id,
          orderId: payment.order_id,
          tier: finalTier,
          processedAt: new Date().toISOString(),
        }),
      },
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Razorpay webhook handler error:", error);
    // Return 500 so Razorpay retries with backoff.
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
