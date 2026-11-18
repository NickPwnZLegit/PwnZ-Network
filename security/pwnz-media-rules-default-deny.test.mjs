import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const rules=readFileSync(new URL("./pwnz-media-staging-candidate.rules",import.meta.url),"utf8");
test("PwnZ proposed media path denies every client method",()=>assert.match(rules,/allow create, get, list, update, delete: if false/));
test("no wildcard public permissions",()=>assert.match(rules,/allow read,write: if false/));
test("no client uploads unlocked by feature-flag alone",()=>assert.ok(!/allow create:\s*if\s*request/.test(rules)));
