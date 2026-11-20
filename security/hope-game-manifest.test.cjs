const test=require("node:test");const assert=require("node:assert/strict");
(async()=>{
 const {validateGameManifest}=await import("../research/gamePackageManifest.mjs");
 const sample=()=>({title:"Hope Arena Demo",runtime:"browser-wasm-webgl",entry:"index.html",
  files:[{path:"index.html",bytes:800},{path:"main.wasm",bytes:4096},{path:"game.js",bytes:1000}],
  requestedPermissions:["keyboard","pointer","audio"],
  declaredAssets:{codeOwnedOrLicensed:true,mediaOwnedOrLicensed:true}});
 test("valid offline synthetic game is always review-only",()=>{
  const m=validateGameManifest(sample());assert.equal(m.ok,true);assert.equal(m.normalized.executable,false);
  assert.equal(m.normalized.reviewStatus,"pending-human-review");
 });
 test("reject native executables, invalid traversal and nonexistent entries",()=>{
  for(const filename of ["../../secrets.js","game.exe","/private/game.js","scripts//x.js"]){
   const m=sample();m.files[1].path=filename;assert.equal(validateGameManifest(m).ok,false,filename);
  }
  const m=sample();m.entry="main.html";assert.equal(validateGameManifest(m).ok,false);
 });
 test("reject oversized, duplicate, unsupported and undeclared media rights",()=>{
  for(const mutate of [
   m=>m.files[1].bytes=27*1024*1024,
   m=>m.files[1].path="index.html",
   m=>m.requestedPermissions.push("network"),
   m=>m.declaredAssets.mediaOwnedOrLicensed=false,
   m=>m.runtime="windows-native",
   m=>m.files=[]
  ]){const m=sample();mutate(m);assert.equal(validateGameManifest(m).ok,false);}
 });
 test("never executes untrusted package or grants access",()=>{
  const source=require("node:fs").readFileSync("research/gamePackageManifest.mjs","utf8");
  assert.doesNotMatch(source,/eval\(|new Function\(|child_process|spawn\(|exec\(|import\(/);
 });
})();
