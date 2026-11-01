#!/usr/bin/env node
/** Reproduce old AI Studio cache-first SW serving stale groups JS after a
 * source-only deployment, then verify explicit user-controlled SW activation.
 * Synthetic local server, no real accounts, no real students, NO DEPLOY.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createServer} from 'node:http';
import {chromium} from 'playwright';

const read=p=>readFileSync(p,'utf8');
const oldVersion='0.21.259';
const newVersion='0.21.260';
const oldService=read('external/studio-old/src/groups/group-service.js');
const newService=read('src/groups/group-service.js');
const oldSw=read('external/studio-old/src/sw.js').replaceAll('__APP_VERSION__',oldVersion);
const newSw=read('src/sw.js').replaceAll('__APP_VERSION__',newVersion);
assert.ok(oldService.includes('provider = new LocalGroupsProvider()'),'old source must have the actual insecure default');
assert.ok(newService.includes('GROUP_EXPLICIT_PROVIDER_REQUIRED'),'new source must contain the explicit-provider patch');
for(const s of [oldSw,newSw]){
  assert.ok(s.includes('event.respondWith(cacheFirst(request))'),'both real SW sources should handle static JavaScript cache-first');
}
let phase='old',oldGroupGets=0,newGroupGets=0;
const prefix='/AI-Studio-GHRAB/';
const server=createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');
  const path=url.pathname;
  res.setHeader('Cache-Control','no-store');
  if(path===prefix+'sw.js'){
    res.setHeader('Content-Type','text/javascript; charset=utf-8');
    res.setHeader('Service-Worker-Allowed',prefix);
    return res.end(phase==='old'?oldSw:newSw);
  }
  if(path===prefix+'groups/group-service.js'){
    res.setHeader('Content-Type','text/javascript; charset=utf-8');
    if(phase==='old'){oldGroupGets++;return res.end(oldService);}
    newGroupGets++;return res.end(newService);
  }
  if(path===prefix+'index.html'){
    res.setHeader('Content-Type','text/html; charset=utf-8');
    return res.end('<!doctype html><title>local synthetic SW regression</title>');
  }
  res.statusCode=404;res.end('Not found');
});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
const port=server.address().port;
const origin='http://127.0.0.1:'+port;
let browser;
try{
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext({serviceWorkers:'allow'});
  try{
    const page=await context.newPage();
    await page.goto(origin+prefix+'index.html');
    await page.evaluate(async()=>{
      await navigator.serviceWorker.register('/AI-Studio-GHRAB/sw.js',{scope:'/AI-Studio-GHRAB/'});
      await navigator.serviceWorker.ready;
    });
    await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller),null,{timeout:12000});
    const url=prefix+'groups/group-service.js';
    const fetchModule=()=>page.evaluate(async url=>{
      const resp=await fetch(url,{cache:'default'});
      if(!resp.ok)throw new Error('group-service HTTP '+resp.status);
      return resp.text();
    },url);

    const initial=await fetchModule();
    assert.equal(initial,oldService,'old SW must serve original source and populate cache');
    assert.ok(oldGroupGets>=1,'initial fetch reached old published bytes');
    phase='new';
    const stale=await fetchModule();
    assert.equal(stale,oldService,
      'critical stale cache window: old SW still returns its cached unguarded module after new server bytes exist');
    assert.equal(newGroupGets,0,'stale old SW did not consult updated network group-service');
    const cacheKeys=await page.evaluate(()=>caches.keys());
    assert.ok(cacheKeys.some(k=>k.includes(oldVersion)),'actual old-version CacheStorage present');

    // Explicit SW update downloads the new worker but does NOT activate it
    // automatically while the old client is active (user-controlled activation).
    await page.evaluate(async()=>{
      const reg=await navigator.serviceWorker.ready;
      await reg.update();
    });
    await page.waitForFunction(async()=>{
      const reg=await navigator.serviceWorker.getRegistration('/AI-Studio-GHRAB/');
      return Boolean(reg?.waiting);
    },null,{timeout:18000});
    const waitingStillStale=await fetchModule();
    assert.equal(waitingStillStale,oldService,
      'new SW waiting alone must not be mistaken for patch activation');

    // Only the explicit user-triggered skipWaiting controls cache turnover.
    await page.evaluate(async()=>{
      const reg=await navigator.serviceWorker.getRegistration('/AI-Studio-GHRAB/');
      if(!reg?.waiting)throw new Error('new worker must be waiting');
      await new Promise((resolve,reject)=>{
        const timeout=setTimeout(()=>reject(new Error('Controller change timeout')),12000);
        navigator.serviceWorker.addEventListener('controllerchange',()=>{
          clearTimeout(timeout);resolve();
        },{once:true});
        reg.waiting.postMessage({type:'GHRAB_SKIP_WAITING'});
      });
    });
    const recovered=await fetchModule();
    assert.equal(recovered,newService,'new controller must serve the patched source after user-controlled activation');
    assert.ok(newGroupGets>=1,'patched module fetched from server after cache version transition');
    const result={
      schema:'groups-v2-stale-sw-controlled-release-v1',
      status:'RISK_CONFIRMED_AND_RECOVERY_VERIFIED',
      staleCodeBeforeActivation:true,
      staleCodeWhileNewSwWaiting:true,
      explicitActivationRestoresPatchedCode:true,
      oldVersion,newVersion,
      oldServiceSourceReviewed:true,newServiceSourceReviewed:true,
      syntheticLocalHttpServer:true,actualSchoolDeployment:false,
      actualStudentData:false,realTeacherSso:false,
      fullOperationalCachePurgeNotVerified:true,
      risk:'old SW can serve unguarded groups-v1 API even after new source deployed until activation',
      remediation:'school-approved activation+cache audit or isolated browser profiles; never assume source upload instantly fixes existing clients'
    };
    console.log(JSON.stringify(result));
  }finally{await context.close();}
}finally{
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
