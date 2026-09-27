"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { highestTile, move, newGame, settle, type Direction, type GameState } from "@/lib/game";
import { randomSeed } from "@/lib/rng";
import { ninjaFor } from "@/lib/ninjas";
import { sounds } from "@/lib/sound";
import Board from "./Board";
import Confetti from "./Confetti";
import NinjaIcon from "./NinjaIcon";

interface Props {
  target: number;
  wasabi: boolean;
  onFinish?: (winner: 0 | 1 | "draw") => void;
}

const P1_KEYS: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};
const P2_KEYS: Record<string, Direction> = {
  w: "up",
  s: "down",
  a: "left",
  d: "right",
  W: "up",
  S: "down",
  A: "left",
  D: "right",
};

const SWIPE = 24;
const SIZE = 4;

type Player = 0 | 1;

interface RaceState {
  seed: number;
  players: [GameState, GameState];
  startedAt: number | null;
  winner: Player | "draw" | null;
  finishedAt: number | null;
}

function fresh(seed: number, wasabi: boolean): RaceState {
  const mk = () => newGame({ size: SIZE, seed, wasabi, undoLimit: 0 });
  return { seed, players: [mk(), mk()], startedAt: null, winner: null, finishedAt: null };
}

function reached(g: GameState, target: number): boolean {
  return highestTile(g) >= target;
}

function decide(players: [GameState, GameState], target: number): Player | "draw" | null {
  const [a, b] = players;
  const ra = reached(a, target);
  const rb = reached(b, target);
  if (ra && !rb) return 0;
  if (rb && !ra) return 1;
  if (ra && rb) return a.score === b.score ? "draw" : a.score > b.score ? 0 : 1;
  if (a.over && b.over) return a.score === b.score ? "draw" : a.score > b.score ? 0 : 1;
  return null;
}

