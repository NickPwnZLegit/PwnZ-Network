// Browser-only MP4/WebM research preview. No upload, storage, tracking,
// codec transcoding, download, signing, accounts, or server calls.
export const MAX_BYTES=45*1024*1024,MAX_SECONDS=30;
const MIME={"video/mp4":".mp4","video/webm":".webm"};
export function checkLocalMetadata(file){
 if(!file||typeof file!=="object")return {ok:false,reason:"Choose a local MP4 or WebM file."};
 if(!Object.hasOwn(MIME,file.type)||typeof file.name!=="string"||
   !file.name.toLowerCase().endsWith(MIME[file.type]))return {ok:false,reason:"Only MP4 or WebM files are supported."};
 if(!Number.isSafeInteger(file.size)||file.size<12||file.size>MAX_BYTES)
   return {ok:false,reason:"Choose a file no larger than 45 MiB."};
 return {ok:true,mime:file.type,size:file.size,uploadAllowed:false};
}
export function checkDecodedMetadata({duration,videoWidth,videoHeight}){
 if(typeof duration!=="number"||!Number.isFinite(duration)||duration<=0||duration>MAX_SECONDS)
  return {ok:false,reason:"Decoded duration must be 30 seconds or less."};
 if(!Number.isSafeInteger(videoWidth)||!Number.isSafeInteger(videoHeight)||
   videoWidth<1||videoHeight<1||videoWidth>7680||videoHeight>4320)
  return {ok:false,reason:"Invalid decoded frame dimensions."};
 return {ok:true,durationSeconds:Number(duration.toFixed(2)),width:videoWidth,height:videoHeight,
   metadataReadInBrowser:true,malwareReviewed:false,rightsReviewed:false,
   transcoded:false,storedOnServer:false};
}
export function estimateUncompressedRGBAFrameBytes(width,height){
 if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||
   width<1||height<1||width>7680||height>4320)throw new TypeError("Frame bounds exceeded.");
 return width*height*4;
}
