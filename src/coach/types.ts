export type Mood = "hype" | "calm" | "warn" | "tease" | "proud" | "tense" | "neutral";

// Quality of a move from the player's point of view.
export type MoveQuality =
  | "brilliant"
  | "great"
  | "good"
  | "book"
  | "inaccuracy"
  | "mistake"
  | "blunder";

// Things the coach can react to. The brain maps these to a spoken line + mood.
export type CoachEvent =
  | "gameStart"
  | "brilliant"
  | "great"
  | "inaccuracy"
  | "mistake"
  | "blunder"
  | "impulse" // played fast AND it was bad
  | "spiral" // two bad moves in a row
  | "comeback" // swung the eval back in their favour
  | "givingCheck"
  | "underThreat" // engine just got a strong position / threat
  | "winning"
  | "losing"
  | "winMate"
  | "loseMate"
  | "draw";

export type CoachLine = {
  text: string;
  mood: Mood;
};

export type PersonaId = "sergent" | "zen" | "maestro";

export type Persona = {
  id: PersonaId;
  name: string;
  tagline: string;
  emoji: string;
  accent: string; // css color
  // voice tuning for Web Speech API
  voice: { rate: number; pitch: number; lang: string };
  lines: Partial<Record<CoachEvent, CoachLine[]>>;
};
