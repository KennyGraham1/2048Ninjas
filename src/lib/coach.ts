import { scoreMoves, slideGrid, toGrid, type Grid } from "./ai";
import type { Direction, GameState } from "./game";

/**
 * The Coach compares the move you made against what the AI would have done and
 * looks at the shape of your board to give short, concrete advice.
 */

export type Rating = "great" | "good" | "okay" | "risky" | "blunder";

export interface CoachNote {
  rating: Rating;
  /** One-line headline. */
  title: string;
  /** Why, in a sentence or two. */
  detail: string;
  /** What the AI would have played instead, if different. */
  better?: Direction;
}

const DIR_WORD: Record<Direction, string> = { up: "up", down: "down", left: "left", right: "right" };

function cornerOf(grid: Grid): { r: number; c: number; value: number } {
  const n = grid.length;
  let best = { r: 0, c: 0, value: 0 };
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) if (grid[r][c] > best.value) best = { r, c, value: grid[r][c] };
  return best;
}

function isCorner(grid: Grid, r: number, c: number): boolean {
  const n = grid.length;
  return (r === 0 || r === n - 1) && (c === 0 || c === n - 1);
}

function inCorner(grid: Grid): boolean {
  const { r, c } = cornerOf(grid);
  return isCorner(grid, r, c);
}

/**
 * Did the anchor tile leave its corner? True only when the biggest tile sat in a corner before
 * and that corner no longer holds a tile of at least that value — making a new, bigger dish
 * elsewhere is not the same mistake.
 */
function anchorLost(before: Grid, after: Grid): boolean {
  const anchor = cornerOf(before);
  if (anchor.value < 32 || !isCorner(before, anchor.r, anchor.c)) return false;
  return after[anchor.r][anchor.c] < anchor.value;
}

function empties(grid: Grid): number {
  return grid.flat().filter((v) => v === 0).length;
}

/** Number of small tiles (2/4) wedged between larger ones — a common way to get stuck. */
function trappedSmalls(grid: Grid): number {
  const n = grid.length;
  let count = 0;
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) {
      const v = grid[r][c];
      if (v !== 2 && v !== 4) continue;
      const around = [
        r > 0 ? grid[r - 1][c] : -2,
        r < n - 1 ? grid[r + 1][c] : -2,
        c > 0 ? grid[r][c - 1] : -2,
        c < n - 1 ? grid[r][c + 1] : -2,
      ];
      // -2 marks a wall. Trapped = every neighbour is a wall or a tile ≥ 4× bigger.
      if (around.every((a) => a === -2 || (a > 0 && a >= v * 4))) count++;
    }
  return count;
}

