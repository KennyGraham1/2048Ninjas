import { describe, expect, it } from "vitest";
import { highestTile, liveTiles, move, settle, type Direction, type GameState } from "../game";
import { PUZZLES, puzzleGame, puzzleLimit, puzzleStatus } from "../puzzles";

const DIRS: Direction[] = ["up", "down", "left", "right"];

/** Fewest moves to reach the goal, or null within maxDepth. */
function solve(start: GameState, goal: number, maxDepth: number): number | null {
  let frontier = [start];
  for (let d = 1; d <= maxDepth; d++) {
    const next: GameState[] = [];
    for (const s of frontier)
      for (const dir of DIRS) {
        const n = move(s, dir);
        if (n === s) continue;
        const st = settle(n);
        if (highestTile(st) >= goal) return d;
        if (!st.over) next.push(st);
      }
    frontier = next;
  }
  return null;
}

describe("puzzles", () => {
  it.each(PUZZLES.map((p) => [p.name, p] as const))("%s is solvable exactly at par", (_name, p) => {
    const g = puzzleGame(p);
    expect(liveTiles(g.tiles).length).toBe(p.grid.filter(Boolean).length);
    expect(solve(g, p.goal, p.par)).toBe(p.par);
    expect(solve(g, p.goal, p.par - 1)).toBeNull();
  });

  it("reports failed once the move budget is spent", () => {
    const p = PUZZLES[0];
    let g = puzzleGame(p);
    // Deliberately burn moves without reaching the goal is not guaranteed, so just check the budget rule.
    g = { ...g, moves: puzzleLimit(p) };
    if (highestTile(g) < p.goal) expect(puzzleStatus(g)).toBe("failed");
  });
});
