import {initializeApp} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {getAuth,onAuthStateChanged} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import {getFirestore,collection,query,orderBy,limit,getDocs,doc,getDoc,setDoc,deleteDoc,serverTimestamp} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
const el=id=>document.getElementById(id),host=el("members");
el("search").value=new URLSearchParams(location.search).get("profile")||"";
let auth,db,user,profiles=[],mine=null;
const say=s=>el("notice").textContent=s;
async function load(){
 const r=await fetch("/api/pwnz-config",{cache:"no-store"}),c=await r.json();
 if(!c.ready||!c.config){say("Member directory is not enabled yet. Secure Firebase setup is required.");return;}
 const app=initializeApp(c.config);auth=getAuth(app);db=getFirestore(app);
 onAuthStateChanged(auth,async u=>{user=u;mine=null;host.replaceChildren();
 if(!u){say("Sign in at PwnZ Social to view members and connect.");return;}
 try{const p=await getDoc(doc(db,"pwnzProfiles",u.uid));mine=p.exists()?p.data():null;
 const result=await getDocs(query(collection(db,"pwnzPublicProfiles"),orderBy("handle"),limit(25)));
 profiles=result.docs.map(x=>x.data());render();
 }catch(e){say("Unable to load member directory: "+e.message);}
 });
}
function render(){
 const val=el("search").value.trim().toLowerCase();host.replaceChildren();
 const shown=profiles.filter(p=>!val||p.handle.startsWith(val));
 say(shown.length+" gamer profile(s) shown. Mutual follows enable a private chat.");
 for(const p of shown){
 const card=document.createElement("article");card.className="panel";
 const link=document.createElement("a");link.href="/members/?profile="+encodeURIComponent(p.handle);link.textContent="@"+p.handle;
 const bio=document.createElement("p");bio.className="muted";bio.textContent=p.bio||"PwnZ member";
 card.append(link,bio);
 if(mine&&p.uid!==user.uid){
 const follow=document.createElement("button");follow.textContent="Follow";follow.className="primary";
 follow.addEventListener("click",async()=>{follow.disabled=true;try{
 const ref=doc(db,"pwnzFollows",user.uid+"__"+p.uid),old=await getDoc(ref);
 if(old.exists()){await deleteDoc(ref);follow.textContent="Follow";}else{await setDoc(ref,{followerUid:user.uid,followedUid:p.uid,createdAt:serverTimestamp()});follow.textContent="Following";}
 }catch(e){say("Connection unavailable: "+e.message);}finally{follow.disabled=false;}});
 const chat=document.createElement("a");chat.href="/messenger/pwnz/?member="+encodeURIComponent(p.handle);chat.textContent="Message";chat.style.marginLeft="12px";
 card.append(follow,chat);
 }host.append(card);
 }
}
el("search").addEventListener("input",render);
load().catch(e=>say(e.message));