import {initializeApp} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {getAuth,setPersistence,inMemoryPersistence,onAuthStateChanged,signInWithEmailAndPassword,signOut} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import {getFirestore,doc,getDoc} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
const $=id=>document.getElementById(id);
let auth=null,db=null;
function report(message){$("status").textContent=message;}
const allowedVersions=new Set(["v16-2026.08.27.1","ecosystem-2026.11.18.1"]);
async function readExistingAccount(user){
 const uid=user.uid;
 const [owner,profile,agreement,gamer]=await Promise.allSettled([
  getDoc(doc(db,"edenRealIdOwners",uid)),getDoc(doc(db,"profiles",uid)),
  getDoc(doc(db,"agreements",uid)),getDoc(doc(db,"pwnzProfiles",uid))
 ]);
 const read=(result)=>result.status==="fulfilled"?(result.value.exists()?result.value.data():null):undefined;
 const o=read(owner),p=read(profile),a=read(agreement),g=read(gamer);
 const active=Boolean(o&&p&&o.uid===uid&&(["active","grandfathered"].includes(o.status))&&(
  p.profileStatus==="active"||p.edenRealIdStatus==="activated_v16"||
  (o.status==="grandfathered"&&o.reservationType==="legacy-profile-migration"&&Number(p.memberNumber)>0)
 ));
 const name=active?(typeof o.displayName==="string"&&o.displayName.trim()?o.displayName.trim():(typeof p.edenRealID==="string"?p.edenRealID.trim():"")):"";
 $("eden").textContent=owner.status==="rejected"||profile.status==="rejected"?"Unable to verify with current Firestore permissions":
  active?(name?"Recognized: "+name.slice(0,64):"Recognized; display name unavailable"):"Not activated for this account";
 const expiry=a?.expiresAt?.toDate?.();
 $("agreement").textContent=agreement.status==="rejected"?"Unable to verify agreement":
  a?.accepted===true&&allowedVersions.has(a.agreementVersion)&&expiry instanceof Date&&expiry.getTime()>Date.now()?"Current":
  "Missing, expired, or needs renewal on Light of Hope";
 $("gamer").textContent=gamer.status==="rejected"?"Unable to verify with current Firestore permissions":
  typeof g?.handle==="string"&&/^[a-z][a-z0-9_]{2,23}$/.test(g.handle)?"@"+g.handle:"No Gamertag detected";
 report("Read-only check complete. No member records were modified.");
}
async function setup(){
 try{
  const response=await fetch("/api/pwnz-config",{cache:"no-store"});
  if(!response.ok)throw Error("Preview configuration unavailable");
  const cfg=await response.json();
  if(!cfg.configured||!cfg.sharedProjectVerified||!cfg.config)throw Error("Preview Firebase configuration is missing or does not match the declared shared project.");
  if(cfg.ready||cfg.enabled||cfg.gamertagRegistrationReady||cfg.edenRegistrarReady||cfg.pairedRegistrationReady||cfg.applicationsReady)
   throw Error("Preview requires all write and registration feature gates to remain OFF.");
  const app=initializeApp(cfg.config,"pwnz-v16-3-readonly-check");
  auth=getAuth(app);db=getFirestore(app);
  await setPersistence(auth,inMemoryPersistence);
  onAuthStateChanged(auth,async user=>{
   $("login").hidden=!!user;$("result").hidden=!user;
   if(user){report("Reading your own account status…");try{await readExistingAccount(user)}catch{report("Connection could not be checked. No account changes were made.");}}
   else report("Read-only preview ready. Sign in with an existing Eden account.");
  });
 }catch(e){report("TEST BLOCKED: "+e.message);}
}
$("form").addEventListener("submit",async e=>{
 e.preventDefault();if(!auth)return;
 const btn=$("signin");btn.disabled=true;
 try{
  await signInWithEmailAndPassword(auth,$("email").value.trim(),$("password").value);
  $("password").value="";
 }catch{report("Sign-in could not be verified. Check your existing credentials or the preview's Firebase authorized-domain settings.");$("password").value="";}
 finally{btn.disabled=false;}
});
$("signout").addEventListener("click",async()=>{if(auth){await signOut(auth);$("password").value="";}});
setup();