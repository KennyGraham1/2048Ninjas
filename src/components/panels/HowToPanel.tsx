import { WIN_VALUE } from "@/lib/game";
import { ninjaFor } from "@/lib/ninjas";
import NinjaIcon from "../NinjaIcon";

function Chip({ value }: { value: number }) {
  const s = ninjaFor(value);
  return (
    <span className="howto-chip" style={{ background: s.bg, color: s.fg }}>
      <NinjaIcon style={s} className="howto-chip-icon" />
      <span>{s.name}</span>
    </span>
  );
}

export default function HowToPanel({ onStart }: { onStart: () => void }) {
  return (
    <div className="howto">
      <ol className="howto-steps">
        <li>
          <span className="howto-num">1</span>
          <div>
            <strong>Slide all the tiles</strong>
            <p>Swipe, or use the arrow keys. Every ninja on the board moves as far as it can in that direction.</p>
            <div className="howto-arrows" aria-hidden="true">
              <span>←</span>
              <span>↑</span>
              <span>↓</span>
              <span>→</span>
            </div>
          </div>
        </li>
        <li>
          <span className="howto-num">2</span>
          <div>
            <strong>Two of the same ninja become the next one</strong>
            <p>When matching ninjas bump into each other they merge and you score points.</p>
            <div className="howto-merge" aria-label="Two Rookies make an Apprentice">
              <Chip value={2} />
              <span className="howto-plus">+</span>
              <Chip value={2} />
              <span className="howto-eq">=</span>
              <Chip value={4} />
            </div>
          </div>
        </li>
        <li>
          <span className="howto-num">3</span>
          <div>
            <strong>Work your way up the ranks</strong>
            <p>
              A new Rookie (or Apprentice) appears after every move. Keep merging until you make the{" "}
              <strong>{ninjaFor(WIN_VALUE).name}</strong> — and then keep going if you like.
            </p>
            <div className="howto-merge">
              <Chip value={512} />
              <span className="howto-plus">→</span>
              <Chip value={1024} />
              <span className="howto-plus">→</span>
              <Chip value={2048} />
            </div>
          </div>
        </li>
      </ol>

      <section className="howto-tips">
        <h3>Quick tips</h3>
        <ul>
          <li>Pick one corner for your biggest ninja and keep it there.</li>
          <li>Keep the row along that corner full so nothing spawns behind it.</li>
          <li>Stuck? Tap <strong>Hint</strong>, or switch on <strong>Coach</strong> for feedback on every move.</li>
        </ul>
      </section>

      <section className="howto-keys">
        <h3>Keyboard</h3>
        <p>
          <kbd>←</kbd> <kbd>↑</kbd> <kbd>→</kbd> <kbd>↓</kbd> or <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> move ·{" "}
          <kbd>U</kbd> undo · <kbd>R</kbd> new game · <kbd>Esc</kbd> close
        </p>
      </section>

      <button className="btn btn-primary howto-cta" onClick={onStart}>
        Got it — let&apos;s play
      </button>
    </div>
  );
}
