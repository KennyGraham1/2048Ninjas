"use client";

import { useEffect, useState } from "react";
import { BOARD_SIZES } from "@/lib/game";
import { ACHIEVEMENTS, dailyStreak, type Progress } from "@/lib/progress";
import { weeklyChallenge } from "@/lib/engagement";
import { fetchBoard } from "@/lib/online";
import LevelBar from "./LevelBar";
import MissionsCard from "./MissionsCard";
import { PUZZLES } from "@/lib/puzzles";
import { todayKey } from "@/lib/rng";
import type { Settings } from "@/lib/settings";
import { NINJA_LIST, ninjaFor } from "@/lib/ninjas";
import Logo from "./Logo";
import NinjaIcon from "./NinjaIcon";

interface Props {
  progress: Progress;
  settings: Settings;
  /** Saved classic games by size: score, or undefined when none. */
  saved: Record<number, number | undefined>;
  onClassic: (size: number, coach: boolean) => void;
  onDaily: () => void;
  onTimed: (size: number) => void;
  onRace: () => void;
  onPuzzles: () => void;
  onWeekly: () => void;
  onOpen: (panel: "stats" | "collection" | "achievements" | "leaderboard" | "coach") => void;
  online: boolean;
  playerName: string;
}

function SizePicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="segmented segmented-sm" role="radiogroup" aria-label="Board size">
      {BOARD_SIZES.map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          className={value === n ? "seg-active" : ""}
          onClick={() => onChange(n)}
        >
          {n}×{n}
        </button>
      ))}
    </div>
  );
}

