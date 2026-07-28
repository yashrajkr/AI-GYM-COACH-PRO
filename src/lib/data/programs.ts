/**
 * Pre-built workout programs
 */
import { ExerciseId } from "@/lib/exercises";

export interface ProgramDay {
  day: number;
  label: string;
  exercises: {
    exerciseId: ExerciseId;
    sets: number;
    reps: number;
    restSec: number;
  }[];
}

export interface WorkoutProgram {
  id: string;
  name: string;
  durationWeeks: number;
  level: "Beginner" | "Intermediate" | "Advanced";
  goal: "strength" | "hypertrophy" | "conditioning" | "mobility" | "weight_loss";
  description: string;
  tier: "free" | "pro";
  days: ProgramDay[];
}

export const PROGRAMS: WorkoutProgram[] = [
  {
    id: "beginner-full-body",
    name: "Beginner Full Body",
    durationWeeks: 4,
    level: "Beginner",
    goal: "strength",
    description:
      "A 4-week foundation program designed for first-time lifters. Three full-body sessions per week focusing on form mastery and progressive overload.",
    tier: "free",
    days: [
      {
        day: 1,
        label: "Day 1 — Full Body A",
        exercises: [
          { exerciseId: "squat", sets: 3, reps: 10, restSec: 90 },
          { exerciseId: "pushup", sets: 3, reps: 8, restSec: 90 },
          { exerciseId: "lunges", sets: 3, reps: 10, restSec: 60 },
        ],
      },
      {
        day: 2,
        label: "Day 2 — Full Body B",
        exercises: [
          { exerciseId: "shoulder_press", sets: 3, reps: 10, restSec: 90 },
          { exerciseId: "biceps_curl", sets: 3, reps: 12, restSec: 60 },
          { exerciseId: "squat", sets: 3, reps: 12, restSec: 90 },
        ],
      },
      {
        day: 3,
        label: "Day 3 — Full Body C",
        exercises: [
          { exerciseId: "pushup", sets: 3, reps: 10, restSec: 90 },
          { exerciseId: "lunges", sets: 3, reps: 12, restSec: 60 },
          { exerciseId: "shoulder_press", sets: 3, reps: 12, restSec: 90 },
        ],
      },
    ],
  },
  {
    id: "push-pull-legs",
    name: "Push / Pull / Legs",
    durationWeeks: 8,
    level: "Intermediate",
    goal: "hypertrophy",
    description:
      "Classic 6-day split for hypertrophy. Each muscle group trained 2x per week with progressive volume. Requires dumbbells.",
    tier: "free",
    days: [
      {
        day: 1,
        label: "Push Day",
        exercises: [
          { exerciseId: "shoulder_press", sets: 4, reps: 10, restSec: 120 },
          { exerciseId: "pushup", sets: 4, reps: 12, restSec: 90 },
        ],
      },
      {
        day: 2,
        label: "Pull Day",
        exercises: [
          { exerciseId: "biceps_curl", sets: 4, reps: 12, restSec: 90 },
          { exerciseId: "biceps_curl", sets: 3, reps: 15, restSec: 60 },
        ],
      },
      {
        day: 3,
        label: "Leg Day",
        exercises: [
          { exerciseId: "squat", sets: 4, reps: 12, restSec: 120 },
          { exerciseId: "lunges", sets: 3, reps: 12, restSec: 90 },
        ],
      },
    ],
  },
  {
    id: "hiit-fat-burn",
    name: "HIIT Fat Burn",
    durationWeeks: 6,
    level: "Beginner",
    goal: "weight_loss",
    description:
      "High-intensity interval training for fat loss and conditioning. Short, intense sessions with minimal rest. No equipment needed.",
    tier: "free",
    days: [
      {
        day: 1,
        label: "HIIT A",
        exercises: [
          { exerciseId: "squat", sets: 5, reps: 15, restSec: 30 },
          { exerciseId: "pushup", sets: 5, reps: 12, restSec: 30 },
          { exerciseId: "lunges", sets: 5, reps: 12, restSec: 30 },
        ],
      },
      {
        day: 2,
        label: "HIIT B",
        exercises: [
          { exerciseId: "pushup", sets: 5, reps: 15, restSec: 30 },
          { exerciseId: "squat", sets: 5, reps: 20, restSec: 30 },
          { exerciseId: "shoulder_press", sets: 5, reps: 12, restSec: 30 },
        ],
      },
    ],
  },
  {
    id: "strength-foundations",
    name: "Strength Foundations",
    durationWeeks: 12,
    level: "Intermediate",
    goal: "strength",
    description:
      "A 12-week progressive strength program. Linear progression on compound movements. Designed for lifters who have mastered form and want to build raw strength.",
    tier: "pro",
    days: [
      {
        day: 1,
        label: "Workout A",
        exercises: [
          { exerciseId: "squat", sets: 5, reps: 5, restSec: 180 },
          { exerciseId: "shoulder_press", sets: 5, reps: 5, restSec: 180 },
        ],
      },
      {
        day: 2,
        label: "Workout B",
        exercises: [
          { exerciseId: "squat", sets: 5, reps: 5, restSec: 180 },
          { exerciseId: "pushup", sets: 5, reps: 10, restSec: 120 },
          { exerciseId: "lunges", sets: 3, reps: 10, restSec: 90 },
        ],
      },
    ],
  },
  {
    id: "bodyweight-minimalist",
    name: "Bodyweight Minimalist",
    durationWeeks: 4,
    level: "Beginner",
    goal: "strength",
    description:
      "Travel-friendly program using only bodyweight. Perfect for hotels, parks, or small apartments. 4 sessions per week, 20 minutes each.",
    tier: "free",
    days: [
      {
        day: 1,
        label: "Upper Body",
        exercises: [
          { exerciseId: "pushup", sets: 4, reps: 12, restSec: 60 },
          { exerciseId: "pushup", sets: 3, reps: 8, restSec: 60 },
        ],
      },
      {
        day: 2,
        label: "Lower Body",
        exercises: [
          { exerciseId: "squat", sets: 4, reps: 15, restSec: 60 },
          { exerciseId: "lunges", sets: 3, reps: 12, restSec: 60 },
        ],
      },
    ],
  },
];

