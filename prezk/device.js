// Pre-ZK first-party browser device key. A device proof is NOT biometric,
// personhood, proof of one-human-one-account, MFA enforcement, or SSO.
// The origin's IndexedDB stores a non-exportable ECDSA private CryptoKey.
const DB="hope-prezk-device-keys-v1",STORE="keys";
function openDB(){
 return new Promise((resolve,reject)=>{
  const req=indexedDB.open(DB,1);
  req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE)};
  req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
 });
}
async function item(key,mode,value){
 const db=await openDB();
 try{
  return await new Promise((resolve,reject)=>{
   const tx=db.transaction(STORE,mode),store=tx.objectStore(STORE);
   const req=mode==="readonly"?store.get(key):store.put(value,key);
   req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
   tx.onerror=()=>reject(tx.error);
  });
 }finally{db.close()}
}
const asBase64=buffer=>{
 const bytes=new Uint8Array(buffer);let str="";
 for(let i=0;i<bytes.length;i++)str+=String.fromCharCode(bytes[i]);
 return btoa(str).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
};
async function call(api,token,body){
 const response=await fetch(api+(body?"" : "?network="+encodeURIComponent(token.network)),{
  method:body?"POST":"GET",headers:{Authorization:"Bearer "+token.value,...(body?{"Content-Type":"application/json"}:{})},
  cache:"no-store",...(body?{body:JSON.stringify(body)}:{})
 });
 const json=await response.json().catch(()=>({}));
 if(!response.ok||!json.ok)throw new Error(json.error||"Device test is currently unavailable.");
 return json;
}
export async function inspectPreZkDevice({uid,idToken,network,api="/api/prezk-device"}){
 return call(api,{value:idToken,network});
}
export async function testPreZkDevice({uid,idToken,network,api="/api/prezk-device"}){
 if(!globalThis.crypto?.subtle||!globalThis.indexedDB)throw new Error("Secure browser key storage is not available.");
 if(!/^[A-Za-z0-9_-]{6,128}$/.test(uid||""))throw new Error("Invalid authenticated session.");
 const keyName=uid+"|"+network;
 const status=await call(api,{value:idToken,network});
 if(!status.eligible)throw new Error("Complete your Eden RealID and 30-day agreement first.");
 let privateKey=await item(keyName,"readonly");
 if(status.enrolled&&!privateKey)throw new Error("This browser does not have its original enrolled key. Use your existing device. Replacement will require a recovery review.");
 let publicKey;
 if(!status.enrolled){
  const pair=await crypto.subtle.generateKey({name:"ECDSA",namedCurve:"P-256"},false,["sign","verify"]);
  privateKey=pair.privateKey;
  publicKey=await crypto.subtle.exportKey("jwk",pair.publicKey);
 }
 const challenge=await call(api,{value:idToken,network},{action:"challenge",network});
 if(challenge.purpose==="verify"&&!status.enrolled)
  throw new Error("Enrollment state changed. Refresh and check your device.");
 if(challenge.purpose==="enroll"&&status.enrolled)
  throw new Error("Device enrollment is already active on this account.");
 const signature=asBase64(await crypto.subtle.sign({name:"ECDSA",hash:"SHA-256"},
  privateKey,new TextEncoder().encode(challenge.payload)));
 const result=await call(api,{value:idToken,network},{
  action:"complete",network,challengeId:challenge.challengeId,signature,
  ...(publicKey?{publicKey:{kty:"EC",crv:"P-256",x:publicKey.x,y:publicKey.y}}:{})
 });
 if(result.status==="device-enrolled")await item(keyName,"readwrite",privateKey);
 return result;
}
