import { nextRandom, randomSeed } from "./rng";

export type Direction = "up" | "down" | "left" | "right";
export type Mode = "classic" | "daily" | "timed" | "puzzle";

export interface Tile {
  id: number;
  value: number;
  row: number;
  col: number;
  /** Wildcard tile: merges with anything and doubles it. `value` is 0. */
  wasabi?: boolean;
  /** Spawned this move — gets the "pop in" animation. */
  isNew?: boolean;
  /** Result of a merge this move — gets the "bump" animation. */
  merged?: boolean;
  /** Consumed by a merge this move; kept for one frame so it can slide, then removed. */
  removed?: boolean;
}

export interface GameState {
  size: number;
  mode: Mode;
  tiles: Tile[];
  score: number;
  /** A tile reached the target value at some point. */
  won: boolean;
  /** No moves left (or the clock ran out). */
  over: boolean;
  /** Player chose to continue after winning. */
  keepPlaying: boolean;
  nextId: number;
  /** Seed the game started from; `rng` is the current PRNG state. */
  seed: number;
  rng: number;
  moves: number;
  merges: number;
  wasabiMerges: number;
  /** -1 means unlimited. */
  undosLeft: number;
  undosUsed: number;
  wasabiEnabled: boolean;
  /** Points gained on the most recent move. */
  lastGain: number;
  lastDir: Direction | null;
  /** Timestamp of the first move (ms). Used by timed mode. */
  startedAt: number | null;
  timeUp: boolean;
  /** Which day's puzzle this is (daily mode only). */
  dailyKey?: string;
  /** Stats/leaderboard have already been updated for this game. */
  recorded: boolean;
  /** Moves played by the built-in AI (autoplay). Such games stay off the global board. */
  aiMoves?: number;
  /** Score already sent to the global leaderboard. */
  submitted?: boolean;
  /** Puzzle mode: which puzzle, the tile to make, and the move budget. */
  puzzleId?: string;
  puzzleGoal?: number;
  puzzleLimit?: number;
  /** Coach mode: number of moves the coach rated as blunders. */
  blunders?: number;
  /** Coach mode: the worst-rated moves, for the post-game summary. */
  blunderLog?: { move: number; title: string }[];
  hintsUsed?: number;
  /** Consecutive moves that merged something. */
  combo?: number;
  /** Weekly challenge this game belongs to. */
  challengeId?: string;
  /** Best score this game already celebrated beating. */
  pbCelebrated?: boolean;
}

export const WIN_VALUE = 2048;
export const TIMED_SECONDS = 60;
export const WASABI_CHANCE = 0.035;
/** Wasabi never spawns before this many moves so openings stay classic. */
export const WASABI_MIN_MOVES = 8;
export const BOARD_SIZES = [3, 4, 5, 6] as const;

const VECTORS: Record<Direction, { dr: number; dc: number }> = {
  up: { dr: -1, dc: 0 },
  down: { dr: 1, dc: 0 },
  left: { dr: 0, dc: -1 },
  right: { dr: 0, dc: 1 },
};

export function liveTiles(tiles: Tile[]): Tile[] {
  return tiles.filter((t) => !t.removed);
}

function buildGrid(size: number, tiles: Tile[]): (Tile | null)[][] {
  const grid: (Tile | null)[][] = Array.from({ length: size }, () =>
    Array<Tile | null>(size).fill(null),
  );
  for (const t of liveTiles(tiles)) grid[t.row][t.col] = t;
  return grid;
}

function emptyCells(size: number, tiles: Tile[]): { row: number; col: number }[] {
  const grid = buildGrid(size, tiles);
  const cells: { row: number; col: number }[] = [];
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++) if (!grid[r][c]) cells.push({ row: r, col: c });
  return cells;
}

export function canMerge(a: Tile, b: Tile): boolean {
  return a.value === b.value || !!a.wasabi || !!b.wasabi;
}

export function mergedValue(a: Tile, b: Tile): number {
  if (a.wasabi && b.wasabi) return 4;
  if (a.wasabi) return b.value * 2;
  if (b.wasabi) return a.value * 2;
  return a.value * 2;
}

