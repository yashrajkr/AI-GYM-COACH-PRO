import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { db } from "@/lib/db";

/**
 * GET /api/notifications/streak — checks if user should get a streak-loss warning.
 * Called by the client to trigger a local notification if streak is at risk.
 *
 * Returns: { atRisk: boolean, streak: number, lastWorkoutDate: string | null, message: string }
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { streak: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Get last workout date
  const lastWorkout = await db.workout.findFirst({
    where: { userId: session.user.id },
    orderBy: { date: "desc" },
    select: { date: true },
  });

  const now = new Date();
  const lastDate = lastWorkout?.date || null;

  // Check if streak is at risk (no workout in last 20 hours, streak > 0)
  let atRisk = false;
  let message = "";

  if (user.streak > 0 && lastDate) {
    const hoursSince = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60);
    if (hoursSince > 20 && hoursSince < 48) {
      atRisk = true;
      message = `Your ${user.streak}-day streak is at risk! Complete a workout today to keep it alive.`;
    } else if (hoursSince >= 48) {
      // Streak already broken
      atRisk = false;
      message = `Your streak was broken. Start a new one today!`;
    }
  }

  return NextResponse.json({
    atRisk,
    streak: user.streak,
    lastWorkoutDate: lastDate?.toISOString() || null,
    message,
  });
}
