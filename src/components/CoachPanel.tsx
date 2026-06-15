import { AnimatePresence, motion } from "framer-motion";
import type { Persona, Mood } from "../coach/types";
import type { CoachMessage } from "../game/useGambitGame";

type Props = {
  persona: Persona;
  message: CoachMessage | null;
  thinking: boolean;
  voiceOn: boolean;
  onToggleVoice: () => void;
};

const MOOD_COLOR: Record<Mood, string> = {
  hype: "#a78bfa",
  proud: "#34d399",
  calm: "#22d3ee",
  warn: "#fbbf24",
  tense: "#fb7185",
  tease: "#fb923c",
  neutral: "#a7a7c5",
};

export default function CoachPanel({ persona, message, thinking, voiceOn, onToggleVoice }: Props) {
  const moodColor = message ? MOOD_COLOR[message.mood] : persona.accent;

  return (
    <div className="coach-panel glass">
      <div className="coach-head">
        <motion.div
          className="coach-avatar"
          style={{ boxShadow: `0 0 30px ${moodColor}` , borderColor: moodColor }}
          animate={
            message
              ? { scale: [1, 1.08, 1] }
              : thinking
              ? { scale: [1, 1.03, 1] }
              : { scale: 1 }
          }
          transition={{ duration: message ? 0.45 : 1.4, repeat: thinking && !message ? Infinity : 0 }}
        >
          <span>{persona.emoji}</span>
        </motion.div>
        <div className="coach-meta">
          <div className="coach-name">{persona.name}</div>
          <div className="coach-status" style={{ color: moodColor }}>
            {thinking ? "réfléchit…" : "à l'écoute"}
          </div>
        </div>
        <button
          className={`voice-toggle ${voiceOn ? "on" : "off"}`}
          onClick={onToggleVoice}
          title={voiceOn ? "Couper la voix" : "Activer la voix"}
        >
          {voiceOn ? "🔊" : "🔇"}
        </button>
      </div>

      <div className="coach-bubble-wrap">
        <AnimatePresence mode="wait">
          {message ? (
            <motion.div
              key={message.id}
              className="coach-bubble"
              style={{ borderColor: moodColor }}
              initial={{ opacity: 0, y: 10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 380, damping: 26 }}
            >
              <span className="coach-quote" style={{ color: moodColor }}>
                "
              </span>
              {message.text}
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              className="coach-bubble idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {persona.tagline}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
