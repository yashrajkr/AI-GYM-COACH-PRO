"use client";

import { useEffect, useRef } from "react";
import type { Landmarks } from "@/lib/exercises";
import { POSE_CONNECTIONS } from "@/lib/exercises";

/**
 * Form Heatmap Skeleton Renderer
 *
 * Draws the pose skeleton with joints colored by deviation from ideal:
 * - Green (#a3e635): within 5° of ideal
 * - Amber (#fcd34d): 5-15° off
 * - Red (#fca5a5): >15° off (triggers voice cue in parent)
 *
 * Also accumulates per-joint deviation stats across the session
 * for post-workout heatmap summary.
 */

export interface JointDeviation {
  index: number;
  deviation: number; // degrees from ideal
}

export interface SessionDeviationStats {
  // Per-joint-index accumulation of deviation samples
  [index: number]: {
    totalDeviation: number;
    samples: number;
    maxDeviation: number;
  };
}

interface FormHeatmapSkeletonProps {
  landmarks: Landmarks | null;
  width: number;
  height: number;
  /** Optional: current deviations to color joints by. If absent, uses default green. */
  deviations?: JointDeviation[];
  /** Mirror horizontally (for selfie-style camera) */
  mirror?: boolean;
}

function colorForDeviation(dev: number): string {
  if (dev <= 5) return "#a3e635"; // green — good
  if (dev <= 15) return "#fcd34d"; // amber — warning
  return "#fca5a5"; // red — bad
}

export function FormHeatmapSkeleton({
  landmarks,
  width,
  height,
  deviations = [],
  mirror = true,
}: FormHeatmapSkeletonProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const devMapRef = useRef<Map<number, number>>(new Map());

  // Build a quick lookup of current deviations by joint index
  useEffect(() => {
    const map = new Map<number, number>();
    for (const d of deviations) {
      map.set(d.index, d.deviation);
    }
    devMapRef.current = map;
    // Note: session-wide stats accumulation is handled by the parent component
    // to avoid ref mutation issues in this effect.
  }, [deviations]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);

    if (!landmarks) return;

    ctx.save();
    if (mirror) {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }

    // Draw connections
    for (const [start, end] of POSE_CONNECTIONS) {
      const p1 = landmarks[start];
      const p2 = landmarks[end];
      if (p1.visibility > 0.5 && p2.visibility > 0.5) {
        // Color the connection by the worse of the two joints
        const d1 = devMapRef.current.get(start) ?? 0;
        const d2 = devMapRef.current.get(end) ?? 0;
        const worst = Math.max(d1, d2);
        const color = colorForDeviation(worst);

        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(p1.x * width, p1.y * height);
        ctx.lineTo(p2.x * width, p2.y * height);
        ctx.stroke();
      }
    }

    // Draw joints
    ctx.shadowBlur = 6;
    for (let i = 0; i < landmarks.length; i++) {
      const lm = landmarks[i];
      if (lm.visibility <= 0.5) continue;

      const dev = devMapRef.current.get(i) ?? 0;
      const color = colorForDeviation(dev);

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(lm.x * width, lm.y * height, 5, 0, Math.PI * 2);
      ctx.fill();

      // Outer ring for deviations > 5
      if (dev > 5) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(lm.x * width, lm.y * height, 8 + dev * 0.2, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    ctx.restore();
  }, [landmarks, width, height, mirror]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  );
}

/**
 * Compute deviation for a given angle vs. an ideal range.
 * Returns 0 if within range, else the distance to the nearest bound.
 */
export function computeAngleDeviation(
  measured: number,
  idealMin: number,
  idealMax: number
): number {
  if (measured >= idealMin && measured <= idealMax) return 0;
  if (measured < idealMin) return idealMin - measured;
  return measured - idealMax;
}

/**
 * Helper: compute deviations for key joints based on exercise + metrics.
 * Returns an array of {index, deviation} for the heatmap.
 */
export function getExerciseDeviations(
  exerciseId: string,
  metrics: any
): JointDeviation[] {
  const deviations: JointDeviation[] = [];
  if (exerciseId === "squat") {
    const m = metrics as any;
    if (m.knee_angle !== undefined) {
      // Ideal knee at bottom: 70-100°
      deviations.push({
        index: 25, // left knee
        deviation: computeAngleDeviation(m.knee_angle, 70, 100),
      });
      deviations.push({
        index: 26, // right knee
        deviation: computeAngleDeviation(m.knee_angle, 70, 100),
      });
    }
    if (m.back_angle !== undefined) {
      // Ideal back angle: 30-50° from vertical
      deviations.push({
        index: 23, // left hip
        deviation: computeAngleDeviation(m.back_angle, 30, 50),
      });
      deviations.push({
        index: 24, // right hip
        deviation: computeAngleDeviation(m.back_angle, 30, 50),
      });
    }
  } else if (exerciseId === "pushup") {
    const m = metrics as any;
    if (m.elbow_angle !== undefined) {
      deviations.push({
        index: 13, // left elbow
        deviation: computeAngleDeviation(m.elbow_angle, 90, 160),
      });
      deviations.push({
        index: 14, // right elbow
        deviation: computeAngleDeviation(m.elbow_angle, 90, 160),
      });
    }
  } else if (exerciseId === "biceps_curl") {
    const m = metrics as any;
    if (m.elbow_angle !== undefined) {
      deviations.push({
        index: 13, // left elbow
        deviation: computeAngleDeviation(m.elbow_angle, 30, 160),
      });
      deviations.push({
        index: 14, // right elbow
        deviation: computeAngleDeviation(m.elbow_angle, 30, 160),
      });
    }
  } else if (exerciseId === "shoulder_press") {
    const m = metrics as any;
    if (m.elbow_angle !== undefined) {
      deviations.push({
        index: 13,
        deviation: computeAngleDeviation(m.elbow_angle, 90, 180),
      });
      deviations.push({
        index: 14,
        deviation: computeAngleDeviation(m.elbow_angle, 90, 180),
      });
    }
  } else if (exerciseId === "lunges") {
    const m = metrics as any;
    if (m.front_knee_angle !== undefined) {
      deviations.push({
        index: 25,
        deviation: computeAngleDeviation(m.front_knee_angle, 80, 110),
      });
      deviations.push({
        index: 26,
        deviation: computeAngleDeviation(m.front_knee_angle, 80, 110),
      });
    }
  }
  return deviations;
}
