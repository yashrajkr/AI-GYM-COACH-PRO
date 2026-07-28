"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Share2, RotateCcw, Home, Zap, Flame, Trophy } from "lucide-react";
import { TiltCard, GlowButton, AnimatedNumber } from "@/components/ui-pro";
import { ShareCard } from "./share-card";
import { useWorkoutStore } from "@/lib/stores/workout";
import type { SessionHistoryEntry } from "@/lib/stores/workout";
import { getSound } from "@/lib/coaching/sound";

interface PostWorkoutSummaryProps {
  workout: SessionHistoryEntry;
  xpEarned: number;
  onDone: () => void;
  onRestart: () => void;
}

export function PostWorkoutSummary({ workout, xpEarned, onDone, onRestart }: PostWorkoutSummaryProps) {
  const [showShare, setShowShare] = useState(false);
  const { streak, totalXp } = useWorkoutStore();

  // Play PR sound if form score is excellent — in useEffect to avoid side effects during render
  useEffect(() => {
    if (workout.bestFormScore >= 90) {
      const timer = setTimeout(() => {
        getSound().play("pr_hit").catch(() => {});
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [workout.bestFormScore]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 grid-pattern grid-pattern-fade pointer-events-none" />
      <div className="absolute -top-40 -right-40 w-[500px] h-[500px] blob-lime opacity-40 pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] blob-cyan opacity-30 pointer-events-none" />

      <div className="relative z-10 w-full max-w-2xl space-y-4">
        {/* Celebration header */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="text-center mb-6"
        >
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.2 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-lime/20 border border-lime/40 glow-lime mb-4"
          >
            <CheckCircle2 className="h-8 w-8 text-lime" />
          </motion.div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">Workout Complete!</h1>
          <p className="text-sm text-muted-foreground">
            {workout.exerciseName} · {Math.round(workout.durationSec / 60)}m {workout.durationSec % 60}s
          </p>
        </motion.div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SummaryStat icon={<Zap className="h-4 w-4" />} label="Reps" value={workout.totalReps} accent="lime" delay={0.1} />
          <SummaryStat icon={<Trophy className="h-4 w-4" />} label="Sets" value={workout.setsCompleted} accent="cyan" delay={0.15} />
          <SummaryStat
            icon={<Flame className="h-4 w-4" />}
            label="Form Score"
            value={workout.avgFormScore}
            accent={workout.avgFormScore >= 85 ? "lime" : "amber"}
            delay={0.2}
          />
          <SummaryStat icon={<Zap className="h-4 w-4" />} label="XP Earned" value={`+${xpEarned}`} accent="lime" delay={0.25} />
        </div>

        {/* Streak + Total XP */}
        <TiltCard maxTilt={2} glow="amber" className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Flame className="h-6 w-6 text-amber" />
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Current Streak</div>
              <div className="font-mono text-2xl font-bold text-amber">
                <AnimatedNumber value={streak} duration={600} /> {streak === 1 ? "day" : "days"}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Total XP</div>
            <div className="font-mono text-2xl font-bold text-lime">
              <AnimatedNumber value={totalXp} duration={800} />
            </div>
          </div>
        </TiltCard>

        {/* Share card toggle */}
        <AnimatePresence>
          {showShare && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <ShareCard workout={workout} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2 pt-2">
          <GlowButton
            onClick={() => setShowShare((s) => !s)}
            glow="cyan"
            className="flex-1 min-w-[140px]"
          >
            <Share2 className="mr-2 h-4 w-4" /> {showShare ? "Hide" : "Share"} Card
          </GlowButton>
          <Button
            onClick={onRestart}
            variant="outline"
            className="flex-1 min-w-[140px] glass bg-transparent border-border hover:border-lime/40"
          >
            <RotateCcw className="mr-2 h-4 w-4" /> New Workout
          </Button>
          <Button
            onClick={onDone}
            className="flex-1 min-w-[140px] bg-lime text-background hover:bg-lime/90"
          >
            <Home className="mr-2 h-4 w-4" /> Dashboard
          </Button>
        </div>

        {/* Badge earned (if applicable) */}
        {workout.bestFormScore >= 90 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-center"
          >
            <Badge className="bg-lime/20 text-lime border-lime/30 glow-lime">
              <Trophy className="mr-1 h-3 w-3" /> Form Master Bonus! +25 XP per set
            </Badge>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function SummaryStat({
  icon,
  label,
  value,
  accent,
  delay,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  accent: "lime" | "cyan" | "amber";
  delay: number;
}) {
  const color = accent === "lime" ? "text-lime" : accent === "cyan" ? "text-cyan" : "text-amber";
  const borderColor = accent === "lime" ? "border-lime/30" : accent === "cyan" ? "border-cyan/30" : "border-amber/30";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
    >
      <TiltCard maxTilt={4} glow={accent} className={`p-4 text-center ${borderColor}`}>
        <div className={`${color} mb-2 flex justify-center`}>{icon}</div>
        <div className={`font-mono text-2xl font-bold ${color}`}>
          {typeof value === "number" ? <AnimatedNumber value={value} duration={600} /> : value}
        </div>
        <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mt-1">
          {label}
        </div>
      </TiltCard>
    </motion.div>
  );
}
