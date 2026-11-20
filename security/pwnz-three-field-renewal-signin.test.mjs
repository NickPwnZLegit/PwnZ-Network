import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const html=read("social/index.html"),js=read("social/social.js");
test("existing Eden member login requires name email and password while paired signup remains distinct",()=>{
 assert.match(html,/id="existing-eden-realid"/);
 assert.match(html,/id="email"/);
 assert.match(html,/id="password"/);
 assert.match(html,/id="new-pwnz-gamertag"/);
 assert.match(js,/\$\("existing-eden-realid"\)\.required=existing/);
 assert.match(js,/\$\("existing-eden-realid"\)\.disabled=!existing/);
 assert.match(js,/if\(!creating&&!confirmExistingEden\)/);
});
test("Eden name is checked only after Firebase verifies credentials and owner records",()=>{
 const signIn=js.indexOf("credential=await signInWithEmailAndPassword");
 const check=js.indexOf("await checkEdenStatus();",signIn);
 const compare=js.indexOf("normalizeEdenName(confirmExistingEden)",signIn);
 assert.ok(signIn!==-1&&check>signIn&&compare>check);
 assert.match(js,/normalizeEdenName\(state\.edenName\)/);
 assert.match(js,/await signOut\(state\.auth\)/);
});
test("PwnZ ends expired-agreement session but never treats missing identity as expiration",()=>{
 assert.match(js,/state\.edenAgreementExpired=Boolean\(active&&agreement\?\.accepted===true&&expiry instanceof Date&&expiry\.getTime\(\)<=Date\.now\(\)\)/);
 assert.match(js,/if\(state\.edenAgreementExpired\)\{state\.renewalSignedOut=true;await signOut\(state\.auth\);return;\}/);
 assert.match(html,/id="renewal-signout-help"/);
 assert.match(html,/light-of-hope\.net\/\#\/profile/);
 assert.match(js,/state\.renewalSignedOut=false/);
});
test("posting and creator application authorization remain independently gated",()=>{
 assert.match(js,/\$\("compose"\)\.hidden=!\(signed&&state\.backendReady/);
 assert.match(js,/state\.applicationsReady&&state\.edenActive&&state\.agreementCurrent/);
});
