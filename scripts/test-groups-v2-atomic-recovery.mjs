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
const tooMany=Array.from({length:501},(_,i)=>'Student '+(i+1)+' Example').join('\n');
assert.equal(parseRosterText(tooMany).truncated,true);
await assert.rejects(a.service.withWriteLock(tx=>tx.createGroupWithRoster({input,rawText:tooMany})),/ROSTER_IMPORT_TRUNCATED/);
assert.equal(storage.writes,priorWrites);
const scopedKey=[...storage.map.keys()].find(k=>k.startsWith('ghrab.ai-studio.groups.account.v2.'));
assert.ok(scopedKey);
storage.map.set(scopedKey,'{corrupt json');
assert.equal(a.service.listGroups().length,1,'lastGood remains read-only for diagnosis');
assert.throws(()=>a.service.exportBackup(),/GROUP_BACKUP_SOURCE_UNAVAILABLE/);
await assert.rejects(a.service.withWriteLock(tx=>tx.createGroup({displayName:'Unsafe',schoolYear:'2026/27'})),/GROUP_STORAGE_CORRUPT_WRITE_BLOCKED/);
assert.equal(storage.map.get(scopedKey),'{corrupt json');
assert.throws(()=>a.service.importBackup(backup),/GROUP_WRITE_LOCK_REQUIRED/);
const other=await open('synthetic-classroom-B');
await assert.rejects(other.service.withWriteLock(tx=>tx.importBackup(backup)),/GROUP_SCOPE_BACKUP_OTHER_ACCOUNT/);
assert.equal(other.service.listGroups().length,0);
const restored=await a.service.withWriteLock(tx=>tx.importBackup(backup));
assert.equal(restored.groups.length,1);
assert.equal(a.service.exportBackup().store.groups.length,1);
storage.removeItem(scopedKey);
assert.equal(a.service.listGroups().length,1);
assert.throws(()=>a.service.exportBackup(),/GROUP_BACKUP_SOURCE_UNAVAILABLE/);
await assert.rejects(a.service.withWriteLock(tx=>tx.createGroup({displayName:'Unsafe',schoolYear:'2026/27'})),/GROUP_STORAGE_UNVERIFIED_WRITE_BLOCKED/);
await a.service.withWriteLock(tx=>tx.importBackup(backup));
storage.map.set(scopedKey,'{broken again');a.service.listGroups();
storage.failWrite=true;
await assert.rejects(a.service.withWriteLock(tx=>tx.importBackup(backup)),/GROUP_STORAGE_WRITE_FAILED/);
assert.equal(storage.map.get(scopedKey),'{broken again');
storage.failWrite=false;
await a.service.withWriteLock(tx=>tx.importBackup(backup));
const failing=new MemoryStorage();failing.failWrite=true;
const failedSession=await open('synthetic-failure',failing,createMockGroupsLockManager());
await assert.rejects(failedSession.service.withWriteLock(tx=>tx.createGroupWithRoster({input,rawText})),/GROUP_STORAGE_WRITE_FAILED/);
assert.equal(failedSession.service.listGroups().length,0,'failed write cannot leave an empty ghost group');
const noLock=await open('synthetic-no-lock',new MemoryStorage(),null);
await assert.rejects(noLock.service.withWriteLock(tx=>tx.createGroupWithRoster({input,rawText})),/GROUP_WRITE_LOCK_UNAVAILABLE/);
console.log('PASS Groups v2 atomic create, concurrent revision, 501 limit, damaged backup recovery and account isolation');
