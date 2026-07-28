import { BaseExercise, Landmarks, POSE_LANDMARKS } from "./base";

export interface SquatMetrics {
  reps: number;
  pose_detected: boolean;
  knee_angle: number;
  back_angle: number;
  depth_status: "GOOD DEPTH" | "TOO HIGH" | "DEEP" | "STANDING" | "N/A";
  form_score: number;
}

export class SquatDetector extends BaseExercise<SquatMetrics> {
  DOWN_THRESHOLD = 100;
  UP_THRESHOLD = 160;
  MIN_VISIBILITY = 0.5;

  reset() {
    this.reps = 0;
    this.stage = null;
  }

  process(landmarks: Landmarks): SquatMetrics {
    const lh = landmarks[POSE_LANDMARKS.LEFT_HIP];
    const lk = landmarks[POSE_LANDMARKS.LEFT_KNEE];
    const la = landmarks[POSE_LANDMARKS.LEFT_ANKLE];
    const rh = landmarks[POSE_LANDMARKS.RIGHT_HIP];
    const rk = landmarks[POSE_LANDMARKS.RIGHT_KNEE];
    const ra = landmarks[POSE_LANDMARKS.RIGHT_ANKLE];
    const ls = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
    const rs = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];

    const leftKneeAngle = this.calculateAngle(lh, lk, la);
    const rightKneeAngle = this.calculateAngle(rh, rk, ra);

    let kneeAngle: number;
    let hipIdx: number, kneeIdx: number, ankleIdx: number, shoulderIdx: number;

    if (lk.visibility >= rk.visibility) {
      kneeAngle = leftKneeAngle;
      hipIdx = POSE_LANDMARKS.LEFT_HIP;
      kneeIdx = POSE_LANDMARKS.LEFT_KNEE;
      ankleIdx = POSE_LANDMARKS.LEFT_ANKLE;
      shoulderIdx = POSE_LANDMARKS.LEFT_SHOULDER;
    } else {
      kneeAngle = rightKneeAngle;
      hipIdx = POSE_LANDMARKS.RIGHT_HIP;
      kneeIdx = POSE_LANDMARKS.RIGHT_KNEE;
      ankleIdx = POSE_LANDMARKS.RIGHT_ANKLE;
      shoulderIdx = POSE_LANDMARKS.RIGHT_SHOULDER;
    }

    const backAngle = this.calculateAngle(
      landmarks[shoulderIdx],
      landmarks[hipIdx],
      landmarks[kneeIdx]
    );

    const visible =
      landmarks[hipIdx].visibility >= this.MIN_VISIBILITY &&
      landmarks[kneeIdx].visibility >= this.MIN_VISIBILITY &&
      landmarks[ankleIdx].visibility >= this.MIN_VISIBILITY;

    if (visible) {
      if (kneeAngle < this.DOWN_THRESHOLD) {
        this.stage = "down";
      }
      if (kneeAngle >= this.UP_THRESHOLD && this.stage === "down") {
        this.stage = "up";
        this.reps += 1;
      }
    }

    // Depth status: derive from current kneeAngle, not from stage.
    // (The old logic was `stage==="down" && kneeAngle <= DOWN_THRESHOLD`
    //  but `stage==="down"` is only set WHEN kneeAngle < DOWN_THRESHOLD,
    //  so "TOO HIGH" could never trigger.)
    let depth_status: SquatMetrics["depth_status"];
    if (this.stage === "up" || this.stage === null) {
      depth_status = this.stage === "up" ? "STANDING" : "N/A";
    } else if (kneeAngle < 70) {
      depth_status = "DEEP";
    } else if (kneeAngle <= this.DOWN_THRESHOLD) {
      depth_status = "GOOD DEPTH";
    } else if (kneeAngle < this.UP_THRESHOLD) {
      depth_status = "TOO HIGH";
    } else {
      depth_status = "STANDING";
    }

    // form score: penalize if back too horizontal (<130) or depth too high
    let form_score = 100;
    if (depth_status === "TOO HIGH") form_score -= 25;
    if (backAngle < 130) form_score -= 20;
    form_score = Math.max(0, Math.min(100, form_score));

    return {
      reps: this.reps,
      pose_detected: visible,
      knee_angle: Math.round(kneeAngle),
      back_angle: Math.round(backAngle),
      depth_status,
      form_score,
    };
  }
}
