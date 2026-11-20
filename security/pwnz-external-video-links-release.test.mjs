import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {parsePwnzMediaLink,extractPwnzMediaCards,safePwnzEmbedUrl} from "../social/external-media.mjs";
const src=readFileSync(new URL("../social/social.js",import.meta.url),"utf8");
const html=readFileSync(new URL("../social/index.html",import.meta.url),"utf8");
test("YouTube canonical video",()=>assert.equal(parsePwnzMediaLink("https://youtu.be/abcdEFG1234").youtubeId,"abcdEFG1234"));
test("Twitch canonical channel",()=>assert.equal(parsePwnzMediaLink("https://twitch.tv/stream123").twitch,"stream123"));
test("TikTok canonical URL",()=>assert.equal(parsePwnzMediaLink("https://www.tiktok.com/@creator/video/1234567890123456789").provider,"tiktok"));
test("Instagram Reel canonical URL",()=>assert.equal(parsePwnzMediaLink("https://www.instagram.com/reel/AaBbCcDd1/").provider,"instagram"));
test("reject arbitrary video providers",()=>assert.throws(()=>parsePwnzMediaLink("https://example.com/watch/abc")));
test("reject URL credentials",()=>assert.throws(()=>parsePwnzMediaLink("https://me:pass@instagram.com/reel/AaBbCcDd1/")));
test("extract up to three safe URLs and deduplicate",()=>{const text="Watch https://www.instagram.com/reel/AaBbCcDd1/ again https://www.instagram.com/reel/AaBbCcDd1/ and https://www.tiktok.com/@creator/video/1234567890123456789";assert.equal(extractPwnzMediaCards(text).length,2);});
test("no arbitrary iframe or third-party script injection",()=>assert.ok(!/tiktok\.com\/embed|instagram\.com\/embed|innerHTML\s*=/.test(src)));
test("current post schema remains unchanged",()=>{assert.match(src,/body:finalBody/);assert.ok(!src.includes("externalMedia:externalMedia"));});
test("third party content is an outbound user-controlled click",()=>{assert.match(src,/original\.target="_blank"/);assert.match(src,/original\.rel="noopener noreferrer"/);});
test("five supported providers shown on composer",()=>assert.match(html,/YouTube, Twitch, TikTok, Instagram or Facebook/));

test("Facebook video links are canonical and never arbitrary HTML",()=>{
 const v=parsePwnzMediaLink("https://www.facebook.com/share/v/1FMsS2j7mg/");
 assert.equal(v.provider,"facebook");
 assert.match(safePwnzEmbedUrl(v),/^https:\/\/www\.facebook\.com\/plugins\/video\.php\?/);
 assert.throws(()=>parsePwnzMediaLink("https://facebook.com.attacker.example/share/v/1FMsS2j7mg/"));
});
test("external player creation requires explicit user click and accepted origin",()=>{
 assert.match(src,/play\.addEventListener\("click"/);
 assert.match(src,/safePwnzEmbedUrl\(media,window\.location\.hostname\)/);
 assert.match(src,/prior\.remove\(\)/);
 assert.doesNotMatch(src,/\.innerHTML\s*=/);
 const media=parsePwnzMediaLink("https://www.twitch.tv/stream123");
 assert.equal(safePwnzEmbedUrl(media,"attacker.example"),null);
});
test("preview is local only and does not create a public media record",()=>{
 const preview=readFileSync(new URL("../social/clip-intake-policy.mjs",import.meta.url),"utf8");
 assert.match(src,/URL\.createObjectURL/);
 assert.match(src,/URL\.revokeObjectURL/);
 assert.match(src,/validateClipDuration/);
 assert.doesNotMatch(src,/uploadBytes|uploadString|putBlob|fetch\("\/api\/upload/);
 assert.match(preview,/45\*1024\*1024/);
 assert.match(html,/This does not upload a video/);
});
