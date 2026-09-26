import { describe, expect, it } from "vitest";
import { move, newGame, settle } from "../game";
import { ACHIEVEMENTS, EMPTY_PROGRESS, afterMove, dailyStreak, recordGameEnd } from "../progress";

describe("progress", () => {
  it("has unique achievement ids", () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("adds ninjas to the passport and unlocks First Strike", () => {
    let g = newGame({ seed: 5, wasabi: false });
    let p = EMPTY_PROGRESS;
    for (let i = 0; i < 40 && !g.over; i++) {
      g = settle(move(g, (["left", "up", "right", "down"] as const)[i % 4]));
      p = afterMove(p, g).progress;
    }
    expect(Object.keys(p.passport).length).toBeGreaterThan(0);
    expect(p.achievements["first-bite"]).toBeTruthy();
  });

  it("records a finished game once into stats and leaderboard", () => {
    const g = { ...newGame({ seed: 1 }), moves: 50, score: 400, over: true };
    const p = recordGameEnd(EMPTY_PROGRESS, g).progress;
    expect(p.stats.gamesPlayed).toBe(1);
    expect(p.leaderboard[0].score).toBe(400);
  });

  it("counts daily streaks including a not-yet-played today", () => {
    const p = { ...EMPTY_PROGRESS, dailyBests: { "2026-09-18": 10, "2026-09-19": 20 } };
    expect(dailyStreak(p, "2026-09-20")).toBe(2);
    expect(dailyStreak({ ...p, dailyBests: { ...p.dailyBests, "2026-09-20": 5 } }, "2026-09-20")).toBe(3);
    expect(dailyStreak(EMPTY_PROGRESS, "2026-09-20")).toBe(0);
  });
});
