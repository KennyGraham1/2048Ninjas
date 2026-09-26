import { highestTile, liveTiles, newGame, type GameState } from "./game";
import { ninjaFor } from "./ninjas";
import type { Progress } from "./progress";

export type Scenery = "rooftops" | "bamboo" | "storm" | "ember";
export type Objective = { kind: "rank"; target: number } | { kind: "score"; target: number } | { kind: "combo"; target: number } | { kind: "squad"; target: number; count: number };
export interface AdventureMission {
  id: string;
  chapter: number;
  name: string;
  story: string;
  tip: string;
  grid: number[];
  objective: Objective;
  limit: number;
  par: number;
  seed: number;
}
export interface AdventureResult { stars: number; moves: number; date: string }
export const CHAPTERS = [
  { name: "Bamboo Gate", scenery: "bamboo" as const, description: "Find your footing. Listen to the leaves.", reward: "Bamboo Sanctuary", symbol: "竹" },
  { name: "Thunder Pass", scenery: "storm" as const, description: "Read the storm. Strike with purpose.", reward: "Storm Citadel", symbol: "雷" },
  { name: "Ember Summit", scenery: "ember" as const, description: "Keep your focus when the mountain burns.", reward: "Ember Shrine", symbol: "火" },
];
export const SCENERIES: { id: Scenery; name: string; description: string }[] = [
  { id: "rooftops", name: "Moonlit rooftops", description: "Your first training ground" },
  ...CHAPTERS.map((c) => ({ id: c.scenery, name: c.reward, description: `Complete ${c.name}` })),
];
export const ADVENTURE: AdventureMission[] = [
  { id: "bamboo-1", chapter: 0, name: "First footsteps", story: "The gate opens for those who learn to move together.", tip: "Make two Apprentices, then bring them together.", grid: [2,2,0,0, 2,2,0,0, 0,0,0,0, 0,0,0,0], objective: {kind:"rank",target:8}, limit:6, par:2, seed:101 },
  { id: "bamboo-2", chapter: 0, name: "Gather the clan", story: "A lone ninja is quick. A united clan is strong.", tip: "Build two Scouts and keep both on the board.", grid: [4,4,0,0, 4,0,4,0, 2,0,2,0, 0,0,0,0], objective: {kind:"squad",target:8,count:2}, limit:7, par:1, seed:202 },
  { id: "bamboo-3", chapter: 0, name: "The bamboo seal", story: "One final lesson guards the sanctuary: make every merge count.", tip: "Larger merges score more points. Start with the pairs of Scouts.", grid: [8,8,0,0, 8,0,8,0, 4,4,0,0, 2,2,0,0], objective: {kind:"score",target:64}, limit:8, par:2, seed:303 },
  { id: "storm-1", chapter: 1, name: "Rolling thunder", story: "Let one strike lead into the next. Do not break the rhythm.", tip: "Make a merge on three consecutive moves. A move without a merge resets the chain.", grid: [2,2,4,8, 0,0,0,0, 0,0,0,0, 0,0,0,0], objective: {kind:"combo",target:3}, limit:8, par:3, seed:404 },
  { id: "storm-2", chapter: 1, name: "Twin shadows", story: "Two guardians must reach the bridge together.", tip: "You need two Night Blade tiles at the same time. Do not merge them away.", grid: [16,8,8,0, 8,8,16,0, 4,0,4,0, 0,0,0,0], objective: {kind:"squad",target:32,count:2}, limit:9, par:2, seed:505 },
  { id: "storm-3", chapter: 1, name: "Eye of the storm", story: "Above the clouds, a Wind Runner waits to claim the citadel.", tip: "Build two Night Blades, then unite them.", grid: [16,8,8,0, 8,8,16,0, 4,0,4,0, 2,0,2,0], objective: {kind:"rank",target:64}, limit:10, par:3, seed:606 },
  { id: "ember-1", chapter: 2, name: "Trail of sparks", story: "Four sparks. One unbroken flame.", tip: "Plan a chain: 2 + 2, then 4 + 4, then 8 + 8, then 16 + 16.", grid: [2,2,4,8, 0,0,0,16, 0,0,0,0, 0,0,0,0], objective: {kind:"combo",target:4}, limit:10, par:4, seed:707 },
  { id: "ember-2", chapter: 2, name: "The forge", story: "Turn the mountain's heat into strength for your clan.", tip: "Unite the larger tiles. Two 64 tiles yield 128 points in one merge.", grid: [32,16,16,0, 16,16,32,0, 8,8,0,0, 4,4,0,0], objective: {kind:"score",target:256}, limit:10, par:3, seed:808 },
  { id: "ember-3", chapter: 2, name: "Keeper of the flame", story: "The shrine has waited for a new guardian. Finish your journey.", tip: "The scattered Night Blades can become two Wind Runners, then one Shadow.", grid: [32,16,8,8, 16,16,16,0, 4,0,4,8, 0,0,0,0], objective: {kind:"rank",target:128}, limit:12, par:5, seed:909 },
];

