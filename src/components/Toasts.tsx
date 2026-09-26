"use client";

import NinjaIcon from "./NinjaIcon";
import { SMOKE_STYLE, ninjaFor } from "@/lib/ninjas";

export interface Toast {
  id: number;
  kind: "dish" | "achievement" | "info";
  title: string;
  body?: string;
  icon?: number;
}
interface Props { toasts: Toast[]; onDismiss: (id: number) => void }

/** One in-flow notification rail: celebrations never cover the board. */
export default function Toasts({ toasts, onDismiss }: Props) {
  const latest = [...toasts].reverse().find((t)=>t.kind==="achievement") ?? toasts.at(-1);
  const newest = toasts.at(-1);
  const style = latest?.icon === undefined ? null : latest.icon === 0 ? SMOKE_STYLE : ninjaFor(latest.icon);
  return <div className={`milestone-rail ${latest ? "milestone-active" : ""}`}>
    <span className="sr-only" role="status" aria-live="polite">{newest ? `${newest.title}. ${newest.body??""}` : ""}</span>
    {latest ? <>
      {style && <NinjaIcon style={style} className="milestone-icon"/>}
      <details className="milestone-details">
        <summary><strong>{latest.title}</strong><span>{latest.body}</span>{toasts.length>1&&<b>+{toasts.length-1} more</b>}</summary>
        <ul>{toasts.map((t)=><li key={t.id}><strong>{t.title}</strong>{t.body&&<span>{t.body}</span>}</li>)}</ul>
      </details>
      <button className="milestone-dismiss" aria-label="Dismiss all milestones" onClick={()=>toasts.forEach((t)=>onDismiss(t.id))}>×</button>
    </> : <span className="milestone-rest">忍 <span>One move at a time.</span></span>}
  </div>;
}
