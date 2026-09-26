import { highestTile, liveTiles, type GameState } from "./game";
import { MAX_DEFINED, ninjaFor } from "./ninjas";

export function nextRankGoal(state: GameState) {
  const value = highestTile(state);
  if (value >= MAX_DEFINED) return null;
  const current = ninjaFor(value || 2);
  const count = liveTiles(state.tiles).filter((t) => !t.wasabi && t.value === (value || 2)).length;
  return { current, next:ninjaFor((value || 2)*2), count, ready:count >= 2 };
}
