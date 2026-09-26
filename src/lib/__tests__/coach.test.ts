import { describe, expect, it } from "vitest";
import { scoreMoves } from "../ai";
import { boardAdvice, reviewMove } from "../coach";
import { move, newGame, type GameState, type Tile } from "../game";

function mk(cells: number[][]): GameState {
  const tiles: Tile[] = [];
  let id = 1;
  cells.forEach((row, r) => row.forEach((v, c) => v && tiles.push({ id: id++, value: v, row: r, col: c })));
  return { ...newGame({ size: 4, wasabi: false, seed: 1 }), tiles, nextId: id, moves: 30, rng: 99 };
}

describe("coach", () => {
  it("calls out moving the anchor out of its corner", () => {
    // 256 anchored bottom-left; moving up drags it away.
    const before = mk([[0, 0, 0, 0], [0, 0, 0, 0], [2, 0, 0, 0], [256, 128, 64, 32]]);
    const after = move(before, "up");
    const note = reviewMove(before, "up", after);
    expect(note.rating).toBe("blunder");
    expect(note.title).toMatch(/corner/i);
  });

  it("does not blame you for a new biggest tile appearing elsewhere", () => {
    // Merging two 128s in the middle creates a new max; the 64 anchor stays put.
    const before = mk([[64, 0, 0, 0], [0, 128, 128, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
    const after = move(before, "left");
    const note = reviewMove(before, "left", after);
    expect(note.title).not.toMatch(/out of the corner/i);
  });

  it("agrees with the AI on its own best move", () => {
    let g = newGame({ seed: 77, wasabi: false });
    for (let i = 0; i < 15; i++) g = move(g, (["left", "down", "left", "down", "right"] as const)[i % 5]);
    // A large budget lets both searches finish the same depth, so the comparison is deterministic.
    const ranked = scoreMoves(g, 5000)!;
    const after = move(g, ranked.best);
    if (after !== g) {
      const note = reviewMove(g, ranked.best, after, 5000);
      expect(["great", "good", "risky"]).toContain(note.rating);
      expect(note.better).toBeUndefined();
    }
  }, 15_000); // Two searches can each use their full 5-second budget.

  it("gives board advice when the big tile is off-corner", () => {
    const g = mk([[0, 0, 0, 0], [0, 128, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
    expect(boardAdvice(g).some((t) => /corner/i.test(t))).toBe(true);
  });
});
