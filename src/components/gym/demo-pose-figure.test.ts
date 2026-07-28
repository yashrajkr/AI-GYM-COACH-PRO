import { describe, it, expect } from "vitest";
import {
  RIGS,
  lerpPose,
  angleAt,
  hasFrontView,
  type RigExercise,
  type Pose,
} from "./demo-pose-figure";

/**
 * The landing demo animates via requestAnimationFrame, which cannot be
 * exercised in a headless/hidden page (rAF is suspended when the document is
 * not compositing). These tests cover the pure motion maths instead, so the
 * claim "the figure actually performs the selected exercise" is verified
 * rather than assumed.
 */

const EXERCISES = Object.keys(RIGS) as RigExercise[];

/** Every defined rig view, flattened, so checks cover optional front views. */
const ALL_VIEWS: { ex: RigExercise; view: string; rig: (typeof RIGS)[RigExercise]["side"] }[] =
  EXERCISES.flatMap((ex) => {
    const views = [{ ex, view: "side", rig: RIGS[ex].side }];
    const front = RIGS[ex].front;
    if (front) views.push({ ex, view: "front", rig: front });
    return views;
  });

describe("rig integrity", () => {
  it("covers every exercise the app can coach", () => {
    // Keep in step with ExerciseId in @/lib/exercises — a missing rig means
    // the live-coach form demo silently falls back or disappears.
    expect(EXERCISES.sort()).toEqual(
      [
        "biceps_curl",
        "glute_bridge",
        "jumping_jack",
        "lunges",
        "plank",
        "pushup",
        "shoulder_press",
        "squat",
      ].sort()
    );
  });

  it("always defines a side view", () => {
    for (const ex of EXERCISES) expect(RIGS[ex].side, `${ex}`).toBeDefined();
  });

  it("reports front-view availability honestly", () => {
    for (const ex of EXERCISES) {
      expect(hasFrontView(ex)).toBe(RIGS[ex].front !== undefined);
    }
    // Floor and isometric movements read from one angle only.
    expect(hasFrontView("plank")).toBe(false);
    expect(hasFrontView("glute_bridge")).toBe(false);
    expect(hasFrontView("squat")).toBe(true);
  });

  it("keeps the same joint set across both keyframes of a rig", () => {
    for (const { ex, view, rig } of ALL_VIEWS) {
      expect(Object.keys(rig.bottom).sort(), `${ex}/${view}`).toEqual(
        Object.keys(rig.top).sort()
      );
    }
  });

  it("only draws bones between joints that exist", () => {
    for (const { ex, view, rig } of ALL_VIEWS) {
      for (const [from, to] of rig.bones) {
        expect(rig.top[from], `${ex}/${view}: bone start ${from}`).toBeDefined();
        expect(rig.top[to], `${ex}/${view}: bone end ${to}`).toBeDefined();
      }
    }
  });

  it("coaches a joint that exists and can be measured", () => {
    for (const { ex, view, rig } of ALL_VIEWS) {
      expect(rig.top[rig.coached.joint], `${ex}/${view}: coached joint`).toBeDefined();
      for (const j of rig.coached.angleAt) {
        expect(rig.top[j], `${ex}/${view}: angle joint ${j}`).toBeDefined();
      }
      expect(rig.coached.from).toBeGreaterThan(0);
      expect(rig.coached.from).toBeLessThan(1);
    }
  });

  it("keeps every joint inside the 100x100 viewBox", () => {
    for (const { ex, view, rig } of ALL_VIEWS) {
      for (const pose of [rig.top, rig.bottom] as Pose[]) {
        for (const name of Object.keys(pose)) {
          const p = pose[name];
          expect(p.x, `${ex}/${view}/${name}.x`).toBeGreaterThanOrEqual(0);
          expect(p.x, `${ex}/${view}/${name}.x`).toBeLessThanOrEqual(100);
          expect(p.y, `${ex}/${view}/${name}.y`).toBeGreaterThanOrEqual(0);
          expect(p.y, `${ex}/${view}/${name}.y`).toBeLessThanOrEqual(100);
        }
      }
    }
  });

  it("actually moves between the two keyframes", () => {
    for (const { ex, view, rig } of ALL_VIEWS) {
      expect(rig.bottom, `${ex}/${view} is static`).not.toEqual(rig.top);
    }
  });
});

