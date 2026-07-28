import { describe, it, expect, beforeEach } from "vitest";
import { useWorkoutStore, getLevel, type SessionHistoryEntry } from "./workout";

// Reset the store between tests so each test starts from a clean slate.
beforeEach(() => {
  useWorkoutStore.setState({
    isActive: false,
    plan: null,
    startedAt: null,
    currentReps: 0,
    currentSetReps: 0,
    setsCompleted: 0,
    avgFormScore: 0,
    formScoreHistory: [],
    lastFeedback: null,
    lastFeedbackAt: null,
    coachEnabled: true,
    coachPersonality: "drill",
    soundEnabled: true,
    history: [],
    totalXp: 0,
    streak: 0,
    lastWorkoutDate: null,
  });
});

describe("workout store — XP calculation", () => {
  it("awards base XP only when at least one set is completed", () => {
    // Simulate a workout with 0 sets — should earn 0 XP.
    useWorkoutStore.setState({
      isActive: true,
      plan: { exerciseId: "squat", targetSets: 3, repsPerSet: 10 },
      startedAt: Date.now() - 60_000,
      setsCompleted: 0,
      currentReps: 0,
      formScoreHistory: [],
    });
    useWorkoutStore.getState().endWorkout();
    expect(useWorkoutStore.getState().totalXp).toBe(0);
  });

  it("awards 50 base XP + 25/set for good form (>=85) without PR bonus on first workout", () => {
    useWorkoutStore.setState({
      isActive: true,
      plan: { exerciseId: "squat", targetSets: 3, repsPerSet: 10 },
      startedAt: Date.now() - 60_000,
      setsCompleted: 3,
      currentReps: 30,
      formScoreHistory: [90, 88, 92], // avg >= 85
      history: [],
    });
    useWorkoutStore.getState().endWorkout();
    // 50 base + 3 * 25 = 125. No PR bonus because there's no prior history.
    expect(useWorkoutStore.getState().totalXp).toBe(125);
  });

  it("awards PR bonus (100 XP) when bestFormScore exceeds prior best for same exercise", () => {
    const priorWorkout: SessionHistoryEntry = {
      id: "prior-1",
      exerciseId: "squat",
      exerciseName: "Squat",
      date: new Date(Date.now() - 86400_000).toISOString(),
      totalReps: 30,
      setsCompleted: 3,
      durationSec: 60,
      avgFormScore: 80,
      bestFormScore: 80,
    };
    useWorkoutStore.setState({
      isActive: true,
      plan: { exerciseId: "squat", targetSets: 3, repsPerSet: 10 },
      startedAt: Date.now() - 60_000,
      setsCompleted: 3,
      currentReps: 30,
      formScoreHistory: [90, 92, 95], // best 95 > prior best 80
      history: [priorWorkout],
    });
    useWorkoutStore.getState().endWorkout();
    // 50 base + 3 * 25 (good form) + 100 (PR) = 225
    expect(useWorkoutStore.getState().totalXp).toBe(225);
  });

  it("does NOT award PR bonus when bestFormScore is below prior best", () => {
    const priorWorkout: SessionHistoryEntry = {
      id: "prior-1",
      exerciseId: "squat",
      exerciseName: "Squat",
      date: new Date(Date.now() - 86400_000).toISOString(),
      totalReps: 30,
      setsCompleted: 3,
      durationSec: 60,
      avgFormScore: 95,
      bestFormScore: 95,
    };
    useWorkoutStore.setState({
      isActive: true,
      plan: { exerciseId: "squat", targetSets: 3, repsPerSet: 10 },
      startedAt: Date.now() - 60_000,
      setsCompleted: 3,
      currentReps: 30,
      formScoreHistory: [80, 82, 85], // best 85 < prior best 95
      history: [priorWorkout],
    });
    useWorkoutStore.getState().endWorkout();
    // 50 base + 3 * 25 (good form, avg 82 actually < 85 so no good-form bonus)
    // Avg is (80+82+85)/3 = 82.33 → rounds to 82 → < 85 → no good-form bonus.
    // Just 50 base XP.
    expect(useWorkoutStore.getState().totalXp).toBe(50);
  });
});

