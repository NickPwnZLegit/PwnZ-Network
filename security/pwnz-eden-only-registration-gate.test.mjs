import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const script=read("social/social.js"),html=read("social/index.html"),api=read("api/pwnz-config.js");
test("new PwnZ member provides both names before Firebase account creation",()=>{
 assert.match(html,/id="eden-realid"/);
 assert.match(html,/id="new-pwnz-gamertag"/);
 assert.match(script,/requestedGamerTag=creating\?\$\("new-pwnz-gamertag"\)/);
 assert.match(script,/if\(creating&&!handlePattern\.test\(requestedGamerTag\)\)throw/);
 assert.ok(script.indexOf("if(creating&&!handlePattern.test(requestedGamerTag))")<script.indexOf("credential=await createUserWithEmailAndPassword"));
 assert.match(script,/await reservePairedIdentity\(requestedEdenRealId,requestedGamerTag\)/);
 assert.match(html,/id="paired-status" role="status"/);
});
test("existing Eden members create Gamertag under same signed-in UID",()=>{
 assert.match(script,/const uid=state\.user\.uid,handle=/);
 assert.match(script,/tx\.set\(profile,\{uid,handle,handleKey:key/);
 assert.match(script,/tx\.set\(publicProfile,\{uid,handle/);
 assert.match(script,/tx\.set\(ref,\{uid,handle/);
 assert.match(script,/if\(!state\.user\|\|!state\.db\|\|state\.profile\|\|!state\.gamertagRegistrationReady\|\|!state\.edenActive\)/);
});
test("gamertag gate is independent from all social permissions and defaults disabled",()=>{
 assert.match(api,/process\.env\.PWNZ_GAMERTAG_REGISTRATION_ENABLED === 'true'/);
 assert.match(api,/process\.env\.PWNZ_ECOSYSTEM_IDENTITY_ENABLED === 'true'/);
 assert.match(script,/if\(creating&&!state\.pairedRegistrationReady\)throw/);
 assert.match(api,/sharedProjectVerified &&/);
 assert.match(api,/process\.env\.PWNZ_SOCIAL_BACKEND_ENABLED === 'true'/);
 assert.match(script,/state\.gamertagRegistrationReady=Boolean\(info\.gamertagRegistrationReady\)/);
 assert.match(script,/state\.backendReady=Boolean\(info\.ready\)/);
 assert.match(script,/if\(state\.backendReady\)watchPosts\(\)/);
});
test("partial onboarding never tells members to create a second Firebase account",()=>{
 assert.match(script,/Use your original email account to resume/);
 assert.match(html,/Do NOT create a second Eden account/);
});
