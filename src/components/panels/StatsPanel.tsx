import type { Progress } from "@/lib/progress";
import { ninjaFor } from "@/lib/ninjas";
import NinjaIcon from "../NinjaIcon";

export default function StatsPanel({ progress }: { progress: Progress }) {
  const s = progress.stats;
  const avg = s.gamesPlayed ? Math.round(s.totalScore / s.gamesPlayed) : 0;
  const winRate = s.gamesPlayed ? Math.round((s.gamesWon / s.gamesPlayed) * 100) : 0;
  const top = s.highestTile ? ninjaFor(s.highestTile) : null;

  const rows: [string, string][] = [
    ["Games finished", s.gamesPlayed.toLocaleString()],
    ["Games won", `${s.gamesWon.toLocaleString()} (${winRate}%)`],
    ["Best score", s.bestScore.toLocaleString()],
    ["Average score", avg.toLocaleString()],
    ["Total moves", s.totalMoves.toLocaleString()],
    ["Total merges", s.totalMerges.toLocaleString()],
    ["Longest game", `${s.longestGame.toLocaleString()} moves`],
  ];

  return (
    <div className="stats">
      {top && (
        <div className="stats-hero" style={{ background: top.bg, color: top.fg }}>
          <NinjaIcon style={top} className="stats-hero-icon" />
          <div>
            <span className="stats-hero-label">Highest ninja ever</span>
            <strong>{top.name}</strong>
            <span className="stats-hero-value">{s.highestTile.toLocaleString()}</span>
          </div>
        </div>
      )}
      <dl className="stats-list">
        {rows.map(([k, v]) => (
          <div key={k} className="stats-row">
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      {s.gamesPlayed === 0 && <p className="muted">Finish a game to start filling this in.</p>}
    </div>
  );
}
