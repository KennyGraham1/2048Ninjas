import { type GameState, WIN_VALUE, highestTile, liveTiles } from "./game";
import type { Progress } from "./progress";
import { seedFromString } from "./rng";
import { ninjaFor } from "./ninjas";

// ---------- XP & levels ----------

/** XP needed to *reach* a level (level 1 = 0). Gentle curve so early levels come quickly. */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.round(120 * Math.pow(level - 1, 1.55));
}

export function levelForXp(xp: number): number {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  return level;
}

export interface LevelInfo {
  level: number;
  title: string;
  /** XP into the current level and the size of the level. */
  into: number;
  span: number;
  next: number;
}

const TITLES: [number, string][] = [
  [1, "Rookie"],
  [3, "Apprentice"],
  [5, "Scout"],
  [8, "Shinobi"],
  [12, "Sensei"],
  [16, "Shadow Master"],
  [20, "Clan Leader"],
  [25, "Master"],
  [30, "Legend"],
];

export function titleForLevel(level: number): string {
  let t = TITLES[0][1];
  for (const [l, name] of TITLES) if (level >= l) t = name;
  return t;
}

export function levelInfo(xp: number): LevelInfo {
  const level = levelForXp(xp);
  const base = xpForLevel(level);
  const next = xpForLevel(level + 1);
  return { level, title: titleForLevel(level), into: xp - base, span: next - base, next };
}

/** XP a finished game is worth. */
export function xpForGame(state: GameState): number {
  if (state.mode === "puzzle" || state.moves === 0) return 0;
  let xp = Math.floor(state.score / 25) + Math.floor(state.merges / 4);
  if (state.won) xp += 80;
  if (state.mode === "daily") xp += 25;
  if (state.mode === "timed") xp += 10;
  return Math.min(xp, 2000);
}

export const XP_PUZZLE_STAR = 25;
export const XP_RACE_WIN = 40;
export const XP_RACE_PLAY = 15;

// ---------- missions ----------

export interface Mission {
  id: string;
  text: string;
  xp: number;
  /** Checked after each move and at game end; `progress` is the pre-update snapshot. */
  check: (state: GameState, progress: Progress) => boolean;
}

const top = (s: GameState) => highestTile(s);
const countOf = (s: GameState, v: number) => liveTiles(s.tiles).filter((t) => t.value === v).length;

const MISSION_POOL: Mission[] = [
  { id: "reach-64", text: "Make a Wind Runner", xp: 30, check: (s) => top(s) >= 64 },
  { id: "reach-128", text: "Make a Shadow", xp: 45, check: (s) => top(s) >= 128 },
  { id: "reach-256", text: "Make a Crimson Fang", xp: 60, check: (s) => top(s) >= 256 },
  { id: "reach-512", text: "Make a Storm Guard", xp: 90, check: (s) => top(s) >= 512 },
  { id: "two-64", text: "Have two Wind Runner tiles on the board at once", xp: 50, check: (s) => countOf(s, 64) >= 2 },
  { id: "two-128", text: "Have two Shadow tiles on the board at once", xp: 70, check: (s) => countOf(s, 128) >= 2 },
  { id: "score-1500", text: "Score 1,500 in one game", xp: 40, check: (s) => s.score >= 1500 },
  { id: "score-4000", text: "Score 4,000 in one game", xp: 80, check: (s) => s.score >= 4000 },
  { id: "timed-600", text: "Score 600 in Timed mode", xp: 50, check: (s) => s.mode === "timed" && s.score >= 600 },
  { id: "timed-64", text: "Make a Wind Runner in Timed mode", xp: 60, check: (s) => s.mode === "timed" && top(s) >= 64 },
  { id: "daily-256", text: "Reach Crimson Fang in today's Daily", xp: 70, check: (s) => s.mode === "daily" && top(s) >= 256 },
  { id: "daily-play", text: "Play today's Daily challenge", xp: 25, check: (s) => s.mode === "daily" && s.moves >= 10 },
  { id: "no-undo-128", text: "Reach Shadow without using undo", xp: 60, check: (s) => top(s) >= 128 && s.undosUsed === 0 },
  { id: "wasabi-merge", text: "Merge a smoke bomb tile", xp: 35, check: (s) => s.wasabiMerges >= 1 },
  { id: "combo-4", text: "Chain 4 merging moves in a row", xp: 40, check: (s) => (s.combo ?? 0) >= 4 },
  { id: "big-move", text: "Gain 128+ points in a single move", xp: 45, check: (s) => s.lastGain >= 128 },
  { id: "three-by-three", text: "Reach Night Blade on a 3×3 board", xp: 55, check: (s) => s.size === 3 && top(s) >= 32 },
  { id: "five-by-five", text: "Reach Crimson Fang on a 5×5 board", xp: 55, check: (s) => s.size === 5 && top(s) >= 256 },
  { id: "moves-300", text: "Play 300 moves in one game", xp: 35, check: (s) => s.moves >= 300 },
  { id: "hint-free", text: "Reach Wind Runner without hints", xp: 30, check: (s) => top(s) >= 64 && !(s.hintsUsed ?? 0) },
];

