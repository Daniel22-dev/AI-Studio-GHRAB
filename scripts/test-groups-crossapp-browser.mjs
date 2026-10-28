#!/usr/bin/env node
/* Real Studio writer, real verified client and real v2 projections.
   Access verifier is mocked. No school data, no release certification. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const origin="https://groups-crossapp.example", prefix="/AI-Studio-GHRAB/";
const read=path=>readFileSync(path,"utf8");
const authStub=[
  "export async function initialiseAccess(){",
  "globalThis.__authBoots=(globalThis.__authBoots||0)+1;",
  "return globalThis.__verifiedSnapshot;}",
  "export function getAccessSnapshot(){return globalThis.__verifiedSnapshot;}",
  "export function hasAppAccess(appId){return {enabled:globalThis.__allowedApps?.includes(appId)===true};}",
].join("\n");
const assets=new Map([
  [prefix+"groups/",["text/html",read("src/groups/index.html")]],
  [prefix+"groups/groups.js",["text/javascript",read("src/groups/groups.js")]],
  [prefix+"groups/group-service.js",["text/javascript",read("src/groups/group-service.js")]],
  [prefix+"groups/verified-client.js",["text/javascript",read("src/groups/verified-client.js")]],
  [prefix+"access/access-control.js",["text/javascript",authStub]],
]);
const browser=await chromium.launch({headless:true});
const context=await browser.newContext();
const page=await context.newPage();
const errors=[];
page.on("pageerror",e=>errors.push(e.message));

await page.addInitScript(()=>{
  globalThis.__verifiedSnapshot={
    ready:true,valid:true,mode:"signed-permit",
    permit:{sub:"teacher-A",role:"teacher",exp:Math.floor(Date.now()/1000)+3600},
  };
  globalThis.__allowedApps=["sortio","lesson-hub","essay-evaluator","generator"];
  globalThis.GHRAB={
    accessReady:Promise.resolve(globalThis.__verifiedSnapshot),
    getAccessSnapshot:()=>globalThis.__verifiedSnapshot,
    isColleaguePreview:()=>false,
  };
});
await page.route(origin+"/**",async route=>{
  const path=new URL(route.request().url()).pathname;
  const asset=assets.get(path);
  if(asset)return route.fulfill({status:200,contentType:asset[0]+"; charset=utf-8",body:asset[1]});
  if(path.endsWith(".js"))return route.fulfill({status:200,contentType:"text/javascript",body:"// Studio shell omitted"});
  if(path.endsWith(".css"))return route.fulfill({status:200,contentType:"text/css",body:""});
  return route.fulfill({status:204,body:""});
});

try{
  await page.goto(origin+prefix+"groups/");
  await page.waitForFunction(()=>globalThis.GHRAB_GROUPS?.schema==="ghrab-groups-service-v1");
  const result=await page.evaluate(async()=>{
    const writer=globalThis.GHRAB_GROUPS;
    const created=writer.createGroup({displayName:"Synthetic English",
      schoolYear:"2026/27",subject:"English",grade:"Year 1"});
    const imported=writer.importRoster({groupId:created.groupId,
      rawText:"Synthetic Pupil; synthetic@example.invalid",expectedRevision:created.revision});
    const memberId=imported.group.members[0].memberId;
    const {openVerifiedGroupsV2}=await import("/AI-Studio-GHRAB/groups/verified-client.js");
    const sortio=await openVerifiedGroupsV2("sortio");
    const essay=await openVerifiedGroupsV2("essay-evaluator");
    const lesson=await openVerifiedGroupsV2("lesson-hub");
    const generator=await openVerifiedGroupsV2("generator");
    const sm=sortio.service.getRosterProjection(created.groupId,"sortio").members;
    const em=essay.service.getRosterProjection(created.groupId,"essay-evaluator").members;
    const gm=generator.service.getRosterProjection(created.groupId,"generator-forms").members;
    const lessonHasRosterMethod=typeof lesson.service.getRosterProjection==="function";
    const lessonHasFullGroupMethod=typeof lesson.service.getGroup==="function";
    const sortioHasCreate=typeof sortio.service.createGroup==="function";
    const essayHasCreate=typeof essay.service.createGroup==="function";
    let sortioProjectionBlocked=false;
    try{sortio.service.getRosterProjection(created.groupId,"essay-evaluator")}catch(e){sortioProjectionBlocked=e.message==="GROUP_CONSUMER_PROJECTION_DENIED"}
    const lm=lesson.service.listGroupMetadata("lesson-hub");
    const before={
      groupId:created.groupId,memberId,
      projectedIds:[sm[0].memberId,em[0].memberId,gm[0].memberId],
      revision:imported.group.revision,lessonRevision:lm[0].revision,
      sortioHasStatus:Object.hasOwn(sm[0],"status"),
      sortioHasEmail:Object.hasOwn(sm[0],"schoolEmail"),
      lessonHasRosterMethod,lessonHasFullGroupMethod,sortioHasCreate,essayHasCreate,sortioProjectionBlocked,
      lessonMetadataMembers:Object.hasOwn(lm[0],"members"),
      essayEmail:em[0].schoolEmail,
    };
    globalThis.__verifiedSnapshot={...globalThis.__verifiedSnapshot,
      permit:{...globalThis.__verifiedSnapshot.permit,sub:"teacher-B"}};
    document.dispatchEvent(new Event("ghrab:access-changed"));
    let revoked=false;
    try{writer.listGroups()}catch(e){revoked=e.message==="GROUP_ACCESS_DENIED";}
    const second=await openVerifiedGroupsV2("essay-evaluator");
    return {before,revoked,bGroups:second.service.listGroupMetadata("essay-evaluator").length,
      verifierBootCount:globalThis.__authBoots};
  });
  assert.deepEqual(result.before.projectedIds,Array(3).fill(result.before.memberId));
  assert.equal(result.before.lessonRevision,result.before.revision);
  assert.equal(result.before.sortioHasStatus,true);
  assert.equal(result.before.sortioHasEmail,false);
  assert.equal(result.before.lessonHasRosterMethod,false);
  assert.equal(result.before.lessonHasFullGroupMethod,false);
  assert.equal(result.before.sortioHasCreate,true);
  assert.equal(result.before.essayHasCreate,false);
  assert.equal(result.before.sortioProjectionBlocked,true);
  assert.equal(result.before.lessonMetadataMembers,false);
  assert.equal(result.before.essayEmail,"synthetic@example.invalid");
  assert.equal(result.revoked,true);
  assert.equal(result.bGroups,0);
  assert.equal(result.verifierBootCount,1);
  await page.locator(".access-denied-page").waitFor();
  assert.ok(!(await page.locator("body").innerText()).includes("Synthetic Pupil"));
  assert.deepEqual(errors,[]);
  console.log("PASS C01 Studio writer to four consumer projections");
  console.log("PASS C02 stable group/member IDs and revisions across consumers");
  console.log("PASS C03 SORTIO and Lesson Hub do not receive student e-mail");
  console.log("PASS C04 switching teacher invalidates service and hides prior roster");
  console.log(JSON.stringify({status:"PASS",checks:4,
    realSignedVerifier:false,realExternalAppUI:false,
    realSchoolUat:"NOT RUN",serverTenantIsolation:false},null,2));
}finally{
  await context.close();
  await browser.close();
}
