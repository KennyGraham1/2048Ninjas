import { type GameState, type Mode, WIN_VALUE, highestTile, isBoardFull, liveTiles, tileValues } from "./game";
import { PUZZLES } from "./puzzles";
import { NINJA_LIST } from "./ninjas";

export interface Stats {
  gamesPlayed: number;
  gamesWon: number;
  totalScore: number;
  totalMoves: number;
  totalMerges: number;
  longestGame: number;
  highestTile: number;
  bestScore: number;
  wasabiMerges: number;
  hintsUsed: number;
  shares: number;
  racesPlayed: number;
  racesWon: number;
  undoFreeGames: number;
  coachGames: number;
  /** Fastest win in ms, 0 = none yet. */
  fastestWinMs: number;
  dailiesPlayed: number;
}

export interface LeaderboardEntry {
  score: number;
  date: string;
  mode: Mode;
  size: number;
  top: number;
  moves: number;
  won: boolean;
}

export interface PuzzleResult {
  moves: number;
  stars: number;
  date: string;
}

export interface Progress {
  stats: Stats;
  /** Dish value -> ISO date it was first reached. */
  passport: Record<string, string>;
  /** Achievement id -> ISO date unlocked. */
  achievements: Record<string, string>;
  leaderboard: LeaderboardEntry[];
  /** `${mode}:${size}` -> best score. */
  bests: Record<string, number>;
  /** Daily key -> best score that day. */
  dailyBests: Record<string, number>;
  /** Puzzle id -> best result. */
  puzzles: Record<string, PuzzleResult>;
  xp: number;
  /** Date key -> mission ids completed that day. */
  missions: Record<string, string[]>;
  /** Week key -> best score in that week's challenge. */
  weeklyBests: Record<string, number>;
  streakFreezes: number;
  /** Days the streak was protected by a freeze. */
  frozenDays: string[];
  longestStreak: number;
  /** Date a freeze was last earned, so a milestone pays out once. */
  lastFreezeDay?: string;
}

export const EMPTY_STATS: Stats = {
  gamesPlayed: 0,
  gamesWon: 0,
  totalScore: 0,
  totalMoves: 0,
  totalMerges: 0,
  longestGame: 0,
  highestTile: 0,
  bestScore: 0,
  wasabiMerges: 0,
  hintsUsed: 0,
  shares: 0,
  racesPlayed: 0,
  racesWon: 0,
  undoFreeGames: 0,
  coachGames: 0,
  fastestWinMs: 0,
  dailiesPlayed: 0,
};

export const EMPTY_PROGRESS: Progress = {
  stats: EMPTY_STATS,
  passport: {},
  achievements: {},
  leaderboard: [],
  bests: {},
  dailyBests: {},
  puzzles: {},
  xp: 0,
  missions: {},
  weeklyBests: {},
  streakFreezes: 0,
  frozenDays: [],
  longestStreak: 0,
};

export const LEADERBOARD_SIZE = 10;

export function bestKey(mode: Mode, size: number): string {
  return `${mode}:${size}`;
}

export function bestFor(progress: Progress, state: GameState): number {
  if (state.mode === "daily" && state.dailyKey) return progress.dailyBests[state.dailyKey] ?? 0;
  return progress.bests[bestKey(state.mode, state.size)] ?? 0;
}

// ---------- achievements ----------

export type AchievementCategory =
  | "dishes"
  | "scores"
  | "skill"
  | "modes"
  | "boards"
  | "wasabi"
  | "puzzles"
  | "habits"
  | "secret";

export const CATEGORY_LABEL: Record<AchievementCategory, string> = {
  dishes: "Ninjas",
  scores: "Scores",
  skill: "Skill",
  modes: "Modes",
  boards: "Board sizes",
  wasabi: "Smoke Bomb",
  puzzles: "Puzzles",
  habits: "Habits",
  secret: "Secret",
};

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  /** Dish value used for the badge artwork; 0 = wasabi. */
  icon: number;
  /** Hidden until unlocked. */
  secret?: boolean;
  check: (state: GameState, progress: Progress) => boolean;
}

const dish = (value: number) => NINJA_LIST.find((d) => d.value === value)!;
const top = (s: GameState) => highestTile(s);
const hour = () => new Date().getHours();

