"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  TIMED_SECONDS,
  WIN_VALUE,
  applyUndo,
  canUndo,
  KEY_MAP,
  highestTile,
  move,
  newGame,
  settle,
  tick,
  timeLeft,
  type Direction,
  type GameState,
  type Mode,
} from "@/lib/game";
import { bestMove } from "@/lib/ai";
import { boardAdvice, reviewMove, type CoachNote } from "@/lib/coach";
import {
  XP_PUZZLE_STAR,
  XP_RACE_PLAY,
  XP_RACE_WIN,
  dailyMissions,
  levelInfo,
  nearMiss,
  weeklyChallenge,
  xpForGame,
} from "@/lib/engagement";
import { collectBoardArt, renderShareCard, shareBlob } from "@/lib/shareCard";
import { PUZZLES, puzzleById, puzzleGame, puzzleStars, puzzleStatus } from "@/lib/puzzles";
import { eligibleForOnline, submitScore } from "@/lib/online";
import { seedFromString, todayKey } from "@/lib/rng";
import { ninjaFor } from "@/lib/ninjas";
import { loadJson, removeKey, saveJson, clearAll } from "@/lib/storage";
import { DEFAULT_SETTINGS, MODES, applyTheme, type Settings } from "@/lib/settings";
import Race from "./Race";
import Dashboard from "./Dashboard";
import Adventure from "./Adventure";
import NextRankGoal from "./NextRankGoal";
import { recordAdventure, sceneryUnlocked } from "@/lib/adventure";
import InstallPrompt from "./InstallPrompt";
import DishStrip from "./DishStrip";
import PuzzleList from "./PuzzleList";
import { BackIcon, GearIcon, HelpIcon, HomeIcon, ShareIcon } from "./Icons";
import HowToPanel from "./panels/HowToPanel";
import Logo from "./Logo";
import CoachPanel from "./panels/CoachPanel";
import {
  EMPTY_PROGRESS,
  addXp,
  completeMissions,
  dailyStreak,
  earnFreezeIfDue,
  maintainStreak,
  afterMove,
  bestFor,
  leaderboardRank,
  recordEvent,
  recordGameEnd,
  recordPuzzle,
  type Achievement,
  type Progress,
} from "@/lib/progress";
import { setSoundEnabled, setSoundVolume, sounds, unlock as unlockAudio, vibrate } from "@/lib/sound";
import Board from "./Board";
import Confetti from "./Confetti";
import Modal from "./Modal";
import NinjaIcon from "./NinjaIcon";
import Toasts, { type Toast } from "./Toasts";
import StatsPanel from "./panels/StatsPanel";
import CollectionPanel from "./panels/CollectionPanel";
import AchievementsPanel from "./panels/AchievementsPanel";
import LeaderboardPanel from "./panels/LeaderboardPanel";
import SettingsPanel from "./panels/SettingsPanel";
import DishDetail from "./panels/DishDetail";

const UNDO_HISTORY = 20;
const AI_STEP_MS = 180;
const AI_BUDGET_MS = 40;
const DIR_ARROW: Record<Direction, string> = { up: "↑", down: "↓", left: "←", right: "→" };
const SWIPE_THRESHOLD = 24;
const TOAST_MS = 3500;
const POPUP_MS = 900;

type Panel = "stats" | "collection" | "achievements" | "leaderboard" | "settings" | "coach" | "howto";
type View = "home" | "play" | "puzzles" | "adventure";

/** The single-player mode behind the UI mode ("race" has no single game of its own). */
function gameMode(settings: Settings): Mode {
  if (settings.mode === "race") return "classic";
  if (settings.mode === "weekly") return weeklyChallenge().timed ? "timed" : "classic";
  return settings.mode;
}

/**
 * Storage key for the resumable game matching these settings (timed/puzzle games aren't resumable).
 * A daily game is keyed by its own date so it can't be saved under tomorrow's key after midnight.
 */
function gameKey(settings: Settings, dailyKey: string = todayKey()): string | null {
  if (settings.mode === "timed" || settings.mode === "race" || settings.mode === "puzzle") return null;
  if (settings.mode === "weekly") {
    const w = weeklyChallenge();
    return w.timed ? null : `game:weekly:${w.id}`;
  }
  if (settings.mode === "daily") return `game:daily:${dailyKey}`;
  return `game:classic:${settings.size}`;
}

/** Drop saved daily boards from previous days. */
function pruneOldDailies(): void {
  if (typeof window === "undefined") return;
  try {
    const today = todayKey();
    const stale: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("sushi-2048:game:daily:") && !k.endsWith(today)) stale.push(k);
    }
    stale.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}

function createGame(settings: Settings): GameState {
  if (settings.mode === "puzzle") return puzzleGame(puzzleById(settings.puzzleId) ?? PUZZLES[0]);
  if (settings.mode === "weekly") {
    const w = weeklyChallenge();
    return {
      ...newGame({ mode: w.timed ? "timed" : "classic", size: w.size, undoLimit: w.undoLimit, wasabi: w.wasabi }),
      challengeId: w.id,
    };
  }
  const daily = settings.mode === "daily";
  const dailyKey = todayKey();
  return newGame({
    mode: gameMode(settings),
    size: daily ? 4 : settings.size,
    seed: daily ? seedFromString(`sushi-daily-${dailyKey}`) : undefined,
    undoLimit: settings.undoLimit,
    wasabi: settings.wasabi,
    dailyKey: daily ? dailyKey : undefined,
  });
}

function loadGame(settings: Settings): GameState | null {
  const key = gameKey(settings);
  if (!key) return null;
  const saved = loadJson<GameState | null>(key, null);
  if (!saved || !Array.isArray(saved.tiles) || typeof saved.size !== "number") return null;
  if (saved.mode !== gameMode(settings)) return null;
  if (settings.mode === "daily" && saved.dailyKey !== todayKey()) return null;
  if (settings.mode === "weekly" && saved.challengeId !== weeklyChallenge().id) return null;
  if (settings.mode === "classic" && saved.challengeId) return null;
  return settle(saved);
}

function loadProgress(): Progress {
  const p = loadJson<Partial<Progress>>("progress", {});
  return {
    ...EMPTY_PROGRESS,
    ...p,
    stats: { ...EMPTY_PROGRESS.stats, ...(p.stats ?? {}) },
    passport: p.passport ?? {},
    achievements: p.achievements ?? {},
    leaderboard: p.leaderboard ?? [],
    bests: p.bests ?? {},
    dailyBests: p.dailyBests ?? {},
  };
}