/** Draw one random number and return it with the advanced state. */
function draw(state: GameState): [number, GameState] {
  const [value, rng] = nextRandom(state.rng);
  return [value, { ...state, rng }];
}

export function spawnTile(state: GameState): GameState {
  const cells = emptyCells(state.size, state.tiles);
  if (cells.length === 0) return state;
  let r: number;
  [r, state] = draw(state);
  const cell = cells[Math.floor(r * cells.length)];
  [r, state] = draw(state);
  const value = r < 0.9 ? 2 : 4;
  [r, state] = draw(state);
  const wasabi =
    state.wasabiEnabled && state.moves >= WASABI_MIN_MOVES && r < WASABI_CHANCE;
  const tile: Tile = {
    id: state.nextId,
    value: wasabi ? 0 : value,
    row: cell.row,
    col: cell.col,
    isNew: true,
    ...(wasabi ? { wasabi: true } : {}),
  };
  return { ...state, tiles: [...state.tiles, tile], nextId: state.nextId + 1 };
}

export interface NewGameOptions {
  size?: number;
  mode?: Mode;
  seed?: number;
  /** -1 for unlimited. */
  undoLimit?: number;
  wasabi?: boolean;
  dailyKey?: string;
}

export function newGame(options: NewGameOptions = {}): GameState {
  const {
    size = 4,
    mode = "classic",
    seed = randomSeed(),
    undoLimit = 3,
    wasabi = true,
    dailyKey,
  } = options;
  let state: GameState = {
    size,
    mode,
    tiles: [],
    score: 0,
    won: false,
    over: false,
    keepPlaying: false,
    nextId: 1,
    seed,
    rng: seed,
    moves: 0,
    merges: 0,
    wasabiMerges: 0,
    undosLeft: undoLimit,
    undosUsed: 0,
    // Daily puzzles stay pure so everyone gets the same board.
    wasabiEnabled: wasabi && mode !== "daily",
    lastGain: 0,
    lastDir: null,
    startedAt: null,
    timeUp: false,
    recorded: false,
    ...(dailyKey ? { dailyKey } : {}),
  };
  state = spawnTile(state);
  state = spawnTile(state);
  return state;
}

export function canMove(state: GameState): boolean {
  const { size } = state;
  const grid = buildGrid(size, state.tiles);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const t = grid[r][c];
      if (!t) return true;
      const below = r + 1 < size ? grid[r + 1][c] : null;
      const right = c + 1 < size ? grid[r][c + 1] : null;
      if (below && canMerge(t, below)) return true;
      if (right && canMerge(t, right)) return true;
    }
  }
  return false;
}

/**
 * Slide every tile in `dir`, merging matching neighbours once per move.
 * Returns the same state object if nothing moved.
 */
