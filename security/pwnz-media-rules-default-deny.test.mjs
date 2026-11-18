import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const rules=readFileSync(new URL("./pwnz-media-staging-candidate.rules",import.meta.url),"utf8");
test("public file listing and downloads are denied",()=>assert.match(rules,/allow get, list, update, delete: if false/));
test("other paths deny all writes and reads",()=>assert.match(rules,/allow read, write: if false/));
test("candidate is review-only, not deployed",()=>assert.match(rules,/REVIEW ONLY: NOT DEPLOYED/));
test("writes must be reservation-bound",()=>assert.match(rules,/firestore\.get\(\/databases\/\(default\)\/documents\/pwnzMediaReservations/));
test("writes only from file owner",()=>assert.match(rules,/request\.auth\.uid == uid/));
test("size, MIME and scope must match reservation",()=>{
 assert.match(rules,/request\.resource\.size == r\.expectedBytes/);
 assert.match(rules,/request\.resource\.contentType == r\.mimeType/);
 assert.match(rules,/request\.resource\.metadata\.scope == r\.scope/);
});
test("expired reservations rejected",()=>assert.match(rules,/request\.time < r\.expiresAt/));
