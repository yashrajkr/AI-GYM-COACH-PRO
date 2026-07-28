"use client";

import { Suspense, lazy, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Flame, Trophy, Star, Zap, TrendingUp, Dumbbell, ChevronRight, Lock, Award,
  Heart, Activity, Target, Calendar,
} from "lucide-react";
import { useWorkoutStore, getLevel } from "@/lib/stores/workout";
import { EXERCISE_LIST, type ExerciseId } from "@/lib/exercises";
import { BADGES } from "@/lib/data/programs";
import { TiltCard, GlassCard, AnimatedNumber, LevelRing } from "@/components/ui-pro";
import type { TrophyBadge } from "@/components/three/trophy-room";
import { getSound } from "@/lib/coaching/sound";
import { requestNotificationPermission, showNotification } from "@/lib/pwa";
import {
  calculateTrainingLoad,
  calculateRecoveryScore,
  getRecoveryRecommendation,
  calculateMuscleBalance,
  calculateConsistency,
  estimateFitnessLevel,
  type FitnessLevel,
} from "@/lib/fitness/calculations";

// Lazy-load heavy 3D trophy room
const TrophyRoom = lazy(() =>
  import("@/components/three/trophy-room").then((m) => ({ default: m.TrophyRoom }))
);

export function Dashboard({ onStartWorkout }: { onStartWorkout: (exerciseId: ExerciseId) => void }) {
  // Subscribe to slices individually to avoid re-rendering on every store change.
  const history = useWorkoutStore((s) => s.history);
  const totalXp = useWorkoutStore((s) => s.totalXp);
  const streak = useWorkoutStore((s) => s.streak);
  const lastWorkoutDate = useWorkoutStore((s) => s.lastWorkoutDate);
  const loadHistoryFromServer = useWorkoutStore((s) => s.loadHistoryFromServer);
  const level = getLevel(totalXp);

  // Load history from server on mount (merges with localStorage)
  useEffect(() => {
    loadHistoryFromServer();
  }, [loadHistoryFromServer]);

  // Check streak status + send notification if at risk (client-side)
  useEffect(() => {
    const checkStreak = async () => {
      try {
        const res = await fetch("/api/notifications/streak", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (data.atRisk && data.message) {
          // Request permission first time, then show notification
          const granted = await requestNotificationPermission();
          if (granted) {
            showNotification("Streak at Risk! 🔥", data.message, "/#/dashboard");
          }
        }
      } catch {
        // Silent fail — notifications are optional
      }
    };
    // Check after 5 seconds (don't block initial render)
    const timer = setTimeout(checkStreak, 5000);
    return () => clearTimeout(timer);
  }, []);
  const [trophyOpen, setTrophyOpen] = useState(false);

  const totalWorkouts = history.length;
  const totalReps = history.reduce((sum, h) => sum + h.totalReps, 0);
  const avgForm =
    history.length > 0
      ? Math.round(history.reduce((s, h) => s + h.avgFormScore, 0) / history.length)
      : 0;
  const totalMinutes = Math.round(history.reduce((s, h) => s + h.durationSec, 0) / 60);

  // Fitness intelligence calculations
  const trainingLoad = calculateTrainingLoad(history);
  const recoveryScore = calculateRecoveryScore(lastWorkoutDate, avgForm, trainingLoad.sessionsThisWeek);
  const recovery = getRecoveryRecommendation(recoveryScore);
  const muscleBalance = calculateMuscleBalance(history);
  const consistency = calculateConsistency(history, 84); // 12 weeks
  const fitnessLevel = estimateFitnessLevel(totalWorkouts, avgForm, streak, totalReps);
  const totalCalories = history.reduce((s, h) => s + (h.caloriesBurned || 0), 0);

  const recentSessions = history.slice(0, 5);

  // Trophy badges — per-exercise rep totals drive mastery badges.
  const repsByExercise = new Map<ExerciseId, number>();
  for (const h of history) {
    repsByExercise.set(h.exerciseId, (repsByExercise.get(h.exerciseId) || 0) + h.totalReps);
  }
  // Time-of-day badges
  const workoutHours = history.map((h) => new Date(h.date).getHours());
  const hasEarlyBird = workoutHours.some((h) => h < 6);
  const hasNightOwl = workoutHours.some((h) => h >= 22);

  const earnedBadgeIds = new Set<string>();
  if (totalWorkouts > 0) earnedBadgeIds.add("first_rep");
  if (totalWorkouts >= 1) earnedBadgeIds.add("first_workout");
  if (streak >= 7) earnedBadgeIds.add("streak_7");
  if (streak >= 30) earnedBadgeIds.add("streak_30");
  if (avgForm >= 90 && totalWorkouts >= 3) earnedBadgeIds.add("form_master");
  if (totalReps >= 100) earnedBadgeIds.add("century");
  if (level.level >= 10) earnedBadgeIds.add("level_10");
  if (level.level >= 25) earnedBadgeIds.add("level_25");
  if ((repsByExercise.get("squat") || 0) >= 500) earnedBadgeIds.add("squat_master");
  if ((repsByExercise.get("pushup") || 0) >= 500) earnedBadgeIds.add("pushup_master");
  if (hasEarlyBird) earnedBadgeIds.add("early_bird");
  if (hasNightOwl) earnedBadgeIds.add("night_owl");

  const trophies: TrophyBadge[] = BADGES.map((b) => ({
    id: b.id,
    name: b.name,
    description: b.description,
    icon: b.icon,
    earned: earnedBadgeIds.has(b.id),
    tier: b.id.includes("streak_30") || b.id.includes("master") ? "gold" :
          b.id.includes("streak_7") || b.id.includes("level_25") ? "silver" : "bronze",
  }));

  const earnedCount = trophies.filter((t) => t.earned).length;

  // Recovery color → static Tailwind classes (Tailwind v4 JIT can't see
  // dynamically constructed class names, so we must enumerate them here).
  const recoveryColorClass =
    recovery.color === "lime" ? "text-lime" :
    recovery.color === "cyan" ? "text-cyan" :
    recovery.color === "amber" ? "text-amber" :
    recovery.color === "magenta" ? "text-magenta" :
    recovery.color === "red" ? "text-red-400" :
    "text-muted-foreground";
  const recoveryBorderClass =
    recovery.color === "lime" ? "border-lime/40 text-lime" :
    recovery.color === "cyan" ? "border-cyan/40 text-cyan" :
    recovery.color === "amber" ? "border-amber/40 text-amber" :
    recovery.color === "magenta" ? "border-magenta/40 text-magenta" :
    recovery.color === "red" ? "border-red-400/40 text-red-400" :
    "border-border text-muted-foreground";
  // TiltCard glow prop accepts a fixed union — narrow safely.
  const recoveryGlow: "lime" | "cyan" | "amber" | "magenta" =
    recovery.color === "lime" || recovery.color === "cyan" || recovery.color === "amber" || recovery.color === "magenta"
      ? recovery.color
      : "lime";

  return (
    <div className="space-y-6">
      {/* Hero stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={<Star className="h-4 w-4" />}
          label="Level"
          value={level.level}
          subtext={`${level.currentLevelXp} / ${level.nextLevelXp} XP`}
          accent="lime"
          delay={0}
        />
        <StatCard
          icon={<Flame className="h-4 w-4" />}
          label="Streak"
          value={streak}
          subtext={streak === 1 ? "day" : "days"}
          accent="cyan"
          delay={0.05}
        />
        <StatCard
          icon={<Dumbbell className="h-4 w-4" />}
          label="Workouts"
          value={totalWorkouts}
          subtext="all time"
          accent="lime"
          delay={0.1}
        />
        <StatCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Total XP"
          value={totalXp}
          subtext="earned"
          accent="cyan"
          delay={0.15}
        />
      </div>

      {/* Level ring + Trophy room CTA */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Level progress with ring */}
        <GlassCard className="p-6 md:col-span-1 flex flex-col items-center justify-center">
          <LevelRing
            level={level.level}
            progress={level.progress}
            currentXp={level.currentLevelXp}
            nextLevelXp={level.nextLevelXp}
            size={160}
          />
          <div className="mt-4 text-center">
            <p className="text-xs text-muted-foreground">
              {level.nextLevelXp - level.currentLevelXp} XP to Level {level.level + 1}
            </p>
            <Badge className="mt-2 bg-lime/20 text-lime border-lime/30">
              <Zap className="mr-1 h-3 w-3" /> {totalXp} XP
            </Badge>
          </div>
        </GlassCard>

        {/* Trophy room preview */}
        <GlassCard className="p-6 md:col-span-2 relative overflow-hidden min-h-[240px]">
          <div className="flex items-center justify-between mb-3 relative z-10">
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Trophy className="h-4 w-4 text-magenta" /> Trophy Room
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {earnedCount} of {trophies.length} badges earned
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => {
                getSound().play("click");
                setTrophyOpen((v) => !v);
              }}
              className="h-8 text-xs bg-magenta/20 text-magenta border border-magenta/40 hover:bg-magenta/30 hover:border-magenta/60"
              aria-label={trophyOpen ? "Hide 3D trophy room" : "View 3D trophy room"}
              aria-expanded={trophyOpen}
            >
              {trophyOpen ? "Hide 3D" : "View 3D"} <ChevronRight className="ml-1 h-3 w-3" />
            </Button>
          </div>

          {trophyOpen ? (
            <div className="absolute inset-0 top-14">
              {/* Instruction hint — tells the user what the 3D view is + how to interact */}
              <div className="absolute top-2 left-2 right-2 z-10 text-[10px] text-muted-foreground bg-background/60 backdrop-blur-sm rounded px-2 py-1 border border-border/50 pointer-events-none">
                🖱️ Drag to rotate · Scroll to zoom · Click a badge to see details
              </div>
              <Suspense fallback={<div className="flex items-center justify-center h-full text-xs text-muted-foreground">Loading 3D…</div>}>
                <TrophyRoom badges={trophies} className="w-full h-full" />
              </Suspense>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {trophies.slice(0, 8).map((t, i) => (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  className={`aspect-square rounded-lg flex flex-col items-center justify-center p-2 border ${
                    t.earned
                      ? "border-magenta/30 bg-magenta/5 glow-magenta"
                      : "border-border bg-muted/30"
                  }`}
                >
                  <span className={`text-2xl ${t.earned ? "" : "grayscale opacity-30"}`}>
                    {t.earned ? t.icon : "🔒"}
                  </span>
                  <span className={`text-[8px] font-mono uppercase tracking-wider mt-1 text-center leading-tight ${
                    t.earned ? "text-foreground" : "text-muted-foreground"
                  }`}>
                    {t.name}
                  </span>
                </motion.div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>

      {/* Quick start */}
      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Zap className="h-4 w-4 text-lime" /> Quick Start
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {EXERCISE_LIST.map((ex, i) => (
            <motion.button
              key={ex.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onStartWorkout(ex.id)}
              className="group text-left p-4 rounded-xl glass glass-hover"
            >
              <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">{ex.icon}</div>
              <div className="text-sm font-semibold mb-1 group-hover:text-lime transition-colors">
                {ex.shortName}
              </div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                {ex.difficulty}
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Recent sessions */}
      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Trophy className="h-4 w-4 text-lime" /> Recent Sessions
        </h3>
        {recentSessions.length === 0 ? (
          <GlassCard hover={false} className="p-8 text-center">
            <Dumbbell className="h-8 w-8 mx-auto mb-3 text-lime" />
            <p className="text-sm font-semibold mb-1">Welcome! Ready for your first workout?</p>
            <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
              Pick an exercise from Quick Start above. The AI Coach will use your camera to count reps
              and give you real-time form feedback. No equipment needed for bodyweight exercises.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 text-[10px] text-muted-foreground">
              <span className="inline-flex items-center gap-1 rounded-full bg-lime/10 border border-lime/30 px-2 py-1 text-lime">
                📷 Camera required
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-cyan/10 border border-cyan/30 px-2 py-1 text-cyan">
                🔒 Video stays on your device
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-muted/30 border border-border px-2 py-1">
                ⏱️ ~5 min per session
              </span>
            </div>
          </GlassCard>
        ) : (
          <div className="space-y-2">
            {recentSessions.map((s, i) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
              >
                <GlassCard hover={false} className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{s.exerciseName}</span>
                        <Badge variant="outline" className="text-[10px] h-5">
                          {s.setsCompleted} sets · {s.totalReps} reps
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(s.date).toLocaleDateString(undefined, {
                          month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
                        })} · {Math.round(s.durationSec / 60)}m
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-mono text-muted-foreground">Form</div>
                      <div className={`font-mono text-lg font-bold ${
                        s.avgFormScore >= 85 ? "text-lime" :
                        s.avgFormScore >= 70 ? "text-amber" : "text-red-400"
                      }`}>
                        <AnimatedNumber value={s.avgFormScore} duration={600} />
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <SummaryStat label="Total Reps" value={totalReps.toLocaleString()} icon={<Dumbbell className="h-3 w-3" />} />
        <SummaryStat label="Total Time" value={`${totalMinutes}m`} icon={<Flame className="h-3 w-3" />} />
        <SummaryStat label="Avg Form" value={avgForm > 0 ? `${avgForm}` : "—"} icon={<Award className="h-3 w-3" />} />
      </div>

      {/* Recovery + Training Load */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Recovery Score */}
        <TiltCard maxTilt={2} glow={recoveryGlow} className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Heart className={`h-4 w-4 ${recoveryColorClass}`} />
              <h3 className="text-sm font-semibold">Recovery</h3>
            </div>
            <Badge variant="outline" className={`text-[10px] h-5 capitalize ${recoveryBorderClass}`}>
              {recovery.status}
            </Badge>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className={`font-mono text-4xl font-bold ${recoveryColorClass}`}>
                <AnimatedNumber value={recoveryScore} duration={800} />
              </div>
              <div className="text-[10px] font-mono text-muted-foreground">/ 100</div>
            </div>
            <div className="flex-1">
              <Progress value={recoveryScore} className="h-2" />
              <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">{recovery.message}</p>
            </div>
          </div>
        </TiltCard>

        {/* Training Load */}
        <TiltCard maxTilt={2} glow="cyan" className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-cyan" />
              <h3 className="text-sm font-semibold">Training Load (7d)</h3>
            </div>
            <Badge variant="outline" className={`text-[10px] h-5 ${
              trainingLoad.trend === "up" ? "border-lime/40 text-lime" :
              trainingLoad.trend === "down" ? "border-amber/40 text-amber" :
              "border-muted-foreground/40 text-muted-foreground"
            }`}>
              {trainingLoad.trend === "up" ? "↑" : trainingLoad.trend === "down" ? "↓" : "→"} {Math.abs(trainingLoad.trendPercent)}%
            </Badge>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <div className="font-mono text-xl font-bold text-cyan">{trainingLoad.sessionsThisWeek}</div>
              <div className="text-[9px] font-mono uppercase text-muted-foreground">Sessions</div>
            </div>
            <div>
              <div className="font-mono text-xl font-bold text-lime">{trainingLoad.weeklyVolume}</div>
              <div className="text-[9px] font-mono uppercase text-muted-foreground">Reps</div>
            </div>
            <div>
              <div className="font-mono text-xl font-bold text-amber">{totalCalories}</div>
              <div className="text-[9px] font-mono uppercase text-muted-foreground">Calories</div>
            </div>
          </div>
        </TiltCard>
      </div>

      {/* Consistency Calendar + Fitness Level */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Consistency Heatmap */}
        <TiltCard maxTilt={1} glow="lime" className="p-5 md:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-lime" />
              <h3 className="text-sm font-semibold">Consistency (12 weeks)</h3>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground capitalize">{fitnessLevel}</span>
          </div>
          <div className="flex flex-wrap gap-[3px]">
            {consistency.map((day, i) => (
              <div
                key={i}
                className="w-3 h-3 rounded-sm transition-all hover:scale-125 cursor-default"
                style={{
                  backgroundColor: day.intensity > 0
                    ? `rgba(163, 230, 53, ${0.2 + (day.intensity / 100) * 0.8})`
                    : "rgba(255, 255, 255, 0.05)",
                }}
                title={`${new Date(day.date).toLocaleDateString()}: ${day.workoutCount} workout(s), ${day.totalReps} reps`}
              />
            ))}
          </div>
          <div className="flex items-center justify-between mt-3">
            <span className="text-[9px] font-mono text-muted-foreground">Less</span>
            <div className="flex gap-[3px]">
              {[0, 20, 40, 60, 80, 100].map((intensity) => (
                <div
                  key={intensity}
                  className="w-3 h-3 rounded-sm"
                  style={{
                    backgroundColor: intensity > 0
                      ? `rgba(163, 230, 53, ${0.2 + (intensity / 100) * 0.8})`
                      : "rgba(255, 255, 255, 0.05)",
                  }}
                />
              ))}
            </div>
            <span className="text-[9px] font-mono text-muted-foreground">More</span>
          </div>
        </TiltCard>

        {/* Muscle Balance */}
        <TiltCard maxTilt={1} glow="magenta" className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Target className="h-4 w-4 text-magenta" />
            <h3 className="text-sm font-semibold">Muscle Balance</h3>
          </div>
          {muscleBalance.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No data yet</p>
          ) : (
            <div className="space-y-2">
              {muscleBalance.slice(0, 5).map((m) => (
                <div key={m.muscle}>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-muted-foreground">{m.muscle}</span>
                    <span className="font-mono" style={{ color: m.color }}>{m.percentage}%</span>
                  </div>
                  <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${m.percentage}%`, backgroundColor: m.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </TiltCard>
      </div>
    </div>
  );
}

function StatCard({
  icon, label, value, subtext, accent, delay,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  subtext?: string;
  accent: "lime" | "cyan";
  delay: number;
}) {
  const color = accent === "lime" ? "text-lime" : "text-cyan";
  const borderColor = accent === "lime" ? "hover:border-lime/40" : "hover:border-cyan/40";
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <TiltCard maxTilt={6} glow={accent} className={`p-4 ${borderColor}`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
          <span className={color}>{icon}</span>
        </div>
        <div className={`font-mono text-3xl font-bold ${color}`}>
          <AnimatedNumber value={value} duration={800} />
        </div>
        {subtext && <p className="text-[10px] text-muted-foreground mt-1">{subtext}</p>}
      </TiltCard>
    </motion.div>
  );
}

function SummaryStat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <GlassCard hover={false} className="p-4 text-center">
      <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1 flex items-center justify-center gap-1">
        {icon} {label}
      </div>
      <div className="font-mono text-xl font-bold">{value}</div>
    </GlassCard>
  );
}
