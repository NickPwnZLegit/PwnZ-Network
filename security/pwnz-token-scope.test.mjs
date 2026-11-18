import test from "node:test";import assert from "node:assert/strict";import {readFileSync} from "node:fs";
const h=readFileSync(new URL("../tokens/index.html",import.meta.url),"utf8");
test("PwnZ token panel has HOPE",()=>assert.match(h,/>HOPE<\/h2>/));
test("PwnZ token panel has PWNZ",()=>assert.match(h,/>PWNZ<\/h2>/));
test("PwnZ no unsupported financial actions",()=>assert.match(h,/No purchase required/));
test("no transaction signing",()=>assert.ok(!/eth_sendTransaction|signMessage|sendTransaction/.test(h)));