const DISH_ACHIEVEMENTS: Achievement[] = [16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536, 131072].map(
  (v) => ({
    id: `dish-${v}`,
    name: `${dish(v).name}${v === WIN_VALUE ? " — Mission complete!" : ""}`,
    description: v === WIN_VALUE ? "Train the Sensei and win a game." : `Make the ${dish(v).name} tile.`,
    category: "dishes",
    icon: v,
    check: (s) => top(s) >= v,
  }),
);

const SCORE_ACHIEVEMENTS: Achievement[] = [
  [1000, "Appetiser", 8],
  [5000, "Main Course", 128],
  [10000, "Big Tipper", 512],
  [25000, "Clan Gathering Hall", 2048],
  [50000, "Michelin Star", 32768],
  [100000, "Legend of the Sea", 131072],
].map(([n, name, icon]) => ({
  id: `score-${n}`,
  name: name as string,
  description: `Score ${(n as number).toLocaleString()} points in one game.`,
  category: "scores" as const,
  icon: icon as number,
  check: (s: GameState) => s.score >= (n as number),
}));

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first-bite",
    name: "First Strike",
    description: "Make your first merge.",
    category: "dishes",
    icon: 2,
    check: (s) => s.merges >= 1,
  },
  ...DISH_ACHIEVEMENTS,
  {
    id: "full-menu",
    name: "Full Clan",
    description: "Add every ninja to your collection.",
    category: "dishes",
    icon: 131072,
    check: (_s, p) => NINJA_LIST.every((d) => p.passport[d.value]),
  },
  {
    id: "collector",
    name: "Collector",
    description: "Add 10 ninjas to your collection.",
    category: "dishes",
    icon: 4096,
    check: (_s, p) => Object.keys(p.passport).length >= 10,
  },

  ...SCORE_ACHIEVEMENTS,
  {
    id: "lifetime-100k",
    name: "Dedicated Trainee",
    description: "Score 100,000 points across all games.",
    category: "scores",
    icon: 16384,
    check: (_s, p) => p.stats.totalScore >= 100000,
  },
  {
    id: "lifetime-1m",
    name: "Ninja Millionaire",
    description: "Score 1,000,000 points across all games.",
    category: "scores",
    icon: 65536,
    check: (_s, p) => p.stats.totalScore >= 1000000,
  },

  {
    id: "gyoza-purist",
    name: "Shadow Purist",
    description: "Reach Shadow without using undo.",
    category: "skill",
    icon: 128,
    check: (s) => top(s) >= 128 && s.undosUsed === 0,
  },
  {
    id: "pure-temaki",
    name: "Pure Sensei",
    description: "Win a game without using undo.",
    category: "skill",
    icon: 2048,
    check: (s) => s.won && s.undosUsed === 0,
  },
  {
    id: "quick-service",
    name: "Swift Strike",
    description: "Win in under 1,000 moves.",
    category: "skill",
    icon: 2048,
    check: (s) => s.won && s.moves < 1000,
  },
  {
    id: "speed-chef",
    name: "Speed Ninja",
    description: "Win a game in under 10 minutes.",
    category: "skill",
    icon: 8192,
    check: (s) => s.won && s.startedAt !== null && Date.now() - s.startedAt < 10 * 60 * 1000,
  },
  {
    id: "no-small-fry",
    name: "Elite Squad",
    description: "Fill every cell with no Rookies on the board.",
    category: "skill",
    icon: 4,
    check: (s) => isBoardFull(s) && liveTiles(s.tiles).every((t) => t.value !== 2),
  },
  {
    id: "twin-peaks",
    name: "Twin Peaks",
    description: "Have two Dragon Fist tiles on the board at once.",
    category: "skill",
    icon: 1024,
    check: (s) => liveTiles(s.tiles).filter((t) => t.value === 1024).length >= 2,
  },
  {
    id: "double-temaki",
    name: "Double Sensei",
    description: "Have two Sensei tiles on the board at once.",
    category: "skill",
    icon: 2048,
    check: (s) => liveTiles(s.tiles).filter((t) => t.value === 2048).length >= 2,
  },
  {
    id: "marathon",
    name: "Marathon",
    description: "Play 1,500 moves in a single game.",
    category: "skill",
    icon: 16384,
    check: (s) => s.moves >= 1500,
  },
  {
    id: "ultra-marathon",
    name: "Ultra Marathon",
    description: "Play 5,000 moves in a single game.",
    category: "skill",
    icon: 65536,
    check: (s) => s.moves >= 5000,
  },
  {
    id: "combo",
    name: "Combo Strike",
    description: "Gain 512 or more points from a single move.",
    category: "skill",
    icon: 512,
    check: (s) => s.lastGain >= 512,
  },
  {
    id: "comeback",
    name: "Comeback Kid",
    description: "Win a game after using at least one undo.",
    category: "skill",
    icon: 256,
    check: (s) => s.won && s.undosUsed > 0,
  },
  {
    id: "keep-going",
    name: "Beyond the Dojo",
    description: "Reach Shadow Master after winning and choosing to keep going.",
    category: "skill",
    icon: 4096,
    check: (s) => s.keepPlaying && top(s) >= 4096,
  },

  {
    id: "daily-first",
    name: "Daily Special",
    description: "Reach Storm Guard in a daily challenge.",
    category: "modes",
    icon: 512,
    check: (s) => s.mode === "daily" && top(s) >= 512,
  },
  {
    id: "daily-temaki",
    name: "Mission of the Day",
    description: "Win a daily challenge.",
    category: "modes",
    icon: 2048,
    check: (s) => s.mode === "daily" && s.won,
  },
  {
    id: "daily-five",
    name: "Weekday Regular",
    description: "Play 5 different daily challenges.",
    category: "modes",
    icon: 32,
    check: (_s, p) => Object.keys(p.dailyBests).length >= 5,
  },
  {
    id: "daily-thirty",
    name: "Monthly Pass",
    description: "Play 30 different daily challenges.",
    category: "modes",
    icon: 8192,
    check: (_s, p) => Object.keys(p.dailyBests).length >= 30,
  },
  {
    id: "quick-bite",
    name: "Quick Strike",
    description: "Score 1,000 points in timed mode.",
    category: "modes",
    icon: 8,
    check: (s) => s.mode === "timed" && s.score >= 1000,
  },
  {
    id: "lunch-rush",
    name: "Lightning Round",
    description: "Score 2,500 points in timed mode.",
    category: "modes",
    icon: 256,
    check: (s) => s.mode === "timed" && s.score >= 2500,
  },
  {
    id: "timed-gyoza",
    name: "Express Shadow",
    description: "Reach Shadow in timed mode.",
    category: "modes",
    icon: 128,
    check: (s) => s.mode === "timed" && top(s) >= 128,
  },
  {
    id: "race-first",
    name: "On Your Marks",
    description: "Finish a two-player race.",
    category: "modes",
    icon: 64,
    check: (_s, p) => p.stats.racesPlayed >= 1,
  },
  {
    id: "race-win",
    name: "Champion Ninja",
    description: "Win a two-player race.",
    category: "modes",
    icon: 512,
    check: (_s, p) => p.stats.racesWon >= 1,
  },
  {
    id: "race-five",
    name: "Rivalry",
    description: "Win 5 two-player races.",
    category: "modes",
    icon: 1024,
    check: (_s, p) => p.stats.racesWon >= 5,
  },
  {
    id: "coach-first",
    name: "Student",
    description: "Finish a game with the Coach switched on.",
    category: "modes",
    icon: 16,
    check: (_s, p) => p.stats.coachGames >= 1,
  },
  {
    id: "coach-clean",
    name: "Teacher's Pet",
    description: "Reach Shadow in a coached game with no blunders.",
    category: "modes",
    icon: 128,
    check: (s) => (s.blunders ?? -1) === 0 && top(s) >= 128,
  },
  {
    id: "hint-ten",
    name: "Asking Nicely",
    description: "Use 10 hints.",
    category: "modes",
    icon: 2,
    check: (_s, p) => p.stats.hintsUsed >= 10,
  },

  {
    id: "tiny-table",
    name: "Tiny Dojo",
    description: "Reach Crimson Fang on a 3×3 board.",
    category: "boards",
    icon: 256,
    check: (s) => s.size === 3 && top(s) >= 256,
  },
  {
    id: "tiny-master",
    name: "Tiny Master",
    description: "Reach Storm Guard on a 3×3 board.",
    category: "boards",
    icon: 512,
    check: (s) => s.size === 3 && top(s) >= 512,
  },
  {
    id: "five-temaki",
    name: "Grand Dojo",
    description: "Win on a 5×5 board.",
    category: "boards",
    icon: 2048,
    check: (s) => s.size === 5 && s.won,
  },
  {
    id: "banquet",
    name: "Clan Gathering",
    description: "Reach Shadow Master on a 6×6 board.",
    category: "boards",
    icon: 4096,
    check: (s) => s.size === 6 && top(s) >= 4096,
  },
  {
    id: "six-ramen",
    name: "Great Hall",
    description: "Reach Phoenix on a 6×6 board.",
    category: "boards",
    icon: 16384,
    check: (s) => s.size === 6 && top(s) >= 16384,
  },
  {
    id: "all-sizes",
    name: "Any Dojo Will Do",
    description: "Score 1,000 points on every board size.",
    category: "boards",
    icon: 64,
    check: (_s, p) => [3, 4, 5, 6].every((n) => (p.bests[`classic:${n}`] ?? 0) >= 1000),
  },

  {
    id: "spicy",
    name: "Smoke Screen",
    description: "Merge a smoke bomb tile.",
    category: "wasabi",
    icon: 0,
    check: (s) => s.wasabiMerges >= 1,
  },
  {
    id: "wasabi-five",
    name: "Vanish",
    description: "Merge 5 smoke bomb tiles in one game.",
    category: "wasabi",
    icon: 0,
    check: (s) => s.wasabiMerges >= 5,
  },
  {
    id: "wasabi-fifty",
    name: "Escape Artist",
    description: "Merge 50 smoke bomb tiles in total.",
    category: "wasabi",
    icon: 0,
    check: (_s, p) => p.stats.wasabiMerges >= 50,
  },
  {
    id: "wasabi-big",
    name: "Smoke Master",
    description: "Use a smoke bomb tile to make Dragon Fist or better.",
    category: "wasabi",
    icon: 1024,
    check: (s) =>
      s.tiles.some(
        (t) =>
          t.merged &&
          t.value >= 1024 &&
          s.tiles.some((w) => w.removed && w.wasabi && w.row === t.row && w.col === t.col),
      ),
  },
  {
    id: "no-wasabi-win",
    name: "Purist",
    description: "Win with smoke bomb tiles switched off.",
    category: "wasabi",
    icon: 2048,
    check: (s) => s.won && !s.wasabiEnabled && s.mode !== "daily",
  },

  {
    id: "puzzle-first",
    name: "Sharp Mind",
    description: "Solve your first puzzle.",
    category: "puzzles",
    icon: 64,
    check: (_s, p) => Object.keys(p.puzzles).length >= 1,
  },
  {
    id: "puzzle-par",
    name: "Under Par",
    description: "Solve a puzzle in the fewest possible moves.",
    category: "puzzles",
    icon: 128,
    check: (_s, p) => Object.values(p.puzzles).some((r) => r.stars === 3),
  },
  {
    id: "puzzle-half",
    name: "Halfway There",
    description: `Solve ${Math.ceil(PUZZLES.length / 2)} puzzles.`,
    category: "puzzles",
    icon: 256,
    check: (_s, p) => Object.keys(p.puzzles).length >= Math.ceil(PUZZLES.length / 2),
  },
  {
    id: "puzzle-all",
    name: "Puzzle Master",
    description: "Solve every puzzle.",
    category: "puzzles",
    icon: 512,
    check: (_s, p) => PUZZLES.every((z) => p.puzzles[z.id]),
  },
  {
    id: "puzzle-perfect",
    name: "Three-Star Ninja",
    description: "Earn three stars on every puzzle.",
    category: "puzzles",
    icon: 1024,
    check: (_s, p) => PUZZLES.every((z) => p.puzzles[z.id]?.stars === 3),
  },

  {
    id: "regular",
    name: "Regular",
    description: "Finish 10 games.",
    category: "habits",
    icon: 32,
    check: (_s, p) => p.stats.gamesPlayed >= 10,
  },
  {
    id: "fifty-games",
    name: "Loyal Warrior",
    description: "Finish 50 games.",
    category: "habits",
    icon: 256,
    check: (_s, p) => p.stats.gamesPlayed >= 50,
  },
  {
    id: "hundred-games",
    name: "Lone Warrior",
    description: "Finish 100 games.",
    category: "habits",
    icon: 4096,
    check: (_s, p) => p.stats.gamesPlayed >= 100,
  },
  {
    id: "five-wins",
    name: "Head Ninja",
    description: "Win 5 games.",
    category: "habits",
    icon: 2048,
    check: (_s, p) => p.stats.gamesWon >= 5,
  },
  {
    id: "twenty-wins",
    name: "Ninja Sensei",
    description: "Win 20 games.",
    category: "habits",
    icon: 32768,
    check: (_s, p) => p.stats.gamesWon >= 20,
  },
  {
    id: "moves-10k",
    name: "Well Travelled",
    description: "Play 10,000 moves in total.",
    category: "habits",
    icon: 16384,
    check: (_s, p) => p.stats.totalMoves >= 10000,
  },
  {
    id: "merges-5k",
    name: "Master of Merges",
    description: "Make 5,000 merges in total.",
    category: "habits",
    icon: 8192,
    check: (_s, p) => p.stats.totalMerges >= 5000,
  },
  {
    id: "share-first",
    name: "Sharing is Caring",
    description: "Share a score.",
    category: "habits",
    icon: 8,
    check: (_s, p) => p.stats.shares >= 1,
  },
  {
    id: "undo-free-ten",
    name: "No Regrets",
    description: "Finish 10 games without a single undo.",
    category: "habits",
    icon: 512,
    check: (_s, p) => p.stats.undoFreeGames >= 10,
  },

  {
    id: "mission-first",
    name: "Mission Accepted",
    description: "Complete a daily mission.",
    category: "habits",
    icon: 64,
    check: (_s, p) => Object.values(p.missions ?? {}).some((m) => m.length > 0),
  },
  {
    id: "mission-clean-sweep",
    name: "Clean Sweep",
    description: "Complete all three missions in one day.",
    category: "habits",
    icon: 256,
    check: (_s, p) => Object.values(p.missions ?? {}).some((m) => m.length >= 3),
  },
  {
    id: "level-5",
    name: "Scout",
    description: "Reach level 5.",
    category: "habits",
    icon: 32,
    check: (_s, p) => (p.xp ?? 0) >= 120 * Math.pow(4, 1.55),
  },
  {
    id: "level-15",
    name: "Shadow Master in Training",
    description: "Reach level 15.",
    category: "habits",
    icon: 16384,
    check: (_s, p) => (p.xp ?? 0) >= 120 * Math.pow(14, 1.55),
  },
  {
    id: "weekly-first",
    name: "Ninja's Special",
    description: "Score 1,000 in a weekly challenge.",
    category: "modes",
    icon: 4096,
    check: (_s, p) => Object.values(p.weeklyBests ?? {}).some((v) => v >= 1000),
  },
  {
    id: "streak-7",
    name: "Seven Days a Week",
    description: "Keep a 7-day daily streak.",
    category: "modes",
    icon: 8192,
    check: (_s, p) => (p.longestStreak ?? 0) >= 7,
  },
  {
    id: "combo-6",
    name: "On a Roll",
    description: "Chain 6 merging moves in a row.",
    category: "skill",
    icon: 64,
    check: (s) => (s.combo ?? 0) >= 6,
  },
  {
    id: "night-owl",
    name: "Night Owl",
    description: "Finish a game between midnight and 4 am.",
    category: "secret",
    icon: 4096,
    secret: true,
    check: (s) => s.over && hour() >= 0 && hour() < 4,
  },
  {
    id: "early-bird",
    name: "Early Bird",
    description: "Finish a game between 5 and 7 am.",
    category: "secret",
    icon: 4,
    secret: true,
    check: (s) => s.over && hour() >= 5 && hour() < 7,
  },
  {
    id: "lucky-seven",
    name: "Lucky Seven",
    description: "Finish a game with a score ending in 777.",
    category: "secret",
    icon: 256,
    secret: true,
    check: (s) => s.over && s.score % 1000 === 777,
  },
  {
    id: "rice-field",
    name: "Training Ground",
    description: "Have 8 Rookies on the board at the same time.",
    category: "secret",
    icon: 2,
    secret: true,
    check: (s) => liveTiles(s.tiles).filter((t) => t.value === 2).length >= 8,
  },
  {
    id: "all-done",
    name: "Completionist",
    description: "Unlock every other achievement.",
    category: "secret",
    icon: 131072,
    secret: true,
    check: (_s, p) => ACHIEVEMENTS.every((a) => a.id === "all-done" || p.achievements[a.id]),
  },
];

