import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {assessOwner,visibleLightMembers} from "../account-hub/identity-policy.mjs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const now=Date.now();
const base={uid:"uid-a",owner:{uid:"uid-a",displayName:"EdenTester",status:"active"},
 profile:{uid:"uid-a",profileStatus:"active"},agreement:{uid:"uid-a",accepted:true,agreementVersion:"v16-2026.08.27.1",expiresAt:{toMillis:()=>now+600000}},
 gamer:{uid:"uid-a",handle:"player_one"},now};
test("one verified UID links Eden and PwnZ gaming display without exposing email",()=>{
 const r=assessOwner(base);
 assert.deepEqual(r,{activated:true,agreementCurrent:true,realId:"EdenTester",handle:"player_one"});
 assert.equal(JSON.stringify(r).includes("@example"),false);
});
test("never join account identity based on a matching public name alone",()=>{
 for(const mismatch of [
   {owner:{uid:"other",displayName:"EdenTester"}},
   {profile:{profileStatus:"pending"}},
   {owner:null}
 ])assert.equal(assessOwner({...base,...mismatch}).activated,false);
 assert.equal(assessOwner({...base,gamer:{uid:"other",handle:"player_one"}}).handle,"");
});
test("reject expired, invalid and forged agreement records",()=>{
 for(const agreement of [
  {...base.agreement,expiresAt:{toMillis:()=>now-1}},
  {...base.agreement,uid:"other"},
  {...base.agreement,accepted:false},
  {...base.agreement,agreementVersion:"unknown"}
 ])assert.equal(assessOwner({...base,agreement}).agreementCurrent,false);
});
test("grandfathered identity requires matching owner and previous registry status",()=>{
 const r=assessOwner({...base,owner:{uid:"uid-a",status:"grandfathered",reservationType:"legacy-profile-migration"},
 profile:{memberNumber:8}});
 assert.equal(r.activated,true);
 assert.equal(assessOwner({...base,owner:{uid:"uid-a",status:"grandfathered"},profile:{memberNumber:8}}).activated,false);
});
test("member lists show only authenticated account's active directional public names",()=>{
 const rows=[
  {ownerUid:"uid-a",memberUid:"uid-b",status:"active",memberPublicName:"Friend B",ownerPublicName:"Friend A"},
  {ownerUid:"uid-c",memberUid:"uid-b",status:"active",memberPublicName:"Friend B",ownerPublicName:"Other"},
  {ownerUid:"uid-a",memberUid:"uid-d",status:"blocked",memberPublicName:"Blocked"},
 ];
 assert.deepEqual(visibleLightMembers(rows,"uid-a","ownerUid"),["Friend B"]);
 assert.deepEqual(visibleLightMembers(rows,"uid-b","memberUid"),["Friend A","Other"]);
 assert.deepEqual(visibleLightMembers(rows,"uid-a","unknown"),[]);
});
test("hub fails closed unless shared project is explicitly verified",()=>{
 const api=read("api/pwnz-config.js"),client=read("account-hub/account-hub.js");
 assert.match(api,/PWNZ_SHARED_FIREBASE_PROJECT_ID/);
 assert.match(api,/config\.projectId === process\.env\.PWNZ_SHARED_FIREBASE_PROJECT_ID/);
 assert.match(client,/!data\?\.sharedProjectVerified/);
 assert.match(client,/getDoc\(doc\(db,"edenRealIdOwners",uid\)\)/);
 assert.doesNotMatch(client,/createUserWithEmailAndPassword|setDoc\(|addDoc\(|deleteDoc\(/);
});
test("hub reuses shared Messenger and Light Member collections and never claims wallet connectivity",()=>{
 const html=read("account-hub/index.html"),client=read("account-hub/account-hub.js");
 assert.match(client,/lightMemberLinks/);
 assert.match(html,/href="\/messenger\/"/);
 assert.match(html,/https:\/\/light-of-hope\.net\/\#\/wallet/);
 assert.doesNotMatch(client,/signTransaction|sendTransaction|privateKey|seedPhrase/);
 assert.match(read("index.html"),/href="\/account-hub\/"/);
 assert.match(read("social/index.html"),/href="\/account-hub\/"/);
});
