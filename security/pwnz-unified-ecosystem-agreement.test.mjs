import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const social=read("social/social.js"),html=read("social/index.html"),messenger=read("messenger/messenger.js");
test("PwnZ reads same account agreement instead of writing separate ones",()=>{
 assert.match(social,/getDoc\(doc\(state\.db,"agreements",state\.user\.uid\)\)/);
 assert.doesNotMatch(social,/setDoc\(doc\(state\.db,"pwnzAgreements"/);
 assert.match(social,/ecosystem-2026\.11\.18\.1/);
 assert.match(messenger,/ecosystem-2026\.11\.18\.1/);
});
test("both social and messenger require current, non-expired shared agreement",()=>{
 assert.match(social,/a\.expiresAt\?\.toMillis\?\.\(\)>Date\.now\(\)/);
 assert.match(messenger,/expires\.getTime\(\)>Date\.now\(\)/);
});
test("PwnZ renders and accepts full canonical agreement without a separate PwnZ record",()=>{
 assert.match(html,/Light of Hope Ecosystem Community Rules/);
 assert.match(html,/id="agreement-full-text"/);
 assert.match(social,/fetch\("https:\/\/light-of-hope\.net\/api\/ecosystem-agreement"/);
 assert.match(social,/const batch=writeBatch\(state\.db\)/);
 assert.match(social,/batch\.set\(doc\(state\.db,"agreements",uid\)/);
 assert.match(social,/batch\.set\(history/);
 assert.match(html,/https:\/\/light-of-hope\.net\/\#\/profile/);
 assert.match(html,/id="agree-check" type="checkbox" disabled/);
});

test("agreement renewal signs out once then shows the agreement on next login",()=>{
 assert.match(social,/const RENEWAL_MARKER=/);
 assert.match(social,/pendingRenewal\(\)!==user\.uid/);
 assert.match(social,/markRenewal\(user\.uid\)/);
 assert.match(social,/await signOut\(state\.auth\)/);
 assert.match(social,/pendingRenewal\(\)===user\.uid/);
 assert.match(social,/\$\("community-agreement"\)\.scrollIntoView/);
 assert.match(social,/!state\.agreementLookupFailed/);
});

test("legacy PwnZ gamer sessions are preserved while Eden migration is optional",()=>{
 assert.match(social,/getDoc\(doc\(state\.db,"pwnzAgreements",state\.user\.uid\)\)/);
 assert.match(social,/previous\.version==="pwnz-2026\.10\.30\.1"/);
 assert.match(social,/previous\.expiresAt\?\.toMillis\?\.\(\)>Date\.now\(\)/);
 assert.match(social,/state\.agreementCurrent=canonical\|\|legacy/);
 assert.doesNotMatch(social,/state\.agreementCurrent=state\.edenActive&&state\.verifiedEden/);
 assert.doesNotMatch(social,/state\.agreementCurrent=state\.edenActive\?state\.verifiedEden:state\.agreementCurrent/);
 assert.match(social,/if\(user&&state\.backendReady&&state\.edenActive&&!state\.agreementCurrent/);
});
