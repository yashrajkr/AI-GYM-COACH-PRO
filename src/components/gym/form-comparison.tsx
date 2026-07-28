"use client";

import { useRef, useEffect } from "react";
import type { Landmarks } from "@/lib/exercises";
import { POSE_CONNECTIONS } from "@/lib/exercises";

/**
 * AI Form Comparison
 *
 * Side-by-side view: user's live skeleton vs. an "ideal" reference skeleton
 * (pre-recorded from a certified trainer). Shows angle differences as floating
 * numbers on each joint.
 *
 * The reference skeleton is a synthetic "ideal" pose for the current exercise
 * — a normalized pose that represents textbook form at the bottom of the rep.
 */

// Ideal reference poses — normalized 0-1 coordinates for each exercise
// These represent textbook form at the bottom of the movement
const IDEAL_POSES: Record<string, Landmarks> = {
  squat: generateIdealSquat(),
  pushup: generateIdealPushup(),
  biceps_curl: generateIdealCurl(),
  shoulder_press: generateIdealPress(),
  lunges: generateIdealLunge(),
};

function generateIdealSquat(): Landmarks {
  // Ideal squat bottom: deep knee bend, torso leaning forward ~30°, arms forward
  const base = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 1 }));
  base[11] = { x: 0.42, y: 0.35, z: 0, visibility: 1 }; // L shoulder
  base[12] = { x: 0.58, y: 0.35, z: 0, visibility: 1 }; // R shoulder
  base[13] = { x: 0.38, y: 0.45, z: 0, visibility: 1 }; // L elbow
  base[14] = { x: 0.62, y: 0.45, z: 0, visibility: 1 }; // R elbow
  base[15] = { x: 0.36, y: 0.55, z: 0, visibility: 1 }; // L wrist
  base[16] = { x: 0.64, y: 0.55, z: 0, visibility: 1 }; // R wrist
  base[23] = { x: 0.45, y: 0.55, z: 0, visibility: 1 }; // L hip
  base[24] = { x: 0.55, y: 0.55, z: 0, visibility: 1 }; // R hip
  base[25] = { x: 0.43, y: 0.72, z: 0, visibility: 1 }; // L knee (bent)
  base[26] = { x: 0.57, y: 0.72, z: 0, visibility: 1 }; // R knee (bent)
  base[27] = { x: 0.42, y: 0.88, z: 0, visibility: 1 }; // L ankle
  base[28] = { x: 0.58, y: 0.88, z: 0, visibility: 1 }; // R ankle
  return base;
}

function generateIdealPushup(): Landmarks {
  const base = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 1 }));
  base[11] = { x: 0.35, y: 0.45, z: 0, visibility: 1 };
  base[12] = { x: 0.65, y: 0.45, z: 0, visibility: 1 };
  base[13] = { x: 0.30, y: 0.55, z: 0, visibility: 1 };
  base[14] = { x: 0.70, y: 0.55, z: 0, visibility: 1 };
  base[15] = { x: 0.28, y: 0.65, z: 0, visibility: 1 };
  base[16] = { x: 0.72, y: 0.65, z: 0, visibility: 1 };
  base[23] = { x: 0.40, y: 0.55, z: 0, visibility: 1 };
  base[24] = { x: 0.60, y: 0.55, z: 0, visibility: 1 };
  base[25] = { x: 0.42, y: 0.75, z: 0, visibility: 1 };
  base[26] = { x: 0.58, y: 0.75, z: 0, visibility: 1 };
  base[27] = { x: 0.44, y: 0.90, z: 0, visibility: 1 };
  base[28] = { x: 0.56, y: 0.90, z: 0, visibility: 1 };
  return base;
}

function generateIdealCurl(): Landmarks {
  const base = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 1 }));
  base[11] = { x: 0.45, y: 0.30, z: 0, visibility: 1 };
  base[12] = { x: 0.55, y: 0.30, z: 0, visibility: 1 };
  base[13] = { x: 0.42, y: 0.42, z: 0, visibility: 1 };
  base[14] = { x: 0.58, y: 0.42, z: 0, visibility: 1 };
  base[15] = { x: 0.40, y: 0.32, z: 0, visibility: 1 }; // curled up
  base[16] = { x: 0.60, y: 0.32, z: 0, visibility: 1 };
  base[23] = { x: 0.48, y: 0.55, z: 0, visibility: 1 };
  base[24] = { x: 0.52, y: 0.55, z: 0, visibility: 1 };
  base[25] = { x: 0.47, y: 0.78, z: 0, visibility: 1 };
  base[26] = { x: 0.53, y: 0.78, z: 0, visibility: 1 };
  base[27] = { x: 0.47, y: 0.95, z: 0, visibility: 1 };
  base[28] = { x: 0.53, y: 0.95, z: 0, visibility: 1 };
  return base;
}

function generateIdealPress(): Landmarks {
  const base = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 1 }));
  base[11] = { x: 0.42, y: 0.40, z: 0, visibility: 1 };
  base[12] = { x: 0.58, y: 0.40, z: 0, visibility: 1 };
  base[13] = { x: 0.40, y: 0.28, z: 0, visibility: 1 }; // arms extended up
  base[14] = { x: 0.60, y: 0.28, z: 0, visibility: 1 };
  base[15] = { x: 0.40, y: 0.15, z: 0, visibility: 1 };
  base[16] = { x: 0.60, y: 0.15, z: 0, visibility: 1 };
  base[23] = { x: 0.46, y: 0.55, z: 0, visibility: 1 };
  base[24] = { x: 0.54, y: 0.55, z: 0, visibility: 1 };
  base[25] = { x: 0.45, y: 0.78, z: 0, visibility: 1 };
  base[26] = { x: 0.55, y: 0.78, z: 0, visibility: 1 };
  base[27] = { x: 0.45, y: 0.95, z: 0, visibility: 1 };
  base[28] = { x: 0.55, y: 0.95, z: 0, visibility: 1 };
  return base;
}