export function move(state: GameState, dir: Direction, now: number = Date.now()): GameState {
  if (state.over) return state;
  const { size } = state;
  const { dr, dc } = VECTORS[dir];

  // Traverse from the edge tiles move toward so nearer tiles settle first.
  const rows = [...Array(size).keys()];
  const cols = [...Array(size).keys()];
  if (dr === 1) rows.reverse();
  if (dc === 1) cols.reverse();

  const grid = buildGrid(size, state.tiles);
  const next: Tile[] = [];
  let moved = false;
  let gain = 0;
  let merges = 0;
  let wasabiMerges = 0;
  let won = state.won;
  let nextId = state.nextId;
  // Cells that already received a merge this move.
  const mergedAt = new Set<string>();

  const inBounds = (r: number, c: number) => r >= 0 && r < size && c >= 0 && c < size;

  for (const r of rows) {
    for (const c of cols) {
      const tile = grid[r][c];
      if (!tile) continue;

      // Walk forward until blocked.
      let nr = r;
      let nc = c;
      while (inBounds(nr + dr, nc + dc) && !grid[nr + dr][nc + dc]) {
        nr += dr;
        nc += dc;
      }

      const ahead = inBounds(nr + dr, nc + dc) ? grid[nr + dr][nc + dc] : null;

      if (ahead && canMerge(tile, ahead) && !mergedAt.has(`${nr + dr},${nc + dc}`)) {
        const tr = nr + dr;
        const tc = nc + dc;
        const value = mergedValue(tile, ahead);
        const merged: Tile = { id: nextId++, value, row: tr, col: tc, merged: true };
        grid[tr][tc] = merged;
        grid[r][c] = null;
        mergedAt.add(`${tr},${tc}`);
        // Replace the target tile in `next` with the merged one, keep both originals as ghosts.
        const idx = next.findIndex((t) => t.id === ahead.id);
        if (idx !== -1) next[idx] = { ...ahead, removed: true };
        next.push({ ...tile, row: tr, col: tc, removed: true }, merged);
        gain += value;
        merges++;
        if (tile.wasabi || ahead.wasabi) wasabiMerges++;
        if (value >= WIN_VALUE) won = true;
        moved = true;
      } else {
        const settled: Tile = {
          id: tile.id,
          value: tile.value,
          row: nr,
          col: nc,
          ...(tile.wasabi ? { wasabi: true } : {}),
        };
        grid[r][c] = null;
        grid[nr][nc] = settled;
        next.push(settled);
        if (nr !== r || nc !== c) moved = true;
      }
    }
  }

  if (!moved) return state;

  let result: GameState = {
    ...state,
    tiles: next,
    score: state.score + gain,
    won,
    nextId,
    moves: state.moves + 1,
    merges: state.merges + merges,
    wasabiMerges: state.wasabiMerges + wasabiMerges,
    lastGain: gain,
    lastDir: dir,
    combo: gain > 0 ? (state.combo ?? 0) + 1 : 0,
    startedAt: state.startedAt ?? now,
  };
  result = spawnTile(result);
  result.over = !canMove(result);
  return result;
}

/** Restore `prev` after `current`, spending one undo. */
export function applyUndo(prev: GameState, current: GameState): GameState {
  return {
    ...prev,
    undosLeft: current.undosLeft === -1 ? -1 : Math.max(0, current.undosLeft - 1),
    undosUsed: current.undosUsed + 1,
    // Bookkeeping that must survive an undo: what's been recorded/submitted and how much help was used.
    recorded: current.recorded,
    ...(current.submitted ? { submitted: true } : {}),
    ...(current.aiMoves ? { aiMoves: current.aiMoves } : {}),
    ...(current.hintsUsed ? { hintsUsed: current.hintsUsed } : {}),
    ...(current.blunders ? { blunders: current.blunders } : {}),
    lastGain: 0,
    lastDir: null,
  };
}

/** Keyboard keys that move the board: arrows, WASD and vim-style hjkl. */
export const KEY_MAP: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  s: "down",
  a: "left",
  d: "right",
  k: "up",
  j: "down",
  h: "left",
  l: "right",
};

export function canUndo(state: GameState): boolean {
  return !state.timeUp && (state.undosLeft === -1 || state.undosLeft > 0);
}

/** Timed mode: seconds remaining, or null when the clock hasn't started. */
export function timeLeft(state: GameState, now: number = Date.now()): number | null {
  if (state.mode !== "timed") return null;
  if (state.startedAt === null) return TIMED_SECONDS;
  return Math.max(0, TIMED_SECONDS - (now - state.startedAt) / 1000);
}

/** Timed mode: end the game once the clock has run out. */
export function tick(state: GameState, now: number = Date.now()): GameState {
  if (state.mode !== "timed" || state.timeUp || state.over) return state;
  const left = timeLeft(state, now);
  if (left !== null && left <= 0) return { ...state, timeUp: true, over: true };
  return state;
}

/** Drop merge ghosts and clear one-shot animation flags. */
export function settle(state: GameState): GameState {
  return {
    ...state,
    tiles: liveTiles(state.tiles).map(({ id, value, row, col, wasabi }) => ({
      id,
      value,
      row,
      col,
      ...(wasabi ? { wasabi: true } : {}),
    })),
  };
}

export function highestTile(state: GameState): number {
  return liveTiles(state.tiles).reduce((m, t) => Math.max(m, t.value), 0);
}

/** Every distinct dish value currently on the board. */
export function tileValues(state: GameState): number[] {
  return [...new Set(liveTiles(state.tiles).filter((t) => !t.wasabi).map((t) => t.value))];
}

export function isBoardFull(state: GameState): boolean {
  return liveTiles(state.tiles).length === state.size * state.size;
}
