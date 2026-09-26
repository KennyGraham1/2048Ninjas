import type { Direction, Tile as TileModel } from "@/lib/game";
import Tile from "./Tile";

interface Props {
  size: number;
  tiles: TileModel[];
  /** Direction of the move in flight, for the wall-bounce nudge. */
  nudge?: Direction | null;
}

export default function Board({ size, tiles, nudge }: Props) {
  const cells = Array.from({ length: size * size });
  // Ghost tiles first so real tiles paint on top of them.
  const ordered = [...tiles].sort((a, b) => Number(!!b.removed) - Number(!!a.removed));

  return (
    <div
      className={`board ${nudge ? `board-nudge-${nudge}` : ""}`}
      style={{ ["--size" as string]: size }}
      aria-hidden="true"
    >
      <div className="board-cells">
        {cells.map((_, i) => (
          <div key={i} className="board-cell" />
        ))}
      </div>
      <div className="board-tiles">
        {ordered.map((t) => (
          <Tile key={t.id} tile={t} size={size} />
        ))}
      </div>
    </div>
  );
}
