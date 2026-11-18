import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import handler from "../api/pwnz-config.js";
const root=new URL("../",import.meta.url);
const script=readFileSync(new URL("social/social.js",root),"utf8");
const html=readFileSync(new URL("social/index.html",root),"utf8");

function withEnv(values,fn){
 const prev=Object.fromEntries(Object.keys(values).map(k=>[k,process.env[k]]));
 try{for(const [k,v] of Object.entries(values))process.env[k]=v;return fn();}
 finally{for(const [k,v] of Object.entries(prev))if(v===undefined)delete process.env[k];else process.env[k]=v;}
}
const configs={PWNZ_FIREBASE_API_KEY:"synthetic-demo-key",PWNZ_FIREBASE_AUTH_DOMAIN:"example.invalid",PWNZ_FIREBASE_PROJECT_ID:"synthetic-project",PWNZ_FIREBASE_APP_ID:"synthetic-app",PWNZ_SOCIAL_BACKEND_ENABLED:"true",PWNZ_MEDIA_LAB_ENABLED:"true"};
function callConfig(){return handler({method:"GET"},{setHeader(){},status(code){this.code=code;return this;},json(value){return {code:this.code,body:value};}}).body;}
test("media lab never available in production even if accidentally enabled",()=>withEnv({...configs,VERCEL_ENV:"production"},()=>assert.equal(callConfig().mediaLabEnabled,false)));
test("media lab only available in preview with explicit flag and backend",()=>withEnv({...configs,VERCEL_ENV:"preview"},()=>assert.equal(callConfig().mediaLabEnabled,true)));
test("missing backend blocks media lab",()=>withEnv({...configs,VERCEL_ENV:"preview",PWNZ_SOCIAL_BACKEND_ENABLED:"false"},()=>assert.equal(callConfig().mediaLabEnabled,false)));
test("missing preview flag blocks lab",()=>withEnv({...configs,VERCEL_ENV:"preview",PWNZ_MEDIA_LAB_ENABLED:"false"},()=>assert.equal(callConfig().mediaLabEnabled,false)));
test("preview panel defaults hidden",()=>assert.match(html,/id="media-lab" hidden/));
test("new media input is local-only",()=>assert.match(html,/No file upload/));
test("preflight validates actual selected file",()=>assert.match(script,/checkPwnzMedia\(file,/));
test("preflight reads video duration",()=>assert.match(script,/validPwnzClipDuration\(seconds\)/));
test("preflight is never allowed without signed-in user and agreement",()=>assert.match(script,/!state\.user\|\|!state\.profile\|\|!state\.agreementCurrent/));
test("preflight makes no uploads or media write calls",()=>assert.ok(!script.includes("uploadBytes")&&!script.includes("getDownloadURL")));
