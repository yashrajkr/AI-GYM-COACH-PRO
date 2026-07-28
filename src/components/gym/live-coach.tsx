"use client";

import { useEffect, useRef, useState, useCallback, Suspense, lazy, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PoseLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ExerciseFormDemo } from "./exercise-form-demo";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Activity,
  Camera,
  Volume2,
  VolumeX,
  Play,
  Square,
  Target,
  Zap,
  Award,
  Flame,
  TrendingUp,
  Ghost,
  ArrowLeft,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import {
  EXERCISES,
  POSE_CONNECTIONS,
  createDetector,
  getFormIssue,
} from "@/lib/exercises";
import type {
  ExerciseId,
  AnyMetrics,
  Landmarks,
} from "@/lib/exercises";
import { getVoiceCoach } from "@/lib/coaching/voice";
import { getSound } from "@/lib/coaching/sound";
import { useWorkoutStore } from "@/lib/stores/workout";
import { TiltCard, AnimatedNumber } from "@/components/ui-pro";
import { calculateRestTime, calculateIntensity } from "@/lib/fitness/calculations";
import { ExerciseGuideView } from "@/components/gym/exercise-guide-view";
import {
  FormHeatmapSkeleton,
  getExerciseDeviations,
} from "@/components/gym/form-heatmap";
import { FormGhostOverlay, GhostRecorder, type GhostRecording } from "@/components/gym/form-ghost";

// Lazy-load heavy 3D rep counter
const RepCounter3D = lazy(() =>
  import("@/components/three/rep-counter").then((m) => ({ default: m.RepCounter3D }))
);

interface LiveCoachProps {
  exerciseId: ExerciseId;
  targetSets: number;
  repsPerSet: number;
  onEnd: () => void;
  onCancel: () => void;
}