export const ACHIEVEMENT_COUNT = ACHIEVEMENTS.length;

export interface ProgressUpdate {
  progress: Progress;
  /** Dish values added to the collection by this update. */
  newDishes: number[];
  newAchievements: Achievement[];
}

function unlockAchievements(progress: Progress, state: GameState, now: string): Achievement[] {
  const unlocked: Achievement[] = [];
  for (const a of ACHIEVEMENTS) {
    if (progress.achievements[a.id]) continue;
    let ok = false;
    try {
      ok = a.check(state, progress);
    } catch {
      ok = false;
    }
    if (ok) {
      progress.achievements[a.id] = now;
      unlocked.push(a);
    }
  }
  return unlocked;
}

function clone(progress: Progress): Progress {
  return {
    ...progress,
    stats: { ...EMPTY_STATS, ...progress.stats },
    passport: { ...progress.passport },
    achievements: { ...progress.achievements },
    bests: { ...progress.bests },
    dailyBests: { ...progress.dailyBests },
    puzzles: { ...progress.puzzles },
    leaderboard: [...progress.leaderboard],
    missions: { ...(progress.missions ?? {}) },
    weeklyBests: { ...(progress.weeklyBests ?? {}) },
    frozenDays: [...(progress.frozenDays ?? [])],
    xp: progress.xp ?? 0,
    streakFreezes: progress.streakFreezes ?? 0,
    longestStreak: progress.longestStreak ?? 0,
    ...(progress.lastFreezeDay ? { lastFreezeDay: progress.lastFreezeDay } : {}),
  };
}

