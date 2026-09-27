import { highestTile, liveTiles, move, newGame, type Direction, type GameState } from "./game";
import { ninjaFor } from "./ninjas";
import type { Progress } from "./progress";

export type Scenery = "rooftops" | "bamboo" | "storm" | "ember" | "frost" | "lotus" | "moon" | "sky" | "eclipse";
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
  size?: 3 | 4 | 5;
  blockedDirection?: Direction;
  secondary?: Objective;
  boss?: boolean;
}
export interface AdventureResult { stars: number; moves: number; date: string }
export const CHAPTERS = [
  { name: "Bamboo Gate", scenery: "bamboo" as const, description: "Find your footing. Listen to the leaves.", reward: "Bamboo Sanctuary", symbol: "竹" },
  { name: "Thunder Pass", scenery: "storm" as const, description: "Read the storm. Strike with purpose.", reward: "Storm Citadel", symbol: "雷" },
  { name: "Ember Summit", scenery: "ember" as const, description: "Keep your focus when the mountain burns.", reward: "Ember Shrine", symbol: "火" },
  { name: "Frost Hollow", scenery: "frost" as const, description: "Small boards. Tight corners. Think before you slide.", reward: "Crystal Cavern", symbol: "雪" },
  { name: "Lotus Marsh", scenery: "lotus" as const, description: "Gather your guardians without merging them away.", reward: "Lotus Garden", symbol: "蓮" },
  { name: "Moonlit Keep", scenery: "moon" as const, description: "A northern gale closes one route. Find another.", reward: "Moon Palace", symbol: "月" },
  { name: "Sky Archipelago", scenery: "sky" as const, description: "A bigger battlefield. Longer chains. Higher stakes.", reward: "Floating Isles", symbol: "空" },
  { name: "Eclipse Citadel", scenery: "eclipse" as const, description: "Unite everything you have learned. Become the legend.", reward: "Eclipse Throne", symbol: "影" },
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
  { id: "ember-3", chapter: 2, name: "Keeper of the flame", story: "The shrine has waited for a new guardian. Open the path to the lands beyond.", tip: "The scattered Night Blades can become two Wind Runners, then one Shadow.", grid: [32,16,8,8, 16,16,16,0, 4,0,4,8, 0,0,0,0], objective: {kind:"rank",target:128}, limit:12, par:5, seed:909 },
  {"id":"frost-1","chapter":3,"size":3,"objective":{"kind":"rank","target":64},"grid":[4,16,8,4,2,0,16,32,8],"seed":10010,"par":6,"limit":10,"name":"Icebreaker","story":"The cavern narrows. Free a corner before the frost closes in.","tip":"On a 3\u00d73 board, empty cells are precious. Keep your biggest ninja against an edge."},
  {"id":"frost-2","chapter":3,"size":3,"objective":{"kind":"score","target":180},"grid":[32,4,2,16,8,0,16,4,8],"seed":10091,"par":8,"limit":12,"name":"Thin ice","story":"The path will hold only if every merge earns its place.","tip":"Keep a lane open for new tiles. Build larger merges instead of chasing every small pair."},
  {"id":"frost-3","chapter":3,"size":3,"objective":{"kind":"rank","target":128},"grid":[8,16,8,32,16,4,32,16,0],"seed":10182,"par":9,"limit":13,"secondary":{"kind":"score","target":300},"name":"The frost guardian","story":"Break the frozen seal and prove your strength in the same attempt.","tip":"You need both the target ninja and the score. A strong corner gives the smaller pairs room to grow.","boss":true},
  {"id":"lotus-1","chapter":4,"size":4,"objective":{"kind":"squad","target":32,"count":3},"grid":[16,2,4,2,4,0,0,16,16,8,8,4,4,8,2,8],"seed":10273,"par":6,"limit":10,"name":"Petal patrol","story":"Three scouts of equal strength must cross the marsh together.","tip":"Build the required ranks on separate edges. Merging two completed recruits loses one from your squad."},
  {"id":"lotus-2","chapter":4,"size":4,"objective":{"kind":"squad","target":64,"count":3},"grid":[8,16,4,0,0,8,16,4,2,32,16,32,16,8,16,16],"seed":10364,"par":8,"limit":12,"name":"The hidden grove","story":"Three guardians are waiting among the reeds. Bring them out together.","tip":"Keep completed recruits apart while combining smaller pairs in the middle."},
  {"id":"lotus-3","chapter":4,"size":4,"objective":{"kind":"rank","target":256},"grid":[32,16,64,32,16,32,4,64,4,8,0,0,8,16,32,16],"seed":10462,"par":9,"limit":13,"secondary":{"kind":"squad","target":32,"count":2},"name":"Lotus guardian","story":"A leader needs a loyal guard. Recruit both before the petals fall.","tip":"Build the leader on one edge and save two smaller guardians on the other. Both objectives must be true together.","boss":true},
  {"id":"moon-1","chapter":5,"size":4,"objective":{"kind":"rank","target":256},"grid":[8,8,32,16,8,64,32,16,8,32,0,16,4,4,0,32],"seed":10546,"par":9,"limit":13,"blockedDirection":"up","name":"Against the wind","story":"The northern gate is sealed. Your clan must find another way.","tip":"Up is blocked. Use left, down, and right to cycle pairs toward the bottom corners."},
  {"id":"moon-2","chapter":5,"size":4,"objective":{"kind":"combo","target":7},"grid":[16,4,8,2,8,0,16,32,64,32,2,0,4,8,4,64],"seed":10638,"par":9,"limit":13,"blockedDirection":"up","name":"Silent current","story":"Seven merging moves will carry you through the night.","tip":"Every valid move in the chain must merge. Moving without a merge resets the chain; a blocked direction costs nothing."},
  {"id":"moon-3","chapter":5,"size":4,"objective":{"kind":"rank","target":512},"grid":[64,16,4,0,128,32,16,64,4,8,0,16,32,64,32,64],"seed":10730,"par":12,"limit":16,"secondary":{"kind":"score","target":1100},"blockedDirection":"up","name":"Moon guardian","story":"The palace demands strength and precision, with no escape to the north.","tip":"Protect the bottom row. Both the target rank and the score must be reached within the move budget.","boss":true},
  {"id":"sky-1","chapter":6,"size":5,"objective":{"kind":"squad","target":64,"count":4},"grid":[8,8,8,16,8,32,4,8,16,4,32,2,4,16,0,16,8,0,16,0,16,4,2,16,16],"seed":10819,"par":10,"limit":13,"name":"Four winds","story":"A wider sky needs four guardians watching its edges.","tip":"A 5\u00d75 board gives more space but spreads your pairs apart. Gather four matching guardians without combining them away."},
  {"id":"sky-2","chapter":6,"size":5,"objective":{"kind":"combo","target":10},"grid":[0,2,8,16,32,8,64,4,0,16,128,0,2,2,4,32,64,32,4,8,16,2,4,2,0],"seed":10910,"par":10,"limit":13,"name":"Sky dance","story":"Ten strikes. One breath. Keep the whole sky in motion.","tip":"Plan beyond the next merge. Leave small pairs ready for the moment your large pairs run out."},
  {"id":"sky-3","chapter":6,"size":5,"objective":{"kind":"rank","target":512},"grid":[32,8,16,32,16,4,32,32,8,8,128,16,0,64,0,64,16,2,128,0,16,8,64,4,2],"seed":11001,"par":12,"limit":15,"secondary":{"kind":"squad","target":64,"count":3},"name":"Sky guardian","story":"Raise a commander and a three-ninja escort above the clouds.","tip":"Build your commander first while preserving material for the escort. Check both objectives before a large merge.","boss":true},
  {"id":"eclipse-1","chapter":7,"size":4,"objective":{"kind":"rank","target":1024},"grid":[32,0,16,128,64,8,128,64,0,32,8,64,128,64,256,32],"seed":11092,"par":14,"limit":17,"name":"Into the eclipse","story":"The citadel is crowded with rivals. Turn the chaos into a single force.","tip":"Choose a corner for your highest rank. Avoid trapping a small tile between two large ones."},
  {"id":"eclipse-2","chapter":7,"size":4,"objective":{"kind":"squad","target":256,"count":3},"grid":[64,128,8,64,32,16,0,32,128,128,64,0,32,32,64,16],"seed":11190,"par":10,"limit":13,"secondary":{"kind":"score","target":1000},"name":"The last alliance","story":"Three elite guardians must stand together when the shadow arrives.","tip":"Keep all three target tiles. The score objective also matters, so use the smaller ranks to earn the final points."},
  {"id":"eclipse-3","chapter":7,"size":4,"objective":{"kind":"rank","target":2048},"grid":[128,32,16,256,16,0,64,64,64,0,512,64,512,128,32,256],"seed":11274,"par":12,"limit":15,"secondary":{"kind":"score","target":4200},"name":"The Eclipse guardian","story":"The final seal demands a Sensei and a score worthy of your journey.","tip":"Plan the last two big merges early. Keep your strongest ninja on an edge and leave room for the remaining pairs.","boss":true},
];

