import { BaseExercise, Landmarks, POSE_LANDMARKS } from "./base";

export interface PushupMetrics {
  reps: number;
  pose_detected: boolean;
  elbow_angle: number;
  body_alignment: "Straight" | "Slight Bend" | "Poor Form";
  hip_status: "LEVEL" | "SAGGING" | "PIKED UP";
  form_score: number;
}

export class PushUpDetector extends BaseExercise<PushupMetrics> {
  DOWN_THRESHOLD = 90;
  UP_THRESHOLD = 160;
  MIN_VISIBILITY = 0.5;
  HIP_SAG_TOLERANCE = 0.08;

  reset() {
    this.reps = 0;
    this.stage = null;
  }

  process(landmarks: Landmarks): PushupMetrics {
    const le = landmarks[POSE_LANDMARKS.LEFT_ELBOW];
    const re = landmarks[POSE_LANDMARKS.RIGHT_ELBOW];

    let shIdx: number, elIdx: number, wrIdx: number, hipIdx: number, ankleIdx: number;
    if (le.visibility >= re.visibility) {
      shIdx = POSE_LANDMARKS.LEFT_SHOULDER;
      elIdx = POSE_LANDMARKS.LEFT_ELBOW;
      wrIdx = POSE_LANDMARKS.LEFT_WRIST;
      hipIdx = POSE_LANDMARKS.LEFT_HIP;
      ankleIdx = POSE_LANDMARKS.LEFT_ANKLE;
    } else {
      shIdx = POSE_LANDMARKS.RIGHT_SHOULDER;
      elIdx = POSE_LANDMARKS.RIGHT_ELBOW;
      wrIdx = POSE_LANDMARKS.RIGHT_WRIST;
      hipIdx = POSE_LANDMARKS.RIGHT_HIP;
      ankleIdx = POSE_LANDMARKS.RIGHT_ANKLE;
    }

    const elbowAngle = this.calculateAngle(
      landmarks[shIdx],
      landmarks[elIdx],
      landmarks[wrIdx]
    );
    const bodyAngle = this.calculateAngle(
      landmarks[shIdx],
      landmarks[hipIdx],
      landmarks[ankleIdx]
    );

    const shoulderY = landmarks[shIdx].y;
    const ankleY = landmarks[ankleIdx].y;
    const hipY = landmarks[hipIdx].y;
    const expectedHipY = (shoulderY + ankleY) / 2;
    const hipDeviation = hipY - expectedHipY;

    const visible =
      landmarks[shIdx].visibility > this.MIN_VISIBILITY &&
      landmarks[elIdx].visibility > this.MIN_VISIBILITY &&
      landmarks[wrIdx].visibility > this.MIN_VISIBILITY &&
      landmarks[hipIdx].visibility > this.MIN_VISIBILITY;

    if (visible) {
      if (elbowAngle < this.DOWN_THRESHOLD) this.stage = "down";
      if (elbowAngle > this.UP_THRESHOLD && this.stage === "down") {
        this.stage = "up";
        this.reps += 1;
      }
    }

    let body_alignment: PushupMetrics["body_alignment"];
    if (bodyAngle > 160) body_alignment = "Straight";
    else if (bodyAngle > 140) body_alignment = "Slight Bend";
    else body_alignment = "Poor Form";

    let hip_status: PushupMetrics["hip_status"];
    if (Math.abs(hipDeviation) <= this.HIP_SAG_TOLERANCE) hip_status = "LEVEL";
    else if (hipDeviation > this.HIP_SAG_TOLERANCE) hip_status = "SAGGING";
    else hip_status = "PIKED UP";

    let form_score = 100;
    if (body_alignment === "Poor Form") form_score -= 30;
    else if (body_alignment === "Slight Bend") form_score -= 10;
    if (hip_status === "SAGGING") form_score -= 25;
    else if (hip_status === "PIKED UP") form_score -= 20;
    form_score = Math.max(0, Math.min(100, form_score));

    return {
      reps: this.reps,
      pose_detected: visible,
      elbow_angle: Math.round(elbowAngle),
      body_alignment,
      hip_status,
      form_score,
    };
  }
}
