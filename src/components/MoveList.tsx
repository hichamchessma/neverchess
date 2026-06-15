import { useEffect, useRef } from "react";
import type { MoveRecord } from "../game/useGambitGame";
import { QUALITY_META } from "../coach/coachBrain";

type Props = { moves: MoveRecord[] };

type Pair = { num: number; white?: MoveRecord; black?: MoveRecord };

function toPairs(moves: MoveRecord[]): Pair[] {
  const pairs: Pair[] = [];
  for (const m of moves) {
    if (m.color === "w") {
      pairs.push({ num: pairs.length + 1, white: m });
    } else {
      const last = pairs[pairs.length - 1];
      if (last && !last.black) last.black = m;
      else pairs.push({ num: pairs.length + 1, black: m });
    }
  }
  return pairs;
}

function Cell({ m }: { m?: MoveRecord }) {
  if (!m) return <span className="move-cell empty" />;
  const meta = m.quality ? QUALITY_META[m.quality] : null;
  return (
    <span className="move-cell">
      {m.san}
      {meta?.symbol && (
        <sup className="move-symbol" style={{ color: meta.color }}>
          {meta.symbol}
        </sup>
      )}
    </span>
  );
}

export default function MoveList({ moves }: Props) {
  const pairs = toPairs(moves);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [moves.length]);

  return (
    <div className="movelist glass">
      <div className="movelist-title">Partie</div>
      <div className="movelist-rows" ref={scrollRef}>
        {pairs.length === 0 && <div className="movelist-empty">Les coups apparaîtront ici…</div>}
        {pairs.map((p) => (
          <div className="move-row" key={p.num}>
            <span className="move-num">{p.num}.</span>
            <Cell m={p.white} />
            <Cell m={p.black} />
          </div>
        ))}
      </div>
    </div>
  );
}
