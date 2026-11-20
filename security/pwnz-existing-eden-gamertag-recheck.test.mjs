import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const script=read("social/social.js");
const page=read("social/index.html");
test("remembered sign-in checks Eden status even when backend is disabled",()=>{
 assert.match(script,/if\(user\)\{[\s\S]*?Promise\.all\(\[loadProfile\(\),checkEdenStatus\(\)/);
 assert.match(script,/if\(state\.backendReady\)\{await loadAgreement\(\);await refreshBadgeProgress\(\);\}/);
 assert.match(script,/backendReady:false,edenLookup:"unchecked"/);
});
test("paused backend does not claim user has no Eden RealID",()=>{
 assert.match(script,/PwnZ registration is paused/);
 assert.match(script,/Your sign-in is preserved/);
 assert.match(script,/state\.edenLookup="unavailable"/);
 assert.match(script,/state\.edenActive=false;state\.edenName="";state\.verifiedEden=false;state\.edenLookup="unavailable"/);
});
test("existing-account recovery is read-only and does not create an identity",()=>{
 assert.match(page,/id="identity-recovery"/);
 assert.match(page,/id="identity-recheck"/);
 assert.match(page,/Open Light of Hope profile/);
 assert.match(script,/refreshExistingEdenAccount/);
 const recovery=script.slice(script.indexOf("async function refreshExistingEdenAccount()"),script.indexOf('async function loadFollowing(){',script.indexOf("async function refreshExistingEdenAccount()")));
 assert.doesNotMatch(recovery,/createUserWithEmailAndPassword|reserve-activate|setDoc\(|runTransaction\(/);
});
test("gamertag write remains blocked until backend and Eden owner are verified",()=>{
 assert.match(script,/!state\.backendReady\|\|!state\.edenActive\)return/);
 assert.match(script,/\$\("handle-entry"\)\.hidden=!\(signed&&state\.backendReady&&state\.edenActive\)/);
 assert.match(script,/doc\(state\.db,"pwnzProfiles",state\.user\.uid\)/);
});
