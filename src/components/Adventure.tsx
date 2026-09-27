"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ADVENTURE, CHAPTERS, adventureGame, adventureStars, adventureStatus, missionUnlocked, objectiveLabel, objectiveTarget, objectiveValue, type AdventureMission } from "@/lib/adventure";
import { KEY_MAP, applyUndo, canUndo, highestTile, move, settle, type Direction, type GameState } from "@/lib/game";
import type { Progress } from "@/lib/progress";
import type { Settings } from "@/lib/settings";
import { loadJson, saveJson } from "@/lib/storage";
import { sounds, vibrate } from "@/lib/sound";
import Board from "./Board";
import NextRankGoal from "./NextRankGoal";
import Confetti from "./Confetti";
import JourneyMap from "./JourneyMap";
import ComboBurst from "./ComboBurst";

interface Session { id: string; game: GameState; history: GameState[] }
interface Props { progress: Progress; settings: Settings; paused: boolean; onComplete: (id: string, game: GameState) => void }
const KEY = "adventure-run:v1";

function restoreSession(progress: Progress): Session | null {
  const saved = loadJson<Session | null>(KEY,null);
  if (!saved || !ADVENTURE.some((m) => m.id === saved.id) || !missionUnlocked(progress,saved.id)) return null;
  const g = saved.game;
  if (!g || g.challengeId !== saved.id || g.size !== 4 || !Array.isArray(g.tiles) || !Number.isFinite(g.moves)) return null;
  return {id:saved.id,game:settle(g),history:[]};
}

