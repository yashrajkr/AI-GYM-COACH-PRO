/**
 * Boot-time environment variable validation.
 * Fails loudly if critical vars are missing or still set to dev defaults.
 */

const REQUIRED_ENV_VARS = ["DATABASE_URL", "NEXTAUTH_URL", "NEXTAUTH_SECRET"] as const;

// Known insecure dev-default secrets — must never appear in production.
const DEV_DEFAULTS: Record<string, string[]> = {
  NEXTAUTH_SECRET: [
    "ai-gym-coach-pro-dev-secret-change-in-production-2026",
    "dev-fallback-secret-change-in-production",
    "insecure-dev-only-do-not-use-in-prod",
    "CHANGE_ME_generate_with_openssl_rand_base64_32",
  ],
};

// Optional env vars — when set, they must look plausible (non-empty, not placeholder).
const OPTIONAL_FORMATTED_ENV_VARS: Record<string, (v: string) => boolean> = {
  NEXTAUTH_URL: (v) => {
    if (!v) return true;
    try {
      const u = new URL(v);
      // In production, require https — EXCEPT for localhost/127.0.0.1 which
      // is allowed for local prod builds + preview environments.
      const isLocal = u.hostname === "localhost" || u.hostname === "127.0.0.1";
      if (process.env.NODE_ENV === "production" && u.protocol !== "https:" && !isLocal) {
        return false;
      }
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  },
  STRIPE_SECRET_KEY: (v) => !v || /^sk_(test|live)_/.test(v),
  STRIPE_WEBHOOK_SECRET: (v) => !v || /^whsec_/.test(v),
  STRIPE_PRICE_PRO_MONTHLY: (v) => !v || /^price_/.test(v),
  STRIPE_PRICE_PRO_ANNUAL: (v) => !v || /^price_/.test(v),
  STRIPE_PRICE_TRAINER_MONTHLY: (v) => !v || /^price_/.test(v),
  STRIPE_PRICE_TRAINER_ANNUAL: (v) => !v || /^price_/.test(v),
};

let validated = false;

/**
 * Is this the `next build` compile step (as opposed to a running server)?
 *
 * Next sets NEXT_PHASE while building. This matters because `next build`
 * imports every route module to collect page data — including
 * `/api/auth/[...nextauth]`, which imports this file. Throwing there killed
 * the build with the opaque "Failed to collect page data for
 * /api/auth/[...nextauth]", even though nothing was actually wrong with the
 * code: a build machine legitimately may not have runtime secrets.
 *
 * Validation still hard-fails at RUNTIME in production, which is where it
 * protects anything.
 */
export function isBuildPhase(): boolean {
  return (
    process.env.NEXT_PHASE === "phase-production-build" ||
    // Vercel exposes this during the build container only.
    process.env.NEXT_IS_EXPORT_WORKER === "1"
  );
}

/**
 * Vercel does not set NEXTAUTH_URL for you, but it does set VERCEL_URL.
 * Without this, a Vercel deploy that otherwise has every secret configured
 * still fails validation (and NextAuth builds broken callback URLs).
 */
function resolveNextAuthUrlFromVercel(): void {
  if (process.env.NEXTAUTH_URL) return;
  const vercelUrl =
    process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (vercelUrl) {
    process.env.NEXTAUTH_URL = `https://${vercelUrl}`;
  }
}

export function validateEnv(): void {
  if (validated) return; // Only validate once
  validated = true;

  resolveNextAuthUrlFromVercel();

  const errors: string[] = [];

  // Required vars — always checked.
  for (const key of REQUIRED_ENV_VARS) {
    const value = process.env[key];
    if (!value) {
      errors.push(`Missing required env var: ${key}`);
    } else if (DEV_DEFAULTS[key]?.includes(value)) {
      errors.push(
        `Env var ${key} is still set to a known dev default. Generate a real value with: openssl rand -base64 32`
      );
    }
  }

  // Format checks for optional vars.
  for (const [key, isValid] of Object.entries(OPTIONAL_FORMATTED_ENV_VARS)) {
    const value = process.env[key];
    if (value && !isValid(value)) {
      errors.push(`Env var ${key} has an invalid format: "${value.slice(0, 20)}…"`);
    }
  }

  // In production, hard-fail at runtime. During the build step and in
  // dev/test, warn only.
  if (errors.length > 0) {
    const msg =
      `Environment validation failed:\n  - ${errors.join("\n  - ")}\n` +
      `See .env.example for the full list of required variables.`;
    if (process.env.NODE_ENV === "production" && !isBuildPhase()) {
      throw new Error(`FATAL: ${msg}`);
    } else {
      // `validated` is latched above, but a build-phase warning must not
      // count as "already validated" for the server that starts afterwards.
      if (isBuildPhase()) validated = false;
      console.warn(`⚠️  ${msg}`);
    }
  }
}

/**
 * Returns the validated NEXTAUTH_URL, throwing if missing or malformed.
 * Used by billing routes that need an absolute redirect URL.
 */
export function getNextAuthUrl(): string {
  const url = process.env.NEXTAUTH_URL;
  if (!url) {
    throw new Error(
      "NEXTAUTH_URL is not set. Configure it in .env (e.g. https://your-app.com)"
    );
  }
  try {
    new URL(url);
  } catch {
    throw new Error(`NEXTAUTH_URL is not a valid URL: ${url}`);
  }
  return url.replace(/\/$/, ""); // strip trailing slash
}
