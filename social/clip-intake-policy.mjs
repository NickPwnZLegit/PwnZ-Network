// Client preview validation only. This is not a trusted upload grant.
export const CLIP_LIMIT_BYTES=45*1024*1024;
export const CLIP_DURATION_SECONDS=30;
export const CLIP_MIME_TYPES=Object.freeze(["video/mp4","video/webm"]);
export function validateClipMetadata(file){
 if(!file||typeof file!=="object")return {ok:false,error:"Choose an MP4 or WebM file."};
 if(!CLIP_MIME_TYPES.includes(file.type))return {ok:false,error:"Only MP4 or WebM videos are supported."};
 if(!Number.isSafeInteger(file.size)||file.size<1||file.size>CLIP_LIMIT_BYTES)
  return {ok:false,error:"Keep videos under 45 MiB."};
 if(!/\.(mp4|webm)$/i.test(String(file.name||"")))return {ok:false,error:"Choose a .mp4 or .webm file."};
 return {ok:true,mimeType:file.type,size:file.size};
}
export function validateClipDuration(duration){
 return Number.isFinite(duration)&&duration>0&&duration<=CLIP_DURATION_SECONDS;
}
