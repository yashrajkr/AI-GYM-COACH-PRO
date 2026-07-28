import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Lightweight in-memory rate limiter.
 * For production with multiple instances, use @upstash/ratelimit + Redis.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetAt) {
      rateLimitMap.delete(key);
    }
  }
}

function rateLimit(
  identifier: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
  cleanup();
  const now = Date.now();
  const existing = rateLimitMap.get(identifier);

  if (!existing || now > existing.resetAt) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  if (existing.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return { allowed: true, remaining: limit - existing.count, resetAt: existing.resetAt };
}

/**
 * Security headers applied to ALL responses.
 * Note: X-Frame-Options is SAMEORIGIN (not DENY) so the preview iframe works.
 * CSP frame-ancestors is 'self' for the same reason.
 */
const SECURITY_HEADERS: Record<string, string> = {
  "X-Frame-Options": "SAMEORIGIN",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(self), microphone=(), geolocation=(), interest-cohort=()",
  "X-DNS-Prefetch-Control": "on",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
  // CSP — frame-ancestors 'self' allows the preview iframe
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://storage.googleapis.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https:",
    // Every host the app actually fetches from at runtime. Missing entries
    // here fail silently-ish (a console CSP violation and a rejected fetch),
    // so keep this in sync with the fetch sites:
    //   jsdelivr + googleapis → MediaPipe wasm/model CDN fallback (live-coach.tsx)
    //   fonts.gstatic         → troika/drei <Text> glyph loading
    //   blob:/data:           → MediaPipe wasm instantiation
    // If you enable PostHog or Sentry, add their ingest hosts here too —
    // they are omitted while unconfigured so we don't widen the policy for
    // nothing.
    "connect-src 'self' blob: data: https://accounts.google.com https://cdn.jsdelivr.net https://storage.googleapis.com https://fonts.gstatic.com",
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; "),
};

// Next.js 16 uses "proxy" instead of "middleware"
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
             req.headers.get("x-real-ip") ||
             "unknown";

  // Skip proxy for these paths — they must pass through without any interference
  const SKIP_PROXY_PATHS = [
    "/api/billing/webhook",           // Stripe webhook (verified by signature)
    "/api/billing/razorpay/webhook",  // Razorpay webhook (verified by signature)
    "/api/auth/session",              // NextAuth session check (fetched on every page load)
    "/api/auth/csrf",                 // NextAuth CSRF token
    "/api/auth/providers",            // NextAuth providers list
    "/api/health",                    // Health check
  ];
  if (SKIP_PROXY_PATHS.includes(pathname)) {
    const response = NextResponse.next();
    for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
      response.headers.set(key, value);
    }
    return response;
  }

  // Rate limit auth endpoints (but NOT session/csrf/providers which are already skipped)
  if (pathname.startsWith("/api/auth/")) {
    if (pathname === "/api/auth/signup") {
      const result = rateLimit(`signup:${ip}`, 5, 60 * 1000);
      if (!result.allowed) {
        return new NextResponse(
          JSON.stringify({ error: "Too many signup attempts. Try again later." }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              "Retry-After": String(Math.ceil((result.resetAt - Date.now()) / 1000)),
              ...SECURITY_HEADERS,
            },
          }
        );
      }
    }

    if (pathname.includes("/callback/credentials") || pathname === "/api/auth/callback/credentials") {
      const result = rateLimit(`signin:${ip}`, 10, 60 * 1000);
      if (!result.allowed) {
        return new NextResponse(
          JSON.stringify({ error: "Too many login attempts. Try again later." }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              "Retry-After": String(Math.ceil((result.resetAt - Date.now()) / 1000)),
              ...SECURITY_HEADERS,
            },
          }
        );
      }
    }
  }

  // Rate limit workout creation
  if (pathname === "/api/workouts" && req.method === "POST") {
    const result = rateLimit(`workout:${ip}`, 30, 60 * 1000);
    if (!result.allowed) {
      return new NextResponse(
        JSON.stringify({ error: "Too many requests. Try again later." }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(Math.ceil((result.resetAt - Date.now()) / 1000)),
            ...SECURITY_HEADERS,
          },
        }
      );
    }
  }

  // Apply security headers to all responses
  const response = NextResponse.next();
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|logo.svg|manifest.json|robots.txt|sw.js).*)",
  ],
};
