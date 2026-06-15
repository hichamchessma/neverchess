// Thin async wrapper around the Stockfish UCI engine running in a Web Worker.
// The engine binary lives in /public/engine and talks the UCI text protocol.

export type EngineScore = {
  // White-relative evaluation. Exactly one of cp / mate is set.
  cp?: number; // centipawns, + = white better
  mate?: number; // moves to mate, + = white mates
};

export type BestMove = {
  from: string;
  to: string;
  promotion?: string;
};

type Listener = (line: string) => void;

function sideToMoveFromFen(fen: string): "w" | "b" {
  return (fen.split(" ")[1] as "w" | "b") ?? "w";
}

class StockfishEngine {
  private worker: Worker | null = null;
  private listeners: Set<Listener> = new Set();
  private ready = false;
  private booting: Promise<void> | null = null;
  // Serializes engine commands: the single worker can only run one `go` at a
  // time, so overlapping calls must queue or one promise would hang forever.
  private queue: Promise<unknown> = Promise.resolve();

  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = this.queue.then(task, task);
    // keep the chain alive even if a task rejects
    this.queue = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  }

  /** Boot the worker and complete the UCI handshake. Idempotent. */
  async init(): Promise<void> {
    if (this.ready) return;
    if (this.booting) return this.booting;

    this.booting = new Promise<void>((resolve, reject) => {
      try {
        this.worker = new Worker(`${import.meta.env.BASE_URL}engine/stockfish.js`);
      } catch (err) {
        reject(err);
        return;
      }

      this.worker.onmessage = (e: MessageEvent) => {
        const line = typeof e.data === "string" ? e.data : e.data?.data ?? "";
        if (!line) return;
        this.listeners.forEach((l) => l(line));
      };
      this.worker.onerror = (e) => console.error("[stockfish] worker error", e);

      const onLine: Listener = (line) => {
        if (line.includes("uciok")) {
          this.send("isready");
        } else if (line.includes("readyok")) {
          this.listeners.delete(onLine);
          this.ready = true;
          resolve();
        }
      };
      this.listeners.add(onLine);

      this.send("uci");
    });

    return this.booting;
  }

  private send(cmd: string) {
    this.worker?.postMessage(cmd);
  }

  /** Skill Level: 0 (weak) .. 20 (full strength). */
  setSkillLevel(level: number) {
    const clamped = Math.max(0, Math.min(20, Math.round(level)));
    this.send(`setoption name Skill Level value ${clamped}`);
  }

  newGame() {
    this.send("ucinewgame");
  }

  /**
   * Ask the engine for its best move in a position.
   * `movetime` (ms) keeps the opponent feeling responsive.
   */
  async getBestMove(fen: string, opts: { movetime?: number; depth?: number } = {}): Promise<BestMove | null> {
    await this.init();
    return this.enqueue(
      () =>
        new Promise<BestMove | null>((resolve) => {
          let settled = false;
          const finish = (v: BestMove | null) => {
            if (settled) return;
            settled = true;
            this.listeners.delete(onLine);
            clearTimeout(timer);
            resolve(v);
          };
          const onLine: Listener = (line) => {
            if (line.startsWith("bestmove")) {
              const token = line.split(" ")[1];
              if (!token || token === "(none)") return finish(null);
              finish({
                from: token.slice(0, 2),
                to: token.slice(2, 4),
                promotion: token.length > 4 ? token.slice(4, 5) : undefined,
              });
            }
          };
          // safety net: if the worker never answers, stop and bail out
          const budget = (opts.movetime ?? 800) + 5000;
          const timer = setTimeout(() => {
            this.send("stop");
            finish(null);
          }, budget);
          this.listeners.add(onLine);
          this.send(`position fen ${fen}`);
          if (opts.depth) this.send(`go depth ${opts.depth}`);
          else this.send(`go movetime ${opts.movetime ?? 600}`);
        })
    );
  }

  /**
   * Evaluate a position to a fixed depth. Returns a WHITE-relative score so the
   * eval bar and the coach can reason consistently regardless of side to move.
   */
  async evaluate(fen: string, depth = 12): Promise<EngineScore> {
    await this.init();
    const stm = sideToMoveFromFen(fen);
    return this.enqueue(
      () =>
        new Promise<EngineScore>((resolve) => {
          let last: EngineScore = { cp: 0 };
          let settled = false;
          const finish = () => {
            if (settled) return;
            settled = true;
            this.listeners.delete(onLine);
            clearTimeout(timer);
            resolve(last);
          };
          const onLine: Listener = (line) => {
            if (line.startsWith("info") && line.includes(" score ")) {
              const mateMatch = line.match(/score mate (-?\d+)/);
              const cpMatch = line.match(/score cp (-?\d+)/);
              if (mateMatch) {
                const mate = parseInt(mateMatch[1], 10);
                last = { mate: stm === "w" ? mate : -mate };
              } else if (cpMatch) {
                const cp = parseInt(cpMatch[1], 10);
                last = { cp: stm === "w" ? cp : -cp };
              }
            } else if (line.startsWith("bestmove")) {
              finish();
            }
          };
          const timer = setTimeout(() => {
            this.send("stop");
            finish();
          }, 5000);
          this.listeners.add(onLine);
          this.send(`position fen ${fen}`);
          this.send(`go depth ${depth}`);
        })
    );
  }

  dispose() {
    this.worker?.terminate();
    this.worker = null;
    this.ready = false;
    this.booting = null;
    this.listeners.clear();
  }
}

// Single shared engine instance for the whole app.
export const engine = new StockfishEngine();

/** Convert a white-relative score to a single number for sorting/curves. */
export function scoreToNumber(s: EngineScore): number {
  if (s.mate !== undefined) {
    return s.mate > 0 ? 100000 - s.mate : -100000 - s.mate;
  }
  return s.cp ?? 0;
}

/** Map a white-relative score to a 0..1 "white winning probability"-ish value. */
export function scoreToWhiteAdvantage(s: EngineScore): number {
  if (s.mate !== undefined) return s.mate > 0 ? 1 : 0;
  const cp = s.cp ?? 0;
  // logistic squash, ~ Lichess win% curve
  return 1 / (1 + Math.pow(10, -cp / 400));
}
