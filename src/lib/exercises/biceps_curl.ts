import { BaseExercise, Landmarks, POSE_LANDMARKS } from "./base";

export interface CurlMetrics {
  reps: number;
  pose_detected: boolean;
  elbow_angle: number;
  shoulder_status: "STABLE" | "ELBOW DRIFTING";
  swing_status: "STILL" | "SWINGING";
  form_score: number;
}

export class BicepsCurlDetector extends BaseExercise<CurlMetrics> {
  DOWN_THRESHOLD = 50; // arm extended
  UP_THRESHOLD = 150; // curled up
  MIN_VISIBILITY = 0.5;
  SHOULDER_DRIFT_THRESHOLD = 0.06;
  HIP_SWING_THRESHOLD = 0.04; // hip Y range that indicates swinging

  private shoulderYHistory: number[] = [];
  private hipYHistory: number[] = [];

  reset() {
    this.reps = 0;
    this.stage = null;
    this.shoulderYHistory = [];
    this.hipYHistory = [];
  }

  process(landmarks: Landmarks): CurlMetrics {
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

    // Track shoulder drift (elbow drifting forward/back during curl).
    this.shoulderYHistory.push(landmarks[shIdx].y);
    if (this.shoulderYHistory.length > 10) this.shoulderYHistory.shift();
    const shoulderRange =
      this.shoulderYHistory.length > 1
        ? Math.max(...this.shoulderYHistory) - Math.min(...this.shoulderYHistory)
        : 0;
    const shoulder_status =
      shoulderRange > this.SHOULDER_DRIFT_THRESHOLD ? "ELBOW DRIFTING" : "STABLE";

    // Swing detection: track HIP Y movement (not shoulder — that was the bug).
    // Hip bouncing up/down indicates the user is using momentum to swing the weight up.
    this.hipYHistory.push(landmarks[hipIdx].y);
    if (this.hipYHistory.length > 10) this.hipYHistory.shift();
    const hipRange =
      this.hipYHistory.length > 1
        ? Math.max(...this.hipYHistory) - Math.min(...this.hipYHistory)
        : 0;
    const swing_status = hipRange > this.HIP_SWING_THRESHOLD ? "SWINGING" : "STILL";

    let form_score = 100;
    if (shoulder_status === "ELBOW DRIFTING") form_score -= 20;
    if (swing_status === "SWINGING") form_score -= 25;
    form_score = Math.max(0, Math.min(100, form_score));

    return {
      reps: this.reps,
      pose_detected: visible,
      elbow_angle: Math.round(elbowAngle),
      shoulder_status,
      swing_status,
      form_score,
    };
  }
}
