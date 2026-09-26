import { STRATEGY_GUIDE } from "@/lib/coach";

export default function CoachPanel({ advice }: { advice: string[] }) {
  return (
    <div className="coach-panel">
      {advice.length > 0 && (
        <section className="coach-now">
          <h3>Right now on your board</h3>
          <ul>
            {advice.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </section>
      )}
      <h3>The playbook</h3>
      <ol className="guide">
        {STRATEGY_GUIDE.map((g) => (
          <li key={g.title}>
            <strong>{g.title}</strong>
            <span>{g.body}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
