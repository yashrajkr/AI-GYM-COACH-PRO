/**
 * Workout state management via Zustand.
 * Tracks active session, reps, sets, rest timers, and history.
 *
 * Offline-first design:
 *   - Workouts are written to localStorage immediately on `endWorkout`.
 *   - `syncWorkoutToServer` posts to /api/workouts with retry-on-failure.
 *   - `loadHistoryFromServer` merges server history with local-only entries
 *     (entries that haven't synced yet are preserved, not dropped).
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ExerciseId } from "@/lib/exercises";
import { estimateCalories, calculateIntensity } from "@/lib/fitness/calculations";

export interface WorkoutPlan {
  exerciseId: ExerciseId;
  targetSets: number;
  repsPerSet: number;
  load?: number; // lbs or kg
}

export interface SessionHistoryEntry {
  id: string;
  exerciseId: ExerciseId;
  exerciseName: string;
  date: string; // ISO
  totalReps: number;
  setsCompleted: number;
  durationSec: number;
  avgFormScore: number;
  bestFormScore: number;
  caloriesBurned?: number;
  intensityScore?: number;
  /** Set true once the server has accepted this entry. */
  synced?: boolean;
}

export interface WorkoutState {
  // Active workout
  isActive: boolean;
  plan: WorkoutPlan | null;
  startedAt: number | null;

  // Live metrics
  currentReps: number;
  currentSetReps: number;
  setsCompleted: number;
  avgFormScore: number;
  formScoreHistory: number[];
  lastFeedback: string | null;
  lastFeedbackAt: number | null;

  // Settings
  coachEnabled: boolean;
  coachPersonality: "drill" | "zen" | "technical";
  soundEnabled: boolean;

  // History
  history: SessionHistoryEntry[];
  totalXp: number;
  streak: number;
  lastWorkoutDate: string | null;

  // Actions
  startWorkout: (plan: WorkoutPlan) => void;
  endWorkout: () => SessionHistoryEntry | null;
  updateMetrics: (metrics: {
    reps: number;
    formScore: number;
    feedback?: string | null;
  }) => void;
  setCoachEnabled: (on: boolean) => void;
  setCoachPersonality: (p: "drill" | "zen" | "technical") => void;
  setSoundEnabled: (on: boolean) => void;
  reset: () => void;
  clearAll: () => void;
  syncWorkoutToServer: (entry: SessionHistoryEntry) => Promise<void>;
  loadHistoryFromServer: () => Promise<void>;
  /** Mark an entry as synced (used after server confirms a POST). */
  markSynced: (id: string, serverId: string) => void;
}

const XP_PER_WORKOUT = 50;
const XP_PER_PR = 100;
const XP_PER_GOOD_SET = 25;

// Form-score sample cap. At 1 sample/sec, 120 samples = 2 minutes of history
// — plenty for averaging without per-frame allocation churn.
const FORM_SCORE_HISTORY_CAP = 120;

// Number of times to retry a failed server sync, with exponential backoff.
const SYNC_MAX_RETRIES = 3;

/**
 * Throttle helper: returns true if `now - lastCall < minIntervalMs`.
 * Used to coalesce per-frame metric updates into ~1Hz store writes.
 */
function shouldThrottle(lastCallAt: number, minIntervalMs: number): boolean {
  return Date.now() - lastCallAt < minIntervalMs;
}

