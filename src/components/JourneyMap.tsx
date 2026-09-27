import type { CSSProperties } from "react";
import { ADVENTURE, CHAPTERS, missionUnlocked, objectiveLabel, type AdventureMission } from "@/lib/adventure";
import type { Progress } from "@/lib/progress";

interface Props { progress: Progress; onStart: (m: AdventureMission) => void; resume?: {name:string;moves:number;onResume:()=>void} }
export default function JourneyMap({progress,onStart,resume}:Props) {
  const completed=ADVENTURE.filter((m)=>progress.adventure?.[m.id]).length;
  const stars=ADVENTURE.reduce((n,m)=>n+(progress.adventure?.[m.id]?.stars??0),0);
  const current=ADVENTURE.find((m)=>!progress.adventure?.[m.id])?.id;
  return <div className="adventure-map festival-map">
    <header className="journey-heading"><div><span className="eyebrow">YOUR NINJA ADVENTURE</span><h1>A little courage.<br/><em>A world of wonder.</em></h1><p>Follow the trail, collect stars, and find your clan&apos;s next home.</p></div><div className="journey-totals"><span aria-hidden="true">★</span><strong>{stars}<small> / {ADVENTURE.length*3}</small></strong><span>{completed} of {ADVENTURE.length} missions complete</span></div></header>
    {resume&&<button className="btn btn-primary adventure-resume" onClick={resume.onResume}>Continue {resume.name} · move {resume.moves} ↗</button>}
    <div className="journey-worlds">
      {CHAPTERS.map((chapter,index)=>{
        const missions=ADVENTURE.filter((m)=>m.chapter===index);
        const cleared=missions.every((m)=>progress.adventure?.[m.id]);
        return <section key={chapter.name} className={`journey-world world-${chapter.scenery}`} aria-label={chapter.name}>
          <header className="world-heading"><span>WORLD {index+1}</span><h2>{chapter.name}</h2><p>{chapter.description}</p></header>
          <div className="journey-land">
            <span className="map-cloud map-cloud-one"/><span className="map-cloud map-cloud-two"/><span className="map-sun"/>
            <span className="map-landmark" aria-hidden="true">{chapter.symbol}</span>
            <svg viewBox="0 0 400 550" preserveAspectRatio="none" className="journey-trail" aria-hidden="true"><path d="M112-20C20 30 30 70 112 100S365 180 280 270 10 355 112 440 280 510 250 570" className="trail-shadow"/><path d="M112-20C20 30 30 70 112 100S365 180 280 270 10 355 112 440 280 510 250 570" className="trail-main"/><path d="M112-20C20 30 30 70 112 100S365 180 280 270 10 355 112 440 280 510 250 570" className="trail-dashes"/></svg>
            {missions.map((m,i)=>{
              const available=missionUnlocked(progress,m.id),result=progress.adventure?.[m.id],active=current===m.id;
              return <div className={`journey-stop ${active?"stop-current":""} ${result?"stop-cleared":""}`} key={m.id} style={{"--stop-x":i===1?"70%":"28%","--stop-y":`${i*170+55}px`} as CSSProperties}>
                {active&&<span className="play-flag">YOU ARE HERE</span>}
                <button className="level-orb" disabled={!available} onClick={()=>onStart(m)} aria-label={`Mission ${ADVENTURE.indexOf(m)+1}: ${m.name}. ${objectiveLabel(m)}. ${available?result?"Replay":"Play":"Locked"}`}>
                  <span>{available?ADVENTURE.indexOf(m)+1:"✦"}</span>{result&&<b aria-hidden="true">✓</b>}
                </button>
                <span className="map-stars" aria-label={`${result?.stars??0} of 3 stars`}>{[1,2,3].map((n)=><i className={n<=(result?.stars??0)?"earned":""} key={n}>★</i>)}</span>
                <strong>{m.name}</strong><small>{available?`${m.limit} moves · par ${m.par}`:"Complete the previous mission"}</small>
              </div>;
            })}
          </div>
          <footer className={`world-prize ${cleared?"prize-earned":""}`}><span className="prize-icon" aria-hidden="true">{cleared?"★":"♜"}</span><div><span>{cleared?"YOURS TO KEEP!":"FINISH THIS WORLD TO UNLOCK"}</span><strong>{chapter.reward}</strong></div></footer>
        </section>;
      })}
    </div>
    <p className="journey-legend">★ Complete the mission · ★★ Within par + 2 · ★★★ At par without undo<br/>Every new star earns 40 XP. Replay anytime to improve your medal.</p>
  </div>;
}
