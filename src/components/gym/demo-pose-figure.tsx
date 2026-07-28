"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

/**
 * The landing demo's pose figure.
 *
 * Replaces the decorative 3D mannequin, which stood still while the caption
 * said "sit back deeper" and a GOOD/WARN/FIX legend pointed at nothing.
 * What this draws is the thing the product actually sells: a tracked skeleton,
 * per-joint colouring, and a live joint angle, performing the selected
 * exercise.
 *
 * Two viewing angles. Side reads depth and torso lean (what a coach watches on
 * a squat); front reads symmetry and knee/elbow tracking (what a coach watches
 * for valgus or elbow flare). A single fixed angle hid half the movement — you
 * cannot see squat depth from the front, or knee tracking from the side.
 *
 * Deliberately SVG rather than Three.js: a flat overlay is what pose detection
 * genuinely looks like, it renders identically everywhere, it costs no WebGL
 * context on a phone, and the joints are plain numbers we can unit-test.
 */

/**
 * Rig keys match `ExerciseId` from @/lib/exercises so the same figure can be
 * reused anywhere an exercise is shown — the landing demo, the live-coach
 * warm-up panel, the exercise library.
 */
export type RigExercise =
  | "squat"
  | "pushup"
  | "biceps_curl"
  | "shoulder_press"
  | "lunges"
  | "plank"
  | "jumping_jack"
  | "glute_bridge";

/** The subset the marketing demo toggles between. */
export type DemoExercise = Extract<RigExercise, "squat" | "pushup" | "biceps_curl">;

export type ViewAngle = "side" | "front";

interface Point {
  x: number;
  y: number;
}

export type Pose = Record<string, Point>;

interface RigView {
  top: Pose;
  bottom: Pose;
  bones: [string, string][];
  /**
   * The joint this angle coaches, how deep into the rep it starts to drift,
   * its caption, and the three joints whose interior angle is displayed.
   * This is what gives the GOOD/WARN/FIX legend meaning: the flagged joint
   * turns amber exactly while the cue is telling you to fix it.
   */
  coached: {
    joint: string;
    from: number;
    label: string;
    angleAt: [string, string, string];
  };
}

const SIDE_BONES: [string, string][] = [
  ["head", "shoulder"],
  ["shoulder", "elbow"],
  ["elbow", "wrist"],
  ["shoulder", "hip"],
  ["hip", "knee"],
  ["knee", "ankle"],
  ["ankle", "toe"],
];

const FRONT_BONES: [string, string][] = [
  ["head", "shoulderL"],
  ["head", "shoulderR"],
  ["shoulderL", "shoulderR"],
  ["shoulderL", "elbowL"],
  ["elbowL", "wristL"],
  ["shoulderR", "elbowR"],
  ["elbowR", "wristR"],
  ["shoulderL", "hipL"],
  ["shoulderR", "hipR"],
  ["hipL", "hipR"],
  ["hipL", "kneeL"],
  ["kneeL", "ankleL"],
  ["hipR", "kneeR"],
  ["kneeR", "ankleR"],
];

/**
 * Each exercise/view is two keyframes in a 100x100 box. `top` starts the rep,
 * `bottom` ends the working phase; the animation eases between them and back.
 * Two keyframes read clearly at this size and keep the motion obviously right.
 */
/**
 * `front` is optional: several movements only read meaningfully from one
 * angle (you learn nothing about a plank head-on). The figure falls back to
 * `side` and callers hide the view toggle when there is only one angle.
 */
