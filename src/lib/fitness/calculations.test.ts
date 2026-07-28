import { describe, it, expect } from "vitest";
import {
  estimate1RM,
  estimateCalories,
  calculateTrainingLoad,
  calculateRecoveryScore,
  calculateIntensity,
  calculateRestTime,
  estimateFitnessLevel,
  calculateMuscleBalance,
} from "./calculations";
import type { SessionHistoryEntry } from "@/lib/stores/workout";

function mockWorkout(overrides: Partial<SessionHistoryEntry> = {}): SessionHistoryEntry {
  return {
    id: "test-1",
    exerciseId: "squat",
    exerciseName: "Squat",
    date: new Date().toISOString(),
    totalReps: 30,
    setsCompleted: 3,
    durationSec: 600,
    avgFormScore: 85,
    bestFormScore: 92,
    ...overrides,
  };
}

describe("Fitness Calculations", () => {
  describe("estimate1RM", () => {
    it("calculates 1RM using Epley equation", () => {
      const result = estimate1RM(100, 5);
      // 100 × (1 + 5/30) = 100 × 1.1667 = 116.7
      expect(result).toBeCloseTo(116.7, 0);
    });

    it("returns null for bodyweight exercises (no load)", () => {
      expect(estimate1RM(0, 10)).toBeNull();
      expect(estimate1RM(-5, 10)).toBeNull();
    });

    it("returns null for 0 reps", () => {
      expect(estimate1RM(100, 0)).toBeNull();
    });
  });

  describe("estimateCalories", () => {
    it("calculates calories based on MET, weight, and duration", () => {
      // squat MET = 5.0, 70kg, 10 min = 0.1667 hours
      // 5.0 × 70 × 0.1667 × intensityMultiplier(~1.14 for form 85) ≈ 66
      const result = estimateCalories("squat", 600, 70, 85);
      expect(result).toBeGreaterThan(50);
      expect(result).toBeLessThan(100);
    });

    it("returns 0 for 0 duration", () => {
      expect(estimateCalories("squat", 0, 70, 85)).toBe(0);
    });

    it("uses default weight of 70kg", () => {
      const result = estimateCalories("pushup", 600);
      expect(result).toBeGreaterThan(0);
    });
  });

  describe("calculateTrainingLoad", () => {
    it("returns zero values for empty history", () => {
      const result = calculateTrainingLoad([]);
      expect(result.weeklyVolume).toBe(0);
      expect(result.sessionsThisWeek).toBe(0);
      expect(result.trend).toBe("stable");
    });

    it("calculates weekly volume correctly", () => {
      const history = [mockWorkout({ totalReps: 30 }), mockWorkout({ totalReps: 20 })];
      const result = calculateTrainingLoad(history);
      expect(result.weeklyVolume).toBe(50);
      expect(result.sessionsThisWeek).toBe(2);
    });
  });

  describe("calculateRecoveryScore", () => {
    it("returns 100 for no previous workout", () => {
      expect(calculateRecoveryScore(null, 85, 3)).toBe(100);
    });

    it("returns lower score for recent workout (<12h)", () => {
      const recent = new Date(Date.now() - 2 * 3600 * 1000).toISOString(); // 2 hours ago
      const score = calculateRecoveryScore(recent, 85, 3);
      expect(score).toBeLessThan(70);
    });

    it("returns high score for 24-48h rest", () => {
      const optimal = new Date(Date.now() - 30 * 3600 * 1000).toISOString(); // 30 hours ago
      const score = calculateRecoveryScore(optimal, 90, 3);
      expect(score).toBeGreaterThanOrEqual(85);
    });

    it("penalizes overtraining (>6 sessions/week)", () => {
      const recent = new Date(Date.now() - 30 * 3600 * 1000).toISOString();
      const score = calculateRecoveryScore(recent, 85, 7);
      expect(score).toBeLessThan(90);
    });
  });

  describe("calculateIntensity", () => {
    it("returns 0 for 0 duration", () => {
      expect(calculateIntensity(30, 0, 85)).toBe(0);
    });

    it("returns higher intensity for more reps per minute", () => {
      const low = calculateIntensity(10, 600, 85); // 1 rep/min
      const high = calculateIntensity(60, 600, 85); // 6 reps/min
      expect(high).toBeGreaterThan(low);
    });

    it("returns higher intensity for lower form score (more stress)", () => {
      const good = calculateIntensity(30, 600, 95);
      const poor = calculateIntensity(30, 600, 60);
      expect(poor).toBeGreaterThan(good);
    });
  });

  describe("calculateRestTime", () => {
    it("returns base rest for first set", () => {
      const rest = calculateRestTime("squat", 50, 1);
      // base 90, intensityMult ~1.1, setMult 1.0 → ~99
      expect(rest).toBeGreaterThan(70);
      expect(rest).toBeLessThan(130);
    });

    it("increases rest for later sets", () => {
      const set1 = calculateRestTime("squat", 50, 1);
      const set3 = calculateRestTime("squat", 50, 3);
      expect(set3).toBeGreaterThan(set1);
    });

    it("increases rest for higher intensity", () => {
      const low = calculateRestTime("squat", 20, 1);
      const high = calculateRestTime("squat", 90, 1);
      expect(high).toBeGreaterThanOrEqual(low);
    });
  });

  describe("estimateFitnessLevel", () => {
    it("returns beginner for new users", () => {
      expect(estimateFitnessLevel(0, 50, 0, 0)).toBe("beginner");
    });

    it("returns elite for very experienced users", () => {
      expect(estimateFitnessLevel(100, 95, 30, 5000)).toBe("elite");
    });

    it("returns intermediate for moderate users", () => {
      // 15 workouts × 2 = 30, (75-50)×0.6 = 15, 5×1.5 = 7.5, 500/100 = 5 → total ~57.5 → advanced
      // Let's use lower values to get intermediate (30-54 range)
      expect(estimateFitnessLevel(8, 70, 3, 200)).toBe("intermediate");
    });
  });

  describe("calculateMuscleBalance", () => {
    it("returns empty array for no history", () => {
      expect(calculateMuscleBalance([])).toEqual([]);
    });

    it("calculates muscle percentages correctly", () => {
      const history = [
        mockWorkout({ exerciseId: "squat", totalReps: 30 }),
        mockWorkout({ exerciseId: "pushup", totalReps: 30 }),
      ];
      const result = calculateMuscleBalance(history);
      expect(result.length).toBeGreaterThan(0);
      // Squat targets 3 muscles, pushup targets 3 — total 6 muscle entries (some may overlap)
      const totalPct = result.reduce((s, m) => s + m.percentage, 0);
      expect(totalPct).toBeGreaterThanOrEqual(98);
      expect(totalPct).toBeLessThanOrEqual(102);
    });
  });
});
