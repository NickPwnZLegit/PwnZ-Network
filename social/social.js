import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { evaluatePwnzBadges } from "./badges.js";
import { getFirestore, doc, collection, getDoc, getDocs, runTransaction, addDoc, setDoc, deleteDoc, serverTimestamp, query, where, orderBy, limit, onSnapshot } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const $ = id => document.getElementById(id);
const escapeHTML = str => String(str ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
const AGREEMENT_VERSION='pwnz-2026.10.30.1';
const handlePattern = /^[a-z][a-z0-9_]{2,23}$/;
const state = {auth:null,db:null,user:null,profile:null,unsubscribe:null,posts:[],following:new Set(),verifiedEden:false,postCount:0,youtubeCount:0,authMode:"register",badgeStatsReady:false,agreementCurrent:false,edenActive:false,authAction:"register"};
function notice(message){ $("notice").textContent=message; }
function getVideoId(url){try{const u=new URL(url), h=u.hostname.toLowerCase().replace(/^www\./,"");let id="";if(h==="youtu.be")id=u.pathname.split("/")[1]||"";else if(["youtube.com","m.youtube.com"].includes(h)){if(u.pathname==="/watch")id=u.searchParams.get("v")||"";else if(/^\/(shorts|embed|live)\//.test(u.pathname))id=u.pathname.split("/")[2]||"";}return /^[A-Za-z0-9_-]{11}$/.test(id)?id:null;}catch{return null;}}
function twitchName(raw){const v=String(raw||"").trim().replace(/^@/,"");return /^[A-Za-z0-9_]{3,25}$/.test(v)?v:"";}
async function init(){
 try{
  const response=await fetch("/api/pwnz-config",{cache:"no-store"});
  if(!response.ok)throw new Error("Configuration endpoint unavailable");
  const info=await response.json();
  if(!info.ready){$("auth-panel").hidden=false; notice("PwnZ registration is in protected preview. Firebase security activation is still required before account creation can work."); return;}
  const app=initializeApp(info.config);
  state.auth=getAuth(app);state.db=getFirestore(app);
  $("auth-panel").hidden=false;
  onAuthStateChanged(state.auth,async user=>{
   state.user=user; state.profile=null; state.following=new Set();
   state.agreementCurrent=false;state.edenActive=false;state.verifiedEden=false;state.postCount=0;state.youtubeCount=0;state.badgeStatsReady=false;
   if(user){
     await Promise.all([loadProfile(),loadFollowing(),checkEdenStatus(),loadAgreement()]);
     await refreshBadgeProgress();
   }
   state.agreementCurrent=state.edenActive?state.verifiedEden:state.agreementCurrent;
   renderSession(); watchPosts();
  });
 }catch(e){notice("Social connectivity unavailable. "+e.message);}
}
async function loadAgreement(){
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
  await setDoc(doc(state.db,"pwnzAgreements",state.user.uid),{uid:state.user.uid,accepted:true,version:AGREEMENT_VERSION,acceptedAt:serverTimestamp(),expiresAt:new Date(now+30*24*60*60*1000)});
  await loadAgreement();renderSession();notice("PwnZ agreement accepted. Your community access is available.");
 }catch(e){$("agree-status").textContent="Could not save agreement: "+e.message;}
 finally{btn.disabled=false;}
});
function renderSession(){
 const signed=Boolean(state.user);
 $("community-agreement").hidden=!(signed&&!state.agreementCurrent&&!state.edenActive);
 $("eden-renewal").hidden=!(signed&&state.edenActive&&!state.verifiedEden);
 $("login-form").hidden=signed;$("signed-in").hidden=!signed;$("profile-form").hidden=!signed;
 $("compose").hidden=!(signed&&state.profile&&state.agreementCurrent);$("profile-display").hidden=!state.profile;
 $("signed-name").textContent=state.profile?"@"+state.profile.handle:state.user?.email||"";
 $("profile-role").textContent=state.profile?"Current role: PwnZ Member. Applications are reviewed, not automatically approved.":"";
 $("identity-state").textContent=state.user?(state.verifiedEden?"✓ Activated Eden RealID ownership confirmed. Your PwnZ identity is separate.":"PwnZ account signed in. Eden RealID not verified on this account. Messaging requires a verified Light Member."):"Choose an account path above.";
 renderBadges();
 if(state.profile){
  $("handle-current").textContent="@"+state.profile.handle;
  $("bio").value=state.profile.bio||"";$("twitch").value=state.profile.twitch||"";
  $("youtube").value=state.profile.youtube||"";
  $("handle-entry").hidden=true;
  $("role-application").hidden=!state.agreementCurrent;
  $("profile-note").textContent="Your unique PwnZ profile is active. Your Eden RealID stays private.";
 }else{
  $("handle-entry").hidden=!(signed&&state.agreementCurrent);
  $("role-application").hidden=true;
  $("profile-note").textContent=signed?"Choose a unique PwnZ name to post and follow people. This name is separate from Eden RealID.":"Sign in to create a PwnZ profile.";
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
  state.verifiedEden=Boolean(active&&agreement?.accepted===true
    &&agreement.agreementVersion==="v16-2026.08.27.1"
    &&expiry instanceof Date&&expiry.getTime()>Date.now());
 }catch(e){state.verifiedEden=false;notice("Eden verification could not be checked. PwnZ-only features remain available after profile setup.");}
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
 $("auth-submit").textContent=mode==="eden"?"Sign in with Eden account":state.authAction==="register"?"Create PwnZ account":"Sign in to PwnZ";
 $("auth-help").textContent=mode==="eden"
  ?"Use the email and password of your existing verified Eden RealID account. We'll verify ownership and your Light of Hope agreement, then you may create a separate PwnZ profile name."
  :"Use your email and password. Choose Create account for new members or Sign in for an existing PwnZ account.";
}
document.querySelectorAll("[data-auth-mode]").forEach(x=>x.addEventListener("click",()=>chooseAuthMode(x.dataset.authMode)));
document.querySelectorAll("[data-auth-action]").forEach(x=>x.addEventListener("click",()=>{
 state.authAction=x.dataset.authAction;
 document.querySelectorAll("[data-auth-action]").forEach(y=>y.setAttribute("aria-pressed",String(y===x)));
 chooseAuthMode("pwnz");
}));
$("recheck-eden").addEventListener("click",async()=>{
 if(!state.user)return;
 await checkEdenStatus();state.agreementCurrent=state.verifiedEden;await loadAgreement();
 state.agreementCurrent=state.edenActive?state.verifiedEden:state.agreementCurrent;renderSession();
});
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
  if(post.youtubeId){
   const box=document.createElement("div");box.className="video";
   const iframe=document.createElement("iframe");iframe.loading="lazy";iframe.allowFullscreen=true;iframe.title="Shared YouTube video";iframe.referrerPolicy="strict-origin-when-cross-origin";iframe.allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";iframe.src="https://www.youtube-nocookie.com/embed/"+encodeURIComponent(post.youtubeId);
   box.append(iframe);card.append(box);
  }
  if(post.twitch){
   const link=document.createElement("a");link.href="/live/?channel="+encodeURIComponent(post.twitch);link.textContent="📡 Watch @"+post.twitch+" on Twitch";card.append(link);
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
 $("auth-submit").disabled=true;
 try{
   if(state.authMode==="pwnz"&&state.authAction==="register")await createUserWithEmailAndPassword(state.auth,email,pass);
   else await signInWithEmailAndPassword(state.auth,email,pass);
   $("password").value="";
   notice("Authenticated. Complete a unique PwnZ profile if you haven't already.");
 }catch(error){notice(error.message);}
 finally{$("auth-submit").disabled=false;}
});
$("logout").addEventListener("click",()=>state.auth&&signOut(state.auth).catch(e=>notice(e.message)));
$("reserve").addEventListener("click",async()=>{
 if(!state.user||!state.db||state.profile||!state.agreementCurrent)return;
 const handle=$("handle").value.trim(),key=handle;
 if(!handlePattern.test(handle)){notice("Use 3–24 lowercase letters, numbers or underscores, starting with a letter.");return;}
 $("reserve").disabled=true;
 try{
  await runTransaction(state.db,async tx=>{
   const ref=doc(state.db,"pwnzHandles",key),profile=doc(state.db,"pwnzProfiles",state.user.uid);
   const [taken,already]=await Promise.all([tx.get(ref),tx.get(profile)]);
   if(taken.exists()||already.exists())throw new Error("That name is unavailable or you already have a profile.");
   tx.set(ref,{uid:state.user.uid,handle,createdAt:serverTimestamp()});
   tx.set(profile,{uid:state.user.uid,handle,handleKey:key,role:"member",bio:"",twitch:"",youtube:"",createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
  });
  await loadProfile();await refreshBadgeProgress();renderSession();notice("PwnZ profile created! PwnZ Member badge unlocked.");
 }catch(e){notice("Name registration failed: "+e.message);}finally{$("reserve").disabled=false;}
});
$("profile-form").addEventListener("submit",async e=>{
 e.preventDefault();if(!state.profile)return;
 const bio=$("bio").value.trim(),twitch=twitchName($("twitch").value),youtube=$("youtube").value.trim();
 if(bio.length>300){notice("Bio is too long.");return;}
 if($("twitch").value.trim()&&!twitch){notice("Enter a valid Twitch channel name.");return;}
 if(youtube){try{const u=new URL(youtube);if(u.protocol!=="https:"||!["youtube.com","www.youtube.com","youtu.be"].includes(u.hostname))throw 0;}catch{notice("Only HTTPS YouTube links are supported.");return;}}
 try{await setDoc(doc(state.db,"pwnzProfiles",state.user.uid),{bio,twitch,youtube,updatedAt:serverTimestamp()},{merge:true});await loadProfile();renderBadges();notice("Public PwnZ profile updated.");}
 catch(e){notice("Profile save failed: "+e.message);}
});
$("compose").addEventListener("submit",async e=>{
 e.preventDefault();if(!state.profile||!state.user)return;
 const title=$("title").value.trim(),body=$("body").value.trim(),raw=$("video-url").value.trim();
 let youtubeId=null,twitch="";
 if(raw){youtubeId=getVideoId(raw);if(!youtubeId){try{const u=new URL(raw);if(u.protocol!=="https:"||!["www.twitch.tv","twitch.tv"].includes(u.hostname))throw 0;twitch=twitchName(u.pathname.split("/")[1]);if(!twitch)throw 0;}catch{notice("Share a valid YouTube video or Twitch channel URL.");return;}}}
 if(!title&&!body&&!youtubeId&&!twitch){notice("Add text or a video link.");return;}
 const submit=$("post-submit");submit.disabled=true;
 try{
  await addDoc(collection(state.db,"pwnzPosts"),{authorUid:state.user.uid,authorHandle:state.profile.handle,title:title.slice(0,140),body:body.slice(0,4000),...(youtubeId?{youtubeId}:{}),...(twitch?{twitch}:{}),status:"published",createdAt:serverTimestamp()});
  $("compose").reset();await refreshBadgeProgress();notice("Post published to the PwnZ community.");
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
