// PwnZ media validation: advisory client-side contract, not upload authorization.
export const PWNZ_MEDIA = Object.freeze({
  types:Object.freeze(["image/jpeg","image/png","image/webp","video/mp4","video/webm"]),
  imageBytes:10*1024*1024, clipBytes:45*1024*1024,
  clipSeconds:30,
  scopes:Object.freeze(["social","profile","creator","community"])
});
export function checkPwnzMedia(file,scope){
  if(!PWNZ_MEDIA.scopes.includes(scope))throw new Error("Unsupported PwnZ upload destination.");
  if(!file||!PWNZ_MEDIA.types.includes(file.type))throw new Error("Choose JPG, PNG, WebP, MP4 or WebM.");
  const video=file.type.startsWith("video/");
  if(!Number.isSafeInteger(file.size)||file.size<1||file.size>(video?PWNZ_MEDIA.clipBytes:PWNZ_MEDIA.imageBytes))throw new Error("Media file exceeds permitted size.");
  return {kind:video?"video":"image",scope,bytes:file.size,mimeType:file.type};
}
export function validPwnzClipDuration(seconds){
  return Number.isFinite(seconds)&&seconds>0&&seconds<=PWNZ_MEDIA.clipSeconds;
}
export function canShowPwnzAsset(asset){
  return Boolean(asset&&asset.status==="approved"&&asset.scanStatus==="passed"&&asset.authorized===true&&typeof asset.url==="string"&&asset.url.startsWith("https://"));
}
