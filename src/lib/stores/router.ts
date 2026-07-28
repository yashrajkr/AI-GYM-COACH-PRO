"use client";

import { useState, useEffect, useCallback } from "react";
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

export function useHashRoute(): [View, (view: View) => void] {
  const [view, setView] = useState<View>(() => {
    if (typeof window === "undefined") return { kind: "landing" };
    return parseHash(window.location.hash);
  });

  useEffect(() => {
    const onHashChange = () => {
      setView(parseHash(window.location.hash));
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const navigate = useCallback((newView: View) => {
    const hash = viewToHash(newView);
    if (window.location.hash !== hash) {
      window.location.hash = hash;
    } else {
      // Same hash — still update state (e.g., program-detail with different program)
      setView(newView);
    }
  }, []);

  return [view, navigate];
}
