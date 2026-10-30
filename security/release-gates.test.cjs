// Lightweight static release guard. Run with: node --test security/release-gates.test.cjs
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs");
const get=p=>fs.readFileSync(p,"utf8");
test("Firebase client remains disabled by default",()=>{
 const s=get("api/pwnz-config.js");assert.match(s,/PWNZ_SOCIAL_BACKEND_ENABLED\s*===\s*'true'/);
});
test("Applications remain disabled by default",()=>{
 const s=get("api/pwnz-apply.js");assert.match(s,/PWNZ_APPLICATIONS_ENABLED\s*!==\s*"true"/);
});
test("Draft rules are well formed at a structural level",()=>{
 const s=get("security/pwnz-social.rules");assert.equal((s.match(/match \/pwnzRoleApplications/g)||[]).length,1);
 assert.equal((s.match(/match \/pwnzHearts/g)||[]).length,1);
 assert.equal((s.match(/match \/pwnzFollows/g)||[]).length,1);
 assert.equal((s.match(/\{/g)||[]).length,(s.match(/\}/g)||[]).length);
 assert.match(s,/request\.resource\.data\.role == 'member'/);
 assert.match(s,/allow list: if false;/);
});
test("Messenger does not directly query private PwnZ handle registry",()=>{
 const s=get("messenger/messenger.js");
 assert.doesNotMatch(s,/getDoc\(doc\(state\.db,"pwnzHandles"/);
 assert.match(s,/mode=pwnz-contact/);
});
test("Application email is server-side via Light of Hope",()=>{
 const s=get("api/pwnz-apply.js");assert.match(s,/light-of-hope\.net\/api\/community-registration/);
});