export function adventureGame(mission: AdventureMission): GameState {
  const base = newGame({ mode:"puzzle", size:4, seed:mission.seed, wasabi:false, undoLimit:3 });
  const tiles = mission.grid.flatMap((value,i) => value ? [{id:i+1,value,row:Math.floor(i/4),col:i%4}] : []);
  return { ...base, tiles, nextId:17, rng:mission.seed, challengeId:mission.id };
}
export function objectiveValue(mission: AdventureMission, game: GameState): number {
  const o = mission.objective;
  if (o.kind === "rank") return highestTile(game);
  if (o.kind === "score") return game.score;
  if (o.kind === "combo") return game.combo ?? 0;
  return liveTiles(game.tiles).filter((t) => !t.wasabi && t.value === o.target).length;
}
export function objectiveTarget(m: AdventureMission): number { return m.objective.kind === "squad" ? m.objective.count : m.objective.target; }
export function objectiveLabel(m: AdventureMission): string {
  const o = m.objective;
  if (o.kind === "rank") return `Recruit ${ninjaFor(o.target).name}`;
  if (o.kind === "score") return `Score ${o.target} points`;
  if (o.kind === "combo") return `Chain ${o.target} merging moves`;
  return `Keep ${o.count} ${ninjaFor(o.target).name} tiles on the board`;
}
export function adventureStatus(m: AdventureMission, game: GameState): "playing" | "won" | "lost" {
  if (game.moves <= m.limit && objectiveValue(m,game) >= objectiveTarget(m)) return "won";
  return game.over || game.moves >= m.limit ? "lost" : "playing";
}
export function missionUnlocked(p: Progress, id: string): boolean {
  const index = ADVENTURE.findIndex((m) => m.id === id);
  return index >= 0 && ADVENTURE.slice(0,index).every((m) => !!p.adventure?.[m.id]);
}
export function sceneryUnlocked(p: Progress, scenery: string): boolean {
  if (scenery === "rooftops") return true;
  const chapter = CHAPTERS.findIndex((c) => c.scenery === scenery);
  return chapter >= 0 && ADVENTURE.filter((m) => m.chapter === chapter).every((m) => !!p.adventure?.[m.id]);
}
export function adventureStars(m: AdventureMission, g: GameState): number {
  if (adventureStatus(m,g) !== "won") return 0;
  // Rewinding remains useful, but the perfect medal rewards an uninterrupted plan.
  return g.moves <= m.par && g.undosUsed === 0 ? 3 : g.moves <= m.par + 2 ? 2 : 1;
}
export function recordAdventure(p: Progress, id: string, game: GameState, date = new Date().toISOString()): Progress {
  const mission = ADVENTURE.find((m) => m.id === id);
  if (!mission || game.challengeId !== id || !missionUnlocked(p,id) || adventureStatus(mission,game) !== "won") return p;
  const stars = adventureStars(mission,game);
  const previous = p.adventure?.[id];
  if (previous && previous.stars >= stars && previous.moves <= game.moves) return p;
  return { ...p, xp:(p.xp ?? 0) + Math.max(0,stars-(previous?.stars ?? 0))*40,
    adventure:{...p.adventure,[id]:{stars:Math.max(stars,previous?.stars ?? 0),moves:Math.min(game.moves,previous?.moves ?? Infinity),date:previous?.date ?? date}} };
}
