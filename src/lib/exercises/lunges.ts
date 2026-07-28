import { BaseExercise, Landmarks, POSE_LANDMARKS } from "./base";

export interface LungeMetrics {
  reps: number;
  pose_detected: boolean;
  front_knee_angle: number;
  torso_angle: number;
  balance_status: "BALANCED" | "OFF BALANCE";
  form_score: number;
}

export class LungesDetector extends BaseExercise<LungeMetrics> {
  DOWN_THRESHOLD = 100;
  UP_THRESHOLD = 160;
  MIN_VISIBILITY = 0.5;

  reset() {
    this.reps = 0;
    this.stage = null;
  }

  process(landmarks: Landmarks): LungeMetrics {
    const lk = landmarks[POSE_LANDMARKS.LEFT_KNEE];
    const rk = landmarks[POSE_LANDMARKS.RIGHT_KNEE];

    let hipIdx: number, kneeIdx: number, ankleIdx: number, shoulderIdx: number;
    // pick the more visible/bent knee as the "front"
    if (lk.visibility >= rk.visibility) {
      hipIdx = POSE_LANDMARKS.LEFT_HIP;
      kneeIdx = POSE_LANDMARKS.LEFT_KNEE;
      ankleIdx = POSE_LANDMARKS.LEFT_ANKLE;
      shoulderIdx = POSE_LANDMARKS.LEFT_SHOULDER;
    } else {
      hipIdx = POSE_LANDMARKS.RIGHT_HIP;
      kneeIdx = POSE_LANDMARKS.RIGHT_KNEE;
      ankleIdx = POSE_LANDMARKS.RIGHT_ANKLE;
      shoulderIdx = POSE_LANDMARKS.RIGHT_SHOULDER;
    }

    const frontKneeAngle = this.calculateAngle(
      landmarks[hipIdx],
      landmarks[kneeIdx],
      landmarks[ankleIdx]
    );

    const torsoAngle = this.calculateAngle(
      landmarks[shoulderIdx],
      landmarks[hipIdx],
      landmarks[kneeIdx]
    );

    // Balance: compare left/right hip y-coords
    const lh = landmarks[POSE_LANDMARKS.LEFT_HIP];
    const rh = landmarks[POSE_LANDMARKS.RIGHT_HIP];
    const hipDiff = Math.abs(lh.y - rh.y);
    const balance_status: LungeMetrics["balance_status"] = hipDiff > 0.08 ? "OFF BALANCE" : "BALANCED";

    const visible =
      landmarks[hipIdx].visibility >= this.MIN_VISIBILITY &&
      landmarks[kneeIdx].visibility >= this.MIN_VISIBILITY &&
      landmarks[ankleIdx].visibility >= this.MIN_VISIBILITY;

    if (visible) {
      if (frontKneeAngle < this.DOWN_THRESHOLD) this.stage = "down";
      if (frontKneeAngle >= this.UP_THRESHOLD && this.stage === "down") {
        this.stage = "up";
        this.reps += 1;
      }
    }

    let form_score = 100;
    if (frontKneeAngle > 110 && this.stage === "down") form_score -= 20;
    if (torsoAngle < 60) form_score -= 15;
    if (balance_status === "OFF BALANCE") form_score -= 25;
    form_score = Math.max(0, Math.min(100, form_score));

    return {
      reps: this.reps,
      pose_detected: visible,
      front_knee_angle: Math.round(frontKneeAngle),
      torso_angle: Math.round(torsoAngle),
      balance_status,
      form_score,
    };
  }
}
