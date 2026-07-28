import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { db } from "@/lib/db";
import { getCsrfToken } from "next-auth/react";
import type { NextRequest } from "next/server";

/**
 * Server-side helper: fetch the current user's recent workouts.
 * Returns an empty array if not authenticated.
 */
export async function getServerWorkouts(limit = 50) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return [];

  const workouts = await db.workout.findMany({
    where: { userId: session.user.id },
    orderBy: { date: "desc" },
    take: limit,
  });

  return workouts;
}

/**
 * Server-side helper: fetch the current user's profile (XP, streak, tier).
 */
export async function getServerUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  return db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      tier: true,
      totalXp: true,
      streak: true,
    },
  });
}

/**
 * Verify the NextAuth CSRF token for mutation requests (POST/PATCH/DELETE).
 *
 * NextAuth exposes a CSRF token at GET /api/auth/csrf. The client must send
 * it back in the `x-csrf-token` header (recommended for JSON APIs).
 *
 * This helper compares the supplied token against the session's expected token
 * using NextAuth's `getCsrfToken({ req })`. Returns true if valid.
 *
 * Usage:
 *   if (req.method !== "GET") {
 *     const ok = await verifyCsrfToken(req);
 *     if (!ok) return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
 *   }
 *
 * NOTE: SameSite=Lax cookies already provide reasonable CSRF protection for
 * same-site mutations. This is defense-in-depth for state-changing endpoints.
 *
 * NOTE 2: For simplicity, this helper ONLY reads the token from the
 * `x-csrf-token` header. Reading from JSON body is complex because NextRequest
 * bodies are read-once; if we read it here, downstream handlers can't call
 * `req.json()` again. The header is the recommended approach.
 */
export async function verifyCsrfToken(req: NextRequest): Promise<boolean> {
  const suppliedToken = req.headers.get("x-csrf-token");
  if (!suppliedToken) return false;

  // getCsrfToken reads the session cookie from req headers + compares
  // against the secret-derived expected token.
  // next-auth's CtxOrReq type expects Node's IncomingHttpHeaders, but a
  // NextRequest.headers is a WHATWG Headers — convert via plain object.
  const headerObj: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    headerObj[key] = value;
  });
  const expected = await getCsrfToken({
    req: { headers: headerObj },
  });
  if (!expected) return false;

  // Constant-time-ish comparison to avoid timing attacks.
  if (suppliedToken.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < suppliedToken.length; i++) {
    diff |= suppliedToken.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}
