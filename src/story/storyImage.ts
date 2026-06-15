import type { StoryMoment } from "./momentDetector";
import type { GameResult } from "../game/useGambitGame";
import type { Persona } from "../coach/types";

export type StoryStats = {
  accuracy: number; // 0..100
  brilliants: number;
  blunders: number;
  moves: number;
};

const GLYPH: Record<string, string> = {
  k: "♚",
  q: "♛",
  r: "♜",
  b: "♝",
  n: "♞",
  p: "♟",
};

function parseBoard(fen: string): (null | { type: string; white: boolean })[][] {
  const rows = fen.split(" ")[0].split("/");
  return rows.map((row) => {
    const cells: (null | { type: string; white: boolean })[] = [];
    for (const ch of row) {
      if (/\d/.test(ch)) {
        for (let i = 0; i < parseInt(ch, 10); i++) cells.push(null);
      } else {
        cells.push({ type: ch.toLowerCase(), white: ch === ch.toUpperCase() });
      }
    }
    return cells;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawBoard(
  ctx: CanvasRenderingContext2D,
  fen: string,
  x: number,
  y: number,
  size: number,
  playerIsWhite: boolean,
  highlight?: { from: string; to: string }
) {
  let board = parseBoard(fen);
  if (!playerIsWhite) board = board.map((r) => [...r].reverse()).reverse();
  const cell = size / 8;
  const dark = "#5a4b8a";
  const light = "#cfc6f0";

  const hl = new Set<string>();
  if (highlight) {
    const toRC = (sq: string) => {
      let file = sq.charCodeAt(0) - 97;
      let rank = 8 - parseInt(sq[1], 10);
      if (!playerIsWhite) {
        file = 7 - file;
        rank = 7 - rank;
      }
      return `${rank},${file}`;
    };
    hl.add(toRC(highlight.from));
    hl.add(toRC(highlight.to));
  }

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const isLight = (r + c) % 2 === 0;
      ctx.fillStyle = isLight ? light : dark;
      ctx.fillRect(x + c * cell, y + r * cell, cell, cell);
      if (hl.has(`${r},${c}`)) {
        ctx.fillStyle = "rgba(34,211,238,0.45)";
        ctx.fillRect(x + c * cell, y + r * cell, cell, cell);
      }
      const piece = board[r][c];
      if (piece) {
        ctx.font = `${cell * 0.78}px "Segoe UI Symbol", "Arial Unicode MS", sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const cx = x + c * cell + cell / 2;
        const cy = y + r * cell + cell / 2;
        // outline for contrast
        ctx.lineWidth = cell * 0.05;
        ctx.strokeStyle = piece.white ? "rgba(0,0,0,0.55)" : "rgba(0,0,0,0.7)";
        ctx.strokeText(GLYPH[piece.type], cx, cy);
        ctx.fillStyle = piece.white ? "#ffffff" : "#1a1430";
        ctx.fillText(GLYPH[piece.type], cx, cy);
      }
    }
  }
  // frame
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 3;
  roundRect(ctx, x, y, size, size, 14);
  ctx.stroke();
}

const RESULT_META = {
  win: { label: "VICTOIRE", color: "#34d399" },
  loss: { label: "DÉFAITE", color: "#fb7185" },
  draw: { label: "NULLE", color: "#a7a7c5" },
};

export function renderStory(
  canvas: HTMLCanvasElement,
  data: {
    moment: StoryMoment;
    result: GameResult;
    persona: Persona;
    coachLine: string;
    stats: StoryStats;
    playerIsWhite: boolean;
  }
) {
  const W = 1080;
  const H = 1920;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // background
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, "#0c0c1a");
  g.addColorStop(0.5, "#16103a");
  g.addColorStop(1, "#07070f");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // glow blobs
  const blob = (cx: number, cy: number, rad: number, color: string) => {
    const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
    rg.addColorStop(0, color);
    rg.addColorStop(1, "transparent");
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, W, H);
  };
  blob(180, 240, 560, "rgba(139,92,246,0.32)");
  blob(920, 1720, 600, "rgba(34,211,238,0.20)");

  const M = 80; // side margin
  ctx.textAlign = "left";

  // ---- header: brand + result badge ----
  ctx.fillStyle = "#f4f4ff";
  ctx.font = '800 50px "Segoe UI", sans-serif';
  ctx.fillText("♟ GAMBIT", M, 120);
  ctx.fillStyle = "rgba(167,167,197,0.85)";
  ctx.font = '500 28px "Segoe UI", sans-serif';
  ctx.fillText("ma partie, racontée", M, 162);

  const rm = RESULT_META[data.result.outcome];
  ctx.font = '800 40px "Segoe UI", sans-serif';
  const bw = ctx.measureText(rm.label).width + 44;
  roundRect(ctx, W - M - bw, 92, bw, 60, 30);
  ctx.fillStyle = rm.color + "22";
  ctx.fill();
  ctx.strokeStyle = rm.color;
  ctx.lineWidth = 2;
  roundRect(ctx, W - M - bw, 92, bw, 60, 30);
  ctx.stroke();
  ctx.fillStyle = rm.color;
  ctx.textAlign = "center";
  ctx.fillText(rm.label, W - M - bw / 2, 134);
  ctx.textAlign = "left";

  // ---- tag + headline ----
  ctx.fillStyle = data.persona.accent;
  ctx.font = '700 36px "Segoe UI", sans-serif';
  ctx.fillText(data.moment.tag.toUpperCase(), M, 268);

  ctx.fillStyle = "#ffffff";
  ctx.font = '800 64px "Segoe UI", sans-serif';
  wrapText(ctx, data.moment.headline, M, 344, W - 2 * M, 74, 3);

  // ---- board ----
  const boardSize = 660;
  const bx = (W - boardSize) / 2;
  const by = 560;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = 50;
  ctx.shadowOffsetY = 24;
  ctx.fillStyle = "#000";
  roundRect(ctx, bx, by, boardSize, boardSize, 14);
  ctx.fill();
  ctx.restore();
  drawBoard(ctx, data.moment.fenAfter, bx, by, boardSize, data.playerIsWhite, data.moment.highlight);
  // drawBoard leaves textAlign/baseline centered for the glyphs — reset them.
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  // ---- coach quote card ----
  const cardX = M;
  const cardY = by + boardSize + 56; // 1272
  const cardW = W - 2 * M;
  const cardH = 224;
  ctx.fillStyle = "rgba(255,255,255,0.045)";
  roundRect(ctx, cardX, cardY, cardW, cardH, 24);
  ctx.fill();
  // accent left bar
  ctx.fillStyle = data.persona.accent;
  roundRect(ctx, cardX, cardY, 8, cardH, 4);
  ctx.fill();
  ctx.strokeStyle = data.persona.accent + "55";
  ctx.lineWidth = 1.5;
  roundRect(ctx, cardX, cardY, cardW, cardH, 24);
  ctx.stroke();

  const padL = cardX + 44;
  ctx.font = '700 34px "Segoe UI", sans-serif';
  ctx.fillStyle = data.persona.accent;
  ctx.fillText(`${data.persona.emoji}  ${data.persona.name}`, padL, cardY + 56);
  ctx.font = 'italic 500 33px "Segoe UI", sans-serif';
  ctx.fillStyle = "#e8e8ff";
  const quote = truncate(data.coachLine, 130);
  wrapText(ctx, `« ${quote} »`, padL, cardY + 112, cardW - 88, 44, 3);

  // ---- stats strip ----
  const sy = cardY + cardH + 96; // ~1592
  const stat = (label: string, value: string, x: number, color: string) => {
    ctx.textAlign = "center";
    ctx.fillStyle = color;
    ctx.font = '800 60px "Segoe UI", sans-serif';
    ctx.fillText(value, x, sy);
    ctx.fillStyle = "rgba(167,167,197,0.95)";
    ctx.font = '600 26px "Segoe UI", sans-serif';
    ctx.fillText(label.toUpperCase(), x, sy + 42);
    ctx.textAlign = "left";
  };
  stat("Précision", `${data.stats.accuracy}%`, W * 0.22, "#22d3ee");
  stat("Brillants", `${data.stats.brilliants}`, W * 0.5, "#a78bfa");
  stat("Coups", `${data.stats.moves}`, W * 0.78, "#f4f4ff");

  // ---- footer CTA pill ----
  ctx.textAlign = "center";
  ctx.font = '600 30px "Segoe UI", sans-serif';
  const cta = "Trouve TON moment fort  →  GAMBIT";
  const ctaW = ctx.measureText(cta).width + 64;
  roundRect(ctx, (W - ctaW) / 2, H - 118, ctaW, 64, 32);
  ctx.fillStyle = "rgba(139,92,246,0.18)";
  ctx.fill();
  ctx.strokeStyle = "rgba(139,92,246,0.5)";
  ctx.lineWidth = 1.5;
  roundRect(ctx, (W - ctaW) / 2, H - 118, ctaW, 64, 32);
  ctx.stroke();
  ctx.fillStyle = "#e9e4ff";
  ctx.fillText(cta, W / 2, H - 76);
  ctx.textAlign = "left";
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1).trimEnd() + "…" : s;
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 99
): number {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);

  // clamp to maxLines, adding an ellipsis to the last visible line
  const visible = lines.slice(0, maxLines);
  if (lines.length > maxLines && visible.length) {
    let last = visible[visible.length - 1];
    while (ctx.measureText(last + "…").width > maxWidth && last.length > 1) {
      last = last.slice(0, -1);
    }
    visible[visible.length - 1] = last + "…";
  }
  visible.forEach((l, i) => ctx.fillText(l, x, y + i * lineHeight));
  return visible.length;
}
