import test from "node:test";
import assert from "node:assert/strict";
import {MAX_BYTES,checkLocalMetadata,checkDecodedMetadata,estimateUncompressedRGBAFrameBytes} from "./local-media-preview.mjs";
test("MP4 and WebM browser metadata stays local and upload-disabled",()=>{
 for(const file of [
  {name:"original.mp4",type:"video/mp4",size:2048},
  {name:"original.webm",type:"video/webm",size:2048}
 ]){
  const m=checkLocalMetadata(file);
  assert.equal(m.ok,true);assert.equal(m.uploadAllowed,false);
 }
});
test("codec spoofing, bad file sizes and unsupported extensions fail closed",()=>{
 for(const file of [
 {name:"file.exe",type:"video/mp4",size:1024},
 {name:"file.mp4",type:"application/octet-stream",size:1024},
 {name:"file.mp4",type:"video/mp4",size:MAX_BYTES+1},
 {name:"file.mp4",type:"video/mp4",size:0}
 ])assert.equal(checkLocalMetadata(file).ok,false);
});
test("actual decoded metadata must meet duration and dimension caps",()=>{
 assert.equal(checkDecodedMetadata({duration:29.99,videoWidth:1920,videoHeight:1080}).ok,true);
 for(const duration of [0,-1,NaN,Infinity,30.1])assert.equal(
  checkDecodedMetadata({duration,videoWidth:1920,videoHeight:1080}).ok,false);
 assert.equal(checkDecodedMetadata({duration:10,videoWidth:999999,videoHeight:10}).ok,false);
});
test("in-memory frame size estimates are bounded and never create uploads",()=>{
 assert.equal(estimateUncompressedRGBAFrameBytes(1280,720),3686400);
 assert.throws(()=>estimateUncompressedRGBAFrameBytes(90000,720),/bounds/);
});
