"use client";

import { useEffect, useState } from "react";
import type { GameState } from "@/lib/game";
import { boardFor, fetchBoard, type OnlineEntry } from "@/lib/online";
import type { Progress } from "@/lib/progress";
import { todayKey } from "@/lib/rng";
import { ninjaFor } from "@/lib/ninjas";
import NinjaIcon from "../NinjaIcon";
import { formatDate } from "./CollectionPanel";

const MODE_LABEL = { classic: "Classic", daily: "Daily", timed: "Timed", puzzle: "Puzzle" } as const;

type Tab = "mine" | "global" | "daily";

interface Props {
  progress: Progress;
  state: GameState;
  online: boolean;
}

export default function LeaderboardPanel({ progress, state, online }: Props) {
  const [tab, setTab] = useState<Tab>("mine");
  // Result of the last fetch, tagged with the query it answers; a mismatch means "loading".
  const [result, setResult] = useState<{ key: string; entries: OnlineEntry[] | null; error: string | null }>({
    key: "",
    entries: null,
    error: null,
  });

  const query = tab === "daily" ? { mode: "daily" as const, size: 4, date: todayKey() } : boardFor(state);
  const queryKey = `${tab}:${query.mode}:${query.size}:${query.date ?? ""}`;
  const entries = result.key === queryKey ? result.entries : null;
  const error = result.key === queryKey ? result.error : null;

  useEffect(() => {
    if (tab === "mine") return;
    let cancelled = false;
    fetchBoard(query)
      .then((list) => {
        if (!cancelled) setResult({ key: queryKey, entries: list, error: null });
      })
      .catch(() => {
        if (!cancelled) setResult({ key: queryKey, entries: null, error: "Couldn't load the global leaderboard." });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- queryKey captures every field of `query`
  }, [tab, queryKey]);

  const boardTitle =
    tab === "daily"
      ? `Daily · ${formatDate(new Date().toISOString())}`
      : `${MODE_LABEL[query.mode]} · ${query.size}×${query.size}`;

  return (
    <div>
      <div className="segmented tabs" role="tablist" aria-label="Leaderboard">
        {(["mine", "global", "daily"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className={tab === t ? "seg-active" : ""}
            onClick={() => setTab(t)}
          >
            {t === "mine" ? "My top 10" : t === "global" ? "Global" : "Today's daily"}
          </button>
        ))}
      </div>

      {tab === "mine" ? (
        progress.leaderboard.length === 0 ? (
          <p className="muted">No finished games yet. Your top 10 scores will show up here.</p>
        ) : (
          <ol className="leaderboard">
            {progress.leaderboard.map((e, i) => {
              const style = ninjaFor(e.top);
              return (
                <li key={`${e.date}-${i}`} className="leaderboard-row">
                  <span className="leaderboard-rank">{i + 1}</span>
                  <NinjaIcon style={style} className="leaderboard-icon" />
                  <span className="leaderboard-main">
                    <strong>{e.score.toLocaleString()}</strong>
                    <span>
                      {style.name} · {MODE_LABEL[e.mode]} · {e.size}×{e.size}
                      {e.won ? " · Won" : ""}
                    </span>
                  </span>
                  <span className="leaderboard-date">{formatDate(e.date)}</span>
                </li>
              );
            })}
          </ol>
        )
      ) : (
        <>
          <p className="muted small">{boardTitle} · top 25 worldwide</p>
          {!online && (
            <p className="muted small">Score submission is turned off in Settings — you can still browse.</p>
          )}
          {error && <p className="muted">{error}</p>}
          {!error && entries === null && <p className="muted">Loading…</p>}
          {entries && entries.length === 0 && (
            <p className="muted">Nobody&apos;s posted a score here yet. Be the first!</p>
          )}
          {entries && entries.length > 0 && (
            <ol className="leaderboard">
              {entries.map((e, i) => {
                const style = ninjaFor(e.top);
                return (
                  <li key={e.id} className="leaderboard-row">
                    <span className="leaderboard-rank">{i + 1}</span>
                    <NinjaIcon style={style} className="leaderboard-icon" />
                    <span className="leaderboard-main">
                      <strong>
                        {e.score.toLocaleString()} <span className="leaderboard-name">{e.name}</span>
                      </strong>
                      <span>
                        {style.name} · {e.moves.toLocaleString()} moves
                      </span>
                    </span>
                    <span className="leaderboard-date">{formatDate(e.date)}</span>
                  </li>
                );
              })}
            </ol>
          )}
        </>
      )}
    </div>
  );
}
