import test from "node:test";
import assert from "node:assert/strict";
import {inspectVideoFixture,inspectGameFixture,researchSecuritySummary,CAPABILITIES,VIDEO_LIMIT_BYTES,GAME_LIMIT_BYTES} from "./media_arena_lab.mjs";
const mp4=Buffer.from("000000186674797069736f6d00000000","hex");
const webm=Buffer.from([0x1a,0x45,0xdf,0xa3,0x42,0x86,0x81,0x01,0x42,0xf7,0x81,0x01]);
const video={name:"synthetic.mp4",mimeType:"video/mp4",bytes:2048,claimedDurationSeconds:20};
const game={title:"Original Arena",runtime:"wasm",packageBytes:1024,assetDigest:"a".repeat(64),rightsBasis:"original",licensedForDistribution:true,hasNetworkPermission:false,synthetic:true};
test("MP4 and WebM valid synthetic header candidates never authorize uploads",()=>{
 for(const [metadata,header] of [[video,mp4],[{...video,name:"synthetic.webm",mimeType:"video/webm"},webm]]){
  const r=inspectVideoFixture({metadata,header});
  assert.equal(r.accepted,true);assert.equal(r.uploadAuthorized,false);
  assert.equal(r.publicVisible,false);assert.equal(r.transcoded,false);
  assert.equal(r.decodedDurationVerified,false);assert.equal(r.codecVerified,false);
  assert.equal(r.malwareChecked,false);assert.equal(r.contentReviewed,false);
  assert.equal(r.copyrightReviewed,false);assert.equal(r.userQuotaVerified,false);
  assert.match(r.headerSha256,/^[a-f0-9]{64}$/);
 }
});
test("spoofed formats and caps fail closed",()=>{
 for(const input of [
 {metadata:{...video,name:"file.exe"},header:mp4},
 {metadata:{...video,mimeType:"application/octet-stream"},header:mp4},
 {metadata:video,header:Buffer.from("not-an-mp4-file")},
 {metadata:{...video,claimedDurationSeconds:31},header:mp4},
 {metadata:{...video,claimedDurationSeconds:NaN},header:mp4},
 {metadata:{...video,bytes:VIDEO_LIMIT_BYTES+1},header:mp4},
 {metadata:{...video,uid:"account-id"},header:mp4},
 {metadata:{...video,bytes:12},header:mp4},
 {metadata:video,header:"invalid"},
 ]){
  const r=inspectVideoFixture(input);assert.equal(r.accepted,false);
  assert.equal(r.uploadAuthorized,false);
 }
});
test("game manifest accepts original/claimed-licensed sandbox candidate only",()=>{
 const r=inspectGameFixture(game);
 assert.equal(r.accepted,true);assert.equal(r.runtime,"wasm");
 assert.equal(r.gameLaunchAuthorized,false);
 assert.equal(r.downloadAuthorized,false);
 assert.equal(r.licensingIndependentlyVerified,false);
 assert.equal(r.originIsolationVerified,false);
 assert.equal(r.accountEntitlementVerified,false);
 assert.equal(r.tournamentAuthorized,false);
 assert.equal(r.hiOrAnnealMayAuthorize,false);
});
test("unlicensed/restricted executables, network permissions and excess size denied",()=>{
 for(const candidate of [
 {...game,rightsBasis:"unknown"},
 {...game,licensedForDistribution:false},
 {...game,hasNetworkPermission:true},
 {...game,runtime:"native-exe"},
 {...game,packageBytes:GAME_LIMIT_BYTES+1},
 {...game,assetDigest:"fake"},
 {...game,synthetic:false},
 {...game,code:"base64"},
 {...game,title:"../../untrusted"},
 ])assert.equal(inspectGameFixture(candidate).accepted,false);
});
test("no live capability is enabled by synthetic fixtures",()=>{
 const summary=researchSecuritySummary();
 for(const enabled of Object.values(CAPABILITIES))assert.equal(enabled,false);
 assert.equal(summary.gameSessionsStarted,0);
 assert.equal(summary.liveStreamsStarted,0);
 assert.equal(summary.publishedVideos,0);
 assert.equal(summary.productionAccountAccessed,false);
 assert.equal(summary.realBiometricsAccessed,false);
 assert.equal(summary.realWalletTransactions,0);
});
