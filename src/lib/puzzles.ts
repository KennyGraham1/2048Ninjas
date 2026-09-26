import { highestTile, newGame, type GameState, type Tile } from "./game";
import { PUZZLE_DATA } from "./puzzleData";

export interface Puzzle {
  id: string;
  name: string;
  /** 16 values, row-major; 0 = empty. */
  grid: readonly number[];
  goal: number;
  /** Fewest moves that can solve it. */
  par: number;
  /** PRNG state so the spawned tiles are the same every attempt. */
  rng: number;
}

export const PUZZLES: Puzzle[] = PUZZLE_DATA.map((p) => ({ ...p }));
export const PUZZLE_SIZE = 4;
/** Moves allowed = par + slack. */
export const PUZZLE_SLACK = 2;

export function puzzleById(id: string): Puzzle | undefined {
  return PUZZLES.find((p) => p.id === id);
}

export function puzzleLimit(p: Puzzle): number {
  return p.par + PUZZLE_SLACK;
}

/** Build a game state for a puzzle: fixed board, deterministic spawns, no wasabi. */
export function puzzleGame(p: Puzzle): GameState {
  const base = newGame({ size: PUZZLE_SIZE, mode: "puzzle", seed: p.rng, wasabi: false, undoLimit: -1 });
  const tiles: Tile[] = [];
  let id = 1;
  p.grid.forEach((v, i) => {
    if (v) tiles.push({ id: id++, value: v, row: Math.floor(i / PUZZLE_SIZE), col: i % PUZZLE_SIZE });
  });
  return {
    ...base,
    tiles,
    nextId: id,
    rng: p.rng,
    puzzleId: p.id,
    puzzleGoal: p.goal,
    puzzleLimit: puzzleLimit(p),
  };
}

export type PuzzleStatus = "playing" | "solved" | "failed";

export function puzzleStatus(state: GameState): PuzzleStatus {
  if (!state.puzzleGoal || !state.puzzleLimit) return "playing";
  if (highestTile(state) >= state.puzzleGoal) return "solved";
  if (state.moves >= state.puzzleLimit || state.over) return "failed";
  return "playing";
}

/** 3 stars at par, 2 within one extra move, 1 for any solve. */
export function puzzleStars(p: Puzzle, moves: number): number {
  if (moves <= p.par) return 3;
  if (moves <= p.par + 1) return 2;
  return 1;
}
