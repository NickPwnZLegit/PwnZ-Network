// PREVIEW-ONLY trusted moderator actions. ANNEAL suggestions are advisory and are
// never allowed to publish, delete, or hide posts. These actions require a
// verified Firebase ID token, moderator claim AND explicit UID allowlist.

const ID=/^[A-Za-z0-9]{10,50}(?:__[A-Za-z0-9_-]{1,128})?$/;
function gate(env=process.env){
 return env.VERCEL_ENV==="preview"&&env.PWNZ_MODERATION_ENABLED==="true"&&
 !!env.FIREBASE_ADMIN_PROJECT_ID&&!!env.FIREBASE_ADMIN_CLIENT_EMAIL&&!!env.FIREBASE_ADMIN_PRIVATE_KEY&&
 typeof env.PWNZ_MODERATOR_UIDS==="string"&&env.PWNZ_MODERATOR_UIDS.trim().length>0;
}
function authorized(decoded,env=process.env){
 return decoded?.pwnzModerator===true&&typeof decoded.uid==="string"&&
 (env.PWNZ_MODERATOR_UIDS||"").split(",").map(x=>x.trim()).includes(decoded.uid);
}
function respond(res,status,data){
 res.setHeader("Cache-Control","no-store");
 res.setHeader("X-Content-Type-Options","nosniff");
 return res.status(status).json(data);
}
function firebase(){
 const {getApps,initializeApp,cert}=require("firebase-admin/app");
 const {getAuth}=require("firebase-admin/auth");
 const {getFirestore,FieldValue}=require("firebase-admin/firestore");
 let app=getApps().find(x=>x.name==="pwnz-moderation");
 if(!app)app=initializeApp({credential:cert({
  projectId:process.env.FIREBASE_ADMIN_PROJECT_ID,
  clientEmail:process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
  privateKey:process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g,"\n")
 })},"pwnz-moderation");
 return {auth:getAuth(app),db:getFirestore(app)};
}
module.exports=async function handler(req,res){
 if(!["GET","POST"].includes(req.method))return respond(res,405,{ok:false,error:"Method not allowed."});
 if(!gate())return respond(res,503,{ok:false,error:"Private moderation console is disabled."});
 const header=String(req.headers?.authorization||"");
 if(!/^Bearer [A-Za-z0-9._-]{20,4096}$/.test(header))return respond(res,401,{ok:false,error:"Moderator sign-in required."});
 try{
  const {auth,db}=firebase();
  const decoded=await auth.verifyIdToken(header.slice(7),true);
  if(!authorized(decoded))return respond(res,403,{ok:false,error:"Moderator access denied."});
  if(req.method==="GET"){
   const snap=await db.collection("pwnzPostReports").where("status","==","pending").limit(25).get();
   const reports=snap.docs.map(d=>({
    id:d.id,postId:d.data().postId,reason:d.data().reason,
    createdAt:d.data().createdAt?.toDate?.()?.toISOString?.()||null
   }));
   return respond(res,200,{ok:true,reports});
  }
  const data=req.body&&typeof req.body==="object"&&!Array.isArray(req.body)?req.body:{};
  const action=data.action,reportId=String(data.reportId||"");
  if(!["hide-post","dismiss-report"].includes(action)||!ID.test(reportId))
    return respond(res,400,{ok:false,error:"Invalid moderation action."});
  const reportRef=db.collection("pwnzPostReports").doc(reportId);
  const result=await db.runTransaction(async tx=>{
   const report=await tx.get(reportRef);
   if(!report.exists||report.data().status!=="pending")throw Object.assign(new Error("Report not available."),{status:409});
   const postId=report.data().postId;
   if(typeof postId!=="string"||!/^[A-Za-z0-9]{10,50}$/.test(postId))throw Object.assign(new Error("Invalid report target."),{status:400});
   if(action==="hide-post"){
    const postRef=db.collection("pwnzPosts").doc(postId);
    const post=await tx.get(postRef);
    if(!post.exists)throw Object.assign(new Error("Post not available."),{status:404});
    tx.update(postRef,{status:"hidden",moderationReason:report.data().reason,
      moderationUpdatedAt:FieldValue.serverTimestamp()});
   }
   tx.update(reportRef,{status:action==="hide-post"?"reviewed-hidden":"dismissed",
     reviewedAt:FieldValue.serverTimestamp(),reviewedBy:decoded.uid});
   return {postId,action};
  });
  return respond(res,200,{ok:true,...result});
 }catch(e){
  const status=[400,401,403,404,409].includes(e?.status)?e.status:500;
  if(status===500)console.error("PwnZ moderation unavailable",e?.name||"unknown");
  return respond(res,status,{ok:false,error:status===500?"Moderation service temporarily unavailable.":e.message});
 }
};
module.exports._test={gate,authorized};
