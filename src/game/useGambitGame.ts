import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import { engine, scoreToNumber, type EngineScore } from "../engine/stockfish";
import { CoachBrain, classifyMove, qualityToEvent } from "../coach/coachBrain";
import type { CoachEvent, Mood, MoveQuality, Persona } from "../coach/types";
import { coachVoice } from "../coach/voice";

export type Difficulty = "debutant" | "intermediaire" | "avance" | "expert";

export const DIFFICULTY_CONFIG: Record<
  Difficulty,
  { label: string; skill: number; elo: string }
> = {
  debutant: { label: "Débutant", skill: 1, elo: "~800" },
  intermediaire: { label: "Intermédiaire", skill: 6, elo: "~1400" },
  avance: { label: "Avancé", skill: 12, elo: "~1800" },
  expert: { label: "Expert", skill: 20, elo: "2000+" },
};

// Cadence: controls how fast the engine answers + how deep we analyse, kept
// separate from strength (skill level). Bullet feels instant.
export type Tempo = "bullet" | "blitz" | "rapide";

export const TEMPO_CONFIG: Record<
  Tempo,
  { label: string; emoji: string; movetime: number; depth: number; desc: string }
> = {
  bullet: { label: "Bullet", emoji: "⚡", movetime: 10, depth: 6, desc: "Réponse instantanée" },
  blitz: { label: "Blitz", emoji: "🔥", movetime: 250, depth: 8, desc: "Rythme rapide" },
  rapide: { label: "Rapide", emoji: "♟️", movetime: 700, depth: 11, desc: "Le moteur réfléchit" },
};

export type MoveRecord = {
  ply: number;
  san: string;
  uci: string;
  color: "w" | "b";
  isPlayer: boolean;
  fenAfter: string;
  evalWhite: number; // numeric white-relative score after the move
  quality?: MoveQuality; // player moves only
  thinkMs?: number;
};

export type CoachMessage = { id: number; text: string; mood: Mood; event: CoachEvent };

export type GameResult = {
  outcome: "win" | "loss" | "draw";
  reason: string;
};

export type GameStatus = "idle" | "playing" | "thinking" | "over";

type StartOptions = {
  persona: Persona;
  difficulty: Difficulty;
  tempo?: Tempo;
  playerColor?: "w" | "b";
};