export const RIGS: Record<RigExercise, { side: RigView; front?: RigView }> = {
  squat: {
    side: {
      bones: SIDE_BONES,
      coached: { joint: "knee", from: 0.62, label: "DEPTH", angleAt: ["hip", "knee", "ankle"] },
      top: {
        head: { x: 50, y: 12 },
        shoulder: { x: 50, y: 24 },
        elbow: { x: 50, y: 36 },
        wrist: { x: 50, y: 48 },
        hip: { x: 50, y: 50 },
        knee: { x: 50, y: 70 },
        ankle: { x: 50, y: 88 },
        toe: { x: 57, y: 90 },
      },
      bottom: {
        // Hips travel down and back, knees track forward, torso folds, arms
        // counterbalance forward — the shape a coached squat actually makes.
        head: { x: 56, y: 30 },
        shoulder: { x: 53, y: 42 },
        elbow: { x: 60, y: 47 },
        wrist: { x: 68, y: 48 },
        hip: { x: 44, y: 64 },
        knee: { x: 58, y: 72 },
        ankle: { x: 50, y: 88 },
        toe: { x: 57, y: 90 },
      },
    },
    front: {
      bones: FRONT_BONES,
      // From the front the coaching point is knee tracking, not depth.
      coached: { joint: "kneeR", from: 0.6, label: "KNEE TRACK", angleAt: ["hipR", "kneeR", "ankleR"] },
      top: {
        head: { x: 50, y: 12 },
        shoulderL: { x: 42, y: 24 },
        shoulderR: { x: 58, y: 24 },
        elbowL: { x: 40, y: 38 },
        elbowR: { x: 60, y: 38 },
        wristL: { x: 39, y: 52 },
        wristR: { x: 61, y: 52 },
        hipL: { x: 45, y: 50 },
        hipR: { x: 55, y: 50 },
        kneeL: { x: 44, y: 70 },
        kneeR: { x: 56, y: 70 },
        ankleL: { x: 44, y: 88 },
        ankleR: { x: 56, y: 88 },
      },
      bottom: {
        head: { x: 50, y: 30 },
        shoulderL: { x: 41, y: 42 },
        shoulderR: { x: 59, y: 42 },
        elbowL: { x: 36, y: 52 },
        elbowR: { x: 64, y: 52 },
        wristL: { x: 34, y: 60 },
        wristR: { x: 66, y: 60 },
        hipL: { x: 44, y: 64 },
        hipR: { x: 56, y: 64 },
        // Knees drive out over the toes rather than collapsing inward.
        kneeL: { x: 40, y: 72 },
        kneeR: { x: 60, y: 72 },
        ankleL: { x: 44, y: 88 },
        ankleR: { x: 56, y: 88 },
      },
    },
  },

  pushup: {
    side: {
      bones: SIDE_BONES,
      coached: { joint: "hip", from: 0.5, label: "HIP SAG", angleAt: ["shoulder", "elbow", "wrist"] },
      top: {
        head: { x: 78, y: 52 },
        shoulder: { x: 68, y: 56 },
        elbow: { x: 68, y: 68 },
        wrist: { x: 68, y: 82 },
        hip: { x: 46, y: 62 },
        knee: { x: 30, y: 68 },
        ankle: { x: 16, y: 76 },
        toe: { x: 12, y: 82 },
      },
      bottom: {
        // Hands stay planted; the whole body lowers and the elbow tracks back.
        head: { x: 78, y: 66 },
        shoulder: { x: 68, y: 70 },
        elbow: { x: 58, y: 76 },
        wrist: { x: 68, y: 82 },
        hip: { x: 46, y: 72 },
        knee: { x: 30, y: 76 },
        ankle: { x: 16, y: 80 },
        toe: { x: 12, y: 84 },
      },
    },
    front: {
      bones: FRONT_BONES,
      // Head-on, the thing worth watching is how far the elbows flare.
      coached: { joint: "elbowR", from: 0.45, label: "ELBOW FLARE", angleAt: ["shoulderR", "elbowR", "wristR"] },
      top: {
        head: { x: 50, y: 30 },
        shoulderL: { x: 42, y: 42 },
        shoulderR: { x: 58, y: 42 },
        elbowL: { x: 34, y: 52 },
        elbowR: { x: 66, y: 52 },
        wristL: { x: 30, y: 64 },
        wristR: { x: 70, y: 64 },
        hipL: { x: 46, y: 62 },
        hipR: { x: 54, y: 62 },
        kneeL: { x: 46, y: 76 },
        kneeR: { x: 54, y: 76 },
        ankleL: { x: 46, y: 88 },
        ankleR: { x: 54, y: 88 },
      },
      bottom: {
        head: { x: 50, y: 34 },
        shoulderL: { x: 42, y: 46 },
        shoulderR: { x: 58, y: 46 },
        // Elbows flare wide — the fault the cue calls out.
        elbowL: { x: 26, y: 50 },
        elbowR: { x: 74, y: 50 },
        wristL: { x: 30, y: 64 },
        wristR: { x: 70, y: 64 },
        hipL: { x: 46, y: 64 },
        hipR: { x: 54, y: 64 },
        kneeL: { x: 46, y: 77 },
        kneeR: { x: 54, y: 77 },
        ankleL: { x: 46, y: 88 },
        ankleR: { x: 54, y: 88 },
      },
    },
  },

  biceps_curl: {
    side: {
      bones: SIDE_BONES,
      coached: { joint: "shoulder", from: 0.68, label: "SWING", angleAt: ["shoulder", "elbow", "wrist"] },
      top: {
        head: { x: 50, y: 12 },
        shoulder: { x: 50, y: 24 },
        elbow: { x: 51, y: 40 },
        wrist: { x: 52, y: 56 },
        hip: { x: 50, y: 52 },
        knee: { x: 50, y: 72 },
        ankle: { x: 50, y: 88 },
        toe: { x: 57, y: 90 },
      },
      bottom: {
        // Only the forearm travels — everything else is pinned, which is the
        // whole coaching point of a curl.
        head: { x: 50, y: 12 },
        shoulder: { x: 50, y: 24 },
        elbow: { x: 51, y: 40 },
        wrist: { x: 60, y: 28 },
        hip: { x: 50, y: 52 },
        knee: { x: 50, y: 72 },
        ankle: { x: 50, y: 88 },
        toe: { x: 57, y: 90 },
      },
    },
    front: {
      bones: FRONT_BONES,
      coached: { joint: "elbowR", from: 0.5, label: "ELBOW", angleAt: ["shoulderR", "elbowR", "wristR"] },
      top: {
        head: { x: 50, y: 12 },
        shoulderL: { x: 42, y: 24 },
        shoulderR: { x: 58, y: 24 },
        elbowL: { x: 41, y: 40 },
        elbowR: { x: 59, y: 40 },
        wristL: { x: 40, y: 56 },
        wristR: { x: 60, y: 56 },
        hipL: { x: 45, y: 52 },
        hipR: { x: 55, y: 52 },
        kneeL: { x: 45, y: 72 },
        kneeR: { x: 55, y: 72 },
        ankleL: { x: 45, y: 88 },
        ankleR: { x: 55, y: 88 },
      },
      bottom: {
        head: { x: 50, y: 12 },
        shoulderL: { x: 42, y: 24 },
        shoulderR: { x: 58, y: 24 },
        elbowL: { x: 41, y: 40 },
        elbowR: { x: 59, y: 40 },
        // Both hands rise to the shoulders; elbows stay pinned.
        wristL: { x: 44, y: 28 },
        wristR: { x: 56, y: 28 },
        hipL: { x: 45, y: 52 },
        hipR: { x: 55, y: 52 },
        kneeL: { x: 45, y: 72 },
        kneeR: { x: 55, y: 72 },
        ankleL: { x: 45, y: 88 },
        ankleR: { x: 55, y: 88 },
      },
    },
  },

  lunges: {
    side: {
      bones: SIDE_BONES,
      coached: { joint: "knee", from: 0.55, label: "KNEE OVER TOE", angleAt: ["hip", "knee", "ankle"] },
      top: {
        head: { x: 50, y: 12 },
        shoulder: { x: 50, y: 24 },
        elbow: { x: 50, y: 36 },
        wrist: { x: 50, y: 48 },
        hip: { x: 50, y: 50 },
        knee: { x: 50, y: 70 },
        ankle: { x: 50, y: 88 },
        toe: { x: 57, y: 90 },
      },
      bottom: {
        // Torso stays tall and drops straight down; the lead knee travels
        // forward over the foot. Unlike a squat the hips do not shift back.
        head: { x: 48, y: 26 },
        shoulder: { x: 48, y: 38 },
        elbow: { x: 48, y: 48 },
        wrist: { x: 48, y: 58 },
        hip: { x: 48, y: 62 },
        knee: { x: 60, y: 74 },
        ankle: { x: 60, y: 88 },
        toe: { x: 67, y: 90 },
      },
    },
    front: {
      bones: FRONT_BONES,
      coached: { joint: "kneeR", from: 0.55, label: "KNEE TRACK", angleAt: ["hipR", "kneeR", "ankleR"] },
      top: {
        head: { x: 50, y: 12 },
        shoulderL: { x: 42, y: 24 },
        shoulderR: { x: 58, y: 24 },
        elbowL: { x: 40, y: 38 },
        elbowR: { x: 60, y: 38 },
        wristL: { x: 39, y: 52 },
        wristR: { x: 61, y: 52 },
        hipL: { x: 45, y: 50 },
        hipR: { x: 55, y: 50 },
        kneeL: { x: 45, y: 70 },
        kneeR: { x: 55, y: 70 },
        ankleL: { x: 45, y: 88 },
        ankleR: { x: 55, y: 88 },
      },
      bottom: {
        // Split stance: the rear knee (left) drops lower than the lead knee.
        head: { x: 50, y: 26 },
        shoulderL: { x: 42, y: 38 },
        shoulderR: { x: 58, y: 38 },
        elbowL: { x: 40, y: 50 },
        elbowR: { x: 60, y: 50 },
        wristL: { x: 39, y: 62 },
        wristR: { x: 61, y: 62 },
        hipL: { x: 45, y: 62 },
        hipR: { x: 55, y: 62 },
        kneeL: { x: 44, y: 80 },
        kneeR: { x: 56, y: 74 },
        ankleL: { x: 44, y: 88 },
        ankleR: { x: 56, y: 88 },
      },
    },
  },

  shoulder_press: {
    side: {
      bones: SIDE_BONES,
      coached: { joint: "elbow", from: 0.5, label: "LOCKOUT", angleAt: ["shoulder", "elbow", "wrist"] },
      top: {
        // Racked at the shoulders. The figure sits lower in the box than the
        // other standing rigs so the overhead position still fits.
        head: { x: 50, y: 20 },
        shoulder: { x: 50, y: 32 },
        elbow: { x: 58, y: 42 },
        wrist: { x: 57, y: 33 },
        hip: { x: 50, y: 56 },
        knee: { x: 50, y: 73 },
        ankle: { x: 50, y: 88 },
        toe: { x: 57, y: 90 },
      },
      bottom: {
        // Pressed overhead, elbows locked, wrists stacked over the shoulders.
        head: { x: 50, y: 20 },
        shoulder: { x: 50, y: 32 },
        elbow: { x: 53, y: 20 },
        wrist: { x: 51, y: 8 },
        hip: { x: 50, y: 56 },
        knee: { x: 50, y: 73 },
        ankle: { x: 50, y: 88 },
        toe: { x: 57, y: 90 },
      },
    },
    front: {
      bones: FRONT_BONES,
      coached: { joint: "elbowR", from: 0.5, label: "LOCKOUT", angleAt: ["shoulderR", "elbowR", "wristR"] },
      top: {
        head: { x: 50, y: 20 },
        shoulderL: { x: 42, y: 32 },
        shoulderR: { x: 58, y: 32 },
        elbowL: { x: 34, y: 42 },
        elbowR: { x: 66, y: 42 },
        wristL: { x: 36, y: 32 },
        wristR: { x: 64, y: 32 },
        hipL: { x: 45, y: 56 },
        hipR: { x: 55, y: 56 },
        kneeL: { x: 45, y: 73 },
        kneeR: { x: 55, y: 73 },
        ankleL: { x: 45, y: 88 },
        ankleR: { x: 55, y: 88 },
      },
      bottom: {
        head: { x: 50, y: 20 },
        shoulderL: { x: 42, y: 32 },
        shoulderR: { x: 58, y: 32 },
        // Hands travel up and in — the bar path finishes over the head.
        elbowL: { x: 40, y: 20 },
        elbowR: { x: 60, y: 20 },
        wristL: { x: 45, y: 8 },
        wristR: { x: 55, y: 8 },
        hipL: { x: 45, y: 56 },
        hipR: { x: 55, y: 56 },
        kneeL: { x: 45, y: 73 },
        kneeR: { x: 55, y: 73 },
        ankleL: { x: 45, y: 88 },
        ankleR: { x: 55, y: 88 },
      },
    },
  },

  glute_bridge: {
    // Floor exercise — only readable from the side.
    side: {
      bones: SIDE_BONES,
      coached: { joint: "hip", from: 0.45, label: "HIP HEIGHT", angleAt: ["shoulder", "hip", "knee"] },
      top: {
        // Lying on the back, hips down, knees bent, feet planted.
        head: { x: 20, y: 78 },
        shoulder: { x: 30, y: 80 },
        elbow: { x: 34, y: 86 },
        wrist: { x: 40, y: 88 },
        hip: { x: 55, y: 80 },
        knee: { x: 68, y: 70 },
        ankle: { x: 72, y: 88 },
        toe: { x: 79, y: 90 },
      },
      bottom: {
        // Hips drive up; shoulders and feet stay planted.
        head: { x: 20, y: 78 },
        shoulder: { x: 30, y: 80 },
        elbow: { x: 34, y: 86 },
        wrist: { x: 40, y: 88 },
        hip: { x: 55, y: 64 },
        knee: { x: 68, y: 66 },
        ankle: { x: 72, y: 88 },
        toe: { x: 79, y: 90 },
      },
    },
  },

  plank: {
    // An isometric hold: the "rep" here is the hips drifting out of line,
    // which is exactly the fault the coach calls out.
    side: {
      bones: SIDE_BONES,
      coached: { joint: "hip", from: 0.3, label: "HIP SAG", angleAt: ["shoulder", "hip", "knee"] },
      top: {
        head: { x: 78, y: 58 },
        shoulder: { x: 68, y: 62 },
        elbow: { x: 68, y: 74 },
        wrist: { x: 76, y: 80 },
        hip: { x: 46, y: 68 },
        knee: { x: 30, y: 74 },
        ankle: { x: 16, y: 80 },
        toe: { x: 12, y: 84 },
      },
      bottom: {
        head: { x: 78, y: 58 },
        shoulder: { x: 68, y: 62 },
        elbow: { x: 68, y: 74 },
        wrist: { x: 76, y: 80 },
        hip: { x: 46, y: 78 },
        knee: { x: 30, y: 80 },
        ankle: { x: 16, y: 82 },
        toe: { x: 12, y: 86 },
      },
    },
  },

  jumping_jack: {
    // Only meaningful head-on, but `side` is the required angle, so the
    // sagittal arm swing lives there and the front view carries the real
    // information.
    side: {
      bones: SIDE_BONES,
      coached: { joint: "shoulder", from: 0.5, label: "ARM SWING", angleAt: ["hip", "shoulder", "elbow"] },
      top: {
        head: { x: 50, y: 14 },
        shoulder: { x: 50, y: 26 },
        elbow: { x: 50, y: 40 },
        wrist: { x: 50, y: 54 },
        hip: { x: 50, y: 52 },
        knee: { x: 50, y: 71 },
        ankle: { x: 50, y: 88 },
        toe: { x: 57, y: 90 },
      },
      bottom: {
        head: { x: 50, y: 14 },
        shoulder: { x: 50, y: 26 },
        elbow: { x: 46, y: 14 },
        wrist: { x: 44, y: 4 },
        hip: { x: 50, y: 52 },
        knee: { x: 50, y: 71 },
        ankle: { x: 50, y: 88 },
        toe: { x: 57, y: 90 },
      },
    },
    front: {
      bones: FRONT_BONES,
      coached: { joint: "ankleR", from: 0.4, label: "STANCE", angleAt: ["hipR", "kneeR", "ankleR"] },
      top: {
        head: { x: 50, y: 14 },
        shoulderL: { x: 42, y: 26 },
        shoulderR: { x: 58, y: 26 },
        elbowL: { x: 40, y: 40 },
        elbowR: { x: 60, y: 40 },
        wristL: { x: 39, y: 54 },
        wristR: { x: 61, y: 54 },
        hipL: { x: 46, y: 52 },
        hipR: { x: 54, y: 52 },
        kneeL: { x: 46, y: 70 },
        kneeR: { x: 54, y: 70 },
        ankleL: { x: 47, y: 88 },
        ankleR: { x: 53, y: 88 },
      },
      bottom: {
        // Arms overhead, feet wide — the open position of the jack.
        head: { x: 50, y: 14 },
        shoulderL: { x: 42, y: 26 },
        shoulderR: { x: 58, y: 26 },
        elbowL: { x: 32, y: 18 },
        elbowR: { x: 68, y: 18 },
        wristL: { x: 26, y: 8 },
        wristR: { x: 74, y: 8 },
        hipL: { x: 46, y: 52 },
        hipR: { x: 54, y: 52 },
        kneeL: { x: 38, y: 70 },
        kneeR: { x: 62, y: 70 },
        ankleL: { x: 32, y: 88 },
        ankleR: { x: 68, y: 88 },
      },
    },
  },
};

