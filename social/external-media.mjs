// PwnZ external video parser: no generic iframe/embed injection.
// Providers and canonical paths are explicit; third-party videos remain hosted
// by their respective services. Browser playback of external content requires
// user action and the providers' current terms and geographic availability.
const youtubeIdPattern = /^[A-Za-z0-9_-]{11}$/;
const handlePattern = /^[A-Za-z0-9_]{3,25}$/;
const instagramCodePattern = /^[A-Za-z0-9_-]{5,30}$/;
const tiktokUserPattern = /^@[A-Za-z0-9._]{2,32}$/;
const tiktokVideoIdPattern = /^[0-9]{10,25}$/;
const allowedSections = Object.freeze(["social","profile","creator","gaming","community"]);
const facebookCodePattern=/^[A-Za-z0-9_-]{4,80}$/;
const facebookVideoIdPattern=/^\d{8,30}$/;
export const PWNZ_SECTIONS = allowedSections;
export function normalizePostSection(raw) {
 const v=String(raw||"social").trim().toLowerCase();
 if(!allowedSections.includes(v))throw new Error("Unsupported post destination.");
 return v;
}
export function parsePwnzMediaLink(raw) {
 if(typeof raw!=="string"||!raw.trim())return null;
 if(raw.length>2048)throw new Error("Video URL is too long.");
 let u;
 try{u=new URL(raw.trim());}catch{throw new Error("Enter a valid HTTPS video link.");}
 if(u.protocol!=="https:"||u.username||u.password||u.port)throw new Error("Use a public HTTPS video link.");
 const host=u.hostname.toLowerCase();
 let id=null;
 if(host==="youtu.be"){
   const parts=u.pathname.split("/").filter(Boolean);
   if(parts.length===1)id=parts[0];
 }else if(["youtube.com","www.youtube.com","m.youtube.com"].includes(host)){
   const parts=u.pathname.split("/").filter(Boolean);
   if(u.pathname==="/watch")id=u.searchParams.get("v");
   else if(parts.length===2&&["shorts","embed","live"].includes(parts[0]))id=parts[1];
 }
 if(id!==null){
   if(!youtubeIdPattern.test(id))throw new Error("Invalid YouTube video ID.");
   return Object.freeze({provider:"youtube",youtubeId:id,url:"https://www.youtube.com/watch?v="+id});
 }
 if(["twitch.tv","www.twitch.tv"].includes(host)){
   const parts=u.pathname.split("/").filter(Boolean);
   if(parts.length!==1||!handlePattern.test(parts[0]))throw new Error("Use a Twitch channel link.");
   return Object.freeze({provider:"twitch",twitch:parts[0],url:"https://www.twitch.tv/"+parts[0]});
 }
 if(["instagram.com","www.instagram.com"].includes(host)){
   const parts=u.pathname.split("/").filter(Boolean);
   if(parts.length===2&&["reel","p","tv"].includes(parts[0])&&instagramCodePattern.test(parts[1]))
     return Object.freeze({provider:"instagram",url:"https://www.instagram.com/"+parts[0]+"/"+parts[1]+"/"});
   throw new Error("Use a public Instagram post or Reel URL.");
 }
 if(["tiktok.com","www.tiktok.com"].includes(host)){
   const parts=u.pathname.split("/").filter(Boolean);
   if(parts.length===3&&tiktokUserPattern.test(parts[0])&&parts[1]==="video"&&tiktokVideoIdPattern.test(parts[2]))
     return Object.freeze({provider:"tiktok",url:"https://www.tiktok.com/"+parts.join("/")});
   throw new Error("Use the full public TikTok video URL.");
 }
 if(["facebook.com","www.facebook.com","m.facebook.com","web.facebook.com","fb.watch","www.fb.watch"].includes(host)){
   const parts=u.pathname.split("/").filter(Boolean);
   let url="";
   if(["fb.watch","www.fb.watch"].includes(host)&&parts.length===1&&facebookCodePattern.test(parts[0]))
     url="https://fb.watch/"+parts[0]+"/";
   else if(parts.length===3&&parts[0]==="share"&&["v","r"].includes(parts[1])&&facebookCodePattern.test(parts[2]))
     url="https://www.facebook.com/share/"+parts[1]+"/"+parts[2]+"/";
   else if(parts.length===2&&parts[0]==="reel"&&facebookVideoIdPattern.test(parts[1]))
     url="https://www.facebook.com/reel/"+parts[1]+"/";
   else if(parts.length===1&&parts[0]==="watch"&&facebookVideoIdPattern.test(u.searchParams.get("v")||""))
     url="https://www.facebook.com/watch/?v="+u.searchParams.get("v");
   else if(parts.length>=2&&parts.length<=4&&parts.at(-2)==="videos"&&facebookVideoIdPattern.test(parts.at(-1)))
     url="https://www.facebook.com/"+parts.map(encodeURIComponent).join("/")+"/";
   if(!url)throw new Error("Use a public Facebook video or Reel link.");
   return Object.freeze({provider:"facebook",url});
 }
 throw new Error("Supported videos: YouTube, Twitch, TikTok, Instagram or Facebook.");
}
export function isSafeExternalCard(provider,url) {
 if(!["instagram","tiktok","facebook"].includes(provider)||typeof url!=="string")return false;
 try {const parsed=parsePwnzMediaLink(url);return parsed?.provider===provider&&parsed.url===url;}
 catch{return false;}
}

export function extractPwnzMediaCards(body,limit=3){
 const cards=[],seen=new Set();
 const links=String(body||"").match(/https:\/\/[^\s<>"']+/gi)||[];
 for(let raw of links){
  raw=raw.replace(/[),.!?;:]+$/g,"");
  try{
   const parsed=parsePwnzMediaLink(raw);
   if(parsed&&!seen.has(parsed.url)){
    cards.push(parsed);seen.add(parsed.url);
    if(cards.length>=limit)break;
   }
  }catch{}
 }
 return cards;
}

// Embeds are generated only from validated canonical links; never accept a
// user-submitted iframe URL or HTML. Browser iframe creation is opt-in per card.
export function safePwnzEmbedUrl(media,host="pwnz.live"){
 if(!media||typeof media.url!=="string")return null;
 let checked;
 try{checked=parsePwnzMediaLink(media.url);}catch{return null;}
 if(!checked||checked.provider!==media.provider||checked.url!==media.url)return null;
 if(checked.provider==="youtube")return "https://www.youtube-nocookie.com/embed/"+checked.youtubeId+"?rel=0";
 if(checked.provider==="instagram")return checked.url+"embed/";
 if(checked.provider==="tiktok"){
  const id=checked.url.split("/").filter(Boolean).at(-1);
  return "https://www.tiktok.com/embed/v2/"+id;
 }
 if(checked.provider==="facebook")return "https://www.facebook.com/plugins/video.php?href="+encodeURIComponent(checked.url)+"&show_text=0&width=640";
 if(checked.provider==="twitch"){
  if(!["pwnz.live","www.pwnz.live","localhost"].includes(host))return null;
  return "https://player.twitch.tv/?channel="+encodeURIComponent(checked.twitch)+"&parent="+encodeURIComponent(host)+"&autoplay=false";
 }
 return null;
}