export default function Adventure({progress,settings,paused,onComplete}: Props) {
  const [session,setSession] = useState<Session | null>(() => restoreSession(progress));
  const [map,setMap] = useState(true);
  const [confirmRestart,setConfirmRestart] = useState(false);
  const [announce,setAnnounce] = useState("");
  const ref = useRef(session);
  const pointer = useRef<{x:number;y:number} | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mission = session ? ADVENTURE.find((m) => m.id === session.id)! : null;
  const status = mission && session ? adventureStatus(mission,session.game) : "playing";
  const save = useCallback((next: Session) => {
    ref.current=next;setSession(next);
    saveJson(KEY,{id:next.id,game:settle(next.game),history:[]});
  },[]);
  useEffect(() => () => { if(timer.current) clearTimeout(timer.current); },[]);
  const start = (m: AdventureMission, fresh = false) => {
    if (!missionUnlocked(progress,m.id)) return;
    const current=ref.current;
    const next = !fresh && current?.id === m.id && adventureStatus(m,current.game) === "playing" ? current : {id:m.id,game:adventureGame(m),history:[]};
    sounds.select();
    save(next);setMap(false);setConfirmRestart(false);setAnnounce(`${m.name}. ${objectiveLabel(m)} in ${m.limit} moves.`);
  };
  const undo = useCallback(() => {
    const cur=ref.current;
    if(!cur || paused || map || confirmRestart || !cur.history.length || !canUndo(cur.game)) return;
    const m=ADVENTURE.find((m)=>m.id===cur.id)!;
    if(adventureStatus(m,cur.game)==="won")return;
    save({...cur,game:applyUndo(cur.history[cur.history.length-1],cur.game),history:cur.history.slice(0,-1)});
    sounds.undo();
    setAnnounce("Move undone. Plan your next strike.");
  },[paused,map,confirmRestart,save]);
  const act = useCallback((dir: Direction) => {
    const cur=ref.current;
    if(!cur || paused || map || confirmRestart)return;
    const m=ADVENTURE.find((m)=>m.id===cur.id)!;
    if(adventureStatus(m,cur.game)!=="playing")return;
    const game=move(cur.game,dir);
    if(game===cur.game)return;
    const next={id:cur.id,game,history:[...cur.history.slice(-19),settle(cur.game)]};
    save(next);
    const result=adventureStatus(m,game);
    if(game.lastGain){sounds.merge(highestTile(game),game.combo);if(settings.haptics)vibrate(12)}else sounds.slide();
    if(result==="won"){onComplete(m.id,game);sounds.missionComplete(ADVENTURE.filter((item)=>item.chapter===m.chapter).at(-1)?.id===m.id);if(settings.haptics)vibrate([20,40,50]);}
    if(result==="lost")sounds.over();
    setAnnounce(`${objectiveLabel(m)}: ${objectiveValue(m,game)} of ${objectiveTarget(m)}. ${m.limit-game.moves} moves left.${result==="won"?" Mission complete.":result==="lost"?" Try again or undo your last move.":""}`);
    if(timer.current)clearTimeout(timer.current);
    timer.current=setTimeout(()=>{if(ref.current===next)save({...next,game:settle(game)});},520);
  },[paused,map,confirmRestart,save,settings.haptics,onComplete]);
  useEffect(()=>{
    if(map || paused)return;
    const key=(e:KeyboardEvent)=>{
      if(e.metaKey||e.ctrlKey||e.altKey)return;
      if((e.target as HTMLElement).closest("input,textarea,select,[contenteditable=true]"))return;
      const dir=KEY_MAP[e.key];
      if(dir){e.preventDefault();act(dir);}
      else if(e.key.toLowerCase()==="u"||e.key.toLowerCase()==="z"){e.preventDefault();undo();}
      if(e.key==="Escape"){setMap(true);setConfirmRestart(false);}
    };
    window.addEventListener("keydown",key);return()=>window.removeEventListener("keydown",key);
  },[act,undo,map,paused]);

  if(map || !mission || !session) {
    const resume=session?ADVENTURE.find((m)=>m.id===session.id):undefined;
    return <JourneyMap progress={progress} onStart={start} resume={session&&resume&&adventureStatus(resume,session.game)==="playing"&&session.game.moves>0 ? {name:resume.name,moves:session.game.moves,onResume:()=>{setMap(false);setConfirmRestart(false)}} : undefined} />;
  }
  const chapter=CHAPTERS[mission.chapter];
  const nextMission=ADVENTURE[ADVENTURE.indexOf(mission)+1];
  const game=session.game;
  const stars=adventureStars(mission,game);
  const reward=ADVENTURE.filter((m)=>m.chapter===mission.chapter).at(-1)?.id===mission.id;
  return <div className={`adventure-run scenery-${chapter.scenery}`}>
    <div className="sr-only" role="status" aria-live="polite">{announce}</div>
    <div className="arena-heading"><div><span className="eyebrow">{chapter.name.toUpperCase()} · MISSION {ADVENTURE.indexOf(mission)+1}</span><h1>{mission.name}</h1></div><button className="btn" onClick={()=>{setMap(true);setConfirmRestart(false)}}>Journey map</button></div>
    <div className="arena-layout"><div className="arena-main">
      <div className="adventure-objective"><div><span className="eyebrow">MISSION OBJECTIVE</span><strong>{objectiveLabel(mission)}</strong></div><span className="objective-count">{Math.min(objectiveValue(mission,game),objectiveTarget(mission))}<small> / {objectiveTarget(mission)}</small></span><progress max={objectiveTarget(mission)} value={objectiveValue(mission,game)}/></div>
      <div className="adventure-counters"><span><b>{mission.limit-game.moves}</b> MOVES LEFT</span><span><b>{game.score}</b> SCORE</span><span><b>{game.combo??0}×</b> COMBO</span></div>
      <div className="board-wrap" onPointerDown={(e)=>{if(status!=="playing"||paused||confirmRestart||(e.target as HTMLElement).closest("button,a,input,select,textarea,summary"))return;if(e.pointerType==="mouse"&&e.button!==0)return;pointer.current={x:e.clientX,y:e.clientY};e.currentTarget.setPointerCapture(e.pointerId)}} onPointerCancel={()=>{pointer.current=null}} onPointerUp={(e)=>{const from=pointer.current;pointer.current=null;if(!from)return;const x=e.clientX-from.x,y=e.clientY-from.y;if(Math.max(Math.abs(x),Math.abs(y))<24)return;act(Math.abs(x)>Math.abs(y)?x>0?"right":"left":y>0?"down":"up")}}>
        <Board size={4} tiles={game.tiles}/>
        {status==="playing"&&<ComboBurst combo={game.combo??0} move={game.moves}/>}
        {status!=="playing"&&<div className="overlay" role="status">{status==="won"&&<Confetti/>}<div className="overlay-card"><span className="eyebrow">{status==="won"?"MISSION COMPLETE":"A LESSON, NOT A DEFEAT"}</span><h2>{status==="won"?reward?`${chapter.reward} unlocked`:"Ninja-tastic!":"Refocus. Try again."}</h2>{status==="won"?<><p className="adventure-stars" aria-label={`${stars} of 3 stars`}>{[1,2,3].map((n)=><i key={n} className={n<=stars?"earned":""}>★</i>)}</p><p>{game.moves} moves · par {mission.par}. {reward?"Your new backdrop is ready in Settings.":"Your stars and progress are saved."}</p></>:<p>{mission.tip}</p>}<div className="overlay-buttons">{status==="won"&&nextMission&&<button className="btn btn-primary" onClick={()=>start(nextMission)}>Next mission ↗</button>}{status==="won"&&!nextMission&&<button className="btn btn-primary" onClick={()=>setMap(true)}>Journey complete · view map</button>}<button className="btn" onClick={()=>start(mission,true)}>Retry mission</button>{status==="lost"&&session.history.length>0&&canUndo(game)&&<button className="btn" onClick={undo}>Undo last move</button>}</div></div></div>}
      </div>
      <div className="toolbar"><button className="btn" onClick={undo} disabled={!session.history.length||!canUndo(game)||status==="won"}>Undo · {game.undosLeft} left</button><button className="btn" onClick={()=>game.moves>0&&status==="playing"?setConfirmRestart(true):start(mission,true)}>Restart mission</button></div>
      {confirmRestart&&<div className="restart-question" role="alert"><span>Restart this attempt? Your earned stars stay saved.</span><button className="btn" onClick={()=>setConfirmRestart(false)}>Keep playing</button><button className="btn btn-primary" onClick={()=>start(mission,true)}>Restart</button></div>}
      <div className="arena-instructions"><span>Swipe / arrow keys / WASD</span><span>U to undo · Esc for map</span></div>
    </div><aside className="arena-sidebar"><section className="mission-brief"><span className="eyebrow">FIELD NOTES</span><span className="brief-symbol" aria-hidden="true">{chapter.symbol}</span><h2>{mission.story}</h2><p>{mission.tip}</p><span className="brief-par">Perfect plan: {mission.par} moves, no undo.</span></section><NextRankGoal state={game}/><div className="adventure-reward-note"><span className="eyebrow">YOUR NEXT SANCTUARY</span><strong>{chapter.reward}</strong><span>Complete all three missions in {chapter.name} to unlock this backdrop for regular play.</span></div></aside></div>
  </div>;
}
