import {performance} from "node:perf_hooks";
import {createArena,setArenaPhase,stepArena,arenaPublicMetrics} from "./arena-engine.mjs";
// Deterministic Node CPU microbenchmark. Not a device FPS or browser measurement.
const steps=10000;
let state=setArenaPhase(createArena(20261121),"start");
const started=performance.now();
for(let i=0;i<steps;i++){
 if(state.phase==="over")state=setArenaPhase(createArena(20261121+i),"start");
 state=stepArena(state,{mx:Math.sin(i/23),my:Math.cos(i/19),fire:(i%3)===0},1/60);
}
const elapsedMs=performance.now()-started;
const report={
 schema:"pwnz-orbit-shield-node-microbenchmark-v1",
 researchOnly:true,platform:"GitHub Actions Node 22 CPU (not actual browser)",
 steps,elapsedMs:Number(elapsedMs.toFixed(3)),
 averageStepMilliseconds:Number((elapsedMs/steps).toFixed(6)),
 realDeviceFPS:null,
 networkLatencyMs:null,
 multiplayerAvailable:false,
 noGameAssetsTransferred:true,
 state:arenaPublicMetrics(state)
};
console.log(JSON.stringify(report,null,2));
