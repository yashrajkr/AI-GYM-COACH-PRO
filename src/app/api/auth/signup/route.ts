import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { z } from "zod";

const SignupSchema = z.object({
  email: z.string().email("Invalid email format").max(254),
  // OWASP recommends min 8 chars. We also cap at 100 to prevent DoS via
  // absurdly long passwords (bcrypt truncates at 72 bytes anyway).
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password is too long"),
  // The name field is optional in the UI, and an untouched <input> submits as
  // "" — not `undefined`. `.min(1).optional()` rejected that empty string, so
  // every signup that skipped the name field 400'd with "Invalid input".
  // Accept blank/whitespace and normalize it to undefined instead.
  name: z
    .string()
    .max(100)
    .optional()
    .transform((v) => {
      const trimmed = v?.trim();
      return trimmed ? trimmed : undefined;
    }),
});

/**
 * POST /api/auth/signup
 *
 * Creates a new user account with credentials-based auth.
 * Email is normalized (lowercase + trim) before storage + lookup.
 *
 * Rate-limited to 5 attempts/minute per IP in `proxy.ts`.
 *
 * NOTE: This route is NOT protected by NextAuth's CSRF token (it's outside
 * `/api/auth/*`). Mitigations: (1) it only creates accounts — doesn't read
 * or modify existing user data; (2) rate limiting; (3) email verification
 * flow can be added later. The primary risk (CSRF creating spam accounts)
 * is mitigated by the rate limit + the fact that the attacker doesn't gain
 * anything by CSRF-creating accounts.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = SignupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { email, password, name } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists.
    const existing = await db.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      // Return 409 (not 200) — client should treat as "already registered".
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // Hash password with bcrypt cost factor 12 (industry-standard as of 2024).
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user + default settings atomically.
    const user = await db.user.create({
      data: {
        email: normalizedEmail,
        name: name || null,
        passwordHash,
        tier: "free",
        settings: { create: {} }, // UserSettings has sensible defaults in schema
      },
      select: {
        id: true,
        email: true,
        name: true,
        tier: true,
      },
    });

    // 201 Created — correct status for resource creation.
    // Send welcome email (fire-and-forget — doesn't block signup).
    // Falls back to no-op if Resend isn't configured.
    void (async () => {
      try {
        const { sendEmail } = await import("@/lib/email/resend");
        const { WelcomeEmail } = await import("@/lib/email/templates/welcome");
        const { createElement } = await import("react");
        // Construct element via createElement (not JSX) to avoid the
        // react-hooks/error-boundaries lint rule that forbids JSX in try/catch.
        const emailElement = createElement(WelcomeEmail, {
          email: normalizedEmail,
          name,
        });
        await sendEmail(
          normalizedEmail,
          "Welcome to AI Gym Coach Pro! 🎯",
          emailElement
        );
      } catch (e) {
        console.warn("[Signup] Welcome email failed (non-blocking):", e);
      }
    })();

    return NextResponse.json(
      { user },
      { status: 201 }
    );
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }
}
