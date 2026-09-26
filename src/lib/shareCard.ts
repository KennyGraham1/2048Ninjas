import { type GameState, highestTile, liveTiles } from "./game";
import { SMOKE_STYLE, ninjaFor } from "./ninjas";

/**
 * Draws a shareable PNG of the final board. Tile artwork is taken from the live SVGs on the page
 * (passed in as a map of value -> svg markup) so the card matches what the player saw.
 */
export interface ShareCardOptions {
  state: GameState;
  title: string;
  subtitle: string;
  /** Dish value -> SVG outerHTML, gathered from the rendered board. 0 = wasabi. */
  art: Map<number, string>;
  url: string;
}

function svgToImage(markup: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const withNs = markup.includes("xmlns=") ? markup : markup.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(withNs)}`;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export async function renderShareCard({ state, title, subtitle, art, url }: ShareCardOptions): Promise<Blob> {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Background
  ctx.fillStyle = "#f0f3f8";
  ctx.fillRect(0, 0, W, H);

  // Header
  ctx.fillStyle = "#c43d51";
  roundRect(ctx, 60, 60, 72, 72, 18);
  ctx.fill();
  ctx.fillStyle = "#25334a";
  roundRect(ctx, 74, 70, 44, 52, 20);
  ctx.fill();
  ctx.fillStyle = "#f4d7b6";
  roundRect(ctx, 79, 91, 34, 16, 5);
  ctx.fill();
  ctx.fillStyle = "#f2b76b";
  ctx.fillRect(74, 85, 44, 9);
  ctx.strokeStyle = "#172337";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(85, 98);
  ctx.lineTo(92, 101);
  ctx.moveTo(100, 101);
  ctx.lineTo(107, 98);
  ctx.stroke();

  ctx.fillStyle = "#25334a";
  ctx.font = "800 44px Nunito, system-ui, sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText("2048 Ninjas", 152, 96);

  ctx.font = "800 64px Nunito, system-ui, sans-serif";
  ctx.fillText(title, 60, 210);
  ctx.fillStyle = "#64728a";
  ctx.font = "600 30px Nunito, system-ui, sans-serif";
  ctx.fillText(subtitle, 60, 268);

  // Board
  const n = state.size;
  const boardSize = 960;
  const bx = 60;
  const by = 330;
  const gap = 18;
  ctx.fillStyle = "#e0e6ef";
  roundRect(ctx, bx, by, boardSize, boardSize, 28);
  ctx.fill();
  const cell = (boardSize - gap * (n + 1)) / n;
  const tiles = new Map<string, { value: number; wasabi?: boolean }>();
  for (const t of liveTiles(state.tiles)) tiles.set(`${t.row},${t.col}`, t);

  const images = new Map<number, HTMLImageElement>();
  await Promise.all(
    [...art.entries()].map(async ([v, markup]) => {
      try {
        images.set(v, await svgToImage(markup));
      } catch {
        /* skip art */
      }
    }),
  );

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const x = bx + gap + c * (cell + gap);
      const y = by + gap + r * (cell + gap);
      const t = tiles.get(`${r},${c}`);
      ctx.fillStyle = "#d2dbe8";
      roundRect(ctx, x, y, cell, cell, 20);
      ctx.fill();
      if (!t) continue;
      const style = t.wasabi ? SMOKE_STYLE : ninjaFor(t.value);
      ctx.fillStyle = style.bg;
      roundRect(ctx, x, y, cell, cell, 20);
      ctx.fill();
      const img = images.get(t.wasabi ? 0 : t.value);
      const artSize = cell * 0.58;
      if (img) ctx.drawImage(img, x + (cell - artSize) / 2, y + cell * 0.08, artSize, artSize);
      ctx.fillStyle = style.fg;
      ctx.font = `800 ${Math.max(16, Math.min(28, cell * 0.11))}px Nunito, system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(style.name, x + cell / 2, y + cell * 0.82, cell - 12);
      ctx.textAlign = "left";
    }
  }

  // Footer
  ctx.fillStyle = "#64728a";
  ctx.font = "600 28px Nunito, system-ui, sans-serif";
  ctx.fillText(`Highest ninja: ${ninjaFor(highestTile(state)).name}  ·  ${url}`, 60, H - 40);

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png"),
  );
}

/** Collect SVG markup for each dish currently on the board. */
export function collectBoardArt(boardEl: HTMLElement | null): Map<number, string> {
  const art = new Map<number, string>();
  if (!boardEl) return art;
  boardEl.querySelectorAll<HTMLElement>(".tile").forEach((tile) => {
    const v = tile.dataset.value;
    const svg = tile.querySelector("svg");
    if (!v || !svg) return;
    const key = v === "wasabi" ? 0 : Number(v);
    if (!art.has(key)) art.set(key, svg.outerHTML);
  });
  return art;
}

/** Share a PNG via the native sheet when possible, otherwise open it in a new tab. */
export async function shareBlob(blob: Blob, text: string): Promise<"shared" | "opened"> {
  const file = new File([blob], "2048-ninjas.png", { type: "image/png" });
  const nav = navigator as Navigator & {
    share?: (d: ShareData) => Promise<void>;
    canShare?: (d: ShareData) => boolean;
  };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    await nav.share({ files: [file], text });
    return "shared";
  }
  const objectUrl = URL.createObjectURL(blob);
  window.open(objectUrl, "_blank", "noopener");
  setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
  return "opened";
}
