import { BaseExercise, POSE_CONNECTIONS, POSE_LANDMARKS } from "./base";
import type { BaseMetrics, Landmarks } from "./base";
import { SquatDetector } from "./squat";
import type { SquatMetrics } from "./squat";
import { PushUpDetector } from "./pushup";
import type { PushupMetrics } from "./pushup";
import { BicepsCurlDetector } from "./biceps_curl";
import type { CurlMetrics } from "./biceps_curl";
import { ShoulderPressDetector } from "./shoulder_press";
import type { ShoulderPressMetrics } from "./shoulder_press";
import { LungesDetector } from "./lunges";
import type { LungeMetrics } from "./lunges";
import { PlankDetector } from "./plank";
import type { PlankMetrics } from "./plank";
import { JumpingJackDetector } from "./jumping_jack";
import type { JumpingJackMetrics } from "./jumping_jack";
import { GluteBridgeDetector } from "./glute_bridge";
import type { GluteBridgeMetrics } from "./glute_bridge";

export type ExerciseId =
  | "squat"
  | "pushup"
  | "biceps_curl"
  | "shoulder_press"
  | "lunges"
  | "plank"
  | "jumping_jack"
  | "glute_bridge";

export interface ExerciseConfig {
  id: ExerciseId;
  name: string;
  shortName: string;
  icon: string;
  muscleGroups: string[];
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  equipment: string;
  description: string;
  formCues: string[];
  detectorClass: new () => BaseExercise<any>;
}

export const EXERCISES: Record<ExerciseId, ExerciseConfig> = {
  squat: {
    id: "squat",
    name: "Bodyweight Squat",
    shortName: "Squat",
    icon: "🦵",
    muscleGroups: ["Quads", "Glutes", "Hamstrings", "Core"],
    difficulty: "Beginner",
    equipment: "Bodyweight",
    description:
      "Foundational lower-body movement targeting the quads, glutes, and hamstrings. Builds strength and mobility for daily life and athletic performance.",
    formCues: [
      "Feet shoulder-width apart, toes slightly out",
      "Chest up, gaze forward",
      "Sit back into hips, knees track over toes",
      "Descend to at least parallel (hip crease below knee)",
      "Drive through heels, squeeze glutes at top",
    ],
    detectorClass: SquatDetector,
  },
  pushup: {
    id: "pushup",
    name: "Push-up",
    shortName: "Push-up",
    icon: "💪",
    muscleGroups: ["Chest", "Triceps", "Shoulders", "Core"],
    difficulty: "Beginner",
    equipment: "Bodyweight",
    description:
      "Classic upper-body pressing movement. Develops chest, triceps, and shoulder strength while demanding core stability.",
    formCues: [
      "Hands slightly wider than shoulders",
      "Body in a straight line from head to heels",
      "Lower until chest nearly touches floor",
      "Elbows ~45° from torso (not flared)",
      "Push through palms, full extension at top",
    ],
    detectorClass: PushUpDetector,
  },
  biceps_curl: {
    id: "biceps_curl",
    name: "Biceps Curl",
    shortName: "Curl",
    icon: "🏋️",
    muscleGroups: ["Biceps", "Forearms"],
    difficulty: "Beginner",
    equipment: "Dumbbell",
    description:
      "Isolation exercise for the biceps brachii. Keep elbows pinned to sides to maximize tension and avoid swinging.",
    formCues: [
      "Stand tall, elbows pinned to sides",
      "Curl weight up with control",
      "Squeeze biceps at the top",
      "Lower slowly (3-second eccentric)",
      "No hip swing or shoulder shrug",
    ],
    detectorClass: BicepsCurlDetector,
  },
  shoulder_press: {
    id: "shoulder_press",
    name: "Shoulder Press",
    shortName: "Press",
    icon: "🎯",
    muscleGroups: ["Shoulders", "Triceps", "Upper Chest"],
    difficulty: "Intermediate",
    equipment: "Dumbbell",
    description:
      "Compound pressing movement for shoulder strength and hypertrophy. Demands core stability to prevent back arching.",
    formCues: [
      "Start with dumbbells at shoulder height",
      "Press straight overhead, full lockout",
      "Brace core, no excessive back arch",
      "Lower under control to shoulders",
      "Breathe out on the press",
    ],
    detectorClass: ShoulderPressDetector,
  },
  lunges: {
    id: "lunges",
    name: "Forward Lunge",
    shortName: "Lunge",
    icon: "🚶",
    muscleGroups: ["Quads", "Glutes", "Hamstrings", "Core"],
    difficulty: "Beginner",
    equipment: "Bodyweight",
    description:
      "Unilateral leg exercise that builds strength, balance, and hip mobility. Targets each leg independently to correct imbalances.",
    formCues: [
      "Step forward 2-3 feet",
      "Front knee tracks over toes (not past)",
      "Back knee descends toward floor",
      "Torso upright, core engaged",
      "Push through front heel to return",
    ],
    detectorClass: LungesDetector,
  },
  plank: {
    id: "plank",
    name: "Plank Hold",
    shortName: "Plank",
    icon: "🧘",
    muscleGroups: ["Core", "Shoulders", "Back"],
    difficulty: "Beginner",
    equipment: "Bodyweight",
    description:
      "Isometric core exercise that builds endurance in the abs, lower back, and shoulders. Hold a straight body line for time.",
    formCues: [
      "Forearms shoulder-width apart",
      "Body in a straight line from head to heels",
      "Hips level — don't sag or pike",
      "Core engaged, glutes squeezed",
      "Breathe steadily, hold for time",
    ],
    detectorClass: PlankDetector,
  },
  jumping_jack: {
    id: "jumping_jack",
    name: "Jumping Jack",
    shortName: "Jack",
    icon: "⭐",
    muscleGroups: ["Full Body", "Cardio"],
    difficulty: "Beginner",
    equipment: "Bodyweight",
    description:
      "Classic cardio exercise that elevates heart rate while engaging the full body. Great for warm-ups or HIIT circuits.",
    formCues: [
      "Start standing, feet together, arms at sides",
      "Jump feet apart while raising arms overhead",
      "Land softly on the balls of your feet",
      "Return to start position immediately",
      "Keep rhythm steady and symmetrical",
    ],
    detectorClass: JumpingJackDetector,
  },
  glute_bridge: {
    id: "glute_bridge",
    name: "Glute Bridge",
    shortName: "Bridge",
    icon: "🍑",
    muscleGroups: ["Glutes", "Hamstrings", "Core"],
    difficulty: "Beginner",
    equipment: "Bodyweight",
    description:
      "Hip extension exercise that strengthens the glutes and hamstrings. Excellent for counteracting sitting and improving posterior chain strength.",
    formCues: [
      "Lie on back, knees bent, feet flat",
      "Drive through heels to lift hips",
      "Squeeze glutes at the top",
      "Body flat from shoulders to knees",
      "Lower with control",
    ],
    detectorClass: GluteBridgeDetector,
  },
};

