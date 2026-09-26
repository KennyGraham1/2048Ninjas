import { dailyMissions } from "@/lib/engagement";
import type { Progress } from "@/lib/progress";
import { todayKey } from "@/lib/rng";

export default function MissionsCard({ progress }: { progress: Progress }) {
  const today = todayKey();
  const done = new Set(progress.missions?.[today] ?? []);
  const missions = dailyMissions(today);
  const count = missions.filter((m) => done.has(m.id)).length;
  return (
    <section className="missions" aria-label="Today's missions">
      <header className="missions-head">
        <strong>Daily missions</strong>
        <span className="muted small">
          {count}/{missions.length} done · resets at midnight
        </span>
      </header>
      <ul>
        {missions.map((m) => {
          const ok = done.has(m.id);
          return (
            <li key={m.id} className={ok ? "mission-done" : ""}>
              <span className="mission-check" aria-hidden="true">
                {ok ? "✓" : ""}
              </span>
              <span className="mission-text">{m.text}</span>
              <span className="mission-xp">+{m.xp} XP</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
