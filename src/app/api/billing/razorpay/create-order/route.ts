import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { db } from "@/lib/db";
import { createRazorpayOrder, isRazorpayConfigured } from "@/lib/billing/razorpay";
import { z } from "zod";

const CreateOrderSchema = z.object({
  tier: z.enum(["pro", "trainer"]),
  annual: z.boolean().optional().default(false),
});

/**
 * POST /api/billing/razorpay/create-order
 *
 * Creates a Razorpay order for Pro/Trainer subscription checkout.
 * Returns { orderId, amount, currency, keyId } which the client uses
 * to open the Razorpay checkout modal.
 *
 * Fallback: returns 503 if Razorpay isn't configured — the client should
 * show "Coming Soon" and not call this endpoint.
 */
export async function POST(req: NextRequest) {
  if (!isRazorpayConfigured()) {
    return NextResponse.json(
      { error: "Razorpay is not configured. Set RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET." },
      { status: 503 }
    );
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = CreateOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Downgrade prevention: trainer → pro is a downgrade.
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { tier: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (user.tier === "trainer" && parsed.data.tier === "pro") {
      return NextResponse.json(
        { error: "You're on the Trainer plan. Use the billing portal to switch." },
        { status: 409 }
      );
    }
    if (user.tier === parsed.data.tier) {
      return NextResponse.json(
        { error: `You're already on the ${parsed.data.tier} plan.` },
        { status: 409 }
      );
    }

    const order = await createRazorpayOrder({
      tier: parsed.data.tier,
      annual: parsed.data.annual,
      userId: session.user.id,
      userEmail: session.user.email,
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error("Razorpay create-order error:", error);
    return NextResponse.json(
      { error: "Failed to create Razorpay order" },
      { status: 500 }
    );
  }
}