describe("newly added exercises move correctly", () => {
  it("lunges drop the hips and drive the lead knee forward", () => {
    const { top, bottom } = RIGS.lunges.side;
    expect(bottom.hip.y).toBeGreaterThan(top.hip.y);
    expect(bottom.knee.x).toBeGreaterThan(top.knee.x);
  });

  it("shoulder press finishes with the wrist above the shoulder", () => {
    const { top, bottom } = RIGS.shoulder_press.side;
    expect(top.wrist.y).toBeGreaterThan(top.shoulder.y - 5); // racked, near shoulder
    expect(bottom.wrist.y).toBeLessThan(bottom.shoulder.y); // overhead
    expect(angleAt(bottom.shoulder, bottom.elbow, bottom.wrist)).toBeGreaterThan(150);
  });

  it("glute bridge lifts the hips while shoulders and feet stay planted", () => {
    const { top, bottom } = RIGS.glute_bridge.side;
    expect(bottom.hip.y).toBeLessThan(top.hip.y); // hips rise
    expect(bottom.shoulder).toEqual(top.shoulder);
    expect(bottom.ankle).toEqual(top.ankle);
  });

  it("plank only drifts at the hips — it is an isometric hold", () => {
    const { top, bottom } = RIGS.plank.side;
    expect(bottom.shoulder).toEqual(top.shoulder);
    expect(bottom.hip.y).toBeGreaterThan(top.hip.y); // sag is the fault shown
  });

  it("jumping jack opens arms overhead and feet wide", () => {
    const { top, bottom } = RIGS.jumping_jack.front!;
    expect(bottom.wristR.y).toBeLessThan(top.wristR.y); // hands up
    expect(bottom.ankleR.x - bottom.ankleL.x).toBeGreaterThan(
      top.ankleR.x - top.ankleL.x
    ); // feet wider
  });
});

describe("pose interpolation", () => {
  it("returns the exact keyframes at the ends of the rep", () => {
    for (const ex of EXERCISES) {
      const { top, bottom } = RIGS[ex].side;
      expect(lerpPose(top, bottom, 0)).toEqual(top);
      expect(lerpPose(top, bottom, 1)).toEqual(bottom);
    }
  });

  it("places every joint between its keyframes mid-rep", () => {
    const { top, bottom } = RIGS.squat.side;
    const mid = lerpPose(top, bottom, 0.5);
    for (const j of Object.keys(mid)) {
      const lo = Math.min(top[j].x, bottom[j].x);
      const hi = Math.max(top[j].x, bottom[j].x);
      expect(mid[j].x).toBeGreaterThanOrEqual(lo);
      expect(mid[j].x).toBeLessThanOrEqual(hi);
    }
  });
});

describe("squat, side view", () => {
  const { top, bottom } = RIGS.squat.side;

  it("drops the hips and drives them backwards", () => {
    expect(bottom.hip.y).toBeGreaterThan(top.hip.y); // y grows downward
    expect(bottom.hip.x).toBeLessThan(top.hip.x);
  });

  it("tracks the knees forward over the foot", () => {
    expect(bottom.knee.x).toBeGreaterThan(top.knee.x);
  });

  it("keeps the feet planted", () => {
    expect(bottom.ankle).toEqual(top.ankle);
    expect(bottom.toe).toEqual(top.toe);
  });

  it("closes the knee angle from standing to depth", () => {
    expect(angleAt(top.hip, top.knee, top.ankle)).toBeGreaterThan(170);
    expect(angleAt(bottom.hip, bottom.knee, bottom.ankle)).toBeLessThan(130);
  });
});

