import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const js=read("social/social.js"),html=read("social/index.html");
test("existing account is default and new registration is explicitly distinct",()=>{
 assert.match(js,/chooseAuthMode\("eden"\)/);
 assert.match(html,/I already have an Eden RealID/);
 assert.match(html,/I am completely new to Light of Hope/);
 assert.match(html,/Do NOT create a second Eden account/);
 assert.match(html,/id="no-existing-eden"/);
 assert.match(js,/if\(creating&&!\$\("no-existing-eden"\)\.checked\)throw/);
 assert.match(js,/\$\("new-account-warning"\)\.hidden=/);
});
test("default displayed name comes from the authenticated Eden owner lock and not email",()=>{
 assert.match(js,/getDoc\(doc\(state\.db,"edenRealIdOwners",uid\)\)/);
 assert.match(js,/state\.edenName=active&&typeof owner\.displayName==="string"/);
 assert.match(js,/state\.displayIdentity=user\?readChoice\(user\.uid\):"eden"/);
 assert.match(js,/return state\.displayIdentity==="pwnz"&&gamer\?gamer/);
 assert.match(js,/\$\("signed-name"\)\.textContent=publicDisplayName\(\)/);
});
test("gamertag display preference is optional, local and bound to signed-in UID",()=>{
 assert.match(html,/id="identity-display-settings"/);
 assert.match(html,/id="display-choice"/);
 assert.match(html,/value="eden">Eden RealID \(default\)/);
 assert.match(html,/value="pwnz" id="display-pwnz"/);
 assert.match(js,/localStorage\.setItem\(preferenceKey\(uid\),v\)/);
 assert.match(js,/\$\("display-pwnz"\)\.disabled=!validGamertag/);
 assert.match(js,/if\(!state\.user\|\|!state\.edenActive\)return/);
 assert.match(js,/\$\("identity-display-settings"\)\.hidden=!\(signed&&state\.edenActive\)/);
});
test("display choice never bypasses the backend or Eden owner enrollment gates",()=>{
 assert.match(js,/!state\.user\|\|!state\.db\|\|state\.profile\|\|!state\.gamertagRegistrationReady\|\|!state\.edenActive/);
 assert.match(js,/\$\("handle-entry"\)\.hidden=!\(signed&&state\.gamertagRegistrationReady&&state\.edenActive\)/);
});
