#!/usr/bin/env node
/* Browser-only synthetic proof of explicit v1 -> v2 transfer.
 * No teacher identities, signed school permits or real pupil data.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const origin="https://groups-migration.example";
const base="/AI-Studio-GHRAB/";
const source=new Map([
  [base+"groups/group-service.js",readFileSync("src/groups/group-service.js","utf8")],
  [base+"groups/legacy-migration.js",readFileSync("src/groups/legacy-migration.js","utf8")],
]);
const browser=await chromium.launch({headless:true});
try {
  const context=await browser.newContext();
  const page=await context.newPage();
  const errors=[];
  page.on("pageerror",error=>errors.push(error.message));
  await page.route(origin+"/**",async route=>{
    const path=new URL(route.request().url()).pathname;
    if(source.has(path))return route.fulfill({status:200,contentType:"text/javascript",body:source.get(path)});
    return route.fulfill({status:200,contentType:"text/html",body:"<!doctype html><title>synthetic migration</title>"});
  });
  await page.goto(origin+base);
  const result=await page.evaluate(async()=>{
    const groups=await import("/AI-Studio-GHRAB/groups/group-service.js");
    const migration=await import("/AI-Studio-GHRAB/groups/legacy-migration.js");
    const old=groups.createGroupsService();
    const created=old.createGroup({displayName:"Synthetic Czech class",schoolYear:"2026/27"});
    const withRoster=old.importRoster({
      groupId:created.groupId,expectedRevision:created.revision,
      rawText:"Synthetic Learner; synthetic@example.invalid",
    });
    const backup=old.exportBackup();
    const legacyByte=localStorage.getItem("ghrab.ai-studio.groups.v1");
    const now=Math.floor(Date.now()/1000);
    let snapshot={ready:true,valid:true,mode:"signed-permit",
      permit:{sub:"teacher-A",role:"teacher",exp:now+3600}};
    const open=()=>groups.createPrincipalGroupsSession({getSnapshot:()=>snapshot});
    const a=await open();
    const prepared=await migration.prepareLegacyGroupsMigration({
      sourceBackup:backup,targetSession:a,
    });
    const before=a.service.listGroups().length;
    const summary=prepared.summary;
    let withoutApprovalRejected=false;
    try{await prepared.commit({})}catch(e){withoutApprovalRejected=e.message==="GROUP_MIGRATION_APPROVAL_REQUIRED"}
    const approval={schoolOwnershipReviewed:true,originalTeacherConfirmed:true,
      schoolApprovalReference:"SCHOOL-TEST-001",
      typedPhrase:"POTVRZUJI PREVOD SKUPIN",
      reviewedSourceDigest:summary.sourceDigest,
      reviewedTargetScope:summary.targetScope};
    const report=await prepared.commit(approval);
    const migrated=a.service.getGroup(created.groupId);
    const sameMember=migrated.members[0].memberId===withRoster.group.members[0].memberId;
    const noPii= !JSON.stringify(report).includes("synthetic@example.invalid") &&
      !JSON.stringify(report).includes("Synthetic Learner");
    const oldPreserved=legacyByte===localStorage.getItem("ghrab.ai-studio.groups.v1");
    snapshot={...snapshot,permit:{...snapshot.permit,sub:"teacher-B"}};
    const b=await open();
    const isolated=b.service.listGroups().length===0;
    let oldServiceRevoked=false;
    try{a.service.listGroups()}catch(e){oldServiceRevoked=e.message==="GROUP_ACCESS_DENIED"}
    return {before,withoutApprovalRejected,sameMember,noPii,oldPreserved,isolated,oldServiceRevoked,
      revision:migrated.revision,sourceRevision:withRoster.group.revision,
      verified:report.verified,schoolProof:report.schoolOwnershipProofCryptographic};
  });
  assert.equal(result.before,0);
  assert.equal(result.withoutApprovalRejected,true);
  assert.equal(result.sameMember,true);
  assert.equal(result.noPii,true);
  assert.equal(result.oldPreserved,true);
  assert.equal(result.isolated,true);
  assert.equal(result.oldServiceRevoked,true);
  assert.equal(result.revision,result.sourceRevision);
  assert.equal(result.verified,true);
  assert.equal(result.schoolProof,false);
  assert.deepEqual(errors,[]);
  console.log("PASS migration browser: explicit approval, canonical IDs, account switch, no v1 deletion, no PII report");
  console.log(JSON.stringify({status:"PASS",schoolOwnershipVerified:false,liveSignedSession:false,realDeviceUat:false}));
  await context.close();
}finally{await browser.close()}
