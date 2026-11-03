// Encrypted file; same-origin localStorage is outside this boundary.
export const ENCRYPTED_SCHEMA="ghrab-teaching-groups-encrypted-v1";
const N=600000,T=new TextEncoder(),AAD=T.encode(ENCRYPTED_SCHEMA),MAX=12582912;
function bad(){throw Error("GROUP_ENCRYPTED_BACKUP_INVALID")}
function check(p,c){
if(!c?.subtle||!c.getRandomValues)throw Error("GROUP_BACKUP_CRYPTO_UNAVAILABLE");
if(typeof p!=="string"||p.length<16||p.length>512)throw Error("GROUP_BACKUP_PASSPHRASE_WEAK");
}
function b64(a){let s="";for(let i=0;i<a.length;i+=32768)s+=String.fromCharCode(...a.subarray(i,i+32768));return btoa(s)}
function unb64(s,m){
if(typeof s!=="string"||s.length>Math.ceil(m*4/3)+4||s.length%4||!/^[A-Za-z0-9+/]*={0,2}$/.test(s))bad();
try{const b=atob(s);if(b.length>m)bad();return Uint8Array.from(b,c=>c.charCodeAt(0))}catch{bad()}
}
async function key(p,s,c){
const k=await c.subtle.importKey("raw",T.encode(p),"PBKDF2",false,["deriveKey"]);
return c.subtle.deriveKey({name:"PBKDF2",salt:s,iterations:N,hash:"SHA-256"},k,
{name:"AES-GCM",length:256},false,["encrypt","decrypt"]);
}
export async function encryptGroupsBackup(backup,password,c=globalThis.crypto){
check(password,c);
const salt=c.getRandomValues(new Uint8Array(16)),iv=c.getRandomValues(new Uint8Array(12)),data=T.encode(JSON.stringify(backup));
if(data.length>MAX)throw Error("GROUP_RESTORE_FILE_TOO_LARGE");
const enc=await c.subtle.encrypt({name:"AES-GCM",iv,additionalData:AAD},await key(password,salt,c),data);
return {schema:ENCRYPTED_SCHEMA,version:1,iterations:N,salt:b64(salt),iv:b64(iv),data:b64(new Uint8Array(enc))};
}
export async function decryptGroupsBackup(b,password,c=globalThis.crypto){
check(password,c);
if(!b||typeof b!=="object"||Array.isArray(b)||Object.keys(b).sort().join(",")!=="data,iterations,iv,salt,schema,version"||
b.schema!==ENCRYPTED_SCHEMA||b.version!==1||b.iterations!==N)bad();
const salt=unb64(b.salt,16),iv=unb64(b.iv,12),data=unb64(b.data,MAX+16);
if(salt.length!==16||iv.length!==12||data.length<17)bad();
try{
const clear=await c.subtle.decrypt({name:"AES-GCM",iv,additionalData:AAD},await key(password,salt,c),data);
return JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(clear));
}catch{throw Error("GROUP_BACKUP_AUTH_FAILED")}
}
