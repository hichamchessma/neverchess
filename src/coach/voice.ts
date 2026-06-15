import type { Persona } from "./types";

// Lightweight wrapper around the browser's built-in speech synthesis.
// Free, offline, zero API cost — perfect for the MVP coach voice.
class CoachVoice {
  private enabled = true;
  private frVoice: SpeechSynthesisVoice | null = null;

  constructor() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const load = () => {
        const voices = window.speechSynthesis.getVoices();
        this.frVoice =
          voices.find((v) => /fr-FR/i.test(v.lang) && /google|natural|enhanced/i.test(v.name)) ??
          voices.find((v) => /^fr/i.test(v.lang)) ??
          null;
      };
      load();
      window.speechSynthesis.onvoiceschanged = load;
    }
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    if (!on) this.stop();
  }

  isEnabled() {
    return this.enabled;
  }

  speak(text: string, persona: Persona) {
    if (!this.enabled) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = persona.voice.lang;
    u.rate = persona.voice.rate;
    u.pitch = persona.voice.pitch;
    if (this.frVoice) u.voice = this.frVoice;
    window.speechSynthesis.speak(u);
  }

  stop() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }
}

export const coachVoice = new CoachVoice();
