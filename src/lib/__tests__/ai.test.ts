import { describe, expect, it } from "vitest";
import { bestMove, scoreMoves, slideGrid } from "../ai";
import { highestTile, move, newGame, settle } from "../game";

describe("ai grid", () => {
  it("slides and merges like the engine", () => {
    expect(slideGrid([[2, 2, 4, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], "left")).toEqual([
      [[4, 4, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
      4,
    ]);
    expect(slideGrid([[-1, 8, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], "left")![0][0]).toEqual([16, 0, 0, 0]);
    expect(slideGrid([[2, 4, 8, 16], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], "left")).toBeNull();
  });
});

describe("bestMove", () => {
  it("only suggests legal moves and plays a competent game", () => {
    let g = newGame({ size: 4, seed: 12345, wasabi: false });
    let moves = 0;
    while (!g.over && moves < 600) {
      const s = bestMove(g, 5);
      expect(s).not.toBeNull();
      const n = move(g, s!.dir);
      expect(n).not.toBe(g);
      g = settle(n);
      moves++;
    }
    // A competent 4x4 player reaches at least 256 well within 600 moves.
    expect(highestTile(g)).toBeGreaterThanOrEqual(256);
  });
});

describe("scoreMoves", () => {
  it("scores every legal direction and agrees with bestMove", () => {
    const g = newGame({ seed: 2024, wasabi: false });
    const r = scoreMoves(g, 20)!;
    const dirs = Object.keys(r.scores);
    expect(dirs.length).toBeGreaterThan(0);
    expect(r.scores[r.best]).toBe(Math.max(...Object.values(r.scores)));
    expect(bestMove(g, 20)!.dir).toBe(r.best);
  });
});
