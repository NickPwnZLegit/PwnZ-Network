import {initializeApp} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {getAuth,onAuthStateChanged} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import {getFirestore,doc,getDoc,collection,query,where,limit,getDocs} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import {assessOwner,visibleLightMembers} from "./identity-policy.mjs";
const el=id=>document.getElementById(id);
const showError=(message)=>{
  el("hub-status").textContent=message;
  el("not-connected").hidden=false;
  el("connected").hidden=true;
};
let sessionRevision=0;
function appendNames(target, names) {
  target.replaceChildren();
  for(const name of names){
    const li=document.createElement("li");li.textContent=name;target.append(li);
  }
  if(!names.length){const li=document.createElement("li");li.textContent="No visible connections yet.";target.append(li);}
}
async function loadPeople(db,uid,revision){
  const status=el("members-status");
  try {
    const [outgoing,incoming]=await Promise.all([
      getDocs(query(collection(db,"lightMemberLinks"),where("ownerUid","==",uid),limit(100))),
      getDocs(query(collection(db,"lightMemberLinks"),where("memberUid","==",uid),limit(100)))
    ]);
    if(revision!==sessionRevision)return;
    const mine=visibleLightMembers(outgoing.docs.map(d=>d.data()),uid,"ownerUid");
    const theirs=visibleLightMembers(incoming.docs.map(d=>d.data()),uid,"memberUid");
    appendNames(el("added-by-me"),mine);
    appendNames(el("added-me"),theirs);
    el("members-lists").hidden=false;
    status.textContent="Showing active Light Member relationships associated with this account.";
  } catch(error){
    if(revision!==sessionRevision)return;
    el("members-lists").hidden=true;
    status.textContent="Light Members aren't available here yet. Shared Firestore rules must permit your own lists.";
  }
}
async function loadAccount(db,user,revision){
  const uid=user.uid;
  try{
    const [owner,profile,agreement,gamer]=await Promise.all([
      getDoc(doc(db,"edenRealIdOwners",uid)),
      getDoc(doc(db,"profiles",uid)),
      getDoc(doc(db,"agreements",uid)),
      getDoc(doc(db,"pwnzProfiles",uid))
    ]);
    if(revision!==sessionRevision)return;
    const result=assessOwner({
      uid,
      owner:owner.exists()?owner.data():null,
      profile:profile.exists()?profile.data():null,
      agreement:agreement.exists()?agreement.data():null,
      gamer:gamer.exists()?gamer.data():null
    });
    if(!result.activated){
      showError("This signed-in account has no verified active Eden RealID in the shared registry. Existing PwnZ-only members can continue using PwnZ while identity activation is reviewed.");
      el("next-action").textContent="Use the original registered email and password. Your account or Eden RealID may need activation; please do not create a duplicate account.";
      return;
    }
    el("not-connected").hidden=true;
    el("connected").hidden=false;
    el("realid").textContent=result.realId||"Eden RealID active (name unavailable)";
    el("gamertag").textContent=result.handle?"@"+result.handle:"PwnZ Gamertag not yet created";
    el("agreement").textContent=result.agreementCurrent
      ?"Your current community agreement is recognized for this account."
      :"Community agreement needs verification or renewal. Member-only services may be restricted.";
    el("hub-status").textContent="Eden RealID ownership is verified for this signed-in account. Connected services still enforce their own rules.";
    if(result.agreementCurrent)await loadPeople(db,uid,revision);
    else el("members-status").textContent="Renew or verify your community agreement before loading connections.";
  } catch(error){
    if(revision!==sessionRevision)return;
    showError("Could not verify this account with the shared Eden registry. No identity has been linked or modified.");
    el("next-action").textContent="Check that your original account is signed in and the shared Firebase rules have been deployed. Do not create another Eden RealID.";
  }
}
async function boot(){
  let data;
  try{
    const res=await fetch("/api/pwnz-config",{cache:"no-store"});
    if(!res.ok)throw Error("config unavailable");
    data=await res.json();
  }catch{showError("Shared account service is temporarily unavailable.");return;}
  if(!data?.ready||!data?.configured||!data?.sharedProjectVerified||!data.config){
    showError("Shared account linking is not active until PwnZ and EdenNetwork use the same verified Firebase project and security rules.");
    el("next-action").textContent="Existing users should continue signing in to their current accounts. Do not create another Eden RealID.";
    return;
  }
  try{
    const app=initializeApp(data.config);
    const auth=getAuth(app),db=getFirestore(app);
    onAuthStateChanged(auth,user=>{
      const revision=++sessionRevision;
      el("connected").hidden=true;
      el("members-lists").hidden=true;
      if(!user){
        showError("Sign in to your existing ecosystem account to see verified linked services.");
        el("next-action").textContent="Use the email and password belonging to your existing Eden RealID. You will not need a second account.";
        return;
      }
      el("hub-status").textContent="Verifying shared Eden RealID ownership…";
      loadAccount(db,user,revision);
    },()=>showError("Authentication could not be initialized. Account linking was not attempted."));
  }catch{showError("The shared account hub cannot initialize safely on this device.");}
}
boot();
