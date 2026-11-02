(()=>{"use strict";
if(document.getElementById("pwnz-global-nav"))return;
const path=location.pathname;
const entries=[["Home","⌂","/"],["Social","✦","/social/"],["Members","♧","/members/"],["Gaming","🎮","/arena/"],["Creators","◈","/community/"],["Messages","✉","/messenger/pwnz/"]];
const extra=[["My Profile","/profile/"],["PwnZ Messenger","/messenger/pwnz/"],["Eden Messenger","/messenger/"],["Twitch Live","/live/"],["Ecosystem","/ecosystem/"],["Light of Hope","https://light-of-hope.net/"]];
const active=href=>href==="/"?path==="/":path.startsWith(href);
const nav=document.createElement("nav");nav.id="pwnz-global-nav";nav.setAttribute("aria-label","PwnZ main navigation");
for(const [label,icon,href] of entries){const a=document.createElement("a");a.href=href;a.title=label;const sym=document.createElement("span");sym.className="pwnz-nav-icon";sym.setAttribute("aria-hidden","true");sym.textContent=icon;const name=document.createElement("span");name.textContent=label;a.append(sym,name);if(active(href))a.setAttribute("aria-current","page");nav.append(a);}
const toggle=document.createElement("button");toggle.id="pwnz-menu-toggle";toggle.type="button";toggle.setAttribute("aria-label","Open all PwnZ sections");toggle.setAttribute("aria-controls","pwnz-site-drawer");toggle.setAttribute("aria-expanded","false");toggle.textContent="☰ Menu";
const shade=document.createElement("div");shade.id="pwnz-drawer-shade";shade.hidden=true;
const drawer=document.createElement("div");drawer.id="pwnz-site-drawer";drawer.hidden=true;drawer.setAttribute("role","navigation");drawer.setAttribute("aria-label","All PwnZ sections");
const title=document.createElement("strong");title.textContent="Explore the PwnZ Network";drawer.append(title);
for(const [label,href] of [...entries.map(e=>[e[0],e[2]]),...extra]){const a=document.createElement("a");a.href=href;a.textContent=label;if(active(href))a.setAttribute("aria-current","page");if(href.startsWith("https:"))a.rel="noopener noreferrer";drawer.append(a);}
function setOpen(open){drawer.hidden=!open;shade.hidden=!open;toggle.setAttribute("aria-expanded",String(open));toggle.textContent=open?"✕ Close":"☰ Menu";if(open)drawer.querySelector("a")?.focus();}
toggle.addEventListener("click",()=>setOpen(drawer.hidden));
shade.addEventListener("click",()=>setOpen(false));
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!drawer.hidden){setOpen(false);toggle.focus();}});
document.body.classList.add("pwnz-toolbar-active");
document.body.append(nav,shade,drawer,toggle);
})();