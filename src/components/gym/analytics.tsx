"use client";

import { Suspense, lazy } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Area,
  AreaChart,
} from "recharts";
import { TrendingUp, Calendar, Award, Activity, Boxes } from "lucide-react";
import { useWorkoutStore } from "@/lib/stores/workout";
import { EXERCISES } from "@/lib/exercises";
import { TiltCard } from "@/components/ui-pro";
import { useTheme } from "next-themes";

// Lazy-load heavy 3D bar chart
const Bar3DChart = lazy(() =>
  import("@/components/three/bar-chart-3d").then((m) => ({ default: m.Bar3DChart }))
);

// Chart colors — theme-aware so charts remain readable in light mode.
// In dark mode use the existing dark palette; in light mode use lighter
// backgrounds + darker text so contrast holds up.
function useChartColors() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";
  return {
    grid: isDark ? "#27272a" : "#e4e4e7",
    tick: isDark ? "#a1a1aa" : "#52525b",
    tooltipBg: isDark ? "#16181c" : "#ffffff",
    tooltipBorder: isDark ? "#27272a" : "#e4e4e7",
    accentLime: "#a3e635",
    accentCyan: "#22d3ee",
  };
}

export function Analytics() {
  const history = useWorkoutStore((s) => s.history);
  const colors = useChartColors();

  if (history.length === 0) {
    return (
      <Card className="p-12 border-border text-center">
        <Activity className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
        <h3 className="font-semibold mb-1">No data yet</h3>
        <p className="text-sm text-muted-foreground">
          Complete a few workouts to unlock progress charts and insights.
        </p>
      </Card>
    );
  }

  // Volume per exercise (reps)
  const volumeByExercise = Object.entries(
    history.reduce<Record<string, number>>((acc, h) => {
      acc[h.exerciseName] = (acc[h.exerciseName] ?? 0) + h.totalReps;
      return acc;
    }, {})
  ).map(([name, reps]) => ({ name: name.split(" ")[0], reps }));

  // 3D bar chart data with colors
  const bar3dData = volumeByExercise.map((d, i) => ({
    label: d.name,
    value: d.reps,
    color: ["#a3e635", "#22d3ee", "#f472b6", "#fcd34d", "#86efac"][i % 5],
  }));

  // Form accuracy over time (last 20 sessions, oldest first)
  const formTrend = history.slice(0, 20).reverse().map((h, i) => ({
    session: i + 1,
    score: h.avgFormScore,
  }));

  // Sessions per day (last 14 days)
  const last14Days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    return d;
  });
  const sessionsByDay = last14Days.map((d) => {
    const dateStr = d.toDateString();
    const sessions = history.filter((h) => new Date(h.date).toDateString() === dateStr);
    return {
      day: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      workouts: sessions.length,
      reps: sessions.reduce((s, h) => s + h.totalReps, 0),
    };
  });

  // PRs (best form score per exercise)
  const prs = Object.values(
    history.reduce<Record<string, { name: string; best: number; date: string }>>(
      (acc, h) => {
        if (!acc[h.exerciseName] || h.bestFormScore > acc[h.exerciseName].best) {
          acc[h.exerciseName] = {
            name: h.exerciseName,
            best: h.bestFormScore,
            date: h.date,
          };
        }
        return acc;
      },
      {}
    )
  );

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight mb-1">Progress Analytics</h2>
        <p className="text-sm text-muted-foreground">
          Track volume, form accuracy, and personal records over time.
        </p>
      </div>

      {/* KPI summary row — gives users an at-a-glance overview before diving into charts */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="Total Workouts"
          value={history.length.toString()}
          icon={<TrendingUp className="h-3 w-3" />}
          accent="lime"
        />
        <KpiCard
          label="Total Reps"
          value={history.reduce((s, h) => s + h.totalReps, 0).toLocaleString()}
          icon={<Activity className="h-3 w-3" />}
          accent="cyan"
        />
        <KpiCard
          label="Avg Form"
          value={history.length > 0
            ? Math.round(history.reduce((s, h) => s + h.avgFormScore, 0) / history.length).toString()
            : "—"}
          icon={<Award className="h-3 w-3" />}
          accent="amber"
        />
        <KpiCard
          label="Best Form"
          value={history.length > 0
            ? Math.max(...history.map((h) => h.bestFormScore)).toString()
            : "—"}
          icon={<Award className="h-3 w-3" />}
          accent="magenta"
        />
      </div>

      {/* 3D Volume chart */}
      <TiltCard maxTilt={3} glow="lime" className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Boxes className="h-4 w-4 text-lime" />
            <h3 className="text-sm font-semibold">Volume by Exercise · 3D</h3>
          </div>
          <Badge variant="outline" className="text-[10px] h-5 border-lime/40 text-lime">
            Drag to rotate
          </Badge>
        </div>
        <Suspense fallback={<div className="h-64 flex items-center justify-center text-xs text-muted-foreground">Loading 3D chart…</div>}>
          <Bar3DChart data={bar3dData} className="w-full h-64" />
        </Suspense>
      </TiltCard>

      {/* 2D Volume chart (flat comparison) */}
      <Card className="p-5 border-border">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-4 w-4 text-cyan" />
          <h3 className="text-sm font-semibold">Volume Breakdown (2D)</h3>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={volumeByExercise} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: colors.tick, fontSize: 11 }}
              axisLine={{ stroke: colors.grid }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: colors.tick, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: "rgba(163,230,53,0.1)" }}
              contentStyle={{
                background: colors.tooltipBg,
                border: `1px solid ${colors.tooltipBorder}`,
                borderRadius: "8px",
                fontSize: "12px",
              }}
            />
            <Bar dataKey="reps" fill={colors.accentLime} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Form accuracy trend */}
      <TiltCard maxTilt={2} glow="cyan" className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Award className="h-4 w-4 text-cyan" />
          <h3 className="text-sm font-semibold">Form Accuracy Trend</h3>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={formTrend} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="formGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
            <XAxis
              dataKey="session"
              tick={{ fill: colors.tick, fontSize: 11 }}
              axisLine={{ stroke: colors.grid }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: colors.tick, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                background: colors.tooltipBg,
                border: `1px solid ${colors.tooltipBorder}`,
                borderRadius: "8px",
                fontSize: "12px",
              }}
            />
            <Area
              type="monotone"
              dataKey="score"
              stroke={colors.accentCyan}
              strokeWidth={2}
              fill="url(#formGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </TiltCard>
      {/* Activity heatmap (last 14 days) */}
      <Card className="p-5 border-border">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="h-4 w-4 text-lime" />
          <h3 className="text-sm font-semibold">Last 14 Days</h3>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={sessionsByDay} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
            <XAxis
              dataKey="day"
              tick={{ fill: colors.tick, fontSize: 10 }}
              axisLine={{ stroke: colors.grid }}
              tickLine={false}
              interval={1}
            />
            <YAxis
              tick={{ fill: colors.tick, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              cursor={{ fill: "rgba(163,230,53,0.1)" }}
              contentStyle={{
                background: colors.tooltipBg,
                border: `1px solid ${colors.tooltipBorder}`,
                borderRadius: "8px",
                fontSize: "12px",
              }}
            />
            <Bar dataKey="reps" fill={colors.accentLime} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Personal Records */}
      <Card className="p-5 border-border">
        <div className="flex items-center gap-2 mb-4">
          <Award className="h-4 w-4 text-lime" />
          <h3 className="text-sm font-semibold">Personal Records (Best Form Score)</h3>
        </div>
        <div className="space-y-2">
          {prs.map((pr) => {
            const exerciseId = Object.keys(EXERCISES).find(
              (k) => EXERCISES[k as keyof typeof EXERCISES].name === pr.name
            );
            const icon = exerciseId ? EXERCISES[exerciseId as keyof typeof EXERCISES].icon : "🏆";
            return (
              <div
                key={pr.name}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{icon}</span>
                  <div>
                    <div className="text-sm font-semibold">{pr.name}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {new Date(pr.date).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                    Best
                  </div>
                  <div className="font-mono text-lg font-bold text-lime">{pr.best}</div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

/**
 * KPI summary card — small, scannable metric for the analytics header row.
 * Uses solid color accents (not glass) so the numbers pop.
 */
function KpiCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent: "lime" | "cyan" | "amber" | "magenta";
}) {
  const colorClass =
    accent === "lime" ? "text-lime" :
    accent === "cyan" ? "text-cyan" :
    accent === "amber" ? "text-amber" :
    "text-magenta";
  return (
    <Card className="p-4 border-border">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className={colorClass}>{icon}</span>
      </div>
      <div className={`font-mono text-2xl font-bold ${colorClass}`}>
        {value}
      </div>
    </Card>
  );
}
