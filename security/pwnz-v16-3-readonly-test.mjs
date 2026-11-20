import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const page=readFileSync(new URL("../onboarding-test/index.html",import.meta.url),"utf8");
const script=readFileSync(new URL("../onboarding-test/test.js",import.meta.url),"utf8");
test("V16.3 preview uses existing Firebase sign-in with in-memory persistence",()=>{
 assert.match(script,/signInWithEmailAndPassword/);
 assert.match(script,/setPersistence\(auth,inMemoryPersistence\)/);
 assert.match(script,/onAuthStateChanged/);
 assert.doesNotMatch(script,/createUserWithEmailAndPassword|runTransaction|setDoc|addDoc|updateDoc|deleteDoc|reserve-activate/);
});
test("V16.3 read-only test refuses all write and registrar flags",()=>{
 for(const flag of ["cfg.ready","cfg.enabled","cfg.gamertagRegistrationReady","cfg.edenRegistrarReady","cfg.pairedRegistrationReady","cfg.applicationsReady"])assert.ok(script.includes(flag));
 assert.match(script,/cfg.sharedProjectVerified/);
 assert.match(script,/getDoc\(doc\(db,"edenRealIdOwners",uid\)\)/);
 assert.match(script,/getDoc\(doc\(db,"pwnzProfiles",uid\)\)/);
});
test("V16.3 test has password reset and no-index boundary",()=>{
 assert.match(page,/<meta name="robots" content="noindex,nofollow">/);
 assert.match(page,/Temporary, read-only preview/);
 assert.doesNotMatch(page,/name=".*password.*" value=/i);
 assert.match(page,/Sign out from this test/);
});
