import type { MoveRecord } from "../game/useGambitGame";
import type { GameResult } from "../game/useGambitGame";

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export type StoryMoment = {
  ply: number;
  san: string;
  fenBefore: string;
  fenAfter: string;
  quality: string;
  swing: number; // centipawns gained in the player's favour
  headline: string;
  tag: string; // short label, e.g. "COUP BRILLANT"
  highlight?: { from: string; to: string };
};

function clamp(n: number) {
  return Math.max(-2000, Math.min(2000, n));
}

/**
 * Pick the single most share-worthy moment of the game from the player's
 * perspective: the move that swung the evaluation hardest in their favour,
 * biased towards brilliant / great moves.
 */
export function detectMoment(
  moves: MoveRecord[],
  playerIsWhite: boolean,
  result: GameResult | null
): StoryMoment | null {
  const playerMoves = moves.filter((m) => m.isPlayer);
  if (playerMoves.length === 0) return null;

  let best: { rec: MoveRecord; idx: number; swing: number } | null = null;

  for (let i = 0; i < moves.length; i++) {
    const rec = moves[i];
    if (!rec.isPlayer) continue;
    const before = i > 0 ? moves[i - 1].evalWhite : 0;
    const after = rec.evalWhite;
    let swing = clamp(after) - clamp(before);
    if (!playerIsWhite) swing = -swing;

    // weight brilliant/great so a flashy move beats a quiet grind
    const bonus =
      rec.quality === "brilliant" ? 400 : rec.quality === "great" ? 180 : 0;
    const weighted = swing + bonus;

    if (!best || weighted > best.swing) {
      best = { rec, idx: i, swing: weighted };
    }
  }

  if (!best) return null;
  const fenBefore = best.idx > 0 ? moves[best.idx - 1].fenAfter : START_FEN;
  const rawSwing =
    (playerIsWhite ? 1 : -1) *
    (clamp(best.rec.evalWhite) - clamp(best.idx > 0 ? moves[best.idx - 1].evalWhite : 0));

  return {
    ply: best.rec.ply,
    san: best.rec.san,
    fenBefore,
    fenAfter: best.rec.fenAfter,
    quality: best.rec.quality ?? "good",
    swing: Math.round(rawSwing),
    highlight: best.rec.uci.length >= 4
      ? { from: best.rec.uci.slice(0, 2), to: best.rec.uci.slice(2, 4) }
      : undefined,
    ...buildHeadline(best.rec, rawSwing, result),
  };
}

function buildHeadline(
  rec: MoveRecord,
  swing: number,
  result: GameResult | null
): { headline: string; tag: string } {
  const q = rec.quality;
  if (q === "brilliant") {
    return { headline: `${rec.san} — le coup que personne n'a vu venir.`, tag: "COUP BRILLANT" };
  }
  if (q === "great") {
    return { headline: `${rec.san} — la frappe qui a tout changé.`, tag: "EXCELLENT COUP" };
  }
  if (result?.outcome === "win") {
    return { headline: `${rec.san} — et la victoire s'est dessinée.`, tag: "TOURNANT" };
  }
  if (swing > 120) {
    return { headline: `${rec.san} — le moment où j'ai repris la main.`, tag: "RETOURNEMENT" };
  }
  return { headline: `${rec.san} — mon meilleur instant de la partie.`, tag: "MOMENT FORT" };
}
