import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { db } from "@/lib/db";
import { verifyRazorpaySignature, planIdToTier } from "@/lib/billing/razorpay";
import { z } from "zod";

const VerifySchema = z.object({
  orderId: z.string().min(1),
  paymentId: z.string().min(1),
  signature: z.string().min(1),
  tier: z.enum(["pro", "trainer"]),
  planId: z.string().nullable().optional(),
});

/**
 * POST /api/billing/razorpay/verify
 *
 * Verifies the Razorpay payment signature after the client completes
 * the checkout modal. If valid, upgrades the user's tier.
 *
 * This is the primary verification path. The webhook is the backup
 * (Razorpay retries the webhook if this endpoint is missed).
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = VerifySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { orderId, paymentId, signature, tier, planId } = parsed.data;

    // Verify the signature — this proves the payment is authentic.
    const isValid = verifyRazorpaySignature({ orderId, paymentId, signature });
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid payment signature — payment verification failed." },
        { status: 400 }
      );
    }

    // Cross-check: if a planId was provided, verify it matches the requested tier.
    if (planId) {
      const tierFromPlan = planIdToTier(planId);
      if (tierFromPlan && tierFromPlan !== tier) {
        return NextResponse.json(
          { error: "Plan ID doesn't match the requested tier." },
          { status: 400 }
        );
      }
    }

    // Upgrade the user's tier atomically.
    await db.user.update({
      where: { id: session.user.id },
      data: { tier },
    });

    // Write an audit log entry.
    await db.activityLog.create({
      data: {
        userId: session.user.id,
        action: `razorpay_payment_verified`,
        entityType: "subscription",
        entityId: paymentId,
        metadata: JSON.stringify({
          tier,
          orderId,
          paymentId,
          verifiedAt: new Date().toISOString(),
        }),
      },
    });

    return NextResponse.json({ success: true, tier });
  } catch (error) {
    console.error("Razorpay verify error:", error);
    return NextResponse.json(
      { error: "Payment verification failed" },
      { status: 500 }
    );
  }
}
