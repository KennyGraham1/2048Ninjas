/** A hand-drawn rooftop scene for the dojo entrance. */
export default function DojoScene() {
  return (
    <svg viewBox="0 0 560 460" className="dojo-scene" aria-hidden="true" focusable="false">
      <circle cx="305" cy="210" r="164" fill="#c5ed70" opacity="0.04" />
      <circle cx="305" cy="210" r="133" fill="none" stroke="#c5ed70" opacity="0.12" />
      <circle cx="305" cy="210" r="104" fill="#d4ee99" />
      <path d="m0 313 80-75 65 49 89-97 100 113 79-82 147 119v120H0Z" fill="#182a27" />
      <path d="m0 369 154-67 112 44 136-60 158 81v93H0Z" fill="#10211f" />
      <g fill="#0b1717">
        <path d="M390 205h13v189h-13zm97-3h13v194h-13z" />
        <path d="M371 200q76 18 149-4l-6 18q-68 13-137-1Z" />
        <path d="M376 237h135v10H376Z" />
      </g>
      <path d="m21 413 260-63 259 63-27 13H44Z" fill="#091313" />
      <path d="m21 413 260-63 259 63" fill="none" stroke="#557158" strokeWidth="3" />
      <g className="scene-ninja">
        <path d="m240 239-55-91-10 5 51 98m-55-80 26-15" stroke="#7c9690" strokeWidth="7" />
        <path d="m297 191 53-16 41 17-49 7 50 34-76-10-35-12Z" fill="#ff785a" />
        <path d="m236 258-21 61-46 34 12 16 69-28 25-43 21 52 62 17 7-18-44-34-15-62Z" fill="#233b3a" stroke="#091616" strokeWidth="5" />
        <path d="m234 218-24 53 30 14 25-44 33 37 20-14-28-50Z" fill="#2e4a47" stroke="#091616" strokeWidth="5" />
        <path d="m231 250 64 1-2 16-64-2Z" fill="#ff785a" />
        <path d="m276 260 16 39 15-7-18-34" fill="#ff785a" />
        <path d="m224 165 24-28 37 5 23 29-7 43-34 18-37-18Z" fill="#253e3c" stroke="#091616" strokeWidth="5" />
        <path d="m232 178 64-1-5 19-25 7-31-10Z" fill="#d4ee99" />
        <path d="m239 183 18 5-5 5-12-4m48-6-18 5 5 5 12-4" fill="#0b1918" />
        <path d="m225 169 81-1-2 12-79 1Z" fill="#ff785a" />
        <path d="m264 166 6 8-6 6-6-6Z" fill="#101e1d" />
        <path d="m242 151 12-8 16 2" fill="none" stroke="#54716a" strokeWidth="4" />
        <path d="m205 272 17 10-8 14-16-9Zm102-2 14-9 12 15-14 12Z" fill="#859b78" />
      </g>
      <g fill="#c5ed70"><path d="m113 159 5 14 14 5-14 5-5 14-5-14-14-5 14-5Z"/><path d="m436 108 3 8 8 3-8 3-3 8-3-8-8-3 8-3Z"/></g>
      <g stroke="#728c65" opacity="0.5"><path d="M55 275h68m-94 9h54m329-150h76m-45 9h74"/></g>
      <text x="460" y="348" fill="#729479" fontSize="12" letterSpacing="5" transform="rotate(-90 460 348)">ENTER THE SHADOWS</text>
    </svg>
  );
}