describe("squat, front view", () => {
  const { top, bottom } = RIGS.squat.front!;

  it("stays symmetric about the centre line", () => {
    for (const [l, r] of [
      ["shoulderL", "shoulderR"],
      ["hipL", "hipR"],
      ["kneeL", "kneeR"],
      ["ankleL", "ankleR"],
    ]) {
      expect(bottom[l].x + bottom[r].x).toBeCloseTo(100, 5); // mirrored about x=50
      expect(bottom[l].y).toBeCloseTo(bottom[r].y, 5);
    }
  });

  it("drives the knees outward rather than letting them collapse in", () => {
    const topWidth = top.kneeR.x - top.kneeL.x;
    const bottomWidth = bottom.kneeR.x - bottom.kneeL.x;
    expect(bottomWidth).toBeGreaterThan(topWidth);
  });

  it("lowers the hips", () => {
    expect(bottom.hipL.y).toBeGreaterThan(top.hipL.y);
  });
});

describe("push-up, side view", () => {
  const { top, bottom } = RIGS.pushup.side;

  it("keeps the hands planted on the floor", () => {
    expect(bottom.wrist).toEqual(top.wrist);
  });

  it("lowers the whole body toward the floor", () => {
    for (const j of ["head", "shoulder", "hip", "knee", "ankle"]) {
      expect(bottom[j].y).toBeGreaterThan(top[j].y);
    }
  });

  it("bends the elbow", () => {
    expect(angleAt(top.shoulder, top.elbow, top.wrist)).toBeGreaterThan(170);
    expect(angleAt(bottom.shoulder, bottom.elbow, bottom.wrist)).toBeLessThan(150);
  });

  it("is horizontal, unlike the standing exercises", () => {
    expect(Math.abs(top.shoulder.y - top.ankle.y)).toBeLessThan(30);
    expect(top.shoulder.x - top.ankle.x).toBeGreaterThan(40);
  });
});

describe("push-up, front view", () => {
  const { top, bottom } = RIGS.pushup.front!;

  it("keeps both hands planted", () => {
    expect(bottom.wristL).toEqual(top.wristL);
    expect(bottom.wristR).toEqual(top.wristR);
  });

  it("flares the elbows outward at the bottom", () => {
    expect(bottom.elbowR.x).toBeGreaterThan(top.elbowR.x);
    expect(bottom.elbowL.x).toBeLessThan(top.elbowL.x);
  });
});

describe("biceps curl, side view", () => {
  const { top, bottom } = RIGS.biceps_curl.side;

  it("moves only the wrist", () => {
    for (const j of ["head", "shoulder", "elbow", "hip", "knee", "ankle", "toe"]) {
      expect(bottom[j]).toEqual(top[j]);
    }
    expect(bottom.wrist).not.toEqual(top.wrist);
  });

  it("raises the hand above the elbow", () => {
    expect(bottom.wrist.y).toBeLessThan(top.wrist.y);
    expect(bottom.wrist.y).toBeLessThan(top.elbow.y);
  });

  it("closes the elbow angle", () => {
    expect(angleAt(top.shoulder, top.elbow, top.wrist)).toBeGreaterThan(160);
    expect(angleAt(bottom.shoulder, bottom.elbow, bottom.wrist)).toBeLessThan(90);
  });
});

describe("biceps curl, front view", () => {
  const { top, bottom } = RIGS.biceps_curl.front!;

  it("pins the elbows and moves both hands", () => {
    expect(bottom.elbowL).toEqual(top.elbowL);
    expect(bottom.elbowR).toEqual(top.elbowR);
    expect(bottom.wristL.y).toBeLessThan(top.wristL.y);
    expect(bottom.wristR.y).toBeLessThan(top.wristR.y);
  });

  it("curls both arms by the same amount", () => {
    const left = top.wristL.y - bottom.wristL.y;
    const right = top.wristR.y - bottom.wristR.y;
    expect(left).toBeCloseTo(right, 5);
  });
});

describe("angleAt", () => {
  it("measures a straight line as 180 degrees", () => {
    expect(angleAt({ x: 0, y: 0 }, { x: 0, y: 10 }, { x: 0, y: 20 })).toBe(180);
  });

  it("measures a right angle as 90 degrees", () => {
    expect(angleAt({ x: 0, y: 0 }, { x: 0, y: 10 }, { x: 10, y: 10 })).toBe(90);
  });

  it("is degenerate-safe when joints coincide", () => {
    expect(angleAt({ x: 5, y: 5 }, { x: 5, y: 5 }, { x: 5, y: 5 })).toBe(0);
  });
});
