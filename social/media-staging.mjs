// Firebase Storage staging adapter. NOT connected to public post creation.
// This module is importable only after Firebase Storage rules, independent content
// moderation, server review and explicit enablement are reviewed and deployed.
import {checkPwnzMedia} from "./media-policy.mjs";
export async function preparePwnzMediaUpload({file,scope,auth,storageSdk,storage,allowStaging=false,onProgress}){
  if(!allowStaging)throw new Error("PwnZ media uploads are disabled until security review.");
  if(!auth?.currentUser?.uid)throw new Error("Sign in before uploading.");
  const info=checkPwnzMedia(file,scope);
  if(!globalThis.crypto?.randomUUID)throw new Error("Secure upload IDs unavailable.");
  const id=globalThis.crypto.randomUUID();
  const storagePath=`pwnzMediaStaging/${auth.currentUser.uid}/${id}/source`;
  const task=storageSdk.uploadBytesResumable(storageSdk.ref(storage,storagePath),file,{
    contentType:info.mimeType,customMetadata:{scope:info.scope,kind:info.kind}
  });
  const result=new Promise((resolve,reject)=>task.on("state_changed",snapshot=>{
    if(typeof onProgress==="function")onProgress(Math.round(snapshot.bytesTransferred*100/Math.max(1,snapshot.totalBytes)));
  },reject,()=>resolve({id,kind:info.kind,status:"pending-review"})));
  return {task,result};
}
