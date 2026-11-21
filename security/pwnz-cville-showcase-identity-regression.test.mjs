import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const js=read("social/social.js"),html=read("social/index.html");
test("registered Eden owner requires active or grandfathered status and matching UID",()=>{
 assert.match(js,/owner\.uid===uid\s*&&\["active","grandfathered"\]\.includes\(owner\.status\)/);
 assert.match(js,/owner\.status==="grandfathered"&&owner\.reservationType==="legacy-profile-migration"/);
 assert.match(js,/state\.edenActive=active/);
});
test("current and transitional 30-day Eden agreements accepted by client",()=>{
 assert.match(js,/EDEN_AGREEMENT_VERSIONS=new Set\(\[AGREEMENT.version,'ecosystem-2026\.11\.18\.1'\]\)/);
 assert.match(js,/import \{AGREEMENT,getAgreementExpiryDate\} from ".\/hope-community-agreement.mjs"/);
 assert.match(js,/EDEN_AGREEMENT_VERSIONS\.has\(agreement\.agreementVersion\)/);
 assert.match(js,/expiry instanceof Date&&expiry\.getTime\(\)>Date\.now\(\)/);
});
test("new member card opens dual-name signup, existing path stays sign in",()=>{
 assert.match(js,/if\(x\.dataset\.authMode==="pwnz"\)state\.authAction="register"/);
 assert.match(js,/chooseAuthMode\("eden"\)/);
 assert.match(html,/id="eden-realid"/);
 assert.match(html,/id="new-pwnz-gamertag"/);
 assert.match(js,/if\(creating&&!\$\("no-existing-eden"\)\.checked\)throw/);
});
test("social publishing and creator application UI remain gated while Gamertag enrollment is separate",()=>{
 assert.match(js,/\$\("compose"\)\.hidden=!\(signed&&state\.backendReady&&state\.profile&&state\.agreementCurrent\)/);
 assert.match(js,/\$\("role-application"\)\.hidden=!\(signed&&state\.applicationsReady&&state\.edenActive&&state\.agreementCurrent\)/);
 assert.match(js,/\$\("handle-entry"\)\.hidden=!\(signed&&state\.gamertagRegistrationReady&&state\.edenActive\)/);
 assert.match(js,/!state\.user\|\|!state\.db\|\|state\.profile\|\|!state\.gamertagRegistrationReady\|\|!state\.edenActive/);
});
