import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import handler from "../api/pwnz-config.js";
const root=new URL("../",import.meta.url);
const script=readFileSync(new URL("social/social.js",root),"utf8");
const html=readFileSync(new URL("social/index.html",root),"utf8");
const adapter=readFileSync(new URL("social/media-staging.mjs",root),"utf8");
function withEnv(values,fn){
 const prev=Object.fromEntries(Object.keys(values).map(k=>[k,process.env[k]]));
 try{for(const [k,v] of Object.entries(values))process.env[k]=v;return fn();}
 finally{for(const [k,v] of Object.entries(prev))if(v===undefined)delete process.env[k];else process.env[k]=v;}
}
const cfg={PWNZ_FIREBASE_API_KEY:"synthetic",PWNZ_FIREBASE_AUTH_DOMAIN:"example.invalid",
 PWNZ_FIREBASE_PROJECT_ID:"synthetic",PWNZ_FIREBASE_APP_ID:"synthetic",PWNZ_SOCIAL_BACKEND_ENABLED:"true",
 PWNZ_MEDIA_LAB_ENABLED:"true",PWNZ_MEDIA_INTAKE_ENABLED:"true",PWNZ_FIREBASE_STORAGE_BUCKET:"synthetic.example.invalid",
 FIREBASE_ADMIN_PROJECT_ID:"synthetic",FIREBASE_ADMIN_CLIENT_EMAIL:"synthetic@example.invalid",FIREBASE_ADMIN_PRIVATE_KEY:"fixture"};
function callConfig(){return handler({method:"GET"},{setHeader(){},status(code){this.code=code;return this;},json(value){return {code:this.code,body:value};}}).body;}
test("production never exposes stage controls even if flags are on",()=>withEnv({...cfg,VERCEL_ENV:"production"},()=>assert.equal(callConfig().mediaStagingEnabled,false)));
test("preview only reports staging when backend and secrets are present",()=>withEnv({...cfg,VERCEL_ENV:"preview"},()=>assert.equal(callConfig().mediaStagingEnabled,true)));
test("missing admin keys blocks staging",()=>withEnv({...cfg,VERCEL_ENV:"preview",FIREBASE_ADMIN_PRIVATE_KEY:""},()=>assert.equal(callConfig().mediaStagingEnabled,false)));
test("missing social backend blocks staging",()=>withEnv({...cfg,VERCEL_ENV:"preview",PWNZ_SOCIAL_BACKEND_ENABLED:"false"},()=>assert.equal(callConfig().mediaStagingEnabled,false)));
test("preview lab defaults hidden",()=>assert.match(html,/id="media-lab" hidden/));
test("personal upload input defaults hidden",()=>assert.match(html,/id="post-file-label" hidden/));
test("preflight checks actual file metadata",()=>assert.match(script,/checkPwnzMedia\(file,/));
test("preflight checks video duration",()=>assert.match(script,/validPwnzClipDuration\(seconds\)/));
test("preflight and intake require signed-in member and agreement",()=>assert.match(script,/!state\.user\|\|!state\.profile\|\|!state\.agreementCurrent/));
test("client gets server-issued media reservation",()=>assert.match(adapter,/action:"reserve"/));
test("client gets server-verified review receipt",()=>assert.match(adapter,/action:"complete"/));
test("client does not issue downloadable media URL",()=>assert.ok(!adapter.includes("getDownloadURL")));