/** Add XP and re-check achievements. */
export function addXp(progress: Progress, state: GameState, amount: number, date = new Date()): ProgressUpdate {
  const next = clone(progress);
  next.xp += Math.max(0, Math.round(amount));
  const newAchievements = unlockAchievements(next, state, date.toISOString());
  return { progress: next, newDishes: [], newAchievements };
}

/** Mark missions done for `dateKey`; returns which were newly completed. */
export function completeMissions(progress: Progress, dateKey: string, ids: string[]): { progress: Progress; added: string[] } {
  const next = clone(progress);
  const done = new Set(next.missions[dateKey] ?? []);
  const added = ids.filter((id) => !done.has(id));
  added.forEach((id) => done.add(id));
  next.missions[dateKey] = [...done];
  return { progress: next, added };
}

/**
 * Called on boot: if yesterday was missed but a freeze is available, protect it. Also earns a
 * freeze every 7 days of streak (max 2 banked) and records the longest streak.
 */
export function maintainStreak(progress: Progress, today: string): Progress {
  const next = clone(progress);
  const yesterday = shiftDay(today, -1);
  const played = (k: string) => next.dailyBests[k] !== undefined || next.frozenDays.includes(k);
  if (!played(yesterday) && !played(today) && next.streakFreezes > 0 && played(shiftDay(today, -2))) {
    next.frozenDays.push(yesterday);
    next.streakFreezes -= 1;
  }
  const streak = dailyStreak(next, today);
  next.longestStreak = Math.max(next.longestStreak, streak);
  return next;
}

