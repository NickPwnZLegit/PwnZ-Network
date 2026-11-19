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
test("member directed to full canonical agreement; no second acceptance",()=>{
 assert.match(html,/Light of Hope Ecosystem Community Rules/);
 assert.match(html,/complete, canonical agreement/);
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
