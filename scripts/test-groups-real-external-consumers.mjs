#!/usr/bin/env node
/**
 * Real external consumer source at exact PR SHAs, real Studio v2 group
 * service, mock verified-auth adapter. All records are SYNTHETIC.
 * Browser module execution is tested, but this is NOT real school SSO/UAT.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const read = path => readFileSync(path, "utf8");
const origin = "https://groups-v2-real-consumers.example";
const studio = "/AI-Studio-GHRAB/";
const fixtureAuth = [
  "export async function initialiseAccess(){",
  "globalThis.__verifiedInitialisations=(globalThis.__verifiedInitialisations||0)+1;",
  "return globalThis.__verifiedSnapshot;}",
  "export function getAccessSnapshot(){return globalThis.__verifiedSnapshot;}",
  "export function hasAppAccess(appId){return {enabled:globalThis.__verifiedApps?.includes(appId)===true};}",
].join("\n");
function instrumentIife(source, hook) {
  const ending = source.lastIndexOf("})();");
  assert.ok(ending >= 0, "external IIFE is intact and can be instrumented for testing");
  return source.slice(0, ending) + "\n" + hook + "\n" + source.slice(ending);
}
const assets = new Map([
  [studio+"groups/group-service.js",read("src/groups/group-service.js")],
  [studio+"groups/verified-client.js",read("src/groups/verified-client.js")],
  [studio+"access/access-control.js",fixtureAuth],
  ["/test-sortio/central-groups.js",instrumentIife(
    read("external/sortio/src/lazy/central-groups.js"),
    "globalThis.__testSortioBridge=Object.freeze({getService:resolveCentralGroupsService});",
  )],
  ["/test-essay/26-central-groups.js",read("external/essay/src/js/26-central-groups.js")],
  ["/test-git/central-groups.js",instrumentIife(
    read("external/git/src/features/central-groups.js"),
    "globalThis.__testGitBridge=Object.freeze({getService});",
  )],
  ["/test-lesson/src/integration/centralGroupsClient.js",
    read("external/lesson/src/integration/centralGroupsClient.js")],
  ["/test-lesson/src/core/config.js",read("external/lesson/src/core/config.js")],
  ["/test-lesson/src/core/release.js",read("external/lesson/src/core/release.js")],
  ["/test-lesson/src/services/canonicalGroupModel.js",
    read("external/lesson/src/services/canonicalGroupModel.js")],
]);
const browser = await chromium.launch({headless:true});
const context = await browser.newContext();
const page = await context.newPage();
const errors = [];
page.on("pageerror",error=>errors.push(String(error.message)));
await page.addInitScript(()=>{
  globalThis.__verifiedSnapshot={
    ready:true,valid:true,mode:"signed-permit",
    permit:{sub:"synthetic-teacher-A",role:"teacher",exp:Math.floor(Date.now()/1000)+3600},
  };
  globalThis.__verifiedApps=["sortio","essay-evaluator","lesson-hub","generator"];
  globalThis.__GHRAB_DEPLOYMENT_CONFIG__={studioBaseUrl:"/AI-Studio-GHRAB/"};
  globalThis.__GHRAB_STUDIO_ACCESS__={appId:"generator"};
});
await page.route(origin+"/**",async route=>{
  const path=new URL(route.request().url()).pathname;
  if(assets.has(path))return route.fulfill({
    status:200,contentType:"text/javascript; charset=utf-8",body:assets.get(path),
  });
  if(path==="/")return route.fulfill({
    status:200,contentType:"text/html; charset=utf-8",
    body:"<!DOCTYPE html><title>synthetic external consumers</title>",
  });
  return route.fulfill({status:404,body:"Unmatched source route: "+path});
});

try{
  await page.goto(origin+"/");
  await page.evaluate(()=>document.documentElement.dataset.ghrabAccess="granted");
  const baseline=await page.evaluate(async()=>{
    const {createPrincipalGroupsSession}=await import("/AI-Studio-GHRAB/groups/group-service.js");
    const a=await createPrincipalGroupsSession({getSnapshot:()=>globalThis.__verifiedSnapshot});
    const g=a.service.createGroup({displayName:"Synthetic Year 1",
      schoolYear:"2026/27",subject:"English",grade:"Year 1"});
    const imported=a.service.importRoster({groupId:g.groupId,
      expectedRevision:g.revision,
      rawText:"Synthetic Alpha; alpha@example.invalid\nSynthetic Beta; beta@example.invalid"});
    return {groupId:g.groupId,memberIds:imported.group.members.map(m=>m.memberId),
      revision:imported.group.revision};
  });
  await page.addScriptTag({url:origin+"/test-sortio/central-groups.js"});
  await page.addScriptTag({url:origin+"/test-essay/26-central-groups.js"});
  await page.addScriptTag({url:origin+"/test-git/central-groups.js"});

  const result=await page.evaluate(async groupId=>{
    const sortio=await globalThis.__testSortioBridge.getService();
    const essay=await globalThis.essayGroupService();
    const git=await globalThis.__testGitBridge.getService();
    const lesson=await import("/test-lesson/src/integration/centralGroupsClient.js");
    const sortioMeta=sortio.listGroupMetadata("sortio",{status:"active"});
    const sortioRoster=sortio.getRosterProjection(groupId,"sortio");
    const essayMeta=essay.list();
    const essayRoster=essay.roster(groupId);
    const gitMeta=git.listGroupMetadata("generator",{status:"active"});
    const gitRoster=git.getRosterProjection(groupId,"generator-forms");
    const lessonMeta=await lesson.listCentralGroupMetadata();
    const before={
      sortioMeta:sortioMeta[0],sortioRoster,
      essayMeta:essayMeta[0],essayRoster,
      gitMeta:gitMeta[0],gitRoster,
      lessonMeta:lessonMeta[0],
      sortioFacadeMethods:Object.keys(sortio).sort(),
      essayFacadeMethods:Object.keys(essay).sort(),
      gitFacadeMethods:Object.keys(git).sort(),
      verifiedInitialisations:globalThis.__verifiedInitialisations,
    };
    let wrongProjectionDenied=false;
    try{git.getRosterProjection(groupId,"essay-evaluator")}
    catch(e){wrongProjectionDenied=e.message==="GROUP_CONSUMER_PROJECTION_DENIED"}
    const noDirectStudentEmailInLesson = !JSON.stringify(lessonMeta).includes("example.invalid");
    const noStudentEmailInSortio = !JSON.stringify(sortioRoster).includes("example.invalid");
    const subscriberEvents=[];
    const unsubscribeSortio=sortio.subscribe(detail=>subscriberEvents.push(detail));
    const {principalGroupsStorageKey}=await import("/AI-Studio-GHRAB/groups/group-service.js");
    const oldAccountKey=await principalGroupsStorageKey({subject:"synthetic-teacher-A"});
    // Same-origin browser profile, different signed principal. Every previously
    // opened external service must stop returning the previous teacher's data.
    globalThis.__verifiedSnapshot={
      ...globalThis.__verifiedSnapshot,
      permit:{...globalThis.__verifiedSnapshot.permit,sub:"synthetic-teacher-B"},
    };
    document.dispatchEvent(new Event("ghrab:access-changed"));
    // Simulate another tab updating the ORIGINAL account-scoped storage key.
    // The old Sortio callback must no longer receive that account's group ID.
    window.dispatchEvent(new StorageEvent("storage",{key:oldAccountKey,storageArea:localStorage}));
    const revokedSubscriberSilent=subscriberEvents.length===0;
    unsubscribeSortio();
    const expectRevoked=async op=>{
      try{await op();return false}catch(e){return e?.message==="GROUP_ACCESS_DENIED"}
    };
    const stale={
      sortio:await expectRevoked(()=>sortio.listGroupMetadata("sortio")),
      essay:await expectRevoked(()=>essay.list()),
      git:await expectRevoked(()=>git.listGroupMetadata("generator")),
    };
    const lessonAfterSwitch=await lesson.listCentralGroupMetadata();
    const {openVerifiedGroupsV2}=await import("/AI-Studio-GHRAB/groups/verified-client.js");
    const freshB=await openVerifiedGroupsV2("essay-evaluator");
    return {before,wrongProjectionDenied,noDirectStudentEmailInLesson,
      noStudentEmailInSortio,stale,lessonAfterSwitch,revokedSubscriberSilent,
      bGroups:freshB.service.listGroupMetadata("essay-evaluator").length,
      bHasNoRoster:freshB.service.listGroupMetadata("essay-evaluator").every(g=>g.groupId!==groupId)};
  },baseline.groupId);

  assert.deepEqual(errors,[],"external consumers must not generate uncaught errors");
  const b=result.before;
  for(const app of ["sortioMeta","essayMeta","gitMeta","lessonMeta"])
    assert.equal(b[app].groupId,baseline.groupId,app+" has same canonical group ID");
  assert.deepEqual(b.sortioRoster.members.map(m=>m.memberId),baseline.memberIds);
  assert.deepEqual(b.essayRoster.members.map(m=>m.memberId),baseline.memberIds);
  assert.deepEqual(b.gitRoster.members.map(m=>m.memberId),baseline.memberIds);
  assert.equal(b.lessonMeta.revision,baseline.revision);
  assert.equal(b.sortioMeta.revision,baseline.revision);
  assert.equal(b.essayMeta.revision,baseline.revision);
  assert.equal(b.gitMeta.revision,baseline.revision);
  assert.equal(result.noStudentEmailInSortio,true,"SORTIO must not get school e-mail");
  assert.equal(result.noDirectStudentEmailInLesson,true,"Lesson Hub must only get metadata");
  assert.equal(b.essayRoster.members[0].schoolEmail,"alpha@example.invalid");
  assert.equal(b.gitRoster.members[1].schoolEmail,"beta@example.invalid");
  assert.equal(result.wrongProjectionDenied,true,"GIT must not request essay-evaluator roster");
  assert.equal(b.sortioFacadeMethods.includes("createGroup"),true,"SORTIO controlled write remains");
  assert.equal(b.gitFacadeMethods.includes("createGroup"),false);
  assert.equal(b.gitFacadeMethods.includes("exportBackup"),false);
  assert.equal(b.verifiedInitialisations,1,"one real Studio verified-client initialization");
  assert.deepEqual(result.stale,{sortio:true,essay:true,git:true},
    "all previously opened direct service clients must fail closed on account switch");
  assert.equal(result.revokedSubscriberSilent,true,
    "stale SORTIO change subscriber must not receive another account's group events");
  assert.deepEqual(result.lessonAfterSwitch,[],"Lesson Hub opens a new empty principal scope");
  assert.equal(result.bGroups,0);
  assert.equal(result.bHasNoRoster,true);
  console.log("PASS XR01 actual SORTIO client module + name-only projected roster");
  console.log("PASS XR02 actual Hodnotitel client module + email-linked validated roster");
  console.log("PASS XR03 actual Lesson Hub ESM client + metadata-only");
  console.log("PASS XR04 actual GIT E8 v2 client module + generator-forms roster");
  console.log("PASS XR05 full canonical ID, revision and projection parity");
  console.log("PASS XR06 wrong-app projection refusal and restricted capabilities");
  console.log("PASS XR07 stale external facades denied after principal switch");
  console.log("PASS XR08 fresh next-teacher scope has no prior pupils");
  console.log("PASS XR09 stale SORTIO group subscriber receives no cross-account event");
  console.log(JSON.stringify({status:"PASS",checks:9,
    actualExternalConsumerSource:true,exactPrSources:true,
    mockSignedAccess:true,liveSchoolSSO:false,
    fullAppUIUat:false,physicalDeviceUat:false,serverTenantIsolation:false}));
} finally{
  await context.close();
  await browser.close();
}
