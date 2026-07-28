/**
 * Next.js instrumentation hook — runs on server startup.
 * Used by Sentry for server-side monitoring.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./src/sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./src/sentry.edge.config");
  }
}
