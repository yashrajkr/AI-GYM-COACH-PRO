import { BaseExercise, Landmarks, POSE_LANDMARKS } from "./base";

export interface PlankMetrics {
  reps: number; // For plank, "reps" = seconds held (1 rep per second)
  pose_detected: boolean;
  body_angle: number;
  hip_status: "LEVEL" | "SAGGING" | "PIKED UP";
  hold_time_sec: number;
  form_score: number;
}

export class PlankDetector extends BaseExercise<PlankMetrics> {
  MIN_VISIBILITY = 0.5;
  HIP_SAG_TOLERANCE = 0.08;
  private holdStart: number | null = null;

  reset() {
    this.reps = 0;
    this.stage = null;
    this.holdStart = null;
  }

  process(landmarks: Landmarks): PlankMetrics {
    const sh = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
    const hip = landmarks[POSE_LANDMARKS.LEFT_HIP];
    const ankle = landmarks[POSE_LANDMARKS.LEFT_ANKLE];

    const bodyAngle = this.calculateAngle(sh, hip, ankle);

    const visible =
      sh.visibility > this.MIN_VISIBILITY &&
      hip.visibility > this.MIN_VISIBILITY &&
      ankle.visibility > this.MIN_VISIBILITY;

    // Hip position check
    const expectedHipY = (sh.y + ankle.y) / 2;
    const hipDeviation = hip.y - expectedHipY;
    let hip_status: PlankMetrics["hip_status"];
    if (Math.abs(hipDeviation) <= this.HIP_SAG_TOLERANCE) hip_status = "LEVEL";
    else if (hipDeviation > this.HIP_SAG_TOLERANCE) hip_status = "SAGGING";
    else hip_status = "PIKED UP";

    // Count "reps" as seconds held in plank position
    if (visible && bodyAngle > 155 && hip_status === "LEVEL") {
      if (this.holdStart === null) this.holdStart = Date.now();
      const held = Math.floor((Date.now() - this.holdStart) / 1000);
      this.reps = held;
    } else if (hip_status !== "LEVEL" || bodyAngle < 150) {
      // Broken form — pause counting but don't reset
      this.holdStart = null;
    }

    let form_score = 100;
    if (hip_status === "SAGGING") form_score -= 25;
    else if (hip_status === "PIKED UP") form_score -= 20;
    if (bodyAngle < 150) form_score -= 15;
    form_score = Math.max(0, Math.min(100, form_score));

    return {
      reps: this.reps,
      pose_detected: visible,
      body_angle: Math.round(bodyAngle),
      hip_status,
      hold_time_sec: this.reps,
      form_score,
    };
  }
}
