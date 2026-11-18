import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const root=new URL("../",import.meta.url);
const read=p=>readFileSync(new URL(p,root),"utf8");
const html=read("social/index.html"),js=read("social/social.js"),rules=read("security/pwnz-social.rules"),
 gateway=read("api/pwnz-eden-registry.js");
test("new PwnZ signup requests an Eden name",()=>assert.match(html,/id="eden-name"/));
test("interrupted enrollment can resume using signed-in account",()=>assert.match(html,/id="eden-completion"/));
test("new membership requires preview registrar",()=>assert.match(js,/if\(creating&&!state\.registryReady\)/));
test("new accounts create Firebase UID before registrar request",()=>{
 const start=js.indexOf("if(creating){",js.indexOf('$(\"login-form\").addEventListener'));
 const end=js.indexOf("}else{",start);
 const segment=js.slice(start,end);
 assert.ok(segment.indexOf("await createUserWithEmailAndPassword")<segment.indexOf('sharedEdenRequest({action:"check"'));
});
test("same primary Eden registrar activates identity",()=>assert.match(js,/sharedEdenRequest\(\{action:"reserve-activate",requestedName:name\}/));
test("new gamer name requires verified Eden and current agreement",()=>assert.match(js,/state\.profile\|\|!state\.backendReady\|\|!state\.verifiedEden/));
test("direct PwnZ name enrollment demands current Eden agreement",()=>assert.match(rules,/function pwnzIdentityEnrollment\(\)\s*\{\s*return edenAgreementCurrent\(\);/));
test("gamer profile uses reserved handle transaction",()=>{assert.match(js,/await runTransaction\(state\.db/);assert.match(js,/pwnzHandles/);assert.match(js,/pwnzProfiles/);});
test("existing PwnZ accounts are not deleted",()=>assert.ok(!js.includes("deleteUser(")));
test("proxy checks same Firebase project and is preview-only",()=>{assert.match(gateway,/VERCEL_ENV==="preview"/);assert.match(gateway,/PWNZ_FIREBASE_PROJECT_ID===env\.EDEN_SHARED_FIREBASE_PROJECT_ID/);});
test("proxy does not set or import a distinct Firestore owner registry",()=>assert.ok(!gateway.includes("edenRealIdRegistry/")));
test("future NFT minting is not enacted in login",()=>assert.ok(!js.includes("mintNFT(")));