export const EXERCISE_LIST = Object.values(EXERCISES);

export type AnyMetrics =
  | SquatMetrics
  | PushupMetrics
  | CurlMetrics
  | ShoulderPressMetrics
  | LungeMetrics
  | PlankMetrics
  | JumpingJackMetrics
  | GluteBridgeMetrics
  | BaseMetrics;

export function createDetector(id: ExerciseId): BaseExercise<any> {
  return new EXERCISES[id].detectorClass();
}

export function getFormIssue(
  exercise: ExerciseId,
  metrics: AnyMetrics
): string | null {
  if (exercise === "squat") {
    const m = metrics as SquatMetrics;
    if (m.depth_status === "TOO HIGH")
      return "Your squat isn't deep enough — sit back and lower your hips further.";
    if (m.back_angle < 130)
      return "You're leaning too far forward — keep your chest up and torso more vertical.";
  } else if (exercise === "pushup") {
    const m = metrics as PushupMetrics;
    if (m.body_alignment === "Poor Form")
      return "Your body isn't straight — engage your core and squeeze your glutes.";
    if (m.hip_status === "SAGGING")
      return "Your hips are sagging — lift them to form a straight line.";
    if (m.hip_status === "PIKED UP")
      return "Your hips are too high — lower them to form a straight line.";
  } else if (exercise === "biceps_curl") {
    const m = metrics as CurlMetrics;
    if (m.swing_status === "SWINGING")
      return "Stop swinging your torso — keep your body still and isolate the biceps.";
    if (m.shoulder_status === "ELBOW DRIFTING")
      return "Your elbow is drifting away from your side — pin it to your ribs.";
  } else if (exercise === "shoulder_press") {
    const m = metrics as ShoulderPressMetrics;
    if (m.back_arch_status === "Excessive Arch")
      return "You're arching your lower back too much — brace your core and tuck your hips.";
    if (m.back_arch_status === "Slight Arch")
      return "Slight back arch detected — squeeze your glutes to stabilize.";
  } else if (exercise === "lunges") {
    const m = metrics as LungeMetrics;
    if (m.balance_status === "OFF BALANCE")
      return "You're losing balance — keep your feet hip-width apart, not on a tightrope.";
  } else if (exercise === "plank") {
    const m = metrics as PlankMetrics;
    if (m.hip_status === "SAGGING")
      return "Your hips are sagging — lift them to form a straight line.";
    if (m.hip_status === "PIKED UP")
      return "Your hips are too high — lower them to form a straight line.";
  } else if (exercise === "jumping_jack") {
    const m = metrics as JumpingJackMetrics;
    if (m.symmetry === "ASYMMETRIC")
      return "Your arms and legs are out of sync — move them together symmetrically.";
  } else if (exercise === "glute_bridge") {
    const m = metrics as GluteBridgeMetrics;
    if (m.hip_status === "DOWN")
      return "Drive your hips higher — squeeze the glutes at the top.";
  }
  return null;
}

export { BaseExercise, POSE_CONNECTIONS, POSE_LANDMARKS };
export type { Landmarks, BaseMetrics };
export type { SquatMetrics } from "./squat";
export type { PushupMetrics } from "./pushup";
export type { CurlMetrics } from "./biceps_curl";
export type { ShoulderPressMetrics } from "./shoulder_press";
export type { LungeMetrics } from "./lunges";
export type { PlankMetrics } from "./plank";
export type { JumpingJackMetrics } from "./jumping_jack";
export type { GluteBridgeMetrics } from "./glute_bridge";
