/**
 * Fitness Intelligence Library
 *
 * Core calculations for: 1RM, calories, training load, recovery, volume, intensity.
 * All functions are pure — no side effects, no external dependencies.
 */

import type { SessionHistoryEntry } from "@/lib/stores/workout";

// ============================================================
// 1-REP MAX (1RM) ESTIMATION
// ============================================================

/**
 * Estimate 1-Rep Max using the Epley equation.
 * 1RM = load × (1 + reps / 30)
 *
 * Only applicable to weighted exercises (loadKg > 0).
 * For bodyweight exercises, returns null.
 */
export function estimate1RM(loadKg: number, reps: number): number | null {
  if (!loadKg || loadKg <= 0 || reps <= 0) return null;
  return Math.round(loadKg * (1 + reps / 30) * 10) / 10;
}

/**
 * Track 1RM progression over time for a specific exercise.
 * Returns the best (highest) estimated 1RM from history.
 */
export function getBest1RM(history: SessionHistoryEntry[], exerciseId: string): number | null {
  const exerciseWorkouts = history.filter((h) => h.exerciseId === exerciseId);
  if (exerciseWorkouts.length === 0) return null;

  // For bodyweight exercises, estimate based on reps × assumed bodyweight factor
  // This is a rough approximation — real 1RM requires load data
  const bestReps = Math.max(...exerciseWorkouts.map((w) => w.totalReps));
  const estimatedLoad = 0.8; // Assume ~80% bodyweight for squat-like exercises
  return estimate1RM(estimatedLoad * 70, bestReps); // Assume 70kg bodyweight
}

// ============================================================
// CALORIES BURNED ESTIMATION
// ============================================================

const MET_VALUES: Record<string, number> = {
  squat: 5.0,
  pushup: 3.8,
  biceps_curl: 3.5,
  shoulder_press: 4.0,
  lunges: 4.0,
  plank: 3.0,
  jumping_jack: 8.0,
  glute_bridge: 3.5,
};

/**
 * Estimate calories burned during a workout.
 * Formula: METs × weight(kg) × duration(hours)
 *
 * @param exerciseId - Exercise type
 * @param durationSec - Duration in seconds
 * @param weightKg - User's body weight in kg (default 70kg)
 * @param avgFormScore - Form score affects intensity (0-100)
 */
export function estimateCalories(
  exerciseId: string,
  durationSec: number,
  weightKg: number = 70,
  avgFormScore: number = 80
): number {
  const met = MET_VALUES[exerciseId] || 4.0;
  const hours = durationSec / 3600;
  // Form score multiplier: higher form = more efficient movement = slightly more calories
  const intensityMultiplier = 0.8 + (avgFormScore / 100) * 0.4;
  return Math.round(met * weightKg * hours * intensityMultiplier);
}

// ============================================================
// TRAINING LOAD (Weekly Volume)
// ============================================================

export interface TrainingLoad {
  weeklyVolume: number;       // total reps this week
  weeklyDuration: number;     // total seconds this week
  weeklyCalories: number;     // estimated calories this week
  sessionsThisWeek: number;   // number of workouts this week
  avgFormScore: number;       // average form score this week
  trend: "up" | "down" | "stable"; // compared to last week
  trendPercent: number;       // percentage change
}

/**
 * Calculate training load for the current week vs last week.
 */
export function calculateTrainingLoad(history: SessionHistoryEntry[]): TrainingLoad {
  const now = new Date();
  const oneWeekAgo = new Date(now);
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const twoWeeksAgo = new Date(now);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  const thisWeek = history.filter((h) => new Date(h.date) >= oneWeekAgo);
  const lastWeek = history.filter((h) => {
    const d = new Date(h.date);
    return d >= twoWeeksAgo && d < oneWeekAgo;
  });

  const weeklyVolume = thisWeek.reduce((s, w) => s + w.totalReps, 0);
  const weeklyDuration = thisWeek.reduce((s, w) => s + w.durationSec, 0);
  const weeklyCalories = thisWeek.reduce((s, w) => {
    return s + estimateCalories(w.exerciseId, w.durationSec, 70, w.avgFormScore);
  }, 0);
  const avgFormScore = thisWeek.length > 0
    ? Math.round(thisWeek.reduce((s, w) => s + w.avgFormScore, 0) / thisWeek.length)
    : 0;

  const lastWeekVolume = lastWeek.reduce((s, w) => s + w.totalReps, 0);
  const trendPercent = lastWeekVolume > 0
    ? Math.round(((weeklyVolume - lastWeekVolume) / lastWeekVolume) * 100)
    : weeklyVolume > 0 ? 100 : 0;

  const trend: TrainingLoad["trend"] =
    Math.abs(trendPercent) < 5 ? "stable" : trendPercent > 0 ? "up" : "down";

  return {
    weeklyVolume,
    weeklyDuration,
    weeklyCalories,
    sessionsThisWeek: thisWeek.length,
    avgFormScore,
    trend,
    trendPercent,
  };
}

