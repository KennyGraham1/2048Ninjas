"use client";

import { useMemo } from "react";

const COLORS = ["#ff5c8a", "#ffd75e", "#7ccf5f", "#5c6fd6", "#ff8c5a", "#ffffff"];

/** Deterministic pseudo-random in [0, 1) from an index and a salt, so render stays pure. */
function jitter(i: number, salt: number): number {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/** Lightweight CSS-only confetti burst; each piece gets its own position, delay and colour. */
export default function Confetti({ count = 48 }: { count?: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: jitter(i, 1) * 100,
        delay: jitter(i, 2) * 0.8,
        duration: 1.8 + jitter(i, 3) * 1.4,
        rotate: jitter(i, 4) * 360,
        color: COLORS[i % COLORS.length],
        size: 6 + jitter(i, 5) * 6,
        shape: i % 3 === 0 ? "circle" : "rect",
      })),
    [count],
  );

  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.id}
          className={`confetti-piece confetti-${p.shape}`}
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.shape === "circle" ? p.size : p.size * 1.6,
            background: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            transform: `rotate(${p.rotate}deg)`,
          }}
        />
      ))}
    </div>
  );
}
