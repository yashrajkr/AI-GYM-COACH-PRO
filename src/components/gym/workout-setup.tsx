"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Play } from "lucide-react";
import { EXERCISE_LIST, ExerciseId } from "@/lib/exercises";

export interface WorkoutConfig {
  exerciseId: ExerciseId;
  targetSets: number;
  repsPerSet: number;
}

/**
 * Workout setup modal.
 *
 * Accessibility:
 *   - role="dialog" + aria-modal so screen readers announce it.
 *   - Escape key closes (calls onCancel).
 *   - Backdrop click closes.
 *   - Focus is moved into the modal on open and trapped while open.
 *   - First focusable element receives initial focus.
 */
export function WorkoutSetup({
  exerciseId,
  onStart,
  onCancel,
}: {
  exerciseId: ExerciseId;
  onStart: (config: WorkoutConfig) => void;
  onCancel: () => void;
}) {
  const [sets, setSets] = useState(3);
  const [reps, setReps] = useState(10);
  const [selectedExercise, setSelectedExercise] = useState<ExerciseId>(exerciseId);

  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);

  // Find the selected exercise (with fallback to avoid runtime crash if list changes).
  const exercise = EXERCISE_LIST.find((e) => e.id === selectedExercise) ?? EXERCISE_LIST[0];

  // Move focus into the modal on mount.
  useEffect(() => {
    firstFocusableRef.current?.focus();
  }, []);

  // Trap focus + handle Escape.
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;

      // Simple focus trap: keep Tab within the dialog.
      const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [onCancel]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    // Lock body scroll while modal is open.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prev;
    };
  }, [handleKeyDown]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  // Parse number input safely (NaN → fallback to min).
  const parseNum = (v: string, min: number, max: number, fallback: number) => {
    const n = parseInt(v, 10);
    if (Number.isNaN(n)) return fallback;
    return Math.max(min, Math.min(max, n));
  };

  return (
    <div
      // Scrolls the backdrop itself, and aligns to the top on short screens.
      // Body scroll is locked while this is open, so without an escape route
      // here a landscape phone (or any viewport under ~560px tall) clipped the
      // dialog with no way to reach the Start Workout button — the modal was
      // simply unusable. `dvh` rather than `vh` so mobile browser chrome does
      // not eat the bottom of the dialog.
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 overflow-y-auto overscroll-contain bg-background/80 backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="presentation"
    >
      <Card
        ref={dialogRef}
        className="w-full max-w-md p-6 border-border my-auto max-h-[calc(100dvh-2rem)] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="workout-setup-title"
      >
        <h3 id="workout-setup-title" className="text-lg font-bold tracking-tight mb-1">
          Configure Workout
        </h3>
        <p className="text-xs text-muted-foreground mb-5">
          Set your exercise, sets, and reps. You can adjust mid-session if needed.
        </p>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs">Exercise</Label>
            <Select value={selectedExercise} onValueChange={(v) => setSelectedExercise(v as ExerciseId)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {EXERCISE_LIST.map((ex) => (
                  <SelectItem key={ex.id} value={ex.id}>
                    {ex.icon} {ex.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs" htmlFor="workout-sets">Sets</Label>
              <Input
                id="workout-sets"
                type="number"
                min={1}
                max={20}
                value={sets}
                onChange={(e) => setSets(parseNum(e.target.value, 1, 20, 1))}
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs" htmlFor="workout-reps">Reps per Set</Label>
              <Input
                id="workout-reps"
                type="number"
                min={1}
                max={100}
                value={reps}
                onChange={(e) => setReps(parseNum(e.target.value, 1, 100, 1))}
                className="font-mono"
              />
            </div>
          </div>

          {/* Preview */}
          <div className="rounded-lg bg-muted/30 border border-border p-3">
            <div className="flex items-center gap-3">
              <div className="text-2xl" aria-hidden="true">{exercise.icon}</div>
              <div className="flex-1">
                <div className="text-sm font-semibold">{exercise.name}</div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                  {sets} × {reps} = {sets * reps} total reps
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              ref={firstFocusableRef}
              variant="outline"
              onClick={onCancel}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={() => onStart({ exerciseId: selectedExercise, targetSets: sets, repsPerSet: reps })}
              className="flex-1 bg-lime text-background hover:bg-lime/90"
            >
              <Play className="mr-2 h-4 w-4" /> Start Workout
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
