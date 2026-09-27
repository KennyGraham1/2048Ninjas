/** The ninja crest, shared with the favicon and home-screen icons. */
export default function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true" focusable="false">
      <rect width="64" height="64" rx="12" fill="#e4ccfa" />
      <path d="m46 22 12-4-4 10 5 6-14-3Z" fill="#e57ba9" />
      <path d="m12 24 11-15h18l11 15-3 24-17 9-17-9Z" fill="#594371" />
      <path d="M17 27h30v13q-15 8-30 0Z" fill="#f6d8b8" />
      <path d="m23 32 6 3m6 0 6-3" stroke="#172337" strokeWidth="3" strokeLinecap="round" />
      <path d="M12 21q20-4 40 0v8q-20-4-40 0Z" fill="#e57ba9" />
      <path d="m32 19 4 5-4 4-4-4Z" fill="#594371" />
      <path d="m25 46 7 3 7-3" fill="none" stroke="#53617a" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
