import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const social=readFileSync(new URL("../social/social.js",import.meta.url),"utf8");
const config=readFileSync(new URL("../api/pwnz-config.js",import.meta.url),"utf8");
test("PwnZ checks the signed-in Eden agreement on restore and every thirty seconds",()=>{
 assert.match(social,/const EDEN_AGREEMENT_VERSIONS=new Set/);
 assert.match(social,/state\.edenAgreementExpiryMs=expiry instanceof Date\?expiry\.getTime\(\):0/);
 assert.match(social,/window\.setInterval\(\(\)=>\{/);
 assert.match(social,/Date\.now\(\)>=state\.edenAgreementExpiryMs/);
 assert.match(social,/state\.agreementCurrent=false;state\.verifiedEden=false;state\.edenAgreementExpired=true/);
 assert.match(social,/signOut\(state\.auth\)/);
});
test("Gamertag, applications and social writes retain independent gates",()=>{
 assert.match(config,/PWNZ_GAMERTAG_REGISTRATION_ENABLED/);
 assert.match(config,/PWNZ_SOCIAL_BACKEND_ENABLED/);
 assert.match(config,/PWNZ_APPLICATIONS_ENABLED/);
 assert.match(social,/state\.gamertagRegistrationReady&&state\.edenActive/);
 assert.match(social,/state\.applicationsReady&&state\.edenActive&&state\.agreementCurrent/);
 assert.match(social,/state\.backendReady&&state\.profile&&state\.agreementCurrent/);
});
