import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { evaluatePwnzBadges } from "./badges.js";
import {parsePwnzMediaLink,extractPwnzMediaCards,safePwnzEmbedUrl} from "./external-media.mjs";
import {validateClipMetadata,validateClipDuration,CLIP_DURATION_SECONDS} from "./clip-intake-policy.mjs";
import { getFirestore, doc, collection, getDoc, getDocs, runTransaction, addDoc, setDoc, deleteDoc, serverTimestamp, query, where, orderBy, limit, onSnapshot } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const $ = id => document.getElementById(id);
const escapeHTML = str => String(str ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
const AGREEMENT_VERSION='pwnz-2026.10.30.1';
const handlePattern = /^[a-z][a-z0-9_]{2,23}$/;
const state = {auth:null,db:null,user:null,profile:null,unsubscribe:null,posts:[],following:new Set(),verifiedEden:false,postCount:0,youtubeCount:0,authMode:"register",badgeStatsReady:false,agreementCurrent:false,edenActive:false,authAction:"register",backendReady:false,edenLookup:"unchecked"};
function notice(message){ $("notice").textContent=message; }
function getVideoId(url){try{const u=new URL(url), h=u.hostname.toLowerCase().replace(/^www\./,"");let id="";if(h==="youtu.be")id=u.pathname.split("/")[1]||"";else if(["youtube.com","m.youtube.com"].includes(h)){if(u.pathname==="/watch")id=u.searchParams.get("v")||"";else if(/^\/(shorts|embed|live)\//.test(u.pathname))id=u.pathname.split("/")[2]||"";}return /^[A-Za-z0-9_-]{11}$/.test(id)?id:null;}catch{return null;}}
function twitchName(raw){const v=String(raw||"").trim().replace(/^@/,"");return /^[A-Za-z0-9_]{3,25}$/.test(v)?v:"";}
async function init(){
 try{
  const response=await fetch("/api/pwnz-config",{cache:"no-store"});
  if(!response.ok)throw new Error("Configuration endpoint unavailable");
  const info=await response.json();
  if(!info.configured||!info.config){$("auth-panel").hidden=false; notice("Firebase authentication configuration is missing."); return;}
  state.backendReady=Boolean(info.ready);
  const app=initializeApp(info.config);
  state.auth=getAuth(app);state.db=getFirestore(app);
  $("auth-panel").hidden=false;
  onAuthStateChanged(state.auth,async user=>{
   state.user=user; state.profile=null; state.following=new Set();
   state.agreementCurrent=false;state.edenActive=false;state.verifiedEden=false;state.edenLookup="unchecked";state.postCount=0;state.youtubeCount=0;state.badgeStatsReady=false;
   if(user){
     // Read only the signed-in user's own Eden and gamer profile even while
     // PwnZ posting/registration remains gated at the backend.
     await Promise.all([loadProfile(),checkEdenStatus(),...(state.backendReady?[loadFollowing()]:[])]);
     if(state.backendReady){await loadAgreement();await refreshBadgeProgress();}
   }
   state.agreementCurrent=state.edenActive?state.verifiedEden:state.agreementCurrent;
   renderSession(); if(state.backendReady)watchPosts();
   if(!state.backendReady)notice(user?"Email sign-in succeeded. PwnZ profiles and Eden verification are paused until Firebase rules are installed.":"Email sign-in is available. PwnZ registration and social features remain locked until Firebase activation.");
  });
 }catch(e){notice("Social connectivity unavailable. "+e.message);}
}
async function loadAgreement(){
 if(state.edenActive){state.agreementCurrent=state.verifiedEden;return;}
 try{const record=await getDoc(doc(state.db,"pwnzAgreements",state.user.uid));
  const a=record.exists()?record.data():{};
  state.agreementCurrent=state.edenActive ? state.verifiedEden : (a.version===AGREEMENT_VERSION&&a.accepted===true&&a.expiresAt?.toMillis?.()>Date.now());
 }catch(e){state.agreementCurrent=false;notice("Agreement permission check unavailable. Community posting remains locked.");}
}
$("agree-submit").addEventListener("click",async()=>{
 if(!state.user||!state.db||state.edenActive||!$("agree-check").checked){$("agree-status").textContent="Please read and check the agreement first.";return;}
 const btn=$("agree-submit");btn.disabled=true;
 try{
  const now=Date.now();
  await setDoc(doc(state.db,"pwnzAgreements",state.user.uid),{uid:state.user.uid,accepted:true,version:AGREEMENT_VERSION,acceptedAt:serverTimestamp(),expiresAt:new Date(now+30*24*60*60*1000-5*60*1000)});
  await loadAgreement();renderSession();notice("PwnZ agreement accepted. Your community access is available.");
 }catch(e){$("agree-status").textContent="Could not save agreement: "+e.message;}
 finally{btn.disabled=false;}
});
function identityMessage(){
 if(!state.user)return "Choose an ecosystem account path above.";
 if(!state.backendReady)return "Firebase sign-in works. PwnZ Gamertag registration is paused until the social backend is enabled and its Firestore rules are verified. Do not create another Eden RealID.";
 if(state.edenLookup==="unavailable")return "Signed in, but Eden RealID verification could not be completed. Review your original Light of Hope account and try again. Nothing was changed.";
 if(!state.edenActive)return "Signed in, but this account's existing Eden RealID is not yet verified here. Review or activate the original Light of Hope profile, then recheck. Do not register again.";
 return state.verifiedEden
  ?"✓ Eden RealID verified across the ecosystem. Your PwnZ Gamertag stays separate."
  :"✓ Eden RealID linked. Renew the current community agreement on Light of Hope before participating.";
}
function renderSession(){
 const signed=Boolean(state.user);
 $("community-agreement").hidden=!(signed&&state.backendReady&&state.profile&&!state.agreementCurrent&&!state.edenActive);
 $("eden-renewal").hidden=!(signed&&state.edenActive&&!state.verifiedEden);
 $("login-form").hidden=signed;$("signed-in").hidden=!signed;$("profile-form").hidden=!(signed&&state.backendReady&&state.agreementCurrent);
 $("compose").hidden=!(signed&&state.profile&&state.agreementCurrent);$("profile-display").hidden=!state.profile;
 $("signed-name").textContent=state.profile?"@"+state.profile.handle:(state.edenActive?"Eden member":state.user?.email||"");
 $("profile-role").textContent=state.profile?"Current role: PwnZ Member. Applications are reviewed, not automatically approved.":"";
 $("identity-state").textContent=identityMessage();
 $("identity-recovery").hidden=!signed||(state.backendReady&&state.edenActive&&state.verifiedEden);
 $("identity-recovery-text").textContent=!state.backendReady
  ?"Your signed-in account is preserved. PwnZ's backend is not active, so Gamertag creation remains locked. Rechecking identity does not grant access."
  :(state.edenLookup==="unavailable"?"Eden verification is unavailable. Retry the check, without creating a new account."
   :"If your Eden RealID already exists on Light of Hope, review its activation or agreement there, then return using the same account.");
 renderBadges();
 if(state.profile){
  $("handle-current").textContent="@"+state.profile.handle;
  $("bio").value=state.profile.bio||"";$("twitch").value=state.profile.twitch||"";
  $("youtube").value=state.profile.youtube||"";
  $("handle-entry").hidden=true;
  $("role-application").hidden=!state.agreementCurrent;
  $("profile-note").textContent=state.agreementCurrent?"Your PwnZ profile is ready. Your Eden RealID stays private.":"Your PwnZ name is reserved. Accept the 30-day PwnZ agreement below to participate.";
 }else{
  $("handle-entry").hidden=!(signed&&state.backendReady&&state.edenActive);
  $("role-application").hidden=true;
  $("profile-note").textContent=signed?(!state.backendReady
  ?"Gamertag creation is paused by the PwnZ backend. Your sign-in is preserved."
  :state.edenLookup==="unavailable"?"Could not verify this account's Eden RealID. Recheck the connection."
  :state.edenActive?"Choose your PwnZ gamer name. It links to your Eden identity without replacing it."
  :"Review your existing Eden RealID on Light of Hope, then recheck here. Do not create a duplicate account."):"Sign in to create a PwnZ profile.";
 }
 renderPosts();
}
async function loadProfile(){
 try{const snap=await getDoc(doc(state.db,"pwnzProfiles",state.user.uid));state.profile=snap.exists()?snap.data():null;}
 catch(e){notice("Profile read failed: "+e.message);}
}
async function checkEdenStatus(){
 if(!state.db||!state.user)return;
 try{
  const uid=state.user.uid;
  const [p,o,a]=await Promise.all([
   getDoc(doc(state.db,"profiles",uid)),
   getDoc(doc(state.db,"edenRealIdOwners",uid)),
   getDoc(doc(state.db,"agreements",uid))
  ]);
  const profile=p.exists()?p.data():null,owner=o.exists()?o.data():null,agreement=a.exists()?a.data():null;
  const active=Boolean(profile&&owner&&owner.uid===uid
    &&(profile.profileStatus==="active"||profile.edenRealIdStatus==="activated_v16"
      ||(owner.status==="grandfathered"&&owner.reservationType==="legacy-profile-migration"&&Number(profile.memberNumber)>0)));
  const expiry=agreement?.expiresAt?.toDate?.();
  state.edenActive=active;
  state.edenLookup=active?"active":(!o.exists()?"missing-owner":!p.exists()?"missing-profile":"inactive");
  state.verifiedEden=Boolean(active&&agreement?.accepted===true
    &&agreement.agreementVersion==="v16-2026.08.27.1"
    &&expiry instanceof Date&&expiry.getTime()>Date.now());
 }catch(e){state.edenActive=false;state.verifiedEden=false;state.edenLookup="unavailable";
  notice("Eden account verification could not be completed. Your PwnZ account was not changed.");}
}
async function refreshBadgeProgress(){
 if(!state.profile||!state.db||!state.user)return;
 try{
  const snaps=await getDocs(query(collection(state.db,"pwnzPosts"),
     where("authorUid","==",state.user.uid),where("status","==","published"),limit(6)));
  state.postCount=snaps.size;
  state.youtubeCount=snaps.docs.filter(d=>typeof d.data().youtubeId==="string").length;
  state.badgeStatsReady=true;
 }catch(e){state.badgeStatsReady=false;notice("Badge milestones cannot be verified until Firestore indexes and rules are deployed.");}
 renderBadges();
}
function renderBadges(){
 const host=$("badges");host.replaceChildren();
 const badgeList=evaluatePwnzBadges({hasProfile:Boolean(state.profile),
   postCount:state.postCount,followCount:state.following.size,
   youtubeCount:state.youtubeCount,verifiedEden:state.verifiedEden});
 badgeList.forEach(b=>{
  const card=document.createElement("div");card.className="badge-card"+(b.earned?" earned":"");
  const symbol=document.createElement("div");symbol.className="badge-symbol";symbol.textContent=b.symbol;
  const name=document.createElement("strong");name.textContent=b.name;
  const desc=document.createElement("small");desc.textContent=b.description;
  const status=document.createElement("span");status.className="badge-state";
  status.textContent=b.earned?"Earned":b.planned?"Future":"Locked";
  card.append(symbol,name,desc,status);host.append(card);
 });
 $("badges-note").textContent=state.profile
   ?(state.badgeStatsReady?"Cosmetic badges are calculated from actual community activity, not tokens or transferable NFTs.":"Member badge is active. Activity badges will appear after database indexing and verification.")
   :"Create your PwnZ profile to unlock your first badge.";
}
function chooseAuthMode(mode){
 state.authMode=mode;
 if(mode==="eden")state.authAction="signin";
 document.querySelectorAll("[data-auth-mode]").forEach(x=>x.setAttribute("aria-pressed",String(x.dataset.authMode===mode)));
 $("pwnz-account-actions").hidden=mode==="eden";
 const newEden=$("new-eden-name");
 if(newEden)newEden.hidden=mode==="eden"||state.authAction==="signin";
 $("auth-submit").textContent=mode==="eden"?"Sign in with existing Eden account":state.authAction==="register"?"Create ecosystem account":"Sign in";
 $("auth-help").textContent=mode==="eden"
  ?"During the transition, use the email and password already tied to your verified Eden RealID. Hope Labs ZK will replace this bootstrap later without changing your PwnZ profile."
  :(state.authAction==="register"
    ?"Create one Eden RealID and one PwnZ gamer name under the same ecosystem account. Email/password is temporary until ZK enrollment is available."
    :"Sign in to your existing transitional account. Your Eden identity remains the ecosystem anchor.");
}
document.querySelectorAll("[data-auth-mode]").forEach(x=>x.addEventListener("click",()=>chooseAuthMode(x.dataset.authMode)));
document.querySelectorAll("[data-auth-action]").forEach(x=>x.addEventListener("click",()=>{
 state.authAction=x.dataset.authAction;
 document.querySelectorAll("[data-auth-action]").forEach(y=>y.setAttribute("aria-pressed",String(y===x)));
 chooseAuthMode("pwnz");
}));
async function refreshExistingEdenAccount(){
 if(!state.user||!state.db)return;
 const button=$("identity-recheck");if(button)button.disabled=true;
 try{
  await checkEdenStatus();
  if(state.backendReady)await loadAgreement();
  state.agreementCurrent=state.edenActive?state.verifiedEden:state.agreementCurrent;
  renderSession();
  notice(!state.backendReady
   ?"PwnZ backend activation is still pending. Your account has not been changed."
   :state.edenLookup==="unavailable"?"Eden verification is temporarily unavailable."
   :state.edenActive?"Eden RealID recognized. Your Gamertag is available when the agreement is current."
   :"Eden RealID not verified here. Review the original Light of Hope profile, then recheck.");
 }finally{if(button)button.disabled=false;}
}
$("recheck-eden").addEventListener("click",refreshExistingEdenAccount);
$("identity-recheck").addEventListener("click",refreshExistingEdenAccount);
chooseAuthMode("pwnz");
async function loadFollowing(){
 if(!state.user)return;
 try{const snap=await getDocs(query(collection(state.db,"pwnzFollows"),where("followerUid","==",state.user.uid),limit(250)));state.following=new Set(snap.docs.map(d=>d.data().followedUid));}
 catch(e){notice("Following list unavailable: "+e.message);}
}
function watchPosts(){
 if(state.unsubscribe){state.unsubscribe();state.unsubscribe=null;}
 if(!state.db)return;
 state.unsubscribe=onSnapshot(query(collection(state.db,"pwnzPosts"),where("status","==","published"),orderBy("createdAt","desc"),limit(30)),snapshot=>{
  state.posts=snapshot.docs.map(d=>({id:d.id,...d.data()}));renderPosts();
 },e=>{notice("Feed unavailable: "+e.message+" Check Firestore rules and indexes.");});
}
function renderPosts(){
 const host=$("posts");host.replaceChildren();
 if(!state.posts.length){host.textContent="No community posts yet. The first creator can start the conversation.";return;}
 state.posts.forEach(post=>{
  const card=document.createElement("article");card.className="post";
  const top=document.createElement("div");top.className="post-top";
  const handle=document.createElement("strong");handle.textContent="@"+(post.authorHandle||"creator");
  top.append(handle);
  const canFollow=state.user&&state.user.uid!==post.authorUid&&state.profile&&state.agreementCurrent;
  if(canFollow){
   const follow=document.createElement("button");follow.type="button";follow.className="mini";
   follow.textContent=state.following.has(post.authorUid)?"Following":"Follow";
   follow.addEventListener("click",async()=>{follow.disabled=true;try{const id=state.user.uid+"__"+post.authorUid;if(state.following.has(post.authorUid)){await deleteDoc(doc(state.db,"pwnzFollows",id));state.following.delete(post.authorUid);}else{await setDoc(doc(state.db,"pwnzFollows",id),{followerUid:state.user.uid,followedUid:post.authorUid,createdAt:serverTimestamp()});state.following.add(post.authorUid);}renderBadges();renderPosts();}catch(e){notice(e.message);follow.disabled=false;}});
   top.append(follow);
  }
  const title=document.createElement("h3");title.textContent=post.title||"Creator update";
  const body=document.createElement("p");body.textContent=post.body||"";
  card.append(top,title,body);
  // A deliberate click opens an official allowlisted embed on PwnZ.
  // No third-party iframe or video is loaded until the viewer opts in.
  const linked=extractPwnzMediaCards(post.body,3);
  if(post.youtubeId){
   const video=parsePwnzMediaLink("https://www.youtube.com/watch?v="+post.youtubeId);
   if(!linked.some(m=>m.url===video.url))linked.unshift(video);
  }
  if(post.twitch){
   const video=parsePwnzMediaLink("https://www.twitch.tv/"+post.twitch);
   if(!linked.some(m=>m.url===video.url))linked.push(video);
  }
  for(const media of linked.slice(0,4)){
   const frame=document.createElement("section");frame.className="pwnz-video-card";
   const brand=document.createElement("strong");brand.textContent=media.provider.toUpperCase()+" video";
   const controls=document.createElement("div");controls.className="pwnz-video-actions";
   const play=document.createElement("button");play.type="button";play.className="mini";
   play.textContent="▶ Expand & play";
   const original=document.createElement("a");original.href=media.url;original.target="_blank";
   original.rel="noopener noreferrer";original.className="mini";
   original.textContent="Original link ↗";original.setAttribute("aria-label","Open original video on "+media.provider);
   const status=document.createElement("small");status.className="muted";
   status.textContent="Playback stays on PwnZ when the original provider allows embedding.";
   play.addEventListener("click",()=>{
    const prior=frame.querySelector("iframe");
    if(prior){prior.remove();play.textContent="▶ Expand & play";play.setAttribute("aria-expanded","false");return;}
    const url=safePwnzEmbedUrl(media,window.location.hostname);
    if(!url){status.textContent="This link cannot be embedded safely; open the original.";return;}
    const wrapper=document.createElement("div");wrapper.className="video";
    const iframe=document.createElement("iframe");
    iframe.src=url;iframe.title=media.provider+" embedded video";
    iframe.loading="lazy";iframe.referrerPolicy="strict-origin-when-cross-origin";
    iframe.allow="autoplay; encrypted-media; picture-in-picture; fullscreen";
    iframe.allowFullscreen=true;wrapper.append(iframe);frame.append(wrapper);
    play.textContent="■ Collapse & stop";play.setAttribute("aria-expanded","true");
   });
   play.setAttribute("aria-expanded","false");
   controls.append(play,original);frame.append(brand,controls,status);card.append(frame);
  }
  const actions=document.createElement("div");actions.className="post-actions";
  const comment=document.createElement("button");comment.type="button";comment.className="mini";comment.textContent="Comments";
  const commentsBox=document.createElement("div");commentsBox.hidden=true;commentsBox.className="comment-box";
  comment.addEventListener("click",()=>{commentsBox.hidden=!commentsBox.hidden;if(!commentsBox.hidden)loadComments(post.id,commentsBox);});
  if(state.user&&state.profile&&state.agreementCurrent){
   const heart=document.createElement("button");heart.type="button";heart.className="mini";heart.textContent="♡ Heart";
   heart.setAttribute("aria-label","Toggle heart for this post");
   const likeRef=doc(state.db,"pwnzHearts",post.id+"__"+state.user.uid);
   getDoc(likeRef).then(snap=>{if(heart.isConnected)heart.textContent=snap.exists()?"♥ Hearted":"♡ Heart";}).catch(()=>{});
   heart.addEventListener("click",async()=>{
    heart.disabled=true;
    try{const current=await getDoc(likeRef);
     if(current.exists()){await deleteDoc(likeRef);heart.textContent="♡ Heart";}
     else{await setDoc(likeRef,{uid:state.user.uid,postId:post.id,createdAt:serverTimestamp()});heart.textContent="♥ Heart";}
    }catch(error){notice("Heart unavailable: "+error.message);}
    finally{heart.disabled=false;}
   });
   actions.append(heart);
  }
  actions.append(comment);
  if(state.user?.uid===post.authorUid){const del=document.createElement("button");del.type="button";del.className="mini";del.textContent="Delete";del.addEventListener("click",async()=>{if(!confirm("Delete your post?"))return;try{await deleteDoc(doc(state.db,"pwnzPosts",post.id));await refreshBadgeProgress();notice("Post deleted.");}catch(e){notice(e.message);}});actions.append(del);}
  card.append(actions,commentsBox);host.append(card);
 });
}
async function loadComments(postId,box){
 box.replaceChildren();
 const list=document.createElement("div");list.className="comment-list";list.textContent="Loading comments…";box.append(list);
 try{
  const snap=await getDocs(query(collection(state.db,"pwnzComments"),where("postId","==",postId),orderBy("createdAt","asc"),limit(50)));
  list.replaceChildren();
  if(snap.empty)list.textContent="No comments yet.";
  snap.forEach(item=>{
   const c=item.data();const entry=document.createElement("div");entry.className="comment";
   const name=document.createElement("strong");name.textContent="@"+(c.authorHandle||"member")+": ";
   const text=document.createElement("span");text.textContent=c.body||"";
   entry.append(name,text);
   if(state.user?.uid===c.authorUid){const del=document.createElement("button");del.className="mini";del.type="button";del.textContent="Remove";del.addEventListener("click",async()=>{try{await deleteDoc(item.ref);await loadComments(postId,box);}catch(e){notice(e.message);}});entry.append(del);}
   list.append(entry);
  });
  if(state.user&&state.profile){
   const form=document.createElement("form");form.className="comment-form";
   const input=document.createElement("input");input.required=true;input.maxLength=500;input.placeholder="Write a comment (max 500)…";input.setAttribute("aria-label","Write a comment");
   const submit=document.createElement("button");submit.className="mini";submit.textContent="Reply";
   form.append(input,submit);
   form.addEventListener("submit",async e=>{e.preventDefault();const body=input.value.trim();if(!body)return;submit.disabled=true;try{await addDoc(collection(state.db,"pwnzComments"),{postId,authorUid:state.user.uid,authorHandle:state.profile.handle,body,createdAt:serverTimestamp()});await loadComments(postId,box);}catch(e){notice(e.message);submit.disabled=false;}});
   box.append(form);
  }else{const p=document.createElement("p");p.textContent="Sign in and create your PwnZ profile to comment.";box.append(p);}
 }catch(e){list.textContent="Comments unavailable: "+e.message;}
}
$("login-form").addEventListener("submit",async e=>{e.preventDefault();if(!state.auth)return;
 const email=$("email").value.trim(),pass=$("password").value;
 const creating=state.authMode==="pwnz"&&state.authAction==="register";
 const requestedEdenRealId=creating?$("eden-realid").value.trim():"";
 $("auth-submit").disabled=true;
 try{
   if(creating&&!state.backendReady)throw new Error("New ecosystem registration is paused until Firebase permissions are installed.");
   if(creating&&!requestedEdenRealId)throw new Error("Create an Eden RealID before continuing.");
   let credential;
   if(creating)credential=await createUserWithEmailAndPassword(state.auth,email,pass);
   else credential=await signInWithEmailAndPassword(state.auth,email,pass);
   if(creating){
     const token=await credential.user.getIdToken();
     const response=await fetch("/api/eden-realid",{
       method:"POST",
       headers:{"Authorization":"Bearer "+token,"Content-Type":"application/json"},
       body:JSON.stringify({action:"reserve-activate",requestedName:requestedEdenRealId})
     });
     const result=await response.json().catch(()=>({}));
     if(!response.ok||!result.ok)throw new Error(result.message||result.error||"Eden RealID creation failed. Your account exists but onboarding is incomplete; sign in again and retry identity setup.");
     await checkEdenStatus();
     notice("Eden RealID created. Now choose your unique PwnZ gamer name.");
   }else{
     await checkEdenStatus();
     if(state.authMode==="eden"&&!state.edenActive)throw new Error("This account does not have an activated Eden RealID.");
     notice(state.edenActive?"Eden account verified. Create your PwnZ gamer name if this is your first visit.":"Signed in. Finish Eden RealID setup before creating a PwnZ profile.");
   }
   $("password").value="";
   renderSession();
 }catch(error){notice(error.message);}
 finally{$("auth-submit").disabled=false;}
});
$("logout").addEventListener("click",()=>state.auth&&signOut(state.auth).catch(e=>notice(e.message)));
$("reserve").addEventListener("click",async()=>{
 if(!state.user||!state.db||state.profile||!state.backendReady||!state.edenActive)return;
 const handle=$("handle").value.trim().toLowerCase(),key=handle;
 if(!handlePattern.test(handle)){notice("Use 3–24 lowercase letters, numbers or underscores, starting with a letter.");return;}
 $("reserve").disabled=true;
 try{
  await runTransaction(state.db,async tx=>{
   const ref=doc(state.db,"pwnzHandles",key),profile=doc(state.db,"pwnzProfiles",state.user.uid);
   const [taken,already]=await Promise.all([tx.get(ref),tx.get(profile)]);
   if(taken.exists()||already.exists())throw new Error("That name is unavailable or you already have a profile.");
   tx.set(ref,{uid:state.user.uid,handle,createdAt:serverTimestamp()});
   tx.set(profile,{uid:state.user.uid,handle,handleKey:key,role:"member",bio:"",twitch:"",youtube:"",createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
   tx.set(doc(state.db,"pwnzPublicProfiles",state.user.uid),{uid:state.user.uid,handle,bio:"",createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
  });
  await loadProfile();await refreshBadgeProgress();renderSession();notice("PwnZ gamer name linked to your Eden ecosystem identity.");
 }catch(e){notice("Name registration failed: "+e.message);}finally{$("reserve").disabled=false;}
});
$("profile-form").addEventListener("submit",async e=>{
 e.preventDefault();if(!state.profile)return;
 const bio=$("bio").value.trim(),twitch=twitchName($("twitch").value),youtube=$("youtube").value.trim();
 if(bio.length>300){notice("Bio is too long.");return;}
 if($("twitch").value.trim()&&!twitch){notice("Enter a valid Twitch channel name.");return;}
 if(youtube){try{const u=new URL(youtube);if(u.protocol!=="https:"||!["youtube.com","www.youtube.com","youtu.be"].includes(u.hostname))throw 0;}catch{notice("Only HTTPS YouTube links are supported.");return;}}
 try{await runTransaction(state.db,async tx=>{const own=doc(state.db,"pwnzProfiles",state.user.uid),pub=doc(state.db,"pwnzPublicProfiles",state.user.uid);await Promise.all([tx.get(own),tx.get(pub)]);tx.update(own,{bio,twitch,youtube,updatedAt:serverTimestamp()});tx.update(pub,{bio,updatedAt:serverTimestamp()});});await loadProfile();renderBadges();notice("Public PwnZ profile updated.");}
 catch(e){notice("Profile save failed: "+e.message);}
});
// Local-only preview, with revocable object URL. Browser video metadata is
// informational and never grants remote upload or publication.
let previewObjectURL=null;
function resetClipPreview(){
 if(previewObjectURL){URL.revokeObjectURL(previewObjectURL);previewObjectURL=null;}
 const player=$("clip-preview-player");player.pause();player.removeAttribute("src");player.load();player.hidden=true;
}
$("clip-preview-input").addEventListener("change",()=>{
 resetClipPreview();
 const file=$("clip-preview-input").files?.[0];
 if(!file){$("clip-preview-status").textContent="Choose a gameplay MP4 or WebM file for a private preview.";return;}
 const check=validateClipMetadata(file);
 if(!check.ok){$("clip-preview-input").value="";$("clip-preview-status").textContent=check.error;return;}
 previewObjectURL=URL.createObjectURL(file);
 $("clip-preview-player").src=previewObjectURL;
 $("clip-preview-player").onloadedmetadata=()=>{
  if(!validateClipDuration($("clip-preview-player").duration)){
   resetClipPreview();$("clip-preview-input").value="";
   $("clip-preview-status").textContent="Only gameplay clips up to "+CLIP_DURATION_SECONDS+" seconds can be previewed.";return;
  }
  $("clip-preview-player").hidden=false;
  $("clip-preview-status").textContent="This video is previewing only on your device; it has not been uploaded or published.";
 };
 $("clip-preview-player").onerror=()=>{
  resetClipPreview();$("clip-preview-status").textContent="Your browser could not decode this video.";
 };
});
window.addEventListener("pagehide",resetClipPreview);
$("compose").addEventListener("submit",async e=>{
 e.preventDefault();if(!state.profile||!state.user)return;
 const title=$("title").value.trim(),body=$("body").value.trim(),raw=$("video-url").value.trim();
 let youtubeId=null,twitch="",externalMedia="";
 if(raw){
  try{
   const media=parsePwnzMediaLink(raw);
   if(!media)throw Error("Empty media link");
   if(media.provider==="youtube")youtubeId=media.youtubeId;
   else if(media.provider==="twitch")twitch=media.twitch;
   else externalMedia=media.url;
  }catch(e){notice(e.message||"Share a valid public video link.");return;}
 }
 const finalBody=externalMedia?(body?body+"\n":"")+externalMedia:body;
 if(finalBody.length>4000){notice("The story and media URL exceed the 4,000 character limit.");return;}
 if(!title&&!finalBody&&!youtubeId&&!twitch){notice("Add text or a supported video link.");return;}
 const submit=$("post-submit");submit.disabled=true;
 try{
  await addDoc(collection(state.db,"pwnzPosts"),{authorUid:state.user.uid,authorHandle:state.profile.handle,title:title.slice(0,140),body:finalBody,...(youtubeId?{youtubeId}:{}),...(twitch?{twitch}:{}),status:"published",createdAt:serverTimestamp()});
  $("compose").reset();resetClipPreview();await refreshBadgeProgress();notice("Post published to the PwnZ community.");
 }catch(e){notice("Unable to publish: "+e.message);}finally{submit.disabled=false;}
});
$("role-application").addEventListener("submit",async e=>{
 e.preventDefault();if(!state.user||!state.profile||!state.agreementCurrent)return;
 const roleRequested=$("role-request").value;
 const category=({gamer:"pwnz-gamer",game_creator:"pwnz-game-creator",original_game:"pwnz-original-game"})[roleRequested];
 const summary=$("role-summary").value.trim(),favoriteGames=$("role-favorite").value.trim();
 const uploadGames=$("role-upload").value.trim(),method=$("role-method").value;
 const eventIdeas=$("role-events").value.trim(),accessModel=$("role-access").value;
 const exampleLink=$("role-example").value.trim(),rightsConfirmed=$("role-rights").checked;
 if(!category||summary.length<20||!favoriteGames){notice("Complete your category and favorite games.");return;}
 if(roleRequested!=="gamer"&&!rightsConfirmed){notice("Game publishers must confirm they have rights to distribute all code and assets.");return;}
 if(exampleLink){try{const u=new URL(exampleLink);if(u.protocol!=="https:")throw 0;}catch{notice("Use an HTTPS portfolio link.");return;}}
 const submit=$("role-submit");submit.disabled=true;
 try{
  const token=await state.user.getIdToken();
  const response=await fetch("/api/pwnz-apply",{
    method:"POST",headers:{"Authorization":"Bearer "+token,"Content-Type":"application/json"},
    body:JSON.stringify({category,organizationName:state.profile.handle,purpose:summary,communityImpact:"Creating and supporting an interactive PwnZ gaming community",role:roleRequested,website:exampleLink,socialLinks:[],answers:{favoriteGames,contentPlan:summary,uploadGames,method,eventIdeas,accessModel,rightsConfirmed:rightsConfirmed?"yes":"no"}})
  });
  const result=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(result.error||"Application service unavailable.");
  $("role-application").reset();notice("Application saved for administrator review. Email notification status: "+(result.notificationStatus||"unknown")+". Your role remains PwnZ Member.");
 }catch(error){notice("Application not submitted: "+error.message+". You must have a PwnZ profile and a verified email or activated Eden RealID.");}
 finally{submit.disabled=false;}
});

init();
