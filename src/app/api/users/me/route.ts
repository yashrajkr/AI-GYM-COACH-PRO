import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { db } from "@/lib/db";
import { z } from "zod";

/**
 * GET /api/users/me — fetch current user profile
 *
 * If the session is valid but the user no longer exists in the DB (e.g. they
 * deleted their account from another device), returns 401 so the client
 * clears the stale session and prompts re-login.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      tier: true,
      totalXp: true,
      streak: true,
      longestStreak: true,
      createdAt: true,
    },
  });

  if (!user) {
    // Stale session — user was deleted. Return 401 (not 404) so the client
    // signs out instead of showing a "user not found" error.
    return NextResponse.json(
      { error: "Session is stale — user no longer exists. Please sign in again." },
      { status: 401 }
    );
  }

  return NextResponse.json({ user });
}

// Allowlist of acceptable image URL hosts (prevents SSRF via the `image` field).
// Add real CDN domains here when integrating an avatar service.
const ALLOWED_IMAGE_HOSTS = [
  "lh3.googleusercontent.com", // Google OAuth avatars
  "avatars.githubusercontent.com", // GitHub OAuth avatars
];

function isAllowedImage(url: string): boolean {
  try {
    const u = new URL(url);
    // Allow https only (no http, no file, no data URIs for user images).
    if (u.protocol !== "https:") return false;
    return ALLOWED_IMAGE_HOSTS.includes(u.hostname);
  } catch {
    return false;
  }
}

const UpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  image: z
    .string()
    .url()
    .optional()
    .refine((v) => !v || isAllowedImage(v), {
      message: "Image URL must be from an allowed host (Google or GitHub avatars).",
    }),
});

/**
 * PATCH /api/users/me — update current user profile
 *
 * NOTE: `image` is restricted to an allowlist of OAuth provider avatar hosts
 * to prevent SSRF (a user could otherwise set their avatar to
 * `http://169.254.169.254/...` to probe internal services).
 */
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = UpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid update data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updated = await db.user.update({
      where: { id: session.user.id },
      data: parsed.data,
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

    return NextResponse.json({ user: updated });
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