/** Award a freeze when a streak milestone (multiple of 7) is first reached. */
export function earnFreezeIfDue(progress: Progress, today: string): { progress: Progress; earned: boolean } {
  const next = clone(progress);
  const streak = dailyStreak(next, today);
  next.longestStreak = Math.max(next.longestStreak, streak);
  const milestone = streak > 0 && streak % 7 === 0 && next.dailyBests[today] !== undefined;
  if (milestone && next.lastFreezeDay !== today && next.streakFreezes < 2) {
    next.streakFreezes += 1;
    next.lastFreezeDay = today;
    return { progress: next, earned: true };
  }
  return { progress: next, earned: false };
}

function shiftDay(key: string, delta: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(y, m - 1, d + delta);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

/** Call after every successful move. Cheap: only touches passport, bests and achievements. */
export function afterMove(progress: Progress, state: GameState, date = new Date()): ProgressUpdate {
  const now = date.toISOString();
  const next = clone(progress);

  const newDishes: number[] = [];
  // Puzzles start with big tiles already on the board, so they don't count toward the collection.
  if (state.mode !== "puzzle") {
    for (const v of tileValues(state)) {
      if (!next.passport[v]) {
        next.passport[v] = now;
        newDishes.push(v);
      }
    }
  }

  if (state.challengeId) {
    next.weeklyBests[state.challengeId] = Math.max(next.weeklyBests[state.challengeId] ?? 0, state.score);
  }
  if (state.mode === "daily" && state.dailyKey) {
    next.dailyBests[state.dailyKey] = Math.max(next.dailyBests[state.dailyKey] ?? 0, state.score);
  } else if (state.mode !== "puzzle") {
    const k = bestKey(state.mode, state.size);
    next.bests[k] = Math.max(next.bests[k] ?? 0, state.score);
  }
  if (state.mode !== "puzzle") {
    next.stats.bestScore = Math.max(next.stats.bestScore, state.score);
    next.stats.highestTile = Math.max(next.stats.highestTile, highestTile(state));
  }
  if (state.tiles.some((t) => t.removed && t.wasabi)) next.stats.wasabiMerges += 1;

  const newAchievements = unlockAchievements(next, state, now);
  return { progress: next, newDishes: newDishes.sort((a, b) => a - b), newAchievements };
}

/** Call once when a game ends or is abandoned with at least one move played. */
export function recordGameEnd(progress: Progress, state: GameState, coached = false, date = new Date()): ProgressUpdate {
  const now = date.toISOString();
  const next = clone(progress);
  const s = next.stats;
  if (state.mode !== "puzzle") {
    s.gamesPlayed += 1;
    s.gamesWon += state.won ? 1 : 0;
    s.totalScore += state.score;
    s.totalMoves += state.moves;
    s.totalMerges += state.merges;
    s.longestGame = Math.max(s.longestGame, state.moves);
    s.highestTile = Math.max(s.highestTile, highestTile(state));
    s.bestScore = Math.max(s.bestScore, state.score);
    if (state.undosUsed === 0) s.undoFreeGames += 1;
    if (coached) s.coachGames += 1;
    if (state.won && state.startedAt !== null) {
      const ms = Date.now() - state.startedAt;
      s.fastestWinMs = s.fastestWinMs === 0 ? ms : Math.min(s.fastestWinMs, ms);
    }
    const entry: LeaderboardEntry = {
      score: state.score,
      date: now,
      mode: state.mode,
      size: state.size,
      top: highestTile(state),
      moves: state.moves,
      won: state.won,
    };
    next.leaderboard = [...next.leaderboard, entry]
      .sort((a, b) => b.score - a.score || a.date.localeCompare(b.date))
      .slice(0, LEADERBOARD_SIZE);
  }
  const newAchievements = unlockAchievements(next, state, now);
  return { progress: next, newDishes: [], newAchievements };
}

/** Record a solved puzzle (keeps the best result). */
export function recordPuzzle(progress: Progress, state: GameState, stars: number, date = new Date()): ProgressUpdate {
  const now = date.toISOString();
  const next = clone(progress);
  if (state.puzzleId) {
    const prev = next.puzzles[state.puzzleId];
    if (!prev || stars > prev.stars || (stars === prev.stars && state.moves < prev.moves)) {
      next.puzzles[state.puzzleId] = { moves: state.moves, stars, date: now };
    }
  }
  const newAchievements = unlockAchievements(next, state, now);
  return { progress: next, newDishes: [], newAchievements };
}

/** Bump a counter stat (shares, hints, races) and re-check achievements. */
export function recordEvent(
  progress: Progress,
  state: GameState,
  patch: Partial<Stats>,
  date = new Date(),
): ProgressUpdate {
  const next = clone(progress);
  for (const [k, v] of Object.entries(patch)) {
    const key = k as keyof Stats;
    next.stats[key] = (next.stats[key] ?? 0) + (v ?? 0);
  }
  const newAchievements = unlockAchievements(next, state, date.toISOString());
  return { progress: next, newDishes: [], newAchievements };
}

/** Consecutive days (ending today or yesterday) with a daily challenge played. */
export function dailyStreak(progress: Progress, today: string): number {
  const played = new Set(Object.keys(progress.dailyBests));
  const frozen = new Set(progress.frozenDays ?? []);
  const [y, m, d] = today.split("-").map(Number);
  const cursor = new Date(y, m - 1, d);
  const key = (dt: Date) =>
    `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
  // A streak survives until you miss a whole day, so start from yesterday if today isn't played yet.
  if (!played.has(key(cursor)) && !frozen.has(key(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  for (;;) {
    const k = key(cursor);
    if (played.has(k)) streak++;
    else if (!frozen.has(k)) break; // a frozen day bridges the streak without counting
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** Rank (1-based) of a score on the leaderboard, or null if it wouldn't place. */
export function leaderboardRank(progress: Progress, score: number): number | null {
  const idx = progress.leaderboard.findIndex((e) => e.score === score);
  return idx === -1 ? null : idx + 1;
}
