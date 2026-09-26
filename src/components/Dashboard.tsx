"use client";

import { useEffect, useState } from "react";
import { BOARD_SIZES } from "@/lib/game";
import { ACHIEVEMENTS, dailyStreak, type Progress } from "@/lib/progress";
import { ADVENTURE, CHAPTERS } from "@/lib/adventure";
import { weeklyChallenge } from "@/lib/engagement";
import { fetchBoard } from "@/lib/online";
import LevelBar from "./LevelBar";
import MissionsCard from "./MissionsCard";
import { PUZZLES } from "@/lib/puzzles";
import { todayKey } from "@/lib/rng";
import type { Settings } from "@/lib/settings";
import { NINJA_LIST, ninjaFor } from "@/lib/ninjas";
import DojoScene from "./DojoScene";
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
  onAdventure: () => void;
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
  onAdventure,
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

  const modes = [
    { name: "Daily trial", tag: "A FRESH BOARD EVERY DAY", description: dailyBest !== undefined ? `Your best: ${dailyBest.toLocaleString()}${dailyRank ? ` · World #${dailyRank}` : ""}` : "The same battlefield for every ninja. A fresh challenge at midnight.", value: 512, action: onDaily, label: "Take the trial", tone: "green" },
    { name: "Blitz", tag: "60 SECONDS", description: timedBest ? `Your best: ${timedBest.toLocaleString()} on ${size}×${size}. Beat the clock.` : "Trust your instincts. Build your clan before the clock runs out.", value: 16384, action: () => onTimed(size), label: "Beat the clock", tone: "orange" },
    { name: "Duel", tag: "LOCAL · TWO PLAYERS", description: `One battlefield. Two rivals. First to ${ninjaFor(settings.raceTarget).name} wins.`, value: 1024, action: onRace, label: "Challenge a friend", tone: "purple" },
    { name: "The scrolls", tag: `${solved}/${PUZZLES.length} PUZZLES SOLVED`, description: "Small boards. Limited moves. Every decision matters.", value: 128, action: onPuzzles, label: "Open the scrolls", tone: "blue" },
    { name: "Weekly mission", tag: weekly.name.toUpperCase(), description: `${weekly.description}${weeklyBest ? ` Best: ${weeklyBest.toLocaleString()}.` : " A new twist every week."}`, value: 4096, action: onWeekly, label: "Accept mission", tone: "purple" },
    { name: "Sensei training", tag: "LEARN THE WAY", description: "Get a second pair of eyes on every move. Learn to think three steps ahead.", value: 2048, action: () => onClassic(size, true), label: "Train with Sensei", tone: "gold" },
  ];

  return (
    <div className="dash dojo-home">
      <section className="dojo-hero">
        <div className="hero-copy">
          <span className="eyebrow"><i /> THE ART OF THE MERGE</span>
          <h1>Small moves.<br /> <em>Legendary</em><br /> ninjas.</h1>
          <p>Unite your clan. Master the shadows.<br />Your path to 2048 starts with a single swipe.</p>
          <div className="hero-launch">
            <button className="btn btn-primary launch-button" onClick={() => onClassic(size, false)}>
              {saved[size] !== undefined ? "Continue your run" : "Enter the dojo"} <span aria-hidden="true">↗</span>
            </button>
            <SizePicker value={size} onChange={setSize} />
          </div>
          <span className="hero-footnote">CLASSIC MODE <b>·</b> {classicBest ? `PERSONAL BEST ${classicBest.toLocaleString()}` : "NO TIMER. FIND YOUR FLOW."}</span>
        </div>
        <DojoScene />
        <span className="hero-seal" aria-hidden="true">忍<span>SHINOBI</span></span>
      </section>

      <button className="adventure-invite" onClick={onAdventure}>
        <span className="adventure-invite-art" aria-hidden="true">{CHAPTERS.map((c) => <i key={c.name}>{c.symbol}</i>)}</span>
        <span className="adventure-invite-copy"><span className="eyebrow">STORY MISSIONS · NEW BACKDROPS TO EARN</span><strong>The path of the shinobi</strong><span>Nine missions. Three lands. A home for your clan.</span></span>
        <span className="adventure-invite-action">{ADVENTURE.filter((m) => progress.adventure?.[m.id]).length}/{ADVENTURE.length} complete <b>Begin your journey ↗</b></span>
      </button>
      <div className="dojo-facts">
        <span><b>01</b> Swipe to move</span><span><b>02</b> Merge matching ninjas</span><span><b>03</b> Reach the Sensei</span>
      </div>
      <div className="dojo-section-heading"><div><span className="eyebrow">CHOOSE YOUR PATH</span><h2>A different kind of challenge.</h2></div><span className="streak-counter">{streak ? `${streak} DAY STREAK` : "YOUR NEXT ADVENTURE"} ↗</span></div>
      <div className="mission-grid">
        {modes.map((mode, i) => (
          <button className={`mission-card mission-${mode.tone}`} key={mode.name} onClick={mode.action}>
            <span className="mission-number">0{i + 1}</span>
            <NinjaIcon style={ninjaFor(mode.value)} className="mission-art" />
            <span className="eyebrow">{mode.tag}</span><h3>{mode.name}</h3><p>{mode.description}</p>
            <span className="mission-action">{mode.label}<span aria-hidden="true">↗</span></span>
          </button>
        ))}
      </div>
      <div className="dojo-section-heading"><div><span className="eyebrow">YOUR LEGEND</span><h2>{top ? `${top.name}. And counting.` : "Every master was a rookie."}</h2></div><button className="link" onClick={() => onOpen("coach")}>Read the field guide ↗</button></div>
      <div className="dojo-progress"><LevelBar xp={progress.xp ?? 0} /><MissionsCard progress={progress} /></div>
      {savedSizes.filter((n) => n !== size).length > 0 && <div className="other-runs"><span className="eyebrow">OTHER SAVED RUNS</span>{savedSizes.filter((n) => n !== size).map((n) => <button className="btn" key={n} onClick={() => onClassic(n, settings.coach)}>Resume {n}×{n} · {(saved[n] ?? 0).toLocaleString()} pts ↗</button>)}</div>}
      <div className="dojo-vault">
        <button onClick={() => onOpen("collection")}><span>THE CLAN</span><strong>{collected}<small> / {NINJA_LIST.length}</small></strong><span>Ninjas discovered ↗</span></button>
        <button onClick={() => onOpen("achievements")}><span>HONORS</span><strong>{achieved}<small> / {ACHIEVEMENTS.length}</small></strong><span>Achievements ↗</span></button>
        <button onClick={() => onOpen("leaderboard")}><span>HALL OF FAME</span><strong>{progress.leaderboard[0]?.score.toLocaleString() ?? "—"}</strong><span>Leaderboard ↗</span></button>
        <button onClick={() => onOpen("stats")}><span>YOUR JOURNEY</span><strong>{progress.stats.gamesPlayed}</strong><span>Games played ↗</span></button>
      </div>
      <footer className="dojo-footer"><span>2048 NINJAS</span><span>Patience is power. Keep training.</span><span>忍</span></footer>
    </div>
  );
}
