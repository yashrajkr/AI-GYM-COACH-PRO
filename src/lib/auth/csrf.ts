"use client";

/**
 * Client-side helper: fetch the NextAuth CSRF token and return it.
 *
 * The token is fetched once and cached for the lifetime of the page.
 * Mutations should include it in the `x-csrf-token` header so the server
 * can verify the request originated from our app (defense-in-depth against
 * CSRF — SameSite=Lax cookies already provide primary protection).
 *
 * Usage:
 *   import { getCsrfToken } from "@/lib/auth/csrf";
 *   const token = await getCsrfToken();
 *   await fetch("/api/workouts", {
 *     method: "POST",
 *     headers: { "Content-Type": "application/json", "x-csrf-token": token },
 *     body: JSON.stringify({...}),
 *   });
 */

let cachedToken: string | null = null;
let pendingFetch: Promise<string | null> | null = null;

export async function getCsrfToken(): Promise<string | null> {
  if (cachedToken) return cachedToken;
  if (pendingFetch) return pendingFetch;

  pendingFetch = (async () => {
    try {
      const res = await fetch("/api/auth/csrf", { credentials: "same-origin" });
      if (!res.ok) return null;
      const data = await res.json();
      cachedToken = data.csrfToken || null;
      return cachedToken;
    } catch {
      return null;
    } finally {
      pendingFetch = null;
    }
  })();

  return pendingFetch;
}

/**
 * Helper: build fetch headers with the CSRF token included.
 * Use this for mutation requests (POST/PATCH/DELETE).
 *
 *   const res = await fetch("/api/workouts", {
 *     method: "POST",
 *     headers: await withCsrf({ "Content-Type": "application/json" }),
 *     body: JSON.stringify({...}),
 *   });
 */
export async function withCsrf(
  headers: Record<string, string> = {}
): Promise<Record<string, string>> {
  const token = await getCsrfToken();
  if (token) {
    return { ...headers, "x-csrf-token": token };
  }
  return headers;
}
