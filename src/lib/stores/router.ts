"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { ExerciseId } from "@/lib/exercises";
import type { WorkoutProgram } from "@/lib/data/programs";
import { PROGRAMS } from "@/lib/data/programs";

/**
 * Hash-based routing for the SPA.
 *
 * Hash format: #/<path>?<query>
 * Examples:
 *   #/                 → landing
 *   #/dashboard        → dashboard
 *   #/live/squat?sets=3&reps=10  → live coach for squat
 *   #/programs         → programs list
 *   #/programs/beginner-full-body → program detail
 *   #/analytics        → analytics
 *   #/library          → library
 *   #/login            → login
 *   #/signup           → signup
 *   #/settings         → settings
 */

export type View =
  | { kind: "landing" }
  | { kind: "dashboard" }
  | { kind: "live"; exerciseId: ExerciseId; sets: number; reps: number }
  | { kind: "summary"; exerciseId: ExerciseId; sets: number; reps: number; workoutId: string; xpEarned: number }
  | { kind: "programs" }
  | { kind: "program-detail"; program: WorkoutProgram }
  | { kind: "analytics" }
  | { kind: "library" }
  | { kind: "login" }
  | { kind: "signup" }
  | { kind: "settings" };

const VALID_EXERCISES: ExerciseId[] = ["squat", "pushup", "biceps_curl", "shoulder_press", "lunges", "plank", "jumping_jack", "glute_bridge"];

function parseHash(hash: string): View {
  // Remove leading # and /
  const clean = hash.replace(/^#\/?/, "");
  const [path, queryString] = clean.split("?");
  const segments = path.split("/").filter(Boolean);
  const params = new URLSearchParams(queryString || "");

  if (segments.length === 0) {
    return { kind: "landing" };
  }

  switch (segments[0]) {
    case "dashboard":
      return { kind: "dashboard" };

    case "live": {
      const exerciseId = (segments[1] as ExerciseId) || "squat";
      const validId = VALID_EXERCISES.includes(exerciseId) ? exerciseId : "squat";
      const sets = Math.max(1, Math.min(20, parseInt(params.get("sets") || "3", 10) || 3));
      const reps = Math.max(1, Math.min(100, parseInt(params.get("reps") || "10", 10) || 10));
      return { kind: "live", exerciseId: validId, sets, reps };
    }

    case "summary": {
      const exerciseId = (segments[1] as ExerciseId) || "squat";
      const validId = VALID_EXERCISES.includes(exerciseId) ? exerciseId : "squat";
      const sets = Math.max(1, Math.min(20, parseInt(params.get("sets") || "3", 10) || 3));
      const reps = Math.max(1, Math.min(100, parseInt(params.get("reps") || "10", 10) || 10));
      const workoutId = params.get("wid") || "";
      const xpEarned = parseInt(params.get("xp") || "0", 10) || 0;
      return { kind: "summary", exerciseId: validId, sets, reps, workoutId, xpEarned };
    }

    case "programs": {
      if (segments[1]) {
        const program = PROGRAMS.find((p) => p.id === segments[1]);
        if (program) {
          return { kind: "program-detail", program };
        }
      }
      return { kind: "programs" };
    }

    case "analytics":
      return { kind: "analytics" };

    case "library":
      return { kind: "library" };

    case "login":
      return { kind: "login" };

    case "signup":
      return { kind: "signup" };

    case "settings":
      return { kind: "settings" };

    default:
      return { kind: "landing" };
  }
}

function viewToHash(view: View): string {
  switch (view.kind) {
    case "landing":
      return "#/";
    case "dashboard":
      return "#/dashboard";
    case "live":
      return `#/live/${view.exerciseId}?sets=${view.sets}&reps=${view.reps}`;
    case "summary":
      return `#/summary/${view.exerciseId}?sets=${view.sets}&reps=${view.reps}&wid=${view.workoutId}&xp=${view.xpEarned}`;
    case "programs":
      return "#/programs";
    case "program-detail":
      return `#/programs/${view.program.id}`;
    case "analytics":
      return "#/analytics";
    case "library":
      return "#/library";
    case "login":
      return "#/login";
    case "signup":
      return "#/signup";
    case "settings":
      return "#/settings";
  }
}

// ── External store over `window.location.hash` ────────────────────────────
//
// The hash is browser-only state, so reading it during render (the old
// `useState(() => parseHash(location.hash))`) made the client's first render
// disagree with the server's — a deep link like `#/dashboard` hydrated the
// server's `landing` tree with a dashboard tree and React threw
// "Hydration failed because the server rendered HTML didn't match the client".
//
// `useSyncExternalStore` is the sanctioned fix: React uses `getServerSnapshot`
// for both the SSR pass AND the hydration pass, so the trees match, then
// re-reads the real hash immediately after hydration.

const listeners = new Set<() => void>();

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  window.addEventListener("hashchange", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("hashchange", onChange);
  };
}

function emit() {
  for (const l of listeners) l();
}

// Snapshots must be referentially stable across calls, so the store returns
// the raw hash *string* and the View object is derived (memoized) in the hook.
function getSnapshot(): string {
  return window.location.hash;
}

function getServerSnapshot(): string {
  return "#/";
}

export function useHashRoute(): [View, (view: View) => void] {
  const hash = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const view = useMemo(() => parseHash(hash), [hash]);

  const navigate = useCallback((newView: View) => {
    const nextHash = viewToHash(newView);
    if (window.location.hash !== nextHash) {
      window.location.hash = nextHash;
    } else {
      // Same hash — nudge subscribers so the view still re-resolves.
      emit();
    }
  }, []);

  return [view, navigate];
}
