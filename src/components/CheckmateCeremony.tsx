import { useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import type { GameResult } from "../game/useGambitGame";

type Props = {
  result: GameResult;
  onContinue: () => void;
};

const META = {
  win: { sub: "VICTOIRE", color: "#fbbf24", glow: "rgba(251,191,36,0.55)", emoji: "👑" },
  loss: { sub: "DÉFAITE", color: "#fb7185", glow: "rgba(251,113,133,0.5)", emoji: "💀" },
  draw: { sub: "ÉGALITÉ", color: "#a7a7c5", glow: "rgba(167,167,197,0.4)", emoji: "🤝" },
};

export default function CheckmateCeremony({ result, onContinue }: Props) {
  const m = META[result.outcome];
  const title = result.reason.toUpperCase();

  // auto-advance to the story after the show
  useEffect(() => {
    const t = setTimeout(onContinue, 3200);
    return () => clearTimeout(t);
  }, [onContinue]);

  const particles = useMemo(
    () =>
      Array.from({ length: result.outcome === "win" ? 40 : 18 }, (_, i) => ({
        id: i,
        x: (Math.random() - 0.5) * 900,
        y: (Math.random() - 0.5) * 900,
        delay: Math.random() * 0.3,
        size: 6 + Math.random() * 10,
      })),
    [result.outcome]
  );

  return (
    <motion.div
      className="ceremony"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onContinue}
    >
      <motion.div
        className="ceremony-glow"
        style={{ background: `radial-gradient(circle, ${m.glow} 0%, transparent 60%)` }}
        initial={{ scale: 0.2, opacity: 0 }}
        animate={{ scale: [0.2, 1.3, 1], opacity: [0, 1, 0.7] }}
        transition={{ duration: 1.1, ease: "easeOut" }}
      />

      {result.outcome === "win" &&
        particles.map((p) => (
          <motion.span
            key={p.id}
            className="ceremony-particle"
            style={{ width: p.size, height: p.size, background: m.color }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{ x: p.x, y: p.y, opacity: 0, scale: 0.3 }}
            transition={{ duration: 1.4, delay: p.delay, ease: "easeOut" }}
          />
        ))}

      <motion.div
        className="ceremony-emoji"
        initial={{ scale: 0, rotate: -30 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 220, damping: 14, delay: 0.1 }}
      >
        {m.emoji}
      </motion.div>

      <motion.h1
        className="ceremony-title"
        style={{ color: m.color, textShadow: `0 0 40px ${m.glow}` }}
        initial={{ scale: 1.6, opacity: 0, letterSpacing: "0.4em" }}
        animate={{ scale: 1, opacity: 1, letterSpacing: "0.12em" }}
        transition={{ type: "spring", stiffness: 200, damping: 18, delay: 0.15 }}
      >
        {title}
      </motion.h1>

      <motion.div
        className="ceremony-sub"
        style={{ color: m.color }}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        {m.sub}
      </motion.div>

      <motion.button
        className="ceremony-cta"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4 }}
        onClick={onContinue}
      >
        Voir ma story →
      </motion.button>
    </motion.div>
  );
}