export default function Dashboard({
  progress,
  settings,
  saved,
  onClassic,
  onDaily,
  onTimed,
  onRace,
  onPuzzles,
  onWeekly,
  onOpen,
  online,
  playerName,
}: Props) {
  const [size, setSize] = useState(settings.size);
  const today = todayKey();
  const dailyBest = progress.dailyBests[today];
  const streak = dailyStreak(progress, today);
  const classicBest = progress.bests[`classic:${size}`] ?? 0;
  const timedBest = progress.bests[`timed:${size}`] ?? 0;
  const solved = Object.keys(progress.puzzles).length;
  const collected = Object.keys(progress.passport).length;
  const achieved = Object.keys(progress.achievements).length;
  const top = progress.stats.highestTile ? ninjaFor(progress.stats.highestTile) : null;
  const savedSizes = BOARD_SIZES.filter((n) => saved[n] !== undefined);
  const weekly = weeklyChallenge();
  const weeklyBest = progress.weeklyBests?.[weekly.id] ?? 0;
  const [dailyRank, setDailyRank] = useState<number | null>(null);

  // "You're #N today" on the global daily board.
  useEffect(() => {
    if (!online || !playerName || dailyBest === undefined) return;
    let cancelled = false;
    fetchBoard({ mode: "daily", size: 4, date: today })
      .then((entries) => {
        if (cancelled) return;
        const idx = entries.findIndex((e) => e.name === playerName);
        setDailyRank(idx === -1 ? null : idx + 1);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [online, playerName, dailyBest, today]);

  return (
    <div className="dash">
      <section className="hero">
        {top ? (
          <div className="hero-art" style={{ background: top.bg }}>
            <NinjaIcon style={top} />
          </div>
        ) : (
          <Logo className="hero-art hero-logo" />
        )}
        <div className="hero-text">
          <h1>{top ? `Best ninja: ${top.name}` : "Welcome to the dojo"}</h1>
          <p>
            {progress.stats.gamesPlayed
              ? `${progress.stats.gamesPlayed} games · best ${progress.stats.bestScore.toLocaleString()} pts`
              : "Merge matching ninjas to make the next one. Reach the Sensei."}
          </p>
        </div>
      </section>

      <LevelBar xp={progress.xp ?? 0} />
      <MissionsCard progress={progress} />

      {savedSizes.length > 0 && (
        <section className="continue">
          {savedSizes.map((n) => (
            <button key={n} className="continue-card" onClick={() => onClassic(n, settings.coach)}>
              <span className="continue-label">Continue</span>
              <strong>
                Classic {n}×{n}
              </strong>
              <span>{(saved[n] ?? 0).toLocaleString()} pts so far</span>
              <span className="continue-arrow" aria-hidden="true">
                →
              </span>
            </button>
          ))}
        </section>
      )}

      <h2 className="section-title">Play</h2>
      <div className="game-list">
        <article className="game-row">
          <NinjaIcon style={ninjaFor(2048)} className="game-row-icon" />
          <div className="game-row-text">
            <h3>Classic</h3>
            <p>{classicBest ? `Best ${classicBest.toLocaleString()} on ${size}×${size}` : "The original. Any pace, any size."}</p>
          </div>
          <div className="game-row-actions">
            <SizePicker value={size} onChange={setSize} />
            <button className="btn btn-primary" onClick={() => onClassic(size, false)}>
              Play
            </button>
          </div>
        </article>

        <article className="game-row">
          <NinjaIcon style={ninjaFor(16)} className="game-row-icon" />
          <div className="game-row-text">
            <h3>Coach</h3>
            <p>The AI reviews every move and tells you how to score higher.</p>
          </div>
          <div className="game-row-actions">
            <button className="btn" onClick={() => onOpen("coach")}>
              Guide
            </button>
            <button className="btn btn-primary" onClick={() => onClassic(size, true)}>
              Play
            </button>
          </div>
        </article>

        <article className="game-row">
          <NinjaIcon style={ninjaFor(512)} className="game-row-icon" />
          <div className="game-row-text">
            <h3>Daily</h3>
            <p>
              {dailyBest !== undefined ? `Today's best: ${dailyBest.toLocaleString()}.` : "One board for everyone today."}
              {dailyRank ? ` You're #${dailyRank} worldwide today.` : ""}
              {streak > 1 ? ` 🔥 ${streak}-day streak` : ""}
              {progress.streakFreezes ? ` · ${progress.streakFreezes} freeze${progress.streakFreezes > 1 ? "s" : ""} banked` : ""}
            </p>
          </div>
          <div className="game-row-actions">
            <button className="btn btn-primary" onClick={onDaily}>
              {dailyBest !== undefined ? "Again" : "Play"}
            </button>
          </div>
        </article>

        <article className="game-row game-row-weekly">
          <NinjaIcon style={ninjaFor(4096)} className="game-row-icon" />
          <div className="game-row-text">
            <h3>Weekly · {weekly.name}</h3>
            <p>
              {weekly.description} {weeklyBest ? `Best this week: ${weeklyBest.toLocaleString()}.` : "New rules every Monday."}
            </p>
          </div>
          <div className="game-row-actions">
            <button className="btn btn-primary" onClick={onWeekly}>
              Play
            </button>
          </div>
        </article>

        <article className="game-row">
          <NinjaIcon style={ninjaFor(8192)} className="game-row-icon" />
          <div className="game-row-text">
            <h3>Timed</h3>
            <p>{timedBest ? `Best ${timedBest.toLocaleString()} on ${size}×${size}` : "Sixty seconds on the clock."}</p>
          </div>
          <div className="game-row-actions">
            <SizePicker value={size} onChange={setSize} />
            <button className="btn btn-primary" onClick={() => onTimed(size)}>
              Play
            </button>
          </div>
        </article>

        <article className="game-row">
          <NinjaIcon style={ninjaFor(1024)} className="game-row-icon" />
          <div className="game-row-text">
            <h3>Race</h3>
            <p>
              Two players, same board, first to {ninjaFor(settings.raceTarget).name}.
              {progress.stats.racesPlayed ? ` ${progress.stats.racesWon}/${progress.stats.racesPlayed} won.` : ""}
            </p>
          </div>
          <div className="game-row-actions">
            <button className="btn btn-primary" onClick={onRace}>
              Play
            </button>
          </div>
        </article>

        <article className="game-row">
          <NinjaIcon style={ninjaFor(128)} className="game-row-icon" />
          <div className="game-row-text">
            <h3>Puzzles</h3>
            <p>
              Goal ninja, move limit, three stars. {solved}/{PUZZLES.length} solved.
            </p>
          </div>
          <div className="game-row-actions">
            <button className="btn btn-primary" onClick={onPuzzles}>
              Browse
            </button>
          </div>
        </article>
      </div>

      <h2 className="section-title">Your dojo</h2>
      <div className="tiles">
        <button className="tile-link" onClick={() => onOpen("collection")}>
          <strong>
            {collected}/{NINJA_LIST.length}
          </strong>
          <span>Collection</span>
        </button>
        <button className="tile-link" onClick={() => onOpen("achievements")}>
          <strong>
            {achieved}/{ACHIEVEMENTS.length}
          </strong>
          <span>Achievements</span>
        </button>
        <button className="tile-link" onClick={() => onOpen("leaderboard")}>
          <strong>{progress.leaderboard[0]?.score.toLocaleString() ?? "—"}</strong>
          <span>Leaderboard</span>
        </button>
        <button className="tile-link" onClick={() => onOpen("stats")}>
          <strong>{progress.stats.gamesPlayed}</strong>
          <span>Games · Stats</span>
        </button>
      </div>
    </div>
  );
}
