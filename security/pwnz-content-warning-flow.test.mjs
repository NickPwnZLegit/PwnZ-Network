import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const root=new URL("../",import.meta.url);
const read=p=>readFileSync(new URL(p,root),"utf8");
const page=read("social/index.html"),code=read("social/social.js"),rules=read("security/pwnz-social.rules"),
 moderation=read("api/pwnz-moderation.js"),ui=read("moderation/moderation.js");
test("compose has explicit content warning choices",()=>assert.match(page,/id="post-content-warning"/));
test("moderation warning label can be assigned",()=>assert.match(code,/contentWarning=normalizeWarning/));
test("public post writes an approved warning value",()=>assert.match(code,/postSection:section,contentWarning,/));
test("Firestore accepts legacy posts and validates optional warnings",()=>assert.match(rules,/optionalContentWarning\(request\.resource\.data\)/));
test("sensitive posts use blur/inert until viewer chooses",()=>{assert.match(code,/shouldBlur\(post\)/);assert.match(code,/setAttribute\("inert",""\)/);assert.match(code,/removeAttribute\("inert"\)/);});
test("reports include explicit and child-safety flags",()=>{assert.match(rules,/'unsafe-minors'/);assert.match(rules,/'explicit'/);assert.match(rules,/'sexual'/);});
test("client cannot hide or reinstate posts by changing Firestore status",()=>assert.match(rules,/allow update: if false;/));
test("moderation operations are preview-only",()=>assert.match(moderation,/env\.VERCEL_ENV==="preview"/));
test("moderation requires both trusted claim and UID allowlist",()=>{assert.match(moderation,/decoded\?\.pwnzModerator===true/);assert.match(moderation,/PWNZ_MODERATOR_UIDS/);});
test("human moderator chooses hide or dismiss",()=>{assert.match(ui,/hide-post/);assert.match(ui,/dismiss-report/);assert.match(ui,/window\.confirm/);});
test("no scripted ANNEAL takedown",()=>assert.ok(!moderation.includes("ANNEAL_MODEL_URL")&&!moderation.includes("annealDecision")));
