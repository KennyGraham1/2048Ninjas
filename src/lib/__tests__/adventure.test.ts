import { describe, expect, it } from "vitest";
import { ADVENTURE, CHAPTERS, adventureMove, adventureGame, adventureStatus, adventureStars, missionUnlocked, recordAdventure, sceneryUnlocked } from "../adventure";
import { applyUndo, canUndo, move, settle, type Direction, type GameState } from "../game";
import solutions from "./adventure-solutions.json";
import { EMPTY_PROGRESS } from "../progress";

const dirs: Direction[] = ["left","up","right","down"];
/** Search only to each mission's advertised par, verifying its perfect medal is attainable. */
function solve(index: number): {game:GameState; path:Direction[]} | null {
  const m=ADVENTURE[index];
  const path=(solutions as Record<string,Direction[]>)[m.id];
  if(path){let game=adventureGame(m);for(const dir of path)game=settle(adventureMove(m,game,dir));return adventureStatus(m,game)==="won"?{game,path}:null;}
  let frontier=[{game:adventureGame(m),path:[] as Direction[]}];
  for(let depth=0;depth<m.par;depth++) {
    const next=[];
    for(const node of frontier)for(const dir of dirs){
      const game=move(node.game,dir,100);
      if(game===node.game)continue;
      const path=[...node.path,dir];
      if(adventureStatus(m,game)==="won")return {game: settle(game),path};
      if(adventureStatus(m,game)==="playing")next.push({game:settle(game),path});
    }
    frontier=next;
  }
  return null;
}

describe("adventure",()=>{
  it.each(ADVENTURE.map((m,i)=>[m.name,i] as const))("%s can earn three stars",(_name,i)=>{
    const solution=solve(i);
    expect(solution, `No solution at advertised par for ${ADVENTURE[i].id}`).not.toBeNull();
    expect(adventureStars(ADVENTURE[i],solution!.game)).toBe(3);
    expect(solution!.path).toHaveLength(ADVENTURE[i].par);
  });
  it("unlocks missions in order and rewards only newly earned stars",()=>{
    let p={...EMPTY_PROGRESS};
    expect(missionUnlocked(p,ADVENTURE[0].id)).toBe(true);
    expect(missionUnlocked(p,ADVENTURE[1].id)).toBe(false);
    expect(recordAdventure(p,ADVENTURE[1].id,solve(1)!.game)).toBe(p);
    for(let i=0;i<3;i++){
      const g=solve(i)!.game;
      p=recordAdventure(p,ADVENTURE[i].id,g,"2026-09-26");
      const xp=p.xp;
      expect(recordAdventure(p,ADVENTURE[i].id,g)).toBe(p);
      expect(p.xp).toBe(xp);
    }
    expect(p.xp).toBe(360);
    expect(sceneryUnlocked(p,"bamboo")).toBe(true);
    expect(sceneryUnlocked(p,"storm")).toBe(false);
    expect(missionUnlocked(p,ADVENTURE[3].id)).toBe(true);
    expect(p.stats).toEqual(EMPTY_PROGRESS.stats);
    for(let i=3;i<ADVENTURE.length;i++)p=recordAdventure(p,ADVENTURE[i].id,solve(i)!.game);
    expect(p.xp).toBe(ADVENTURE.length*120);
    for(const c of CHAPTERS)expect(sceneryUnlocked(p,c.scenery)).toBe(true);
    expect(sceneryUnlocked(p,"storm")).toBe(true);
    expect(sceneryUnlocked(p,"ember")).toBe(true);
  });
  it("handles old saves and refuses unfinished or mismatched runs",()=>{
    expect(sceneryUnlocked(EMPTY_PROGRESS,"rooftops")).toBe(true);
    expect(sceneryUnlocked(EMPTY_PROGRESS,"unknown")).toBe(false);
    const m=ADVENTURE[0];const g=adventureGame(m);
    expect(recordAdventure(EMPTY_PROGRESS,m.id,g)).toBe(EMPTY_PROGRESS);
    expect(recordAdventure(EMPTY_PROGRESS,m.id,{...solve(0)!.game,challengeId:"other"})).toBe(EMPTY_PROGRESS);
    expect(adventureStatus(m,{...g,moves:m.limit})).toBe("lost");
    expect(adventureStatus(m,{...solve(0)!.game,moves:m.limit})).toBe("won");
    expect(adventureStatus(m,{...solve(0)!.game,moves:m.limit+1})).toBe("lost");
    expect(adventureStars(m,{...solve(0)!.game,undosUsed:1})).toBe(2);
  });
});

