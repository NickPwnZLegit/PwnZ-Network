(()=>{"use strict";
if(document.getElementById("pwnz-global-nav"))return;
const path=location.pathname;
const links=[
 ["Home","⌂","/"],
 ["Social","✦","/social/"],
 ["Members","♧","/members/"],
 ["Messages","✉","/messenger/"],
 ["Arena","🎮","/arena/"]
];
const more=[
 ["My PwnZ Profile","/profile/"],
 ["Post to Profile","/social/?section=profile#compose"],
 ["Gaming & Creator Sign-up","/social/#role-application"],
 ["Creator Community","/community/"],
 ["PwnZ Messenger","/messenger/pwnz/"],
 ["Twitch / Livestreams","/live/"],
 ["LightVault (Light of Hope)","https://light-of-hope.net/#/wallet"],
 ["Light of Hope","https://light-of-hope.net/"],
 ["EdenNetwork","https://edennetwork.live/"]
];
const current=href=>href==="/"?path==="/":path.startsWith(href.split("?")[0].split("#")[0]);
const nav=document.createElement("nav");nav.id="pwnz-global-nav";nav.setAttribute("aria-label","PwnZ quick navigation");
for(const [label,icon,href] of links){const a=document.createElement("a");a.href=href;a.title=label;const sym=document.createElement("span");sym.className="pwnz-nav-icon";sym.setAttribute("aria-hidden","true");sym.textContent=icon;const name=document.createElement("span");name.textContent=label;a.append(sym,name);if(current(href))a.setAttribute("aria-current","page");nav.append(a);}
const toggle=document.createElement("button");toggle.id="pwnz-menu-toggle";toggle.type="button";toggle.setAttribute("aria-label","Open all PwnZ sections");toggle.setAttribute("aria-controls","pwnz-site-drawer");toggle.setAttribute("aria-expanded","false");toggle.textContent="☰ Menu";
const shade=document.createElement("div");shade.id="pwnz-drawer-shade";shade.hidden=true;
const drawer=document.createElement("div");drawer.id="pwnz-site-drawer";drawer.hidden=true;drawer.setAttribute("role","navigation");drawer.setAttribute("aria-label","All PwnZ sections");
const title=document.createElement("strong");title.textContent="PwnZ Network";drawer.append(title);
const note=document.createElement("p");note.className="pwnz-drawer-note";note.textContent="Social access is separate from future paid Arena play. LightVault opens your existing Light of Hope wallet page; you may need to sign in there.";drawer.append(note);
for(const [label,href] of [...links.map(e=>[e[0],e[2]]),...more]){const a=document.createElement("a");a.href=href;a.textContent=label;if(current(href))a.setAttribute("aria-current","page");if(href.startsWith("https:"))a.rel="noopener noreferrer";drawer.append(a);}
function setOpen(open){drawer.hidden=!open;shade.hidden=!open;toggle.setAttribute("aria-expanded",String(open));toggle.textContent=open?"✕ Close":"☰ Menu";if(open)drawer.querySelector("a")?.focus();}
toggle.addEventListener("click",()=>setOpen(drawer.hidden));
shade.addEventListener("click",()=>setOpen(false));
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!drawer.hidden){setOpen(false);toggle.focus();}});
document.body.classList.add("pwnz-toolbar-active");
document.body.append(nav,shade,drawer,toggle);
})();