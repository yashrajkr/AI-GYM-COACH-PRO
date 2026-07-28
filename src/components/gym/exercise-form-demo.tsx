"use client";

import { useState } from "react";
import { DemoPoseFigure, hasFrontView, type RigExercise, type ViewAngle } from "./demo-pose-figure";

/**
 * A looping, tracked demonstration of a single exercise.
 *
 * Wraps DemoPoseFigure with the bits every caller needs: the camera-angle
 * switch (hidden for movements that only read from one angle) and an optional
 * caption. Used on the live-coach screen so the panel teaches the movement
 * instead of showing an empty camera icon, and reusable anywhere an exercise
 * is described.
 *
 * Rig ids are the same strings as ExerciseId, so this is a direct lookup —
 * but it is a runtime check rather than a cast, because a new exercise added
 * to the app without a matching rig should degrade to nothing rather than
 * crash on an undefined rig.
 */

const RIGGED: ReadonlySet<string> = new Set<RigExercise>([
  "squat",
  "pushup",
  "biceps_curl",
  "shoulder_press",
  "lunges",
  "plank",
  "jumping_jack",
  "glute_bridge",
]);

export function hasFormDemo(exerciseId: string): boolean {
  return RIGGED.has(exerciseId);
}

interface ExerciseFormDemoProps {
  /**
   * An ExerciseId. Typed as `string` because callers hold it loosely (the
   * exercise guide keys off raw strings) and the RIGGED lookup below is the
   * real guard — an unknown id renders nothing rather than crashing.
   */
  exerciseId: string;
  className?: string;
  caption?: string;
  /**
   * Smaller stage for height-constrained hosts. The live-coach camera panel is
   * a fixed 16:9 box with overflow hidden, and at full size the figure plus
   * its toggle and caption pushed the Enable Camera button outside the panel
   * where it could not be clicked.
   */
  compact?: boolean;
}

export function ExerciseFormDemo({
  exerciseId,
  className,
  caption,
  compact = false,
}: ExerciseFormDemoProps) {
  const [view, setView] = useState<ViewAngle>("side");

  if (!hasFormDemo(exerciseId)) return null;
  const exercise = exerciseId as RigExercise;
  const canSwitch = hasFrontView(exercise);

  return (
    <div className={`w-full ${className ?? ""}`}>
      {/* Square, width-capped stage. The figure is drawn in a 100x100 viewBox
          with preserveAspectRatio, so in a wide short box it shrank to the
          container's height and sat marooned in empty space. A square stage
          keeps it large and legible at every breakpoint. */}
      <div
        className={`relative mx-auto w-full aspect-square rounded-xl border border-border bg-background/40 ${
          compact ? "max-w-[150px] sm:max-w-[180px]" : "max-w-[260px] sm:max-w-[300px]"
        }`}
      >
        <DemoPoseFigure
          exercise={exercise}
          view={canSwitch ? view : "side"}
          className="h-full w-full"
        />
      </div>

      {/* Below the stage, not floating over it — the pill used to sit on top
          of the figure's feet and hid the very joint the squat rig coaches. */}
      {canSwitch && (
        <div className="mt-2 flex justify-center">
          <div className="glass-strong rounded-full p-0.5 inline-flex items-center gap-0.5">
            {(["side", "front"] as ViewAngle[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                aria-pressed={view === v}
                className={`px-3 h-8 rounded-full text-[10px] font-mono uppercase tracking-wider transition-all ${
                  view === v
                    ? "bg-lime/20 text-lime border border-lime/40"
                    : "text-muted-foreground hover:text-foreground border border-transparent"
                }`}
              >
                {v} view
              </button>
            ))}
          </div>
        </div>
      )}

      {caption && (
        <p className="mt-2 text-[10px] text-muted-foreground text-center">{caption}</p>
      )}
    </div>
  );
}
