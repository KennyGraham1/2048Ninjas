import { describe, expect, it } from "vitest";
import {
  applyUndo,
  canMove,
  move,
  newGame,
  settle,
  tick,
  timeLeft,
  type GameState,
  type Tile,
} from "../game";

/** Build a state from a grid; -1 = wasabi. */
function mk(cells: number[][], extra: Partial<GameState> = {}): GameState {
  const tiles: Tile[] = [];
  let id = 1;
  cells.forEach((row, r) =>
    row.forEach((v, c) => {
      if (v === -1) tiles.push({ id: id++, value: 0, row: r, col: c, wasabi: true });
      else if (v) tiles.push({ id: id++, value: v, row: r, col: c });
    }),
  );
  return { ...newGame({ size: cells.length, wasabi: false }), tiles, nextId: id, score: 0, moves: 20, rng: 12345, ...extra };
}

function grid(s: GameState): number[][] {
  const g = Array.from({ length: s.size }, () => Array(s.size).fill(0));
  for (const t of settle(s).tiles) g[t.row][t.col] = t.wasabi ? -1 : t.value;
  return g;
}

const DIRS = ["left", "up", "right", "down"] as const;

describe("move", () => {
  it("merges once per move and slides toward the edge", () => {
    const s = move(mk([[2, 2, 4, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]), "left");
    expect(grid(s)[0]).toEqual([4, 4, 0, 0]);
    expect(s.score).toBe(4);
    expect(s.merges).toBe(1);
  });

  it("merges pairs from the far edge first", () => {
    const s = move(mk([[2, 2, 2, 2], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]), "right");
    expect(grid(s)[0]).toEqual([0, 0, 4, 4]);
    const d = move(mk([[2, 0, 0, 0], [4, 0, 0, 0], [4, 0, 0, 0], [2, 0, 0, 0]]), "down");
    expect(grid(d).map((r) => r[0])).toEqual([0, 2, 8, 2]);
  });

  it("returns the same object when nothing moves", () => {
    const s = mk([[2, 4, 8, 16], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
    expect(move(s, "left")).toBe(s);
  });

  it("flags a win at 2048", () => {
    expect(move(mk([[1024, 1024, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]), "left").won).toBe(true);
  });

  it("detects game over", () => {
    expect(canMove(mk([[2, 4, 2, 4], [4, 2, 4, 2], [2, 4, 2, 4], [4, 2, 4, 8]]))).toBe(false);
  });
});

describe("wasabi", () => {
  it("merges with anything and doubles the partner", () => {
    const s = move(mk([[-1, 8, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]), "right");
    expect(grid(s)[0]).toContain(16);
    expect(s.wasabiMerges).toBe(1);
  });
  it("two smoke bomb make a 4", () => {
    expect(grid(move(mk([[-1, -1, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]), "left"))[0][0]).toBe(4);
  });
  it("keeps a full board alive", () => {
    expect(canMove(mk([[2, 4, 2, 4], [4, 2, 4, 2], [2, 4, 2, 4], [4, 2, 4, -1]]))).toBe(true);
  });
  it("is disabled in daily mode and never spawns early", () => {
    expect(newGame({ mode: "daily", seed: 7, wasabi: true }).wasabiEnabled).toBe(false);
    let g = newGame({ seed: 3, wasabi: true });
    for (let i = 0; i < 7; i++) g = settle(move(g, DIRS[i % 4]));
    expect(g.tiles.some((t) => t.wasabi)).toBe(false);
  });
});

describe("determinism", () => {
  it("same seed gives the same game", () => {
    let a = newGame({ seed: 42 });
    let b = newGame({ seed: 42 });
    expect(grid(a)).toEqual(grid(b));
    for (const d of ["left", "up", "right", "down", "left", "left"] as const) {
      a = settle(move(a, d));
      b = settle(move(b, d));
    }
    expect(grid(a)).toEqual(grid(b));
  });
});

describe("undo + timer", () => {
  it("restores the previous board and spends an undo", () => {
    const before = mk([[2, 2, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], { undosLeft: 3 });
    const after = move(before, "left");
    const undone = applyUndo(settle(before), after);
    expect(grid(undone)).toEqual(grid(before));
    expect(undone.undosLeft).toBe(2);
    expect(applyUndo(settle(before), { ...after, undosLeft: -1 }).undosLeft).toBe(-1);
  });

  it("starts the clock on the first move and ends at zero", () => {
    let t = newGame({ mode: "timed", seed: 9 });
    expect(timeLeft(t, 0)).toBe(60);
    t = move(t, "left", 1000);
    expect(t.startedAt).toBe(1000);
    expect(Math.round(timeLeft(t, 31000)!)).toBe(30);
    expect(tick(t, 31000).over).toBe(false);
    expect(tick(t, 61001)).toMatchObject({ over: true, timeUp: true });
  });
});

describe("board sizes", () => {
  it.each([3, 4, 5, 6])("plays a full game on %ix%i without escaping the board", (size) => {
    let g = newGame({ size, seed: size });
    for (let i = 0; i < 400 && !g.over; i++) g = settle(move(g, DIRS[i % 4]));
    expect(g.tiles.every((t) => t.row < size && t.col < size)).toBe(true);
  });
});

describe("undo bookkeeping", () => {
  it("keeps submitted / ai / hint counters across an undo", () => {
    const before = mk([[2, 2, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
    const after = { ...move(before, "left"), submitted: true, aiMoves: 3, hintsUsed: 2, blunders: 1 };
    const undone = applyUndo(settle(before), after);
    expect(undone).toMatchObject({ submitted: true, aiMoves: 3, hintsUsed: 2, blunders: 1 });
  });
});
