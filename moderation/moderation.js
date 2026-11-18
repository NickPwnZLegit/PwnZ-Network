// PRIVATE PREVIEW TOOL. No auto-classification, automated takedowns or
// direct client-side Firestore modifications. The server must verify every action.
import {initializeApp,getApps,getApp} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {getAuth,onAuthStateChanged,signInWithEmailAndPassword,signOut} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
const $=id=>document.getElementById(id);
let auth,user;
function status(text){$("status").textContent=text;}
async function session(){if(!user)throw new Error("Sign in with an authorized moderator account.");return user.getIdToken();}
async function server(method,body){
 const token=await session();
 const r=await fetch("/api/pwnz-moderation",{method,cache:"no-store",
  headers:{"Authorization":"Bearer "+token,...(body?{"Content-Type":"application/json"}:{})},
  ...(body?{body:JSON.stringify(body)}:{})});
 const data=await r.json().catch(()=>({}));
 if(!r.ok)throw new Error(data.error||"Private moderation is unavailable.");
 return data;
}
async function refresh(){
 $("reports").replaceChildren();status("Loading private report queue…");
 try{
  const data=await server("GET");
  if(!data.reports?.length){$("reports").textContent="No pending reports.";status("Queue reviewed.");return;}
  for(const report of data.reports){
   const item=document.createElement("article");item.className="item";
   const name=document.createElement("strong");name.textContent="Report: "+report.id;
   const details=document.createElement("p");details.className="muted";
   details.textContent="Reason: "+report.reason+" | Post: "+report.postId+" | Received: "+(report.createdAt||"unknown");
   const actions=document.createElement("div");actions.className="actions";
   for(const [title,action] of [["Hide reported post","hide-post"],["Dismiss report","dismiss-report"]]){
    const button=document.createElement("button");button.type="button";button.textContent=title;
    button.addEventListener("click",async()=>{
     if(!window.confirm(action==="hide-post"?"Hide the entire reported post after human review?":"Dismiss this report after human review?"))return;
     button.disabled=true;try{await server("POST",{action,reportId:report.id});status("Human review action recorded.");await refresh();}
     catch(e){status(e.message);}finally{button.disabled=false;}
    });actions.append(button);
   }
   item.append(name,details,actions);$("reports").append(item);
  }
  status("Report queue loaded. No action is automatic.");
 }catch(e){status(e.message);}
}
$("login").addEventListener("submit",async e=>{e.preventDefault();try{
 await signInWithEmailAndPassword(auth,$("email").value.trim(),$("password").value);
 $("password").value="";
 }catch(error){status("Unable to sign in: "+error.code);}});
$("refresh").addEventListener("click",refresh);
$("logout").addEventListener("click",()=>signOut(auth));
(async()=>{try{
 const r=await fetch("/api/pwnz-config",{cache:"no-store"});
 const info=await r.json();
 if(!r.ok||!info.configured||!info.config){status("Preview Firebase configuration unavailable.");return;}
 const app=getApps().length?getApp():initializeApp(info.config);
 auth=getAuth(app);
 onAuthStateChanged(auth,async value=>{
  user=value;
  $("sign-in").hidden=Boolean(value);
  $("workspace").hidden=!value;
  if(value)await refresh();
  else status("A verified moderator account is required.");
 });
 }catch(e){status("Moderation unavailable in this environment.");}})();
