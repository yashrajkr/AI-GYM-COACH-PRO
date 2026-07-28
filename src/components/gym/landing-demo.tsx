"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Play, Volume2, VolumeX, Camera, Activity } from "lucide-react";
import { getSound } from "@/lib/coaching/sound";
import { DemoPoseFigure, type DemoExercise, type ViewAngle } from "./demo-pose-figure";
type DemoPersonality = "drill" | "zen" | "technical";

interface CueSequence {
  cues: string[];
  formScores: number[];
}

const CUES: Record<DemoExercise, Record<DemoPersonality, CueSequence>> = {
  squat: {
    drill: {
      cues: [
        "Set up. Feet shoulder-width. Let's move.",
        "Good depth. Drive through your heels.",
        "Chest up. Sit back deeper. Two more.",
        "Killer set. That's how you squat.",
      ],
      formScores: [88, 94, 92, 96],
    },
    zen: {
      cues: [
        "Find your stance. Breathe into the movement.",
        "Beautiful depth. Honor the ascent.",
        "Lift your chest. Lengthen your spine.",
        "Lovely set. Stay present.",
      ],
      formScores: [85, 91, 89, 93],
    },
    technical: {
      cues: [
        "Initiate descent. Tracking 33 landmarks.",
        "Knee angle 92°. Depth confirmed. Ascend.",
        "Torso angle 38°. Adjust chest position.",
        "Set complete. Form score logged: 96/100.",
      ],
      formScores: [90, 95, 88, 96],
    },
  },
  pushup: {
    drill: {
      cues: [
        "Hands under shoulders. Body straight. Go.",
        "Full depth. Push explosive. Again.",
        "Hips up. Don't sag. Tighten that core.",
        "Clean set. That's 10 solid reps.",
      ],
      formScores: [86, 92, 89, 95],
    },
    zen: {
      cues: [
        "Plant your hands. Soften your elbows.",
        "Lower with control. Breathe down.",
        "Long spine. Engage through the palms.",
        "Graceful work. Rest now.",
      ],
      formScores: [84, 90, 92, 94],
    },
    technical: {
      cues: [
        "Elbow angle 88°. Bottom position reached.",
        "Body alignment: 168°. Optimal trajectory.",
        "Hip deviation detected. Engage core.",
        "Set logged. Avg form score: 94/100.",
      ],
      formScores: [91, 93, 87, 95],
    },
  },
  biceps_curl: {
    drill: {
      cues: [
        "Elbows pinned. Curl up. Squeeze.",
        "Control the negative. Don't swing.",
        "Full extension. Full contraction.",
        "That's how you isolate. Done.",
      ],
      formScores: [89, 93, 91, 96],
    },
    zen: {
      cues: [
        "Anchor your elbows. Move with intention.",
        "Rise gently. Feel the biceps engage.",
        "Lower slowly. Honor the eccentric.",
        "Mindful set. Well done.",
      ],
      formScores: [86, 91, 90, 93],
    },
    technical: {
      cues: [
        "Elbow angle 45°. Contracted position.",
        "Shoulder stability: optimal. No drift.",
        "Eccentric phase: 2.1s. Within target.",
        "Set complete. Form score: 96/100.",
      ],
      formScores: [92, 95, 89, 96],
    },
  },
};

export function LandingDemo({ onLaunch }: { onLaunch: () => void }) {
  const [exercise, setExercise] = useState<DemoExercise>("squat");
  const [personality, setPersonality] = useState<DemoPersonality>("drill");
  const [soundOn, setSoundOn] = useState(false);
  const [view, setView] = useState<ViewAngle>("side");

  // The inner demo loop is a separate component keyed by exercise+personality
  // so it auto-resets state when either changes (no setState-in-effect needed).
  // `view` is intentionally NOT in the key — switching camera angle mid-set
  // should not reset your rep count.
  return (
    <DemoInner
      key={`${exercise}-${personality}`}
      exercise={exercise}
      personality={personality}
      soundOn={soundOn}
      view={view}
      onExercise={setExercise}
      onPersonality={setPersonality}
      onSound={setSoundOn}
      onView={setView}
      onLaunch={onLaunch}
    />
  );
}