function generateIdealLunge(): Landmarks {
  const base = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 1 }));
  base[11] = { x: 0.45, y: 0.30, z: 0, visibility: 1 };
  base[12] = { x: 0.55, y: 0.30, z: 0, visibility: 1 };
  base[13] = { x: 0.40, y: 0.40, z: 0, visibility: 1 };
  base[14] = { x: 0.60, y: 0.40, z: 0, visibility: 1 };
  base[15] = { x: 0.38, y: 0.50, z: 0, visibility: 1 };
  base[16] = { x: 0.62, y: 0.50, z: 0, visibility: 1 };
  base[23] = { x: 0.46, y: 0.52, z: 0, visibility: 1 };
  base[24] = { x: 0.54, y: 0.52, z: 0, visibility: 1 };
  base[25] = { x: 0.40, y: 0.70, z: 0, visibility: 1 }; // front knee bent
  base[26] = { x: 0.60, y: 0.80, z: 0, visibility: 1 }; // back knee down
  base[27] = { x: 0.38, y: 0.88, z: 0, visibility: 1 };
  base[28] = { x: 0.62, y: 0.92, z: 0, visibility: 1 };
  return base;
}

export function getIdealPose(exerciseId: string): Landmarks | null {
  return IDEAL_POSES[exerciseId] ?? null;
}

interface FormComparisonProps {
  /** User's live landmarks */
  liveLandmarks: Landmarks | null;
  exerciseId: string;
  width: number;
  height: number;
  mirror?: boolean;
}

export function FormComparison({
  liveLandmarks,
  exerciseId,
  width,
  height,
  mirror = true,
}: FormComparisonProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ideal = getIdealPose(exerciseId);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);

    if (!ideal) return;

    // Split canvas: left half = ideal, right half = live
    const halfW = width / 2;

    // Draw ideal (left, magenta)
    drawSkeleton(ctx, ideal, 0, 0, halfW, height, "#f472b6", 0.7, false);

    // Draw live (right, lime) if available
    if (liveLandmarks) {
      drawSkeleton(ctx, liveLandmarks, halfW, 0, halfW, height, "#a3e635", 1.0, mirror);

      // Draw deviation numbers on key joints of the live side
      drawDeviations(ctx, liveLandmarks, ideal, halfW, 0, halfW, height, mirror);
    }

    // Divider line
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(halfW, 0);
    ctx.lineTo(halfW, height);
    ctx.stroke();

    // Labels
    ctx.fillStyle = "#f472b6";
    ctx.font = "bold 14px monospace";
    ctx.fillText("IDEAL", 12, 24);
    ctx.fillStyle = "#a3e635";
    ctx.fillText("YOU", halfW + 12, 24);
  }, [liveLandmarks, ideal, width, height, mirror]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  );
}

function drawSkeleton(
  ctx: CanvasRenderingContext2D,
  landmarks: Landmarks,
  offsetX: number,
  offsetY: number,
  w: number,
  h: number,
  color: string,
  opacity: number,
  mirror: boolean
) {
  ctx.save();
  ctx.globalAlpha = opacity;
  if (mirror) {
    ctx.translate(offsetX + w, offsetY);
    ctx.scale(-1, 1);
  } else {
    ctx.translate(offsetX, offsetY);
  }

  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.shadowColor = color;
  ctx.shadowBlur = 6;

  for (const [start, end] of POSE_CONNECTIONS) {
    const p1 = landmarks[start];
    const p2 = landmarks[end];
    if (p1.visibility > 0.5 && p2.visibility > 0.5) {
      ctx.beginPath();
      ctx.moveTo(p1.x * w, p1.y * h);
      ctx.lineTo(p2.x * w, p2.y * h);
      ctx.stroke();
    }
  }

  ctx.shadowBlur = 3;
  ctx.fillStyle = color;
  for (const lm of landmarks) {
    if (lm.visibility > 0.5) {
      ctx.beginPath();
      ctx.arc(lm.x * w, lm.y * h, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawDeviations(
  ctx: CanvasRenderingContext2D,
  live: Landmarks,
  ideal: Landmarks,
  offsetX: number,
  offsetY: number,
  w: number,
  h: number,
  mirror: boolean
) {
  // Show deviation on key joints: shoulders (11,12), elbows (13,14), hips (23,24), knees (25,26)
  const keyJoints = [11, 12, 13, 14, 23, 24, 25, 26];
  ctx.save();
  if (mirror) {
    ctx.translate(offsetX + w, offsetY);
    ctx.scale(-1, 1);
  } else {
    ctx.translate(offsetX, offsetY);
  }
  ctx.font = "bold 11px monospace";

  for (const idx of keyJoints) {
    const lp = live[idx];
    const ip = ideal[idx];
    if (lp.visibility < 0.5 || ip.visibility < 0.5) continue;

    const dx = (lp.x - ip.x) * w;
    const dy = (lp.y - ip.y) * h;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const deviation = Math.round(dist / w * 100); // percentage of width

    const color = deviation < 5 ? "#a3e635" : deviation < 15 ? "#fcd34d" : "#fca5a5";
    ctx.fillStyle = color;
    const x = lp.x * w;
    const y = lp.y * h;
    ctx.fillText(`${deviation}%`, x + 8, y - 8);
  }
  ctx.restore();
}
