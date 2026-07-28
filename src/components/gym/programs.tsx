"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Lock, ChevronRight, Flame, RotateCcw, Sparkles } from "lucide-react";
import { PROGRAMS, WorkoutProgram } from "@/lib/data/programs";
import { EXERCISES } from "@/lib/exercises";
import { TiltCard } from "@/components/ui-pro";
import { isPaymentConfigured } from "@/lib/config/features";

export function ProgramsList({
  onSelect,
  onUpgrade,
}: {
  onSelect: (program: WorkoutProgram) => void;
  onUpgrade?: () => void;
}) {
  const { data: session } = useSession();
  const userTier = (session?.user as { tier?: "free" | "pro" } | undefined)?.tier ?? "free";

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-1">Workout Programs</h2>
        <p className="text-sm text-muted-foreground">
          Structured multi-week plans designed by certified trainers. Tap a card to flip and see details.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PROGRAMS.map((program, i) => (
          <FlipProgramCard
            key={program.id}
            program={program}
            index={i}
            onSelect={onSelect}
            isLocked={program.tier === "pro" && userTier === "free"}
            onUpgrade={onUpgrade}
          />
        ))}
      </div>
    </div>
  );
}

function FlipProgramCard({
  program,
  index,
  onSelect,
  isLocked = false,
  onUpgrade,
}: {
  program: WorkoutProgram;
  index: number;
  onSelect: (p: WorkoutProgram) => void;
  isLocked?: boolean;
  onUpgrade?: () => void;
}) {
  const [flipped, setFlipped] = useState(false);
  const isPro = program.tier === "pro";

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      className="perspective"
    >
      <motion.div
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        style={{ transformStyle: "preserve-3d" }}
        className="relative h-72 cursor-pointer"
        onClick={() => setFlipped((f) => !f)}
      >
        {/* Front face */}
        <div
          className="absolute inset-0 glass glass-hover rounded-2xl p-5 flex flex-col"
          style={{ backfaceVisibility: "hidden" }}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold tracking-tight text-lg">{program.name}</h3>
                {isPro && (
                  <Badge variant="outline" className="text-[10px] h-5 border-cyan/40 text-cyan">
                    <Lock className="mr-1 h-2.5 w-2.5" /> PRO
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> {program.durationWeeks}w
                </span>
                <span className="flex items-center gap-1">
                  <Flame className="h-3 w-3" /> {program.level}
                </span>
                <span className="font-mono uppercase tracking-wider">{program.goal}</span>
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground mb-4 line-clamp-2 flex-1">{program.description}</p>

          {/* Exercise preview chips */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {Array.from(
              new Set(program.days.flatMap((d) => d.exercises.map((e) => e.exerciseId)))
            ).map((exId) => {
              const ex = EXERCISES[exId];
              return (
                <Badge key={exId} variant="outline" className="text-[10px] h-5">
                  {ex.icon} {ex.shortName}
                </Badge>
              );
            })}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              Tap to flip
            </span>
            <RotateCcw className="h-3 w-3 text-muted-foreground" />
          </div>
        </div>

        {/* Back face */}
        <div
          className="absolute inset-0 glass-strong rounded-2xl p-5 flex flex-col"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold tracking-tight text-lg">{program.name}</h3>
            <Badge variant="outline" className="text-[10px] h-5 border-lime/40 text-lime">
              {program.days.length} days/wk
            </Badge>
          </div>

          {/* Day breakdown */}
          <div className="space-y-2 flex-1 overflow-y-auto no-scrollbar">
            {program.days.map((day) => (
              <div key={day.day} className="text-xs">
                <div className="font-mono uppercase tracking-wider text-lime text-[10px] mb-1">
                  {day.label}
                </div>
                <div className="flex flex-wrap gap-1">
                  {day.exercises.map((ex, i) => {
                    const exercise = EXERCISES[ex.exerciseId];
                    return (
                      <span key={i} className="text-[10px] text-muted-foreground">
                        {exercise.icon} {ex.sets}×{ex.reps}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {isLocked ? (
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onUpgrade?.();
              }}
              className="w-full mt-3 bg-cyan/20 border border-cyan/40 text-cyan hover:bg-cyan/30 hover:border-cyan/60"
              size="sm"
              aria-label={`Upgrade to unlock ${program.name}`}
            >
              <Sparkles className="mr-1 h-4 w-4" />
              {isPaymentConfigured() ? "Upgrade to Unlock" : "Premium — Coming Soon"}
            </Button>
          ) : (
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onSelect(program);
              }}
              className="w-full mt-3 bg-lime text-background hover:bg-lime/90 glow-lime"
              size="sm"
            >
              View Full Program <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export function ProgramDetail({
  program,
  onStart,
  onBack,
}: {
  program: WorkoutProgram;
  onStart: (exerciseId: keyof typeof EXERCISES, sets: number, reps: number) => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground">
        ← Back to Programs
      </Button>

      <TiltCard maxTilt={4} glow="lime" className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{program.name}</h2>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" /> {program.durationWeeks} weeks
              </span>
              <span className="flex items-center gap-1">
                <Flame className="h-3 w-3" /> {program.level}
              </span>
              <span className="font-mono uppercase tracking-wider">{program.goal}</span>
            </div>
          </div>
          {program.tier === "pro" && (
            <Badge variant="outline" className="border-cyan/40 text-cyan">PRO</Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{program.description}</p>
      </TiltCard>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Weekly Schedule</h3>
        {program.days.map((day, i) => (
          <motion.div
            key={day.day}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: i * 0.08 }}
          >
            <TiltCard maxTilt={2} glow="lime" className="p-4">
              <div className="text-xs font-mono uppercase tracking-wider text-lime mb-3">
                {day.label}
              </div>
              <div className="space-y-2">
                {day.exercises.map((ex, idx) => {
                  const exercise = EXERCISES[ex.exerciseId];
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-lg glass"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{exercise.icon}</span>
                        <div>
                          <div className="text-sm font-semibold">{exercise.name}</div>
                          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                            {ex.sets} × {ex.reps} · {ex.restSec}s rest
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onStart(ex.exerciseId, ex.sets, ex.reps)}
                        className="h-7 text-xs hover:bg-lime hover:text-background hover:border-lime"
                      >
                        Start
                      </Button>
                    </div>
                  );
                })}
              </div>
            </TiltCard>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
