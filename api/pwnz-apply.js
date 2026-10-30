// Same-origin PwnZ proxy to Light of Hope's reviewed application service.
// No approval or email is performed here; the trusted service owns those actions.
module.exports=async function handler(req,res){
 res.setHeader("Cache-Control","no-store");
 if(req.method!=="POST"){res.setHeader("Allow","POST");return res.status(405).json({ok:false,error:"POST required"});}
 if(process.env.PWNZ_APPLICATIONS_ENABLED!=="true")return res.status(503).json({ok:false,error:"PwnZ applications are not open yet."});
 const auth=String(req.headers.authorization||"");
 if(!/^Bearer [A-Za-z0-9._-]{20,4096}$/.test(auth))return res.status(401).json({ok:false,error:"Authenticated session required."});
 const length=Buffer.byteLength(JSON.stringify(req.body||{}));
 if(length>8500)return res.status(413).json({ok:false,error:"Application is too large."});
 const category=req.body?.category;
 if(!["pwnz-gamer","pwnz-game-creator","pwnz-original-game"].includes(category))return res.status(400).json({ok:false,error:"Invalid PwnZ category."});
 try{
  const upstream=await fetch("https://light-of-hope.net/api/community-registration",{
   method:"POST",headers:{"Content-Type":"application/json","Authorization":auth},body:JSON.stringify(req.body),signal:AbortSignal.timeout(12000)
  });
  const data=await upstream.json().catch(()=>({}));
  return res.status(upstream.status).json({ok:upstream.ok,status:data.status||null,notificationStatus:data.notificationStatus||null,error:upstream.ok?null:data.error||"Unable to submit application."});
 }catch(e){return res.status(502).json({ok:false,error:"Application review service is temporarily unavailable."});}
};
