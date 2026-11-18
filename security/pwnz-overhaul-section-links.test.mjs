import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const root=new URL("../",import.meta.url);
const read=path=>readFileSync(new URL(path,root),"utf8");
const home=read("index.html"),members=read("members/members.js"),social=read("social/social.js"),
 socialPage=read("social/index.html"),community=read("community/index.html"),
 profile=read("profile/index.html"),arena=read("arena/index.html"),nav=read("assets/pwnz-nav.js");
test("member directory offers public profile posts",()=>assert.match(members,/section=profile&member=/));
test("public profile feed checks a member handle rather than exposing Firebase UIDs in URLs",()=>{
 assert.match(social,/memberHandle=new URLSearchParams\(location.search\).get\("member"\)/);
 assert.match(social,/post.authorHandle===publicMember/);
});
test("personal profile has posting and video entry",()=>assert.match(profile,/section=profile#compose/));
test("community creator entry links to matching composer",()=>assert.match(community,/section=creator#compose/));
test("arena has gaming post entry",()=>assert.match(arena,/section=gaming#compose/));
test("post composer has all five publishing scopes",()=>["social","profile","creator","gaming","community"].forEach(scope=>assert.match(socialPage,new RegExp('<option value="'+scope+'">'))));
test("profile files only route through preview-only stage, never live public publication",()=>{
 assert.match(social,/preparePwnzMediaUpload\(/);
 assert.match(social,/state.mediaStagingEnabled/);
 assert.match(social,/No public post has been created/);
});
test("global navigation has Messenger and LightVault without copying sensitive wallet identities",()=>{
 assert.match(nav,/LightVault \(Light of Hope\)/);
 assert.match(nav,/https:\/\/light-of-hope.net\/#\/wallet/);
 assert.match(nav,/Messenger/);
});
test("home layout uses compact hero",()=>assert.match(home,/min-height:360px/));
test("external provider video cards are safe outbound links",()=>{
 assert.match(social,/isSafeExternalCard\(/);
 assert.match(social,/cardLink.rel="noopener noreferrer"/);
});
