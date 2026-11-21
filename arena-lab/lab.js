import {ARENA,createArena,setArenaPhase,stepArena,arenaPublicMetrics} from "../research/hope-labs/media-arena-v2/arena-engine.mjs";
import {checkLocalMetadata,checkDecodedMetadata,estimateUncompressedRGBAFrameBytes} from "../research/hope-labs/media-arena-v2/local-media-preview.mjs";
const $=id=>document.getElementById(id);
const board=$("arena"),ctx=board.getContext("2d",{alpha:false});
let state=createArena(),frameId=null,lastFrame=null,frames=0,clock=0,runId=0;
const pressed=new Set();
const direction={ArrowUp:"up",ArrowDown:"down",ArrowLeft:"left",ArrowRight:"right",
 KeyW:"up",KeyS:"down",KeyA:"left",KeyD:"right",Space:"fire"};
const active=()=>state.phase==="running";
function visual(){
 ctx.fillStyle="#061226";ctx.fillRect(0,0,ARENA.width,ARENA.height);
 ctx.strokeStyle="#173c5d";ctx.lineWidth=1;
 for(let i=30;i<ARENA.width;i+=45){ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i,ARENA.height);ctx.stroke();}
 for(let i=30;i<ARENA.height;i+=45){ctx.beginPath();ctx.moveTo(0,i);ctx.lineTo(ARENA.width,i);ctx.stroke();}
 const p=state.player;
 ctx.fillStyle="#57b9ff";ctx.beginPath();ctx.moveTo(p.x,p.y-21);ctx.lineTo(p.x-17,p.y+17);ctx.lineTo(p.x+17,p.y+17);ctx.closePath();ctx.fill();
 ctx.fillStyle="#80ffd8";for(const bullet of state.projectiles){ctx.beginPath();ctx.arc(bullet.x,bullet.y,bullet.r,0,Math.PI*2);ctx.fill();}
 ctx.fillStyle="#fb74d1";for(const drone of state.drones){ctx.beginPath();ctx.arc(drone.x,drone.y,drone.r,0,Math.PI*2);ctx.fill();}
 if(state.phase!=="running"){
  ctx.fillStyle="#031127bf";ctx.fillRect(0,0,ARENA.width,ARENA.height);
  ctx.fillStyle="#f2f8ff";ctx.textAlign="center";ctx.font="bold 38px system-ui";
  ctx.fillText(state.phase==="ready"?"ORBIT SHIELD":state.phase==="paused"?"PAUSED":state.gameOverReason==="round-complete"?"ROUND COMPLETE":"SHIELDS DOWN",ARENA.width/2,ARENA.height/2);
  ctx.font="18px system-ui";ctx.fillText("Offline original prototype • no membership or prizes",ARENA.width/2,ARENA.height/2+40);
 }
 $("health").textContent=String(state.health);
 $("score").textContent=String(state.score);
 $("time").textContent=(ARENA.roundSeconds-state.elapsed).toFixed(1);
 $("start").disabled=state.phase!=="ready";
 $("pause").disabled=state.phase!=="running"&&state.phase!=="paused";
 $("pause").textContent=state.phase==="paused"?"Resume":"Pause";
}
function tick(now){
 if(!active()){frameId=null;lastFrame=null;visual();return;}
 const dt=lastFrame===null?0:Math.min((now-lastFrame)/1000,0.05);lastFrame=now;
 let mx=Number(pressed.has("right"))-Number(pressed.has("left"));
 let my=Number(pressed.has("down"))-Number(pressed.has("up"));
 const controls={mx,my,fire:pressed.has("fire")};
 state=stepArena(state,controls,dt);
 frames++;clock+=dt;
 if(clock>=0.8){$("fps").textContent=String(Math.round(frames/clock));frames=0;clock=0;}
 if(state.phase==="over"){
   $("game-status").textContent=state.gameOverReason==="round-complete"?"Round complete. Score: "+state.score:"Shields depleted. Score: "+state.score;
 }
 visual();
 frameId=active()?requestAnimationFrame(tick):null;
}
function loop(){if(frameId===null&&active()){lastFrame=null;frameId=requestAnimationFrame(tick);}}
$("start").addEventListener("click",()=>{
 state=setArenaPhase(state,"start");$("game-status").textContent="Round running. Avoid drones and shoot.";visual();loop();
});
$("pause").addEventListener("click",()=>{
 state=setArenaPhase(state,state.phase==="paused"?"resume":"pause");
 $("game-status").textContent=state.phase==="paused"?"Round paused.":"Round running.";visual();loop();
});
$("reset").addEventListener("click",()=>{
 state=setArenaPhase(state,"restart");pressed.clear();
 if(frameId!==null){cancelAnimationFrame(frameId);frameId=null;}
 lastFrame=null;frames=0;clock=0;
 $("fps").textContent="0";$("game-status").textContent="Ready. Press Start round to play.";visual();
});
window.addEventListener("keydown",e=>{const action=direction[e.code];
 if(action){pressed.add(action);if(e.code==="Space"||e.code.startsWith("Arrow"))e.preventDefault();}
});
window.addEventListener("keyup",e=>{const action=direction[e.code];if(action)pressed.delete(action);});
window.addEventListener("blur",()=>pressed.clear());
for(const name of ["up","down","left","right","fire"]){
 const control=$(name);
 const stop=e=>{e.preventDefault();pressed.delete(name);try{control.releasePointerCapture(e.pointerId);}catch{}};
 control.addEventListener("pointerdown",e=>{e.preventDefault();pressed.add(name);control.setPointerCapture(e.pointerId);});
 for(const event of ["pointerup","pointercancel","lostpointercapture"])control.addEventListener(event,stop);
}
visual();

