import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { db } from "@/lib/db";

/**
 * GET /api/notifications/weekly — generates a weekly summary for the user.
 *
 * Returns: { workouts: number, totalReps: number, avgFormScore: number, bestDay: {...}, xpEarned: number }
 *
 * Can be used by a cron job to send weekly email summaries,
 * or by the client to show an in-app weekly review.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const workouts = await db.workout.findMany({
    where: {
      userId: session.user.id,
      date: { gte: oneWeekAgo },
    },
    orderBy: { date: "desc" },
  });

  if (workouts.length === 0) {
    return NextResponse.json({
      workouts: 0,
      totalReps: 0,
      avgFormScore: 0,
      xpEarned: 0,
      message: "No workouts this week. Time to start training!",
    });
  }

  const totalReps = workouts.reduce((sum, w) => sum + w.totalReps, 0);
  const avgFormScore = Math.round(
    workouts.reduce((sum, w) => sum + w.avgFormScore, 0) / workouts.length
  );
  const bestFormScore = Math.max(...workouts.map((w) => w.bestFormScore));
  const xpEarned = 50 * workouts.length + workouts.reduce(
    (sum, w) => sum + (w.avgFormScore >= 85 ? 25 * w.setsCompleted : 0),
    0
  );

  // Find best day (highest total reps)
  const byDay: Record<string, { reps: number; date: string }> = {};
  for (const w of workouts) {
    const dayKey = w.date.toDateString();
    byDay[dayKey] = {
      reps: (byDay[dayKey]?.reps || 0) + w.totalReps,
      date: dayKey,
    };
  }
  const bestDay = Object.values(byDay).sort((a, b) => b.reps - a.reps)[0];

  // Group by exercise
  const byExercise: Record<string, number> = {};
  for (const w of workouts) {
    byExercise[w.exerciseName] = (byExercise[w.exerciseName] || 0) + w.totalReps;
  }
  const topExercise = Object.entries(byExercise)
    .sort(([, a], [, b]) => b - a)[0]?.[0] || "—";

  return NextResponse.json({
    workouts: workouts.length,
    totalReps,
    avgFormScore,
    bestFormScore,
    xpEarned,
    bestDay: bestDay
      ? { date: bestDay.date, reps: bestDay.reps }
      : null,
    topExercise,
    message: `You completed ${workouts.length} workout${workouts.length === 1 ? "" : "s"} this week with an average form score of ${avgFormScore}.`,
  });
}
