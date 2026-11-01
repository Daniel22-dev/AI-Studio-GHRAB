#!/usr/bin/env node
/**
 * NO-DEPLOY QA ONLY. Tests real new consumer source with the old Studio group
 * API missing, as well as with a legacy module that has no v2 capability.
 * The legacy v1 fixture is synthetic. School SSO, real students and physical
 * devices are NOT tested.
 */
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {chromium} from 'playwright';

assert.equal(existsSync('external/studio-old/src/groups/verified-client.js'),false,
 'The actual deployed-old Studio source must not contain the new verified v2 module');
const read=p=>readFileSync(p,'utf8');
function instrument(source,hook){
  const end=source.lastIndexOf('})();');
  assert.ok(end>0,'real consumer IIFE must be intact');
  return source.slice(0,end)+'\n'+hook+'\n'+source.slice(end);
}
const origin='https://mixed-version-groups-synthetic.example';
const studio='/AI-Studio-GHRAB/';
const assets=new Map([
  ['/test-sortio/central-groups.js',instrument(read('external/sortio/src/lazy/central-groups.js'),
   'globalThis.__mixedSortio=Object.freeze({load:resolveCentralGroupsService});')],
  ['/test-essay/26-central-groups.js',read('external/essay/src/js/26-central-groups.js')],
  ['/test-git/central-groups.js',instrument(read('external/git/src/features/central-groups.js'),
   'globalThis.__mixedGit=Object.freeze({load:getService});')],
  ['/test-lesson/src/integration/centralGroupsClient.js',read('external/lesson/src/integration/centralGroupsClient.js')],
  ['/test-lesson/src/core/config.js',read('external/lesson/src/core/config.js')],
  ['/test-lesson/src/core/release.js',read('external/lesson/src/core/release.js')],
  ['/test-lesson/src/services/canonicalGroupModel.js',read('external/lesson/src/services/canonicalGroupModel.js')],
]);
const browser=await chromium.launch({headless:true});
const fixtureKey='ghrab.ai-studio.groups.v1';
const fixtureValue=JSON.stringify({schema:'synthetic-old-v1',groups:[{
  name:'Synthetic Class',members:['Synthetic Alpha','Synthetic Beta']}]});
try{
for(const mode of ['old-studio-module-absent','legacy-studio-module-without-v2']){
  const ctx=await browser.newContext();
  const page=await ctx.newPage();
  const errors=[];
  const requestedServices=[];
  page.on('pageerror',e=>errors.push(String(e?.message||e)));
  await page.addInitScript(({key,value})=>{
    localStorage.setItem(key,value);
    globalThis.__GHRAB_DEPLOYMENT_CONFIG__={studioBaseUrl:'/AI-Studio-GHRAB/'};
    globalThis.__GHRAB_STUDIO_ACCESS__={appId:'generator'};
    globalThis.__GHRAB_GENERATOR_SUITE_SESSION__={isLocked:()=>false};
  },{key:fixtureKey,value:fixtureValue});
  await page.route(origin+'/**',async route=>{
    const path=new URL(route.request().url()).pathname;
    if(path===studio+'groups/group-service.js'){
      requestedServices.push(path);
      return route.fulfill({status:503,body:'Legacy service is intentionally inaccessible in this synthetic test'});
    }
    if(path===studio+'groups/verified-client.js'){
      if(mode==='old-studio-module-absent')return route.fulfill({status:404,body:'Not present in old Studio'});
      return route.fulfill({status:200,contentType:'text/javascript; charset=utf-8',
        body:'export const legacyGroupsV1Only = true;'});
    }
    if(assets.has(path))return route.fulfill({status:200,contentType:'text/javascript; charset=utf-8',body:assets.get(path)});
    if(path==='/')return route.fulfill({status:200,contentType:'text/html; charset=utf-8',
      body:'<!doctype html><html><head><title>synthetic mixed wave</title></head><body></body></html>'});
    return route.fulfill({status:404,body:'No synthetic fixture at '+path});
  });
  try{
    await page.goto(origin+'/');
    await page.evaluate(()=>{document.documentElement.dataset.ghrabAccess='granted';});
    for(const src of ['/test-sortio/central-groups.js','/test-essay/26-central-groups.js',
      '/test-git/central-groups.js']){
      await page.addScriptTag({url:origin+src});
    }
    const result=await page.evaluate(async fixtureKey=>{
      async function capture(f){
        try{await f();return {rejected:false,code:null};}
        catch(e){return {rejected:true,code:String(e?.code||e?.message||e)};}
      }
      const lesson=await import('/test-lesson/src/integration/centralGroupsClient.js');
      const v={
        sortio:await capture(()=>globalThis.__mixedSortio.load()),
        essay:await capture(()=>globalThis.essayGroupService()),
        git:await capture(()=>globalThis.__mixedGit.load()),
        lesson:await capture(()=>lesson.listCentralGroupMetadata()),
      };
      return {apps:v,oldValue:localStorage.getItem(fixtureKey),
        accountV2Keys:Object.keys(localStorage).filter(x=>x.startsWith('ghrab.ai-studio.groups.account.v2.')).length};
    },fixtureKey);
    assert.deepEqual(errors,[],mode+': no uncaught JS errors');
    assert.equal(requestedServices.length,0,mode+': cannot bypass verified-client via group-service');
    for(const [name,status] of Object.entries(result.apps)){
      assert.equal(status.rejected,true,mode+': '+name+' must reject old Studio');
    }
    if(mode==='old-studio-module-absent')assert.equal(result.apps.sortio.code,'CENTRAL_GROUPS_UNAVAILABLE');
    if(mode==='legacy-studio-module-without-v2'){
      assert.equal(result.apps.sortio.code,'CENTRAL_V2_REQUIRED');
      assert.equal(result.apps.essay.code,'CENTRAL_V2_REQUIRED');
      assert.equal(result.apps.git.code,'CENTRAL_VERIFIED_CLIENT_REQUIRED');
      assert.equal(result.apps.lesson.code,'CENTRAL_VERIFIED_CLIENT_REQUIRED');
    }
    assert.equal(result.oldValue,fixtureValue,mode+': no legacy v1 mutation');
    assert.equal(result.accountV2Keys,0,mode+': cannot manufacture v2 storage');
    console.log('PASS '+mode+' / 4 real v2 consumers rejected / old synthetic v1 data unchanged');
  }finally{await ctx.close();}
}
console.log(JSON.stringify({schema:'groups-v2-mixed-version-nondeploy-v1',status:'PASS',
  scenarios:2,negativeConsumerChecks:8,actualOldStudioSourceVerifiedAbsent:true,
  actualNewConsumerModules:true,legacyStoreMutations:0,
  mockBrowserAuthGate:true,schoolSSO:false,realPupils:false,
  realDeployedBytes:false,physicalDeviceUat:false,serverIsolation:false}));
}finally{await browser.close();}
