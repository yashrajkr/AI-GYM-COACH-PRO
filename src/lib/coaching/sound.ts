"use client";

import * as Tone from "tone";

/**
 * Sound design layer — synthesized at runtime via Tone.js.
 * No audio files. Respects master volume + mute toggle.
 */

type SoundType =
  | "rep_complete"
  | "set_complete"
  | "pr_hit"
  | "form_warning"
  | "badge_unlock"
  | "click"
  | "page_transition";

class SoundManager {
  private synth: Tone.PolySynth | null = null;
  private noiseSynth: Tone.NoiseSynth | null = null;
  private membrane: Tone.MembraneSynth | null = null;
  private initialized = false;
  private muted = false;
  private volume = 0.5;

  async init() {
    if (this.initialized) return;
    await Tone.start();

    this.synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "sine" },
      envelope: { attack: 0.005, decay: 0.1, sustain: 0.1, release: 0.2 },
    }).toDestination();
    this.synth.volume.value = Tone.gainToDb(this.volume);

    this.noiseSynth = new Tone.NoiseSynth({
      noise: { type: "white" },
      envelope: { attack: 0.001, decay: 0.1, sustain: 0 },
    }).toDestination();
    this.noiseSynth.volume.value = Tone.gainToDb(this.volume * 0.5);

    this.membrane = new Tone.MembraneSynth({
      pitchDecay: 0.05,
      octaves: 2,
      envelope: { attack: 0.001, decay: 0.2, sustain: 0 },
    }).toDestination();
    this.membrane.volume.value = Tone.gainToDb(this.volume * 0.6);

    this.initialized = true;
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (muted && this.initialized) {
      Tone.getTransport().pause();
    }
  }

  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.initialized) {
      const db = Tone.gainToDb(this.volume);
      this.synth!.volume.value = db;
      this.noiseSynth!.volume.value = Tone.gainToDb(this.volume * 0.5);
      this.membrane!.volume.value = Tone.gainToDb(this.volume * 0.6);
    }
  }

  async play(type: SoundType) {
    if (this.muted) return;
    if (!this.initialized) await this.init();
    if (!this.synth) return;

    const now = Tone.now();

    switch (type) {
      case "rep_complete":
        // subtle tick: 800Hz sine, 50ms
        this.synth.triggerAttackRelease("C6", "32n", now, 0.4);
        break;
      case "set_complete":
        // ascending two-tone: C5 → E5
        this.synth.triggerAttackRelease("C5", "16n", now, 0.5);
        this.synth.triggerAttackRelease("E5", "16n", now + 0.12, 0.5);
        break;
      case "pr_hit":
        // triumphant C major chord: C4 E4 G4 C5
        this.synth.triggerAttackRelease(["C4", "E4", "G4", "C5"], "2n", now, 0.5);
        break;
      case "form_warning":
        // soft whoosh: filtered noise, 100ms
        this.noiseSynth?.triggerAttackRelease("16n", now);
        break;
      case "badge_unlock": {
        // sparkle arpeggio: C5 E5 G5 B5 E6
        const notes = ["C5", "E5", "G5", "B5", "E6"];
        notes.forEach((n, i) => {
          this.synth!.triggerAttackRelease(n, "16n", now + i * 0.06, 0.4);
        });
        break;
      }
      case "click":
        this.synth.triggerAttackRelease("A5", "64n", now, 0.2);
        break;
      case "page_transition":
        this.synth.triggerAttackRelease("E5", "32n", now, 0.25);
        this.synth.triggerAttackRelease("A5", "32n", now + 0.05, 0.2);
        break;
    }
  }
}

let _sound: SoundManager | null = null;
export function getSound(): SoundManager {
  if (!_sound) _sound = new SoundManager();
  return _sound;
}