export const BADGES = [
  { id: "first_rep", name: "First Rep", description: "Complete your first tracked rep", icon: "🎯", tier: "free" },
  { id: "first_workout", name: "First Workout", description: "Complete your first full workout", icon: "🔥", tier: "free" },
  { id: "streak_7", name: "7-Day Streak", description: "Workout 7 days in a row", icon: "⚡", tier: "free" },
  { id: "streak_30", name: "30-Day Streak", description: "Workout 30 days in a row", icon: "💎", tier: "free" },
  { id: "form_master", name: "Form Master", description: "Score 90+ on 10 consecutive reps", icon: "✨", tier: "free" },
  { id: "century", name: "Century Club", description: "Complete 100 total reps in one session", icon: "💯", tier: "free" },
  { id: "early_bird", name: "Early Bird", description: "Workout before 6 AM", icon: "🌅", tier: "free" },
  { id: "night_owl", name: "Night Owl", description: "Workout after 10 PM", icon: "🌙", tier: "free" },
  { id: "level_10", name: "Level 10", description: "Reach level 10", icon: "⭐", tier: "free" },
  { id: "level_25", name: "Level 25", description: "Reach level 25", icon: "🏆", tier: "free" },
  { id: "squat_master", name: "Squat Master", description: "Complete 500 squat reps", icon: "🦵", tier: "pro" },
  { id: "pushup_master", name: "Push-up Master", description: "Complete 500 push-up reps", icon: "💪", tier: "pro" },
] as const;
