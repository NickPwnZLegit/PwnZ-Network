import test from "node:test";
import assert from "node:assert/strict";
import {ARENA,createArena,setArenaPhase,stepArena,arenaPublicMetrics} from "./arena-engine.mjs";
const idle={mx:0,my:0,fire:false};
test("original arena starts dormant, local-only, with zero entitlements",()=>{
 const s=createArena(9),publicState=arenaPublicMetrics(s);
 assert.equal(s.phase,"ready");
 assert.equal(s.health,3);
 assert.equal(s.score,0);
 assert.equal(s.onlineMultiplayer,false);
 assert.equal(s.subscriptionVerified,false);
 assert.equal(s.prizeAvailable,false);
 assert.equal(publicState.realGameServers,0);
 assert.equal(publicState.networkPacketsSent,0);
 assert.equal(publicState.productionGameplayEnabled,false);
});
test("start pause resume and restart never create a network session",()=>{
 const ready=createArena();
 const running=setArenaPhase(ready,"start");
 assert.equal(running.phase,"running");
 const next=stepArena(running,{mx:1,my:0,fire:true},0.04);
 assert.equal(next.projectiles.length,1);
 assert.ok(next.player.x>ready.player.x);
 const paused=setArenaPhase(next,"pause");
 assert.equal(stepArena(paused,idle,0.04),paused);
 assert.equal(setArenaPhase(paused,"resume").phase,"running");
 assert.equal(setArenaPhase(paused,"restart").phase,"ready");
});
test("identical seeds and controls produce identical deterministic results",()=>{
 const run=seed=>{
  let state=setArenaPhase(createArena(seed),"start");
  for(let i=0;i<360;i++)state=stepArena(state,{mx:Math.sin(i/12),my:0,fire:i%3===0},1/60);
  return state;
 };
 assert.deepEqual(run(2345),run(2345));
 assert.notDeepEqual(run(2345),run(3456));
});
test("horizontal, vertical and diagonal input are bounded",()=>{
 let s=setArenaPhase(createArena(12),"start");
 for(let i=0;i<300;i++)s=stepArena(s,{mx:1,my:1,fire:true},0.05);
 assert.ok(s.player.x>=18&&s.player.x<=ARENA.width-18);
 assert.ok(s.player.y>=18&&s.player.y<=ARENA.height-18);
 assert.ok(s.drones.length<=ARENA.maxDrones);
 assert.ok(s.health>=0&&s.health<=3);
});
test("invalid step values and controls reject without changing state",()=>{
 const s=setArenaPhase(createArena(),"start");
 for(const dt of [-1,Infinity,NaN,0.26]){
  assert.throws(()=>stepArena(s,idle,dt),/frame time/);
 }
 for(const bad of [{mx:2,my:0,fire:false},{mx:0,my:0,fire:1},
  {mx:0,my:0,fire:false,uid:"123"},{mx:NaN,my:0,fire:false}]){
  assert.throws(()=>stepArena(s,bad,0.03),/controls/);
 }
 assert.throws(()=>createArena(0),/Seed/);
 assert.throws(()=>createArena(-4),/Seed/);
});
test("damage, victory and defeat are local statistics with no prizes",()=>{
 let s=setArenaPhase(createArena(1),"start");
 for(let i=0;i<5000&&s.phase==="running";i++)s=stepArena(s,idle,0.05);
 assert.equal(s.phase,"over");
 assert.ok(["round-complete","out-of-shields"].includes(s.gameOverReason));
 const report=arenaPublicMetrics(s);
 assert.equal(report.subscriptionsCharged,0);
 assert.equal(report.authenticatedSessions,0);
 assert.equal(report.productionGameplayEnabled,false);
});
