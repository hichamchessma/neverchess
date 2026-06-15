import { useState } from "react";
import { motion } from "framer-motion";
import { PERSONAS } from "../coach/personas";
import type { Persona } from "../coach/types";
import { DIFFICULTY_CONFIG, TEMPO_CONFIG, type Difficulty, type Tempo } from "../game/useGambitGame";

type Props = {
  engineReady: boolean;
  onStart: (opts: {
    persona: Persona;
    difficulty: Difficulty;
    tempo: Tempo;
    playerColor: "w" | "b";
  }) => void;
};

const DIFFS = Object.keys(DIFFICULTY_CONFIG) as Difficulty[];
const TEMPOS = Object.keys(TEMPO_CONFIG) as Tempo[];

export default function StartScreen({ engineReady, onStart }: Props) {
  const [personaId, setPersonaId] = useState(PERSONAS[0].id);
  const [difficulty, setDifficulty] = useState<Difficulty>("intermediaire");
  const [tempo, setTempo] = useState<Tempo>("blitz");
  const [color, setColor] = useState<"w" | "b">("w");

  const persona = PERSONAS.find((p) => p.id === personaId)!;

  return (
    <div className="start-screen">
      <motion.div
        className="start-hero"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="brand">
          <span className="brand-mark">♟</span>
          <span className="brand-name">GAMBIT</span>
        </div>
        <h1 className="start-title">
          Le coach qui <span className="grad">vit</span> tes parties
          <br />et les transforme en <span className="grad2">histoires</span>.
        </h1>
        <p className="start-sub">
          Joue. Il te parle, te pousse, te chambre. À la fin, il te sort le moment
          fort de ta partie — prêt à partager.
        </p>
      </motion.div>

      <div className="start-config">
        <section>
          <h3 className="cfg-label">Choisis ton coach</h3>
          <div className="persona-grid">
            {PERSONAS.map((p) => (
              <button
                key={p.id}
                className={`persona-card ${p.id === personaId ? "selected" : ""}`}
                style={p.id === personaId ? { borderColor: p.accent, boxShadow: `0 0 0 1px ${p.accent}, 0 0 30px ${p.accent}40` } : undefined}
                onClick={() => setPersonaId(p.id)}
              >
                <span className="persona-emoji" style={{ filter: `drop-shadow(0 0 12px ${p.accent})` }}>
                  {p.emoji}
                </span>
                <span className="persona-name">{p.name}</span>
                <span className="persona-tag">{p.tagline}</span>
              </button>
            ))}
          </div>
        </section>

        <section>
          <h3 className="cfg-label">Cadence</h3>
          <div className="tempo-grid">
            {TEMPOS.map((t) => (
              <button
                key={t}
                className={`tempo-card ${t === tempo ? "selected" : ""}`}
                onClick={() => setTempo(t)}
              >
                <span className="tempo-emoji">{TEMPO_CONFIG[t].emoji}</span>
                <span className="tempo-name">{TEMPO_CONFIG[t].label}</span>
                <span className="tempo-desc">{TEMPO_CONFIG[t].desc}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="cfg-row">
          <div>
            <h3 className="cfg-label">Niveau de l'adversaire</h3>
            <div className="pill-row">
              {DIFFS.map((d) => (
                <button
                  key={d}
                  className={`pill ${d === difficulty ? "active" : ""}`}
                  onClick={() => setDifficulty(d)}
                >
                  {DIFFICULTY_CONFIG[d].label}
                  <span className="pill-elo">{DIFFICULTY_CONFIG[d].elo}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <h3 className="cfg-label">Tes pièces</h3>
            <div className="pill-row">
              <button className={`pill ${color === "w" ? "active" : ""}`} onClick={() => setColor("w")}>
                ♔ Blancs
              </button>
              <button className={`pill ${color === "b" ? "active" : ""}`} onClick={() => setColor("b")}>
                ♚ Noirs
              </button>
            </div>
          </div>
        </section>

        <motion.button
          className="cta"
          style={{ background: `linear-gradient(120deg, ${persona.accent}, var(--violet))` }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          disabled={!engineReady}
          onClick={() => onStart({ persona, difficulty, tempo, playerColor: color })}
        >
          {engineReady ? `Jouer avec ${persona.name} ${persona.emoji}` : "Chargement du moteur…"}
        </motion.button>
      </div>
    </div>
  );
}