/** Rate the move that turned `before` into `after`. */
export function reviewMove(before: GameState, dir: Direction, after: GameState, budgetMs = 80): CoachNote {
  const gridBefore = toGrid(before);
  const gridAfter = toGrid(after);
  // The board right after your slide, before the random tile appeared — that's what you chose.
  const chosen = slideGrid(gridBefore, dir)?.[0] ?? gridAfter;

  // Rate every direction with the same search so the comparison is apples to apples.
  const ranked = scoreMoves(before, budgetMs);
  const best = ranked ? { dir: ranked.best } : null;
  const myScore = ranked?.scores[dir] ?? 0;
  const bestScore = ranked ? ranked.scores[ranked.best]! : myScore;
  const gap = bestScore - myScore;
  const sameMove = !best || best.dir === dir;

  const hasCorner = inCorner(gridAfter);
  const lostCorner = anchorLost(gridBefore, chosen);
  const e = empties(gridAfter);
  const trapped = trappedSmalls(chosen);

  if (lostCorner) {
    return {
      rating: "blunder",
      title: "You moved your biggest ninja out of the corner",
      detail:
        "Keep your largest tile pinned in one corner and build a chain down the edge. Moving it out breaks the chain and it's hard to get back.",
      better: sameMove ? undefined : best?.dir,
    };
  }
  if (!sameMove && gap > 6) {
    return {
      rating: "blunder",
      title: `${DIR_WORD[best!.dir][0].toUpperCase() + DIR_WORD[best!.dir].slice(1)} was much stronger`,
      detail:
        e <= 2
          ? "With so few empty cells, every move needs to create a merge or open space."
          : "That move scattered tiles away from your anchor edge. Prefer moves that keep rows sorted from big to small.",
      better: best!.dir,
    };
  }
  if (trapped > 0 && trapped > trappedSmalls(gridBefore)) {
    return {
      rating: "risky",
      title: "A small tile just got trapped",
      detail:
        "A Rookie or Apprentice wedged between big ninjas can't merge with anything. Try to free it before building on top of it.",
      better: sameMove ? undefined : best?.dir,
    };
  }
  if (!sameMove && gap > 2.5) {
    return {
      rating: "okay",
      title: "Playable, but there was a better move",
      detail: `The AI preferred ${DIR_WORD[best!.dir]}. Ask yourself: does this move keep my big tiles on one edge?`,
      better: best!.dir,
    };
  }
  if (e <= 2) {
    return {
      rating: "risky",
      title: "Running out of room",
      detail: `Only ${e} empty cell${e === 1 ? "" : "s"} left. Look for a move that merges two pairs at once, and avoid the direction that pulls tiles off your edge.`,
      better: sameMove ? undefined : best?.dir,
    };
  }
  if (after.lastGain >= 128) {
    return {
      rating: "great",
      title: "Big merge!",
      detail: "Chaining merges like this is how scores climb fast. Keep the newly made ninja next to the one it'll merge with next.",
    };
  }
  return {
    rating: sameMove ? "great" : "good",
    title: sameMove ? "Exactly what the AI would play" : "Solid move",
    detail: hasCorner
      ? "Your biggest ninja is anchored in a corner. Keep sliding along that edge and only use the opposite direction when nothing else works."
      : "Try to settle your biggest ninja into a corner soon — it makes the rest of the board much easier to organise.",
  };
}

/** Standing advice about the current board, regardless of the last move. */
export function boardAdvice(state: GameState): string[] {
  const grid = toGrid(state);
  const tips: string[] = [];
  const n = grid.length;
  const corner = cornerOf(grid);
  if (corner.value >= 32 && !inCorner(grid)) tips.push("Your biggest ninja isn't in a corner — steer it into one.");
  const e = empties(grid);
  if (e <= 3) tips.push("Board is crowded: prioritise merges over placing new tiles.");
  if (trappedSmalls(grid) > 0) tips.push("A small tile is trapped between big ones — free it before it blocks a row.");
  // Check the anchor row/column is sorted.
  if (inCorner(grid) && corner.value >= 64) {
    const row = grid[corner.r];
    const sorted = corner.c === 0 ? [...row].every((v, i) => i === 0 || row[i - 1] >= v) : [...row].every((v, i) => i === 0 || row[i - 1] <= v);
    if (!sorted) tips.push("Keep the row holding your biggest ninja sorted from largest to smallest.");
  }
  if (n >= 5 && e > n * 2) tips.push("On big boards, work in one half first — spreading out delays every merge.");
  return tips;
}

/** The general playbook shown in the Coach panel. */
export const STRATEGY_GUIDE: { title: string; body: string }[] = [
  {
    title: "Pick a corner and never leave it",
    body: "Choose one corner for your biggest ninja. Use only the two directions that push toward it for as long as you can.",
  },
  {
    title: "Build a snake",
    body: "Line ninjas up along the corner's edge from biggest to smallest, then continue the chain back along the next row. Merges then cascade like dominoes.",
  },
  {
    title: "Keep the anchor row full",
    body: "If the edge row holding your big ninja ever has a gap, a new tile can spawn there and wreck the chain. Fill it before moving away.",
  },
  {
    title: "Don't chase small merges",
    body: "Merging two Rookies in the middle is rarely worth breaking your structure. Structure beats points in the short term.",
  },
  {
    title: "Count empty cells",
    body: "Below four empty cells you're in danger. Look for moves that merge two pairs at once and avoid ones that create no merge.",
  },
  {
    title: "Smoke Bomb is a rescue tool",
    body: "A smoke bomb tile merges with anything. Save it for unlocking a trapped small tile or doubling your biggest ninja — don't waste it on a Rookie.",
  },
  {
    title: "Undo is for learning",
    body: "After an undo, ask what the position needed. If you're using it to avoid every mistake you'll stop noticing the pattern behind them.",
  },
];
