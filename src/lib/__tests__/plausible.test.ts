import { describe, expect, it } from "vitest";
import { plausibleScore } from "../plausible";

describe("plausibleScore", () => {
  it("accepts typical scores for each tier", () => {
    expect(plausibleScore(40, 8)).toBe(true);
    expect(plausibleScore(5_000, 512)).toBe(true);
    expect(plausibleScore(20_000, 2048)).toBe(true);
    expect(plausibleScore(105_728, 32_768)).toBe(true); // observed AI game
    expect(plausibleScore(2_100_000, 131_072)).toBe(true);
  });
  it("rejects impossible scores and bad tiles", () => {
    expect(plausibleScore(999_999, 8)).toBe(false);
    expect(plausibleScore(0, 64)).toBe(false); // can't hold a 64 with zero points
    expect(plausibleScore(-1, 8)).toBe(false);
    expect(plausibleScore(10, 6)).toBe(false);
    expect(plausibleScore(1.5, 8)).toBe(false);
  });
});
