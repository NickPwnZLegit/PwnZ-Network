import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
const nav=readFileSync(new URL("../assets/pwnz-nav.js",import.meta.url),"utf8");
const urls=["https://light-of-hope.net/","https://edennetwork.live/","https://pwnz.live/","https://hope-labs-research.vercel.app/"];
test("all connected websites are linked on the PwnZ homepage",()=>{
 for(const url of urls)assert.ok(html.includes(url),url);
 assert.match(html,/Connected ecosystem sites/);
 assert.match(html,/https:\/\/light-of-hope.net\/#\/development-wall/);
});
test("the global navigation drawer links the new sites without activating tokens",()=>{
 for(const url of ["https://edennetwork.live/","https://hope-labs-research.vercel.app/"])
 assert.ok(nav.includes(url),url);
 assert.match(html,/not offered on this preview page/);
});
