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
 throw new Error("Supported videos: YouTube, Twitch, TikTok, or Instagram.");
}
export function isSafeExternalCard(provider,url) {
 if(!["instagram","tiktok"].includes(provider)||typeof url!=="string")return false;
 try {const parsed=parsePwnzMediaLink(url);return parsed?.provider===provider&&parsed.url===url;}
 catch{return false;}
}
