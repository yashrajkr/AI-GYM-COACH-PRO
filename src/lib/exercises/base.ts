/**
 * Base Exercise Detector
 * Mirrors the original Python `core/base_exercise.py` architecture.
 * Each exercise extends this class and implements `process()` and `reset()`.
 */

export interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

export type Landmarks = Landmark[];

export interface BaseMetrics {
  reps: number;
  pose_detected: boolean;
}

export type Stage = "up" | "down" | null;

export abstract class BaseExercise<TMetrics extends BaseMetrics = BaseMetrics> {
  reps = 0;
  stage: Stage = null;

  /** Calculate the angle (degrees) at point B formed by A-B-C. */
  calculateAngle(a: Landmark, b: Landmark, c: Landmark): number {
    const ax = a.x - b.x;
    const ay = a.y - b.y;
    const cx = c.x - b.x;
    const cy = c.y - b.y;

    const dot = ax * cx + ay * cy;
    const magA = Math.sqrt(ax * ax + ay * ay);
    const magC = Math.sqrt(cx * cx + cy * cy);

    if (magA * magC === 0) return 0;

    const cosAngle = Math.max(-1, Math.min(1, dot / (magA * magC)));
    return (Math.acos(cosAngle) * 180) / Math.PI;
  }

  getPoint(lm: Landmarks, idx: number): { x: number; y: number } {
    return { x: lm[idx].x, y: lm[idx].y };
  }

  abstract process(landmarks: Landmarks): TMetrics;
  abstract reset(): void;
}

// Pose landmark indices (MediaPipe PoseLandmark)
export const POSE_LANDMARKS = {
  NOSE: 0,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
} as const;

export const POSE_CONNECTIONS: [number, number][] = [
  // Shoulders & Arms
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
  // Torso / Hips
  [11, 23], [12, 24], [23, 24],
  // Legs
  [23, 25], [24, 26], [25, 27], [26, 28], [27, 29], [28, 30],
  [29, 31], [30, 32], [27, 31], [28, 32],
];
