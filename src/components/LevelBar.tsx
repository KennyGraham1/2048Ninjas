import { levelInfo } from "@/lib/engagement";

export default function LevelBar({ xp }: { xp: number }) {
  const info = levelInfo(xp);
  const pct = Math.min(100, Math.round((info.into / info.span) * 100));
  return (
    <div className="level" title={`${xp.toLocaleString()} XP`}>
      <span className="level-badge">Lv {info.level}</span>
      <div className="level-text">
        <strong>{info.title}</strong>
        <span className="muted small">
          {info.into.toLocaleString()} / {info.span.toLocaleString()} XP to level {info.level + 1}
        </span>
      </div>
      <div className="level-bar" aria-hidden="true">
        <span style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
