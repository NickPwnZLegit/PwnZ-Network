import {createHash} from "node:crypto";

// Hope Labs V1 research bridge: offline fixture only. Not wired to any live app.
// Every field in this module is synthetic and aggregate-only.
export const HOPE_RESEARCH_CONTRACT="hope-labs-readonly-aggregate-v1";
export const SITES=Object.freeze(["light-of-hope","eden-network","pwnz-live"]);
export const EVENT_TYPES=Object.freeze([
 "agreement_renewal_failure","existing_account_link_attempt",
 "duplicate_handle_attempt","zk_collision_fixture",
 "emulator_rule_denial","synthetic_service_fault","synthetic_fee_pressure"
]);
export const ADAPTER_RELEASE=Object.freeze({
 liveEnabled:false,networkRequestsEnabled:false,productionCollection:false,
 personalDataAllowed:false,aiCanDecideAccess:false,aiCanDecideIdentity:false,
 aiCanMoveFunds:false,aiCanVote:false,aiCanModerate:false,
 neuralModelExecuting:false,trainedAnnealExecuting:false
});
const SHA=data=>createHash("sha256").update(JSON.stringify(data)).digest("hex");
const KEYS="count,signal,synthetic";
export function createOfflineHopeLabsAdapter(network){
 if(!SITES.includes(network))throw new TypeError("Unsupported Hope Network site.");
 return Object.freeze({
  contract:HOPE_RESEARCH_CONTRACT,network,release:ADAPTER_RELEASE,
  snapshot(events){
   if(!Array.isArray(events)||events.length>96)throw new TypeError("Offline fixture batch must be bounded.");
   const byType=Object.fromEntries(EVENT_TYPES.map(type=>[type,0]));
   for(const event of events){
    if(!event||typeof event!=="object"||Array.isArray(event)||
       Object.keys(event).sort().join(",")!==KEYS||
       event.synthetic!==true||!EVENT_TYPES.includes(event.signal)||
       !Number.isSafeInteger(event.count)||event.count<0||event.count>10000)
      throw new TypeError("Only synthetic aggregated events are accepted.");
    byType[event.signal]+=event.count;
   }
   const reviewPressure=byType.zk_collision_fixture+byType.duplicate_handle_attempt+
     byType.emulator_rule_denial;
   const report={
    contract:HOPE_RESEARCH_CONTRACT,
    network,syntheticOnly:true,source:"offline-explicit-fixture",
    networkRequestsExecuted:0,productionEventsRead:0,personalDataFields:0,
    aggregateByType:byType,
    hi:{kind:"deterministic-threshold-not-trained-AI",
      reviewRecommended:reviewPressure>=3,canTakeActions:false},
    anneal:{kind:"not-running",modelInferenceCount:0,authority:"none"},
    zk:{kind:"emulator-only-no-real-proofs",verifiedHumanity:false},
    policy:{identity:"external-authoritative-verifier-only",
      access:"existing-production-permission-rules-only",
      payments:"existing-explicit-user-authorization-only",
      governance:"existing-server-policy-only"},
   };
   return Object.freeze({...report,evidenceSha256:SHA(report)});
  }
 });
}
