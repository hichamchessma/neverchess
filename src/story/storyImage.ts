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
  blob(160, 200, 520, "rgba(139,92,246,0.35)");
  blob(940, 1750, 560, "rgba(34,211,238,0.22)");

  ctx.textAlign = "left";

  // brand
  ctx.fillStyle = "#f4f4ff";
  ctx.font = '800 54px "Segoe UI", sans-serif';
  ctx.fillText("♟ GAMBIT", 80, 130);
  ctx.fillStyle = "rgba(167,167,197,0.9)";
  ctx.font = '500 30px "Segoe UI", sans-serif';
  ctx.fillText("ma partie, racontée", 80, 180);

  // result badge
  const rm = RESULT_META[data.result.outcome];
  ctx.textAlign = "right";
  ctx.fillStyle = rm.color;
  ctx.font = '800 46px "Segoe UI", sans-serif';
  ctx.fillText(rm.label, W - 80, 150);
  ctx.textAlign = "left";

  // TAG
  ctx.fillStyle = data.persona.accent;
  ctx.font = '700 40px "Segoe UI", sans-serif';
  ctx.fillText(data.moment.tag, 80, 320);

  // headline (wrapped)
  ctx.fillStyle = "#ffffff";
  ctx.font = '800 70px "Segoe UI", sans-serif';
  wrapText(ctx, data.moment.headline, 80, 410, W - 160, 82);

  // board
  const boardSize = 760;
  const bx = (W - boardSize) / 2;
  const by = 650;
  // soft shadow
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = 60;
  ctx.shadowOffsetY = 30;
  ctx.fillStyle = "#000";
  roundRect(ctx, bx, by, boardSize, boardSize, 14);
  ctx.fill();
  ctx.restore();
  drawBoard(ctx, data.moment.fenAfter, bx, by, boardSize, data.playerIsWhite, data.moment.highlight);

  // coach quote card
  const qy = by + boardSize + 70;
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  roundRect(ctx, 80, qy, W - 160, 230, 24);
  ctx.fill();
  ctx.strokeStyle = data.persona.accent + "66";
  ctx.lineWidth = 2;
  roundRect(ctx, 80, qy, W - 160, 230, 24);
  ctx.stroke();

  ctx.font = '700 36px "Segoe UI", sans-serif';
  ctx.fillStyle = data.persona.accent;
  ctx.fillText(`${data.persona.emoji} ${data.persona.name}`, 120, qy + 64);
  ctx.font = 'italic 500 36px "Segoe UI", sans-serif';
  ctx.fillStyle = "#e8e8ff";
  wrapText(ctx, `" ${data.coachLine} "`, 120, qy + 120, W - 240, 48);

  // stats strip
  const sy = qy + 300;
  const stat = (label: string, value: string, x: number, color: string) => {
    ctx.textAlign = "center";
    ctx.fillStyle = color;
    ctx.font = '800 64px "Segoe UI", sans-serif';
    ctx.fillText(value, x, sy + 40);
    ctx.fillStyle = "rgba(167,167,197,0.95)";
    ctx.font = '500 28px "Segoe UI", sans-serif';
    ctx.fillText(label, x, sy + 84);
    ctx.textAlign = "left";
  };
  stat("Précision", `${data.stats.accuracy}%`, W * 0.25, "#22d3ee");
  stat("Brillants", `${data.stats.brilliants}`, W * 0.5, "#a78bfa");
  stat("Coups", `${data.stats.moves}`, W * 0.75, "#f4f4ff");

  // footer CTA
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.font = '600 32px "Segoe UI", sans-serif';
  ctx.fillText("Trouve TON moment fort → joue sur GAMBIT", W / 2, H - 70);
  ctx.textAlign = "left";
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const words = text.split(" ");
  let line = "";
  let yy = y;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, yy);
      line = w;
      yy += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, yy);
}
