import type { GameState } from "./game";
import { highestTile } from "./game";
import type { OnlineEntry } from "./server/leaderboardStore";

export type { OnlineEntry };

export interface BoardQuery {
  mode: "classic" | "timed" | "daily";
  size: number;
  date?: string;
}

export function boardFor(state: GameState): BoardQuery {
  // Puzzles aren't ranked online; show the classic board for that size instead.
  const mode = state.mode === "puzzle" ? "classic" : state.mode;
  return { mode, size: state.size, date: state.dailyKey };
}

export async function fetchBoard(q: BoardQuery): Promise<OnlineEntry[]> {
  const params = new URLSearchParams({ mode: q.mode, size: String(q.size) });
  if (q.date) params.set("date", q.date);
  const res = await fetch(`/api/leaderboard?${params}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as { entries: OnlineEntry[] };
  return json.entries;
}

export interface SubmitResult {
  rank: number | null;
  entries: OnlineEntry[];
}

export async function submitScore(state: GameState, name: string): Promise<SubmitResult> {
  const res = await fetch("/api/leaderboard", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      score: state.score,
      top: highestTile(state),
      size: state.size,
      mode: state.mode,
      moves: state.moves,
      date: state.dailyKey,
    }),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return (await res.json()) as SubmitResult;
}

/** Games are eligible when a human played every move and at least one point was scored. */
export function eligibleForOnline(state: GameState): boolean {
  return (
    state.mode !== "puzzle" &&
    state.moves > 0 &&
    state.score > 0 &&
    !(state.aiMoves && state.aiMoves > 0)
  );
}
