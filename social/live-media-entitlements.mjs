// PwnZ account-level, provisional limits. No streaming provider or billing enabled.
// Never trust a client-selected tier: verify entitlement using server-side billing
// state, issue bounded time-limited publishing credentials, and reconcile usage.
export const MiB=1024*1024;
export const PLANS=Object.freeze({
 free:Object.freeze({storedMiB:500,monthlyUploadMiB:750,liveMinutes:60,monthlyViewerMinutes:500}),
 supporter:Object.freeze({storedMiB:3072,monthlyUploadMiB:5120,liveMinutes:180,monthlyViewerMinutes:1500}),
 creator:Object.freeze({storedMiB:12288,monthlyUploadMiB:20480,liveMinutes:360,monthlyViewerMinutes:5000})
});
export function evaluatePlan(id){if(typeof id!=="string"||!Object.hasOwn(PLANS,id))throw Error("Unknown plan.");return PLANS[id];}
export function canStartLive({planId,usedLiveMinutes,usedViewerMinutes,activeStreams}){
 const plan=evaluatePlan(planId);
 for(const n of [usedLiveMinutes,usedViewerMinutes,activeStreams])if(!Number.isSafeInteger(n)||n<0)throw Error("Usage must be trusted nonnegative integers.");
 if(activeStreams>0)return {allowed:false,reason:"one-active-stream"};
 if(usedLiveMinutes>=plan.liveMinutes)return {allowed:false,reason:"broadcast-time"};
 if(usedViewerMinutes>=plan.monthlyViewerMinutes)return {allowed:false,reason:"audience-delivery"};
 return {allowed:true,recording:false,remainingLiveMinutes:plan.liveMinutes-usedLiveMinutes};
}
export function canReserveUpload({planId,usedStorageBytes,usedMonthlyUploadBytes,incomingBytes}){
 const plan=evaluatePlan(planId);
 for(const n of [usedStorageBytes,usedMonthlyUploadBytes,incomingBytes])if(!Number.isSafeInteger(n)||n<0)throw Error("Usage must be trusted nonnegative integers.");
 if(incomingBytes<1)return {allowed:false,reason:"empty"};
 if(incomingBytes>45*MiB)return {allowed:false,reason:"single-file"};
 if(usedStorageBytes+incomingBytes>plan.storedMiB*MiB)return {allowed:false,reason:"storage"};
 if(usedMonthlyUploadBytes+incomingBytes>plan.monthlyUploadMiB*MiB)return {allowed:false,reason:"upload-limit"};
 return {allowed:true};
}
export const STREAM_DEFAULTS=Object.freeze({platformRecording:false,platformReplay:false,canBlockThirdPartyCapture:false});
