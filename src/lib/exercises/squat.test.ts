import { describe, it, expect, beforeEach } from "vitest";
import { SquatDetector } from "./squat";
import type { Landmarks } from "./base";
import { POSE_LANDMARKS } from "./base";

/**
 * Helper: create a full set of 33 landmarks, all with high visibility.
 */
function createLandmarks(overrides: Partial<Record<number, { x: number; y: number; z: number; visibility?: number }>> = {}): Landmarks {
  return Array.from({ length: 33 }, (_, i) => ({
    x: 0.5,
    y: 0.5,
    z: 0,
    visibility: 1,
    ...overrides[i],
  })) as Landmarks;
}

/**
 * Create squat landmarks with a specific knee angle.
 * Geometry: ankle directly below knee (vertical shin).
 * Hip positioned to create the desired angle at the knee joint.
 *
 * kneeAngleDeg = 180° → hip directly above knee (standing)
 * kneeAngleDeg = 90°  → hip directly beside knee (deep squat)
 * kneeAngleDeg = 0°   → hip directly below knee (collinear with ankle)
 */
function createSquatLandmarks(kneeAngleDeg: number): Landmarks {
  const kneeX = 0.45, kneeY = 0.60;
  const ankleX = 0.45, ankleY = 0.85;
  const r = 0.20;

  const rad = (kneeAngleDeg * Math.PI) / 180;
  // Hip at angle θ from the ankle direction (downward), measured at the knee
  const hipX = kneeX + r * Math.sin(rad);
  const hipY = kneeY + r * Math.cos(rad);

  return createLandmarks({
    [POSE_LANDMARKS.LEFT_HIP]: { x: hipX, y: hipY, z: 0 },
    [POSE_LANDMARKS.LEFT_KNEE]: { x: kneeX, y: kneeY, z: 0 },
    [POSE_LANDMARKS.LEFT_ANKLE]: { x: ankleX, y: ankleY, z: 0 },
    [POSE_LANDMARKS.RIGHT_HIP]: { x: hipX + 0.10, y: hipY, z: 0 },
    [POSE_LANDMARKS.RIGHT_KNEE]: { x: kneeX + 0.10, y: kneeY, z: 0 },
    [POSE_LANDMARKS.RIGHT_ANKLE]: { x: ankleX + 0.10, y: ankleY, z: 0 },
    [POSE_LANDMARKS.LEFT_SHOULDER]: { x: hipX, y: Math.max(0.05, hipY - 0.20), z: 0 },
    [POSE_LANDMARKS.RIGHT_SHOULDER]: { x: hipX + 0.10, y: Math.max(0.05, hipY - 0.20), z: 0 },
  });
}

describe("SquatDetector", () => {
  let detector: SquatDetector;

  beforeEach(() => {
    detector = new SquatDetector();
  });

  describe("calculateAngle", () => {
    it("returns 180° for a straight line", () => {
      const a = { x: 0, y: 0, z: 0, visibility: 1 };
      const b = { x: 1, y: 0, z: 0, visibility: 1 };
      const c = { x: 2, y: 0, z: 0, visibility: 1 };
      expect(detector.calculateAngle(a, b, c)).toBeCloseTo(180, 0);
    });

    it("returns 90° for a right angle", () => {
      const a = { x: 0, y: 1, z: 0, visibility: 1 };
      const b = { x: 0, y: 0, z: 0, visibility: 1 };
      const c = { x: 1, y: 0, z: 0, visibility: 1 };
      expect(detector.calculateAngle(a, b, c)).toBeCloseTo(90, 0);
    });

    it("returns 0° for coincident points", () => {
      const a = { x: 0, y: 0, z: 0, visibility: 1 };
      const b = { x: 0, y: 0, z: 0, visibility: 1 };
      const c = { x: 0, y: 0, z: 0, visibility: 1 };
      expect(detector.calculateAngle(a, b, c)).toBe(0);
    });
  });

  describe("process", () => {
    it("returns N/A depth status when standing (knee angle > 160°)", () => {
      const landmarks = createSquatLandmarks(175);
      const result = detector.process(landmarks);
      expect(result.depth_status).toBe("N/A");
      expect(result.reps).toBe(0);
      expect(result.pose_detected).toBe(true);
    });

    it("counts a rep when going down then up", () => {
      // Down: knee angle ~80° (< 100° threshold)
      const downLandmarks = createSquatLandmarks(80);
      // Up: knee angle ~175° (>= 160° threshold)
      const upLandmarks = createSquatLandmarks(175);

      let result = detector.process(downLandmarks);
      expect(result.depth_status).toBe("GOOD DEPTH");
      expect(result.reps).toBe(0);

      result = detector.process(upLandmarks);
      expect(result.reps).toBe(1);
      expect(result.depth_status).toBe("STANDING");
    });

    it("reports TOO HIGH when in down stage with knee angle between 100° and 160°", () => {
      // First go deep (sets stage to "down")
      detector.process(createSquatLandmarks(80));

      // Now partial depth: knee angle ~120°
      const result = detector.process(createSquatLandmarks(120));
      expect(result.depth_status).toBe("TOO HIGH");
    });

    it("does not count a rep if down threshold not reached", () => {
      detector.process(createSquatLandmarks(120)); // Above DOWN_THRESHOLD
      const result = detector.process(createSquatLandmarks(175));
      expect(result.reps).toBe(0);
    });

    it("resets reps and stage on reset()", () => {
      detector.process(createSquatLandmarks(80));
      detector.process(createSquatLandmarks(175));
      expect(detector.reps).toBe(1);

      detector.reset();
      expect(detector.reps).toBe(0);
      expect(detector.stage).toBeNull();
    });

    it("reports pose_detected as false when ALL key landmarks have low visibility", () => {
      const landmarks = createSquatLandmarks(80);
      // Lower visibility on BOTH sides
      [POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.LEFT_KNEE, POSE_LANDMARKS.LEFT_ANKLE,
       POSE_LANDMARKS.RIGHT_HIP, POSE_LANDMARKS.RIGHT_KNEE, POSE_LANDMARKS.RIGHT_ANKLE
      ].forEach(idx => { landmarks[idx].visibility = 0.1; });

      const result = detector.process(landmarks);
      expect(result.pose_detected).toBe(false);
      expect(result.reps).toBe(0);
    });

    it("returns form_score between 0 and 100", () => {
      const result = detector.process(createSquatLandmarks(80));
      expect(result.form_score).toBeGreaterThanOrEqual(0);
      expect(result.form_score).toBeLessThanOrEqual(100);
    });

    it("counts multiple reps", () => {
      for (let i = 0; i < 5; i++) {
        detector.process(createSquatLandmarks(80));
        detector.process(createSquatLandmarks(175));
      }
      expect(detector.reps).toBe(5);
    });
  });
});
