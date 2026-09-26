import { describe, expect, it } from "vitest";
import { nextRankGoal } from "../rankGoal";
import { newGame } from "../game";
import { MAX_DEFINED } from "../ninjas";

describe("next rank goal",()=>{
  it("counts a matching pair without counting consumed ghosts or wildcards",()=>{
    const base=newGame({seed:123,wasabi:false});
    const tiles=[{id:1,value:8,row:0,col:0},{id:2,value:8,row:0,col:1,removed:true},{id:3,value:0,row:1,col:1,wasabi:true}];
    const goal=nextRankGoal({...base,tiles})!;
    expect(goal.count).toBe(1);expect(goal.ready).toBe(false);expect(goal.current.name).toBe("Scout");expect(goal.next.name).toBe("Shinobi");
    expect(nextRankGoal({...base,tiles:[...tiles,{id:4,value:8,row:2,col:2}]})?.ready).toBe(true);
  });
  it("celebrates the final rank instead of asking for a nonexistent next rank",()=>{
    const base=newGame({seed:123});
    for(const value of [MAX_DEFINED,MAX_DEFINED*2])expect(nextRankGoal({...base,tiles:[{id:1,value,row:0,col:0}]})).toBeNull();
  });
});
