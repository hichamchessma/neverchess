import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import { engine, scoreToNumber, type EngineScore } from "../engine/stockfish";
import { CoachBrain, classifyMove, qualityToEvent } from "../coach/coachBrain";
import type { CoachEvent, Mood, MoveQuality, Persona } from "../coach/types";
import { coachVoice } from "../coach/voice";

export type Difficulty = "debutant" | "intermediaire" | "avance" | "expert";

export const DIFFICULTY_CONFIG: Record<
  Difficulty,
  { label: string; skill: number; movetime: number; elo: string }
> = {
  debutant: { label: "Débutant", skill: 1, movetime: 300, elo: "~800" },
  intermediaire: { label: "Intermédiaire", skill: 6, movetime: 500, elo: "~1400" },
  avance: { label: "Avancé", skill: 12, movetime: 800, elo: "~1800" },
  expert: { label: "Expert", skill: 20, movetime: 1000, elo: "2000+" },
};

const ANALYSIS_DEPTH = 12;

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

type StartOptions = { persona: Persona; difficulty: Difficulty; playerColor?: "w" | "b" };

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
  const playerColorRef = useRef<"w" | "b">("w");
  const msgIdRef = useRef(0);

  const [fen, setFen] = useState(chessRef.current.fen());
  const [moves, setMoves] = useState<MoveRecord[]>([]);
  const [status, setStatus] = useState<GameStatus>("idle");
  const [result, setResult] = useState<GameResult | null>(null);
  const [evalWhite, setEvalWhite] = useState(0);
  const [coach, setCoach] = useState<CoachMessage | null>(null);
  const [engineReady, setEngineReady] = useState(false);

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

  // Run the engine's reply, analyse it, update eval, and possibly comment.
  const engineTurn = useCallback(async () => {
    const chess = chessRef.current;
    if (chess.isGameOver()) {
      finalize();
      return;
    }
    setStatus("thinking");
    const cfg = DIFFICULTY_CONFIG[difficultyRef.current];
    let best = await engine.getBestMove(chess.fen(), { movetime: cfg.movetime });
    if (!best) {
      // engine timed out / no answer: keep the game alive with a legal move
      const legal = chess.moves({ verbose: true });
      if (legal.length === 0) {
        finalize();
        return;
      }
      const pick = legal[Math.floor(Math.random() * legal.length)];
      best = { from: pick.from, to: pick.to, promotion: pick.promotion };
    }
    const moved = chess.move({ from: best.from, to: best.to, promotion: best.promotion ?? "q" });
    const score = await engine.evaluate(chess.fen(), ANALYSIS_DEPTH);
    const evalNum = scoreToNumber(score);
    lastEvalRef.current = evalNum;

    setFen(chess.fen());
    setEvalWhite(evalNum);
    setMoves((prev) => [
      ...prev,
      {
        ply: prev.length + 1,
        san: moved.san,
        uci: best.from + best.to + (best.promotion ?? ""),
        color: moved.color,
        isPlayer: false,
        fenAfter: chess.fen(),
        evalWhite: evalNum,
      },
    ]);

    if (chess.isGameOver()) {
      finalize();
      return;
    }

    // Occasional ambient / threat commentary (kept rare to avoid spam).
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

    turnStartRef.current = performance.now();
    setStatus("playing");
  }, [emitCoach, finalize]);

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

      setFen(chess.fen());
      // Lock the board straight away so a fast second move can't fire a second
      // concurrent engine command (which would dead-lock the single worker).
      setStatus("thinking");

      // Analyse the resulting position, then react.
      void (async () => {
        try {
          const score: EngineScore = await engine.evaluate(chess.fen(), ANALYSIS_DEPTH);
        const evalAfter = scoreToNumber(score);
        lastEvalRef.current = evalAfter;
        setEvalWhite(evalAfter);

        const legalCount = chess.history().length; // not "only move", placeholder
        const quality = classifyMove(evalBefore, evalAfter, playerIsWhite, {
          wasOnlyMove: legalCount < 0,
        });

        setMoves((prev) => [
          ...prev,
          {
            ply: prev.length + 1,
            san: moved.san,
            uci: from + to + (isPromo ? "q" : ""),
            color: moved.color,
            isPlayer: true,
            fenAfter: chess.fen(),
            evalWhite: evalAfter,
            quality,
            thinkMs,
          },
        ]);

        // Decide what the coach says, by priority.
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

        // Player gave check with a fine move -> celebrate the check instead.
        if (!event && chess.inCheck()) event = "givingCheck";

        if (event) emitCoach(event);

        if (chess.isGameOver()) {
          finalize();
          return;
        }
        await engineTurn();
        } catch (err) {
          console.error("[gambit] move flow error", err);
          // never leave the board locked on an error
          if (!chessRef.current.isGameOver()) setStatus("playing");
        }
      })();

      return true;
    },
    [status, emitCoach, engineTurn, finalize]
  );

  const start = useCallback(
    async (opts: StartOptions) => {
      await engine.init();
      const persona = opts.persona;
      personaRef.current = persona;
      difficultyRef.current = opts.difficulty;
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
    start,
    playerMove,
    resign,
  };
}
