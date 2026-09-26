import { WASABI_CHANCE, WASABI_MIN_MOVES, liveTiles, type Direction, type GameState } from "./game";

/**
 * Expectimax search over a plain numeric grid. Wasabi tiles are encoded as -1.
 * Works for any board size; depth adapts to keep the search under a time budget.
 */

export type Grid = number[][];
const DIRS: Direction[] = ["up", "down", "left", "right"];

export function toGrid(state: GameState): Grid {
  const g: Grid = Array.from({ length: state.size }, () => Array(state.size).fill(0));
  for (const t of liveTiles(state.tiles)) g[t.row][t.col] = t.wasabi ? -1 : t.value;
  return g;
}

function canPair(a: number, b: number): boolean {
  return a === b || a === -1 || b === -1;
}

function pairValue(a: number, b: number): number {
  if (a === -1 && b === -1) return 4;
  return (a === -1 ? b : a) * 2;
}

/** Slide one line toward index 0. Returns the new line and points gained, or null if unchanged. */
function slideLine(line: number[]): [number[], number] | null {
  const n = line.length;
  const out: number[] = [];
  let gain = 0;
  let last: number | null = null;
  let lastMerged = false;
  for (const v of line) {
    if (v === 0) continue;
    if (last !== null && !lastMerged && canPair(last, v)) {
      const m = pairValue(last, v);
      out[out.length - 1] = m;
      gain += m;
      lastMerged = true;
      last = m;
    } else {
      out.push(v);
      last = v;
      lastMerged = false;
    }
  }
  while (out.length < n) out.push(0);
  let changed = false;
  for (let i = 0; i < n; i++) if (out[i] !== line[i]) { changed = true; break; }
  return changed ? [out, gain] : null;
}

/** Apply a move to a grid. Returns null if nothing moved. */
export function slideGrid(grid: Grid, dir: Direction): [Grid, number] | null {
  const n = grid.length;
  const next: Grid = grid.map((r) => [...r]);
  let moved = false;
  let gain = 0;
  for (let i = 0; i < n; i++) {
    let line: number[];
    if (dir === "left") line = grid[i];
    else if (dir === "right") line = [...grid[i]].reverse();
    else if (dir === "up") line = grid.map((r) => r[i]);
    else line = grid.map((r) => r[i]).reverse();

    const res = slideLine(line);
    if (!res) continue;
    moved = true;
    gain += res[1];
    const [out] = res;
    if (dir === "left") next[i] = out;
    else if (dir === "right") next[i] = [...out].reverse();
    else if (dir === "up") out.forEach((v, r) => (next[r][i] = v));
    else [...out].reverse().forEach((v, r) => (next[r][i] = v));
  }
  return moved ? [next, gain] : null;
}

function emptyCells(grid: Grid): [number, number][] {
  const cells: [number, number][] = [];
  for (let r = 0; r < grid.length; r++)
    for (let c = 0; c < grid.length; c++) if (grid[r][c] === 0) cells.push([r, c]);
  return cells;
}

/** Heuristic score of a grid: higher is better. */
export function evaluate(grid: Grid): number {
  const n = grid.length;
  let empty = 0;
  let smooth = 0;
  let mono = 0;
  let max = 0;
  let maxPos: [number, number] = [0, 0];
  const log = (v: number) => (v <= 0 ? 0 : Math.log2(v));

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const v = grid[r][c];
      if (v === 0) {
        empty++;
        continue;
      }
      if (v > max) {
        max = v;
        maxPos = [r, c];
      }
      const lv = log(v);
      if (c + 1 < n && grid[r][c + 1] > 0) smooth -= Math.abs(lv - log(grid[r][c + 1]));
      if (r + 1 < n && grid[r + 1][c] > 0) smooth -= Math.abs(lv - log(grid[r + 1][c]));
    }
  }

  // Monotonicity: reward rows/columns that consistently increase or decrease.
  for (let r = 0; r < n; r++) {
    let inc = 0;
    let dec = 0;
    for (let c = 0; c + 1 < n; c++) {
      const a = log(grid[r][c]);
      const b = log(grid[r][c + 1]);
      if (a > b) dec += a - b;
      else inc += b - a;
    }
    mono -= Math.min(inc, dec);
  }
  for (let c = 0; c < n; c++) {
    let inc = 0;
    let dec = 0;
    for (let r = 0; r + 1 < n; r++) {
      const a = log(grid[r][c]);
      const b = log(grid[r + 1][c]);
      if (a > b) dec += a - b;
      else inc += b - a;
    }
    mono -= Math.min(inc, dec);
  }

  const inCorner =
    (maxPos[0] === 0 || maxPos[0] === n - 1) && (maxPos[1] === 0 || maxPos[1] === n - 1);
  return empty * 2.7 + smooth * 0.1 + mono * 1.0 + log(max) * 1.0 + (inCorner ? 2.0 : 0);
}