// ============================================================
// RECOVERY SCORE
// ============================================================

/**
 * Calculate a recovery score (0-100) based on:
 * - Time since last workout (rest is good, but too much rest = detraining)
 * - Average form score (good form = less muscle damage)
 * - Training frequency (overtraining detection)
 *
 * Higher = more recovered, ready to train.
 */
export function calculateRecoveryScore(
  lastWorkoutDate: string | null,
  avgFormScore: number,
  sessionsThisWeek: number
): number {
  if (!lastWorkoutDate) return 100; // No workouts = fully rested

  const hoursSinceLastWorkout = (Date.now() - new Date(lastWorkoutDate).getTime()) / (1000 * 60 * 60);

  // Rest component: peaks at 24-48 hours, decreases after 72 hours (detraining)
  let restScore: number;
  if (hoursSinceLastWorkout < 12) {
    restScore = 40 + (hoursSinceLastWorkout / 12) * 20; // 40-60: still recovering
  } else if (hoursSinceLastWorkout < 48) {
    restScore = 60 + ((hoursSinceLastWorkout - 12) / 36) * 40; // 60-100: optimal recovery
  } else if (hoursSinceLastWorkout < 96) {
    restScore = 100 - ((hoursSinceLastWorkout - 48) / 48) * 20; // 100-80: maintaining
  } else {
    restScore = Math.max(50, 80 - ((hoursSinceLastWorkout - 96) / 24) * 10); // declining
  }

  // Form component: good form = less injury risk = better recovery
  const formScore = 50 + (avgFormScore / 100) * 50; // 50-100

  // Frequency component: 3-5 sessions/week is optimal
  let freqScore: number;
  if (sessionsThisWeek <= 5) {
    freqScore = 70 + (sessionsThisWeek / 5) * 30; // 70-100
  } else {
    freqScore = Math.max(40, 100 - (sessionsThisWeek - 5) * 15); // overtraining penalty
  }

  // Weighted average
  return Math.round(restScore * 0.5 + formScore * 0.2 + freqScore * 0.3);
}

/**
 * Get a human-readable recovery recommendation.
 */
export function getRecoveryRecommendation(recoveryScore: number): {
  status: "ready" | "light" | "rest" | "overtrained";
  message: string;
  color: string;
} {
  if (recoveryScore >= 85) {
    return { status: "ready", message: "Fully recovered. Ready for an intense session.", color: "lime" };
  }
  if (recoveryScore >= 65) {
    return { status: "light", message: "Mostly recovered. Good for a moderate workout.", color: "cyan" };
  }
  if (recoveryScore >= 40) {
    return { status: "rest", message: "Still recovering. Consider a light session or rest day.", color: "amber" };
  }
  return { status: "overtrained", message: "Overtrained. Take a rest day or deload week.", color: "red" };
}

// ============================================================
// WORKOUT INTENSITY SCORE
// ============================================================

/**
 * Calculate workout intensity (0-100) based on:
 * - Duration (longer = more intense, up to a point)
 * - Rep density (reps per minute)
 * - Form score (lower form = higher intensity/stress)
 */
export function calculateIntensity(
  totalReps: number,
  durationSec: number,
  avgFormScore: number
): number {
  if (durationSec === 0) return 0;

  const repsPerMin = (totalReps / durationSec) * 60;

  // Duration component: peaks at 20-30 minutes
  const durationMin = durationSec / 60;
  let durationScore: number;
  if (durationMin <= 20) {
    durationScore = (durationMin / 20) * 100;
  } else if (durationMin <= 45) {
    durationScore = 100;
  } else {
    durationScore = Math.max(60, 100 - (durationMin - 45) * 2);
  }

  // Density component: 10+ reps/min is high intensity
  const densityScore = Math.min(100, (repsPerMin / 10) * 100);

  // Form component: lower form = more stress = higher intensity
  const stressScore = 100 - avgFormScore;

  return Math.round(durationScore * 0.3 + densityScore * 0.4 + stressScore * 0.3);
}

// ============================================================
// MUSCLE GROUP BALANCE
// ============================================================