interface DemoInnerProps {
  exercise: DemoExercise;
  personality: DemoPersonality;
  soundOn: boolean;
  view: ViewAngle;
  onExercise: (e: DemoExercise) => void;
  onPersonality: (p: DemoPersonality) => void;
  onSound: (s: boolean) => void;
  onView: (v: ViewAngle) => void;
  onLaunch: () => void;
}

function DemoInner({
  exercise,
  personality,
  soundOn,
  view,
  onExercise,
  onPersonality,
  onSound,
  onView,
  onLaunch,
}: DemoInnerProps) {
  const [reps, setReps] = useState(0);
  const [cueIndex, setCueIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  const sequence = CUES[exercise][personality];
  // Derive current cue + formScore from cueIndex (no separate state needed)
  const cueText = sequence.cues[cueIndex];
  const formScore = sequence.formScores[cueIndex];

  // Reps and cues are driven by the figure's own animation rather than a
  // detached 3-second timer. Previously the counter ticked while the avatar
  // stood still, so the numbers looked arbitrary and the caption could tell
  // you to "sit back deeper" over an upright figure.
  const cueCount = sequence.cues.length;
  const handleRepComplete = useCallback(() => {
    setReps((r) => (r + 1) % 11); // 0-10 loop
    setCueIndex((i) => (i + 1) % cueCount);
    if (soundOn) {
      getSound().play("rep_complete");
    }
  }, [cueCount, soundOn]);

  const formScoreColor =
    formScore >= 90 ? "text-lime" : formScore >= 80 ? "text-amber" : "text-red-400";

  const formScoreBg =
    formScore >= 90 ? "bg-lime" : formScore >= 80 ? "bg-amber" : "bg-red-400";

  return (
    <div className="space-y-4">
      {/* Demo viewport */}
      <div className="relative rounded-2xl overflow-hidden glass border-lime/20 min-h-[400px] md:min-h-[480px]">
        {/* Tracked pose figure — performs the selected exercise */}
        <div className="absolute inset-0 flex items-center justify-center">
          <DemoPoseFigure
            exercise={exercise}
            view={view}
            paused={!isPlaying}
            onRepComplete={handleRepComplete}
            className="h-full w-full max-w-[420px]"
          />
        </div>

        {/* Top-left: Exercise label + live indicator */}
        <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
          <div className="glass-strong rounded-lg px-2.5 py-1.5 flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lime opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-lime" />
            </span>
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              Live Demo · {exercise}
            </span>
          </div>
        </div>

        {/* Top-right: Heatmap legend */}
        <div className="absolute top-3 right-3 glass rounded-lg px-2 py-1.5 z-10">
          {/* Now describes something real: the tracked joints below change to
              these colours as form drifts through the rep. */}
          <div className="text-[8px] font-mono uppercase tracking-wider text-muted-foreground mb-1">
            Joint form
          </div>
          <div className="flex items-center gap-2 text-[9px] font-mono">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-lime" />GOOD</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber" />WARN</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" />FIX</span>
          </div>
        </div>

        {/* Right-side: Rep counter + Form score (animated overlays) */}
        <div className="absolute top-12 right-3 flex flex-col gap-2 z-10">
          <motion.div
            key={`reps-${reps}`}
            initial={{ scale: 1.2, opacity: 0.7 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="glass-strong rounded-lg px-3 py-2 min-w-[80px]"
          >
            <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Reps</div>
            <div className="font-mono text-2xl font-bold text-lime">{reps}</div>
          </motion.div>
          <div className="glass-strong rounded-lg px-3 py-2 min-w-[80px]">
            <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Form</div>
            <div className={`font-mono text-2xl font-bold ${formScoreColor}`}>
              <AnimatePresence mode="wait">
                <motion.span
                  key={formScore}
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -10, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {formScore}
                </motion.span>
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Form score ring bar (left side) */}
        <div className="absolute top-12 left-3 z-10">
          <div className="glass-strong rounded-lg p-3 w-32">
            <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">Form Score</div>
            <div className="relative h-2 bg-muted/40 rounded-full overflow-hidden">
              <motion.div
                className={`absolute inset-y-0 left-0 rounded-full ${formScoreBg}`}
                initial={{ width: 0 }}
                animate={{ width: `${formScore}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
            <div className="flex justify-between text-[9px] font-mono text-muted-foreground mt-1">
              <span>0</span>
              <span className={formScoreColor}>{formScore}/100</span>
              <span>100</span>
            </div>
          </div>
        </div>

        {/* Bottom: Voice coach cue overlay */}
        <AnimatePresence mode="wait">
          <motion.div
            key={cueText}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="absolute bottom-3 left-3 right-3 rounded-lg glass-strong border border-lime/40 px-4 py-3 z-10"
          >
            <div className="flex items-center gap-2">
              <Volume2 className="h-4 w-4 text-lime shrink-0 animate-pulse" />
              <p className="text-sm text-foreground">{cueText}</p>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Camera angle switch. A single fixed angle hid half of every
            movement — squat depth is invisible from the front, knee tracking
            is invisible from the side — so the demo could not teach the form
            it was talking about. */}
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 glass-strong rounded-full p-1 flex items-center gap-1">
          {(["side", "front"] as ViewAngle[]).map((v) => (
            <button
              key={v}
              onClick={() => onView(v)}
              aria-pressed={view === v}
              className={`px-3 h-8 rounded-full text-[11px] font-mono uppercase tracking-wider transition-all ${
                view === v
                  ? "bg-lime/20 text-lime border border-lime/40"
                  : "text-muted-foreground hover:text-foreground border border-transparent"
              }`}
            >
              {v === "side" ? "Side view" : "Front view"}
            </button>
          ))}
        </div>

        {/* Pause overlay when not playing */}
        <AnimatePresence>
          {!isPlaying && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background/70 backdrop-blur-sm flex items-center justify-center z-20"
            >
              <button
                onClick={() => setIsPlaying(true)}
                className="glass-strong rounded-full p-6 glow-lime hover:scale-110 transition-transform"
              >
                <Play className="h-8 w-8 text-lime" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Demo controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Exercise selector */}
        <div className="glass rounded-xl p-3">
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">Exercise</div>
          <div className="flex gap-1.5">
            {(["squat", "pushup", "biceps_curl"] as DemoExercise[]).map((ex) => (
              <button
                key={ex}
                onClick={() => onExercise(ex)}
                className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-all ${
                  exercise === ex
                    ? "bg-lime/20 text-lime border border-lime/40 glow-lime"
                    : "text-muted-foreground hover:text-foreground border border-transparent"
                }`}
              >
                {ex === "squat" ? "🦵 Squat" : ex === "pushup" ? "💪 Push-up" : "🏋️ Curl"}
              </button>
            ))}
          </div>
        </div>

        {/* Coach personality */}
        <div className="glass rounded-xl p-3">
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">Coach Personality</div>
          <div className="flex gap-1.5">
            {(["drill", "zen", "technical"] as DemoPersonality[]).map((p) => (
              <button
                key={p}
                onClick={() => onPersonality(p)}
                className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium capitalize transition-all ${
                  personality === p
                    ? "bg-cyan/20 text-cyan border border-cyan/40 glow-cyan"
                    : "text-muted-foreground hover:text-foreground border border-transparent"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Sound + play/pause */}
        <div className="glass rounded-xl p-3">
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">Sound</div>
          <div className="flex gap-1.5">
            <button
              onClick={() => onSound(!soundOn)}
              className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                soundOn
                  ? "bg-lime/20 text-lime border border-lime/40"
                  : "text-muted-foreground border border-transparent"
              }`}
            >
              {soundOn ? <Volume2 className="h-3 w-3" /> : <VolumeX className="h-3 w-3" />}
              {soundOn ? "On" : "Off"}
            </button>
            <button
              onClick={() => setIsPlaying((p) => !p)}
              className="flex-1 py-1.5 px-2 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 text-muted-foreground hover:text-foreground border border-transparent hover:border-border transition-all"
            >
              <Activity className="h-3 w-3" />
              {isPlaying ? "Pause" : "Play"}
            </button>
          </div>
        </div>
      </div>

      {/* CTA below demo */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground mb-3">
          This is a simulated demo. Ready for the real thing?
        </p>
        <Button
          // Actually launches the app. This used to scroll to the final CTA
          // further down the page, so a button reading "Try with Your Camera"
          // just moved you down the marketing page and never opened anything.
          onClick={onLaunch}
          className="bg-lime text-background hover:bg-lime/90 glow-lime h-11"
        >
          <Camera className="mr-2 h-4 w-4" /> Try with Your Camera
        </Button>
      </div>
    </div>
  );
}

