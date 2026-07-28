import { BaseExercise, Landmarks, POSE_LANDMARKS } from "./base";

export interface ShoulderPressMetrics {
  reps: number;
  pose_detected: boolean;
  elbow_angle: number;
  extension_status: "FULL EXTENSION" | "PARTIAL" | "N/A";
  back_arch_status: "Neutral" | "Slight Arch" | "Excessive Arch";
  form_score: number;
}

export class ShoulderPressDetector extends BaseExercise<ShoulderPressMetrics> {
  DOWN_THRESHOLD = 80; // elbows bent, near shoulders
  UP_THRESHOLD = 160; // arms extended overhead
  MIN_VISIBILITY = 0.5;

  reset() {
    this.reps = 0;
    this.stage = null;
  }

  process(landmarks: Landmarks): ShoulderPressMetrics {
    const le = landmarks[POSE_LANDMARKS.LEFT_ELBOW];
    const re = landmarks[POSE_LANDMARKS.RIGHT_ELBOW];

    let shIdx: number, elIdx: number, wrIdx: number, hipIdx: number;
    if (le.visibility >= re.visibility) {
      shIdx = POSE_LANDMARKS.LEFT_SHOULDER;
      elIdx = POSE_LANDMARKS.LEFT_ELBOW;
      wrIdx = POSE_LANDMARKS.LEFT_WRIST;
      hipIdx = POSE_LANDMARKS.LEFT_HIP;
    } else {
      shIdx = POSE_LANDMARKS.RIGHT_SHOULDER;
      elIdx = POSE_LANDMARKS.RIGHT_ELBOW;
      wrIdx = POSE_LANDMARKS.RIGHT_WRIST;
      hipIdx = POSE_LANDMARKS.RIGHT_HIP;
    }

    const elbowAngle = this.calculateAngle(
      landmarks[shIdx],
      landmarks[elIdx],
      landmarks[wrIdx]
    );

    // Back arch: angle between shoulder, hip, vertical
    const backAngle = this.calculateAngle(
      landmarks[shIdx],
      landmarks[hipIdx],
      { x: landmarks[hipIdx].x, y: landmarks[hipIdx].y - 0.3, z: 0, visibility: 1 }
    );

    const visible =
      landmarks[shIdx].visibility > this.MIN_VISIBILITY &&
      landmarks[elIdx].visibility > this.MIN_VISIBILITY &&
      landmarks[wrIdx].visibility > this.MIN_VISIBILITY;

    if (visible) {
      if (elbowAngle < this.DOWN_THRESHOLD) this.stage = "down";
      if (elbowAngle > this.UP_THRESHOLD && this.stage === "down") {
        this.stage = "up";
        this.reps += 1;
      }
    }

    let extension_status: ShoulderPressMetrics["extension_status"];
    if (elbowAngle > 160) extension_status = "FULL EXTENSION";
    else if (elbowAngle > 120) extension_status = "PARTIAL";
    else extension_status = "N/A";

    let back_arch_status: ShoulderPressMetrics["back_arch_status"];
    if (backAngle < 160) back_arch_status = "Excessive Arch";
    else if (backAngle < 175) back_arch_status = "Slight Arch";
    else back_arch_status = "Neutral";

    let form_score = 100;
    if (extension_status === "PARTIAL") form_score -= 15;
    if (back_arch_status === "Excessive Arch") form_score -= 25;
    else if (back_arch_status === "Slight Arch") form_score -= 10;
    form_score = Math.max(0, Math.min(100, form_score));

    return {
      reps: this.reps,
      pose_detected: visible,
      elbow_angle: Math.round(elbowAngle),
      extension_status,
      back_arch_status,
      form_score,
    };
  }
}
