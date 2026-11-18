// PwnZ server media intake policy. Test-only preview gate, not public release.
// Trust the Firebase ID token, not claimed user identity, paid plan or quotas.
const MiB=1024*1024;
const MAX_STORED=500*MiB,MAX_UPLOAD_PER_MONTH=750*MiB;
const TYPE_LIMITS=Object.freeze({"image/jpeg":10*MiB,"image/png":10*MiB,"image/webp":10*MiB,"video/mp4":45*MiB,"video/webm":45*MiB});
const SCOPES=Object.freeze(["social","profile","creator","gaming","community"]);
function enabled(env=process.env){
 return env.VERCEL_ENV==="preview" && env.PWNZ_MEDIA_INTAKE_ENABLED==="true" &&
   env.PWNZ_SOCIAL_BACKEND_ENABLED==="true" && !!env.PWNZ_FIREBASE_STORAGE_BUCKET &&
   !!env.PWNZ_FIREBASE_PROJECT_ID && env.PWNZ_FIREBASE_PROJECT_ID===env.FIREBASE_ADMIN_PROJECT_ID &&
   !!env.FIREBASE_ADMIN_CLIENT_EMAIL && !!env.FIREBASE_ADMIN_PRIVATE_KEY;
}
function normalize(raw){
 if(!raw||typeof raw!=="object"||Array.isArray(raw))throw Object.assign(new Error("Invalid intake request."),{status:400});
 const {scope,mimeType,bytes}=raw;
 if(!SCOPES.includes(scope))throw Object.assign(new Error("Invalid post section."),{status:400});
 if(!Object.hasOwn(TYPE_LIMITS,mimeType))throw Object.assign(new Error("Unsupported video or image format."),{status:415});
 if(!Number.isSafeInteger(bytes)||bytes<1)throw Object.assign(new Error("Invalid upload size."),{status:400});
 if(bytes>TYPE_LIMITS[mimeType])throw Object.assign(new Error("File exceeds the upload limit."),{status:413});
 if(raw.title!=null&&typeof raw.title!=="string")throw Object.assign(new Error("Invalid title."),{status:400});
 if(raw.body!=null&&typeof raw.body!=="string")throw Object.assign(new Error("Invalid post text."),{status:400});
 if((raw.title||"").length>140||(raw.body||"").length>4000)throw Object.assign(new Error("Post text is too long."),{status:400});
 return Object.freeze({scope,mimeType,bytes,kind:mimeType.startsWith("video/")?"video":"image",title:(raw.title||"").trim(),body:(raw.body||"").trim()});
}
function reserveQuota(previous,month,bytes){
 if(!/^\d{4}-\d{2}$/.test(month))throw new Error("Invalid billing month.");
 const stored=previous?.storedReservedBytes??0;
 const monthly=previous?.month===month?(previous.monthlyReservedBytes??0):0;
 if(!Number.isSafeInteger(stored)||stored<0||!Number.isSafeInteger(monthly)||monthly<0)throw new Error("Usage record invalid.");
 if(stored+bytes>MAX_STORED)throw Object.assign(new Error("Stored media allowance reached."),{status:429});
 if(monthly+bytes>MAX_UPLOAD_PER_MONTH)throw Object.assign(new Error("Monthly media-upload allowance reached."),{status:429});
 return Object.freeze({storedReservedBytes:stored+bytes,monthlyReservedBytes:monthly+bytes,month});
}
function agreementAllows({pwnzProfile,edenProfile,edenOwner,edenAgreement,pwnzAgreement,nowMs=Date.now()}){
 if(!pwnzProfile||typeof pwnzProfile.handle!=="string"||!/^[a-z][a-z0-9_]{2,23}$/.test(pwnzProfile.handle))return false;
 const edenActive=!!(edenProfile&&edenOwner&&edenOwner.uid===pwnzProfile.uid&&
  (edenProfile.profileStatus==="active"||edenProfile.edenRealIdStatus==="activated_v16"||
    (edenOwner.status==="grandfathered"&&edenOwner.reservationType==="legacy-profile-migration"&&Number(edenProfile.memberNumber)>0)));
 const a=edenActive?edenAgreement:pwnzAgreement;
 const expiry=a?.expiresAt?.toMillis?.()??0;
 return edenActive
  ? a?.accepted===true&&a.agreementVersion==="v16-2026.08.27.1"&&expiry>nowMs
  : a?.accepted===true&&a.version==="pwnz-2026.10.30.1"&&expiry>nowMs;
}
module.exports={enabled,normalize,reserveQuota,agreementAllows,MAX_STORED,MAX_UPLOAD_PER_MONTH,SCOPES};
