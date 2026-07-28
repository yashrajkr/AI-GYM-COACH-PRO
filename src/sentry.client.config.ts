import * as Sentry from "@sentry/nextjs";

/**
 * Sentry client-side initialization.
 * Only activates if SENTRY_DSN is set — safe to deploy without it.
 */
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    profilesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    environment: process.env.NODE_ENV,
    enabled: process.env.NODE_ENV === "production",
    // Filter out noisy errors
    ignoreErrors: [
      "ResizeObserver loop limit exceeded",
      "ResizeObserver loop completed with undelivered notifications",
      "Network request failed",
    ],
  });
}
