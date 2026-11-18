// Private PwnZ media staging. Does not publish media or return public links.
// The server validates identity, per-user allowance and an expiring reservation.
// Firebase Storage rules must separately validate that reservation.
import {checkPwnzMedia} from "./media-policy.mjs";
export async function preparePwnzMediaUpload({file,scope,auth,storageSdk,storage,allowStaging=false,onProgress,title="",body=""}){
 if(!allowStaging)throw new Error("Private media staging is unavailable until security review is complete.");
 if(!auth?.currentUser?.uid)throw new Error("Sign in before uploading.");
 const uid=auth.currentUser.uid,media=checkPwnzMedia(file,scope);
 const token=await auth.currentUser.getIdToken();
 const authenticated=async(payload)=>{
  const response=await fetch("/api/pwnz-media-intake",{method:"POST",cache:"no-store",
   headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},body:JSON.stringify(payload)});
  const answer=await response.json().catch(()=>({}));
  if(!response.ok||answer.ok!==true)throw new Error(answer.error||"Private media service unavailable.");
  return answer;
 };
 const reservation=await authenticated({action:"reserve",scope:media.scope,mimeType:media.mimeType,
  bytes:media.bytes,title,body});
 const prefix="pwnzMediaStaging/"+uid+"/";
 if(typeof reservation.storagePath!=="string"||!reservation.storagePath.startsWith(prefix)||
  !/^pwnzMediaStaging\/[A-Za-z0-9_-]{1,128}\/[0-9a-f-]{36}\/source$/.test(reservation.storagePath)){
  throw new Error("Private media reservation path was invalid.");
 }
 const task=storageSdk.uploadBytesResumable(storageSdk.ref(storage,reservation.storagePath),file,{
  contentType:media.mimeType,customMetadata:{scope:media.scope,kind:media.kind}
 });
 const result=new Promise((resolve,reject)=>task.on("state_changed",snapshot=>{
  if(typeof onProgress==="function")onProgress(Math.min(100,Math.round(snapshot.bytesTransferred*100/Math.max(1,snapshot.totalBytes))));
 },reject,async()=>{
  try{
   const reviewed=await authenticated({action:"complete",uploadId:reservation.uploadId});
   if(reviewed.status!=="pending-review")throw new Error("Unexpected private media state.");
   resolve({uploadId:reservation.uploadId,status:"pending-review",kind:media.kind,scope:media.scope});
  }catch(e){reject(e);}
 }));
 return {task,result};
}
