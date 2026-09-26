import type { Progress } from "@/lib/progress";
import { PUZZLES, puzzleLimit } from "@/lib/puzzles";
import { ninjaFor } from "@/lib/ninjas";
import NinjaIcon from "./NinjaIcon";

interface Props {
  progress: Progress;
  onPuzzle: (id: string) => void;
}

export function Stars({ n }: { n: number }) {
  return (
    <span className="stars" aria-label={`${n} of 3 stars`}>
      {[1, 2, 3].map((i) => (
        <i key={i} className={i <= n ? "star-on" : ""}>
          ★
        </i>
      ))}
    </span>
  );
}

export default function PuzzleList({ progress, onPuzzle }: Props) {
  const solved = Object.keys(progress.puzzles).length;
  const stars = Object.values(progress.puzzles).reduce((a, r) => a + r.stars, 0);
  return (
    <div className="puzzles">
      <header className="home-header">
        <h1 className="title">Puzzles</h1>
        <p className="subtitle">
          Make the goal ninja within the move limit. {solved}/{PUZZLES.length} solved · {stars}/{PUZZLES.length * 3} ★
        </p>
      </header>
      <ol className="puzzle-list">
        {PUZZLES.map((p, i) => {
          const r = progress.puzzles[p.id];
          const goal = ninjaFor(p.goal);
          return (
            <li key={p.id}>
              <button className={`puzzle-row ${r ? "puzzle-solved" : ""}`} onClick={() => onPuzzle(p.id)}>
                <span className="puzzle-num">{i + 1}</span>
                <span className="puzzle-icon-wrap" style={{ background: goal.bg }}>
                  <NinjaIcon style={goal} className="puzzle-icon" />
                </span>
                <span className="puzzle-text">
                  <strong>{p.name}</strong>
                  <span>
                    Make {goal.name} in {puzzleLimit(p)} moves · par {p.par}
                  </span>
                </span>
                {r ? <Stars n={r.stars} /> : <span className="puzzle-go">Play</span>}
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
