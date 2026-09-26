"use client";

import { useState } from "react";
import { ACHIEVEMENTS, CATEGORY_LABEL, type AchievementCategory, type Progress } from "@/lib/progress";
import { SMOKE_STYLE, ninjaFor } from "@/lib/ninjas";
import NinjaIcon from "../NinjaIcon";
import { formatDate } from "./CollectionPanel";

type Filter = "all" | "unlocked" | "locked";

export default function AchievementsPanel({ progress }: { progress: Progress }) {
  const [filter, setFilter] = useState<Filter>("all");
  const done = Object.keys(progress.achievements).length;
  const categories = [...new Set(ACHIEVEMENTS.map((a) => a.category))] as AchievementCategory[];

  return (
    <div>
      <div className="achievement-summary">
        <p className="muted">
          {done} of {ACHIEVEMENTS.length} unlocked.
        </p>
        <div className="segmented tabs" role="tablist" aria-label="Filter">
          {(["all", "unlocked", "locked"] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              role="tab"
              aria-selected={filter === f}
              className={filter === f ? "seg-active" : ""}
              onClick={() => setFilter(f)}
            >
              {f[0].toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <div className="progress-bar" aria-hidden="true">
        <span style={{ width: `${(done / ACHIEVEMENTS.length) * 100}%` }} />
      </div>

      {categories.map((cat) => {
        const items = ACHIEVEMENTS.filter((a) => a.category === cat).filter((a) => {
          const unlocked = !!progress.achievements[a.id];
          return filter === "all" || (filter === "unlocked" ? unlocked : !unlocked);
        });
        if (items.length === 0) return null;
        const catDone = ACHIEVEMENTS.filter((a) => a.category === cat && progress.achievements[a.id]).length;
        const catTotal = ACHIEVEMENTS.filter((a) => a.category === cat).length;
        return (
          <section key={cat} className="achievement-group">
            <h3>
              {CATEGORY_LABEL[cat]} <span className="count">{catDone}/{catTotal}</span>
            </h3>
            <ul className="achievement-list">
              {items.map((a) => {
                const date = progress.achievements[a.id];
                const hidden = a.secret && !date;
                const style = a.icon === 0 ? SMOKE_STYLE : ninjaFor(a.icon);
                return (
                  <li key={a.id} className={`achievement ${date ? "achievement-done" : ""}`}>
                    <span className="achievement-badge" style={{ background: style.bg }}>
                      <NinjaIcon style={style} className="achievement-icon" />
                    </span>
                    <span className="achievement-text">
                      <strong>{hidden ? "???" : a.name}</strong>
                      <span>{hidden ? "A secret achievement. Keep playing to discover it." : a.description}</span>
                      {date && <small>Unlocked {formatDate(date)}</small>}
                    </span>
                    <span className="achievement-check" aria-hidden="true">
                      {date ? "✓" : ""}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
