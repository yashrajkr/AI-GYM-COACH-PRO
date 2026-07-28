import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { db } from "@/lib/db";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { getStripe, isStripeConfigured } from "@/lib/billing/stripe";

/**
 * DELETE /api/users/me/delete — permanently delete the user's account + all data.
 *
 * GDPR Article 17 (Right to Erasure) compliance.
 *
 * Hardening:
 *   - Requires password re-authentication. A stolen session cookie alone is
 *     NOT enough to permanently destroy all user data — the attacker would
 *     also need the user's password.
 *   - Cancels any active Stripe subscription before deleting the DB record
 *     (otherwise the subscription keeps billing a non-existent account).
 *   - Writes an audit-log entry BEFORE deleting (so we have evidence of
 *     erasure even after the user row is gone).
 *
 * Cascade deletes (configured in Prisma schema) handle:
 *   workouts, accounts, sessions, profile, settings, achievements,
 *   notifications, referrals, activity logs (except the audit entry below,
 *   which uses `userId: "system"` to survive the cascade).
 */

const DeleteSchema = z.object({
  password: z.string().min(1).max(256),
  confirm: z.literal("DELETE"), // require explicit confirmation string
});

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse + validate body.
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = DeleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { password } = parsed.data;

  try {
    // 1. Re-authenticate: verify the user's password matches.
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true, passwordHash: true, stripeSubId: true, stripeCustomerId: true, tier: true },
    });

    if (!user) {
      // Already deleted? Return success so the client can sign out cleanly.
      return NextResponse.json({ success: true, message: "Account not found" });
    }

    // OAuth-only users (no passwordHash) cannot re-auth with a password.
    // They must delete via OAuth provider revocation + a separate flow.
    // For now, reject with a clear message.
    if (!user.passwordHash) {
      return NextResponse.json(
        {
          error:
            "Account is OAuth-linked (no password). Sign in with password first, or contact support to delete your account.",
        },
        { status: 403 }
      );
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      // 401 (not 403) so the client can show "wrong password" UX.
      return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
    }

    // 2. Cancel Stripe subscription if one is active.
    if (user.stripeSubId && isStripeConfigured()) {
      try {
        const stripe = getStripe();
        await stripe.subscriptions.cancel(user.stripeSubId);
        console.log(`[delete] cancelled Stripe subscription ${user.stripeSubId} for user ${user.id}`);
      } catch (e) {
        // Log but don't block deletion — the user wants their data gone.
        console.warn(`[delete] failed to cancel Stripe subscription ${user.stripeSubId}:`, e);
      }
    }

    // 3. Write an audit-log entry BEFORE deleting the user.
    // Use `userId: "system"` so the entry survives the cascade delete.
    await db.activityLog.create({
      data: {
        userId: "system",
        action: "account_deleted",
        entityType: "user",
        entityId: user.id,
        metadata: JSON.stringify({
          deletedUserId: user.id,
          deletedUserEmail: user.email,
          previousTier: user.tier,
          deletedAt: new Date().toISOString(),
          gdprBasis: "Article 17 - Right to Erasure",
        }),
      },
    });

    // 4. Delete the user (cascade handles workouts, sessions, etc.).
    await db.user.delete({
      where: { id: user.id },
    });

    console.log(`[delete] user ${user.id} (${user.email}) permanently deleted`);

    return NextResponse.json(
      { success: true, message: "Account and all data deleted" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Account deletion error:", error);
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    );
  }
}
