import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { evaluatePwnzBadges } from "./badges.js";
import {parsePwnzMediaLink,extractPwnzMediaCards,safePwnzEmbedUrl} from "./external-media.mjs";
import {validateClipMetadata,validateClipDuration,CLIP_DURATION_SECONDS} from "./clip-intake-policy.mjs";
import { getFirestore, doc, collection, getDoc, getDocs, runTransaction, addDoc, setDoc, deleteDoc, serverTimestamp, query, where, orderBy, limit, onSnapshot } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const $ = id => document.getElementById(id);
const escapeHTML = str => String(str ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
const AGREEMENT_VERSION='pwnz-2026.10.30.1'; // Legacy record; no new PwnZ-only enrollment.
const EDEN_AGREEMENT_VERSIONS=new Set(['v16-2026.08.27.1','ecosystem-2026.11.18.1']);
const handlePattern = /^[a-z][a-z0-9_]{2,23}$/;
const edenNamePattern = /^[A-Za-z0-9](?:[A-Za-z0-9 ._-]*[A-Za-z0-9])?$/;
const state = {auth:null,db:null,user:null,profile:null,unsubscribe:null,posts:[],following:new Set(),verifiedEden:false,postCount:0,youtubeCount:0,authMode:"register",badgeStatsReady:false,agreementCurrent:false,edenActive:false,authAction:"signin",backendReady:false,gamertagRegistrationReady:false,edenRegistrarReady:false,pairedRegistrationReady:false,edenLookup:"unchecked",edenName:"",displayIdentity:"eden"};
function notice(message){ $("notice").textContent=message; }
// Client display setting only, per Firebase UID on this device. No auth impact.
function preferenceKey(uid){return "pwnz-display-choice-v1:"+uid;}
function readChoice(uid){try{return localStorage.getItem(preferenceKey(uid))==="pwnz"?"pwnz":"eden";}catch{return "eden";}}
function saveChoice(uid,v){try{localStorage.setItem(preferenceKey(uid),v);return true;}catch{return false;}}
function publicDisplayName(){
 if(!state.user)return "";
 const gamer=typeof state.profile?.handle==="string"&&handlePattern.test(state.profile.handle)?"@"+state.profile.handle:"";
 return state.displayIdentity==="pwnz"&&gamer?gamer:(state.edenActive&&state.edenName?state.edenName:"Eden account");
}
function getVideoId(url){try{const u=new URL(url), h=u.hostname.toLowerCase().replace(/^www\./,"");let id="";if(h==="youtu.be")id=u.pathname.split("/")[1]||"";else if(["youtube.com","m.youtube.com"].includes(h)){if(u.pathname==="/watch")id=u.searchParams.get("v")||"";else if(/^\/(shorts|embed|live)\//.test(u.pathname))id=u.pathname.split("/")[2]||"";}return /^[A-Za-z0-9_-]{11}$/.test(id)?id:null;}catch{return null;}}
function twitchName(raw){const v=String(raw||"").trim().replace(/^@/,"");return /^[A-Za-z0-9_]{3,25}$/.test(v)?v:"";}
async function init(){
 try{
  const response=await fetch("/api/pwnz-config",{cache:"no-store"});
  if(!response.ok)throw new Error("Configuration endpoint unavailable");
  const info=await response.json();
  if(!info.configured||!info.config){$("auth-panel").hidden=false; notice("Firebase authentication configuration is missing."); return;}
  state.backendReady=Boolean(info.ready);
  state.gamertagRegistrationReady=Boolean(info.gamertagRegistrationReady);
  state.edenRegistrarReady=Boolean(info.edenRegistrarReady);
  state.pairedRegistrationReady=Boolean(info.pairedRegistrationReady);
  chooseAuthMode(state.authMode);
  const app=initializeApp(info.config);
  state.auth=getAuth(app);state.db=getFirestore(app);
  // Wait for Firebase to resolve the remembered session before rendering auth.
  onAuthStateChanged(state.auth,async user=>{
   if(user)$("auth-panel").hidden=true;
   else chooseAuthMode("eden");
   state.user=user; state.profile=null; state.following=new Set();state.edenName="";state.displayIdentity=user?readChoice(user.uid):"eden";
   state.agreementCurrent=false;state.edenActive=false;state.verifiedEden=false;state.edenLookup="unchecked";state.postCount=0;state.youtubeCount=0;state.badgeStatsReady=false;
   if(user){
     // Read only the signed-in user's own Eden and gamer profile even while
     // PwnZ posting/registration remains gated at the backend.
     await Promise.all([loadProfile(),checkEdenStatus(),...(state.backendReady?[loadFollowing()]:[])]);
     if(state.backendReady){await loadAgreement();await refreshBadgeProgress();}
   }
   state.agreementCurrent=state.edenActive?state.verifiedEden:state.agreementCurrent;
   renderSession(); if(state.backendReady)watchPosts();
   if(!state.backendReady)notice(user?(state.gamertagRegistrationReady?"Signed in. Eden-linked Gamertag enrollment is available; posting and social features remain paused.":"Signed in. Gamertag registration and posting remain paused until their separate security gates are approved."):"Email sign-in is available. New member signup and PwnZ social features require their own release gates.");
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
 if(state.edenLookup==="unavailable")return "Signed in, but the Eden RealID status check could not be completed. No account was changed.";
 if(state.edenActive&&!state.gamertagRegistrationReady)return "✓ Existing Eden RealID recognized. PwnZ Gamertag registration is awaiting its separate security release.";
 if(state.edenActive&&!state.profile)return "✓ Eden RealID verified. Create your PwnZ Gamertag to activate your gaming profile; your Eden account stays the same.";
 if(!state.gamertagRegistrationReady)return "Firebase sign-in works. PwnZ Gamertag enrollment is paused; do not create another Eden RealID.";
 if(!state.edenActive)return "Signed in, but this account's existing Eden RealID is not yet verified here. Review or activate the original Light of Hope profile, then recheck. Do not register again.";
 return state.verifiedEden
  ?"✓ Eden RealID verified across the ecosystem. Your PwnZ Gamertag stays separate."
  :"✓ Eden RealID linked. Renew the current community agreement on Light of Hope before participating.";
}
function renderSession(){
 const signed=Boolean(state.user);
 $("community-agreement").hidden=true; // All new PwnZ accounts require an Eden RealID.
 $("auth-panel").hidden=signed; // Hide ALL signup/sign-in options once authenticated.
 $("eden-renewal").hidden=!(signed&&state.edenActive&&!state.verifiedEden);
 $("account-choices").hidden=signed;
 $("auth-help").hidden=signed;
 $("login-form").hidden=signed;$("signed-in").hidden=!signed;$("profile-form").hidden=!(signed&&state.backendReady&&state.agreementCurrent);
 $("compose").hidden=!(signed&&state.backendReady&&state.profile&&state.agreementCurrent);$("profile-display").hidden=!state.profile;
 $("signed-name").textContent=publicDisplayName();
 $("identity-display-settings").hidden=!(signed&&state.edenActive);
 $("resume-paired").hidden=!(signed&&!state.edenActive&&state.pairedRegistrationReady&&["missing-owner","missing-profile"].includes(state.edenLookup));
 const validGamertag=typeof state.profile?.handle==="string"&&handlePattern.test(state.profile.handle);
 $("display-eden-name").textContent=state.edenName||"Eden RealID active";
 $("display-gamer-name").textContent=validGamertag?"@"+state.profile.handle:"Not created yet";
 $("display-pwnz").disabled=!validGamertag;
 if(!validGamertag&&state.displayIdentity==="pwnz")state.displayIdentity="eden";
 $("display-choice").value=state.displayIdentity;
 $("display-settings-note").textContent="Eden RealID is your identity across all networks. A PwnZ Gamertag is a separate gaming name used only on PwnZ. This display choice is saved on this device until secure account-wide settings are released.";
 $("profile-role").textContent=state.profile?"Current role: PwnZ Member. Applications are reviewed, not automatically approved.":"";
 $("identity-state").textContent=identityMessage();
 $("identity-recovery").hidden=!signed||(state.gamertagRegistrationReady&&state.edenActive);
 $("identity-recovery-text").textContent=!state.gamertagRegistrationReady
  ?(state.edenActive?"Your Eden RealID is recognized. Gamertag registration requires the separate approved Eden-only Firestore gate.":"Your existing signed-in account is preserved. Enrollment is paused pending verified Eden ownership.")
  :(state.edenLookup==="unavailable"?"Eden verification is unavailable. Retry the check, without creating a new account."
   :"If your Eden RealID already exists on Light of Hope, review its activation or agreement there, then return using the same account.");
 renderBadges();
 if(state.profile){
  $("handle-current").textContent="@"+state.profile.handle;
  $("bio").value=state.profile.bio||"";$("twitch").value=state.profile.twitch||"";
  $("youtube").value=state.profile.youtube||"";
  $("handle-entry").hidden=true;
  $("role-application").hidden=!(state.backendReady&&state.agreementCurrent);
  $("profile-note").textContent=state.agreementCurrent?"Your PwnZ profile is ready, attached to your Eden account.":"Your Gamertag remains reserved. Renew your shared 30-day agreement on Light of Hope before participating."
 }else{
  $("handle-entry").hidden=!(signed&&state.gamertagRegistrationReady&&state.edenActive);
  $("role-application").hidden=true;
  $("profile-note").textContent=signed?(!state.gamertagRegistrationReady
  ?"Gamertag registration is paused by the separate enrollment gate. Your Eden account is preserved."
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
    &&["active","grandfathered"].includes(owner.status)
    &&(profile.profileStatus==="active"||profile.edenRealIdStatus==="activated_v16"
      ||(owner.status==="grandfathered"&&owner.reservationType==="legacy-profile-migration"&&Number(profile.memberNumber)>0)));
  const expiry=agreement?.expiresAt?.toDate?.();
  state.edenActive=active;
  state.edenName=active&&typeof owner.displayName==="string"&&owner.displayName.trim()
    ?owner.displayName.trim().slice(0,64)
    :active&&typeof profile.edenRealID==="string"?profile.edenRealID.trim().slice(0,64):"";
  state.edenLookup=active?"active":(!o.exists()?"missing-owner":!p.exists()?"missing-profile":"inactive");
  state.verifiedEden=Boolean(active&&agreement?.accepted===true
    &&EDEN_AGREEMENT_VERSIONS.has(agreement.agreementVersion)
    &&expiry instanceof Date&&expiry.getTime()>Date.now());
 }catch(e){state.edenActive=false;state.edenName="";state.verifiedEden=false;state.edenLookup="unavailable";
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
 const creating=mode==="pwnz"&&state.authAction==="register";
 const newEden=$("new-eden-name");
 if(newEden)newEden.hidden=!creating;
 $("eden-realid").required=creating;
 $("new-pwnz-gamertag").required=creating;
 $("eden-realid").disabled=!creating;
 $("new-pwnz-gamertag").disabled=!creating;
 $("paired-status").textContent=creating?(state.pairedRegistrationReady?"Both names must be confirmed together. Registration is available.":"New ecosystem registration is currently paused; existing Eden members can sign in and add a Gamertag."):"";
 $("new-account-warning").hidden=Boolean(state.user)||mode!=="pwnz"||state.authAction!=="register";
 if(mode==="eden"||state.authAction!=="register")$("no-existing-eden").checked=false;
 $("auth-submit").disabled=creating&&!state.pairedRegistrationReady;
 $("auth-submit").textContent=mode==="eden"?"Sign in with existing Eden account":state.authAction==="register"?"Create ecosystem account":"Sign in";
 $("auth-help").textContent=mode==="eden"
  ?"Already have an Eden RealID from Light of Hope, EdenNetwork or PwnZ? Use your existing email and password. Do not create another account or RealID."
  :(state.authAction==="register"
    ?"New PwnZ members choose their Eden RealID and PwnZ Gamertag together. Both names belong to one account, using email and password for current sign-in."
    :"Sign in to your existing transitional account. Your Eden identity remains the ecosystem anchor.");
}
document.querySelectorAll("[data-auth-mode]").forEach(x=>x.addEventListener("click",()=>{
 // A new member selecting the card must see dual-name registration immediately.
 if(x.dataset.authMode==="pwnz")state.authAction="register";
 chooseAuthMode(x.dataset.authMode);
}));
async function refreshExistingEdenAccount(){
 if(!state.user||!state.db)return;
 const button=$("identity-recheck");if(button)button.disabled=true;
 try{
  await checkEdenStatus();
  if(state.backendReady)await loadAgreement();
  state.agreementCurrent=state.edenActive?state.verifiedEden:state.agreementCurrent;
  renderSession();
  notice(!state.gamertagRegistrationReady
   ?"Gamertag registration is still paused; your existing Eden account is unchanged."
   :state.edenLookup==="unavailable"?"Eden verification is temporarily unavailable."
   :state.edenActive?"Eden RealID recognized. Your Gamertag is available when the agreement is current."
   :"Eden RealID not verified here. Review the original Light of Hope profile, then recheck.");
 }finally{if(button)button.disabled=false;}
}
$("recheck-eden").addEventListener("click",refreshExistingEdenAccount);
$("identity-recheck").addEventListener("click",refreshExistingEdenAccount);
chooseAuthMode("eden");
$("display-choice").addEventListener("change",()=>{
 if(!state.user||!state.edenActive)return;
 const choice=$("display-choice").value;
 if(choice!=="eden" && !(choice==="pwnz"&&state.profile&&handlePattern.test(state.profile.handle))){
  $("display-choice").value="eden";return;
 }
 state.displayIdentity=choice;
 const saved=saveChoice(state.user.uid,choice);
 renderSession();
 notice(saved?"Display preference saved on this device.":"Display preference updated for this session; local storage was unavailable.");
});
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
async function reservePairedIdentity(edenName,gamerName){
 if(!state.user||!state.auth)throw new Error("Sign in to your original email account to complete your paired identity.");
 if(!state.pairedRegistrationReady)
  throw new Error("Paired registration is not yet enabled. Your email account remains saved.");
 const eden=String(edenName||"").trim(),gamer=String(gamerName||"").trim().toLowerCase();
 if(eden.length<3||eden.length>32||!edenNamePattern.test(eden)||!handlePattern.test(gamer))
  throw new Error("Both names are required: Eden RealID must be 3–32 allowed characters and PwnZ Gamertag must be 3–24 lowercase letters, numbers or underscores.");
 const token=await state.user.getIdToken(true);
 const response=await fetch("/api/eden-realid",{
  method:"POST",
  headers:{"Authorization":"Bearer "+token,"Content-Type":"application/json"},
  body:JSON.stringify({action:"reserve-activate-pwnz",requestedName:eden,requestedGamertag:gamer})
 });
 const result=await response.json().catch(()=>({}));
 if(!response.ok||!result.ok)
  throw new Error((result.message||result.error||"Paired registration failed.")+" Use your original email account to resume. Do not create another account.");
 await Promise.all([checkEdenStatus(),loadProfile()]);
 if(!state.edenActive||!state.profile||state.profile.handle!==gamer)
  throw new Error("The reservation response succeeded, but account confirmation is not available. Recheck the same account; do not sign up again.");
 renderSession();
 return result;
}
$("resume-paired-submit").addEventListener("click",async()=>{
 const button=$("resume-paired-submit");button.disabled=true;
 try{
  if(!state.user||state.edenActive||!["missing-owner","missing-profile"].includes(state.edenLookup))
   throw new Error("This account cannot begin another Eden identity.");
  await reservePairedIdentity($("resume-eden-realid").value,$("resume-pwnz-gamertag").value);
  notice("Both names activated under this same account.");
 }catch(error){notice(error.message);}
 finally{button.disabled=false;}
});
$("login-form").addEventListener("submit",async e=>{e.preventDefault();if(!state.auth)return;
 const email=$("email").value.trim(),pass=$("password").value;
 const creating=state.authMode==="pwnz"&&state.authAction==="register";
 const requestedEdenRealId=creating?$("eden-realid").value.trim():"";
 const requestedGamerTag=creating?$("new-pwnz-gamertag").value.trim().toLowerCase():"";
 $("auth-submit").disabled=true;
 try{
   if(creating&&!state.pairedRegistrationReady)throw new Error("New ecosystem registration is paused until both names can be reserved together. Existing Eden members can sign in normally.");
   if(creating&&(requestedEdenRealId.length<3||requestedEdenRealId.length>32||!edenNamePattern.test(requestedEdenRealId)))throw new Error("Choose a valid Eden RealID (3–32 characters, letters, numbers, spaces, periods, underscores or hyphens).");
   if(creating&&!handlePattern.test(requestedGamerTag))throw new Error("Choose a PwnZ Gamertag (3-24 lowercase letters, numbers or underscores, starting with a letter).");
   if(creating&&!$("no-existing-eden").checked)throw new Error("Already have an Eden RealID? Choose Existing member and sign in. Only create a new account if you have never joined this ecosystem.");
   let credential;
   if(creating)credential=await createUserWithEmailAndPassword(state.auth,email,pass);
   else credential=await signInWithEmailAndPassword(state.auth,email,pass);
   if(creating){
     // Firebase Auth creates the UID, but neither identity name is finalized
     // until the single trusted Firestore transaction confirms BOTH.
     state.user=credential.user;
     await reservePairedIdentity(requestedEdenRealId,requestedGamerTag);
     notice("Eden RealID and PwnZ Gamertag activated together on one account.");
   }else{
     state.user=credential.user;
     await checkEdenStatus();
     if(state.authMode==="eden"&&!state.edenActive)throw new Error("This account does not have an activated Eden RealID. Review your original Light of Hope profile; do not register again.");
     notice(state.edenActive?"Eden account verified. Create your PwnZ gamer name if this is your first visit.":"Signed in. Finish Eden RealID setup before creating a PwnZ profile.");
   }
   $("password").value="";
   renderSession();
 }catch(error){notice(error.message);}
 finally{$("auth-submit").disabled=state.authAction==="register"&&!state.pairedRegistrationReady;}
});
$("logout").addEventListener("click",()=>state.auth&&signOut(state.auth).catch(e=>notice(e.message)));
async function createPwnzGamertag(rawHandle){
 if(!state.user||!state.db||state.profile||!state.gamertagRegistrationReady||!state.edenActive)
  throw new Error("An activated Eden RealID and approved Gamertag registration gate are required.");
 const uid=state.user.uid,handle=String(rawHandle||"").trim().toLowerCase(),key=handle;
 if(!handlePattern.test(handle))throw new Error("Use 3-24 lowercase letters, numbers or underscores, starting with a letter.");
 await runTransaction(state.db,async tx=>{
  const ref=doc(state.db,"pwnzHandles",key),profile=doc(state.db,"pwnzProfiles",uid);
  const publicProfile=doc(state.db,"pwnzPublicProfiles",uid);
  const [taken,already,published]=await Promise.all([tx.get(ref),tx.get(profile),tx.get(publicProfile)]);
  // Atomic PwnZ profile writes. Firebase Auth and Eden reservation are
  // independent steps; a failure must resume with the original same UID.
  if(taken.exists()||already.exists()||published.exists())
   throw new Error("Gamertag unavailable or PwnZ profile already exists. Use your original Eden account.");
  tx.set(ref,{uid,handle,createdAt:serverTimestamp()});
  tx.set(profile,{uid,handle,handleKey:key,role:"member",bio:"",twitch:"",youtube:"",createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
  tx.set(publicProfile,{uid,handle,bio:"",createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
 });
 await loadProfile();
 if(state.backendReady)await refreshBadgeProgress();
 renderSession();
 notice("PwnZ Gamertag linked to your existing Eden RealID.");
}
$("reserve").addEventListener("click",async()=>{
 $("reserve").disabled=true;
 try{await createPwnzGamertag($("handle").value);}
 catch(error){notice("Gamertag registration unavailable: "+error.message);}
 finally{$("reserve").disabled=false;}
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
