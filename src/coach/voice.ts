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
        const fr = voices.filter((v) => /^fr/i.test(v.lang));
        // Prefer high-quality neural voices, then Microsoft, then anything FR.
        this.frVoice =
          fr.find((v) => /google|natural|neural|enhanced|siri/i.test(v.name)) ??
          fr.find((v) => /microsoft/i.test(v.name) && !/desktop/i.test(v.name)) ??
          fr.find((v) => /fr-FR/i.test(v.lang)) ??
          fr[0] ??
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
    // clamp to a natural range — extreme pitch is what makes TTS sound "buzzy"
    u.rate = Math.max(0.85, Math.min(1.15, persona.voice.rate));
    u.pitch = Math.max(0.9, Math.min(1.2, persona.voice.pitch));
    u.volume = 1;
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
