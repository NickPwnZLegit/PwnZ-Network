// Same-origin PwnZ proxy to Light of Hope's trusted Eden RealID service.
// Current transition: Firebase email/password authenticates the user; Eden identity
// is created/verified by the shared Light of Hope registry. Future Hope Labs ZK
// authentication can replace the Firebase bootstrap without changing this contract.
module.exports=async function handler(req,res){
 res.setHeader("Cache-Control","no-store");
 if(req.method!=="POST"){res.setHeader("Allow","POST");return res.status(405).json({ok:false,error:"POST required"});}
 if(process.env.PWNZ_ECOSYSTEM_IDENTITY_ENABLED!=="true")return res.status(503).json({ok:false,error:"Ecosystem identity onboarding is not enabled yet."});
 const auth=String(req.headers.authorization||"");
 if(!/^Bearer [A-Za-z0-9._-]{20,4096}$/.test(auth))return res.status(401).json({ok:false,error:"Authenticated ecosystem session required."});
 const raw=typeof req.body==="string"?req.body:JSON.stringify(req.body||{});
 if(Buffer.byteLength(raw)>4096)return res.status(413).json({ok:false,error:"Identity request is too large."});
 let body={};try{body=typeof req.body==="string"?JSON.parse(req.body||"{}"):(req.body||{});}catch{return res.status(400).json({ok:false,error:"Invalid request."});}
 const action=String(body.action||"").trim();
 if(!["check","reserve-activate","validate-legacy"].includes(action))return res.status(400).json({ok:false,error:"Unsupported Eden RealID action."});
 try{
  const upstream=await fetch("https://light-of-hope.net/api/eden-realid",{
   method:"POST",
   headers:{"Content-Type":"application/json","Authorization":auth,"X-Hope-Ecosystem-Source":"pwnz-network"},
   body:JSON.stringify({action,requestedName:String(body.requestedName||"")}),
   signal:AbortSignal.timeout(12000)
  });
  const data=await upstream.json().catch(()=>({}));
  return res.status(upstream.status).json(data);
 }catch(error){
  return res.status(502).json({ok:false,error:"Shared Eden RealID service is temporarily unavailable."});
 }
};
