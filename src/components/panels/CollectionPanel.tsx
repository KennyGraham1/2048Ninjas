import type { Progress } from "@/lib/progress";
import { NINJA_LIST } from "@/lib/ninjas";
import NinjaIcon from "../NinjaIcon";

interface Props {
  progress: Progress;
  onSelect: (value: number) => void;
}

export function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function CollectionPanel({ progress, onSelect }: Props) {
  const unlocked = Object.keys(progress.passport).length;
  return (
    <div>
      <p className="muted">
        {unlocked} of {NINJA_LIST.length} ninjas recruited. Tap a ninja to learn more.
      </p>
      <div className="collection-grid">
        {NINJA_LIST.map((item) => {
          const date = progress.passport[item.value];
          return (
            <button
              key={item.value}
              type="button"
              className={`collection-card ${date ? "" : "collection-locked"}`}
              style={{ background: item.bg, color: item.fg }}
              onClick={() => onSelect(item.value)}
            >
              <NinjaIcon style={item} className="collection-icon" />
              <strong>{date ? item.name : "???"}</strong>
              <span>{date ? formatDate(date) : item.value.toLocaleString()}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