export function useGambitGame() {
  const chessRef = useRef(new Chess());
  const brainRef = useRef<CoachBrain | null>(null);
  const lastEvalRef = useRef(0); // white-relative score before side-to-move plays
  const turnStartRef = useRef<number>(0);
  const recentThinkRef = useRef<number[]>([]);
  const consecutiveBadRef = useRef(0);
  const ambientCooldownRef = useRef(0);
  const personaRef = useRef<Persona | null>(null);
  const difficultyRef = useRef<Difficulty>("intermediaire");
  const tempoRef = useRef<Tempo>("blitz");
  const playerColorRef = useRef<"w" | "b">("w");
  const tensionRef = useRef(0);
  const msgIdRef = useRef(0);

  const [fen, setFen] = useState(chessRef.current.fen());
  const [moves, setMoves] = useState<MoveRecord[]>([]);
  const [status, setStatus] = useState<GameStatus>("idle");
  const [result, setResult] = useState<GameResult | null>(null);
  const [evalWhite, setEvalWhite] = useState(0);
  const [coach, setCoach] = useState<CoachMessage | null>(null);
  const [engineReady, setEngineReady] = useState(false);
  const [inDanger, setInDanger] = useState(false);

  // A check raises the tension; it relaxes after a couple of safe plies.
  const updateTension = useCallback((chess: Chess) => {
    if (chess.inCheck()) {
      tensionRef.current = 3;
      setInDanger(true);
    } else if (tensionRef.current > 0) {
      tensionRef.current -= 1;
      if (tensionRef.current <= 0) setInDanger(false);
    }
  }, []);

  // Patch the most recent move record (quality / eval) once analysis lands.
  const patchLastMove = useCallback(
    (isPlayer: boolean, fields: Partial<MoveRecord>) => {
      setMoves((prev) => {
        const copy = [...prev];
        for (let i = copy.length - 1; i >= 0; i--) {
          if (copy[i].isPlayer === isPlayer) {
            copy[i] = { ...copy[i], ...fields };
            break;
          }
        }
        return copy;
      });
    },
    []
  );

  useEffect(() => {
    engine.init().then(() => setEngineReady(true)).catch((e) => console.error(e));
  }, []);

  const emitCoach = useCallback((event: CoachEvent) => {
    const brain = brainRef.current;
    const persona = personaRef.current;
    if (!brain || !persona) return;
    const line = brain.speak(event);
    if (!line) return;
    const msg: CoachMessage = { id: ++msgIdRef.current, text: line.text, mood: line.mood, event };
    setCoach(msg);
    coachVoice.speak(line.text, persona);
  }, []);

  const finalize = useCallback(() => {
    const chess = chessRef.current;
    const playerColor = playerColorRef.current;
    let res: GameResult;
    let event: CoachEvent;
    if (chess.isCheckmate()) {
      // side to move is checkmated -> the other side won
      const winner = chess.turn() === "w" ? "b" : "w";
      if (winner === playerColor) {
        res = { outcome: "win", reason: "Échec et mat" };
        event = "winMate";
      } else {
        res = { outcome: "loss", reason: "Échec et mat" };
        event = "loseMate";
      }
    } else {
      let reason = "Partie nulle";
      if (chess.isStalemate()) reason = "Pat";
      else if (chess.isThreefoldRepetition()) reason = "Triple répétition";
      else if (chess.isInsufficientMaterial()) reason = "Matériel insuffisant";
      res = { outcome: "draw", reason };
      event = "draw";
    }
    setResult(res);
    setStatus("over");
    emitCoach(event);
  }, [emitCoach]);

  // Run the engine's reply. The move is played and control is handed back
  // immediately; the (slower) eval analysis runs off the critical path so the
  // game stays fluid.
  const engineTurn = useCallback(async () => {
    const chess = chessRef.current;
    if (chess.isGameOver()) {
      finalize();
      return;
    }
    setStatus("thinking");
    const tempo = TEMPO_CONFIG[tempoRef.current];
    let best = await engine.getBestMove(chess.fen(), { movetime: tempo.movetime });
    if (!best) {
      const legal = chess.moves({ verbose: true });
      if (legal.length === 0) {
        finalize();
        return;
      }
      const pick = legal[Math.floor(Math.random() * legal.length)];
      best = { from: pick.from, to: pick.to, promotion: pick.promotion };
    }
    const moved = chess.move({ from: best.from, to: best.to, promotion: best.promotion ?? "q" });
    const fenAfter = chess.fen();

    setFen(fenAfter);
    setMoves((prev) => [
      ...prev,
      {
        ply: prev.length + 1,
        san: moved.san,
        uci: best.from + best.to + (best.promotion ?? ""),
        color: moved.color,
        isPlayer: false,
        fenAfter,
        evalWhite: lastEvalRef.current,
      },
    ]);
    updateTension(chess);

    // End of game: show it NOW; the story is built from data we already have.
    if (chess.isGameOver()) {
      finalize();
      return;
    }

    // Hand control back to the player right away.
    turnStartRef.current = performance.now();
    setStatus("playing");

    // Background: evaluate the new position for the eval bar + ambient coach.
    void (async () => {
      try {
        const score = await engine.evaluate(fenAfter, tempo.depth);
        const evalNum = scoreToNumber(score);
        lastEvalRef.current = evalNum;
        setEvalWhite(evalNum);
        patchLastMove(false, { evalWhite: evalNum });

        const playerColor = playerColorRef.current;
        const playerAdv = playerColor === "w" ? evalNum : -evalNum;
        ambientCooldownRef.current -= 1;
        if (chess.inCheck()) {
          emitCoach("underThreat");
        } else if (ambientCooldownRef.current <= 0 && Math.random() < 0.5) {
          if (playerAdv > 200) {
            emitCoach("winning");
            ambientCooldownRef.current = 5;
          } else if (playerAdv < -200) {
            emitCoach("losing");
            ambientCooldownRef.current = 5;
          }
        }
      } catch (err) {
        console.error("[gambit] engine analysis error", err);
      }
    })();
  }, [emitCoach, finalize, updateTension, patchLastMove]);

  // Attempt a player move from the board. Returns true if legal.
  const playerMove = useCallback(
    (from: string, to: string): boolean => {
      const chess = chessRef.current;
      if (status !== "playing") return false;
      if (chess.turn() !== playerColorRef.current) return false;

      const piece = chess.get(from as never);
      const isPromo =
        piece && piece.type === "p" && (to.endsWith("8") || to.endsWith("1"));

      let moved;
      try {
        moved = chess.move({ from, to, promotion: isPromo ? "q" : undefined });
      } catch {
        return false;
      }
      if (!moved) return false;

      const thinkMs = performance.now() - turnStartRef.current;
      recentThinkRef.current.push(thinkMs);
      if (recentThinkRef.current.length > 6) recentThinkRef.current.shift();

      const evalBefore = lastEvalRef.current;
      const playerIsWhite = playerColorRef.current === "w";
      const prevPlayerAdv = playerIsWhite ? evalBefore : -evalBefore;
      const fenAfterPlayer = chess.fen();
      const playerGaveCheck = chess.inCheck();
      const gameOver = chess.isGameOver();

      // Show the move instantly (quality symbol is patched in after analysis).
      setFen(fenAfterPlayer);
      setMoves((prev) => [
        ...prev,
        {
          ply: prev.length + 1,
          san: moved.san,
          uci: from + to + (isPromo ? "q" : ""),
          color: moved.color,
          isPlayer: true,
          fenAfter: fenAfterPlayer,
          evalWhite: lastEvalRef.current,
          thinkMs,
        },
      ]);
      updateTension(chess);

      // Checkmate / stalemate by the player -> end NOW, before any slow analysis.
      if (gameOver) {
        if (chess.isCheckmate()) {
          const mateVal = playerIsWhite ? 100000 : -100000;
          lastEvalRef.current = mateVal;
          setEvalWhite(mateVal);
          patchLastMove(true, { quality: "great", evalWhite: mateVal });
        }
        finalize();
        return true;
      }

      setStatus("thinking");

      void (async () => {
        try {
          // Engine answers first (fast) so the game keeps flowing...
          await engineTurn();

          // ...then we classify the player's move off the critical path.
          const tempo = TEMPO_CONFIG[tempoRef.current];
          const score: EngineScore = await engine.evaluate(fenAfterPlayer, tempo.depth);
          const evalAfter = scoreToNumber(score);
          const quality = classifyMove(evalBefore, evalAfter, playerIsWhite);
          patchLastMove(true, { quality, evalWhite: evalAfter });

          const isBad = quality === "blunder" || quality === "mistake";
          const isGood = quality === "brilliant" || quality === "great";
          const playerAdv = playerIsWhite ? evalAfter : -evalAfter;
          const avgThink =
            recentThinkRef.current.reduce((a, b) => a + b, 0) /
            Math.max(1, recentThinkRef.current.length);
          const wasImpulsive = thinkMs < 2200 && thinkMs < avgThink * 0.6;
          const comeback = prevPlayerAdv < -120 && playerAdv > 60;

          if (isBad) consecutiveBadRef.current += 1;
          else consecutiveBadRef.current = 0;

          let event: CoachEvent | null;
          if (isBad && consecutiveBadRef.current >= 2) event = "spiral";
          else if (isBad && wasImpulsive) event = "impulse";
          else if (isGood && comeback) event = "comeback";
          else event = qualityToEvent(quality);
          if (!event && playerGaveCheck) event = "givingCheck";

          if (event) emitCoach(event);
        } catch (err) {
          console.error("[gambit] move flow error", err);
          if (!chessRef.current.isGameOver()) setStatus("playing");
        }
      })();

      return true;
    },
    [status, emitCoach, engineTurn, finalize, updateTension, patchLastMove]
  );

  const start = useCallback(
    async (opts: StartOptions) => {
      await engine.init();
      const persona = opts.persona;
      personaRef.current = persona;
      difficultyRef.current = opts.difficulty;
      tempoRef.current = opts.tempo ?? "blitz";
      playerColorRef.current = opts.playerColor ?? "w";

      if (!brainRef.current) brainRef.current = new CoachBrain(persona);
      else brainRef.current.setPersona(persona);

      engine.newGame();
      engine.setSkillLevel(DIFFICULTY_CONFIG[opts.difficulty].skill);

      const chess = new Chess();
      chessRef.current = chess;
      lastEvalRef.current = 0;
      recentThinkRef.current = [];
      consecutiveBadRef.current = 0;
      ambientCooldownRef.current = 3;
      tensionRef.current = 0;

      setInDanger(false);
      setMoves([]);
      setResult(null);
      setEvalWhite(0);
      setFen(chess.fen());
      setStatus("playing");

      emitCoach("gameStart");

      turnStartRef.current = performance.now();
      // If the player is black, the engine opens.
      if (playerColorRef.current === "b") {
        try {
          await engineTurn();
        } catch (err) {
          console.error("[gambit] opening move error", err);
          setStatus("playing");
        }
      }
    },
    [emitCoach, engineTurn]
  );

  // End the game now and surface the story. The outcome reflects the position
  // so stopping while ahead celebrates a win rather than labelling a defeat.
  const resign = useCallback(() => {
    if (status === "idle" || status === "over") return;
    coachVoice.stop();
    const playerIsWhite = playerColorRef.current === "w";
    const playerAdv = playerIsWhite ? lastEvalRef.current : -lastEvalRef.current;
    let outcome: GameResult["outcome"] = "draw";
    if (playerAdv > 200) outcome = "win";
    else if (playerAdv < -200) outcome = "loss";
    setResult({ outcome, reason: "Partie terminée" });
    setStatus("over");
    emitCoach(outcome === "win" ? "winning" : outcome === "loss" ? "losing" : "draw");
  }, [status, emitCoach]);

  const canUndo = status === "playing" && moves.some((m) => m.isPlayer);

  // Take back: revert the engine's reply and your last move so you can retry.
  const undo = useCallback(() => {
    if (status !== "playing") return;
    const chess = chessRef.current;
    if (!moves.some((m) => m.isPlayer)) return;
    coachVoice.stop();

    const playerColor = playerColorRef.current;
    const before = chess.history().length;
    chess.undo();
    if (chess.turn() !== playerColor && chess.history().length > 0) chess.undo();
    const removed = before - chess.history().length;

    const newMoves = moves.slice(0, Math.max(0, moves.length - removed));
    lastEvalRef.current = newMoves.length ? newMoves[newMoves.length - 1].evalWhite : 0;
    consecutiveBadRef.current = 0;

    setMoves(newMoves);
    setEvalWhite(lastEvalRef.current);
    setFen(chess.fen());
    setCoach(null);
    tensionRef.current = 0;
    setInDanger(chess.inCheck());
    turnStartRef.current = performance.now();
  }, [status, moves]);

  // Back to the home screen (re-pick coach, colour, difficulty).
  const reset = useCallback(() => {
    coachVoice.stop();
    tensionRef.current = 0;
    setInDanger(false);
    setStatus("idle");
    setResult(null);
    setCoach(null);
    setMoves([]);
    setEvalWhite(0);
  }, []);

  const playerColor = playerColorRef.current;

  const lastPlayerQuality = useMemo(() => {
    for (let i = moves.length - 1; i >= 0; i--) {
      if (moves[i].isPlayer) return moves[i].quality ?? null;
    }
    return null;
  }, [moves]);

  return {
    fen,
    moves,
    status,
    result,
    evalWhite,
    coach,
    engineReady,
    playerColor,
    lastPlayerQuality,
    inDanger,
    canUndo,
    start,
    playerMove,
    resign,
    undo,
    reset,
  };
}
