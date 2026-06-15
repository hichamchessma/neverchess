import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { renderStory, type StoryStats } from "../story/storyImage";
import type { StoryMoment } from "../story/momentDetector";
import type { GameResult } from "../game/useGambitGame";
import type { Persona } from "../coach/types";

type Props = {
  moment: StoryMoment;
  result: GameResult;
  persona: Persona;
  coachLine: string;
  stats: StoryStats;
  playerIsWhite: boolean;
  onReplay: () => void;
};

export default function StoryCard({
  moment,
  result,
  persona,
  coachLine,
  stats,
  playerIsWhite,
  onReplay,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    if (canvasRef.current) {
      renderStory(canvasRef.current, { moment, result, persona, coachLine, stats, playerIsWhite });
    }
    setCanShare(typeof navigator !== "undefined" && !!navigator.canShare);
  }, [moment, result, persona, coachLine, stats, playerIsWhite]);

  const toBlob = (): Promise<Blob | null> =>
    new Promise((resolve) => canvasRef.current?.toBlob((b) => resolve(b), "image/png"));

  const download = async () => {
    const blob = await toBlob();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ma-partie-gambit.png";
    a.click();
    URL.revokeObjectURL(url);
  };

  const share = async () => {
    const blob = await toBlob();
    if (!blob) return;
    const file = new File([blob], "ma-partie-gambit.png", { type: "image/png" });
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "Ma partie sur GAMBIT",
          text: `${moment.tag} : ${moment.headline}`,
        });
      } else {
        await download();
      }
    } catch {
      /* user cancelled */
    }
  };

  return (
    <motion.div
      className="story-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="story-modal"
        initial={{ scale: 0.92, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 24 }}
      >
        <div className="story-canvas-wrap">
          <canvas ref={canvasRef} className="story-canvas" />
        </div>
        <div className="story-actions">
          <h2 className="story-h">Ta story est prête 🔥</h2>
          <p className="story-p">
            {persona.name} a repéré ton moment fort. Partage-le, défie tes potes.
          </p>
          <div className="story-btns">
            {canShare && (
              <button className="btn primary" onClick={share}>
                📲 Partager
              </button>
            )}
            <button className="btn" onClick={download}>
              ⬇️ Télécharger
            </button>
            <button className="btn ghost" onClick={onReplay}>
              ↻ Rejouer
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
