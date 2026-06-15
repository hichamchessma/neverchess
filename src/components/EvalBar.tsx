type Props = {
  evalWhite: number; // numeric white-relative score
  orientation: "white" | "black";
};

function describe(n: number): { advantage: number; label: string } {
  if (Math.abs(n) >= 99000) {
    const mateIn = 100000 - Math.abs(n);
    return { advantage: n > 0 ? 1 : 0, label: `M${mateIn}` };
  }
  const advantage = 1 / (1 + Math.pow(10, -n / 400)); // white win-ish
  const pawns = (n / 100).toFixed(1);
  const label = n >= 0 ? `+${pawns}` : pawns;
  return { advantage, label };
}

export default function EvalBar({ evalWhite, orientation }: Props) {
  const { advantage, label } = describe(evalWhite);
  // fraction of the bar that should be white
  const whiteFrac = orientation === "white" ? advantage : 1 - advantage;
  const whitePct = Math.max(2, Math.min(98, whiteFrac * 100));
  const whiteOnTop = orientation === "black";

  return (
    <div className="evalbar" title={`Évaluation : ${label}`}>
      <div className="evalbar-track">
        <div
          className="evalbar-white"
          style={{
            height: `${whitePct}%`,
            [whiteOnTop ? "top" : "bottom"]: 0,
          }}
        />
      </div>
      <span className={`evalbar-label ${evalWhite >= 0 ? "for-white" : "for-black"}`}>
        {label}
      </span>
    </div>
  );
}
