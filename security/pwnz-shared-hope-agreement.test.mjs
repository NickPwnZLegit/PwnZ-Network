import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {AGREEMENT,getAgreementExpiryDate} from "../social/hope-community-agreement.mjs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const js=read("social/social.js"),html=read("social/index.html");
test("PwnZ onboarding uses full published Hope Network agreement",()=>{
 assert.equal(AGREEMENT.id,"light-of-hope-community-rules-agreement");
 assert.equal(AGREEMENT.version,"v16-2026.08.27.1");
 assert.equal(AGREEMENT.validityDays,30);
 assert.equal(AGREEMENT.sections.length,12);
 assert.ok(AGREEMENT.sections.every(s=>s.paragraphs.length>0));
 assert.match(js,/for\(const section of AGREEMENT.sections\)/);
 assert.match(html,/id="hope-agreement-sections"/);
 assert.match(html,/id="hope-agreement-acknowledgement"/);
});
test("shared agreement expires after exactly thirty days",()=>{
 const start=new Date("2026-11-20T18:00:00Z");
 assert.equal(getAgreementExpiryDate(start).getTime()-start.getTime(),30*24*60*60*1000);
});
test("acceptance writes same shared record and append-only history atomically",()=>{
 assert.match(js,/writeBatch\(state.db\)/);
 assert.match(js,/batch.set\(doc\(state.db,"agreements",uid\),receipt,\{merge:true\}\)/);
 assert.match(js,/batch.set\(history,\{\.\.\.receipt,historyRecordId:history.id\}\)/);
 assert.match(js,/acceptedAt:serverTimestamp\(\)/);
 assert.match(js,/expiresAt:Timestamp.fromDate\(getAgreementExpiryDate\(now\)\)/);
 assert.doesNotMatch(js,/doc\(state.db,"pwnzAgreements"/);
});
test("acceptance panel only appears for signed in eligible Eden account needing agreement",()=>{
 assert.match(js,/signed&&state.edenActive&&!state.verifiedEden&&hopeAgreementReady/);
 assert.match(js,/!state.edenActive\|\|state.verifiedEden\|\|!hopeAgreementReady\|\|!ack.checked/);
 assert.match(html,/id="hope-agreement-submit"[^>]*disabled/);
});
test("paired creation stays gate controlled and does not create a duplicate Eden identity",()=>{
 assert.match(js,/if\(creating&&!state.pairedRegistrationReady\)/);
 assert.match(js,/if\(creating&&!\$\("no-existing-eden"\).checked\)/);
 assert.match(js,/action:"reserve-activate-pwnz"/);
 assert.match(js,/state.backendReady&&state.profile&&state.agreementCurrent/);
 assert.match(html,/id="existing-eden-realid"/);
});
