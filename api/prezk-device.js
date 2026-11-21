// First-party preview bridge to the Light of Hope pre-ZK device service.
// Firebase account credential is verified by the upstream service, not here.
// Deliberately NOT a production login, personhood check or SSO mechanism.
const reply=(res,status,data)=>{res.setHeader("Cache-Control","private, no-store");res.setHeader("X-Content-Type-Options","nosniff");return res.status(status).json(data)};
module.exports=async function handler(req,res){
 if(!["GET","POST"].includes(req.method))return reply(res,405,{ok:false,error:"GET or POST required."});
 const target=process.env.PWNZ_PREZK_UPSTREAM_URL;
 if(process.env.VERCEL_ENV!=="preview"||process.env.PWNZ_PREZK_DEVICE_TEST_ENABLED!=="true"||!target)
  return reply(res,404,{ok:false,error:"Device proof testing is not enabled."});
 let url;
 try{url=new URL(target);}catch{return reply(res,503,{ok:false,error:"Device proof gateway not configured."})}
 if(url.protocol!=="https:"||!(url.hostname.startsWith("light-of-hope-site-")&&url.hostname.endsWith("-nicholas-peffleys-projects.vercel.app"))||
    url.pathname!=="/api/prezk-device"||url.port||url.username||url.password||
    url.search||url.hash)return reply(res,503,{ok:false,error:"Untrusted device gateway origin."});
 const authorization=String(req.headers.authorization||"");
 if(!/^Bearer [A-Za-z0-9._-]{20,4096}$/.test(authorization))return reply(res,401,{ok:false,error:"Authenticated Eden session required."});
 const body=req.method==="POST"?{...(req.body||{}),network:"pwnz"}:null;
 if(Buffer.byteLength(JSON.stringify(body||{}))>2400)return reply(res,413,{ok:false,error:"Request too large."});
 try{
  if(req.method==="GET")url.searchParams.set("network","pwnz");
  const upstream=await fetch(url,{
   method:req.method,headers:{Authorization:authorization,...(body?{"Content-Type":"application/json"}:{})},
   ...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(10000)
  });
  const value=await upstream.json().catch(()=>({ok:false,error:"Device gateway unavailable."}));
  return reply(res,upstream.status,value);
 }catch{return reply(res,502,{ok:false,error:"Shared device proof gateway temporarily unavailable."})}
};
