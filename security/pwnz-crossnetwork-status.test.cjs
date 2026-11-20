const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs");
const {enabled,validatedAuthorization,summary,trustedPreviewOrigin}=require("../api/eden-account-status.js");
const read=p=>fs.readFileSync(require("node:path").join(__dirname,"..",p),"utf8");
test("preview and matching Firebase project required",()=>{
 const cfg={VERCEL_ENV:"preview",PWNZ_ACCOUNT_STATUS_TESTNET_ENABLED:"true",
 PWNZ_FIREBASE_PROJECT_ID:"shared-test",PWNZ_SHARED_FIREBASE_PROJECT_ID:"shared-test"};
 assert.equal(enabled(cfg),true);
 for(const changes of [{VERCEL_ENV:"production"},{PWNZ_ACCOUNT_STATUS_TESTNET_ENABLED:"false"},
   {PWNZ_SHARED_FIREBASE_PROJECT_ID:"different"},{PWNZ_FIREBASE_PROJECT_ID:""}])
  assert.equal(enabled({...cfg,...changes}),false);
});
test("caller must already have a Firebase ID token; no email or name accepted",()=>{
 assert.equal(validatedAuthorization("Bearer "+"a".repeat(30)),true);
 for(const v of [null,"Basic YWJj","Bearer token","test@example.com","EdenRealID"])
  assert.equal(validatedAuthorization(v),false);
 const src=read("api/eden-account-status.js");
 assert.match(src,/Object\.keys\(req\.query\)\.length/);
 assert.match(src,/redirect:"error"/);
 assert.doesNotMatch(src,/localId|accounts:lookup|emailAddress|realIdName/);
});
test("only known status flags survive upstream; never leak UID/email/handles",()=>{
 const fields={ok:true,schemaVersion:1,mode:"read-only-testnet",
 edenRealIdActive:true,agreementRecognized:true,pwnzGamertagLinked:false,
 sharedServicesAuthorized:false,lightVaultTransfersEnabled:false,humanUniquenessVerified:false,
 uid:"secret",email:"secret@example.com",handle:"secret"};
 const result=summary(fields);
 assert.equal(result.edenRealIdActive,true);
 assert.equal("uid" in result,false);
 assert.equal("email" in result,false);
 assert.equal("handle" in result,false);
 assert.equal(summary({...fields,agreementRecognized:"true"}),null);
 assert.equal(summary({...fields,mode:"production"}),null);
});

test("relay only forwards tokens to a pinned Light of Hope preview host",()=>{
 const good={HOPE_ACCOUNT_STATUS_PREVIEW_ORIGIN:"https://light-of-hope-site-git-testing.vercel.app"};
 assert.equal(trustedPreviewOrigin(good),"https://light-of-hope-site-git-testing.vercel.app");
 for(const origin of [
  "http://light-of-hope-site-git-testing.vercel.app",
  "https://light-of-hope-site.vercel.app.evil.test",
  "https://light-of-hope-site.vercel.app@evil.test",
  "https://evil.vercel.app",
  "https://light-of-hope-site.vercel.app/private",
  "https://light-of-hope-site.vercel.app?test=1"
 ])assert.equal(trustedPreviewOrigin({HOPE_ACCOUNT_STATUS_PREVIEW_ORIGIN:origin}),null);
});
