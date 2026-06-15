import { useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import "./App.css";
import { useGambitGame, type Difficulty } from "./game/useGambitGame";
import { PERSONAS, getPersona } from "./coach/personas";
import type { Persona } from "./coach/types";
import { coachVoice } from "./coach/voice";
import { detectMoment } from "./story/momentDetector";
import type { StoryStats } from "./story/storyImage";
import StartScreen from "./components/StartScreen";
import GameBoard from "./components/GameBoard";
import EvalBar from "./components/EvalBar";
import CoachPanel from "./components/CoachPanel";
import MoveList from "./components/MoveList";
import StoryCard from "./components/StoryCard";

export default function App() {
  const game = useGambitGame();
  const [persona, setPersona] = useState<Persona>(PERSONAS[0]);
  const [voiceOn, setVoiceOn] = useState(true);

  const playerIsWhite = game.playerColor === "w";
  const orientation = playerIsWhite ? "white" : "black";

  const lastMove = useMemo(() => {
    const last = game.moves[game.moves.length - 1];
    if (!last || last.uci.length < 4) return null;
    return { from: last.uci.slice(0, 2), to: last.uci.slice(2, 4) };
  }, [game.moves]);

  const story = useMemo(() => {
    if (game.status !== "over" || !game.result) return null;
    const moment = detectMoment(game.moves, playerIsWhite, game.result);
    if (!moment) return null;

    const playerMoves = game.moves.filter((m) => m.isPlayer);
    const accurate = playerMoves.filter(
      (m) => m.quality && ["brilliant", "great", "good", "book"].includes(m.quality)
    ).length;
    const stats: StoryStats = {
      accuracy: playerMoves.length ? Math.round((accurate / playerMoves.length) * 100) : 100,
      brilliants: playerMoves.filter((m) => m.quality === "brilliant").length,
      blunders: playerMoves.filter((m) => m.quality === "blunder").length,
      moves: playerMoves.length,
    };
    return { moment, stats };
  }, [game.status, game.result, game.moves, playerIsWhite]);

  const toggleVoice = () => {
    const next = !voiceOn;
    setVoiceOn(next);
    coachVoice.setEnabled(next);
  };

  const startGame = (opts: { persona: Persona; difficulty: Difficulty; playerColor: "w" | "b" }) => {
    setPersona(opts.persona);
    coachVoice.setEnabled(voiceOn);
    game.start(opts);
  };

  const newGame = () => {
    game.reset(); // back to the home screen to re-pick coach / colour / level
  };

  if (game.status === "idle") {
    return <StartScreen engineReady={game.engineReady} onStart={startGame} />;
  }

  const activePersona = getPersona(persona.id);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand small">
          <span className="brand-mark">♟</span>
          <span className="brand-name">GAMBIT</span>
        </div>
        <div className="topbar-mid">
          <span className="diff-chip">vs Stockfish</span>
        </div>
        <div className="topbar-actions">
          <button className="btn ghost small" onClick={newGame} title="Revenir au menu">
            ↻ Nouvelle partie
          </button>
        </div>
      </header>

      <main className="game-grid">
        <section className="board-col">
          <EvalBar evalWhite={game.evalWhite} orientation={orientation} />
          <div className="board-stack">
            <GameBoard
              fen={game.fen}
              orientation={orientation}
              interactive={game.status === "playing"}
              lastMove={lastMove}
              onMove={game.playerMove}
            />
            <div className="game-controls">
              <button
                className="ctrl-btn"
                onClick={game.undo}
                disabled={!game.canUndo}
                title="Annuler ton dernier coup"
              >
                <span className="ctrl-ico">⟲</span> Annuler
              </button>
              <button
                className="ctrl-btn danger"
                onClick={game.resign}
                disabled={game.status === "over"}
                title="Abandonner et voir ta story"
              >
                <span className="ctrl-ico">🏳️</span> Abandonner
              </button>
            </div>
          </div>
        </section>

        <aside className="side-col">
          <CoachPanel
            persona={activePersona}
            message={game.coach}
            thinking={game.status === "thinking"}
            voiceOn={voiceOn}
            onToggleVoice={toggleVoice}
          />
          <MoveList moves={game.moves} />
        </aside>
      </main>

      <AnimatePresence>
        {story && game.result && (
          <StoryCard
            moment={story.moment}
            result={game.result}
            persona={activePersona}
            coachLine={game.coach?.text ?? activePersona.tagline}
            stats={story.stats}
            playerIsWhite={playerIsWhite}
            onReplay={newGame}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
