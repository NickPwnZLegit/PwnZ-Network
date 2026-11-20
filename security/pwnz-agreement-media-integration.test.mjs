import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const read = path => readFileSync(new URL(path, root), "utf8");
const social = read("social/social.js");
const html = read("social/index.html");
const messenger = read("messenger/messenger.js");

test("shared agreement migration coexists with current media intake and previews", () => {
  assert.match(social, /ecosystem-2026\.11\.18\.1/);
  assert.match(social, /getDoc\(doc\(state\.db,"agreements",state\.user\.uid\)\)/);
  assert.match(social, /pwnz-2026\.10\.30\.1/);
  assert.match(social, /agreementLookupFailed/);
  assert.match(social, /safePwnzEmbedUrl/);
  assert.match(social, /validateClipDuration/);
  assert.match(social, /resetClipPreview/);
  assert.match(html, /id="agreement-full-text"/);
  assert.match(html, /id="clip-file"/);
  assert.match(html, /id="clip-preview"/);
});

test("legacy local PwnZ acceptance cannot become cross-network authorization", () => {
  assert.match(social, /const canonical=Boolean\(state\.edenActive/);
  assert.match(social, /if\(!state\.edenActive && !canonical\)/);
  assert.match(social, /state\.agreementCurrent=canonical\|\|legacy/);
  assert.match(social, /if\(!state\.user\|\|!state\.edenActive\|\|!state\.db\|\|!state\.agreementTerms/);
});

test("messenger still checks activated Eden status independently", () => {
  assert.match(messenger, /const currentAgreement=Boolean/);
  assert.match(messenger, /ecosystem-2026\.11\.18\.1/);
  assert.match(messenger, /if\(!active\|\|!currentAgreement\)/);
});