const chooser=$("clip"),video=$("video"),frame=$("frame"),poster=$("poster"),panel=$("clip-preview");
let objectUrl=null,accepted=null,loadGeneration=0;
const status=x=>$("clip-status").textContent=x;
function clearClip(){
 loadGeneration++;video.pause();
 video.removeAttribute("src");video.load();
 if(objectUrl){URL.revokeObjectURL(objectUrl);objectUrl=null;}
 accepted=null;panel.hidden=true;frame.hidden=true;
 frame.getContext("2d").clearRect(0,0,frame.width,frame.height);
 $("file-metrics").textContent="";poster.disabled=true;
}
$("clear").addEventListener("click",()=>{clearClip();chooser.value="";status("Preview cleared. No file was uploaded.");});
chooser.addEventListener("change",async()=>{
 clearClip();const file=chooser.files?.[0];
 if(!file){status("No local file selected.");return;}
 const initial=checkLocalMetadata(file);
 if(!initial.ok){status(initial.reason);chooser.value="";return;}
 const generation=loadGeneration;
 try{
  const header=Bufferless(new Uint8Array(await file.slice(0,16).arrayBuffer()));
  if(generation!==loadGeneration)return;
  if(!signature(file.type,header)){status("Container header does not match MP4/WebM.");chooser.value="";return;}
  objectUrl=URL.createObjectURL(file);
  video.src=objectUrl;
  panel.hidden=false;
  poster.disabled=true;
  status("Inspecting local video metadata. No upload in progress.");
 }catch{status("Browser could not read this local file.");clearClip();}
});
function Bufferless(bytes){return bytes;}
function signature(type,bytes){
 if(type==="video/mp4")return bytes.length>=12&&bytes[4]===102&&bytes[5]===116&&bytes[6]===121&&bytes[7]===112;
 if(type==="video/webm")return bytes.length>=4&&bytes[0]===26&&bytes[1]===69&&bytes[2]===223&&bytes[3]===163;
 return false;
}
video.addEventListener("loadedmetadata",()=>{
 const result=checkDecodedMetadata({duration:video.duration,videoWidth:video.videoWidth,videoHeight:video.videoHeight});
 if(!result.ok){status(result.reason+" Please choose a shorter, valid clip.");clearClip();chooser.value="";return;}
 accepted=result;
 status("Local metadata accepted: "+result.durationSeconds+" s, "+result.width+" × "+result.height+". Playback is browser-local.");
 $("file-metrics").textContent="Estimated decoded RGBA frame: "+(estimateUncompressedRGBAFrameBytes(result.width,result.height)/1024/1024).toFixed(2)+" MiB. Preview only. Codec support depends on your browser. No transcoding or screening performed.";
 poster.disabled=false;
});
video.addEventListener("error",()=>{status("This browser cannot decode the selected clip.");clearClip();});
poster.addEventListener("click",()=>{
 if(!accepted||video.readyState<2){status("Play or seek to a decoded frame first.");return;}
 try{
  const aspect=accepted.width/accepted.height;
  frame.width=320;frame.height=Math.max(1,Math.round(320/aspect));
  frame.getContext("2d").drawImage(video,0,0,frame.width,frame.height);
  frame.hidden=false;status("Frame captured locally in browser memory. Nothing was uploaded or saved.");
 }catch{status("Frame capture unavailable in this browser.");}
});
window.addEventListener("pagehide",clearClip);
