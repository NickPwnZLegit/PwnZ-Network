import {createHash} from "node:crypto";

// PwnZ offline research policy only. No HTTP upload, transcoder, playable game,
// rights attestation, payment, login or public deployment is wired.
export const MEDIA_LAB_VERSION="pwnz-offline-media-arena-v1";
export const CAPABILITIES=Object.freeze({
  mediaUploadEnabled:false,liveStreamingEnabled:false,gameLaunchEnabled:false,
  gamePackageDistributionEnabled:false,tournamentsEnabled:false,
  subscriptionsEnabled:false,prizesEnabled:false,hiModerationAuthority:false,
  annealModerationAuthority:false,zkIdentityAuthority:false,
});
export const VIDEO_LIMIT_BYTES=45*1024*1024,VIDEO_LIMIT_SECONDS=30;
export const GAME_LIMIT_BYTES=64*1024*1024;
const TRUSTED_ORIGINS=Object.freeze(["self-contained-local-research-only"]);
const SHA=x=>createHash("sha256").update(x).digest("hex");
const VIDEO_EXT=Object.freeze({"video/mp4":".mp4","video/webm":".webm"});

function isPlainObject(x){return x!==null&&typeof x==="object"&&!Array.isArray(x)&&Object.getPrototypeOf(x)===Object.prototype;}
function keysExact(x,keys){return Object.keys(x).sort().join("|")===keys.slice().sort().join("|");}
function strictInt(x){return Number.isSafeInteger(x)&&x>=0;}
function denial(reason){return Object.freeze({accepted:false,reason,uploadAuthorized:false,publicVisible:false});}

// Browser metadata is only a research fixture. MIME/name/first bytes are not
// trusted proof of duration, codec, malware status, IP rights or content safety.
export function inspectVideoFixture({metadata,header}={}){
 if(!isPlainObject(metadata)||!keysExact(metadata,["name","mimeType","bytes","claimedDurationSeconds"])||
    !Buffer.isBuffer(header))
  return denial("invalid-synthetic-file");
 const {name,mimeType,bytes,claimedDurationSeconds}=metadata;
 if(typeof name!=="string"||!Object.hasOwn(VIDEO_EXT,mimeType)||
    name.length>100||!name.toLowerCase().endsWith(VIDEO_EXT[mimeType]))
  return denial("unsupported-video");
 if(!strictInt(bytes)||bytes<12||bytes>VIDEO_LIMIT_BYTES||header.length>4096||
    bytes<header.length)
  return denial("size-outside-cap");
 if(typeof claimedDurationSeconds!=="number"||!Number.isFinite(claimedDurationSeconds)||
    claimedDurationSeconds<=0||claimedDurationSeconds>VIDEO_LIMIT_SECONDS)
  return denial("untrusted-duration-outside-cap");
 const signature=mimeType==="video/mp4"?
   (header.length>=12&&header.toString("ascii",4,8)==="ftyp"):
   (header.length>=4&&header.subarray(0,4).equals(Buffer.from([0x1a,0x45,0xdf,0xa3])));
 if(!signature)return denial("magic-bytes-mismatch");
 const result={
   accepted:true,kind:"offline-video-candidate",mimeType,declaredBytes:bytes,
   claimedDurationSeconds,headerSha256:SHA(header),
   uploadAuthorized:false,publicVisible:false,transcoded:false,
   decodedDurationVerified:false,codecVerified:false,
   malwareChecked:false,contentReviewed:false,copyrightReviewed:false,
   userQuotaVerified:false,
 };
 return Object.freeze(result);
}

// Game assets are unsigned offline manifests, NOT playable arbitrary software.
// Only original / licensed work can later be reviewed. Text strings claiming
// rights are not verification; executable WebAssembly stays quarantined.
export function inspectGameFixture(manifest){
 if(!isPlainObject(manifest)||!keysExact(manifest,[
   "title","runtime","packageBytes","assetDigest","rightsBasis",
   "licensedForDistribution","hasNetworkPermission","synthetic"
 ]))return denial("invalid-game-manifest");
 const {title,runtime,packageBytes,assetDigest,rightsBasis,licensedForDistribution,hasNetworkPermission,synthetic}=manifest;
 if(synthetic!==true||typeof title!=="string"||!/^[a-zA-Z0-9 _-]{3,65}$/.test(title)||
    !["wasm","webgl"].includes(runtime)||!strictInt(packageBytes)||packageBytes<1||
    packageBytes>GAME_LIMIT_BYTES||typeof assetDigest!=="string"||
    !/^[a-f0-9]{64}$/.test(assetDigest)||!["original","licensed"].includes(rightsBasis)||
    licensedForDistribution!==true||hasNetworkPermission!==false)
  return denial("unverified-game-fixture");
 return Object.freeze({
  accepted:true,kind:"offline-game-manifest",
  title,runtime,packageBytes,assetDigest,rightsBasis,
  licensingIndependentlyVerified:false,thirdPartyRightsReviewed:false,
  originIsolationVerified:false,antiCheatVerified:false,
  accountEntitlementVerified:false,subscriberApproved:false,
  gameLaunchAuthorized:false,downloadAuthorized:false,tournamentAuthorized:false,
  hiOrAnnealMayAuthorize:false,zkProofMayAuthorize:false
 });
}
export function researchSecuritySummary(){
 return Object.freeze({
   version:MEDIA_LAB_VERSION,syntheticOnly:true,
   trustedOrigins:TRUSTED_ORIGINS,
   capabilities:CAPABILITIES,
   publishedVideos:0,liveStreamsStarted:0,gameSessionsStarted:0,
   realBiometricsAccessed:false,productionAccountAccessed:false,
   realWalletTransactions:0,
 });
}
