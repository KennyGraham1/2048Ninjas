import type { CSSProperties } from "react";
import type { Tile as TileModel } from "@/lib/game";
import { SMOKE_STYLE, ninjaFor } from "@/lib/ninjas";
import NinjaIcon from "./NinjaIcon";

interface Props {
  tile: TileModel;
  size: number;
}

export default function Tile({ tile, size }: Props) {
  const style = tile.wasabi ? SMOKE_STYLE : ninjaFor(tile.value);
  const step = 100 / size;

  const classes = [
    "tile",
    tile.isNew ? "tile-new" : "",
    tile.merged ? "tile-merged" : "",
    tile.removed ? "tile-removed" : "",
    tile.wasabi ? "tile-wasabi" : "",
    size >= 5 ? "tile-small" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={classes}
      style={{
        width: `${step}%`,
        height: `${step}%`,
        transform: `translate(${tile.col * 100}%, ${tile.row * 100}%)`,
      }}
      data-value={tile.wasabi ? "wasabi" : tile.value}
    >
      <div
        className="tile-inner"
        style={{ background: style.bg, color: style.fg, "--tile-ink": style.suit, "--tile-accent": style.accent } as CSSProperties}
        title={style.name}
      >
        <NinjaIcon style={style} className="tile-art" />
        <span className="tile-label">{style.name}</span>
        {!tile.wasabi && <span className="tile-value">{tile.value}</span>}
      </div>
    </div>
  );
}