export function LiveCoach({
  exerciseId,
  targetSets,
  repsPerSet,
  onEnd,
  onCancel,
}: LiveCoachProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const landmarkerRef = useRef<PoseLandmarker | null>(null);
  const detectorRef = useRef<ReturnType<typeof createDetector> | null>(null);
  const rafRef = useRef<number>(0);
  const lastVideoTimeRef = useRef<number>(-1);
  const lastFeedbackTimeRef = useRef<number>(0);
  const lastRepCountRef = useRef<number>(0);
  const lastSetCountRef = useRef<number>(0);

  const [cameraReady, setCameraReady] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fps, setFps] = useState(0);
  const [metrics, setMetrics] = useState<AnyMetrics | null>(null);
  const [coachText, setCoachText] = useState<string>("");
  const [isRunning, setIsRunning] = useState(false);
  const [liveLandmarks, setLiveLandmarks] = useState<Landmarks | null>(null);
  const [repPulse, setRepPulse] = useState(0);
  const [ghostRecording, setGhostRecording] = useState<GhostRecording | null>(null);
  const [ghostEnabled, setGhostEnabled] = useState(false);
  const [ghostProgress, setGhostProgress] = useState(0);
  const [workoutElapsed, setWorkoutElapsed] = useState(0);
  const [restTimer, setRestTimer] = useState(0);
  const [restActive, setRestActive] = useState(false);
  const ghostRecorderRef = useRef<GhostRecorder | null>(null);
  const ghostPlaybackStartRef = useRef<number>(0);

  const exercise = EXERCISES[exerciseId];
  const coach = getVoiceCoach();

  const {
    currentReps,
    currentSetReps,
    setsCompleted,
    avgFormScore,
    lastFeedback,
    updateMetrics,
    coachEnabled,
    coachPersonality,
    setCoachEnabled,
    setCoachPersonality,
  } = useWorkoutStore();

  // Refs to hold the latest state for the detect loop (avoids stale closures + circular deps)
  const stateRef = useRef({
    isRunning: false,
    coachEnabled: true,
    exerciseId,
    repsPerSet,
    ghostEnabled: false,
  });

  useEffect(() => {
    stateRef.current = { isRunning, coachEnabled, exerciseId, repsPerSet, ghostEnabled };
  }, [isRunning, coachEnabled, exerciseId, repsPerSet, ghostEnabled]);

  // Initialize the pose landmarker — local-first with CDN fallback + retry
  useEffect(() => {
    let cancelled = false;

    async function tryInit(wasmPath: string, modelPath: string, delegate: "GPU" | "CPU"): Promise<PoseLandmarker | null> {
      try {
        const vision = await FilesetResolver.forVisionTasks(wasmPath);
        const landmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: modelPath,
            delegate,
          },
          runningMode: "VIDEO",
          numPoses: 1,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
        return landmarker;
      } catch (e) {
        console.warn(`Init failed (wasm=${wasmPath}, delegate=${delegate}):`, e);
        return null;
      }
    }

    async function initLandmarker() {
      // Try multiple combinations: local WASM + local model, then CDN fallbacks
      const configs: Array<{ wasm: string; model: string; delegate: "GPU" | "CPU" }> = [
        // 1. Local WASM + local model + GPU (fastest, most reliable)
        { wasm: "/models", model: "/models/pose_landmarker_lite.task", delegate: "GPU" },
        // 2. Local WASM + local model + CPU (GPU might not be available)
        { wasm: "/models", model: "/models/pose_landmarker_lite.task", delegate: "CPU" },
        // 3. CDN WASM + CDN model + GPU
        { wasm: "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm", model: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task", delegate: "GPU" },
        // 4. CDN WASM + CDN model + CPU
        { wasm: "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm", model: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task", delegate: "CPU" },
      ];

      for (const config of configs) {
        if (cancelled) return;
        const landmarker = await tryInit(config.wasm, config.model, config.delegate);
        if (landmarker) {
          if (cancelled) {
            landmarker.close();
            return;
          }
          landmarkerRef.current = landmarker;
          setModelReady(true);
          return;
        }
      }

      // All attempts failed
      if (!cancelled) {
        setError("Failed to load pose detection model. Check your connection and try again.");
      }
    }

    initLandmarker();
    return () => {
      cancelled = true;
      if (landmarkerRef.current) {
        landmarkerRef.current.close();
        landmarkerRef.current = null;
      }
    };
  }, []);

  // Create the exercise detector + ghost recorder
  useEffect(() => {
    detectorRef.current = createDetector(exerciseId);
    ghostRecorderRef.current = new GhostRecorder();
    lastRepCountRef.current = 0;
    lastSetCountRef.current = 0;
    // Clear ghost via direct ref reset (avoid setState-in-effect)
    ghostPlaybackStartRef.current = 0;
    return () => {
      detectorRef.current = null;
      ghostRecorderRef.current = null;
    };
  }, [exerciseId]);

  // Workout timer — counts up every second while running
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setWorkoutElapsed((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  // Rest timer — counts down, plays sound when done
  useEffect(() => {
    if (!restActive || restTimer <= 0) return;
    const interval = setInterval(() => {
      setRestTimer((s) => {
        if (s <= 1) {
          setRestActive(false);
          getSound().play("set_complete").catch(() => {});
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [restActive, restTimer]);

  // Sync coach settings
  useEffect(() => {
    coach.setEnabled(coachEnabled);
  }, [coachEnabled, coach]);

  useEffect(() => {
    coach.setPersonality(coachPersonality);
  }, [coachPersonality, coach]);

  // Start camera
  const startCamera = useCallback(async () => {
    if (!videoRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
        audio: false,
      });
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setCameraReady(true);
      setError(null);
    } catch (e) {
      console.error(e);
      setError(
        "Camera access denied. Please allow camera permission in your browser settings."
      );
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    setCameraReady(false);
    setIsRunning(false);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  // Draw skeleton
  const drawSkeleton = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      landmarks: Landmarks,
      w: number,
      h: number
    ) => {
      // mirror horizontally for natural interaction
      ctx.save();
      ctx.translate(w, 0);
      ctx.scale(-1, 1);

      // Connections
      ctx.strokeStyle = "#a3e635";
      ctx.lineWidth = 3;
      ctx.shadowColor = "#a3e635";
      ctx.shadowBlur = 8;
      for (const [start, end] of POSE_CONNECTIONS) {
        const p1 = landmarks[start];
        const p2 = landmarks[end];
        if (p1.visibility > 0.5 && p2.visibility > 0.5) {
          ctx.beginPath();
          ctx.moveTo(p1.x * w, p1.y * h);
          ctx.lineTo(p2.x * w, p2.y * h);
          ctx.stroke();
        }
      }

      // Joints
      ctx.shadowBlur = 4;
      ctx.fillStyle = "#22d3ee";
      for (const lm of landmarks) {
        if (lm.visibility > 0.5) {
          ctx.beginPath();
          ctx.arc(lm.x * w, lm.y * h, 5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    },
    []
  );

  // Use a ref to hold the loop function so it can self-reference without circular deps.
  // Also track whether the loop should keep running — this is the critical guard
  // that prevents the RAF from spinning forever after isRunning becomes false.
  const detectLoopRef = useRef<() => void>(() => {});
  const isLoopingRef = useRef(false);
  const lastDetectTimeRef = useRef(0);
  const lastUiUpdateRef = useRef(0);

  // Target detection FPS — MediaPipe inference at 30 FPS is plenty for form
  // coaching; running it at 60-120 FPS burns mobile CPU/GPU for no benefit.
  const DETECT_INTERVAL_MS = 1000 / 30; // ~30 FPS
  // Throttle React state updates (UI updates) to ~10 FPS to avoid re-render storms.
  const UI_UPDATE_INTERVAL_MS = 100;

  // Assign the loop function to the ref (in an effect to avoid "ref during render" error)
  useEffect(() => {
    detectLoopRef.current = () => {
      // CRITICAL: if the loop has been told to stop, do NOT reschedule.
      if (!isLoopingRef.current) return;

      const { isRunning: running, coachEnabled: enabled, exerciseId: exId, repsPerSet: rps, ghostEnabled: ghostOn } = stateRef.current;
      if (!running || !videoRef.current || !landmarkerRef.current || !detectorRef.current) {
        rafRef.current = requestAnimationFrame(() => detectLoopRef.current());
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!canvas || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(() => detectLoopRef.current());
        return;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        rafRef.current = requestAnimationFrame(() => detectLoopRef.current());
        return;
      }

      const now = performance.now();

      // FPS throttle: skip detection if last call was too recent.
      // Always reschedule to keep the loop alive.
      if (now - lastDetectTimeRef.current < DETECT_INTERVAL_MS) {
        rafRef.current = requestAnimationFrame(() => detectLoopRef.current());
        return;
      }

      const w = video.videoWidth;
      const h = video.videoHeight;
      if (canvas.width !== w) canvas.width = w;
      if (canvas.height !== h) canvas.height = h;

      let fpsValue = 0;
      if (video.currentTime !== lastVideoTimeRef.current) {
        lastVideoTimeRef.current = video.currentTime;
        lastDetectTimeRef.current = now;
        const startTime = performance.now();

        try {
          const result = landmarkerRef.current.detectForVideo(video, now);
          ctx.clearRect(0, 0, w, h);

          if (result.landmarks && result.landmarks.length > 0) {
            const landmarks = result.landmarks[0] as Landmarks;

            // Skeleton draws every frame — it's a cheap canvas operation.
            drawSkeleton(ctx, landmarks, w, h);

            // Record frame for ghost overlay (every frame is fine — it's just an array push).
            if (ghostOn && ghostRecorderRef.current) {
              ghostRecorderRef.current.recordFrame(landmarks);
            }

            const m = detectorRef.current.process(landmarks);

            // Throttle state updates that trigger React re-renders.
            // Rep changes always flow through (responsive counter); other
            // metrics coalesce to ~10Hz.
            const repChanged = m.reps !== lastRepCountRef.current;
            const shouldUpdateUi = repChanged || (now - lastUiUpdateRef.current >= UI_UPDATE_INTERVAL_MS);
            if (shouldUpdateUi) {
              lastUiUpdateRef.current = now;
              setLiveLandmarks(landmarks);
              setMetrics(m);
              updateMetrics({
                reps: m.reps,
                formScore: m.form_score ?? 0,
                feedback: null,
              });
            }

            if (enabled) {
              if (m.reps > lastRepCountRef.current) {
                lastRepCountRef.current = m.reps;
                // Haptic feedback
                if (typeof navigator !== "undefined" && navigator.vibrate) {
                  navigator.vibrate(15);
                }
                // Pulse the screen edge
                setRepPulse((p) => p + 1);
                // Commit ghost recording on rep completion
                if (ghostOn && ghostRecorderRef.current) {
                  const best = ghostRecorderRef.current.commitRep(m.form_score ?? 0);
                  if (best) {
                    setGhostRecording(best);
                    ghostPlaybackStartRef.current = now;
                  }
                }
                const newSets = rps > 0 ? Math.floor(m.reps / rps) : 0;
                if (newSets > lastSetCountRef.current) {
                  lastSetCountRef.current = newSets;
                  getSound().play("set_complete");
                  const { text } = coach.cue("set_completed");
                  setCoachText(text);
                  // Start smart rest timer
                  const intensity = calculateIntensity(m.reps, 60, m.form_score ?? 80);
                  const restSec = calculateRestTime(exId, intensity, newSets);
                  setRestTimer(restSec);
                  setRestActive(true);
                } else {
                  getSound().play("rep_complete");
                }
              }

              const issue = getFormIssue(exId, m);
              if (issue && now - lastFeedbackTimeRef.current > 5000) {
                lastFeedbackTimeRef.current = now;
                getSound().play("form_warning");
                const { text } = coach.cue("ongoing_form_check", issue);
                setCoachText(text);
              }

              if (!m.pose_detected && now - lastFeedbackTimeRef.current > 5000) {
                lastFeedbackTimeRef.current = now;
                const { text } = coach.cue("no_pose_detected");
                setCoachText(text);
              }
            }
          } else {
            if (now - lastUiUpdateRef.current >= UI_UPDATE_INTERVAL_MS) {
              lastUiUpdateRef.current = now;
              setLiveLandmarks(null);
            }
            if (enabled && now - lastFeedbackTimeRef.current > 5000) {
              lastFeedbackTimeRef.current = now;
              const { text } = coach.cue("no_pose_detected");
              setCoachText(text);
            }
          }

          const elapsed = performance.now() - startTime;
          fpsValue = elapsed > 0 ? Math.round(1000 / elapsed) : 0;
          // FPS display only needs ~1Hz update.
          setFps((prev) => Math.round(prev * 0.8 + fpsValue * 0.2));

          // Update ghost playback progress (3-second loop)
          if (ghostOn && ghostPlaybackStartRef.current > 0) {
            const playbackElapsed = (now - ghostPlaybackStartRef.current) / 3000;
            setGhostProgress(playbackElapsed % 1);
          }
        } catch (e) {
          console.error("Detection error:", e);
        }
      }

      // CRITICAL: only reschedule if we're still supposed to be looping.
      if (isLoopingRef.current) {
        rafRef.current = requestAnimationFrame(() => detectLoopRef.current());
      }
    };
  }, [coach, drawSkeleton, updateMetrics]);

  // Start/stop detection loop. The `isLoopingRef` flag is the source of truth —
  // the loop function checks it before rescheduling and before doing any work.
  useEffect(() => {
    if (isRunning) {
      isLoopingRef.current = true;
      rafRef.current = requestAnimationFrame(() => detectLoopRef.current());
    } else {
      isLoopingRef.current = false;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
    }
    return () => {
      // Cleanup on unmount OR when isRunning flips back to false.
      isLoopingRef.current = false;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
    };
  }, [isRunning]);
  // Initial coach cue
  const handleStart = useCallback(() => {
    setIsRunning(true);
    setWorkoutElapsed(0);
    setRestTimer(0);
    setRestActive(false);
    getSound().play("click");
    if (coachEnabled) {
      const { text } = coach.cue("workout_started");
      setCoachText(text);
    }
  }, [coach, coachEnabled]);

  const handleEnd = useCallback(() => {
    setIsRunning(false);
    getSound().play("set_complete");
    if (coachEnabled) {
      coach.cue("workout_completed");
    }
    stopCamera();
    onEnd();
  }, [coach, coachEnabled, stopCamera, onEnd]);

  const handleCancel = useCallback(() => {
    setIsRunning(false);
    coach.stop();
    stopCamera();
    onCancel();
  }, [coach, stopCamera, onCancel]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      coach.stop();
    };
  }, [stopCamera, coach]);

  const targetTotalReps = targetSets * repsPerSet;
  const progressPct = targetTotalReps > 0 ? (currentReps / targetTotalReps) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Rep pulse overlay — full screen flash on rep completion */}
      <AnimatePresence>
        {repPulse > 0 && (
          <motion.div
            key={repPulse}
            initial={{ opacity: 0.5 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="fixed inset-0 pointer-events-none z-50"
            style={{ boxShadow: "inset 0 0 80px 20px rgba(163, 230, 53, 0.4)" }}
          />
        )}
      </AnimatePresence>

      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Back / Cancel button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleCancel}
            className="flex items-center gap-1.5 glass glass-hover rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back</span>
          </motion.button>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-3xl"
          >
            {exercise.icon}
          </motion.div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">{exercise.name}</h2>
            <p className="text-xs text-muted-foreground">
              {targetSets} sets × {repsPerSet} reps · {exercise.difficulty}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg glass px-3 py-1.5">
            <Activity className="h-4 w-4 text-lime" />
            <span className="font-mono text-sm font-semibold">{fps} FPS</span>
          </div>
          {modelReady ? (
            <Badge className="bg-lime/20 text-lime border-lime/30 glow-lime">Model Ready</Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">Loading Model…</Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Camera + heatmap skeleton overlay */}
        {/* Fixed height on phones, 16:9 from sm up.
            16:9 of a 343px column is only ~193px tall — too short for the
            pre-camera panel and a cramped view of yourself once the camera is
            on. Note this must be a plain height, NOT `aspect-video min-h-*`:
            with an aspect-ratio set, a min-height makes the browser derive the
            WIDTH from it (400 x 16/9 = 711px), which blew the card straight
            through the side of a 375px screen. */}
        <Card className="lg:col-span-2 p-0 overflow-hidden border-border bg-black relative h-[400px] sm:h-auto sm:aspect-video">
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
            playsInline
            muted
          />
          {/* Form heatmap skeleton overlay (replaces plain canvas drawing when running) */}
          {isRunning && liveLandmarks && metrics && (
            <FormHeatmapSkeleton
              landmarks={liveLandmarks}
              width={1280}
              height={720}
              deviations={getExerciseDeviations(exerciseId, metrics)}
              mirror={true}
            />
          )}
          {/* Form Ghost overlay — replays best rep as cyan translucent skeleton */}
          {isRunning && ghostEnabled && ghostRecording && (
            <FormGhostOverlay
              ghost={ghostRecording}
              width={1280}
              height={720}
              mirror={true}
              progress={ghostProgress}
            />
          )}
          {/* Hidden canvas fallback (used when not running or no landmarks) */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full"
            style={{ visibility: isRunning && liveLandmarks ? "hidden" : "visible" }}
          />
          {!cameraReady && (
            // Scrolls rather than clipping. The Card is a fixed 16:9 box with
            // overflow-hidden, so on short/narrow panels this overlay's content
            // used to run past the bottom edge and the Enable Camera button
            // became unreachable.
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 overflow-y-auto bg-background/90 backdrop-blur">
              {error && error.includes("pose detection") ? (
                <>
                  <AlertTriangle className="h-12 w-12 text-amber" />
                  <p className="text-sm text-muted-foreground max-w-xs text-center">
                    {error}
                  </p>
                  <Button
                    onClick={() => {
                      setError(null);
                      setModelReady(false);
                      // Force re-init by reloading the component's effect
                      window.location.reload();
                    }}
                    className="bg-lime text-background hover:bg-lime/90 glow-lime"
                  >
                    <RotateCcw className="mr-2 h-4 w-4" /> Retry Loading Model
                  </Button>
                </>
              ) : (
                <>
                  {/* Rather than an empty camera icon, show the movement while
                      the user is deciding to start. This is the one moment
                      they are looking at a blank panel with nothing to learn
                      from, and the same tracked figure the marketing demo
                      uses already knows this exercise. */}
                  <ExerciseFormDemo
                    exerciseId={exerciseId}
                    compact
                    caption="Reference form — mirror this when your camera starts"
                  />
                  <p className="text-sm text-muted-foreground max-w-xs text-center">
                    {error ?? "Camera access required for live form coaching. Your video never leaves this device."}
                  </p>
                  <Button onClick={startCamera} disabled={!modelReady} className="bg-lime text-background hover:bg-lime/90 glow-lime h-11">
                    <Camera className="mr-2 h-4 w-4" /> Enable Camera
                  </Button>
                  {!modelReady && !error && (
                    <p className="text-[10px] text-muted-foreground animate-pulse">Loading pose detection model…</p>
                  )}
                </>
              )}
            </div>
          )}
          {/* Live metrics overlay */}
          {cameraReady && isRunning && (
            <div className="absolute top-3 right-3 flex flex-col gap-2">
              <div className="rounded-lg glass-strong px-3 py-2">
                <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Reps</div>
                <div className="font-mono text-2xl font-bold text-lime">
                  <AnimatedNumber value={currentReps} duration={300} />
                </div>
              </div>
              <div className="rounded-lg glass-strong px-3 py-2">
                <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Form</div>
                <div className={`font-mono text-2xl font-bold ${
                  avgFormScore >= 85 ? "text-lime" :
                  avgFormScore >= 70 ? "text-amber" : "text-red-400"
                }`}>
                  <AnimatedNumber value={avgFormScore} duration={400} />
                </div>
              </div>
            </div>
          )}
          {/* Heatmap legend */}
          {cameraReady && isRunning && (
            <div className="absolute top-3 left-3 glass rounded-lg px-2 py-1.5 flex items-center gap-2 text-[9px] font-mono">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-lime" />GOOD</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber" />WARN</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" />FIX</span>
            </div>
          )}
          {/* Coach feedback overlay */}
          {cameraReady && isRunning && coachText && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute bottom-3 left-3 right-3 rounded-lg glass-strong border border-lime/40 px-4 py-3"
            >
              <div className="flex items-center gap-2">
                <Volume2 className="h-4 w-4 text-lime shrink-0 animate-pulse" />
                <p className="text-sm text-foreground">{coachText}</p>
              </div>
            </motion.div>
          )}
        </Card>

        {/* Live metrics sidebar */}
        <div className="space-y-3">
          {/* Workout + Rest Timer */}
          {isRunning && (
            <TiltCard maxTilt={3} glow={restActive ? "amber" : "cyan"} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Workout Time</div>
                  <div className="font-mono text-2xl font-bold text-cyan">
                    {Math.floor(workoutElapsed / 60)}:{String(workoutElapsed % 60).padStart(2, "0")}
                  </div>
                </div>
                {restActive && restTimer > 0 ? (
                  <div className="text-right">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-amber">Rest Timer</div>
                    <div className="font-mono text-2xl font-bold text-amber animate-pulse">
                      {Math.floor(restTimer / 60)}:{String(restTimer % 60).padStart(2, "0")}
                    </div>
                    <button
                      onClick={() => { setRestActive(false); setRestTimer(0); }}
                      className="text-[9px] text-muted-foreground hover:text-foreground mt-0.5"
                    >
                      Skip rest
                    </button>
                  </div>
                ) : (
                  <div className="text-right">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Calories</div>
                    <div className="font-mono text-2xl font-bold text-lime">
                      <AnimatedNumber value={Math.round(workoutElapsed * 0.12)} duration={500} />
                    </div>
                  </div>
                )}
              </div>
            </TiltCard>
          )}

          {/* 3D Rep Counter */}
          {isRunning && (
            <TiltCard maxTilt={4} glow="lime" className="p-4 h-32 relative overflow-hidden">
              <div className="absolute top-2 left-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground z-10">
                3D Rep Counter
              </div>
              <Suspense fallback={<div className="h-full flex items-center justify-center text-xs text-muted-foreground">Loading 3D…</div>}>
                <RepCounter3D reps={currentReps} formScore={avgFormScore} className="absolute inset-0" />
              </Suspense>
            </TiltCard>
          )}

          {/* Progress */}
          <TiltCard maxTilt={3} glow="cyan" className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Progress</span>
              <Target className="h-4 w-4 text-lime" />
            </div>
            <Progress value={progressPct} className="h-2 mb-2" />
            <div className="flex justify-between text-xs">
              <span className="font-mono">{currentReps} / {targetTotalReps} reps</span>
              <span className="font-mono text-muted-foreground">{Math.round(progressPct)}%</span>
            </div>
          </TiltCard>

          {/* Sets */}
          <TiltCard maxTilt={3} glow="lime" className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Sets</div>
                <div className="font-mono text-2xl font-bold">
                  <AnimatedNumber value={setsCompleted} duration={400} /><span className="text-muted-foreground text-base"> / {targetSets}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Current Set</div>
                <div className="font-mono text-2xl font-bold">
                  <AnimatedNumber value={currentSetReps} duration={300} /><span className="text-muted-foreground text-base"> / {repsPerSet}</span>
                </div>
              </div>
            </div>
          </TiltCard>

          {/* Exercise-specific metrics */}
          {metrics && (
            <TiltCard maxTilt={3} glow="cyan" className="p-4">
              <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3">
                {exercise.shortName} Metrics
              </div>
              <ExerciseMetrics exerciseId={exerciseId} metrics={metrics} />
            </TiltCard>
          )}

          {/* Coach controls */}
          <TiltCard maxTilt={3} glow={coachEnabled ? "lime" : "none"} className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="coach-toggle" className="text-sm flex items-center gap-2">
                {coachEnabled ? <Volume2 className="h-4 w-4 text-lime" /> : <VolumeX className="h-4 w-4" />}
                Voice Coach
              </Label>
              <Switch id="coach-toggle" checked={coachEnabled} onCheckedChange={setCoachEnabled} />
            </div>
            {coachEnabled && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Personality</Label>
                <Select value={coachPersonality} onValueChange={(v) => setCoachPersonality(v as any)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="drill">Drill Sergeant</SelectItem>
                    <SelectItem value="zen">Zen Coach</SelectItem>
                    <SelectItem value="technical">Technical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </TiltCard>

          {/* Form Ghost toggle */}
          <TiltCard maxTilt={3} glow={ghostEnabled ? "cyan" : "none"} className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="ghost-toggle" className="text-sm flex items-center gap-2">
                <Ghost className="h-4 w-4 text-cyan" />
                Form Ghost
              </Label>
              <Switch id="ghost-toggle" checked={ghostEnabled} onCheckedChange={setGhostEnabled} />
            </div>
            {ghostEnabled && (
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                {ghostRecording
                  ? `Ghost recorded · score ${ghostRecording.formScore}. Match the cyan skeleton.`
                  : "Complete a rep to record your best form as a ghost."}
              </p>
            )}
          </TiltCard>

          {/* Start / End buttons */}
          <div className="flex gap-2">
            {!isRunning ? (
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="flex-1"
              >
                <Button
                  onClick={handleStart}
                  disabled={!cameraReady}
                  className="w-full bg-lime text-background hover:bg-lime/90 glow-lime"
                >
                  <Play className="mr-2 h-4 w-4" /> Start
                </Button>
              </motion.div>
            ) : (
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="flex-1"
              >
                <Button
                  onClick={handleEnd}
                  className="w-full bg-red-500 text-white hover:bg-red-600 font-semibold shadow-lg shadow-red-500/30"
                  aria-label="End workout and save session"
                >
                  <Square className="mr-2 h-4 w-4" /> End Workout
                </Button>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Exercise Guide — shown before workout starts. No form demo here: the
          camera panel above already shows the movement, and a second copy
          pushed the written guide off-screen. */}
      {!isRunning && (
        <ExerciseGuideView exerciseId={exerciseId} showFormDemo={false} />
      )}

      {/* Form cues */}
      <TiltCard maxTilt={2} glow="lime" className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="h-4 w-4 text-lime" />
          <span className="text-sm font-semibold">Form Cues</span>
        </div>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {exercise.formCues.map((cue, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="text-xs text-muted-foreground flex items-start gap-2"
            >
              <span className="text-lime font-mono mt-0.5">{String(i + 1).padStart(2, "0")}</span>
              <span>{cue}</span>
            </motion.li>
          ))}
        </ul>
      </TiltCard>
    </div>
  );
}

const ExerciseMetrics = memo(function ExerciseMetrics({
  exerciseId,
  metrics,
}: {
  exerciseId: ExerciseId;
  metrics: AnyMetrics;
}) {
  const renderMetric = (label: string, value: string | number, color?: string) => (
    <div className="flex justify-between items-center">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`font-mono text-sm font-semibold ${color ?? ""}`}>{value}</span>
    </div>
  );

  if (exerciseId === "squat") {
    const m = metrics as any;
    return (
      <div className="space-y-2">
        {renderMetric("Knee Angle", `${m.knee_angle}°`, "text-lime")}
        {renderMetric("Back Angle", `${m.back_angle}°`, "text-cyan")}
        {renderMetric("Depth", m.depth_status, m.depth_status === "GOOD DEPTH" ? "text-lime" : "text-yellow-400")}
        {renderMetric("Form Score", `${m.form_score}`, m.form_score >= 85 ? "text-lime" : "text-yellow-400")}
      </div>
    );
  }
  if (exerciseId === "pushup") {
    const m = metrics as any;
    return (
      <div className="space-y-2">
        {renderMetric("Elbow Angle", `${m.elbow_angle}°`, "text-lime")}
        {renderMetric("Body Line", m.body_alignment, m.body_alignment === "Straight" ? "text-lime" : "text-yellow-400")}
        {renderMetric("Hip Position", m.hip_status, m.hip_status === "LEVEL" ? "text-lime" : "text-yellow-400")}
        {renderMetric("Form Score", `${m.form_score}`, m.form_score >= 85 ? "text-lime" : "text-yellow-400")}
      </div>
    );
  }
  if (exerciseId === "biceps_curl") {
    const m = metrics as any;
    return (
      <div className="space-y-2">
        {renderMetric("Elbow Angle", `${m.elbow_angle}°`, "text-lime")}
        {renderMetric("Shoulder", m.shoulder_status, m.shoulder_status === "STABLE" ? "text-lime" : "text-yellow-400")}
        {renderMetric("Swing", m.swing_status, m.swing_status === "STILL" ? "text-lime" : "text-yellow-400")}
        {renderMetric("Form Score", `${m.form_score}`, m.form_score >= 85 ? "text-lime" : "text-yellow-400")}
      </div>
    );
  }
  if (exerciseId === "shoulder_press") {
    const m = metrics as any;
    return (
      <div className="space-y-2">
        {renderMetric("Elbow Angle", `${m.elbow_angle}°`, "text-lime")}
        {renderMetric("Extension", m.extension_status, m.extension_status === "FULL EXTENSION" ? "text-lime" : "text-yellow-400")}
        {renderMetric("Back Arch", m.back_arch_status, m.back_arch_status === "Neutral" ? "text-lime" : "text-yellow-400")}
        {renderMetric("Form Score", `${m.form_score}`, m.form_score >= 85 ? "text-lime" : "text-yellow-400")}
      </div>
    );
  }
  if (exerciseId === "lunges") {
    const m = metrics as any;
    return (
      <div className="space-y-2">
        {renderMetric("Front Knee", `${m.front_knee_angle}°`, "text-lime")}
        {renderMetric("Torso Angle", `${m.torso_angle}°`, "text-cyan")}
        {renderMetric("Balance", m.balance_status, m.balance_status === "BALANCED" ? "text-lime" : "text-yellow-400")}
        {renderMetric("Form Score", `${m.form_score}`, m.form_score >= 85 ? "text-lime" : "text-yellow-400")}
      </div>
    );
  }
  return null;
});
