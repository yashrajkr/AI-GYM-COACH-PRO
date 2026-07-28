import { BaseExercise, Landmarks, POSE_LANDMARKS } from "./base";

export interface GluteBridgeMetrics {
  reps: number;
  pose_detected: boolean;
  hip_angle: number;
  hip_status: "UP" | "DOWN" | "N/A";
  form_score: number;
}

export class GluteBridgeDetector extends BaseExercise<GluteBridgeMetrics> {
  UP_THRESHOLD = 160; // hips extended (flat body line)
  DOWN_THRESHOLD = 120; // hips on ground
  MIN_VISIBILITY = 0.5;

  reset() {
    this.reps = 0;
    this.stage = null;
  }

  process(landmarks: Landmarks): GluteBridgeMetrics {
    const ls = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
    const lh = landmarks[POSE_LANDMARKS.LEFT_HIP];
    const lk = landmarks[POSE_LANDMARKS.LEFT_KNEE];
    const la = landmarks[POSE_LANDMARKS.LEFT_ANKLE];

    const visible =
      ls.visibility > this.MIN_VISIBILITY &&
      lh.visibility > this.MIN_VISIBILITY &&
      lk.visibility > this.MIN_VISIBILITY &&
      la.visibility > this.MIN_VISIBILITY;

    // Hip angle: shoulder-hip-knee
    const hipAngle = this.calculateAngle(ls, lh, lk);

    // Knee angle: hip-knee-ankle (should be ~90° bent)
    const kneeAngle = this.calculateAngle(lh, lk, la);

    let hip_status: GluteBridgeMetrics["hip_status"];
    if (hipAngle > this.UP_THRESHOLD) hip_status = "UP";
    else if (hipAngle < this.DOWN_THRESHOLD) hip_status = "DOWN";
    else hip_status = "N/A";

    if (visible) {
      if (hipAngle < this.DOWN_THRESHOLD) this.stage = "down";
      if (hipAngle > this.UP_THRESHOLD && this.stage === "down") {
        this.stage = "up";
        this.reps += 1;
      }
    }

    let form_score = 100;
    if (kneeAngle < 70 || kneeAngle > 110) form_score -= 15; // knees not at 90°
    if (hip_status === "N/A" && this.stage === "down") form_score -= 10;
    form_score = Math.max(0, Math.min(100, form_score));

    return {
      reps: this.reps,
      pose_detected: visible,
      hip_angle: Math.round(hipAngle),
      hip_status,
      form_score,
    };
  }
}
