// Hope Labs: synthetic manifest screening only. Never executes, imports,
// fetches or unzips creator-submitted game files.
const APPROVED_RUNTIME="browser-wasm-webgl";
const validName=(s)=>typeof s==="string"&&s.length>=3&&s.length<=90&&!/[<>\\]/.test(s);
const safePath=(s)=>typeof s==="string"&&s.length<=180&&/^[a-zA-Z0-9][a-zA-Z0-9/_-]*\.(html|js|mjs|wasm|css|json|png|jpg|jpeg|webp|ogg|mp3|wav)$/.test(s)&&
 !s.split("/").includes("..")&&!s.startsWith("/")&&!s.includes("//");
export const PILOT_MAX_BUNDLE_BYTES=25*1024*1024;
export const PILOT_MAX_FILES=120;
export const PILOT_ALLOWED_PERMISSIONS=Object.freeze(["keyboard","pointer","gamepad","audio"]);
export function validateGameManifest(raw){
 if(!raw||typeof raw!=="object"||Array.isArray(raw))return {ok:false,reason:"Invalid game manifest."};
 const {title,runtime,entry,files,requestedPermissions,declaredAssets}=raw;
 if(!validName(title))return {ok:false,reason:"A game title of 3–90 characters is required."};
 if(runtime!==APPROVED_RUNTIME)return {ok:false,reason:"Only browser-targeted WebAssembly/WebGL is eligible for offline review."};
 if(entry!=="index.html")return {ok:false,reason:"Offline pilot requires index.html as the game entry."};
 if(!Array.isArray(files)||files.length<1||files.length>PILOT_MAX_FILES)return {ok:false,reason:"File count exceeds offline pilot limits."};
 const seen=new Set();let total=0;
 for(const f of files){
  if(!f||!safePath(f.path)||!Number.isSafeInteger(f.bytes)||f.bytes<1||seen.has(f.path))
   return {ok:false,reason:"A file path, size or duplicate is invalid."};
  seen.add(f.path);total+=f.bytes;
  if(!Number.isSafeInteger(total)||total>PILOT_MAX_BUNDLE_BYTES)
   return {ok:false,reason:"Game bundle exceeds offline pilot size limit."};
 }
 if(!seen.has(entry))return {ok:false,reason:"Entry file is absent."};
 if(!Array.isArray(requestedPermissions)||requestedPermissions.some(v=>!PILOT_ALLOWED_PERMISSIONS.includes(v))||
  new Set(requestedPermissions).size!==requestedPermissions.length)
  return {ok:false,reason:"Game requested unsupported or duplicate permissions."};
 if(!declaredAssets||declaredAssets.codeOwnedOrLicensed!==true||declaredAssets.mediaOwnedOrLicensed!==true)
  return {ok:false,reason:"Code and audiovisual rights must be separately declared."};
 return Object.freeze({ok:true,normalized:Object.freeze({
  title,runtime,entry,files:Object.freeze(files.map(f=>Object.freeze({path:f.path,bytes:f.bytes}))),
  requestedPermissions:Object.freeze([...requestedPermissions]),totalBytes:total,
  reviewStatus:"pending-human-review",executable:false
 })});
}
