"use client";

import NinjaIcon from "./NinjaIcon";
import { SMOKE_STYLE, ninjaFor } from "@/lib/ninjas";

export interface Toast {
  id: number;
  kind: "dish" | "achievement" | "info";
  title: string;
  body?: string;
  /** Dish value for the icon; 0 = wasabi. */
  icon?: number;
}

interface Props {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}

export default function Toasts({ toasts, onDismiss }: Props) {
  if (toasts.length === 0) return null;
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => {
        const style = t.icon === undefined ? null : t.icon === 0 ? SMOKE_STYLE : ninjaFor(t.icon);
        return (
          <button
            key={t.id}
            className={`toast toast-${t.kind}`}
            onClick={() => onDismiss(t.id)}
            type="button"
          >
            {style && <NinjaIcon style={style} className="toast-icon" />}
            <span className="toast-text">
              <strong>{t.title}</strong>
              {t.body && <span>{t.body}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}
