/**
 * Voice Coaching Pipeline
 * Replaces the original Python gTTS + Groq LLM pipeline.
 * Uses Web Speech API for zero-latency, offline-capable voice output.
 * Falls back to template cues if LLM is unavailable.
 */

export type CoachEvent =
  | "workout_started"
  | "set_completed"
  | "workout_completed"
  | "no_pose_detected"
  | "ongoing_form_check";

export type CoachPersonality = "drill" | "zen" | "technical";

const PERSONALITY_TEMPLATES: Record<
  CoachPersonality,
  Record<CoachEvent, string[]>
> = {
  drill: {
    workout_started: [
      "Let's go. Lock in and execute.",
      "Time to work. Every rep counts.",
      "Eyes up. Let's get after it.",
    ],
    set_completed: [
      "Set done. Reset and reload.",
      "Good work. Stay sharp for the next one.",
      "That's a wrap on that set. Keep pushing.",
    ],
    workout_completed: [
      "Killer session. You earned that.",
      "That's how you finish strong. Well done.",
      "Workout complete. Walk tall.",
    ],
    no_pose_detected: [
      "Step back so I can see your full body.",
      "I lost you. Reposition in frame.",
    ],
    ongoing_form_check: [
      "Tighten it up. Focus.",
      "Clean it up. Quality over quantity.",
      "Lock in your form. Don't get sloppy.",
    ],
  },
  zen: {
    workout_started: [
      "Take a breath. Let's begin with intention.",
      "Center yourself. Move with purpose.",
      "Warm presence. Let's flow.",
    ],
    set_completed: [
      "Beautiful set. Rest and breathe.",
      "Nice work. Honor the recovery.",
      "That set is done. Settle in for the next.",
    ],
    workout_completed: [
      "Lovely session. Be proud of showing up.",
      "Workout complete. Breathe and stretch.",
      "That's a wrap. Treat your body well today.",
    ],
    no_pose_detected: [
      "I can't see you — step back into frame gently.",
      "Reposition so I can guide you.",
    ],
    ongoing_form_check: [
      "Soften your effort, refine your shape.",
      "Move with control. Quality is the practice.",
      "Slow it down. Find your alignment.",
    ],
  },
  technical: {
    workout_started: [
      "Session initiated. Beginning rep tracking now.",
      "Pose model loaded. Let's begin your set.",
      "Tracking active. Execute your first rep.",
    ],
    set_completed: [
      "Set complete. Logging metrics and starting rest timer.",
      "Set logged. Begin recovery period.",
      "Rep count confirmed. Rest window starting.",
    ],
    workout_completed: [
      "Session complete. All reps logged and metrics saved.",
      "Workout finished. Form data exported to your dashboard.",
      "All sets complete. Summary available in your history.",
    ],
    no_pose_detected: [
      "No pose detected. Please step back into the camera frame.",
      "Pose tracking lost. Reposition within camera view.",
    ],
    ongoing_form_check: [
      "Form deviation detected. Adjusting tracking.",
      "Angle thresholds exceeded. Correct your position.",
      "Form score dropping. Refocus on technique.",
    ],
  },
};

export class VoiceCoach {
  private synth: SpeechSynthesis | null = null;
  private lastSpokenAt = 0;
  private voices: SpeechSynthesisVoice[] = [];
  private selectedVoice: SpeechSynthesisVoice | null = null;
  private personality: CoachPersonality = "drill";
  private enabled = true;
  private minGapMs = 4000;

  constructor() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      this.synth = window.speechSynthesis;
      // Voices load asynchronously in some browsers
      this.loadVoices();
      this.synth.onvoiceschanged = () => this.loadVoices();
    }
  }

  private loadVoices() {
    if (!this.synth) return;
    this.voices = this.synth.getVoices();
    // Prefer a natural English voice
    this.selectedVoice =
      this.voices.find((v) => v.name.includes("Google US English")) ||
      this.voices.find((v) => v.lang === "en-US" && v.localService) ||
      this.voices.find((v) => v.lang.startsWith("en")) ||
      this.voices[0] ||
      null;
  }

  setPersonality(p: CoachPersonality) {
    this.personality = p;
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    if (!on && this.synth) {
      this.synth.cancel();
    }
  }

  setMinGap(ms: number) {
    this.minGapMs = ms;
  }

  /** Speak text via Web Speech API. Returns true if spoken. */
  speak(text: string, force = false): boolean {
    if (!this.synth || !this.enabled) return false;
    const now = Date.now();
    if (!force && now - this.lastSpokenAt < this.minGapMs) return false;

    this.synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    if (this.selectedVoice) utterance.voice = this.selectedVoice;
    this.synth.speak(utterance);
    this.lastSpokenAt = now;
    return true;
  }

  /** Generate and speak a coaching cue for an event. */
  cue(event: CoachEvent, formIssue?: string | null): { spoken: boolean; text: string } {
    let text: string;
    if (event === "ongoing_form_check" && formIssue) {
      // Use the form issue directly
      text = formIssue;
    } else {
      const templates = PERSONALITY_TEMPLATES[this.personality][event];
      text = templates[Math.floor(Math.random() * templates.length)];
    }

    const spoken = this.speak(text, event === "workout_started" || event === "workout_completed");
    return { spoken, text };
  }

  stop() {
    if (this.synth) this.synth.cancel();
  }
}

// Singleton accessor
let _coach: VoiceCoach | null = null;
export function getVoiceCoach(): VoiceCoach {
  if (!_coach) _coach = new VoiceCoach();
  return _coach;
}