function formatDailyLabel(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function Game() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [progress, setProgress] = useState<Progress>(EMPTY_PROGRESS);
  const [state, setState] = useState<GameState | null>(null);
  const [history, setHistory] = useState<GameState[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [popups, setPopups] = useState<{ id: number; gain: number }[]>([]);
  const [nudge, setNudge] = useState<Direction | null>(null);
  const [announce, setAnnounce] = useState("");
  const [panel, setPanel] = useState<Panel | null>(null);
  const [dish, setDish] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [shareStatus, setShareStatus] = useState<"idle" | "copied" | "failed">("idle");
  const [ready, setReady] = useState(false);
  const [hint, setHint] = useState<{ dir: Direction; atMove: number } | null>(null);
  const [autoplay, setAutoplay] = useState(false);
  const [submitName, setSubmitName] = useState("");
  const [submitState, setSubmitState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [submitMsg, setSubmitMsg] = useState("");
  const [view, setView] = useState<View>("home");
  const [coachNote, setCoachNote] = useState<CoachNote | null>(null);
  const [confirmNew, setConfirmNew] = useState(false);
  const [challenge, setChallenge] = useState<{ name: string; score: number } | null>(null);
  const [cardStatus, setCardStatus] = useState<"idle" | "busy" | "done">("idle");
  const [shake, setShake] = useState(false);
  const [pbFlash, setPbFlash] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);
  // Parsed once and kept in a ref so Strict Mode's second effect run sees the same values.
  const bootParams = useRef<URLSearchParams | null>(null);

  // Refs mirror state so input handlers never act on a stale closure.
  const stateRef = useRef<GameState | null>(null);
  const progressRef = useRef<Progress>(EMPTY_PROGRESS);
  const settingsRef = useRef<Settings>(DEFAULT_SETTINGS);
  const historyRef = useRef<GameState[]>([]);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const timers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const nextToastId = useRef(1);
  const lastTickSecond = useRef<number | null>(null);
  const modalOpen = panel !== null || dish !== null || confirmNew;

  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);
  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  const later = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      timers.current.delete(id);
      fn();
    }, ms);
    timers.current.add(id);
  }, []);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  // ---------- helpers ----------
  const addToast = useCallback(
    (toast: Omit<Toast, "id">) => {
      const id = nextToastId.current++;
      setToasts((t) => [...t.slice(-5), { ...toast, id }]);
      later(() => setToasts((t) => t.filter((x) => x.id !== id)), TOAST_MS);
    },
    [later],
  );

  const dismissToast = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);


  // ---------- boot ----------
  useEffect(() => {
    pruneOldDailies();
    const s: Settings = { ...DEFAULT_SETTINGS, ...loadJson<Partial<Settings>>("settings", {}) };
    const p = maintainStreak(loadProgress(), todayKey());

    // "Beat my score" links: ?challenge=YYYY-MM-DD&score=1234&name=Ana
    bootParams.current ??= new URLSearchParams(window.location.search);
    const params = bootParams.current;
    const chDate = params.get("challenge");
    let initialChallenge: { name: string; score: number } | null = null;
    if (chDate) {
      const chScore = Number(params.get("score"));
      const chName = (params.get("name") ?? "a friend").slice(0, 16);
      s.mode = "daily";
      if (chDate === todayKey() && Number.isFinite(chScore) && chScore > 0) {
        initialChallenge = { name: chName, score: chScore };
      } else {
        later(
          () =>
            addToast({
              kind: "info",
              title: "That challenge has expired",
              body: `It was for ${chDate}. Here's today's board instead.`,
            }),
          800,
        );
      }
    }
    if (!loadJson("shadow-dojo-intro", false)) {
      s.theme = "dojo";
      saveJson("settings", s);
      saveJson("shadow-dojo-intro", true);
    }
    if (!sceneryUnlocked(p,s.scenery)) s.scenery = "rooftops";
    applyTheme(s.theme);
    setSoundEnabled(s.sound);
    setSoundVolume(s.soundVolume);
    const g = loadGame(s) ?? createGame(s);
    settingsRef.current = s;
    progressRef.current = p;
    stateRef.current = g;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrating from localStorage after mount
    setSettings(s);
    if (initialChallenge) setChallenge(initialChallenge);
    setProgress(p);
    setState(g);
    setSubmitName(s.playerName);
    // Come back to the game you were in (timed/race/puzzle boards don't survive a reload).
    const lastView = loadJson<View>("view", "home");
    if (chDate) setView("play");
    else if (lastView === "puzzles" || lastView === "adventure") setView(lastView);
    else if (lastView === "play" && (s.mode === "classic" || s.mode === "daily" || s.mode === "weekly")) setView("play");
    // The entrance and arena explain the basics inline; help stays available in the app bar.
    setReady(true);

    const wake = () => unlockAudio();
    window.addEventListener("pointerdown", wake, { passive: true });
    window.addEventListener("keydown", wake);
    return () => {
      window.removeEventListener("pointerdown", wake);
      window.removeEventListener("keydown", wake);
    };
  }, [addToast, later]);

  // ---------- persistence ----------
  useEffect(() => {
    if (!ready) return;
    saveJson("settings", settings);
    applyTheme(settings.theme);
    setSoundEnabled(settings.sound);
    setSoundVolume(settings.soundVolume);
  }, [settings, ready]);

  useEffect(() => {
    if (!ready) return;
    saveJson("progress", progress);
  }, [progress, ready]);

  useEffect(() => {
    if (!ready) return;
    saveJson("view", view);
  }, [view, ready]);

  // Once booted, drop any challenge params from the address bar so a refresh doesn't replay them.
  useEffect(() => {
    if (ready && window.location.search) window.history.replaceState(null, "", window.location.pathname);
  }, [ready]);

  useEffect(() => {
    if (!ready || !state) return;
    const key = gameKey(settings, state.dailyKey);
    if (key) saveJson(key, settle(state));
  }, [state, settings, ready]);

  const celebrateAchievements = useCallback(
    (list: Achievement[]) => {
      if (list.length) addToast({
        kind: "achievement",
        title: list.length === 1 ? "Achievement unlocked" : `${list.length} achievements unlocked`,
        body: list.map((a) => a.name).join(" · "),
        icon: list[list.length - 1].icon,
      });
      if (list.length) {
        sounds.achievement();
        if (settingsRef.current.haptics) vibrate([20, 40, 20]);
      }
    },
    [addToast],
  );

  /** Apply a progress update, celebrating anything new. */
  const applyProgress = useCallback(
    (upd: { progress: Progress; newAchievements: Achievement[] }) => {
      progressRef.current = upd.progress;
      setProgress(upd.progress);
      celebrateAchievements(upd.newAchievements);
    },
    [celebrateAchievements],
  );

  /** Check today's missions against the current game and award XP for new completions. */
  const checkMissions = useCallback(
    (g: GameState) => {
      if (g.mode === "puzzle" || (g.aiMoves ?? 0) > 0) return;
      const today = todayKey();
      const done = new Set(progressRef.current.missions?.[today] ?? []);
      const hit = dailyMissions(today).filter((m) => !done.has(m.id) && m.check(g, progressRef.current));
      if (hit.length === 0) return;
      const res = completeMissions(progressRef.current, today, hit.map((m) => m.id));
      progressRef.current = res.progress;
      const xp = hit.reduce((a, m) => a + m.xp, 0);
      applyProgress(addXp(progressRef.current, g, xp));
      addToast({ kind: "achievement", title: `${hit.length === 1 ? "Mission complete" : `${hit.length} missions complete`} · +${xp} XP`, body: hit.map((m) => m.text).join(" · "), icon: 64 });
      sounds.achievement();
      const all = dailyMissions(today).every((m) => progressRef.current.missions[today]?.includes(m.id));
      if (all) later(() => addToast({ kind: "info", title: "All missions done!", body: "Come back tomorrow for three more." }), 1400);
    },
    [addToast, applyProgress, later],
  );

  /** Record stats/leaderboard for a finished or abandoned game (once). */
  const finishGame = useCallback(
    (g: GameState): GameState => {
      if (g.recorded || g.moves === 0) return g;
      const upd = recordGameEnd(progressRef.current, g, settingsRef.current.coach);
      progressRef.current = upd.progress;
      setProgress(upd.progress);
      celebrateAchievements(upd.newAchievements);
      checkMissions(g);
      const before = levelInfo(progressRef.current.xp ?? 0).level;
      const xp = xpForGame(g);
      if (xp > 0) {
        applyProgress(addXp(progressRef.current, g, xp));
        const after = levelInfo(progressRef.current.xp).level;
        later(() => addToast({ kind: "info", title: `+${xp} XP`, body: `Level ${after} · ${levelInfo(progressRef.current.xp).title}` }), 600);
        if (after > before) {
          later(() => addToast({ kind: "achievement", title: `Level ${after}!`, body: `You're now a ${levelInfo(progressRef.current.xp).title}`, icon: 2048 }), 1000);
          sounds.win();
        }
      }
      return { ...g, recorded: true };
    },
    [addToast, applyProgress, celebrateAchievements, checkMissions, later],
  );

  const commit = useCallback((g: GameState) => {
    stateRef.current = g;
    setState(g);
  }, []);

  const startNewGame = useCallback(
    (s: Settings = settingsRef.current) => {
      const cur = stateRef.current;
      if (cur && !cur.over && cur.moves > 0) finishGame(cur);
      const key = gameKey(s);
      if (key) removeKey(key);
      historyRef.current = [];
      setHistory([]);
      setPopups([]);
      setHint(null);
      setAutoplay(false);
      setSubmitState("idle");
      setCoachNote(null);
      lastTickSecond.current = null;
      commit(createGame(s));
    },
    [commit, finishGame],
  );

  /** Ask before throwing away a game that's actually under way. */
  const requestNewGame = useCallback(() => {
    const cur = stateRef.current;
    const inProgress =
      !!cur && cur.moves > 0 && cur.score > 0 && !cur.over && cur.mode !== "puzzle" && !(cur.won && !cur.keepPlaying);
    if (inProgress) setConfirmNew(true);
    else startNewGame();
  }, [startNewGame]);

  const closeHowTo = useCallback(() => {
    saveJson("seen-howto", true);
    setPanel(null);
  }, []);

  // ---------- moves ----------
  const applyMove = useCallback(
    (dir: Direction, byAi = false) => {
      const prev = stateRef.current;
      if (!prev || modalOpen) return;
      if (prev.over || (prev.won && !prev.keepPlaying)) return;
      if (prev.mode === "puzzle" && puzzleStatus(prev) !== "playing") return;
      const nowMs = Date.now();
      let next = move(prev, dir, nowMs);
      if (next === prev) return;
      if (byAi) next = { ...next, aiMoves: (next.aiMoves ?? 0) + 1 };
      setHint(null);

      // Coach: rate the move against the AI's choice — after the slide has animated, so input stays snappy.
      const coachThis = settingsRef.current.coach && !byAi && prev.mode !== "puzzle";

      const snapshot = settle(prev);
      const hist = [...historyRef.current.slice(-(UNDO_HISTORY - 1)), snapshot];
      historyRef.current = hist;
      setHistory(hist);

      // Progress bookkeeping.
      const upd = afterMove(progressRef.current, next);
      progressRef.current = upd.progress;
      setProgress(upd.progress);

      const prevTop = highestTile(prev);
      const top = highestTile(next);
      const mergedValues = next.tiles.filter((t) => t.merged).map((t) => t.value);
      const biggest = mergedValues.length ? Math.max(...mergedValues) : 0;

      // Personal best — celebrate once per game.
      const prevBest = bestFor(progressRef.current, prev);
      if (!prev.pbCelebrated && prevBest > 0 && prev.score <= prevBest && next.score > prevBest) {
        next = { ...next, pbCelebrated: true };
        setPbFlash(true);
        later(() => setPbFlash(false), 1200);
        sounds.unlock();
        addToast({ kind: "achievement", title: "New personal best!", body: `${next.score.toLocaleString()} points`, icon: highestTile(next) });
      }
      if (challenge && prev.mode === "daily" && prev.score <= challenge.score && next.score > challenge.score) {
        addToast({ kind: "achievement", title: `You beat ${challenge.name}!`, body: `${challenge.score.toLocaleString()} → ${next.score.toLocaleString()}`, icon: 512 });
        sounds.win();
      }
      if (next.lastGain >= 512) {
        setShake(true);
        later(() => setShake(false), 320);
        if (settingsRef.current.haptics) vibrate([20, 30, 40]);
      }

      // Feedback.
      if (next.lastGain > 0) {
        sounds.merge(biggest, next.combo ?? 1);
        if (next.wasabiMerges > prev.wasabiMerges) sounds.smoke();
        if (settingsRef.current.haptics) vibrate(10);
        const id = nowMs + Math.random();
        setPopups((p) => [...p.slice(-3), { id, gain: next.lastGain }]);
        later(() => setPopups((p) => p.filter((x) => x.id !== id)), POPUP_MS);
      } else {
        sounds.slide();
      }
      setNudge(dir);
      later(() => setNudge(null), 160);

      if (top > prevTop) {
        const style = ninjaFor(top);
        const fresh = upd.newDishes.includes(top);
        addToast({
          kind: "dish",
          title: fresh ? `New ninja: ${style.name}!` : `${style.name}!`,
          body: fresh ? "Added to your collection" : `${top.toLocaleString()} points`,
          icon: top,
        });
        sounds.unlock();
      }
      celebrateAchievements(upd.newAchievements);

      if (next.won && !prev.won) {
        sounds.win();
        if (settingsRef.current.haptics) vibrate([30, 50, 30, 50, 60]);
      }
      if (next.mode === "puzzle") {
        const status = puzzleStatus(next);
        const puzzle = puzzleById(next.puzzleId ?? "");
        if (status === "solved" && puzzle) {
          const stars = puzzleStars(puzzle, next.moves);
          const already = progressRef.current.puzzles[next.puzzleId ?? ""]?.stars ?? 0;
          const pu = recordPuzzle(progressRef.current, next, stars);
          progressRef.current = pu.progress;
          setProgress(pu.progress);
          celebrateAchievements(pu.newAchievements);
          const gained = Math.max(0, stars - already) * XP_PUZZLE_STAR;
          if (gained > 0) {
            applyProgress(addXp(progressRef.current, next, gained));
            later(() => addToast({ kind: "info", title: `+${gained} XP`, body: `${stars}-star solve` }), 500);
          }
          sounds.win();
          if (settingsRef.current.haptics) vibrate([30, 50, 60]);
        } else if (status === "failed") {
          sounds.over();
        }
      } else if (next.over) {
        next = finishGame(next);
        sounds.over();
      }

      if (!byAi) checkMissions(next);

      const parts = [`Moved ${dir}.`];
      if (next.lastGain > 0) parts.push(`Plus ${next.lastGain} points.`);
      parts.push(`Score ${next.score}.`);
      if (top > prevTop) parts.push(`New highest ninja: ${ninjaFor(top).name}.`);
      if (next.won && !prev.won) parts.push("You made the Sensei!");
      if (next.over) parts.push("No moves left. Game over.");
      setAnnounce(parts.join(" "));

      commit(next);
      // Remove merge ghosts once the slide animation has finished.
      later(() => {
        const cur = stateRef.current;
        // Same move (possibly with coach bookkeeping), not a later state that reached the same move count.
        if (cur && cur.tiles === next.tiles) commit(settle(cur));
      }, 520);
      if (coachThis) {
        later(() => {
          const note = reviewMove(prev, dir, next);
          setCoachNote(note);
          const cur = stateRef.current;
          if (cur && cur.tiles === next.tiles && note.rating === "blunder") {
            const log = [...(cur.blunderLog ?? []), { move: next.moves, title: note.title }].slice(-5);
            commit({ ...cur, blunders: (cur.blunders ?? 0) + 1, blunderLog: log });
          }
        }, 170);
      }
    },
    [addToast, applyProgress, celebrateAchievements, challenge, checkMissions, commit, finishGame, later, modalOpen],
  );

  const undo = useCallback(() => {
    const cur = stateRef.current;
    const hist = historyRef.current;
    if (!cur || hist.length === 0 || !canUndo(cur)) return;
    const prev = hist[hist.length - 1];
    historyRef.current = hist.slice(0, -1);
    setHistory(historyRef.current);
    commit(applyUndo(prev, cur));
    sounds.undo();
    setAnnounce("Undid last move.");
  }, [commit]);

  const keepPlaying = useCallback(() => {
    const cur = stateRef.current;
    if (cur) commit({ ...cur, keepPlaying: true });
  }, [commit]);

  // ---------- settings ----------
  const changeSettings = useCallback(
    (patch: Partial<Settings>) => {
      const prevS = settingsRef.current;
      const nextS = { ...prevS, ...patch };
      settingsRef.current = nextS;
      setSettings(nextS);
      const boardChanged =
        nextS.mode !== prevS.mode ||
        nextS.size !== prevS.size ||
        (nextS.mode === "puzzle" && nextS.puzzleId !== prevS.puzzleId);
      if (!boardChanged) return;
      setAutoplay(false);
      setHint(null);
      setSubmitState("idle");
      setCoachNote(null);
      // Timed games can't be resumed, so leaving one counts as finishing it.
      const cur = stateRef.current;
      if (cur && prevS.mode === "timed" && !cur.over && cur.moves > 0) finishGame(cur);
      // Race has its own boards; the single-player game is left untouched until we come back.
      if (nextS.mode === "race") return;
      historyRef.current = [];
      setHistory([]);
      setPopups([]);
      lastTickSecond.current = null;
      commit(loadGame(nextS) ?? createGame(nextS));
    },
    [commit, finishGame],
  );

  const resetProgress = useCallback(() => {
    if (!window.confirm("Reset all stats, collection, achievements and scores? This can't be undone.")) return;
    clearAll();
    progressRef.current = EMPTY_PROGRESS;
    setProgress(EMPTY_PROGRESS);
    settingsRef.current = { ...settingsRef.current, scenery: "rooftops" };
    setSettings(settingsRef.current);
    saveJson("settings", settingsRef.current);
    stateRef.current = null;
    startNewGame();
    setPanel(null);
    setView("home");
    addToast({ kind: "info", title: "Progress reset", body: "A new journey begins." });
  }, [addToast, startNewGame]);

  // Pause the timed clock while the tab is hidden by shifting the start time forward.
  useEffect(() => {
    let hiddenAt: number | null = null;
    const onVisibility = () => {
      if (document.hidden) {
        hiddenAt = Date.now();
        return;
      }
      const cur = stateRef.current;
      if (hiddenAt !== null && cur && cur.mode === "timed" && cur.startedAt !== null && !cur.over) {
        commit({ ...cur, startedAt: cur.startedAt + (Date.now() - hiddenAt) });
      }
      hiddenAt = null;
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [commit]);

  // ---------- timed mode clock ----------
  useEffect(() => {
    if (!state || state.mode !== "timed" || state.startedAt === null || state.over) return;
    const id = setInterval(() => {
      const cur = stateRef.current;
      if (!cur) return;
      const t = Date.now();
      setNow(t);
      const left = timeLeft(cur, t);
      if (left !== null) {
        const sec = Math.ceil(left);
        if (sec <= 5 && sec > 0 && lastTickSecond.current !== sec) {
          lastTickSecond.current = sec;
          sounds.tick();
        }
      }
      const ticked = tick(cur, t);
      if (ticked !== cur) {
        commit(finishGame(ticked));
        sounds.over();
        setAnnounce(`Time's up! Final score ${ticked.score}.`);
      }
    }, 100);
    return () => clearInterval(id);
  }, [state, commit, finishGame]);

  // ---------- input ----------
  useEffect(() => {
    if (settings.mode === "race" || view !== "play") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || modalOpen) return;
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      const dir = KEY_MAP[e.key];
      if (dir) {
        e.preventDefault();
        applyMove(dir);
      } else if (e.key === "r" || e.key === "R") {
        requestNewGame();
      } else if (e.key === "u" || e.key === "U" || e.key === "z" || e.key === "Z") {
        undo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [applyMove, requestNewGame, undo, modalOpen, settings.mode, view]);

  // ---------- AI: hint + autoplay ----------
  const showHint = useCallback(() => {
    const cur = stateRef.current;
    if (!cur || cur.over) return;
    const s = bestMove(cur, AI_BUDGET_MS * 2);
    if (s) {
      setHint({ dir: s.dir, atMove: cur.moves });
      setAnnounce(`Hint: move ${s.dir}.`);
      const withHint = { ...cur, hintsUsed: (cur.hintsUsed ?? 0) + 1 };
      commit(withHint);
      const upd = recordEvent(progressRef.current, withHint, { hintsUsed: 1 });
      progressRef.current = upd.progress;
      setProgress(upd.progress);
      celebrateAchievements(upd.newAchievements);
    }
  }, [celebrateAchievements, commit]);

  const onRaceFinish = useCallback(
    (winner: 0 | 1 | "draw") => {
      const cur = stateRef.current;
      if (!cur) return;
      const upd = recordEvent(progressRef.current, cur, { racesPlayed: 1, racesWon: winner === "draw" ? 0 : 1 });
      progressRef.current = upd.progress;
      setProgress(upd.progress);
      celebrateAchievements(upd.newAchievements);
      applyProgress(addXp(progressRef.current, cur, winner === "draw" ? XP_RACE_PLAY : XP_RACE_WIN));
    },
    [applyProgress, celebrateAchievements],
  );

  // Daily streak: earn a freeze at each 7-day milestone.
  useEffect(() => {
    if (!ready) return;
    const res = earnFreezeIfDue(progressRef.current, todayKey());
    if (res.earned) {
      progressRef.current = res.progress;
      setProgress(res.progress);
      addToast({ kind: "achievement", title: "Streak freeze earned", body: "One missed day will be forgiven.", icon: 8192 });
    } else if (res.progress.longestStreak !== progressRef.current.longestStreak) {
      progressRef.current = res.progress;
      setProgress(res.progress);
    }
    // Runs when a daily result lands; the callbacks are stable.
  }, [ready, progress.dailyBests, addToast, later]);

  // ---------- share card ----------
  const shareCard = useCallback(async () => {
    const cur = stateRef.current;
    if (!cur || cardStatus === "busy") return;
    setCardStatus("busy");
    try {
      const top = ninjaFor(highestTile(cur));
      const modeName = MODES.find((m) => m.id === settingsRef.current.mode)?.name ?? cur.mode;
      const blob = await renderShareCard({
        state: cur,
        title: `${cur.score.toLocaleString()} points`,
        subtitle: `${top.name} · ${modeName} · ${cur.size}×${cur.size}${cur.won ? " · Won" : ""}`,
        art: collectBoardArt(boardRef.current),
        url: window.location.host,
      });
      await shareBlob(blob, `I made the ${top.name} with ${cur.score.toLocaleString()} points in 2048 Ninjas 🥷`);
      setCardStatus("done");
      applyProgress(recordEvent(progressRef.current, cur, { shares: 1 }));
    } catch (err) {
      if ((err as { name?: string })?.name !== "AbortError") setCardStatus("idle");
      else setCardStatus("idle");
      return;
    }
    later(() => setCardStatus("idle"), 2000);
  }, [applyProgress, cardStatus, later]);

  const savedGames = useCallback((): Record<number, number | undefined> => {
    const out: Record<number, number | undefined> = {};
    for (const n of [3, 4, 5, 6]) {
      const g = loadJson<GameState | null>(`game:classic:${n}`, null);
      out[n] = g && g.moves > 0 && !g.over ? g.score : undefined;
    }
    return out;
  }, []);

  const goHome = useCallback(() => {
    setAutoplay(false);
    setView("home");
  }, []);

  const completeAdventure = useCallback((id: string, game: GameState) => {
    const next = recordAdventure(progressRef.current, id, game);
    if (next === progressRef.current) return;
    // recordAdventure grants the star XP; re-check achievements (e.g. level thresholds) against the regular game.
    const upd = addXp(next, stateRef.current ?? game, 0);
    applyProgress(upd);
    saveJson("progress", upd.progress);
  }, [applyProgress]);

  const play = useCallback(
    (patch: Partial<Settings>) => {
      changeSettings(patch);
      setView("play");
    },
    [changeSettings],
  );

  useEffect(() => {
    if (!autoplay) return;
    const id = setInterval(() => {
      const cur = stateRef.current;
      if (!cur || cur.over || (cur.won && !cur.keepPlaying)) {
        setAutoplay(false);
        return;
      }
      const s = bestMove(cur, AI_BUDGET_MS);
      if (!s) {
        setAutoplay(false);
        return;
      }
      applyMove(s.dir, true);
    }, AI_STEP_MS);
    return () => clearInterval(id);
  }, [autoplay, applyMove]);

  // ---------- global leaderboard ----------
  const submit = useCallback(async () => {
    const cur = stateRef.current;
    const name = submitName.trim().slice(0, 16);
    if (!cur || !name || cur.submitted) return;
    setSubmitState("sending");
    changeSettings({ playerName: name });
    try {
      const res = await submitScore(cur, name);
      commit({ ...stateRef.current!, submitted: true });
      setSubmitState("done");
      setSubmitMsg(res.rank ? `#${res.rank} on the global board!` : "Submitted — outside the top 25 for now.");
      addToast({ kind: "info", title: "Score submitted", body: res.rank ? `You're #${res.rank} worldwide` : "Nice one!" });
    } catch (err) {
      setSubmitState("error");
      setSubmitMsg(err instanceof Error && err.message !== "unavailable" ? err.message : "Couldn't reach the leaderboard.");
    }
  }, [addToast, changeSettings, commit, submitName]);

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button,a,input,select,textarea,summary")) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    pointerStart.current = { x: e.clientX, y: e.clientY };
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* unsupported */
    }
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const start = pointerStart.current;
    pointerStart.current = null;
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_THRESHOLD) return;
    if (Math.abs(dx) > Math.abs(dy)) applyMove(dx > 0 ? "right" : "left");
    else applyMove(dy > 0 ? "down" : "up");
  };

  // ---------- share ----------
  const share = useCallback(async () => {
    const cur = stateRef.current;
    if (!cur) return;
    const top = ninjaFor(highestTile(cur));
    const modeName = MODES.find((m) => m.id === cur.mode)?.name ?? cur.mode;
    const text = `I made the ${top.name} with ${cur.score.toLocaleString()} points in 2048 Ninjas 🥷 (${modeName}, ${cur.size}×${cur.size})`;
    const link =
      cur.mode === "daily" && cur.dailyKey
        ? `${window.location.origin}${window.location.pathname}?challenge=${cur.dailyKey}&score=${cur.score}&name=${encodeURIComponent(settingsRef.current.playerName || "a friend")}`
        : window.location.href;
    const upd = recordEvent(progressRef.current, cur, { shares: 1 });
    progressRef.current = upd.progress;
    setProgress(upd.progress);
    celebrateAchievements(upd.newAchievements);
    try {
      const nav = navigator as Navigator & { share?: (data: ShareData) => Promise<void> };
      if (typeof nav.share === "function") {
        await nav.share({ text: cur.mode === "daily" ? `${text} — beat my score:` : text, url: link });
        return;
      }
      await nav.clipboard.writeText(`${text} ${link}`);
      setShareStatus("copied");
    } catch (err) {
      if ((err as { name?: string })?.name === "AbortError") return;
      setShareStatus("failed");
    }
    later(() => setShareStatus("idle"), 2000);
  }, [celebrateAchievements, later]);

  // ---------- render ----------
  if (!ready || !state) {
    return (
      <div className="game">
        <div className="board board-loading" style={{ ["--size" as string]: 4 }} />
      </div>
    );
  }


  const modals = (
    <>
      {panel === "stats" && (
        <Modal title="Stats" onClose={() => setPanel(null)}>
          <StatsPanel progress={progress} />
        </Modal>
      )}
      {panel === "collection" && (
        <Modal title="Collection" onClose={() => setPanel(null)}>
          <CollectionPanel progress={progress} onSelect={(v) => setDish(v)} />
        </Modal>
      )}
      {panel === "achievements" && (
        <Modal title="Achievements" onClose={() => setPanel(null)}>
          <AchievementsPanel progress={progress} />
        </Modal>
      )}
      {panel === "leaderboard" && (
        <Modal title="Leaderboard" onClose={() => setPanel(null)}>
          <LeaderboardPanel progress={progress} state={state} online={settings.online} />
        </Modal>
      )}
      {panel === "settings" && (
        <Modal title="Settings" onClose={() => setPanel(null)}>
          <SettingsPanel settings={settings} progress={progress} onChange={changeSettings} onResetProgress={resetProgress} />
        </Modal>
      )}
      {panel === "howto" && (
        <Modal title="How to play" onClose={closeHowTo}>
          <HowToPanel
            onStart={() => {
              closeHowTo();
              if (view === "home") play({ mode: "classic", size: 4 });
            }}
          />
        </Modal>
      )}
      {confirmNew && (
        <Modal title="Start a new game?" onClose={() => setConfirmNew(false)} compact>
          <div className="confirm">
            <p>
              Your current game ({state.score.toLocaleString()} points) will be recorded in your stats and
              leaderboard, then cleared.
            </p>
            <div className="overlay-buttons">
              <button
                className="btn btn-primary"
                onClick={() => {
                  setConfirmNew(false);
                  startNewGame();
                }}
              >
                New game
              </button>
              <button className="btn" onClick={() => setConfirmNew(false)}>
                Keep playing
              </button>
            </div>
          </div>
        </Modal>
      )}
      {panel === "coach" && (
        <Modal title="Coach" onClose={() => setPanel(null)}>
          <CoachPanel advice={view === "play" && settings.mode !== "race" ? boardAdvice(state) : []} />
        </Modal>
      )}
      {dish !== null && (
        <Modal title={dish === 0 ? "Smoke Bomb" : ninjaFor(dish).name} onClose={() => setDish(null)} compact>
          <DishDetail value={dish} progress={progress} />
        </Modal>
      )}
    </>
  );

  const shareLabel =
    shareStatus === "copied" ? "Copied!" : shareStatus === "failed" ? "Couldn't share" : "Share";
  const streak = dailyStreak(progress, todayKey());
  const streakAtRisk = streak > 0 && progress.dailyBests[todayKey()] === undefined && new Date().getHours() >= 18;

  const appBar = (
    <div className="appbar">
      <div className="appbar-left">
        {view !== "home" ? (
          <button className="icon-btn" onClick={goHome} aria-label="Back to dashboard" title="Dashboard">
            <BackIcon />
          </button>
        ) : (
          <span className="icon-btn icon-static" aria-hidden="true">
            <HomeIcon />
          </span>
        )}
        <span className="wordmark">
          <Logo className="wordmark-icon" />
          <span>2048 <b>NINJAS</b></span>
        </span>
      </div>
      <div className="appbar-right">
        {streak > 0 && (
          <span className={`streak-chip ${streakAtRisk ? "streak-risk" : ""}`} title={streakAtRisk ? "Play today's Daily to keep your streak" : `${streak}-day daily streak`}>
            🔥 {streak}
          </span>
        )}
        {view === "play" && settings.mode !== "race" && (
          <button className="icon-btn" onClick={share} aria-label="Share your score" title={shareLabel}>
            <ShareIcon />
            {shareStatus !== "idle" && <span className="icon-note">{shareLabel}</span>}
          </button>
        )}
        <button className="icon-btn" onClick={() => setPanel("howto")} aria-label="How to play" title="How to play">
          <HelpIcon />
        </button>
        <button className="icon-btn" onClick={() => setPanel("settings")} aria-label="Settings" title="Settings">
          <GearIcon />
        </button>
      </div>
    </div>
  );

  if (view === "home") {
    return (
      <div className="game game-home" data-scenery={settings.scenery}>
        {appBar}
        {toasts.length > 0 && <Toasts toasts={toasts} onDismiss={dismissToast} />}
        <InstallPrompt eligible={progress.stats.gamesPlayed > 0} />
        <Dashboard
          progress={progress}
          settings={settings}
          saved={savedGames()}
          onClassic={(size, coach) => play({ mode: "classic", size, coach })}
          onDaily={() => play({ mode: "daily" })}
          onTimed={(size) => play({ mode: "timed", size })}
          onRace={() => play({ mode: "race" })}
          onPuzzles={() => setView("puzzles")}
          onWeekly={() => play({ mode: "weekly" })}
          onAdventure={() => { setAutoplay(false); setView("adventure"); }}
          onOpen={(p) => setPanel(p)}
          online={settings.online}
          playerName={settings.playerName}
        />
        {modals}
      </div>
    );
  }

  if (view === "adventure") {
    return <div className="game game-adventure" data-scenery={settings.scenery}>
      {appBar}
      {toasts.length > 0 && <Toasts toasts={toasts} onDismiss={dismissToast} />}
      <Adventure progress={progress} settings={settings} paused={modalOpen} onComplete={completeAdventure} />
      {modals}
    </div>;
  }

  if (view === "puzzles") {
    return (
      <div className="game game-home" data-scenery={settings.scenery}>
        {appBar}
        <PuzzleList progress={progress} onPuzzle={(id) => play({ mode: "puzzle", puzzleId: id })} />
        {modals}
      </div>
    );
  }

  if (settings.mode === "race") {
    return (
      <div className="game game-race" data-scenery={settings.scenery}>
        {appBar}
        <p className="context-line">
          <span className="mode-badge">Race</span>
          Two players, one board layout. First to the target ninja wins.
        </p>
        <Race target={settings.raceTarget} wasabi={settings.wasabi} onFinish={onRaceFinish} />
        {modals}
      </div>
    );
  }

  const top = highestTile(state);
  const topStyle = ninjaFor(top);
  const best = Math.max(bestFor(progress, state), state.score);
  const puzzle = state.mode === "puzzle" ? puzzleById(state.puzzleId ?? "") : undefined;
  const pStatus = puzzle ? puzzleStatus(state) : "playing";
  const pIndex = puzzle ? PUZZLES.findIndex((z) => z.id === puzzle.id) : -1;
  const nextPuzzle = pIndex >= 0 ? PUZZLES[pIndex + 1] : undefined;
  const movesLeft = state.puzzleLimit ? Math.max(0, state.puzzleLimit - state.moves) : 0;
  const canSubmit = settings.online && eligibleForOnline(state) && !state.submitted;
  const hintActive = hint && hint.atMove === state.moves ? hint : null;
  const emptyCells = state.size * state.size - state.tiles.filter((t) => !t.removed).length;
  const dangerLevel = state.over || state.size > 4 ? 0 : emptyCells <= 1 ? 2 : emptyCells <= 3 ? 1 : 0;
  const submitForm = canSubmit ? (
    <form
      className="submit-form"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <input
        className="input"
        value={submitName}
        onChange={(e) => setSubmitName(e.target.value)}
        placeholder="Your name"
        maxLength={16}
        aria-label="Name for the global leaderboard"
        disabled={submitState === "sending"}
      />
      <button className="btn" type="submit" disabled={submitState === "sending" || !submitName.trim()}>
        {submitState === "sending" ? "Sending…" : "Submit to global board"}
      </button>
      {submitState === "error" && <span className="submit-msg submit-error">{submitMsg}</span>}
    </form>
  ) : state.submitted ? (
    <p className="submit-msg">{submitMsg || "Score submitted to the global board."}</p>
  ) : state.aiMoves ? (
    <p className="submit-msg muted">AI-assisted games stay off the global board.</p>
  ) : null;
  const showWin = state.won && !state.keepPlaying;
  const showOver = state.over;
  const miss = showOver ? nearMiss(state, bestFor(progress, state)) : null;
  const left = timeLeft(state, now);
  const undoAvailable = history.length > 0 && canUndo(state) && !showOver;
  const rank = showOver ? leaderboardRank(progress, state.score) : null;

  return (
    <div className="game game-arena" data-scenery={settings.scenery}>
      <div className="sr-only" role="status" aria-live="polite">
        {announce}
      </div>

      {appBar}

      <div className="arena-heading"><div><span className="eyebrow">THE SHADOW DOJO</span><h1>Find your flow.</h1></div><span className="arena-live"><i /> {state.over ? "RUN COMPLETE" : "TRAINING IN PROGRESS"}</span></div>
      <Toasts toasts={toasts} onDismiss={dismissToast} />
      <div className="arena-layout">
      <div className="arena-main">
      <header className="play-header">
        <div className="context">
          <span className="context-badges">
            <span className="mode-badge">
              {puzzle ? `Puzzle ${pIndex + 1}` : MODES.find((m) => m.id === settings.mode)?.name}
              {!puzzle && state.mode !== "daily" ? ` · ${state.size}×${state.size}` : ""}
            </span>
            <button className="link link-quiet" onClick={goHome}>
              Change
            </button>
          </span>
          <span className="context-text">
            {puzzle ? (
              <>
                <strong>{puzzle.name}</strong> — make <strong>{ninjaFor(puzzle.goal).name}</strong> in{" "}
                {state.puzzleLimit} moves (par {puzzle.par})
              </>
            ) : settings.mode === "weekly" ? (
              <>
                <strong>{weeklyChallenge().name}</strong> — {weeklyChallenge().description} Best this week:{" "}
                {(progress.weeklyBests?.[weeklyChallenge().id] ?? 0).toLocaleString()}
              </>
            ) : challenge && state.mode === "daily" ? (
              <>
                Beat <strong>{challenge.name}</strong>&apos;s {challenge.score.toLocaleString()} on today&apos;s board
              </>
            ) : state.mode === "daily" && state.dailyKey ? (
              <>Daily · {formatDailyLabel(state.dailyKey)} · same board for everyone</>
            ) : state.mode === "timed" && state.startedAt === null ? (
              <>The clock starts on your first move</>
            ) : (
              <>
                Best ninja: <strong>{topStyle.name}</strong>
              </>
            )}
          </span>
        </div>
        <div className="scores">
          <div className={`score-box ${pbFlash ? "score-pb" : ""}`}>
            <span className="score-label">Score</span>
            <span className="score-value">{state.score.toLocaleString()}</span>
            {popups.map((p) => (
              <span key={p.id} className="score-popup" aria-hidden="true">
                +{p.gain}
              </span>
            ))}
          </div>
          {puzzle ? (
            <div className={`score-box ${movesLeft <= 1 ? "score-timer-low" : ""}`}>
              <span className="score-label">Moves left</span>
              <span className="score-value">{movesLeft}</span>
            </div>
          ) : (
            <div className="score-box">
              <span className="score-label">{state.mode === "daily" ? "Today" : "Best"}</span>
              <span className="score-value">{best.toLocaleString()}</span>
            </div>
          )}
          {state.mode === "timed" && left !== null && (
            <div className={`score-box score-timer ${left <= 10 && state.startedAt ? "score-timer-low" : ""}`}>
              <span className="score-label">Time</span>
              <span className="score-value">{Math.ceil(left)}</span>
              <span
                className="timer-bar"
                style={{ transform: `scaleX(${left / TIMED_SECONDS})` }}
                aria-hidden="true"
              />
            </div>
          )}
        </div>
      </header>

      <div className="toolbar">
        <div className="toolbar-buttons">
          {!puzzle && (
            <button
              className={`btn ${settings.coach ? "btn-active" : ""}`}
              onClick={() => changeSettings({ coach: !settings.coach })}
              aria-pressed={settings.coach}
              title="Coach reviews each move"
            >
              Coach
            </button>
          )}
          <button className="btn" onClick={undo} disabled={!undoAvailable} title="Undo (U)">
            Undo
            {state.undosLeft !== -1 && (
              <span className="undo-pips" aria-label={`${state.undosLeft} undos left`}>
                {Array.from({ length: 3 }, (_, i) => (
                  <i key={i} className={i < state.undosLeft ? "pip-on" : ""} />
                ))}
              </span>
            )}
          </button>
          <button className="btn" onClick={showHint} disabled={state.over} title="Ask the AI for a move">
            Hint
          </button>
          <button
            className={`btn ${autoplay ? "btn-active" : ""}`}
            onClick={() => setAutoplay((v) => !v)}
            disabled={state.over}
            aria-pressed={autoplay}
            title="Let the AI play"
          >
            {autoplay ? "Stop autoplay" : "Autoplay"}
          </button>
          <button className="btn btn-primary" onClick={requestNewGame} title="New game (R)">
            {puzzle ? "Retry" : "New game"}
          </button>
        </div>
      </div>

      <div
        ref={boardRef}
        className={`board-wrap skin-${settings.skin} ${shake ? "board-shake" : ""} ${dangerLevel ? `board-danger-${dangerLevel}` : ""}`}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (pointerStart.current = null)}
      >
        <Board size={state.size} tiles={state.tiles} nudge={nudge} />
        {(state.combo ?? 0) >= 3 && !showOver && (
          <div className="combo-badge" key={state.combo} aria-hidden="true">
            ×{state.combo} combo
          </div>
        )}
        {hintActive && !showWin && !showOver && (
          <div className={`hint-badge hint-${hintActive.dir}`} aria-hidden="true">
            <span className="hint-arrow">{DIR_ARROW[hintActive.dir]}</span>
            <span>Try {hintActive.dir}</span>
          </div>
        )}
        {autoplay && <div className="ai-badge" aria-hidden="true">AI playing…</div>}

        {puzzle && pStatus !== "playing" && (
          <div className="overlay">
            {pStatus === "solved" && <Confetti />}
            <div className="overlay-card">
              <NinjaIcon style={ninjaFor(puzzle.goal)} className="overlay-icon" />
              {pStatus === "solved" ? (
                <>
                  <h2>Solved in {state.moves} moves!</h2>
                  <p className="stars stars-big" aria-label={`${puzzleStars(puzzle, state.moves)} of 3 stars`}>
                    {[1, 2, 3].map((i) => (
                      <i key={i} className={i <= puzzleStars(puzzle, state.moves) ? "star-on" : ""}>
                        ★
                      </i>
                    ))}
                  </p>
                  <p>{state.moves <= puzzle.par ? "Par — perfect!" : `Par is ${puzzle.par}. Try for three stars?`}</p>
                </>
              ) : (
                <>
                  <h2>Out of moves</h2>
                  <p>
                    The {ninjaFor(puzzle.goal).name} needs to appear within {state.puzzleLimit} moves. Study the board and
                    try again.
                  </p>
                </>
              )}
              <div className="overlay-buttons">
                <button className="btn btn-primary" onClick={() => startNewGame()}>
                  {pStatus === "solved" ? "Replay" : "Retry"}
                </button>
                {nextPuzzle && (
                  <button className="btn" onClick={() => play({ puzzleId: nextPuzzle.id })}>
                    Next puzzle
                  </button>
                )}
                <button className="btn" onClick={() => setView("puzzles")}>
                  All puzzles
                </button>
              </div>
            </div>
          </div>
        )}

        {!puzzle && (showWin || showOver) && (
          <div className="overlay">
            {showWin && <Confetti />}
            <div className="overlay-card">
              {showWin ? (
                <>
                  <NinjaIcon style={ninjaFor(WIN_VALUE)} className="overlay-icon" />
                  <h2>Mission complete! You made the {ninjaFor(WIN_VALUE).name}!</h2>
                  <p>Score: {state.score.toLocaleString()}</p>
                  <div className="overlay-buttons">
                    <button className="btn btn-primary" onClick={keepPlaying}>
                      Keep going
                    </button>
                    <button className="btn" onClick={share}>
                      {shareLabel}
                    </button>
                    <button className="btn" onClick={shareCard} disabled={cardStatus === "busy"}>
                      {cardStatus === "busy" ? "Making card…" : "Share card"}
                    </button>
                    <button className="btn" onClick={() => startNewGame()}>
                      New game
                    </button>
                  </div>
                  {submitForm}
                </>
              ) : (
                <>
                  <NinjaIcon style={topStyle} className="overlay-icon" />
                  <h2>{state.timeUp ? "Time's up!" : "Training complete!"}</h2>
                  <p>
                    {state.timeUp ? "The clock ran out." : "No moves left."} Your best ninja was the{" "}
                    <strong>{topStyle.name}</strong> with {state.score.toLocaleString()} points.
                    {rank && ` #${rank} on your leaderboard!`}
                  </p>
                  {miss && (miss.personalBest || miss.dish || miss.score) && (
                    <p className="near-miss">
                      {miss.personalBest ? "🏆 New personal best!" : miss.dish ? `So close — ${miss.dish}.` : ""}
                      {!miss.personalBest && miss.score ? ` ${miss.score}.` : ""}
                    </p>
                  )}
                  {settings.coach && (state.blunders ?? 0) > 0 && (
                    <p className="coach-summary">
                      Coach: {state.blunders} blunder{state.blunders === 1 ? "" : "s"}
                      {state.blunderLog?.[0] ? ` · first at move ${state.blunderLog[0].move}: ${state.blunderLog[0].title.toLowerCase()}` : ""}
                    </p>
                  )}
                  <div className="overlay-buttons">
                    <button className="btn btn-primary" onClick={() => startNewGame()}>
                      Try again
                    </button>
                    <button className="btn" onClick={share}>
                      {shareLabel}
                    </button>
                    <button className="btn" onClick={shareCard} disabled={cardStatus === "busy"}>
                      {cardStatus === "busy" ? "Making card…" : cardStatus === "done" ? "Card ready!" : "Share card"}
                    </button>
                    {history.length > 0 && canUndo(state) && !state.timeUp && (
                      <button className="btn" onClick={undo}>
                        Undo last move
                      </button>
                    )}
                  </div>
                  {submitForm}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {settings.coach && !puzzle && (
        <aside className={`coach-card ${coachNote ? `coach-${coachNote.rating}` : ""}`} aria-live="polite">
          <div className="coach-head">
            <span className="coach-chip">{coachNote ? coachNote.rating : "coach"}</span>
            <strong>{coachNote ? coachNote.title : "Coach is watching"}</strong>
          </div>
          <p>
            {coachNote
              ? coachNote.detail
              : "Make a move and I'll tell you how it compares to the best option. Tip: pick a corner for your biggest ninja and stick with it."}
          </p>
          {coachNote?.better && (
            <p className="coach-better">
              Better: <strong>{DIR_ARROW[coachNote.better]} {coachNote.better}</strong>
            </p>
          )}
          <div className="coach-foot">
            <span className="muted small">
              Blunders this game: {state.blunders ?? 0}
            </span>
            <button className="link" onClick={() => setPanel("coach")}>
              Strategy guide
            </button>
          </div>
        </aside>
      )}

      <div className="arena-instructions"><span>Swipe or use arrow keys</span><span>Match. Merge. Ascend. ↗</span></div>
      </div>
      <aside className="arena-sidebar">
        <NextRankGoal state={state} />
        <section className="rank-card">
          <span className="eyebrow">YOUR STRONGEST NINJA</span>
          <div className="rank-portrait"><NinjaIcon style={topStyle} /><span className="rank-orbit" /></div>
          <span className="rank-number">RANK {topStyle.rank + 1} / 17</span><h2>{topStyle.name}</h2>
          <p>{topStyle.description}</p>
          <div className="rank-track" role="progressbar" aria-label="Ninja rank" aria-valuenow={topStyle.rank + 1} aria-valuemin={1} aria-valuemax={17}><span style={{ width: `${(topStyle.rank + 1) / 17 * 100}%` }} /></div>
          <div className="run-facts"><span><b>{state.moves}</b> MOVES</span><span><b>{state.combo ?? 0}×</b> COMBO</span><span><b>{emptyCells}</b> FREE</span></div>
        </section>
        <section className="sensei-note"><span className="eyebrow">A WORD FROM SENSEI</span><p>“A patient ninja controls the board.”</p><span>Keep your strongest ninja in a corner. Build the rest of your clan around it.</span><button className="link" onClick={() => setPanel("coach")}>Study the strategy ↗</button></section>
      <DishStrip
        top={top}
        wasabi={state.wasabiEnabled}
        onSelect={(v) => setDish(v)}
        onOpenMenu={() => setPanel("collection")}
      />


      <footer className="help">
        <p>
          <kbd>←</kbd> <kbd>↑</kbd> <kbd>→</kbd> <kbd>↓</kbd> or <kbd>W</kbd>
          <kbd>A</kbd>
          <kbd>S</kbd>
          <kbd>D</kbd> to move · <kbd>U</kbd> undo · <kbd>R</kbd> new game · swipe on touch
        </p>
      </footer>

      </aside>
      </div>
      {modals}
    </div>
  );
}
