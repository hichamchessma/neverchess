import { useMemo, useState } from "react";
import { Chessboard } from "react-chessboard";
import { Chess, type Square } from "chess.js";

type Props = {
  fen: string;
  orientation: "white" | "black";
  interactive: boolean;
  lastMove?: { from: string; to: string } | null;
  onMove: (from: string, to: string) => boolean;
};

const DARK = "#5a4b8a";
const LIGHT = "#cfc6f0";

export default function GameBoard({ fen, orientation, interactive, lastMove, onMove }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  const game = useMemo(() => new Chess(fen), [fen]);

  const checkSquare = useMemo(() => {
    if (!game.inCheck()) return null;
    const turn = game.turn();
    for (const row of game.board()) {
      for (const sq of row) {
        if (sq && sq.type === "k" && sq.color === turn) return sq.square;
      }
    }
    return null;
  }, [game]);

  const legalTargets = useMemo(() => {
    if (!selected) return new Set<string>();
    const verbose = game.moves({ square: selected as Square, verbose: true });
    return new Set(verbose.map((m) => m.to));
  }, [selected, game]);

  const squareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {};
    if (lastMove) {
      styles[lastMove.from] = { background: "rgba(139,92,246,0.32)" };
      styles[lastMove.to] = { background: "rgba(139,92,246,0.42)" };
    }
    if (checkSquare) {
      styles[checkSquare] = {
        background: "radial-gradient(circle, rgba(251,113,133,0.85) 0%, rgba(251,113,133,0.15) 70%)",
      };
    }
    if (selected) {
      styles[selected] = { background: "rgba(34,211,238,0.4)" };
    }
    legalTargets.forEach((sq) => {
      const occupied = game.get(sq as Square);
      styles[sq] = occupied
        ? {
            background:
              "radial-gradient(circle, transparent 52%, rgba(34,211,238,0.55) 54%, rgba(34,211,238,0.55) 62%, transparent 64%)",
          }
        : {
            background:
              "radial-gradient(circle, rgba(34,211,238,0.55) 0%, rgba(34,211,238,0.55) 22%, transparent 24%)",
          };
    });
    return styles;
  }, [lastMove, checkSquare, selected, legalTargets, game]);

  const tryMove = (from: string, to: string): boolean => {
    const ok = onMove(from, to);
    if (ok) setSelected(null);
    return ok;
  };

  return (
    <div className="board-shell">
      <Chessboard
        options={{
          id: "gambit-board",
          position: fen,
          boardOrientation: orientation,
          animationDurationInMs: 220,
          allowDragging: interactive,
          showNotation: true,
          darkSquareStyle: { backgroundColor: DARK },
          lightSquareStyle: { backgroundColor: LIGHT },
          boardStyle: {
            borderRadius: "14px",
            overflow: "hidden",
            boxShadow: "0 24px 60px rgba(0,0,0,0.55)",
          },
          squareStyles,
          onPieceDrop: ({ sourceSquare, targetSquare }) => {
            if (!targetSquare) return false;
            return tryMove(sourceSquare, targetSquare);
          },
          onSquareClick: ({ square, piece }) => {
            if (!interactive) return;
            if (selected && selected !== square) {
              const moved = tryMove(selected, square);
              if (!moved && piece) setSelected(square);
              else if (!moved) setSelected(null);
              return;
            }
            if (piece) setSelected(square);
            else setSelected(null);
          },
        }}
      />
    </div>
  );
}
