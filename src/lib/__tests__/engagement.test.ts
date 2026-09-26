import { describe, expect, it } from "vitest";
import {
  dailyMissions,
  levelForXp,
  levelInfo,
  nearMiss,
  weekKey,
  weeklyChallenge,
  xpForGame,
  xpForLevel,
} from "../engagement";
import { newGame, type GameState, type Tile } from "../game";
import { EMPTY_PROGRESS, dailyStreak, earnFreezeIfDue, maintainStreak } from "../progress";

function mk(cells: number[][], extra: Partial<GameState> = {}): GameState {
  const tiles: Tile[] = [];
  let id = 1;
  cells.forEach((row, r) => row.forEach((v, c) => v && tiles.push({ id: id++, value: v, row: r, col: c })));
  return { ...newGame({ size: 4, seed: 1, wasabi: false }), tiles, nextId: id, ...extra };
}

describe("levels", () => {
  it("has a monotonic curve and consistent lookups", () => {
    for (let l = 1; l < 30; l++) expect(xpForLevel(l + 1)).toBeGreaterThan(xpForLevel(l));
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(xpForLevel(7))).toBe(7);
    expect(levelForXp(xpForLevel(7) - 1)).toBe(6);
    const info = levelInfo(xpForLevel(5) + 10);
    expect(info.level).toBe(5);
    expect(info.into).toBe(10);
  });
  it("rewards wins and modes", () => {
    const base = { ...newGame({ seed: 1 }), score: 2500, merges: 200, moves: 300 };
    expect(xpForGame(base)).toBe(150);
    expect(xpForGame({ ...base, won: true })).toBe(230);
    expect(xpForGame({ ...base, mode: "puzzle" })).toBe(0);
  });
});

describe("missions", () => {
  it("are the same for everyone on a given day and differ across days", () => {
    const a = dailyMissions("2026-09-20").map((m) => m.id);
    const b = dailyMissions("2026-09-20").map((m) => m.id);
    const c = dailyMissions("2026-09-21").map((m) => m.id);
    expect(a).toEqual(b);
    expect(a).toHaveLength(3);
    expect(new Set(a).size).toBe(3);
    expect(a).not.toEqual(c);
  });
  it("checks against the board", () => {
    const g = mk([[64, 64, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
    const two64 = dailyMissions("2026-01-01").find((m) => m.id === "two-64");
    // Not necessarily picked that day; test the pool logic directly via any day containing it.
    const day = ["2026-01-01", "2026-01-02", "2026-01-03", "2026-01-04", "2026-01-05", "2026-01-06", "2026-01-07"]
      .map((d) => dailyMissions(d).find((m) => m.id === "two-64"))
      .find(Boolean) ?? two64;
    if (day) expect(day.check(g, EMPTY_PROGRESS)).toBe(true);
  });
});

describe("weekly", () => {
  it("uses ISO week keys and rotates rules", () => {
    expect(weekKey(new Date(2026, 8, 20))).toBe("2026-W38");
    expect(weekKey(new Date(2026, 0, 1))).toBe("2026-W01");
    const w = weeklyChallenge("2026-W38");
    expect(w.id).toBe("2026-W38");
    expect(w.size).toBeGreaterThanOrEqual(3);
    const ids = new Set(Array.from({ length: 12 }, (_, i) => weeklyChallenge(`2026-W${String(i + 1).padStart(2, "0")}`).name));
    expect(ids.size).toBeGreaterThan(2);
  });
});

describe("near miss", () => {
  it("spots one merge from the next ninja", () => {
    const g = mk([[256, 256, 2, 4], [4, 2, 4, 2], [2, 4, 2, 4], [4, 2, 4, 2]], { score: 3000 });
    expect(nearMiss(g, 5000).dish).toBe("one merge from Storm Guard");
  });
  it("frames the score gap and personal bests", () => {
    const g = mk([[2, 4, 2, 4], [4, 2, 4, 2], [2, 4, 2, 4], [4, 2, 4, 2]], { score: 900 });
    expect(nearMiss(g, 1000).score).toBe("100 points off your best");
    expect(nearMiss(g, 5000).score).toBeUndefined();
    expect(nearMiss({ ...g, score: 1200 }, 1000).personalBest).toBe(true);
  });
});

describe("streak freeze", () => {
  it("protects a single missed day when a freeze is banked", () => {
    const p = { ...EMPTY_PROGRESS, streakFreezes: 1, dailyBests: { "2026-09-17": 1, "2026-09-18": 1 } };
    expect(dailyStreak(p, "2026-09-20")).toBe(0);
    const kept = maintainStreak(p, "2026-09-20");
    expect(kept.frozenDays).toContain("2026-09-19");
    expect(kept.streakFreezes).toBe(0);
    expect(dailyStreak(kept, "2026-09-20")).toBe(2);
  });
  it("earns a freeze at a 7-day milestone", () => {
    const days: Record<string, number> = {};
    for (let d = 14; d <= 20; d++) days[`2026-09-${d}`] = 1;
    const res = earnFreezeIfDue({ ...EMPTY_PROGRESS, dailyBests: days }, "2026-09-20");
    expect(res.earned).toBe(true);
    expect(res.progress.streakFreezes).toBe(1);
    expect(earnFreezeIfDue(res.progress, "2026-09-20").earned).toBe(false);
  });
});
