import { BaseExercise, Landmarks, POSE_LANDMARKS } from "./base";

export interface JumpingJackMetrics {
  reps: number;
  pose_detected: boolean;
  arm_status: "UP" | "DOWN" | "N/A";
  leg_status: "TOGETHER" | "APART" | "N/A";
  symmetry: "SYMMETRIC" | "ASYMMETRIC";
  form_score: number;
}

export class JumpingJackDetector extends BaseExercise<JumpingJackMetrics> {
  MIN_VISIBILITY = 0.5;
  ARM_UP_THRESHOLD = 0.15; // wrists above head (y < head_y - threshold)
  LEG_APART_THRESHOLD = 0.12; // ankles wider than hips

  reset() {
    this.reps = 0;
    this.stage = null;
  }

  process(landmarks: Landmarks): JumpingJackMetrics {
    const lw = landmarks[POSE_LANDMARKS.LEFT_WRIST];
    const rw = landmarks[POSE_LANDMARKS.RIGHT_WRIST];
    const la = landmarks[POSE_LANDMARKS.LEFT_ANKLE];
    const ra = landmarks[POSE_LANDMARKS.RIGHT_ANKLE];
    const lh = landmarks[POSE_LANDMARKS.LEFT_HIP];
    const rh = landmarks[POSE_LANDMARKS.RIGHT_HIP];
    const nose = landmarks[POSE_LANDMARKS.NOSE];

    const visible =
      lw.visibility > this.MIN_VISIBILITY &&
      rw.visibility > this.MIN_VISIBILITY &&
      la.visibility > this.MIN_VISIBILITY &&
      ra.visibility > this.MIN_VISIBILITY;

    // Arm position: UP when wrists are above head
    const armsUp = lw.y < nose.y - this.ARM_UP_THRESHOLD && rw.y < nose.y - this.ARM_UP_THRESHOLD;
    const arm_status: JumpingJackMetrics["arm_status"] = armsUp ? "UP" : "DOWN";

    // Leg position: APART when ankles are wider than hips
    const legDistance = Math.abs(la.x - ra.x);
    const hipDistance = Math.abs(lh.x - rh.x);
    const legsApart = legDistance > hipDistance + this.LEG_APART_THRESHOLD;
    const leg_status: JumpingJackMetrics["leg_status"] = legsApart ? "APART" : "TOGETHER";

    // Symmetry: both arms and both legs should move together
    const armDiff = Math.abs(lw.y - rw.y);
    const legDiff = Math.abs(la.y - ra.y);
    const symmetric = armDiff < 0.1 && legDiff < 0.1;
    const symmetry: JumpingJackMetrics["symmetry"] = symmetric ? "SYMMETRIC" : "ASYMMETRIC";

    // Rep counting: arms up + legs apart = "open" → arms down + legs together = "closed" = 1 rep
    if (visible) {
      if (armsUp && legsApart) this.stage = "up";
      if (!armsUp && !legsApart && this.stage === "up") {
        this.stage = "down";
        this.reps += 1;
      }
    }

    let form_score = 100;
    if (!symmetric) form_score -= 20;
    form_score = Math.max(0, Math.min(100, form_score));

    return {
      reps: this.reps,
      pose_detected: visible,
      arm_status,
      leg_status,
      symmetry,
      form_score,
    };
  }
}
