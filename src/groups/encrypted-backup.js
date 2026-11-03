// Browser-only encrypted export; NOT encryption of same-origin localStorage.
export const ENCRYPTED_SCHEMA="ghrab-teaching-groups-encrypted-v1";
const rounds=600000,encoder=new TextEncoder(),aad=encoder.encode(ENCRYPTED_SCHEMA);
const bad=()=>new Error("GROUP_ENCRYPTED_BACKUP_INVALID");
function cryptoReady(c){
  if(!c?.getRandomValues||!c?.subtle?.importKey||!c.subtle?.deriveKey||!c.subtle?.encrypt||!c.subtle?.decrypt)
    throw new Error("GROUP_BACKUP_CRYPTO_UNAVAILABLE");
}
function phrase(p){
  if(typeof p!=="string"||p.length<16||p.length>512)
    throw new Error("GROUP_BACKUP_PASSPHRASE_WEAK");
}
function base64(a){
  let raw="";for(let i=0;i<a.length;i+=32768)raw+=String.fromCharCode(...a.subarray(i,i+32768));
  return btoa(raw);
}
function bytes(s,max){
  if(typeof s!=="string"||s.length>Math.ceil(max*4/3)+4||
     s.length%4!==0||!/^[A-Za-z0-9+/]*={0,2}$/.test(s))throw bad();
  try{const r=atob(s);if(r.length>max)throw bad();return Uint8Array.from(r,c=>c.charCodeAt(0))}
  catch{throw bad()}
}
async function key(p,s,c){
  const input=await c.subtle.importKey("raw",encoder.encode(p),"PBKDF2",false,["deriveKey"]);
  return c.subtle.deriveKey({name:"PBKDF2",salt:s,iterations:rounds,hash:"SHA-256"},
    input,{name:"AES-GCM",length:256},false,["encrypt","decrypt"]);
}
export async function encryptGroupsBackup(backup,password,c=globalThis.crypto){
  cryptoReady(c);phrase(password);
  const salt=c.getRandomValues(new Uint8Array(16)),iv=c.getRandomValues(new Uint8Array(12));
  const clear=encoder.encode(JSON.stringify(backup));
  if(clear.length>12*1024*1024)throw new Error("GROUP_RESTORE_FILE_TOO_LARGE");
  const ciphertext=await c.subtle.encrypt({name:"AES-GCM",iv,additionalData:aad},
    await key(password,salt,c),clear);
  return {schema:ENCRYPTED_SCHEMA,version:1,iterations:rounds,
    salt:base64(salt),iv:base64(iv),data:base64(new Uint8Array(ciphertext))};
}
export async function decryptGroupsBackup(input,password,c=globalThis.crypto){
  cryptoReady(c);phrase(password);
  if(!input||typeof input!=="object"||Array.isArray(input)||
     Object.keys(input).sort().join(",")!=="data,iterations,iv,salt,schema,version"||
     input.schema!==ENCRYPTED_SCHEMA||input.version!==1||input.iterations!==rounds)throw bad();
  const salt=bytes(input.salt,16),iv=bytes(input.iv,12),data=bytes(input.data,12*1024*1024+16);
  if(salt.length!==16||iv.length!==12||data.length<17)throw bad();
  try{
    const clear=await c.subtle.decrypt({name:"AES-GCM",iv,additionalData:aad},
      await key(password,salt,c),data);
    return JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(clear));
  }catch{throw new Error("GROUP_BACKUP_AUTH_FAILED")}
}
