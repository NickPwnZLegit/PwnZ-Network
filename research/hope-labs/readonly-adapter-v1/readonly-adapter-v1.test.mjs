import test from "node:test";
import assert from "node:assert/strict";
import {createOfflineHopeLabsAdapter,HOPE_RESEARCH_CONTRACT,SITES,EVENT_TYPES,ADAPTER_RELEASE} from "./readonly-adapter-v1.mjs";

test("adapter stays strictly offline, disabled, non-authoritative",()=>{
 assert.equal(HOPE_RESEARCH_CONTRACT,"hope-labs-readonly-aggregate-v1");
 assert.deepEqual(SITES,["light-of-hope","eden-network","pwnz-live"]);
 for(const [key,value] of Object.entries(ADAPTER_RELEASE))assert.equal(value,false,key);
 assert.equal(EVENT_TYPES.length,7);
});
test("each site reports the same deterministic shape with site-local counts only",()=>{
 for(const site of SITES){
  const adapter=createOfflineHopeLabsAdapter(site);
  const e=[{signal:"emulator_rule_denial",count:2,synthetic:true},
           {signal:"zk_collision_fixture",count:1,synthetic:true}];
  const report=adapter.snapshot(e);
  assert.equal(report.network,site);
  assert.equal(report.source,"offline-explicit-fixture");
  assert.equal(report.hi.reviewRecommended,true);
  assert.equal(report.hi.canTakeActions,false);
  assert.equal(report.anneal.modelInferenceCount,0);
  assert.equal(report.zk.verifiedHumanity,false);
  assert.equal(report.networkRequestsExecuted,0);
  assert.equal(report.productionEventsRead,0);
  assert.equal(report.personalDataFields,0);
  assert.match(report.evidenceSha256,/^[a-f0-9]{64}$/);
  assert.deepEqual(report,adapter.snapshot(e));
 }
});
test("reject unknown network, unexpected identifiers and real event payloads",()=>{
 assert.throws(()=>createOfflineHopeLabsAdapter("unknown"),/Unsupported/);
 const adapter=createOfflineHopeLabsAdapter("eden-network");
 const valid={signal:"synthetic_service_fault",count:1,synthetic:true};
 for(const bad of [
  {...valid,uid:"synthetic-account"},{...valid,email:"x@example.invalid"},
  {...valid,ip:"127.0.0.1"},{...valid,accountId:"acct"},
  {...valid,zkTimestamp:"zkts1_anything"},{...valid,wallet:"0x00"},
  {...valid,biometric:"feature"},{...valid,network:"pwnz-live"},
  {...valid,synthetic:false},{...valid,count:-1},{...valid,count:10001},
  {...valid,count:1.5},{...valid,signal:"unlisted"}
 ])assert.throws(()=>adapter.snapshot([bad]),/synthetic aggregated/);
 for(const v of [null,"event",{},[valid,undefined],Array(97).fill(valid)]){
  assert.throws(()=>adapter.snapshot(v));
 }
});
