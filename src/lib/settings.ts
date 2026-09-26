import type { Mode } from "./game";

export type Theme = "dojo" | "auto" | "light" | "dark" | "tatami";
/** Modes the UI can show; "race" is a two-player layout rather than a single game. */
export type AppMode = Mode | "race" | "weekly";

export interface Settings {
  theme: Theme;
  sound: boolean;
  haptics: boolean;
  /** 3 or -1 (unlimited). */
  undoLimit: number;
  wasabi: boolean;
  size: number;
  mode: AppMode;
  /** Nickname for the global leaderboard. */
  playerName: string;
  /** Submit finished games to the global leaderboard. */
  online: boolean;
  /** Tile value that wins a two-player race. */
  raceTarget: number;
  /** Coach reviews each move. */
  coach: boolean;
  /** Puzzle currently selected (mode "puzzle"). */
  puzzleId: string;
  /** Board skin (see engagement.ts SKINS). */
  skin: "default" | "lacquer" | "bamboo" | "gold";
}

export const DEFAULT_SETTINGS: Settings = {
  theme: "dojo",
  sound: true,
  haptics: true,
  undoLimit: 3,
  wasabi: true,
  size: 4,
  mode: "classic",
  playerName: "",
  online: true,
  raceTarget: 512,
  coach: false,
  puzzleId: "p1",
  skin: "default",
};

export const RACE_TARGETS = [256, 512, 1024, 2048] as const;

export const THEMES: { id: Theme; name: string; blurb: string }[] = [
  { id: "dojo", name: "Shadow Dojo", blurb: "Midnight ink, electric lime, and quiet focus" },
  { id: "auto", name: "System", blurb: "Follows your device's light / dark setting" },
  { id: "light", name: "Mountain Dojo", blurb: "Cool slate and crimson banners" },
  { id: "dark", name: "Midnight Dojo", blurb: "Moonlit shadows and violet accents" },
  { id: "tatami", name: "Bamboo Grove", blurb: "Quiet greens and forest light" },
];

export const MODES: { id: AppMode; name: string; blurb: string }[] = [
  { id: "classic", name: "Classic", blurb: "Play at your own pace" },
  { id: "daily", name: "Daily", blurb: "Same board for everyone today" },
  { id: "timed", name: "Blitz", blurb: "60 seconds on the clock" },
  { id: "race", name: "Duel", blurb: "Two players, same board, first to the target wins" },
  { id: "puzzle", name: "The scrolls", blurb: "Preset boards with a goal and a move limit" },
  { id: "weekly", name: "Weekly", blurb: "A new rule set every week" },
];

export function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;
  if (theme === "auto") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", theme);
}