export const useWorkoutStore = create<WorkoutState>()(
  persist(
    (set, get) => {
      // Internal throttle trackers (not part of state).
      let lastMetricsUpdateAt = 0;

      return {
        isActive: false,
        plan: null,
        startedAt: null,
        currentReps: 0,
        currentSetReps: 0,
        setsCompleted: 0,
        avgFormScore: 0,
        formScoreHistory: [],
        lastFeedback: null,
        lastFeedbackAt: null,
        coachEnabled: true,
        coachPersonality: "drill",
        soundEnabled: true,
        history: [],
        totalXp: 0,
        streak: 0,
        lastWorkoutDate: null,

        startWorkout: (plan) =>
          set({
            isActive: true,
            plan,
            startedAt: Date.now(),
            currentReps: 0,
            currentSetReps: 0,
            setsCompleted: 0,
            avgFormScore: 0,
            formScoreHistory: [],
            lastFeedback: null,
            lastFeedbackAt: null,
          }),

        endWorkout: () => {
          const state = get();
          if (!state.plan || !state.startedAt) {
            set({ isActive: false, plan: null, startedAt: null });
            return null;
          }

          const durationSec = Math.round((Date.now() - state.startedAt) / 1000);
          const formScores = state.formScoreHistory;
          const avgFormScore =
            formScores.length > 0
              ? Math.round(formScores.reduce((a, b) => a + b, 0) / formScores.length)
              : 0;
          const bestFormScore =
            formScores.length > 0 ? Math.max(...formScores) : 0;

          // Determine if this workout set a PR by comparing bestFormScore
          // against the user's prior best for the same exercise.
          // NOTE: A PR requires at least one prior workout for the same exercise —
          // the first-ever workout is NOT a PR (nothing to compare against).
          const priorForExercise = state.history.filter(
            (h) => h.exerciseId === state.plan!.exerciseId
          );
          const priorBestForExercise = priorForExercise.reduce(
            (max, h) => Math.max(max, h.bestFormScore),
            0
          );
          const isPR =
            priorForExercise.length > 0 &&
            bestFormScore > priorBestForExercise &&
            bestFormScore > 0;

          // XP calculation — only award PR bonus when an actual PR is hit.
          let xpEarned = 0;
          if (state.setsCompleted > 0) {
            xpEarned += XP_PER_WORKOUT;
            if (avgFormScore >= 85) {
              xpEarned += XP_PER_GOOD_SET * state.setsCompleted;
            }
            if (isPR) {
              xpEarned += XP_PER_PR;
            }
          }

          // Update streak
          const today = new Date().toDateString();
          const lastDate = state.lastWorkoutDate
            ? new Date(state.lastWorkoutDate).toDateString()
            : null;
          let newStreak = state.streak;
          if (lastDate !== today) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            if (lastDate === yesterday.toDateString()) {
              newStreak += 1;
            } else {
              newStreak = 1;
            }
          }

          const entry: SessionHistoryEntry = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
            exerciseId: state.plan.exerciseId,
            exerciseName: state.plan.exerciseId
              .split("_")
              .map((w) => w[0].toUpperCase() + w.slice(1))
              .join(" "),
            date: new Date().toISOString(),
            totalReps: state.currentReps,
            setsCompleted: state.setsCompleted,
            durationSec,
            avgFormScore,
            bestFormScore,
            caloriesBurned: estimateCalories(state.plan.exerciseId, durationSec, 70, avgFormScore),
            intensityScore: calculateIntensity(state.currentReps, durationSec, avgFormScore),
            synced: false,
          };

          set({
            isActive: false,
            plan: null,
            startedAt: null,
            currentReps: 0,
            currentSetReps: 0,
            setsCompleted: 0,
            avgFormScore: 0,
            formScoreHistory: [],
            lastFeedback: null,
            lastFeedbackAt: null,
            history: [entry, ...state.history].slice(0, 200),
            totalXp: state.totalXp + xpEarned,
            streak: newStreak,
            lastWorkoutDate: new Date().toISOString(),
          });

          // Sync to server with retry. Fire-and-forget but resilient.
          void get().syncWorkoutToServer(entry);

          // Track analytics (safe no-op if PostHog not initialized)
          import("@/lib/analytics")
            .then(({ track }) =>
              track("workout_completed", {
                exercise: entry.exerciseId,
                reps: entry.totalReps,
                sets: entry.setsCompleted,
                durationSec: entry.durationSec,
                avgFormScore: entry.avgFormScore,
                xpEarned,
                isPR,
              })
            )
            .catch(() => {});

          return entry;
        },

        syncWorkoutToServer: async (entry: SessionHistoryEntry) => {
          let attempt = 0;
          // Retry loop with exponential backoff.
          while (attempt <= SYNC_MAX_RETRIES) {
            try {
              // Lazily import the CSRF helper so the store stays isomorphic
              // (the helper is client-only — fetch from /api/auth/csrf).
              const { withCsrf } = await import("@/lib/auth/csrf").catch(() => ({
                withCsrf: async (h: Record<string, string>) => h,
              }));
              const res = await fetch("/api/workouts", {
                method: "POST",
                headers: await withCsrf({ "Content-Type": "application/json" }),
                body: JSON.stringify({
                  exerciseId: entry.exerciseId,
                  exerciseName: entry.exerciseName,
                  totalReps: entry.totalReps,
                  setsCompleted: entry.setsCompleted,
                  durationSec: entry.durationSec,
                  avgFormScore: entry.avgFormScore,
                  bestFormScore: entry.bestFormScore,
                  clientTempId: entry.id,
                }),
              });
              if (res.ok) {
                // Mark as synced; if server returned a canonical id, use it.
                const data = await res.json().catch(() => ({}));
                const serverId: string | undefined = data?.workout?.id;
                get().markSynced(entry.id, serverId || entry.id);
                return;
              }
              // 4xx = client error, no point retrying.
              if (res.status >= 400 && res.status < 500) {
                console.warn(`Workout sync rejected (${res.status}); not retrying.`);
                return;
              }
              // 5xx = transient, fall through to retry.
            } catch (e) {
              // Network error — keep retrying.
              console.warn(`Workout sync attempt ${attempt + 1} failed:`, e);
            }
            attempt += 1;
            if (attempt > SYNC_MAX_RETRIES) break;
            // Exponential backoff: 1s, 2s, 4s.
            const delayMs = 1000 * Math.pow(2, attempt - 1);
            await new Promise((r) => setTimeout(r, delayMs));
          }
          console.warn("Workout sync permanently failed after retries; entry stays local.");
        },

        markSynced: (id, serverId) => {
          const state = get();
          const updated = state.history.map((h) =>
            h.id === id ? { ...h, synced: true, id: serverId || h.id } : h
          );
          set({ history: updated });
        },

        loadHistoryFromServer: async () => {
          try {
            const res = await fetch("/api/workouts?limit=100", { cache: "no-store" });
            if (!res.ok) return;
            const data = await res.json();
            if (!data.workouts || !Array.isArray(data.workouts)) return;

            const serverHistory: SessionHistoryEntry[] = data.workouts.map(
              (w: {
                id: string;
                exerciseId: ExerciseId;
                exerciseName: string;
                date: string;
                totalReps: number;
                setsCompleted: number;
                durationSec: number;
                avgFormScore: number;
                bestFormScore: number;
              }) => ({
                id: w.id,
                exerciseId: w.exerciseId,
                exerciseName: w.exerciseName,
                date: typeof w.date === "string" ? w.date : new Date(w.date).toISOString(),
                totalReps: w.totalReps,
                setsCompleted: w.setsCompleted,
                durationSec: w.durationSec,
                avgFormScore: w.avgFormScore,
                bestFormScore: w.bestFormScore,
                synced: true,
              })
            );

            // Merge: server history takes priority; local-only entries
            // (created offline, not yet synced) are preserved.
            const serverIds = new Set(serverHistory.map((h) => h.id));
            const localOnly = get().history.filter((h) => !serverIds.has(h.id));
            const merged = [...serverHistory, ...localOnly].slice(0, 200);
            set({ history: merged });
          } catch (e) {
            console.warn("Failed to load history from server:", e);
          }
        },

        updateMetrics: ({ reps, formScore, feedback }) => {
          const state = get();
          if (!state.plan || !state.isActive) return;

          // Throttle to ~1Hz to avoid React re-render storms from per-frame writes.
          // Rep changes always flow through (so the counter feels responsive),
          // but form-score history only samples once per second.
          const now = Date.now();
          const forceUpdate = reps !== state.currentReps;
          if (!forceUpdate && shouldThrottle(lastMetricsUpdateAt, 1000)) {
            return;
          }
          lastMetricsUpdateAt = now;

          const repsPerSet = state.plan.repsPerSet;
          const setsCompleted = repsPerSet > 0 ? Math.floor(reps / repsPerSet) : 0;
          const currentSetReps = repsPerSet > 0 ? reps % repsPerSet : reps;

          // Only push to history at most once per second.
          const newHistory =
            formScore > 0
              ? [...state.formScoreHistory, formScore].slice(-FORM_SCORE_HISTORY_CAP)
              : state.formScoreHistory;
          const avg =
            newHistory.length > 0
              ? Math.round(newHistory.reduce((a, b) => a + b, 0) / newHistory.length)
              : 0;

          set({
            currentReps: reps,
            currentSetReps,
            setsCompleted,
            avgFormScore: avg,
            formScoreHistory: newHistory,
            lastFeedback: feedback ?? state.lastFeedback,
            lastFeedbackAt: feedback ? Date.now() : state.lastFeedbackAt,
          });
        },

        setCoachEnabled: (on) => set({ coachEnabled: on }),
        setCoachPersonality: (p) => set({ coachPersonality: p }),
        setSoundEnabled: (on) => set({ soundEnabled: on }),

        // Reset only the active-workout fields (does not touch history/XP/streak).
        reset: () =>
          set({
            isActive: false,
            plan: null,
            startedAt: null,
            currentReps: 0,
            currentSetReps: 0,
            setsCompleted: 0,
            avgFormScore: 0,
            formScoreHistory: [],
            lastFeedback: null,
            lastFeedbackAt: null,
          }),

        // Clear ALL data — used by Settings → "Delete all local data".
        clearAll: () =>
          set({
            isActive: false,
            plan: null,
            startedAt: null,
            currentReps: 0,
            currentSetReps: 0,
            setsCompleted: 0,
            avgFormScore: 0,
            formScoreHistory: [],
            lastFeedback: null,
            lastFeedbackAt: null,
            history: [],
            totalXp: 0,
            streak: 0,
            lastWorkoutDate: null,
          }),
      };
    },
    {
      name: "gym-coach-pro",
      partialize: (state) => ({
        history: state.history,
        totalXp: state.totalXp,
        streak: state.streak,
        lastWorkoutDate: state.lastWorkoutDate,
        coachEnabled: state.coachEnabled,
        coachPersonality: state.coachPersonality,
        soundEnabled: state.soundEnabled,
      }),
    }
  )
);

// Level calculation: 50 levels, each requiring progressively more XP
export function getLevel(xp: number): {
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
  progress: number;
} {
  let level = 1;
  let remaining = xp;
  let needed = 100;
  while (remaining >= needed && level < 50) {
    remaining -= needed;
    level += 1;
    needed = Math.round(needed * 1.15);
  }
  return {
    level,
    currentLevelXp: remaining,
    nextLevelXp: needed,
    progress: needed > 0 ? remaining / needed : 0,
  };
}