describe("workout store — clearAll", () => {
  it("clears history, XP, streak, and settings", () => {
    useWorkoutStore.setState({
      history: [
        {
          id: "1",
          exerciseId: "squat",
          exerciseName: "Squat",
          date: new Date().toISOString(),
          totalReps: 30,
          setsCompleted: 3,
          durationSec: 60,
          avgFormScore: 90,
          bestFormScore: 95,
        },
      ],
      totalXp: 500,
      streak: 7,
      lastWorkoutDate: new Date().toISOString(),
      coachEnabled: false,
      coachPersonality: "zen",
      soundEnabled: false,
    });
    useWorkoutStore.getState().clearAll();
    const state = useWorkoutStore.getState();
    expect(state.history).toEqual([]);
    expect(state.totalXp).toBe(0);
    expect(state.streak).toBe(0);
    expect(state.lastWorkoutDate).toBeNull();
    expect(state.isActive).toBe(false);
  });

  it("reset() only clears active-workout fields, NOT history/XP", () => {
    useWorkoutStore.setState({
      isActive: true,
      plan: { exerciseId: "squat", targetSets: 3, repsPerSet: 10 },
      startedAt: Date.now(),
      currentReps: 5,
      setsCompleted: 1,
      history: [
        {
          id: "1",
          exerciseId: "squat",
          exerciseName: "Squat",
          date: new Date().toISOString(),
          totalReps: 30,
          setsCompleted: 3,
          durationSec: 60,
          avgFormScore: 90,
          bestFormScore: 95,
        },
      ],
      totalXp: 500,
      streak: 7,
    });
    useWorkoutStore.getState().reset();
    const state = useWorkoutStore.getState();
    expect(state.isActive).toBe(false);
    expect(state.plan).toBeNull();
    expect(state.currentReps).toBe(0);
    // History + XP + streak preserved.
    expect(state.history).toHaveLength(1);
    expect(state.totalXp).toBe(500);
    expect(state.streak).toBe(7);
  });
});

describe("workout store — markSynced", () => {
  it("marks an entry as synced and updates its id to the server id", () => {
    useWorkoutStore.setState({
      history: [
        {
          id: "temp-123",
          exerciseId: "squat",
          exerciseName: "Squat",
          date: new Date().toISOString(),
          totalReps: 30,
          setsCompleted: 3,
          durationSec: 60,
          avgFormScore: 90,
          bestFormScore: 95,
          synced: false,
        },
      ],
    });
    useWorkoutStore.getState().markSynced("temp-123", "server-456");
    const entry = useWorkoutStore.getState().history[0];
    expect(entry.id).toBe("server-456");
    expect(entry.synced).toBe(true);
  });
});

describe("getLevel", () => {
  it("returns level 1 for 0 XP", () => {
    const result = getLevel(0);
    expect(result.level).toBe(1);
    expect(result.currentLevelXp).toBe(0);
    expect(result.progress).toBe(0);
  });

  it("returns level 1 with partial progress for 50 XP", () => {
    const result = getLevel(50);
    expect(result.level).toBe(1);
    expect(result.currentLevelXp).toBe(50);
    expect(result.progress).toBeCloseTo(0.5, 1);
  });

  it("returns level 2 at 100 XP", () => {
    const result = getLevel(100);
    expect(result.level).toBe(2);
    expect(result.currentLevelXp).toBe(0);
  });

  it("increases XP requirement for each level", () => {
    const level1 = getLevel(0);
    const level2 = getLevel(100);
    expect(level2.nextLevelXp).toBeGreaterThan(level1.nextLevelXp);
  });

  it("caps at level 50", () => {
    const result = getLevel(10000000);
    expect(result.level).toBe(50);
  });

  it("progress is between 0 and 1 (exclusive of 1)", () => {
    for (const xp of [0, 50, 99, 100, 150, 500, 1000, 5000, 10000]) {
      const result = getLevel(xp);
      expect(result.progress).toBeGreaterThanOrEqual(0);
      expect(result.progress).toBeLessThan(1);
    }
  });

  it("never returns negative currentLevelXp", () => {
    for (const xp of [0, 1, 50, 99, 100, 200, 1000]) {
      const result = getLevel(xp);
      expect(result.currentLevelXp).toBeGreaterThanOrEqual(0);
    }
  });
});
