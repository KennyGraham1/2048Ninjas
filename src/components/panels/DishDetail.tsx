import type { Progress } from "@/lib/progress";
import { NINJA_LIST, SMOKE_STYLE, ninjaFor } from "@/lib/ninjas";
import NinjaIcon from "../NinjaIcon";
import { formatDate } from "./CollectionPanel";

interface Props {
  /** Dish value; 0 for wasabi. */
  value: number;
  progress: Progress;
}

export default function DishDetail({ value, progress }: Props) {
  const style = value === 0 ? SMOKE_STYLE : ninjaFor(value);
  const date = value === 0 ? null : progress.passport[value];
  const index = NINJA_LIST.findIndex((d) => d.value === value);
  const next = index >= 0 ? NINJA_LIST[index + 1] : undefined;

  return (
    <div className="dish-detail">
      <div className="dish-hero" style={{ background: style.bg, color: style.fg }}>
        <NinjaIcon style={style} className="dish-hero-icon" />
      </div>
      <h3>{style.name}</h3>
      {value > 0 && <p className="dish-value">{value.toLocaleString()} points</p>}
      <p>{style.description}</p>
      {value > 0 && (
        <p className="muted small">
          {date
            ? `First recruited ${formatDate(date)}.`
            : "Not in your collection yet."}
          {next ? ` Merge two to make ${next.name}.` : " This is the top of the ranks!"}
        </p>
      )}
    </div>
  );
}
