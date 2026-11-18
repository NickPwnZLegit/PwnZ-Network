import test from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const {gate,authorized}=require("../api/pwnz-moderation.js")._test;
const env={VERCEL_ENV:"preview",PWNZ_MODERATION_ENABLED:"true",FIREBASE_ADMIN_PROJECT_ID:"synthetic",
 FIREBASE_ADMIN_CLIENT_EMAIL:"fixture@example.invalid",FIREBASE_ADMIN_PRIVATE_KEY:"fixture",
 PWNZ_MODERATOR_UIDS:"trusted123"};
test("prod cannot open moderator service",()=>assert.equal(gate({...env,VERCEL_ENV:"production"}),false));
test("preview requires explicit moderation flag",()=>assert.equal(gate({...env,PWNZ_MODERATION_ENABLED:"false"}),false));
test("preview requires service secrets",()=>assert.equal(gate({...env,FIREBASE_ADMIN_PRIVATE_KEY:""}),false));
test("moderation claim alone not enough",()=>assert.equal(authorized({uid:"somebody",pwnzModerator:true},env),false));
test("UID allowlist alone not enough",()=>assert.equal(authorized({uid:"trusted123"},env),false));
test("both claim and allowlist required",()=>assert.equal(authorized({uid:"trusted123",pwnzModerator:true},env),true));
test("ordinary user denied",()=>assert.equal(authorized({uid:"trusted123",pwnzModerator:false},env),false));