describe("adventure undo", () => {
  it("restores the previous board and spends an undo", () => {
    const m=ADVENTURE[0];
    const start=adventureGame(m);
    const moved=dirs.map((d)=>move(start,d)).find((g)=>g!==start)!;
    expect(canUndo(moved)).toBe(true);
    const undone=applyUndo(start,moved);
    expect(undone.tiles).toEqual(start.tiles);
    expect(undone.moves).toBe(start.moves);
    expect(undone.undosLeft).toBe(moved.undosLeft-1);
    expect(undone.undosUsed).toBe(1);
  });
});


describe("extended journey rules",()=>{
  it("keeps the original saves valid and opens Frost after Ember",()=>{
    let p={...EMPTY_PROGRESS};
    for(let i=0;i<9;i++)p=recordAdventure(p,ADVENTURE[i].id,solve(i)!.game);
    expect(p.xp).toBe(1080);
    expect(missionUnlocked(p,"frost-1")).toBe(true);
    expect(missionUnlocked(p,"frost-2")).toBe(false);
    expect(sceneryUnlocked(p,"ember")).toBe(true);
    expect(sceneryUnlocked(p,"frost")).toBe(false);
  });
  it("constructs compact and expanded boards with unique tile IDs",()=>{
    for(const m of ADVENTURE){
      const g=adventureGame(m);
      expect(m.grid).toHaveLength(g.size*g.size);
      expect(g.tiles.every(t=>t.row<g.size&&t.col<g.size)).toBe(true);
      expect(g.nextId).toBeGreaterThan(Math.max(...g.tiles.map(t=>t.id)));
      expect(m.limit).toBeGreaterThanOrEqual(m.par);
    }
  });
  it("blocked wind moves cost neither turns nor random spawns",()=>{
    const m=ADVENTURE.find(m=>m.id==="moon-1")!;
    const game=adventureGame(m);
    expect(adventureMove(m,game,"up")).toBe(game);
    const next=adventureMove(m,game,"left");
    expect(next.moves).toBe(1);
    expect(next.rng).not.toBe(game.rng);
  });
  it("requires both guardian objectives at the same time",()=>{
    const i=ADVENTURE.findIndex(m=>m.id==="eclipse-3"),m=ADVENTURE[i],g=solve(i)!.game;
    expect(adventureStatus(m,g)).toBe("won");
    expect(adventureStatus(m,{...g,score:0})).not.toBe("won");
    expect(adventureStatus(m,{...g,tiles:[]})).not.toBe("won");
    expect(adventureStars(m,{...g,undosUsed:1})).toBe(2);
  });
  it("ends a wind trial when its only remaining move is blocked",()=>{
    const m={...ADVENTURE.find(m=>m.id==="moon-1")!,grid:[0,0,0,0, 2,4,2,4, 4,2,4,2, 2,4,2,4]};
    const g=adventureGame(m);
    expect(move(g,"up")).not.toBe(g);
    expect(adventureStatus(m,g)).toBe("lost");
    expect(adventureMove(m,g,"up")).toBe(g);
  });
  it("lets replay medals improve without farming XP or discarding best moves",()=>{
    const m=ADVENTURE[0],g=solve(0)!.game;
    const bronze=recordAdventure(EMPTY_PROGRESS,m.id,{...g,moves:m.limit});
    expect(bronze.xp).toBe(40);
    const gold=recordAdventure(bronze,m.id,g);
    expect(gold.xp).toBe(120);
    expect(recordAdventure(gold,m.id,g)).toBe(gold);
    expect(recordAdventure(gold,m.id,{...g,moves:m.limit})).toBe(gold);
  });
});
