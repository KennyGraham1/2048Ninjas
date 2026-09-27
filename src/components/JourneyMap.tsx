"use client";

import { useState, type CSSProperties } from "react";
import { ADVENTURE, CHAPTERS, missionUnlocked, objectiveLabel, type AdventureMission } from "@/lib/adventure";
import type { Progress } from "@/lib/progress";

interface Props { progress: Progress; onStart: (m: AdventureMission) => void; resume?: {name:string;moves:number;onResume:()=>void} }
export default function JourneyMap({progress,onStart,resume}:Props) {
  const current=ADVENTURE.find((m)=>!progress.adventure?.[m.id]);
  const [selected,setSelected]=useState(current?.chapter??CHAPTERS.length-1);
  const completed=ADVENTURE.filter((m)=>progress.adventure?.[m.id]).length;
  const stars=ADVENTURE.reduce((n,m)=>n+(progress.adventure?.[m.id]?.stars??0),0);
  const chapter=CHAPTERS[selected];
  const missions=ADVENTURE.filter((m)=>m.chapter===selected);
  const cleared=missions.every((m)=>progress.adventure?.[m.id]);
  const chapterStars=missions.reduce((n,m)=>n+(progress.adventure?.[m.id]?.stars??0),0);
  const perfect=chapterStars===missions.length*3;
  const next=missions.find((m)=>missionUnlocked(progress,m.id)&&!progress.adventure?.[m.id])??missions.find((m)=>missionUnlocked(progress,m.id)&&(progress.adventure?.[m.id]?.stars??0)<3);
  return <div className="adventure-map festival-map">
    <header className="journey-heading"><div><span className="eyebrow">{ADVENTURE.length} MISSIONS · {CHAPTERS.length} WORLDS · ONE LEGEND</span><h1>Your next chapter<br/><em>starts with a move.</em></h1><p>Brave the frost, outsmart the wind, and face the Eclipse guardian.</p></div><div className="journey-totals"><span aria-hidden="true">★</span><strong>{stars}<small> / {ADVENTURE.length*3}</small></strong><span>{completed} of {ADVENTURE.length} missions complete</span></div></header>
    {resume&&<button className="btn btn-primary adventure-resume" onClick={resume.onResume}>Continue {resume.name} · move {resume.moves} ↗</button>}
    <nav className="world-selector" aria-label="Choose a journey world">{CHAPTERS.map((c,index)=>{
      const levels=ADVENTURE.filter((m)=>m.chapter===index),earned=levels.reduce((n,m)=>n+(progress.adventure?.[m.id]?.stars??0),0);
      return <button key={c.scenery} className={`world-tab ${selected===index?"world-tab-active":""}`} aria-pressed={selected===index} onClick={()=>setSelected(index)}><span aria-hidden="true">{c.symbol}</span><strong>{index+1}. {c.name}</strong><small>{earned===levels.length*3?"♛ MASTERED":`${earned}/${levels.length*3} ★`}{current?.chapter===index?" · NEXT":""}</small></button>;
    })}</nav>
    <div className="journey-chapter-layout">
      <section className={`journey-world world-${chapter.scenery}`} aria-label={chapter.name}>
        <header className="world-heading"><span>WORLD {selected+1} / {CHAPTERS.length}</span><h2>{chapter.name}</h2><p>{chapter.description}</p></header>
        <div className="journey-land">
          <span className="map-cloud map-cloud-one"/><span className="map-cloud map-cloud-two"/><span className="map-sun"/>
          <span className="map-landmark" aria-hidden="true">{chapter.symbol}</span>
          <svg viewBox="0 0 400 550" preserveAspectRatio="none" className="journey-trail" aria-hidden="true"><path d="M112-20C20 30 30 70 112 100S365 180 280 270 10 355 112 440 280 510 250 570" className="trail-shadow"/><path d="M112-20C20 30 30 70 112 100S365 180 280 270 10 355 112 440 280 510 250 570" className="trail-main"/><path d="M112-20C20 30 30 70 112 100S365 180 280 270 10 355 112 440 280 510 250 570" className="trail-dashes"/></svg>
          {missions.map((m,i)=>{
            const available=missionUnlocked(progress,m.id),result=progress.adventure?.[m.id],active=current?.id===m.id;
            return <div className={`journey-stop ${active?"stop-current":""} ${result?"stop-cleared":""} ${m.boss?"stop-guardian":""}`} key={m.id} style={{"--stop-x":i===1?"70%":"28%","--stop-y":`${i*170+55}px`} as CSSProperties}>
              {active&&<span className="play-flag">YOU ARE HERE</span>}
              <button className="level-orb" disabled={!available} onClick={()=>onStart(m)} aria-label={`Mission ${ADVENTURE.indexOf(m)+1}: ${m.name}. ${objectiveLabel(m)}.${m.secondary?` Also ${objectiveLabel(m,m.secondary)}.`:""} ${available?result?"Replay":"Play":"Locked"}`}><span>{available?ADVENTURE.indexOf(m)+1:"✦"}</span>{result&&<b aria-hidden="true">✓</b>}</button>
              <span className="map-stars" aria-label={`${result?.stars??0} of 3 stars`}>{[1,2,3].map((n)=><i className={n<=(result?.stars??0)?"earned":""} key={n}>★</i>)}</span>
              <strong>{m.boss?"♛ ":""}{m.name}</strong><small>{available?`${m.limit} moves · par ${m.par}`:"Complete the previous mission"}</small>
            </div>;
          })}
        </div>
        <footer className={`world-prize ${cleared?"prize-earned":""}`}><span className="prize-icon" aria-hidden="true">{perfect?"♛":cleared?"★":"♜"}</span><div><span>{perfect?"WORLD MASTERED!":cleared?"YOURS TO KEEP!":"FINISH THIS WORLD TO UNLOCK"}</span><strong>{chapter.reward}</strong></div></footer>
      </section>
      <aside className="journey-dossier">
        <section className="chapter-challenge"><span className="eyebrow">{selected<3?"LEARN THE WAY":selected<6?"TEST YOUR TACTICS":"THE MASTER TRIALS"}</span><h2>{selected<3?"Every legend starts small.":selected<6?"A new twist. A clever plan.":"You have come far. Go further."}</h2><p>{chapter.description} Each world ends with a final trial. Earn three stars by finishing at par without undo.</p>
          <div className="chapter-medal"><span aria-hidden="true">{perfect?"♛":"☆"}</span><div><strong>{perfect?"Mastery crown earned":"Chase the mastery crown"}</strong><span>{chapterStars} / {missions.length*3} stars in this world</span><progress aria-label="World mastery" max={missions.length*3} value={chapterStars}/></div></div>
          {next?<button className="btn btn-primary" onClick={()=>onStart(next)}>{progress.adventure?.[next.id]?"Improve your medal":"Play next mission"} · {ADVENTURE.indexOf(next)+1} ↗</button>:!cleared?<p className="chapter-locked">Complete the earlier worlds to open this trail. You can preview its challenges below.</p>:<button className="btn" onClick={()=>onStart(missions[0])}>Replay this world ↗</button>}
          {current&&current.chapter!==selected&&<button className="link chapter-return" onClick={()=>setSelected(current.chapter)}>Return to your next world →</button>}
        </section>
        <ol className="chapter-objectives">{missions.map((m)=><li key={m.id}><span>{ADVENTURE.indexOf(m)+1}</span><div><strong>{m.name}</strong><p>{objectiveLabel(m)}{m.secondary?` + ${objectiveLabel(m,m.secondary).toLowerCase()}`:""}</p><small>{m.size===3?"COMPACT 3×3":m.size===5?"EXPANDED 5×5":"CLASSIC 4×4"}{m.blockedDirection?" · NO UP MOVES":""}{m.boss?" · GUARDIAN TRIAL":""} · PAR {m.par}</small></div></li>)}</ol>
        <p className="journey-legend">★ Finish · ★★ Within par + 2 · ★★★ At par, no undo<br/>Every new star earns 40 XP. Replays improve your best medal.</p>
      </aside>
    </div>
    <div className="world-pagination"><button className="btn" disabled={selected===0} onClick={()=>setSelected((n)=>n-1)}>← Previous world</button><span>{selected+1} / {CHAPTERS.length}</span><button className="btn" disabled={selected===CHAPTERS.length-1} onClick={()=>setSelected((n)=>n+1)}>Next world →</button></div>
  </div>;
}
