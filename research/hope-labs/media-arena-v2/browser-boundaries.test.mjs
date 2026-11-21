import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const page=readFileSync(new URL("../../../arena-lab/index.html",import.meta.url),"utf8");
const script=readFileSync(new URL("../../../arena-lab/lab.js",import.meta.url),"utf8");
test("research playground is isolated from production Arena gameplay and payments",()=>{
 assert.match(page,/<title>PwnZ Hope Labs \| Orbit Shield \+ Local Clip Lab<\/title>/);
 assert.match(page,/script type="module" src="\.\/lab\.js"/);
 assert.match(page,/content="default-src 'none';/);
 assert.match(page,/connect-src 'none'/);
 assert.match(page,/media-src blob:/);
 assert.match(page,/No accounts, network gameplay, uploading, tracking/);
 assert.doesNotMatch(script,/fetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|localStorage|sessionStorage|Firebase|eth_sendTransaction/);
});
test("video blob lifecycle always revokes URL and never sends a file",()=>{
 assert.match(script,/URL\.createObjectURL\(file\)/);
 assert.match(script,/URL\.revokeObjectURL\(objectUrl\)/);
 assert.match(script,/file\.slice\(0,16\)\.arrayBuffer\(\)/);
 assert.match(script,/loadedmetadata/);
 assert.match(script,/checkDecodedMetadata/);
 assert.match(script,/pagehide/);
 assert.doesNotMatch(script,/FileReader|Blob\.stream|FormData|uploadBytes|putObject/);
});
test("original game UI supports restart, pause, keyboard and pointer controls",()=>{
 assert.match(page,/canvas id="arena"/);
 assert.match(page,/id="fire"/);
 assert.match(page,/id="pause"/);
 assert.match(script,/stepArena\(state,controls,dt\)/);
 assert.match(script,/keydown/);
 assert.match(script,/pointerdown/);
 assert.match(script,/cancelAnimationFrame/);
 assert.doesNotMatch(script,/requestFullscreen|document\.cookie/);
});