interface SearchCtx {
  deadline: number;
  nodes: number;
  wasabiPossible: boolean;
  timedOut: boolean;
}

/** Pick `n` items evenly spaced through `items`, rotating the starting offset by `salt`. */
function spread<T>(items: T[], n: number, salt: number): T[] {
  const step = items.length / n;
  const offset = (salt * 0.37) % step;
  const out: T[] = [];
  for (let i = 0; i < n; i++) out.push(items[Math.floor(offset + i * step) % items.length]);
  return out;
}

function chanceNode(grid: Grid, depth: number, ctx: SearchCtx): number {
  if (depth === 0) return evaluate(grid);
  const cells = emptyCells(grid);
  if (cells.length === 0) return evaluate(grid);
  if (performance.now() > ctx.deadline) {
    ctx.timedOut = true;
    return evaluate(grid);
  }
  // Sample at most 8 empty cells, spread evenly across the list, so branching stays sane on
  // big or crowded boards without always favouring the same corner.
  const sample = cells.length > 8 ? spread(cells, 8, depth) : cells;
  let total = 0;
  for (const [r, c] of sample) {
    const options: [number, number][] = ctx.wasabiPossible
      ? [
          [2, 0.9 * (1 - WASABI_CHANCE)],
          [4, 0.1 * (1 - WASABI_CHANCE)],
          [-1, WASABI_CHANCE],
        ]
      : [
          [2, 0.9],
          [4, 0.1],
        ];
    for (const [v, p] of options) {
      grid[r][c] = v;
      total += p * maxNode(grid, depth - 1, ctx);
      grid[r][c] = 0;
    }
  }
  return total / sample.length;
}

function maxNode(grid: Grid, depth: number, ctx: SearchCtx): number {
  ctx.nodes++;
  let best = -Infinity;
  for (const d of DIRS) {
    const res = slideGrid(grid, d);
    if (!res) continue;
    const v = chanceNode(res[0], depth, ctx);
    if (v > best) best = v;
  }
  return best === -Infinity ? evaluate(grid) - 1000 : best;
}

export interface Suggestion {
  dir: Direction;
  depth: number;
  nodes: number;
}

export interface MoveScores {
  /** Search value per legal direction (higher is better). */
  scores: Partial<Record<Direction, number>>;
  best: Direction;
  depth: number;
  nodes: number;
}

/**
 * Score every legal direction with the same iterative-deepening expectimax, within `budgetMs`.
 * Returns null when no move is possible.
 */
export function scoreMoves(state: GameState, budgetMs = 40): MoveScores | null {
  const grid = toGrid(state);
  const legal = DIRS.filter((d) => slideGrid(grid, d) !== null);
  if (legal.length === 0) return null;

  const wasabiPossible = state.wasabiEnabled && state.moves >= WASABI_MIN_MOVES - 1;
  const start = performance.now();
  const maxDepth = state.size <= 4 ? 4 : state.size === 5 ? 3 : 2;
  let result: MoveScores = { scores: {}, best: legal[0], depth: 0, nodes: 0 };

  for (let depth = 1; depth <= maxDepth; depth++) {
    const ctx: SearchCtx = { deadline: start + budgetMs, nodes: 0, wasabiPossible, timedOut: false };
    const scores: Partial<Record<Direction, number>> = {};
    let best = legal[0];
    let bestVal = -Infinity;
    for (const d of legal) {
      const res = slideGrid(grid, d)!;
      const v = chanceNode(res[0], depth - 1, ctx) + res[1] * 0.01;
      scores[d] = v;
      if (v > bestVal) {
        bestVal = v;
        best = d;
      }
    }
    // A timed-out level is incomplete; keep the last full one.
    if (ctx.timedOut && depth > 1) break;
    result = { scores, best, depth, nodes: ctx.nodes };
    if (performance.now() - start > budgetMs / 2) break;
  }
  return result;
}

/** Pick the best move within roughly `budgetMs`. */
export function bestMove(state: GameState, budgetMs = 40): Suggestion | null {
  const r = scoreMoves(state, budgetMs);
  return r ? { dir: r.best, depth: r.depth, nodes: r.nodes } : null;
}
