// PwnZ original research mini-game: "Orbit Shield".
// Canvas uses only locally drawn geometry, no copied game assets or ROMs.
// Stateless math and seeded pseudo-random fixtures, no login or payment hooks.
export const ARENA=Object.freeze({
  width:900,height:520,playerSpeed:235,projectileSpeed:490,
  maxDrones:24,roundSeconds:60,maxStep:0.05,
});
const MAX_SEED=0xffffffff;
const finite=n=>typeof n==="number"&&Number.isFinite(n);
const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
function rngNext(n){let x=n>>>0;x^=(x<<13);x^=x>>>17;x^=(x<<5);return x>>>0;}
function distance2(a,b){return (a.x-b.x)**2+(a.y-b.y)**2;}
export function createArena(seed=20261121){
 if(!Number.isSafeInteger(seed)||seed<1||seed>MAX_SEED)throw new TypeError("Seed must be a nonzero uint32.");
 return {
  version:"orbit-shield-original-research-v1",phase:"ready",seed,rng:seed,
  elapsed:0,score:0,health:3,kills:0,sequence:0,
  player:{x:ARENA.width/2,y:ARENA.height-65,r:16},
  projectiles:[],drones:[],fireCooldown:0,spawnClock:0.8,
  gameOverReason:null,realNetworkSessions:0,
  subscriptionVerified:false,prizeAvailable:false,onlineMultiplayer:false,
 };
}
export function setArenaPhase(state,operation){
 if(!state||!["start","pause","resume","restart"].includes(operation))
  throw new TypeError("Invalid arena state operation.");
 if(operation==="restart")return createArena(state.seed);
 const expected={start:"ready",pause:"running",resume:"paused"};
 if(state.phase!==expected[operation])return state;
 return {...state,phase:operation==="pause"?"paused":"running"};
}
function readInput(controls){
 if(!controls||typeof controls!=="object"||Array.isArray(controls)||
    Object.keys(controls).sort().join(",")!=="fire,mx,my"||
    !finite(controls.mx)||!finite(controls.my)||
    Math.abs(controls.mx)>1||Math.abs(controls.my)>1||
    typeof controls.fire!=="boolean")throw new TypeError("Invalid local arena controls.");
 return controls;
}
export function stepArena(state,controls,dt){
 const input=readInput(controls);
 if(!finite(dt)||dt<0||dt>0.25)throw new TypeError("Invalid frame time.");
 if(state?.phase!=="running"||dt===0)return state;
 const d=Math.min(dt,ARENA.maxStep);
 const norm=Math.max(1,Math.hypot(input.mx,input.my));
 let player={
  ...state.player,
  x:clamp(state.player.x+input.mx/norm*ARENA.playerSpeed*d,18,ARENA.width-18),
  y:clamp(state.player.y+input.my/norm*ARENA.playerSpeed*d,18,ARENA.height-18),
 };
 let shots=state.projectiles.map(s=>({...s,y:s.y-ARENA.projectileSpeed*d}))
  .filter(s=>s.y>-30);
 let drones=state.drones.map(e=>({...e,
   x:clamp(e.x+(player.x-e.x)*0.12*d,12,ARENA.width-12),
   y:e.y+e.speed*d
 }));
 let cooldown=Math.max(0,state.fireCooldown-d),sequence=state.sequence;
 if(input.fire&&cooldown<=0){shots.push({id:++sequence,x:player.x,y:player.y-25,r:5});
   cooldown=0.19;
 }
 let spawn=state.spawnClock-d,rng=state.rng;
 if(spawn<=0&&drones.length<ARENA.maxDrones){
  rng=rngNext(rng);
  const x=24+(rng/4294967296)*(ARENA.width-48);
  rng=rngNext(rng);
  const speed=60+(rng/4294967296)*48;
  drones.push({id:++sequence,x,y:-25,r:15,speed});
  spawn+=0.68;
 }
 let score=state.score,kills=state.kills,health=state.health;
 const hitShots=new Set(),hitDrones=new Set();
 for(const enemy of drones){
  for(const shot of shots){
   if(hitShots.has(shot.id))continue;
   if(distance2(shot,enemy)<=(shot.r+enemy.r)**2){
    hitShots.add(shot.id);hitDrones.add(enemy.id);
    score+=100;kills++;break;
   }
  }
  if(hitDrones.has(enemy.id))continue;
  if(distance2(player,enemy)<=(player.r+enemy.r)**2||enemy.y>ARENA.height+enemy.r){
   hitDrones.add(enemy.id);health=Math.max(0,health-1);
  }
 }
 shots=shots.filter(s=>!hitShots.has(s.id));
 drones=drones.filter(e=>!hitDrones.has(e.id));
 const elapsed=state.elapsed+d;
 const reason=health<=0?"out-of-shields":elapsed>=ARENA.roundSeconds?"round-complete":null;
 return {...state,player,projectiles:shots,drones,rng,sequence,fireCooldown:cooldown,
   spawnClock:spawn,elapsed:Math.min(elapsed,ARENA.roundSeconds),
   score,kills,health,phase:reason?"over":"running",gameOverReason:reason};
}
export function arenaPublicMetrics(state){
 return Object.freeze({
  schema:"pwnz-original-arena-metrics-v1",syntheticOnly:true,
  elapsedSeconds:Number(state.elapsed.toFixed(4)),points:state.score,
  simulatedEnemiesDefeated:state.kills,remainingShields:state.health,
  activeEnemies:state.drones.length,activeProjectiles:state.projectiles.length,
  networkPacketsSent:0,realGameServers:0,authenticatedSessions:0,
  productionGameplayEnabled:false,subscriptionsCharged:0,
  performanceMeasuredOnPhysicalDevices:false,
 });
}