export function adventureGame(mission: AdventureMission): GameState {
  const size=mission.size??4;
  const base = newGame({ mode:"puzzle", size, seed:mission.seed, wasabi:false, undoLimit:3 });
  const tiles = mission.grid.flatMap((value,i) => value ? [{id:i+1,value,row:Math.floor(i/size),col:i%size}] : []);
  return { ...base, tiles, nextId:size*size+1, rng:mission.seed, challengeId:mission.id };
}
export function adventureMove(mission: AdventureMission, game: GameState, direction: Direction): GameState {
  return mission.blockedDirection===direction || adventureStatus(mission,game)!=="playing" ? game : move(game,direction);
}
export function objectiveValue(mission: AdventureMission, game: GameState, o = mission.objective): number {
  if (o.kind === "rank") return highestTile(game);
  if (o.kind === "score") return game.score;
  if (o.kind === "combo") return game.combo ?? 0;
  return liveTiles(game.tiles).filter((t) => !t.wasabi && t.value === o.target).length;
}
export function objectiveTarget(m: AdventureMission, o = m.objective): number { return o.kind === "squad" ? o.count : o.target; }
export function objectiveLabel(m: AdventureMission, o = m.objective): string {
  if (o.kind === "rank") return `Recruit ${ninjaFor(o.target).name}`;
  if (o.kind === "score") return `Score ${o.target} points`;
  if (o.kind === "combo") return `Chain ${o.target} merging moves`;
  return `Keep ${o.count} ${ninjaFor(o.target).name} tiles on the board`;
}
export function adventureStatus(m: AdventureMission, game: GameState): "playing" | "won" | "lost" {
  if (game.moves <= m.limit && [m.objective,...(m.secondary?[m.secondary]:[])].every((o)=>objectiveValue(m,game,o)>=objectiveTarget(m,o))) return "won";
  if (game.over || game.moves >= m.limit) return "lost";
  if (m.blockedDirection && (["left","up","right","down"] as Direction[]).filter((d)=>d!==m.blockedDirection).every((d)=>move(game,d)===game)) return "lost";
  return "playing";
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
