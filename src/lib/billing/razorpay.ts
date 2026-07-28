import Razorpay from "razorpay";
import crypto from "crypto";

/**
 * Razorpay integration — India-focused payment gateway.
 *
 * When Razorpay is configured (NEXT_PUBLIC_RAZORPAY_ENABLED=true + keys set),
 * it takes precedence over Stripe for the Pro/Trainer checkout flow.
 *
 * Fallback: if Razorpay is NOT configured, the UI shows "Coming Soon"
 * on pricing buttons + Settings → Plan & Billing. The app still works
 * in free/demo mode.
 *
 * ENVIRONMENT VARIABLES (server-side only — never expose to client):
 *   RAZORPAY_KEY_ID         — rzp_live_xxx or rzp_test_xxx
 *   RAZORPAY_KEY_SECRET     — secret key from Razorpay dashboard
 *   RAZORPAY_WEBHOOK_SECRET — webhook secret for signature verification
 *
 * CLIENT-SIDE (public, safe to expose):
 *   NEXT_PUBLIC_RAZORPAY_KEY_ID     — same as RAZORPAY_KEY_ID (used by checkout.js)
 *   NEXT_PUBLIC_RAZORPAY_ENABLED     — "true" to surface Razorpay UI
 */

let cachedClient: Razorpay | null = null;

/**
 * Returns the Razorpay server client, or null if not configured.
 */
export function getRazorpay(): Razorpay | null {
  if (cachedClient) return cachedClient;

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return null;
  }

  try {
    cachedClient = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
    return cachedClient;
  } catch (e) {
    console.error("[Razorpay] Client init failed:", e);
    return null;
  }
}

export function isRazorpayConfigured(): boolean {
  return (
    process.env.NEXT_PUBLIC_RAZORPAY_ENABLED === "true" &&
    !!process.env.RAZORPAY_KEY_ID &&
    !!process.env.RAZORPAY_KEY_SECRET
  );
}

/**
 * Plan configuration — maps our tier names to Razorpay plan IDs.
 * Set these in .env after creating plans in the Razorpay dashboard.
 */
function getPlanId(tier: "pro" | "trainer", annual: boolean): string | null {
  const envKey = `RAZORPAY_PLAN_${tier.toUpperCase()}_${annual ? "ANNUAL" : "MONTHLY"}`;
  return process.env[envKey] || null;
}

/**
 * Create a Razorpay order for a subscription checkout.
 *
 * Razorpay flow:
 *   1. Server creates an order (this function) → returns order_id
 *   2. Client opens Razorpay checkout with order_id → user pays
 *   3. Client verifies payment signature on /api/billing/razorpay/verify
 *   4. Razorpay sends webhook to /api/billing/razorpay/webhook (server-to-server)
 *
 * Returns { orderId, amount, currency, keyId } or throws on error.
 */
export async function createRazorpayOrder(params: {
  tier: "pro" | "trainer";
  annual: boolean;
  userId: string;
  userEmail: string;
}): Promise<{
  orderId: string;
  amount: number; // in paise (Indian rupees × 100)
  currency: string;
  keyId: string;
  planId: string | null;
}> {
  const rzp = getRazorpay();
  if (!rzp) throw new Error("Razorpay not configured");

  // Pricing (in INR paise — ₹1 = 100 paise)
  const pricing = {
    pro: { monthly: 99900, annual: 959900 },     // ₹999/mo, ₹9,599/yr (Save 20%)
    trainer: { monthly: 290000, annual: 2784000 }, // ₹2,900/mo, ₹27,840/yr
  };
  const amount = pricing[params.tier][params.annual ? "annual" : "monthly"];
  const planId = getPlanId(params.tier, params.annual);

  const order = await rzp.orders.create({
    amount,
    currency: "INR",
    receipt: `rcpt_${params.userId.slice(0, 24)}_${Date.now()}`,
    notes: {
      userId: params.userId,
      userEmail: params.userEmail,
      tier: params.tier,
      annual: String(params.annual),
      planId: planId || "",
    },
  });

  return {
    orderId: order.id,
    amount,
    currency: "INR",
    keyId: process.env.RAZORPAY_KEY_ID!, // safe — checked by getRazorpay()
    planId,
  };
}

/**
 * Verify the Razorpay payment signature returned by the checkout SDK.
 *
 * Razorpay signs: HMAC-SHA256(order_id + "|" + payment_id, key_secret)
 * We compare against the signature returned by the client.
 *
 * Returns true if the signature is valid (payment is authentic).
 */
export function verifyRazorpaySignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) return false;

  const expected = crypto
    .createHmac("sha256", keySecret)
    .update(`${params.orderId}|${params.paymentId}`)
    .digest("hex");

  // Constant-time comparison to prevent timing attacks.
  if (expected.length !== params.signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ params.signature.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Verify the Razorpay webhook signature (X-Razorpay-Signature header).
 * Used by /api/billing/razorpay/webhook to authenticate server-to-server calls.
 */
export function verifyRazorpayWebhookSignature(
  body: string,
  signature: string
): boolean {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) return false;

  const expected = crypto
    .createHmac("sha256", webhookSecret)
    .update(body)
    .digest("hex");

  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Map a Razorpay plan ID (from notes) back to our tier.
 * Used by the webhook handler to determine which tier to grant.
 */
export function planIdToTier(planId: string | null): "pro" | "trainer" | null {
  if (!planId) return null;
  const proPlans = [
    process.env.RAZORPAY_PLAN_PRO_MONTHLY,
    process.env.RAZORPAY_PLAN_PRO_ANNUAL,
  ].filter(Boolean) as string[];
  const trainerPlans = [
    process.env.RAZORPAY_PLAN_TRAINER_MONTHLY,
    process.env.RAZORPAY_PLAN_TRAINER_ANNUAL,
  ].filter(Boolean) as string[];

  if (proPlans.includes(planId)) return "pro";
  if (trainerPlans.includes(planId)) return "trainer";
  return null;
}
