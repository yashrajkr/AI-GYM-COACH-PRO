"use client";

/**
 * Runtime feature-detection for ALL optional services.
 *
 * The app must work even when NO external services are configured.
 * Every premium/integration feature checks these helpers before
 * rendering its UI. When a service is missing, the UI gracefully
 * falls back to free/demo mode — no crashes, no dead buttons.
 *
 * NOTE: These read `process.env.NEXT_PUBLIC_*` which are inlined at
 * build time. They are NOT secrets — only public identifiers.
 * Secret keys (RAZORPAY_KEY_SECRET, RESEND_API_KEY, etc.) live
 * server-side only and are never exposed to the client.
 */

// ─── Payment Providers ─────────────────────────────────────────────────────

/** Razorpay — set NEXT_PUBLIC_RAZORPAY_ENABLED=true + RAZORPAY_KEY_ID (server). */
export const isRazorpayConfigured = (): boolean =>
  process.env.NEXT_PUBLIC_RAZORPAY_ENABLED === "true" &&
  !!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

/** Stripe — set NEXT_PUBLIC_STRIPE_ENABLED=true + STRIPE_SECRET_KEY (server). */
export const isStripeConfigured = (): boolean =>
  process.env.NEXT_PUBLIC_STRIPE_ENABLED === "true";

/**
 * Is ANY payment provider configured?
 * Razorpay takes precedence (India-first) if both are set.
 */
export const isPaymentConfigured = (): boolean =>
  isRazorpayConfigured() || isStripeConfigured();

/**
 * Returns the active payment provider ("razorpay" | "stripe" | null).
 * Use this to decide which checkout flow to invoke.
 */
export const getActivePaymentProvider = (): "razorpay" | "stripe" | null => {
  if (isRazorpayConfigured()) return "razorpay";
  if (isStripeConfigured()) return "stripe";
  return null;
};

// ─── Auth Providers ────────────────────────────────────────────────────────

/**
 * Google OAuth via NextAuth — set GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET
 * (server) AND NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED=true (client).
 *
 * The two secrets are server-only, so they inline as `undefined` in the
 * browser bundle. Testing them here used to read `true` while rendering on
 * the server and `false` after hydration — a mismatch that made the
 * "Continue with Google" button flash in and then vanish. The public flag is
 * the only value both environments agree on.
 */
export const isGoogleOAuthConfigured = (): boolean =>
  process.env.NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED === "true";

/**
 * Supabase — set NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY.
 * When configured, Supabase can serve as: database, auth, or both.
 */
export const isSupabaseConfigured = (): boolean =>
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Google OAuth via Supabase — requires both Supabase AND Google OAuth
 * configured on the Supabase dashboard.
 */
export const isSupabaseGoogleOAuthConfigured = (): boolean =>
  isSupabaseConfigured() && process.env.NEXT_PUBLIC_SUPABASE_GOOGLE_ENABLED === "true";

/**
 * Is ANY Google OAuth path available?
 * (NextAuth Google OR Supabase Google)
 */
export const isAnyGoogleOAuthAvailable = (): boolean =>
  isGoogleOAuthConfigured() || isSupabaseGoogleOAuthConfigured();

// ─── Email ─────────────────────────────────────────────────────────────────

/** Resend — set RESEND_API_KEY (server) + NEXT_PUBLIC_RESEND_FROM (client). */
export const isEmailConfigured = (): boolean =>
  !!process.env.NEXT_PUBLIC_RESEND_FROM; // server key is server-only

// ─── Analytics / Monitoring ────────────────────────────────────────────────

/** PostHog — set NEXT_PUBLIC_POSTHOG_KEY. */
export const isAnalyticsConfigured = (): boolean =>
  !!process.env.NEXT_PUBLIC_POSTHOG_KEY;

/** Sentry — set NEXT_PUBLIC_SENTRY_DSN. */
export const isErrorMonitoringConfigured = (): boolean =>
  !!process.env.NEXT_PUBLIC_SENTRY_DSN;

// ─── Demo Mode ─────────────────────────────────────────────────────────────

/**
 * Demo mode is ALWAYS available — uses local SQLite + NextAuth credentials.
 * No external service required. This is the ultimate fallback.
 */
export const isDemoModeAvailable = (): boolean => true;

// ─── Summary ───────────────────────────────────────────────────────────────

/**
 * Returns a full feature status object for debugging / settings display.
 */
export function getFeatureStatus() {
  return {
    // Payments
    razorpay: isRazorpayConfigured(),
    stripe: isStripeConfigured(),
    paymentProvider: getActivePaymentProvider(),
    // Auth
    googleOAuth: isGoogleOAuthConfigured(),
    supabase: isSupabaseConfigured(),
    supabaseGoogleOAuth: isSupabaseGoogleOAuthConfigured(),
    anyGoogleOAuth: isAnyGoogleOAuthAvailable(),
    // Email
    email: isEmailConfigured(),
    // Analytics / Monitoring
    analytics: isAnalyticsConfigured(),
    errorMonitoring: isErrorMonitoringConfigured(),
    // Fallback
    demoMode: isDemoModeAvailable(),
  };
}
