import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = path => readFileSync(new URL("../"+path,import.meta.url),"utf8");
const social = read("social/social.js");
const page = read("social/index.html");
test("signed-in account hides all new-account path controls without hiding sign-out",()=>{
 assert.match(page,/id="account-choices"/);
 assert.match(social,/\$\("account-choices"\)\.hidden=signed/);
 assert.match(social,/\$\("pwnz-account-actions"\)\.hidden=signed\|\|state\.authMode==="eden"/);
 assert.match(social,/\$\("auth-help"\)\.hidden=signed/);
 assert.match(social,/\$\("signed-in"\)\.hidden=!signed/);
});
test("recognized Eden identity and gated PwnZ registration show separate results",()=>{
 assert.match(social,/state\.edenActive&&!state\.backendReady/);
 assert.match(social,/Existing Eden RealID recognized for this account/);
 assert.match(social,/Gamertag creation is still paused because the social backend is disabled/);
 assert.match(social,/state\.edenLookup==="unavailable"/);
});
test("no new account, gamertag or wallet privileges granted by UI correction",()=>{
 assert.match(social,/!state\.user\|\|!state\.db\|\|state\.profile\|\|!state\.backendReady\|\|!state\.edenActive\)return/);
 assert.match(social,/\$\("handle-entry"\)\.hidden=!\(signed&&state\.backendReady&&state\.edenActive\)/);
 assert.match(social,/getDoc\(doc\(state\.db,"edenRealIdOwners",uid\)\)/);
});
