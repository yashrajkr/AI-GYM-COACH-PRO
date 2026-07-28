import { describe, it, expect, beforeEach } from "vitest";
import { PushUpDetector } from "./pushup";
import { BicepsCurlDetector } from "./biceps_curl";
import { ShoulderPressDetector } from "./shoulder_press";
import { LungesDetector } from "./lunges";
import { PlankDetector } from "./plank";
import { JumpingJackDetector } from "./jumping_jack";
import { GluteBridgeDetector } from "./glute_bridge";
import type { Landmarks } from "./base";

function createLandmarks(): Landmarks {
  return Array.from({ length: 33 }, () => ({
    x: 0.5, y: 0.5, z: 0, visibility: 1,
  })) as Landmarks;
}

describe("All Detectors — Form Score & Reset", () => {
  describe("PushUpDetector", () => {
    let detector: PushUpDetector;
    beforeEach(() => { detector = new PushUpDetector(); });

    it("returns form_score between 0 and 100", () => {
      const result = detector.process(createLandmarks());
      expect(result.form_score).toBeGreaterThanOrEqual(0);
      expect(result.form_score).toBeLessThanOrEqual(100);
    });

    it("resets on reset()", () => {
      detector.reset();
      expect(detector.reps).toBe(0);
      expect(detector.stage).toBeNull();
    });

    it("returns reps as number", () => {
      const result = detector.process(createLandmarks());
      expect(typeof result.reps).toBe("number");
    });
  });

  describe("BicepsCurlDetector", () => {
    let detector: BicepsCurlDetector;
    beforeEach(() => { detector = new BicepsCurlDetector(); });

    it("returns form_score between 0 and 100", () => {
      const result = detector.process(createLandmarks());
      expect(result.form_score).toBeGreaterThanOrEqual(0);
      expect(result.form_score).toBeLessThanOrEqual(100);
    });

    it("resets on reset()", () => {
      detector.reset();
      expect(detector.reps).toBe(0);
      expect(detector.stage).toBeNull();
    });
  });

  describe("ShoulderPressDetector", () => {
    let detector: ShoulderPressDetector;
    beforeEach(() => { detector = new ShoulderPressDetector(); });

    it("returns form_score between 0 and 100", () => {
      const result = detector.process(createLandmarks());
      expect(result.form_score).toBeGreaterThanOrEqual(0);
      expect(result.form_score).toBeLessThanOrEqual(100);
    });

    it("resets on reset()", () => {
      detector.reset();
      expect(detector.reps).toBe(0);
      expect(detector.stage).toBeNull();
    });
  });

  describe("LungesDetector", () => {
    let detector: LungesDetector;
    beforeEach(() => { detector = new LungesDetector(); });

    it("returns form_score between 0 and 100", () => {
      const result = detector.process(createLandmarks());
      expect(result.form_score).toBeGreaterThanOrEqual(0);
      expect(result.form_score).toBeLessThanOrEqual(100);
    });

    it("resets on reset()", () => {
      detector.reset();
      expect(detector.reps).toBe(0);
      expect(detector.stage).toBeNull();
    });
  });

  describe("PlankDetector", () => {
    let detector: PlankDetector;
    beforeEach(() => { detector = new PlankDetector(); });

    it("returns form_score between 0 and 100", () => {
      const result = detector.process(createLandmarks());
      expect(result.form_score).toBeGreaterThanOrEqual(0);
      expect(result.form_score).toBeLessThanOrEqual(100);
    });

    it("resets on reset()", () => {
      detector.reset();
      expect(detector.reps).toBe(0);
      expect(detector.stage).toBeNull();
    });
  });

  describe("JumpingJackDetector", () => {
    let detector: JumpingJackDetector;
    beforeEach(() => { detector = new JumpingJackDetector(); });

    it("returns form_score between 0 and 100", () => {
      const result = detector.process(createLandmarks());
      expect(result.form_score).toBeGreaterThanOrEqual(0);
      expect(result.form_score).toBeLessThanOrEqual(100);
    });

    it("resets on reset()", () => {
      detector.reset();
      expect(detector.reps).toBe(0);
      expect(detector.stage).toBeNull();
    });
  });

  describe("GluteBridgeDetector", () => {
    let detector: GluteBridgeDetector;
    beforeEach(() => { detector = new GluteBridgeDetector(); });

    it("returns form_score between 0 and 100", () => {
      const result = detector.process(createLandmarks());
      expect(result.form_score).toBeGreaterThanOrEqual(0);
      expect(result.form_score).toBeLessThanOrEqual(100);
    });

    it("resets on reset()", () => {
      detector.reset();
      expect(detector.reps).toBe(0);
      expect(detector.stage).toBeNull();
    });
  });
});