const COLORS = {
  good: "#a3e635",
  warn: "#fcd34d",
  fix: "#fca5a5",
};

const REP_SECONDS = 3;
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  const mql = window.matchMedia(REDUCED_MOTION_QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function lerpPose(top: Pose, bottom: Pose, t: number): Pose {
  const out: Pose = {};
  for (const j of Object.keys(top)) {
    out[j] = { x: lerp(top[j].x, bottom[j].x, t), y: lerp(top[j].y, bottom[j].y, t) };
  }
  return out;
}

/** Interior angle at `b`, in degrees. Real trig on the rendered joints. */
export function angleAt(a: Point, b: Point, c: Point): number {
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  const mag = Math.hypot(ab.x, ab.y) * Math.hypot(cb.x, cb.y);
  if (mag === 0) return 0;
  const cos = Math.min(1, Math.max(-1, (ab.x * cb.x + ab.y * cb.y) / mag));
  return Math.round((Math.acos(cos) * 180) / Math.PI);
}

/** True when this exercise reads meaningfully from both angles. */
export function hasFrontView(exercise: RigExercise): boolean {
  return RIGS[exercise].front !== undefined;
}

interface DemoPoseFigureProps {
  exercise: RigExercise;
  view: ViewAngle;
  /** Pauses the loop; the figure holds its current pose. */
  paused?: boolean;
  /** Fires once per completed rep, at the top of the movement. */
  onRepComplete?: () => void;
  className?: string;
}

export function DemoPoseFigure({
  exercise,
  view,
  paused = false,
  onRepComplete,
  className,
}: DemoPoseFigureProps) {
  const [animatedDepth, setDepth] = useState(0); // 0 = top of rep, 1 = bottom
  // Read the preference during render rather than syncing it into state from
  // an effect. The server snapshot is `false`, so markup still matches.
  const reduceMotion = useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false
  );
  // Reduced motion holds a readable mid-rep pose instead of animating.
  const depth = reduceMotion ? 0.65 : animatedDepth;
  const frame = useRef(0);
  const repsSeen = useRef(0);
  const startedAt = useRef(0);

  // Keep the callback in a ref so the animation loop never restarts just
  // because the parent re-rendered with a new closure.
  const onRep = useRef(onRepComplete);
  useEffect(() => {
    onRep.current = onRepComplete;
  }, [onRepComplete]);

  useEffect(() => {
    if (paused || reduceMotion) return;

    startedAt.current = performance.now();
    repsSeen.current = 0;

    const tick = (now: number) => {
      const cycles = (now - startedAt.current) / 1000 / REP_SECONDS;
      const phase = cycles % 1;
      // Down for the first half, up for the second, smoothstepped so the
      // turnaround reads as a controlled rep rather than a bounce.
      const linear = phase < 0.5 ? phase * 2 : (1 - phase) * 2;
      setDepth(linear * linear * (3 - 2 * linear));

      const completed = Math.floor(cycles);
      if (completed > repsSeen.current) {
        repsSeen.current = completed;
        onRep.current?.();
      }
      frame.current = requestAnimationFrame(tick);
    };

    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [paused, exercise, view, reduceMotion]);

  // Falls back to the side view for movements that only read from one angle.
  const rig = RIGS[exercise][view] ?? RIGS[exercise].side;
  const pose = useMemo(() => lerpPose(rig.top, rig.bottom, depth), [rig, depth]);

  // The coached joint drifts good → warn → fix as the rep deepens, which is
  // when form actually breaks down.
  const { coached } = rig;
  const drift = depth <= coached.from ? 0 : (depth - coached.from) / (1 - coached.from);
  const coachedColor = drift > 0.66 ? COLORS.fix : drift > 0.15 ? COLORS.warn : COLORS.good;

  const [a, b, c] = coached.angleAt;
  const liveAngle = angleAt(pose[a], pose[b], pose[c]);
  const anchor = pose[coached.joint];
  // Flip the readout to the other side when the joint sits near the right edge,
  // so the badge never runs outside the viewBox.
  const badgeLeft = anchor.x > 68 ? anchor.x - 30 : anchor.x + 6;

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid meet"
      className={className}
      role="img"
      aria-label={`Animated ${exercise} demonstration, ${view} view, with AI pose tracking overlay`}
    >
      {/* Floor line — gives the figure somewhere to stand so the motion reads
          as depth rather than the whole body drifting. */}
      <line
        x1="8"
        y1="91.5"
        x2="92"
        y2="91.5"
        stroke={COLORS.good}
        strokeOpacity="0.18"
        strokeWidth="0.5"
      />

      {/* Bones */}
      <g strokeLinecap="round">
        {rig.bones.map(([from, to]) => {
          const lit = from === coached.joint || to === coached.joint;
          return (
            <line
              key={`${from}-${to}`}
              x1={pose[from].x}
              y1={pose[from].y}
              x2={pose[to].x}
              y2={pose[to].y}
              stroke={lit ? coachedColor : COLORS.good}
              strokeOpacity={lit ? 0.85 : 0.5}
              strokeWidth="1.6"
            />
          );
        })}
      </g>

      {/* Joints */}
      {Object.keys(pose).map((j) => {
        const isCoached = j === coached.joint;
        const isHead = j === "head";
        return (
          <g key={j}>
            {isCoached && (
              <circle cx={pose[j].x} cy={pose[j].y} r="4.2" fill={coachedColor} opacity="0.18" />
            )}
            <circle
              cx={pose[j].x}
              cy={pose[j].y}
              r={isHead ? 3.4 : isCoached ? 2.4 : 1.7}
              fill={isHead ? "none" : isCoached ? coachedColor : COLORS.good}
              stroke={isHead ? COLORS.good : "none"}
              strokeWidth={isHead ? 1.6 : 0}
            />
          </g>
        );
      })}

      {/* Live joint angle on the coached joint — the readout that makes
          "per-rep form scoring" concrete instead of a claim. */}
      <g transform={`translate(${badgeLeft}, ${anchor.y - 4})`}>
        <rect
          x="0"
          y="-4"
          width="26"
          height="10"
          rx="2"
          fill="#050608"
          fillOpacity="0.85"
          stroke={coachedColor}
          strokeOpacity="0.5"
          strokeWidth="0.3"
        />
        <text x="2" y="-0.3" fill={coachedColor} fontSize="2.9" fontFamily="monospace">
          {coached.label}
        </text>
        <text x="2" y="4" fill={coachedColor} fontSize="4" fontFamily="monospace" fontWeight="bold">
          {liveAngle}°
        </text>
      </g>
    </svg>
  );
}