const EXERCISE_MUSCLES: Record<string, string[]> = {
  squat: ["Quads", "Glutes", "Hamstrings"],
  pushup: ["Chest", "Triceps", "Shoulders"],
  biceps_curl: ["Biceps", "Forearms"],
  shoulder_press: ["Shoulders", "Triceps"],
  lunges: ["Quads", "Glutes", "Hamstrings"],
  plank: ["Core", "Shoulders"],
  jumping_jack: ["Full Body"],
  glute_bridge: ["Glutes", "Hamstrings"],
};

export interface MuscleBalance {
  muscle: string;
  volume: number;       // total reps targeting this muscle
  percentage: number;   // share of total volume
  color: string;        // for UI
}

/**
 * Calculate muscle group balance from workout history.
 * Shows which muscle groups are over/under-trained.
 */
export function calculateMuscleBalance(history: SessionHistoryEntry[]): MuscleBalance[] {
  const muscleVolume: Record<string, number> = {};

  for (const workout of history) {
    const muscles = EXERCISE_MUSCLES[workout.exerciseId] || ["Full Body"];
    for (const muscle of muscles) {
      muscleVolume[muscle] = (muscleVolume[muscle] || 0) + workout.totalReps;
    }
  }

  const totalVolume = Object.values(muscleVolume).reduce((s, v) => s + v, 0);
  if (totalVolume === 0) return [];

  const colors = ["#a3e635", "#22d3ee", "#f472b6", "#fcd34d", "#86efac", "#c084fc", "#fb923c", "#60a5fa"];

  return Object.entries(muscleVolume)
    .map(([muscle, volume], i) => ({
      muscle,
      volume,
      percentage: Math.round((volume / totalVolume) * 100),
      color: colors[i % colors.length],
    }))
    .sort((a, b) => b.volume - a.volume);
}

// ============================================================
// CONSISTENCY (Calendar Heatmap Data)
// ============================================================

export interface ConsistencyDay {
  date: string;       // ISO date string
  workoutCount: number;
  totalReps: number;
  intensity: number;  // 0-100 for heatmap color
}

/**
 * Generate consistency data for the last N days.
 * Used for the GitHub-style activity calendar.
 */
export function calculateConsistency(history: SessionHistoryEntry[], days: number = 84): ConsistencyDay[] {
  const result: ConsistencyDay[] = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toDateString();

    const dayWorkouts = history.filter((h) => new Date(h.date).toDateString() === dateStr);

    const totalReps = dayWorkouts.reduce((s, w) => s + w.totalReps, 0);
    const intensity = dayWorkouts.length > 0
      ? Math.min(100, Math.max(20, totalReps / 2))
      : 0;

    result.push({
      date: date.toISOString(),
      workoutCount: dayWorkouts.length,
      totalReps,
      intensity,
    });
  }

  return result;
}

// ============================================================
// SMART REST TIMER
// ============================================================

/**
 * Calculate recommended rest time based on exercise type and intensity.
 * Returns rest time in seconds.
 */
export function calculateRestTime(
  exerciseId: string,
  intensity: number,
  setNumber: number
): number {
  // Base rest by exercise type (in seconds)
  const baseRest: Record<string, number> = {
    squat: 90,
    pushup: 60,
    biceps_curl: 45,
    shoulder_press: 75,
    lunges: 60,
    plank: 45,
    jumping_jack: 30,
    glute_bridge: 45,
  };

  const base = baseRest[exerciseId] || 60;

  // Intensity multiplier: higher intensity = more rest
  const intensityMultiplier = 0.8 + (intensity / 100) * 0.6; // 0.8 - 1.4

  // Set progression: later sets need more rest
  const setMultiplier = 1 + (setNumber - 1) * 0.1; // +10% per set

  return Math.round(base * intensityMultiplier * setMultiplier);
}

// ============================================================
// FITNESS LEVEL ESTIMATION
// ============================================================

export type FitnessLevel = "beginner" | "intermediate" | "advanced" | "elite";

export function estimateFitnessLevel(
  totalWorkouts: number,
  avgFormScore: number,
  streak: number,
  totalReps: number
): FitnessLevel {
  // Scoring system: each factor contributes points
  const workoutScore = Math.min(40, totalWorkouts * 2);       // 0-40
  const formScore = Math.min(30, (avgFormScore - 50) * 0.6);  // 0-30
  const streakScore = Math.min(20, streak * 1.5);             // 0-20
  const volumeScore = Math.min(10, totalReps / 100);           // 0-10

  const total = workoutScore + formScore + streakScore + volumeScore;

  if (total >= 80) return "elite";
  if (total >= 55) return "advanced";
  if (total >= 30) return "intermediate";
  return "beginner";
}
