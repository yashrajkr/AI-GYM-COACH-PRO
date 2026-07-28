import * as Sentry from "@sentry/nextjs";

/**
 * Sentry server-side initialization.
 * Only activates if SENTRY_DSN is set.
 */
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    profilesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    environment: process.env.NODE_ENV,
    enabled: process.env.NODE_ENV === "production",
  });
}
