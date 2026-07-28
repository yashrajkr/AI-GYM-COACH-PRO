import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/health — Health check endpoint for uptime monitoring.
 *
 * Returns 200 if the app + database are healthy, 503 otherwise.
 *
 * SECURITY:
 *   - Uses a constant-time DB probe (`SELECT 1`) instead of `user.count()`
 *     to avoid scanning a large table on every health check.
 *   - Never leaks DB error details to the client — logs full error server-side,
 *     returns only a generic "database error" string.
 *   - Excluded from rate limiting in `proxy.ts`.
 */
export async function GET() {
  const startTime = Date.now();

  try {
    // `SELECT 1` — constant-time probe that doesn't depend on table size.
    await db.$queryRaw`SELECT 1`;

    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
      database: "connected",
      latencyMs: Date.now() - startTime,
    });
  } catch (error) {
    // Log the full error server-side for debugging.
    console.error("[health] database probe failed:", error);
    // Return a generic message to the client — no DB internals leaked.
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        database: "error",
      },
      { status: 503 }
    );
  }
}