function fmt(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export default function Race({ target, wasabi, onFinish }: Props) {
  const [race, setRace] = useState<RaceState>(() => fresh(randomSeed(), wasabi));
  const [now, setNow] = useState(0);
  const [nudges, setNudges] = useState<[Direction | null, Direction | null]>([null, null]);
  const raceRef = useRef(race);
  const pointer = useRef<[{ x: number; y: number } | null, { x: number; y: number } | null]>([null, null]);
  const timers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  useEffect(() => {
    raceRef.current = race;
  }, [race]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  const later = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      timers.current.delete(id);
      fn();
    }, ms);
    timers.current.add(id);
  }, []);

  const play = useCallback(
    (who: Player, dir: Direction) => {
      const cur = raceRef.current;
      if (cur.winner !== null) return;
      const prev = cur.players[who];
      if (prev.over || reached(prev, target)) return;
      const nowMs = Date.now();
      const next = move(prev, dir, nowMs);
      if (next === prev) return;

      if (next.lastGain > 0) sounds.merge(next.lastGain);
      else sounds.slide();

      const players: [GameState, GameState] = [...cur.players] as [GameState, GameState];
      players[who] = next;
      const winner = decide(players, target);
      const updated: RaceState = {
        ...cur,
        players,
        startedAt: cur.startedAt ?? nowMs,
        winner,
        finishedAt: winner !== null ? nowMs : null,
      };
      if (winner !== null) {
        sounds.win();
        onFinish?.(winner);
      }
      raceRef.current = updated;
      setRace(updated);

      setNudges((n) => (who === 0 ? [dir, n[1]] : [n[0], dir]));
      later(() => setNudges((n) => (who === 0 ? [null, n[1]] : [n[0], null])), 160);
      later(() => {
        const c = raceRef.current;
        if (c.players[who] === next) {
          const settled: [GameState, GameState] = [...c.players] as [GameState, GameState];
          settled[who] = settle(next);
          raceRef.current = { ...c, players: settled };
          setRace(raceRef.current);
        }
      }, 520);
    },
    [later, target, onFinish],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      const p1 = P1_KEYS[e.key];
      const p2 = P2_KEYS[e.key];
      if (p1) {
        e.preventDefault();
        play(0, p1);
      } else if (p2) {
        e.preventDefault();
        play(1, p2);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [play]);

  // Race clock.
  useEffect(() => {
    if (race.startedAt === null || race.winner !== null) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [race.startedAt, race.winner]);

  const restart = useCallback(
    (sameBoard: boolean) => {
      const seed = sameBoard ? raceRef.current.seed : randomSeed();
      const r = fresh(seed, wasabi);
      raceRef.current = r;
      setRace(r);
    },
    [wasabi],
  );

  const swipeHandlers = (who: Player) => ({
    onPointerDown: (e: React.PointerEvent) => {
      if ((e.target as HTMLElement).closest("button,a,input,select,textarea,summary")) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      pointer.current[who] = { x: e.clientX, y: e.clientY };
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        /* unsupported */
      }
    },
    onPointerUp: (e: React.PointerEvent) => {
      const start = pointer.current[who];
      pointer.current[who] = null;
      if (!start) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE) return;
      if (Math.abs(dx) > Math.abs(dy)) play(who, dx > 0 ? "right" : "left");
      else play(who, dy > 0 ? "down" : "up");
    },
    onPointerCancel: () => {
      pointer.current[who] = null;
    },
  });

  const elapsed =
    race.startedAt === null ? 0 : (race.finishedAt ?? Math.max(now, race.startedAt)) - race.startedAt;
  const targetStyle = ninjaFor(target);
  const labels = ["Player 1", "Player 2"] as const;
  const keys = ["↑ ← ↓ →", "W A S D"] as const;

  return (
    <div className="race">
      <div className="race-status">
        <span>
          First to <strong>{targetStyle.name}</strong>
          <NinjaIcon style={targetStyle} className="race-target-icon" />
        </span>
        <span className="race-clock" aria-label="Race time">
          {race.startedAt === null ? "Ready — any move starts the clock" : fmt(elapsed)}
        </span>
      </div>

      <div className="race-boards">
        {race.players.map((g, i) => {
          const who = i as Player;
          const top = ninjaFor(highestTile(g));
          const won = race.winner === who;
          const done = reached(g, target);
          return (
            <section
              key={who}
              className={`race-player ${won ? "race-winner" : ""} ${g.over && !done ? "race-stuck" : ""}`}
              aria-label={labels[who]}
            >
              <header className="race-player-header">
                <div>
                  <strong>{labels[who]}</strong>
                  <span className="race-keys">{keys[who]}</span>
                </div>
                <div className="race-score">
                  <span>{g.score.toLocaleString()}</span>
                  <small>
                    <NinjaIcon style={top} className="race-top-icon" /> {top.name}
                  </small>
                </div>
              </header>
              <div className="board-wrap" {...swipeHandlers(who)}>
                <Board size={g.size} tiles={g.tiles} nudge={nudges[who]} />
                {g.over && !done && race.winner === null && (
                  <div className="overlay race-overlay">
                    <div className="overlay-card">
                      <h2>Stuck!</h2>
                      <p>No moves left — waiting for the other player.</p>
                    </div>
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>

      {race.winner !== null && (
        <div className="race-result">
          <Confetti count={36} />
          <div className="overlay-card">
            <NinjaIcon style={targetStyle} className="overlay-icon" />
            <h2>
              {race.winner === "draw" ? "It's a draw!" : `${labels[race.winner]} wins!`}
            </h2>
            <p>
              {race.players[0].score.toLocaleString()} vs {race.players[1].score.toLocaleString()} ·{" "}
              {fmt(elapsed)}
            </p>
            <div className="overlay-buttons">
              <button className="btn btn-primary" onClick={() => restart(false)}>
                Rematch
              </button>
              <button className="btn" onClick={() => restart(true)}>
                Same board again
              </button>
            </div>
          </div>
        </div>
      )}

      {race.winner === null && (
        <p className="help">
          Both boards start identical and get the same tiles in the same order — pure skill. Player 1
          uses the arrow keys, Player 2 uses WASD (or swipe each board on touch).{" "}
          <button className="link" onClick={() => restart(false)}>
            New board
          </button>
        </p>
      )}
    </div>
  );
}
