/** Rank-specific silhouettes. These stay legible even when a tile is tiny. */
export function RearGear({rank,accent,suit}:{rank:number;accent:string;suit:string}) {
  switch(rank) {
    case 0:return <path d="M28 62 18 79" stroke="#a0aab2" strokeWidth="6"/>;
    case 1:return <g fill="none" stroke={accent} strokeWidth="3"><path d="M28 25Q9 14 9 35m65-3q16-17 20-4"/></g>;
    case 2:return <g fill="none" stroke={accent} strokeWidth="3"><path d="M18 21q-19 31 0 58V21m-4 4 8 54"/><path d="m76 69 12-49m-15 9 15-9 4 17"/></g>;
    case 3:return <path d="m78 51 3 10 11-2-8 9 8 8-11-2-3 10-3-10-11 2 8-8-8-9 11 2Z" fill={accent}/>;
    case 4:return <g stroke={accent} strokeWidth="4" fill="#d7e4e7"><path d="m17 14 56 71 4-5L22 11Zm65-3L23 80l4 5 59-70Z"/><path d="m10 27 17-14m46-1 16 15" strokeWidth="5"/></g>;
    case 5:return <g fill={accent}><path d="M29 48 3 34l8 18-11 6 35 8Zm43-10 28-19-9 20 9 5-29 16Z"/><path d="M22 81H3m23 7H9" stroke={accent} strokeWidth="2"/></g>;
    case 6:return <path d="M30 21Q4 44 4 87l29-12 17 19 21-20 25 13Q93 44 72 21Z" fill={suit} stroke={accent} strokeWidth="1.5"/>;
    case 7:return <g fill={accent}><path d="m21 37-6-30 25 17m22 0L85 7l-6 30"/><path d="m26 76-15 14 22-4m38-10 15 14-22-4"/></g>;
    case 8:return <g fill={accent}><path d="m22 52-18 8 5 14 18-6m51-16 18 8-5 14-18-6"/><path d="M84 6 74 26h9l-7 18 21-27H85l8-11Z"/></g>;
    case 9:return <g fill={accent}><path d="M24 85C3 88 0 69 16 52l-2 16 11-8-4 14 10-3Zm51 0c21 3 24-16 8-33l2 16-11-8 4 14-10-3Z"/></g>;
    case 10:return <g stroke={accent} strokeWidth="5" strokeLinecap="round"><path d="M15 33v59"/><path d="m28 59-5 32h54l-7-32" fill={suit} strokeWidth="2"/></g>;
    case 11:return <g fill={suit} stroke={accent} strokeWidth="1.5"><path d="M27 42 4 23l8 28-10-5 11 23-8 11 28-1m40-37 23-19-8 28 10-5-11 23 8 11-28-1"/></g>;
    case 12:return <g fill="none" stroke={accent} strokeWidth="3"><path d="M72 8a36 36 0 1 0 18 47A31 31 0 0 1 72 8Z" fill={accent} opacity=".25"/><path d="M84 42v49m-5-66a10 10 0 1 0 12 14 12 12 0 0 1-12-14Z"/></g>;
    case 13:return <g fill={accent}><path d="M34 65Q4 52 1 15l20 15-8-22 29 37m24 20q30-13 33-50L79 30l8-22-29 37"/><path d="m30 77-12 21 24-9m28-12 12 21-24-9"/></g>;
    case 14:return <g fill={suit} stroke={accent} strokeWidth="3"><path d="M68 84q29 10 25-15-11 7-12-1"/><path d="M30 29 16 3l22 14m32 12L84 3 62 17"/></g>;
    case 15:return <g fill="none" stroke={accent}><circle cx="50" cy="44" r="39" strokeWidth="2"/><path d="M50 0v9m0 72v10M5 44h9m72 0h9M17 12l8 8m50 50 8 8m0-66-8 8M25 70l-8 8" strokeWidth="3"/></g>;
    default:return <g fill="none" stroke={accent}><ellipse cx="50" cy="53" rx="47" ry="19" transform="rotate(-35 50 53)" strokeWidth="2"/><ellipse cx="50" cy="53" rx="47" ry="19" transform="rotate(35 50 53)" opacity=".4"/><circle cx="12" cy="76" r="4" fill={accent}/><circle cx="86" cy="29" r="3" fill={accent}/><path d="m30 85-4 12 16-7m28-5 4 12-16-7"/></g>;
  }
}
export function FrontGear({rank,accent,suit}:{rank:number;accent:string;suit:string}) {
  if(rank===0)return <path d="m35 77 7-9m14 9 7-9" stroke={accent} strokeWidth="2"/>;
  if(rank===1)return <path d="M47 69h6v9h-6Z" fill={accent}/>;
  if(rank===2)return <g fill={accent}><path d="m28 62 9 3-6 17-9-3Z"/><circle cx="67" cy="74" r="5"/><circle cx="67" cy="74" r="2" fill={suit}/></g>;
  if(rank===3)return <path d="m30 69 2 5 5-1-3 4 3 4-5-1-2 5-2-5-5 1 3-4-3-4 5 1Z" fill={accent}/>;
  if(rank===4)return <path d="m29 56 11 6m20 0 11-6" fill="none" stroke={accent} strokeWidth="2"/>;
  if(rank===5)return <path d="m63 36-6 13 6-3-3 8 10-14-6 2 3-6Z" fill={suit}/>;
  if(rank===6)return <path d="M27 49h46l-23 18Z" fill="#111c25"/>;
  if(rank===7)return <g fill="#fff0dd"><path d="m26 35 11 2 7 14-16-6m46-10-11 2-7 14 16-6"/><path d="m37 51 5 10 3-9m18-1-5 10-3-9"/></g>;
  if(rank===8)return <g fill={accent}><path d="m33 66 17 5 17-5-5 13H38Z"/><path d="m49 41-6 12h7l-3 10 11-15h-7l4-7Z"/></g>;
  if(rank===9)return <path d="m45 54 5-5 5 5-5 7Zm-8 15-5 9m31-9 5 9" fill={accent} stroke={accent} strokeWidth="2"/>;
  if(rank===10)return <g><path d="M8 27 50 5l42 22-42 9Z" fill={accent} stroke={suit} strokeWidth="2"/><path d="m25 26 25-15 25 15M50 11v19" fill="none" stroke={suit} strokeWidth="1.5"/><path d="m37 54 13 7 13-7-13 20Z" fill="#fff6d9"/></g>;
  if(rank===11)return <path d="m40 51 10 13 10-13-10 5Z" fill={accent}/>;
  if(rank===12)return <path d="M52 21a7 7 0 1 0 5 10 7 7 0 0 1-5-10Z" fill={suit}/>;
  if(rank===13)return <path d="m30 32 11 1 9-15 9 15 11-1-20 17Z" fill={accent}/>
  if(rank===14)return <g fill={accent}><path d="M28 48 39 53 34 60m38-12-11 5 5 7"/><path d="m40 69 10 4 10-4-10 14Z"/></g>;
  if(rank===15)return <g fill={accent}><path d="m19 61 18-5 2 13-18 3m60-11-18-5-2 13 18 3"/><path d="m39 69 11-5 11 5-4 12H43Z"/><path d="m32 16 9 4 9-12 9 12 9-4-6 15H38Z"/></g>;
  return <g fill="none" stroke={accent} strokeWidth="2"><path d="m41 46 9-9 9 9-9 10Z"/><path d="M38 68q12 13 24 0m-23 7q11 12 22 0"/></g>;
}
