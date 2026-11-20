import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const get=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const app=get("social/social.js"),html=get("social/index.html"),cfg=get("api/pwnz-config.js"),proxy=get("api/pwnz-apply.js");
test("Gamer and Game Creator paths are visible independently of posting backend",()=>{
 assert.match(html,/id="role-availability"/);
 assert.match(html,/value="gamer"/);
 assert.match(html,/value="game_creator"/);
 assert.match(app,/state\.applicationsReady&&state\.edenActive&&state\.agreementCurrent/);
 assert.doesNotMatch(app,/\$\("role-application"\)\.hidden=!\(state\.backendReady/);
});
test("Applicants need a PwnZ profile, active Eden identity, agreement and review gate",()=>{
 assert.match(app,/!state\.profile\|\|!state\.edenActive\|\|!state\.agreementCurrent\|\|!state\.applicationsReady/);
 assert.match(cfg,/process\.env\.PWNZ_APPLICATIONS_ENABLED === 'true'/);
 assert.match(cfg,/const applicationsReady = sharedProjectVerified/);
 assert.match(proxy,/process\.env\.PWNZ_APPLICATIONS_ENABLED!=="true"/);
 assert.match(proxy,/\["pwnz-gamer","pwnz-game-creator","pwnz-original-game"\]/);
});
test("Application service preserves moderator approval and social backend gate stays separate",()=>{
 assert.match(proxy,/https:\/\/light-of-hope\.net\/api\/community-registration/);
 assert.match(app,/Your role remains PwnZ Member/);
 assert.match(cfg,/process\.env\.PWNZ_SOCIAL_BACKEND_ENABLED === 'true'/);
 assert.match(app,/\$\("compose"\)\.hidden=!\(signed&&state\.backendReady/);
});