/** Three missions for the day, chosen deterministically so everyone gets the same set. */
export function dailyMissions(dateKey: string): Mission[] {
  let seed = seedFromString(`missions-${dateKey}`);
  const pool = [...MISSION_POOL];
  const picked: Mission[] = [];
  while (picked.length < 3 && pool.length) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    picked.push(pool.splice(seed % pool.length, 1)[0]);
  }
  return picked;
}

// ---------- weekly challenge ----------

export interface WeeklyRule {
  name: string;
  description: string;
  size: number;
  undoLimit: number;
  wasabi: boolean;
  timed: boolean;
}

const WEEKLY_RULES: WeeklyRule[] = [
  { name: "Tiny Dojo", description: "3×3 board, three undos.", size: 3, undoLimit: 3, wasabi: true, timed: false },
  { name: "No Take-backs", description: "4×4 with no undos at all.", size: 4, undoLimit: 0, wasabi: true, timed: false },
  { name: "Great Dojo", description: "6×6 board — patience wins.", size: 6, undoLimit: 3, wasabi: true, timed: false },
  { name: "Pure Skill", description: "4×4 with smoke bombs switched off.", size: 4, undoLimit: 3, wasabi: false, timed: false },
  { name: "Lightning Round", description: "5×5 against the 60-second clock.", size: 5, undoLimit: 0, wasabi: true, timed: true },
  { name: "Speed Trial", description: "4×4 Timed, no undos.", size: 4, undoLimit: 0, wasabi: true, timed: true },
];

/** ISO week key like 2026-W38. */
export function weekKey(date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function weeklyChallenge(key = weekKey()): WeeklyRule & { id: string } {
  const idx = seedFromString(`weekly-${key}`) % WEEKLY_RULES.length;
  return { id: key, ...WEEKLY_RULES[idx] };
}

// ---------- unlockable board skins ----------

export type Skin = "default" | "lacquer" | "bamboo" | "gold";

export interface SkinDef {
  id: Skin;
  name: string;
  blurb: string;
  unlocked: (progress: Progress) => boolean;
  requirement: string;
}

export const SKINS: SkinDef[] = [
  { id: "default", name: "Dojo Floor", blurb: "The classic board.", unlocked: () => true, requirement: "Always available" },
  {
    id: "lacquer",
    name: "Lacquer",
    blurb: "Deep red lacquer with a soft sheen.",
    unlocked: (p) => levelForXp(p.xp ?? 0) >= 5,
    requirement: "Reach level 5",
  },
  {
    id: "bamboo",
    name: "Bamboo Mat",
    blurb: "Bamboo training floor.",
    unlocked: (p) => (p.longestStreak ?? 0) >= 7,
    requirement: "Keep a 7-day daily streak",
  },
  {
    id: "gold",
    name: "Gold Leaf",
    blurb: "For ninjas who've made the Sensei.",
    unlocked: (p) => (p.stats.gamesWon ?? 0) >= 1,
    requirement: "Win a game",
  },
];

// ---------- near-miss framing ----------

export interface NearMiss {
  /** e.g. "one merge from Sashimi". */
  dish?: string;
  /** e.g. "212 points off your best". */
  score?: string;
  personalBest: boolean;
}

export function nearMiss(state: GameState, best: number): NearMiss {
  const t = highestTile(state);
  const next = ninjaFor(t * 2);
  const out: NearMiss = { personalBest: best > 0 && state.score >= best };
  if (t >= 32 && t * 2 <= 131072) {
    if (countOf(state, t) >= 2) out.dish = `one merge from ${next.name}`;
    else if (countOf(state, t / 2) >= 2 || (countOf(state, t / 2) >= 1 && countOf(state, t / 4) >= 2))
      out.dish = `two merges from ${next.name}`;
  }
  if (!out.personalBest && best > 0) {
    const gap = best - state.score;
    if (gap <= best * 0.25) out.score = `${gap.toLocaleString()} points off your best`;
  }
  if (t === WIN_VALUE / 2 && countOf(state, WIN_VALUE / 2) >= 2) out.dish = "one merge from the Sensei!";
  return out;
}
