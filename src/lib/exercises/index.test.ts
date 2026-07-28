import { describe, it, expect } from "vitest";
import { getFormIssue, EXERCISES, EXERCISE_LIST } from "./index";
import type { SquatMetrics, PushupMetrics, CurlMetrics } from "./index";

describe("Exercise Registry", () => {
  describe("EXERCISES", () => {
    it("has 8 exercises defined", () => {
      expect(Object.keys(EXERCISES)).toHaveLength(8);
    });

    it("each exercise has required fields", () => {
      for (const ex of EXERCISE_LIST) {
        expect(ex.id).toBeTruthy();
        expect(ex.name).toBeTruthy();
        expect(ex.shortName).toBeTruthy();
        expect(ex.icon).toBeTruthy();
        expect(ex.muscleGroups.length).toBeGreaterThan(0);
        expect(ex.difficulty).toBeTruthy();
        expect(ex.equipment).toBeTruthy();
        expect(ex.description).toBeTruthy();
        expect(ex.formCues.length).toBeGreaterThan(0);
        expect(ex.detectorClass).toBeTruthy();
      }
    });
  });

  describe("getFormIssue", () => {
    it("returns null for a perfect squat", () => {
      const metrics: SquatMetrics = {
        reps: 1,
        pose_detected: true,
        knee_angle: 90,
        back_angle: 145,
        depth_status: "GOOD DEPTH",
        form_score: 95,
      };
      expect(getFormIssue("squat", metrics)).toBeNull();
    });

    it("returns a cue for shallow squat depth", () => {
      const metrics: SquatMetrics = {
        reps: 1,
        pose_detected: true,
        knee_angle: 110,
        back_angle: 145,
        depth_status: "TOO HIGH",
        form_score: 75,
      };
      const issue = getFormIssue("squat", metrics);
      expect(issue).toBeTruthy();
      expect(issue).toContain("deep");
    });

    it("returns a cue for forward lean in squat", () => {
      const metrics: SquatMetrics = {
        reps: 1,
        pose_detected: true,
        knee_angle: 90,
        back_angle: 100,
        depth_status: "GOOD DEPTH",
        form_score: 80,
      };
      const issue = getFormIssue("squat", metrics);
      expect(issue).toBeTruthy();
      expect(issue).toContain("forward");
    });

    it("returns null for a perfect pushup", () => {
      const metrics: PushupMetrics = {
        reps: 1,
        pose_detected: true,
        elbow_angle: 90,
        body_alignment: "Straight",
        hip_status: "LEVEL",
        form_score: 95,
      };
      expect(getFormIssue("pushup", metrics)).toBeNull();
    });

    it("returns a cue for sagging hips in pushup", () => {
      const metrics: PushupMetrics = {
        reps: 1,
        pose_detected: true,
        elbow_angle: 90,
        body_alignment: "Straight",
        hip_status: "SAGGING",
        form_score: 70,
      };
      const issue = getFormIssue("pushup", metrics);
      expect(issue).toBeTruthy();
      expect(issue).toContain("sagging");
    });

    it("returns a cue for swinging in biceps curl", () => {
      const metrics: CurlMetrics = {
        reps: 1,
        pose_detected: true,
        elbow_angle: 45,
        shoulder_status: "STABLE",
        swing_status: "SWINGING",
        form_score: 65,
      };
      const issue = getFormIssue("biceps_curl", metrics);
      expect(issue).toBeTruthy();
      expect(issue).toContain("swing");
    });
  });
});
