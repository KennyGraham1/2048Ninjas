import type { GameState } from "@/lib/game";
import { nextRankGoal } from "@/lib/rankGoal";
import NinjaIcon from "./NinjaIcon";

export default function NextRankGoal({ state }: { state: GameState }) {
  const goal = nextRankGoal(state);
  if (!goal) return <section className="next-rank next-rank-complete"><span className="eyebrow">THE CLAN IS COMPLETE</span><strong>Immortal achieved.</strong><p>Every rank discovered. Keep building your score.</p></section>;
  return (
    <section className={`next-rank ${goal.ready ? "next-rank-ready" : ""}`} aria-label="Next ninja goal">
      <div className="next-rank-heading"><span className="eyebrow">YOUR NEXT RECRUIT</span><span>{goal.ready ? "PAIR READY" : `${Math.min(2,goal.count)} / 2 FOUND`}</span></div>
      <div className="merge-recipe" aria-hidden="true">
        <NinjaIcon style={goal.current} /><span>+</span><NinjaIcon style={goal.current} /><span>→</span><NinjaIcon style={goal.next} />
      </div>
      <strong>{goal.next.name}</strong>
      <p>{goal.ready ? `Two ${goal.current.name} tiles are ready. Bring them together.` : `Merge two ${goal.current.name} tiles to recruit ${goal.next.name}.`}</p>
    </section>
  );
}
