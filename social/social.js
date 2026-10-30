import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { getFirestore, doc, collection, getDoc, getDocs, runTransaction, addDoc, setDoc, deleteDoc, serverTimestamp, query, where, orderBy, limit, onSnapshot } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const $ = id => document.getElementById(id);
const escapeHTML = str => String(str ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
const handlePattern = /^[a-z][a-z0-9_]{2,23}$/;
const state = {auth:null,db:null,user:null,profile:null,unsubscribe:null,posts:[],following:new Set()};
function notice(message){ $("notice").textContent=message; }
function getVideoId(url){try{const u=new URL(url), h=u.hostname.toLowerCase().replace(/^www\./,"");let id="";if(h==="youtu.be")id=u.pathname.split("/")[1]||"";else if(["youtube.com","m.youtube.com"].includes(h)){if(u.pathname==="/watch")id=u.searchParams.get("v")||"";else if(/^\/(shorts|embed|live)\//.test(u.pathname))id=u.pathname.split("/")[2]||"";}return /^[A-Za-z0-9_-]{11}$/.test(id)?id:null;}catch{return null;}}
function twitchName(raw){const v=String(raw||"").trim().replace(/^@/,"");return /^[A-Za-z0-9_]{3,25}$/.test(v)?v:"";}
async function init(){
 try{
  const response=await fetch("/api/pwnz-config",{cache:"no-store"});
  if(!response.ok)throw new Error("Configuration endpoint unavailable");
  const info=await response.json();
  if(!info.ready){notice("PwnZ social database is not configured yet. The stream viewer and public pages remain available.");return;}
  const app=initializeApp(info.config,"pwnz-social");
  state.auth=getAuth(app);state.db=getFirestore(app);
  $("auth-panel").hidden=false;
  onAuthStateChanged(state.auth,async user=>{
   state.user=user; state.profile=null; state.following=new Set();
   if(user){await loadProfile();await loadFollowing();}
   renderSession(); watchPosts();
  });
 }catch(e){notice("Social connectivity unavailable. "+e.message);}
}
function renderSession(){
 const signed=Boolean(state.user);
 $("login-form").hidden=signed;$("signed-in").hidden=!signed;$("profile-form").hidden=!signed;
 $("compose").hidden=!(signed&&state.profile);$("profile-display").hidden=!state.profile;
 $("signed-name").textContent=state.profile?"@"+state.profile.handle:state.user?.email||"";
 if(state.profile){
  $("handle-current").textContent="@"+state.profile.handle;
  $("bio").value=state.profile.bio||"";$("twitch").value=state.profile.twitch||"";
  $("youtube").value=state.profile.youtube||"";
  $("handle-entry").hidden=true;
  $("profile-note").textContent="Your PwnZ profile is active. Your Eden RealID is never displayed here.";
 }else{
  $("handle-entry").hidden=!signed;
  $("profile-note").textContent=signed?"Choose a unique PwnZ name to post and follow people. This name is separate from Eden RealID.":"Sign in to create a PwnZ profile.";
 }
 renderPosts();
}
async function loadProfile(){
 try{const snap=await getDoc(doc(state.db,"pwnzProfiles",state.user.uid));state.profile=snap.exists()?snap.data():null;}
 catch(e){notice("Profile read failed: "+e.message);}
}
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
  const canFollow=state.user&&state.user.uid!==post.authorUid&&state.profile;
  if(canFollow){
   const follow=document.createElement("button");follow.type="button";follow.className="mini";
   follow.textContent=state.following.has(post.authorUid)?"Following":"Follow";
   follow.addEventListener("click",async()=>{follow.disabled=true;try{const id=state.user.uid+"__"+post.authorUid;if(state.following.has(post.authorUid)){await deleteDoc(doc(state.db,"pwnzFollows",id));state.following.delete(post.authorUid);}else{await setDoc(doc(state.db,"pwnzFollows",id),{followerUid:state.user.uid,followedUid:post.authorUid,createdAt:serverTimestamp()});state.following.add(post.authorUid);}renderPosts();}catch(e){notice(e.message);follow.disabled=false;}});
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
  actions.append(comment);
  if(state.user?.uid===post.authorUid){const del=document.createElement("button");del.type="button";del.className="mini";del.textContent="Delete";del.addEventListener("click",async()=>{if(!confirm("Delete your post?"))return;try{await deleteDoc(doc(state.db,"pwnzPosts",post.id));notice("Post deleted.");}catch(e){notice(e.message);}});actions.append(del);}
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
$("login-form").addEventListener("submit",async e=>{e.preventDefault();if(!state.auth)return;const email=$("email").value.trim(),pass=$("password").value;
 $("login").disabled=true;try{if(e.submitter?.value==="register")await createUserWithEmailAndPassword(state.auth,email,pass);else await signInWithEmailAndPassword(state.auth,email,pass);$("password").value="";notice("Signed in. Welcome to PwnZ.");}catch(e){notice(e.message);}finally{$("login").disabled=false;}});
$("logout").addEventListener("click",()=>state.auth&&signOut(state.auth).catch(e=>notice(e.message)));
$("reserve").addEventListener("click",async()=>{
 if(!state.user||!state.db||state.profile)return;
 const handle=$("handle").value.trim(),key=handle;
 if(!handlePattern.test(handle)){notice("Use 3–24 lowercase letters, numbers or underscores, starting with a letter.");return;}
 $("reserve").disabled=true;
 try{
  await runTransaction(state.db,async tx=>{
   const ref=doc(state.db,"pwnzHandles",key),profile=doc(state.db,"pwnzProfiles",state.user.uid);
   const [taken,already]=await Promise.all([tx.get(ref),tx.get(profile)]);
   if(taken.exists()||already.exists())throw new Error("That name is unavailable or you already have a profile.");
   tx.set(ref,{uid:state.user.uid,handle,createdAt:serverTimestamp()});
   tx.set(profile,{uid:state.user.uid,handle,handleKey:key,bio:"",twitch:"",youtube:"",createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
  });
  await loadProfile();renderSession();notice("PwnZ profile created. You can now publish and comment.");
 }catch(e){notice("Name registration failed: "+e.message);}finally{$("reserve").disabled=false;}
});
$("profile-form").addEventListener("submit",async e=>{
 e.preventDefault();if(!state.profile)return;
 const bio=$("bio").value.trim(),twitch=twitchName($("twitch").value),youtube=$("youtube").value.trim();
 if(bio.length>300){notice("Bio is too long.");return;}
 if($("twitch").value.trim()&&!twitch){notice("Enter a valid Twitch channel name.");return;}
 if(youtube){try{const u=new URL(youtube);if(u.protocol!=="https:"||!["youtube.com","www.youtube.com","youtu.be"].includes(u.hostname))throw 0;}catch{notice("Only HTTPS YouTube links are supported.");return;}}
 try{await setDoc(doc(state.db,"pwnzProfiles",state.user.uid),{bio,twitch,youtube,updatedAt:serverTimestamp()},{merge:true});await loadProfile();notice("Public PwnZ profile updated.");}
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
  $("compose").reset();notice("Post published to the PwnZ community.");
 }catch(e){notice("Unable to publish: "+e.message);}finally{submit.disabled=false;}
});
init();
