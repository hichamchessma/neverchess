import type { CoachEvent, CoachLine, MoveQuality, Persona } from "./types";

// Picks persona lines for coach events while avoiding immediate repetition.
export class CoachBrain {
  private recent: string[] = [];
  private maxRecent = 6;

  constructor(private persona: Persona) {}

  setPersona(p: Persona) {
    this.persona = p;
    this.recent = [];
  }

  /** Returns a line for the event, or null if the persona has nothing to say. */
  speak(event: CoachEvent): CoachLine | null {
    const pool = this.persona.lines[event];
    if (!pool || pool.length === 0) return null;

    const fresh = pool.filter((l) => !this.recent.includes(l.text));
    const choices = fresh.length > 0 ? fresh : pool;
    const line = choices[Math.floor(Math.random() * choices.length)];

    this.recent.push(line.text);
    if (this.recent.length > this.maxRecent) this.recent.shift();
    return line;
  }
}

// ---- Move classification (player's point of view) ----

const MATE_VALUE = 100000;

// Clamp huge mate scores so a single forced mate doesn't dwarf every delta.
function clampForDelta(n: number): number {
  if (n > 2000) return 2000;
  if (n < -2000) return -2000;
  return n;
}

/**
 * Classify a move by how much the evaluation changed in the player's favour.
 * `before` / `after` are WHITE-relative numeric scores (see scoreToNumber).
 */
export function classifyMove(
  before: number,
  after: number,
  playerIsWhite: boolean,
  opts: { wasOnlyMove?: boolean } = {}
): MoveQuality {
  const b = clampForDelta(before);
  const a = clampForDelta(after);
  // delta from the player's perspective: positive = improved their eval
  let delta = a - b;
  if (!playerIsWhite) delta = -delta;

  // A real swing into a winning/mating attack from a non-winning spot = brilliant.
  const playerAfter = playerIsWhite ? after : -after;
  const becameMating = playerAfter > MATE_VALUE - 1000 && Math.abs(before) < 1500;

  if (becameMating && delta > 250) return "brilliant";
  if (delta >= 260 && !opts.wasOnlyMove) return "brilliant";
  if (delta >= 130) return "great";
  if (delta <= -300) return "blunder";
  if (delta <= -150) return "mistake";
  if (delta <= -70) return "inaccuracy";
  return delta >= 20 ? "good" : "book";
}

// Map a quality directly to the matching coach event, when one exists.
export function qualityToEvent(q: MoveQuality): CoachEvent | null {
  switch (q) {
    case "brilliant":
      return "brilliant";
    case "great":
      return "great";
    case "inaccuracy":
      return "inaccuracy";
    case "mistake":
      return "mistake";
    case "blunder":
      return "blunder";
    default:
      return null;
  }
}

export const QUALITY_META: Record<
  MoveQuality,
  { label: string; symbol: string; color: string }
> = {
  brilliant: { label: "Brillant", symbol: "!!", color: "#22d3ee" },
  great: { label: "Excellent", symbol: "!", color: "#34d399" },
  good: { label: "Bon", symbol: "", color: "#a7a7c5" },
  book: { label: "Théorie", symbol: "", color: "#6c6c8c" },
  inaccuracy: { label: "Imprécision", symbol: "?!", color: "#fbbf24" },
  mistake: { label: "Erreur", symbol: "?", color: "#fb923c" },
  blunder: { label: "Gaffe", symbol: "??", color: "#fb7185" },
};
