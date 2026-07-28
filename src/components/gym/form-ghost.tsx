"use client";

import { useRef, useEffect } from "react";
import type { Landmarks } from "@/lib/exercises";
import { POSE_CONNECTIONS } from "@/lib/exercises";

/**
 * Form Ghost Overlay
 *
 * Records the user's best rep (highest form score) and replays it as a
 * translucent cyan skeleton alongside the live skeleton, so the user can
 * visually match their peak form.
 *
 * Recording: called by the parent on each frame with current landmarks + form score.
 *            When a rep completes, if its form score > best recorded, store it.
 * Playback:  the ghost skeleton loops continuously, drawn at low opacity in cyan.
 */

export interface GhostRecording {
  frames: Landmarks[]; // sequence of landmark snapshots across the rep
  formScore: number;
  timestamp: number;
}

interface FormGhostOverlayProps {
  /** The ghost recording to play back. If null, nothing is drawn. */
  ghost: GhostRecording | null;
  width: number;
  height: number;
  mirror?: boolean;
  /** Current playback progress 0-1 (driven by parent's frame counter) */
  progress: number;
}

export function FormGhostOverlay({
  ghost,
  width,
  height,
  mirror = true,
  progress,
}: FormGhostOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);

    if (!ghost || ghost.frames.length === 0) return;

    // Pick the frame at current progress
    const frameIdx = Math.min(
      ghost.frames.length - 1,
      Math.floor(progress * ghost.frames.length)
    );
    const landmarks = ghost.frames[frameIdx];
    if (!landmarks) return;

    ctx.save();
    if (mirror) {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }

    // Ghost style: translucent cyan, no shadow (subtle)
    ctx.strokeStyle = "rgba(34, 211, 238, 0.45)";
    ctx.lineWidth = 3;

    for (const [start, end] of POSE_CONNECTIONS) {
      const p1 = landmarks[start];
      const p2 = landmarks[end];
      if (p1.visibility > 0.5 && p2.visibility > 0.5) {
        ctx.beginPath();
        ctx.moveTo(p1.x * width, p1.y * height);
        ctx.lineTo(p2.x * width, p2.y * height);
        ctx.stroke();
      }
    }

    // Ghost joints
    ctx.fillStyle = "rgba(34, 211, 238, 0.55)";
    for (const lm of landmarks) {
      if (lm.visibility > 0.5) {
        ctx.beginPath();
        ctx.arc(lm.x * width, lm.y * height, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }, [ghost, width, height, mirror, progress]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  );
}

/**
 * Ghost Recorder — call on every frame to buffer landmarks.
 * Call `commitRep(formScore)` when a rep completes.
 * Returns the best recording so far.
 */
export class GhostRecorder {
  private currentBuffer: Landmarks[] = [];
  private best: GhostRecording | null = null;
  private maxFrames = 90; // ~3 seconds at 30fps

  /** Called every frame with the current landmarks. */
  recordFrame(landmarks: Landmarks) {
    this.currentBuffer.push(landmarks);
    if (this.currentBuffer.length > this.maxFrames) {
      this.currentBuffer.shift();
    }
  }

  /**
   * Called when a rep completes.
   * If the form score beats the best, save the buffered frames as the new ghost.
   */
  commitRep(formScore: number): GhostRecording | null {
    if (this.currentBuffer.length < 5) {
      this.currentBuffer = [];
      return this.best;
    }
    if (!this.best || formScore > this.best.formScore) {
      this.best = {
        frames: [...this.currentBuffer],
        formScore,
        timestamp: Date.now(),
      };
    }
    this.currentBuffer = [];
    return this.best;
  }

  getBest(): GhostRecording | null {
    return this.best;
  }

  clear() {
    this.currentBuffer = [];
    this.best = null;
  }
}
