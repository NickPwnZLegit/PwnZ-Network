// PwnZ Messenger of Light adapter: reuse EXISTING Light of Hope conversation collections.
// This client never changes membership rules, creates an identity, or grants access.
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getAuth,onAuthStateChanged,signInWithEmailAndPassword,signOut } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import { getFirestore,collection,doc,getDoc,setDoc,addDoc,onSnapshot,query,where,orderBy,limit,serverTimestamp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";
const el=id=>document.getElementById(id);
const state={auth:null,db:null,user:null,unsubThreads:null,unsubMessages:null,threads:[],selected:null,gate:false,sessionNonce:0};
function status(s){el("status").textContent=s;}
function stopListeners(){if(state.unsubThreads){state.unsubThreads();state.unsubThreads=null;}if(state.unsubMessages){state.unsubMessages();state.unsubMessages=null;}}
function reset(){stopListeners();state.selected=null;state.threads=[];state.gate=false;el("threads").replaceChildren();el("messages").textContent="Your message history will appear here.";el("chatTitle").textContent="Choose a conversation";el("sendForm").hidden=true;el("report").hidden=true;el("inboxPanel").hidden=true;}
async function loadAuthorizedUser(user,nonce){
 const uid=user.uid;
 // These client checks improve UX only. Firestore rules MUST independently require
 // valid member(), both participants, unblocked messaging, and current agreement.
 const [profile,owner,agreement]=await Promise.all([
   getDoc(doc(state.db,"profiles",uid)),getDoc(doc(state.db,"edenRealIdOwners",uid)),getDoc(doc(state.db,"agreements",uid))
 ]);
 if(nonce!==state.sessionNonce)return;
 const p=profile.exists()?profile.data():null,o=owner.exists()?owner.data():null,a=agreement.exists()?agreement.data():null;
 const active=Boolean(p && o && o.uid===uid &&
   ((p.profileStatus==="active")||(p.edenRealIdStatus==="activated_v16")||
   (o.status==="grandfathered"&&o.reservationType==="legacy-profile-migration"&&Number(p.memberNumber)>0)));
 const expires=a?.expiresAt?.toDate?.();
 const currentAgreement=Boolean(a?.accepted && a.agreementVersion==="v16-2026.08.27.1" && expires instanceof Date && expires.getTime()>Date.now());
 if(!active||!currentAgreement){
   status("Messenger access requires an activated Light of Hope Eden RealID and current Community Rules Agreement. Complete that first on Light of Hope.");return;
 }
 state.gate=true;el("loginPanel").hidden=true;el("inboxPanel").hidden=false;
 el("accountName").textContent="Connected Light Member. Private messages stay in the existing Light of Hope conversations.";
 status("Verified member detected. Opening your existing private inbox.");
 state.unsubThreads=onSnapshot(query(collection(state.db,"lightConversations"),where("participants","array-contains",uid),limit(60)),
 snapshot=>{if(nonce!==state.sessionNonce)return;state.threads=snapshot.docs.map(d=>({id:d.id,...d.data()}));state.threads.sort((a,b)=>(b.lastMessageAt?.toMillis?.()||b.createdAt?.toMillis?.()||0)-(a.lastMessageAt?.toMillis?.()||a.createdAt?.toMillis?.()||0));renderThreads();},
 err=>status("Messenger inbox unavailable: "+err.message+" Ensure the shared Firestore security rules are deployed.")
 );
}
function renderThreads(){
 const container=el("threads");container.replaceChildren();
 if(!state.threads.length){container.textContent="No existing conversations yet. Start one in Light of Hope.";return;}
 state.threads.forEach(t=>{
  const peer=(t.participants||[]).find(u=>u!==state.user.uid);
  if(!peer)return;
  const button=document.createElement("button");
  button.type="button";button.className="thread";button.textContent="Light Member · "+peer.slice(0,5)+"…";
  button.setAttribute("aria-current",String(state.selected===t.id));
  button.addEventListener("click",()=>selectThread(t.id,peer));
  container.appendChild(button);
  // Only a PwnZ public alias is shown when it exists. Private Eden RealID is never read for peers.
  getDoc(doc(state.db,"pwnzProfiles",peer)).then(p=>{
   if(!button.isConnected)return;
   if(p.exists()&&typeof p.data().handle==="string")button.textContent="@"+p.data().handle;
   else button.textContent="Light Member";
  }).catch(()=>{button.textContent="Light Member";});
 });
}
function selectThread(id,peer){
 if(!state.gate||!state.user||!state.threads.some(t=>t.id===id&&(t.participants||[]).includes(state.user.uid)))return;
 if(state.unsubMessages){state.unsubMessages();state.unsubMessages=null;}
 state.selected=id;el("chatTitle").textContent="Light Member conversation";el("messages").textContent="Loading messages…";
 el("sendForm").hidden=false;el("report").hidden=false;renderThreads();
 state.unsubMessages=onSnapshot(query(collection(state.db,"lightConversations",id,"messages"),orderBy("createdAt","desc"),limit(100)),
 snap=>{
  const box=el("messages");box.replaceChildren();
  const entries=snap.docs.map(d=>d.data()).reverse();
  if(!entries.length){box.textContent="No messages yet. Start with kindness.";return;}
  for(const m of entries){
   const div=document.createElement("div");div.className="bubble"+(m.senderUid===state.user.uid?" mine":"");
   const text=document.createElement("span");text.textContent=m.body||"";
   const small=document.createElement("small");small.textContent=m.senderUid===state.user.uid?"You":"Light Member";
   div.append(text,small);box.append(div);
  }
  box.scrollTop=box.scrollHeight;
 },e=>status("Messages unavailable: "+e.message));
}
let foundMemberUid=null;
el("findMember").addEventListener("submit",async e=>{
 e.preventDefault();foundMemberUid=null;el("startMemberChat").hidden=true;
 if(!state.gate||!state.user){el("memberResult").textContent="Verified Light of Hope sign-in required.";return;}
 const handle=el("memberHandle").value.trim();
 if(!/^[a-z][a-z0-9_]{2,23}$/.test(handle)){el("memberResult").textContent="Enter an exact valid PwnZ handle.";return;}
 try{
  const record=await getDoc(doc(state.db,"pwnzHandles",handle));
  if(!record.exists()){el("memberResult").textContent="No profile found with that handle.";return;}
  const uid=record.data().uid;
  if(!uid||uid===state.user.uid){el("memberResult").textContent="Choose another member.";return;}
  // Do not expose uid to UI. Both members must have activated Eden identities;
  // Firestore rules remain the authoritative gate for conversation creation.
  const profile=await getDoc(doc(state.db,"pwnzProfiles",uid));
  if(!profile.exists()||profile.data().handle!==handle){
    el("memberResult").textContent="Profile is not available.";return;
  }
  foundMemberUid=uid;
  el("memberResult").textContent="@"+handle+" found. Conversation access is checked on creation.";
  el("startMemberChat").hidden=false;
 }catch(error){el("memberResult").textContent="Member search unavailable: "+error.message;}
});
el("startMemberChat").addEventListener("click",async()=>{
 if(!state.gate||!state.user||!foundMemberUid)return;
 const peer=foundMemberUid,participants=[state.user.uid,peer].sort(),id=participants.join("__");
 const button=el("startMemberChat");button.disabled=true;
 try{
  const existing=await getDoc(doc(state.db,"lightConversations",id));
  if(!existing.exists()){
    await setDoc(doc(state.db,"lightConversations",id),{
      participants,type:"direct",createdAt:serverTimestamp(),lastMessageAt:serverTimestamp()
    });
  }
  const record=await getDoc(doc(state.db,"lightConversations",id));
  if(!record.exists()||!record.data().participants?.includes(state.user.uid))throw Error("Access not authorized.");
  status("Conversation opened. Light of Hope permissions remain enforced.");
  selectThread(id,peer);
 }catch(error){status("Unable to start conversation: "+error.message+" Check verified member eligibility and block permissions.");}
 finally{button.disabled=false;}
});
el("sendForm").addEventListener("submit",async e=>{
 e.preventDefault();const id=state.selected,uid=state.user?.uid,body=el("draft").value.trim();
 if(!state.gate||!id||!uid||!body)return;
 const button=e.submitter;button.disabled=true;
 try{
  const convo=await getDoc(doc(state.db,"lightConversations",id));
  if(!convo.exists()||convo.data().type!=="direct"||!(convo.data().participants||[]).includes(uid))throw Error("Conversation access denied.");
  await addDoc(collection(state.db,"lightConversations",id,"messages"),{senderUid:uid,body:body.slice(0,3000),createdAtIso:new Date().toISOString(),createdAt:serverTimestamp()});
  el("draft").value="";status("Message submitted to the shared Messenger of Light inbox.");
 }catch(err){status("Could not send: "+err.message);}finally{button.disabled=false;}
});
el("report").addEventListener("click",async()=>{
 const id=state.selected;if(!id||!state.gate)return;const reason=window.prompt("Describe the reason for this report (max 400 characters).");
 if(!reason?.trim())return;
 try{await addDoc(collection(state.db,"lightMessageReports"),{reporterUid:state.user.uid,conversationId:id,reason:reason.trim().slice(0,400),status:"pending",createdAt:serverTimestamp()});status("Conversation report submitted.");}
 catch(e){status("Report failed: "+e.message);}
});
el("loginForm").addEventListener("submit",async e=>{
 e.preventDefault();if(!state.auth)return;
 const button=e.submitter;button.disabled=true;
 try{await signInWithEmailAndPassword(state.auth,el("email").value.trim(),el("password").value);el("password").value="";}
 catch(err){status("Sign-in failed: "+err.message);}finally{button.disabled=false;}
});
el("logout").addEventListener("click",async()=>{if(state.auth)await signOut(state.auth);});
(async()=>{
 try{
  const res=await fetch("/api/pwnz-config",{cache:"no-store"});
  if(!res.ok)throw Error("Configuration not available");
  const data=await res.json();
  if(!data.ready||!data.config){status("Messenger preview is available, but shared Firebase configuration is not connected. Open your existing inbox on Light of Hope.");return;}
  const app=initializeApp(data.config);
  state.auth=getAuth(app);state.db=getFirestore(app);
  onAuthStateChanged(state.auth,async user=>{
   const nonce=++state.sessionNonce;reset();state.user=user;
   if(!user){el("loginPanel").hidden=false;status("Sign in with a verified Light of Hope account to use your existing inbox.");return;}
   el("loginPanel").hidden=true;status("Checking your active Eden RealID and agreement…");
   try{await loadAuthorizedUser(user,nonce);}catch(e){if(nonce===state.sessionNonce)status("Identity check unavailable: "+e.message);}
  });
 }catch(err){status("Messenger not connected: "+err.message);}
})();
