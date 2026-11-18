// PRIVATE FILE STAGING ONLY. This API never publishes or returns downloadable media URLs.
// It is limited to verified preview builds and requires Firebase Admin credentials.
// It is not the media safety reviewer/transcoder/publisher.
const {randomUUID}=require("node:crypto");
const {enabled,normalize,reserveQuota,agreementAllows}=require("../server/pwnzMediaIntakePolicy.cjs");
function respond(res,status,data){
 res.setHeader("Cache-Control","no-store");
 res.setHeader("X-Content-Type-Options","nosniff");
 return res.status(status).json(data);
}
function admin(){
 // Never import admin SDK until server configuration passes the hard preview gate.
 const {cert,getApps,initializeApp}=require("firebase-admin/app");
 const {getAuth}=require("firebase-admin/auth");
 const {getFirestore,FieldValue,Timestamp}=require("firebase-admin/firestore");
 const {getStorage}=require("firebase-admin/storage");
 let app=getApps().find(a=>a.name==="pwnz-media-intake");
 if(!app){
  app=initializeApp({credential:cert({
   projectId:process.env.FIREBASE_ADMIN_PROJECT_ID,
   clientEmail:process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
   privateKey:process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g,"\n")
  }),projectId:process.env.FIREBASE_ADMIN_PROJECT_ID,storageBucket:process.env.PWNZ_FIREBASE_STORAGE_BUCKET},"pwnz-media-intake");
 }
 return {db:getFirestore(app),auth:getAuth(app),bucket:getStorage(app).bucket(process.env.PWNZ_FIREBASE_STORAGE_BUCKET),FieldValue,Timestamp};
}
module.exports=async function handler(req,res){
 const ready=enabled();
 if(req.method==="GET")return respond(res,200,{enabled:ready,publicUploads:false,automaticPublishing:false});
 if(req.method!=="POST")return respond(res,405,{ok:false,error:"Method not allowed."});
 if(!ready)return respond(res,503,{ok:false,error:"Media intake is not enabled."});
 const raw=String(req.headers?.authorization||"");
 if(!/^Bearer [A-Za-z0-9._-]{20,4096}$/.test(raw))return respond(res,401,{ok:false,error:"Authenticated PwnZ session required."});
 try{
  const {db,auth,bucket,FieldValue,Timestamp}=admin();
  const identity=await auth.verifyIdToken(raw.slice(7),true);
  const uid=identity.uid;
  if(!/^[A-Za-z0-9_-]{1,128}$/.test(uid))throw Object.assign(new Error("Invalid authenticated user."),{status:401});
  const [profile,edenProfile,edenOwner,edenAgreement,pwnzAgreement]=await db.getAll(
    db.doc("pwnzProfiles/"+uid),db.doc("profiles/"+uid),db.doc("edenRealIdOwners/"+uid),
    db.doc("agreements/"+uid),db.doc("pwnzAgreements/"+uid));
  if(!profile.exists||profile.data()?.uid!==uid||!agreementAllows({pwnzProfile:profile.data(),edenProfile:edenProfile.data(),
    edenOwner:edenOwner.data(),edenAgreement:edenAgreement.data(),pwnzAgreement:pwnzAgreement.data()}))
    throw Object.assign(new Error("Active PwnZ profile and current agreement required."),{status:403});
  const input=req.body??{};
  if(input.action==="reserve"){
   const media=normalize(input);
   const id=randomUUID(),path=`pwnzMediaStaging/${uid}/${id}/source`;
   const usageRef=db.doc("pwnzMediaUsage/"+uid),reservationRef=db.doc("pwnzMediaReservations/"+id);
   const month=new Date().toISOString().slice(0,7),expiresAt=Timestamp.fromMillis(Date.now()+30*60*1000);
   await db.runTransaction(async tx=>{
    const snapshot=await tx.get(usageRef);
    const next=reserveQuota(snapshot.data(),month,media.bytes);
    tx.set(usageRef,{uid,...next,updatedAt:FieldValue.serverTimestamp()},{merge:true});
    tx.create(reservationRef,{uid,storagePath:path,expectedBytes:media.bytes,
      mimeType:media.mimeType,kind:media.kind,scope:media.scope,title:media.title,body:media.body,
      status:"reserved",createdAt:FieldValue.serverTimestamp(),expiresAt});
   });
   return respond(res,201,{ok:true,uploadId:id,storagePath:path,status:"reserved",expiresAt:expiresAt.toDate().toISOString()});
  }
  if(input.action==="complete"){
   const id=String(input.uploadId||"");
   if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id))
    throw Object.assign(new Error("Invalid upload ID."),{status:400});
   const ref=db.doc("pwnzMediaReservations/"+id),snapshot=await ref.get();
   if(!snapshot.exists||snapshot.data()?.uid!==uid)throw Object.assign(new Error("Upload reservation not found."),{status:404});
   const item=snapshot.data();
   if(item.status==="pending-review")return respond(res,200,{ok:true,status:"pending-review",uploadId:id});
   if(item.status!=="reserved"||item.expiresAt?.toMillis?.()<Date.now())
    throw Object.assign(new Error("Upload reservation expired or closed."),{status:409});
   const [metadata]=await bucket.file(item.storagePath).getMetadata();
   if(Number(metadata.size)!==item.expectedBytes||metadata.contentType!==item.mimeType||metadata.metadata?.scope!==item.scope||metadata.metadata?.kind!==item.kind)
    throw Object.assign(new Error("Uploaded media does not match the reservation."),{status:422});
   // Client MIME and metadata do not establish file safety. Keep private and unreviewed.
   await db.runTransaction(async tx=>{
    const fresh=await tx.get(ref);
    if(fresh.data()?.uid!==uid||!["reserved","pending-review"].includes(fresh.data()?.status))
      throw Object.assign(new Error("Upload no longer eligible for review."),{status:409});
    if(fresh.data().status==="reserved")tx.update(ref,{status:"pending-review",uploadedAt:FieldValue.serverTimestamp()});
   });
   return respond(res,200,{ok:true,status:"pending-review",uploadId:id});
  }
  return respond(res,400,{ok:false,error:"Unsupported media operation."});
 }catch(error){
  const status=[400,401,403,404,409,413,415,422,429].includes(error?.status)?error.status:500;
  if(status===500)console.error("PwnZ media intake failed",error?.name||"unknown");
  return respond(res,status,{ok:false,error:status===500?"Private media intake unavailable.":error.message});
 }
};
