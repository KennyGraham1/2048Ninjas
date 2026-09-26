"use client";

import { useEffect, useRef } from "react";
import { NINJA_LIST, SMOKE_STYLE } from "@/lib/ninjas";
import NinjaIcon from "./NinjaIcon";

interface Props {
  /** Highest tile on the board. */
  top: number;
  wasabi: boolean;
  onSelect: (value: number) => void;
  onOpenMenu: () => void;
}

/** One-row, horizontally scrolling menu: every dish with its name, reached ones lit, current one ringed. */
export default function DishStrip({ top, wasabi, onSelect, onOpenMenu }: Props) {
  const currentRef = useRef<HTMLButtonElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const next = NINJA_LIST.find((d) => d.value > top);

  // Centre the current dish by scrolling the row itself — never the page.
  useEffect(() => {
    const row = rowRef.current;
    const item = currentRef.current;
    if (!row || !item) return;
    const left = item.offsetLeft - row.clientWidth / 2 + item.clientWidth / 2;
    row.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  }, [top]);

  return (
    <section className="strip" aria-label="Ninja ranks">
      <div className="strip-head">
        <span className="strip-title">Ranks</span>
        <span className="strip-hint">{next ? `Next: ${next.name}` : "Top of the ranks!"}</span>
        <button className="link" onClick={onOpenMenu}>
          View all
        </button>
      </div>
      <div className="strip-row" ref={rowRef}>
        {NINJA_LIST.map((item) => {
          const reached = top >= item.value;
          const current = top === item.value;
          return (
            <button
              key={item.value}
              ref={current ? currentRef : undefined}
              type="button"
              className={`strip-item ${reached ? "strip-reached" : ""} ${current ? "strip-current" : ""}`}
              onClick={() => onSelect(item.value)}
              aria-current={current ? "true" : undefined}
              title={`${item.name} · ${item.value.toLocaleString()}`}
            >
              <span className="strip-icon" style={{ background: reached ? item.bg : undefined }}>
                <NinjaIcon style={item} />
              </span>
              <span className="strip-name">{item.name}</span>
              <span className="strip-value">{item.value.toLocaleString()}</span>
            </button>
          );
        })}
        {wasabi && (
          <button
            type="button"
            className="strip-item strip-reached strip-wasabi"
            onClick={() => onSelect(0)}
            title="Smoke Bomb · wildcard"
          >
            <span className="strip-icon" style={{ background: SMOKE_STYLE.bg }}>
              <NinjaIcon style={SMOKE_STYLE} />
            </span>
            <span className="strip-name">Smoke Bomb</span>
            <span className="strip-value">wild</span>
          </button>
        )}
      </div>
    </section>
  );
}
