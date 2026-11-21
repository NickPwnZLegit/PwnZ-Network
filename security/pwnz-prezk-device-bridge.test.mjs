import test from "node:test";import assert from "node:assert/strict";import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
test("PwnZ preview device proxy preserves Firebase owner and signed-in Gamertag",()=>{
 const code=read("api/prezk-device.js"),social=read("social/social.js");
 assert.match(code,/PWNZ_PREZK_UPSTREAM_URL/);assert.match(code,/PWNZ_PREZK_DEVICE_TEST_ENABLED/);
 assert.match(code,/VERCEL_ENV!=="preview"/);assert.match(code,/network:"pwnz"/);
 assert.match(social,/onAuthStateChanged/);assert.match(social,/verifiedEden/);
 assert.match(social,/gamertagRegistrationReady/);assert.match(social,/pwnzDeviceTest/);
 assert.match(social,/state\.prezkReady/);
 assert.match(social,/EDEN_AGREEMENT_VERSIONS/);
});
test("device interface does not collect biometrics or bypass agreement",()=>{
 const page=read("social/index.html"),client=read("prezk/device.js"),social=read("social/social.js");
 assert.match(page,/pwnz-prezk-panel/);
 assert.match(page,/One account/);
 assert.match(social,/edenAgreementExpiryMs/);
 assert.match(client,/indexedDB/);assert.match(client,/generateKey/);
 assert.match(client,/does not have its original enrolled key/);
 assert.doesNotMatch(client,/getUserMedia/);
});
