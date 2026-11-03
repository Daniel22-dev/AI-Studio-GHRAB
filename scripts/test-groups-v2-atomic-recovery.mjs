// Synthetic Groups v2 final safety regression: no live student data or accounts.
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {createPrincipalGroupsSession,parseRosterText} from '../src/groups/group-service.js';
import {createMockGroupsLockManager} from './test-groups-lock-helper.mjs';

class MemoryStorage {
  constructor(){this.map=new Map();this.writes=0;this.failWrite=false;this.failRead=false;}
  getItem(key){if(this.failRead)throw Error('SIMULATED_READ_FAILED');return this.map.get(key)??null;}
  setItem(key,value){this.writes++;if(this.failWrite)throw Error('SIMULATED_QUOTA');this.map.set(key,String(value));}
  removeItem(key){this.map.delete(key);}
}
let n=0;
const ids=prefix=>prefix+'_'+String(++n).padStart(12,'0');
const signed=sub=>({ready:true,valid:true,mode:'signed-permit',permit:{
  sub,role:'teacher',exp:Math.floor(Date.now()/1000)+3600,
}});
const storage=new MemoryStorage(),locks=createMockGroupsLockManager();
const open=(sub,store=storage,manager=locks)=>createPrincipalGroupsSession({
  getSnapshot:()=>signed(sub),storage:store,cryptoApi:webcrypto,
  idFactory:ids,eventTarget:null,lockManager:manager,
});
const a=await open('synthetic-classroom-A'),b=await open('synthetic-classroom-A');
const input={displayName:'Synthetic 3A4',schoolYear:'2026/27'};
const rawText='Alice Example\nBob Sample';
assert.throws(()=>a.service.createGroupWithRoster({input,rawText}),/GROUP_WRITE_LOCK_REQUIRED/);
const saved=await a.service.withWriteLock(tx=>tx.createGroupWithRoster({input,rawText}));
assert.equal(saved.group.members.length,2);
assert.equal(saved.group.revision,1);
assert.equal(storage.writes,1,'single create+roster must use one durable write');
assert.equal(b.service.listGroups().length,1);
const groupId=saved.group.groupId;
const updates=await Promise.allSettled([
  a.service.withWriteLock(tx=>tx.updateGroup(groupId,{subject:'English'},{expectedRevision:1})),
  b.service.withWriteLock(tx=>tx.updateGroup(groupId,{grade:'3'},{expectedRevision:1})),
]);
assert.equal(updates.filter(x=>x.status==='fulfilled').length,1);
assert.equal(updates.filter(x=>x.status==='rejected').length,1);
assert.match(String(updates.find(x=>x.status==='rejected').reason),/GROUP_REVISION_CONFLICT/);
const backup=a.service.exportBackup();
const priorWrites=storage.writes;
await assert.rejects(a.service.withWriteLock(tx=>tx.createGroupWithRoster({input,rawText:''})),/ROSTER_EMPTY/);
await assert.rejects(a.service.withWriteLock(tx=>tx.createGroupWithRoster({input,rawText:'Alice Example\nAlice Example'})),/ROSTER_IMPORT_INVALID/);
const tooMany=Array.from({length:501},(_,i)=>'Synthetic Student '+(i+1)+'; synthetic'+(i+1)+'@example.invalid').join('\n');
assert.equal(parseRosterText(tooMany).truncated,true);
await assert.rejects(a.service.withWriteLock(tx=>tx.createGroupWithRoster({input,rawText:tooMany})),/ROSTER_IMPORT_TRUNCATED/);
assert.equal(storage.writes,priorWrites);
const scopedKey=[...storage.map.keys()].find(k=>k.startsWith('ghrab.ai-studio.groups.account.v2.'));
assert.ok(scopedKey);
storage.map.set(scopedKey,'{corrupt json');
assert.throws(()=>a.service.listGroups(),/GROUP_STORAGE_RECOVERY_REQUIRED/);
assert.throws(()=>a.service.exportBackup(),/GROUP_STORAGE_RECOVERY_REQUIRED/);
await assert.rejects(a.service.withWriteLock(tx=>tx.createGroup({displayName:'Unsafe',schoolYear:'2026/27'})),/GROUP_STORAGE_RECOVERY_REQUIRED/);
assert.equal(storage.map.get(scopedKey),'{corrupt json');
assert.throws(()=>a.service.importBackup(backup),/GROUP_STORAGE_RECOVERY_REQUIRED/,'damaged source must block import before write-lock checks');
const other=await open('synthetic-classroom-B');
await assert.rejects(other.service.withWriteLock(tx=>tx.importBackup(backup)),/GROUP_SCOPE_BACKUP_OTHER_ACCOUNT/);
await assert.rejects(a.service.withWriteLock(tx=>tx.importBackup(backup)),/GROUP_STORAGE_RECOVERY_REQUIRED/);
const restored=await a.service.withWriteLock(tx=>tx.importBackup(backup,{confirmRecovery:true}));
assert.equal(restored.groups.length,1);
assert.equal(storage.map.get(scopedKey+'.original-corrupt.v1'),'{corrupt json');
assert.equal(a.service.exportBackup().store.groups.length,1);
storage.removeItem(scopedKey);
assert.throws(()=>a.service.listGroups(),/GROUP_STORAGE_RECOVERY_REQUIRED/);
await assert.rejects(a.service.withWriteLock(tx=>tx.importBackup(backup,{confirmRecovery:true})),/GROUP_STORAGE_RECOVERY_REQUIRED/);
assert.equal(storage.getItem(scopedKey),null);
storage.map.set(scopedKey,JSON.stringify(backup.store));
const reopened=await open('synthetic-classroom-A');
assert.equal(reopened.service.listGroups().length,1);
storage.map.set(scopedKey,'{broken again');
assert.throws(()=>reopened.service.listGroups(),/GROUP_STORAGE_RECOVERY_REQUIRED/);
await assert.rejects(reopened.service.withWriteLock(tx=>tx.importBackup(backup,{confirmRecovery:true})),/GROUP_RECOVERY_SNAPSHOT_EXISTS/);
assert.equal(storage.map.get(scopedKey),'{broken again');
const restoreStorage=new MemoryStorage();
const restoreSession=await open('synthetic-recovery-quota',restoreStorage,createMockGroupsLockManager());
await restoreSession.service.withWriteLock(tx=>tx.createGroup(input));
const restoreBackup=restoreSession.service.exportBackup();
const restoreKey=[...restoreStorage.map.keys()].find(k=>k.startsWith('ghrab.ai-studio.groups.account.v2.'));
restoreStorage.map.set(restoreKey,'{failed restore');
assert.throws(()=>restoreSession.service.listGroups(),/GROUP_STORAGE_RECOVERY_REQUIRED/);
restoreStorage.failWrite=true;
await assert.rejects(restoreSession.service.withWriteLock(tx=>tx.importBackup(restoreBackup,{confirmRecovery:true})),/GROUP_RECOVERY_PRESERVE_FAILED/);
assert.equal(restoreStorage.map.get(restoreKey),'{failed restore');
const failing=new MemoryStorage();failing.failWrite=true;
const failedSession=await open('synthetic-failure',failing,createMockGroupsLockManager());
await assert.rejects(failedSession.service.withWriteLock(tx=>tx.createGroupWithRoster({input,rawText})),/GROUP_STORAGE_RECOVERY_REQUIRED/);
assert.throws(()=>failedSession.service.listGroups(),/GROUP_STORAGE_RECOVERY_REQUIRED/,'failed write must not look empty');
const noLock=await open('synthetic-no-lock',new MemoryStorage(),null);
await assert.rejects(noLock.service.withWriteLock(tx=>tx.createGroupWithRoster({input,rawText})),/GROUP_WRITE_LOCK_UNAVAILABLE/);
console.log('PASS Groups v2 atomic create, concurrent revision, 501 limit, damaged backup recovery and account isolation');
