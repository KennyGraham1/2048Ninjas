import type { NinjaStyle } from "@/lib/ninjas";

/** Original vector characters stay sharp on every board size and share card. */
export default function NinjaIcon({ style, className }: { style: NinjaStyle; className?: string }) {
  const { suit, accent, rank, kind } = style;
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true" focusable="false">
      {kind === "smoke" ? (
        <>
          <g fill={accent} opacity="0.75">
            <circle cx="28" cy="36" r="15" /><circle cx="48" cy="24" r="17" />
            <circle cx="70" cy="32" r="18" /><circle cx="79" cy="48" r="12" />
          </g>
          <path d="M54 48 Q67 37 61 29" fill="none" stroke={suit} strokeWidth="4" strokeLinecap="round" />
          <path d="m60 19 2 6 6-2-4 5 4 5-6-2-4 5 1-7-6-3 7-1Z" fill="#f0b84d" />
          <rect x="41" y="44" width="23" height="12" rx="5" fill={suit} />
          <circle cx="50" cy="68" r="25" fill={suit} />
          <path d="M31 67a19 19 0 0 1 11-16" fill="none" stroke={accent} strokeWidth="4" strokeLinecap="round" />
          <path d="m51 56 3 9 9 3-9 3-3 9-3-9-9-3 9-3Z" fill={accent} />
        </>
      ) : (
        <>
          <ellipse cx="50" cy="91" rx="28" ry="5" fill={suit} opacity="0.15" />
          {rank >= 4 && (
            <g stroke="#273246" strokeWidth="5" strokeLinecap="round">
              <path d="m21 34 54 49" /><path d="m19 42 9-10" />
              {rank >= 8 && <><path d="m79 34-54 49" /><path d="m72 32 9 10" /></>}
            </g>
          )}
          <path d="M34 65Q22 66 21 81L32 84 38 75M66 65Q78 66 79 81L68 84 62 75" fill={suit} />
          <path d="M33 63h34l3 25H55l-5-8-5 8H30Z" fill={suit} />
          <path d="m37 63 24 19M63 63 39 82" fill="none" stroke={accent} strokeWidth="4" opacity="0.65" />
          <path d="M30 78h40v7H30Z" fill={accent} />
          <path d="m56 82 8 12 6-4-10-10" fill={accent} />
          <path d="m74 31 18-5-6 14 7 8-20-4Z" fill={accent} />
          <rect x="22" y="12" width="56" height="59" rx="25" fill={suit} />
          <path d="M31 27q5-8 13-9" fill="none" stroke="#ffffff" strokeWidth="3" opacity="0.18" strokeLinecap="round" />
          <path d="M26 34h48v17Q50 60 26 51Z" fill="#f4d7b6" />
          <path d="M26 51q24 7 48 0v6Q50 68 26 57Z" fill="#172337" opacity="0.32" />
          <path d="m34 41 9 3m14 0 9-3" stroke="#172337" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M22 28q28-5 56 0v9q-28-5-56 0Z" fill={accent} />
          {rank < 3 ? (
            <g fill={suit}>{Array.from({ length: rank + 1 }, (_, i) => <circle key={i} cx={50 + (i - rank / 2) * 6} cy="31" r="1.8" />)}</g>
          ) : rank < 10 ? (
            <path d={rank % 3 === 0 ? "m50 25 6 6-6 6-6-6Z" : rank % 3 === 1 ? "m45 25 5 4 5-4-2 6 2 6-5-4-5 4 2-6Z" : "m51 24-7 8h5l-1 7 8-10h-5Z"} fill={suit} />
          ) : (
            <path d="m42 27 5 3 3-6 3 6 5-3-2 9H44Z" fill={suit} />
          )}
          {rank >= 10 && <path d="m9 54 2 5 5 2-5 2-2 5-2-5-5-2 5-2Zm78 10 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" fill={accent} />}
          {rank >= 14 && <path d="m33 7 8 3 9-7 9 7 8-3" fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round" />}
        </>
      )}
    </svg>
  );
}
