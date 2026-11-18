// PwnZ to the primary Eden RealID registration API.
// Authenticated, same-origin proxy, preview gated until Firebase project parity,
// registrar permission and end-to-end account recovery tests are complete.
// The primary Light of Hope registrar verifies the Firebase ID token and
// transactionally locks the Eden name. PwnZ never issues a second identity.
const ACTIONS=new Set(["check","reserve-activate","validate-legacy"]);
const NAME=/^[\p{L}\p{N}_ .'-]{4,64}$/u;
function enabled(env=process.env){
 return env.VERCEL_ENV==="preview"&&env.PWNZ_EDEN_REGISTRY_ENABLED==="true"&&
 !!env.PWNZ_FIREBASE_PROJECT_ID&&!!env.EDEN_SHARED_FIREBASE_PROJECT_ID&&
 env.PWNZ_FIREBASE_PROJECT_ID===env.EDEN_SHARED_FIREBASE_PROJECT_ID;
}
function bodyInput(raw){
 const data=raw&&typeof raw==="object"&&!Array.isArray(raw)?raw:{};
 if(!ACTIONS.has(data.action))throw Object.assign(new Error("Unsupported registry action."),{status:400});
 if(data.action!=="validate-legacy"&&
  (typeof data.requestedName!=="string"||!NAME.test(data.requestedName.trim())))
  throw Object.assign(new Error("Choose a valid Eden RealID name."),{status:400});
 return {action:data.action,...(data.action==="validate-legacy"?{}:{requestedName:data.requestedName.trim()})};
}
function send(res,status,data){res.setHeader("Cache-Control","no-store");return res.status(status).json(data);}
module.exports=async function handler(req,res){
 if(req.method==="GET")return send(res,200,{available:enabled(),registry:"shared-eden-realid",humanUniquenessProved:false});
 if(req.method!=="POST")return send(res,405,{ok:false,error:"POST required."});
 if(!enabled())return send(res,503,{ok:false,error:"Shared registry is not enabled in this preview."});
 const header=String(req.headers?.authorization||"");
 if(!/^Bearer [A-Za-z0-9._-]{20,4096}$/.test(header))return send(res,401,{ok:false,error:"Sign in first."});
 if(Buffer.byteLength(JSON.stringify(req.body||{}))>1200)return send(res,413,{ok:false,error:"Registry request too large."});
 try{
  const data=bodyInput(req.body);
  const response=await fetch("https://light-of-hope.net/api/eden-realid",{
   method:"POST",headers:{"Content-Type":"application/json","Authorization":header},
   body:JSON.stringify(data),redirect:"error",signal:AbortSignal.timeout(12000)
  });
  const upstream=await response.json().catch(()=>({}));
  if(!response.ok)return send(res,[400,401,402,403,404,409,422,429,503].includes(response.status)?response.status:502,
    {ok:false,error:String(upstream.message||upstream.error||"Shared registry request could not be completed.").slice(0,300)});
  // Never forward a private profile record, server token or raw registry map.
  return send(res,200,{ok:true,status:upstream.status||null,
    displayName:upstream.displayName||upstream.activation?.displayName||null,
    available:upstream.available===true,
    reason:upstream.reason||null,registered: data.action==="reserve-activate"});
 }catch(e){
  if(e.status)return send(res,e.status,{ok:false,error:e.message});
  return send(res,502,{ok:false,error:"Primary Eden registrar is temporarily unavailable; your account remains recoverable."});
 }
};
module.exports._test={enabled,bodyInput};
