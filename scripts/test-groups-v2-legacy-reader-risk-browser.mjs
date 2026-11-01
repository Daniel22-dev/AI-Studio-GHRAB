#!/usr/bin/env node
/**
 * QA-only negative mixed-release test. Uses synthetic persons and mocked
 * principal A/B switching, not real school sign-in. A security risk MUST
 * fail this job; never disguise observed old-client exposure as PASS.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';

const read=p=>readFileSync(p,'utf8');
function expose(source,exportLine){
  const end=source.lastIndexOf('})();');
  assert.ok(end>0,'legacy SORTIO source must be an intact IIFE');
  return source.slice(0,end)+'\n'+exportLine+'\n'+source.slice(end);
}
const studio='/AI-Studio-GHRAB/';
const origin='https://synthetic-old-readers-v2.example';
const assets=new Map([
  [studio+'groups/group-service.js',read('src/groups/group-service.js')],
  ['/old-sortio/central-groups.js',expose(read('external/sortio-old/src/lazy/central-groups.js'),
    'globalThis.__oldSortio=Object.freeze({load:resolveCentralGroupsService});')],
  ['/old-essay/26-central-groups.js',read('external/essay-old/src/js/26-central-groups.js')],
  ['/old-lesson/src/integration/centralGroupsClient.js',read('external/lesson-old/src/integration/centralGroupsClient.js')],
  ['/old-lesson/src/core/config.js',read('external/lesson-old/src/core/config.js')],
  ['/old-lesson/src/core/release.js',read('external/lesson-old/src/core/release.js')],
  ['/old-lesson/src/services/canonicalGroupModel.js',read('external/lesson-old/src/services/canonicalGroupModel.js')],
]);
const browser=await chromium.launch({headless:true});
const context=await browser.newContext();
const page=await context.newPage();
const pageErrors=[];
page.on('pageerror',e=>pageErrors.push(String(e?.message||e)));
await page.addInitScript(()=>{
  globalThis.__GHRAB_DEPLOYMENT_CONFIG__={studioBaseUrl:'/AI-Studio-GHRAB/'};
});
await page.route(origin+'/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  if(assets.has(path))return route.fulfill({
    status:200,contentType:'text/javascript; charset=utf-8',body:assets.get(path)});
  if(path==='/')return route.fulfill({
    status:200,contentType:'text/html; charset=utf-8',
    body:'<!doctype html><html><head><title>synthetic v1 compatibility risk</title></head><body></body></html>'});
  return route.fulfill({status:404,body:'No synthetic route'});
});
try{
  await page.goto(origin+'/');
  const created=await page.evaluate(async()=>{
    const {createGroupsService,LocalGroupsProvider}=await import('/AI-Studio-GHRAB/groups/group-service.js');
    globalThis.__syntheticPrincipal='teacher-A';
    // Explicit legacy fixture setup only; old consumers use unscoped no-arg API.
    const a=createGroupsService({provider:new LocalGroupsProvider()});
    const group=a.createGroup({displayName:'Synthetic Group - Teacher A',
      schoolYear:'2026/27',subject:'English',grade:'Year 1'});
    const imported=a.importRoster({groupId:group.groupId,expectedRevision:group.revision,
      rawText:'Synthetic Alpha; alpha@example.invalid\nSynthetic Beta; beta@example.invalid'});
    return {groupId:group.groupId,revision:imported.group.revision,
      memberCount:imported.group.members.length};
  });
  assert.equal(created.memberCount,2,'synthetic v1 fixture must contain two students');
  await page.evaluate(()=>{
    globalThis.__syntheticPrincipal='teacher-B';
    document.documentElement.dataset.ghrabAccess='granted';
  });
  await page.addScriptTag({url:origin+'/old-sortio/central-groups.js'});
  await page.addScriptTag({url:origin+'/old-essay/26-central-groups.js'});
  const observed=await page.evaluate(async groupId=>{
    const flags={};
    const capture=async(name,fn)=>{
      try{flags[name]={exposed:Boolean(await fn()),error:null};}
      catch(e){flags[name]={exposed:false,error:String(e?.message||e)};}
    };
    await capture('sortioMetadata',async()=>{
      const svc=await globalThis.__oldSortio.load();
      return svc.listGroupMetadata('sortio',{status:'all'}).some(g=>g.groupId===groupId);
    });
    await capture('sortioRoster',async()=>{
      const svc=await globalThis.__oldSortio.load();
      return svc.getRosterProjection(groupId,'sortio').members.length===2;
    });
    await capture('essayMetadata',async()=>{
      const svc=await globalThis.essayGroupService();
      return svc.list().some(g=>g.groupId===groupId);
    });
    await capture('essayRosterEmail',async()=>{
      const svc=await globalThis.essayGroupService();
      const roster=svc.roster(groupId);
      return roster.members.length===2 && roster.members.every(m=>m.schoolEmail?.endsWith('@example.invalid'));
    });
    await capture('lessonMetadata',async()=>{
      const lesson=await import('/old-lesson/src/integration/centralGroupsClient.js');
      return (await lesson.listCentralGroupMetadata()).some(g=>g.groupId===groupId);
    });
    return flags;
  },created.groupId);
  assert.deepEqual(pageErrors,[],'old/new mixed-version JS should not crash the test harness');
  const exposed=Object.entries(observed).filter(([,v])=>v.exposed).map(([name])=>name);
  const wrongErrors=Object.entries(observed).filter(([,v])=>!v.exposed&&v.error!=='GROUP_EXPLICIT_PROVIDER_REQUIRED')
    .map(([name,v])=>({name,error:v.error}));
  if(exposed.length||wrongErrors.length){
    console.error(JSON.stringify({
      schema:'groups-v2-old-reader-explicit-provider-guard-v1',
      status:'BLOCKED',exposedCapabilities:exposed,unexpectedDenials:wrongErrors,
      syntheticFixtureOnly:true,mockedTeacherSwitchOnly:true,schoolSSO:false,
      realPupilData:false,providerBoundaryNotTenantIsolation:true}));
    process.exitCode=1;
  }else{
    console.log(JSON.stringify({
      schema:'groups-v2-old-reader-explicit-provider-guard-v1',
      status:'PASS',blockedLegacyCapabilities:5,expectedError:'GROUP_EXPLICIT_PROVIDER_REQUIRED',
      directLegacyDataReadDenied:true,
      syntheticFixtureOnly:true,mockedTeacherSwitchOnly:true,schoolSSO:false,
      browserSameOriginIsolation:false,oldServiceWorkerCache:false}));
  }
}finally{await context.close();await browser.close();}
