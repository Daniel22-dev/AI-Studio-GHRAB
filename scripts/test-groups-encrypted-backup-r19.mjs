import assert from "node:assert/strict";
import {webcrypto} from "node:crypto";
import {encryptGroupsBackup,decryptGroupsBackup,ENCRYPTED_SCHEMA} from "../src/groups/encrypted-backup.js";
const phrase="A-Unique-Synthetic-Backup-Passphrase-For-Tests";
const clear={schema:"ghrab-teaching-groups-account-backup-v2",version:2,scopeId:"f".repeat(64),
  store:{groups:[{groupId:"grp_synthetic",members:[{name:"Synthetic Student",schoolEmail:"synthetic@example.invalid"}]}]}};
const sealed=await encryptGroupsBackup(clear,phrase,webcrypto);
const serialized=JSON.stringify(sealed);
assert.equal(sealed.schema,ENCRYPTED_SCHEMA);
assert.equal(sealed.iterations,600000);
assert.equal(Object.keys(sealed).length,6);
assert.doesNotMatch(serialized,/Synthetic Student|synthetic@example.invalid|grp_synthetic|scopeId/);
assert.deepEqual(await decryptGroupsBackup(sealed,phrase,webcrypto),clear);
const second=await encryptGroupsBackup(clear,phrase,webcrypto);
assert.notEqual(second.salt,sealed.salt);
assert.notEqual(second.iv,sealed.iv);
assert.notEqual(second.data,sealed.data);
await assert.rejects(decryptGroupsBackup(sealed,phrase+"bad",webcrypto),/GROUP_BACKUP_AUTH_FAILED/);
for(const key of ["salt","iv","data"]){
  const tampered={...sealed,[key]:"A".repeat(sealed[key].length)};
  await assert.rejects(decryptGroupsBackup(tampered,phrase,webcrypto),/GROUP_ENCRYPTED_BACKUP_INVALID|GROUP_BACKUP_AUTH_FAILED/);
}
for(const malformed of [{...sealed,iterations:1},{...sealed,version:2},
  {...sealed,secret:"synthetic"},{...sealed,data:"?"},{}]){
  await assert.rejects(decryptGroupsBackup(malformed,phrase,webcrypto),/GROUP_ENCRYPTED_BACKUP_INVALID/);
}
await assert.rejects(encryptGroupsBackup(clear,"short",webcrypto),/GROUP_BACKUP_PASSPHRASE_WEAK/);
await assert.rejects(encryptGroupsBackup(clear,phrase,null),/GROUP_BACKUP_CRYPTO_UNAVAILABLE/);
console.log("PASS Groups R19 encryption: PBKDF2 600k + AES-GCM, random salt/IV, confidentiality, tamper, no fallback");
