/**
 * Sanity bounds for a submitted score given the highest tile reached.
 * Building a tile of value T from 2s scores T·(log2 T − 1) points on its own; a board can hold
 * a few large tiles besides the top one, so allow about double that, plus slack for small merges.
 * 4-spawns reduce the score, so the floor is loose.
 */
export function plausibleScore(score: number, top: number): boolean {
  if (!Number.isInteger(score) || score < 0) return false;
  if (!Number.isInteger(top) || top < 2 || (top & (top - 1)) !== 0) return false;
  const log = Math.log2(top);
  const ceiling = 2.2 * top * Math.max(1, log - 1) + 64;
  const floor = Math.max(0, top / 2 - 4);
  return score >= floor && score <= ceiling;
}
