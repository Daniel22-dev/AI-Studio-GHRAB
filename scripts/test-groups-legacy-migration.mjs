import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import {
  LocalGroupsProvider,createGroupsService,createPrincipalGroupsSession,
} from "../src/groups/group-service.js";
import {prepareLegacyGroupsMigration} from "../src/groups/legacy-migration.js";

class Storage {
  constructor(){this.map=new Map()}
  getItem(k){return this.map.has(k)?this.map.get(k):null}
  setItem(k,v){this.map.set(k,String(v))}
  removeItem(k){this.map.delete(k)}
}
const storage=new Storage();
let id=0;
const idFactory=prefix=>prefix+"_"+String(++id).padStart(12,"0");
const legacy=createGroupsService({
  provider:new LocalGroupsProvider({storage}),idFactory,eventTarget:null,
});
const grp=legacy.createGroup({displayName:"Synthetic class",schoolYear:"2026/27"});
const first=legacy.importRoster({groupId:grp.groupId,
  rawText:"Alice Example; alice@example.invalid\nBob Example; bob@example.invalid",
  expectedRevision:1});
const expectedId=first.group.members[0].memberId;
const backup=legacy.exportBackup();
const originalRaw=storage.getItem("ghrab.ai-studio.groups.v1");
const now=Math.floor(Date.now()/1000);
let current={
  ready:true,valid:true,mode:"signed-permit",
  permit:{sub:"teacher-A",role:"teacher",exp:now+3600},
};
const open=()=>createPrincipalGroupsSession({
  getSnapshot:()=>current,storage,cryptoApi:webcrypto,idFactory,eventTarget:null,
});
const target=await open();
const prepare=(sourceBackup=backup,session=target)=>prepareLegacyGroupsMigration({
  sourceBackup,targetSession:session,cryptoApi:webcrypto,
});
const reviewed=await prepare();
const summary=reviewed.summary;
assert.equal(summary.groupCount,1);
assert.equal(summary.memberCount,2);
assert.equal(summary.groups[0].revision,2);
assert.equal(summary.legacyWillBeDeleted,false);
assert.deepEqual(target.service.listGroups(),[]);
assert.equal(storage.getItem("ghrab.ai-studio.groups.v1"),originalRaw);
const approval={
  schoolOwnershipReviewed:true,originalTeacherConfirmed:true,
  schoolApprovalReference:"SCHOOL-REVIEW-001",
  typedPhrase:"POTVRZUJI PREVOD SKUPIN",
  reviewedSourceDigest:summary.sourceDigest,
  reviewedTargetScope:summary.targetScope,
};
await assert.rejects(reviewed.commit({...approval,originalTeacherConfirmed:false}),/GROUP_MIGRATION_APPROVAL_REQUIRED/);
await assert.rejects(reviewed.commit({...approval,reviewedSourceDigest:"0".repeat(64)}),/GROUP_MIGRATION_APPROVAL_REQUIRED/);
await assert.rejects(reviewed.commit({...approval,typedPhrase:"ANO"}),/GROUP_MIGRATION_APPROVAL_REQUIRED/);
assert.deepEqual(target.service.listGroups(),[],"invalid approval never writes");
const report=await reviewed.commit(approval);
assert.equal(report.verified,true);
assert.equal(report.schoolOwnershipProofCryptographic,false);
assert.equal(report.memberCount,2);
assert.equal("schoolApprovalReference" in report,false);
assert.equal(target.service.getGroup(grp.groupId).revision,2);
assert.equal(target.service.getRosterProjection(grp.groupId,"essay-evaluator").members[0].memberId,expectedId);
assert.equal(storage.getItem("ghrab.ai-studio.groups.v1"),originalRaw,"shared legacy data remain unchanged");
await assert.rejects(reviewed.commit(approval),/GROUP_MIGRATION_ALREADY_USED/);
await assert.rejects(prepare(),/GROUP_MIGRATION_TARGET_NOT_EMPTY/);
current={...current,permit:{...current.permit,sub:"teacher-B"}};
const other=await open();
assert.deepEqual(other.service.listGroups(),[],"other teacher cannot see migrated groups");
const switched=await prepare(backup,other);
current={...current,permit:{...current.permit,sub:"teacher-A"}};
const otherApproval={...approval,reviewedTargetScope:switched.summary.targetScope};
await assert.rejects(switched.commit(otherApproval),/GROUP_ACCESS_DENIED/);
assert.deepEqual((await open()).service.listGroups().map(x=>x.groupId),[grp.groupId]);
const invalid=structuredClone(backup);
invalid.store.groups[0].members[0].memberId="bad";
await assert.rejects(prepare(invalid,other),/GROUP_MIGRATION_SOURCE_INVALID|GROUP_ACCESS_DENIED/);
const unsafe=structuredClone(backup);
unsafe.store.groups[0].members[0].constructor="constructor-injection";
await assert.rejects(prepare(unsafe,other),/GROUP_MIGRATION_UNSAFE_KEYS|GROUP_ACCESS_DENIED/);
console.log("PASS: reviewed legacy migration, stable IDs, rejection cases, no v1 mutation; NO school ownership proof");
