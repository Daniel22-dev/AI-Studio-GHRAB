// Real published consumers; synthetic content only, never invokes AI endpoints.
import assert from 'node:assert/strict';
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium} from 'playwright';

const STUDIO='https://daniel22-dev.github.io/AI-Studio-GHRAB/';
const HARNESS=STUDIO+'__stage05_synthetic_sender__/';
const OUT=resolve('qa-results/stage05/real-consumers');
const VERSION=JSON.parse(await readFile('package.json','utf8')).version;
const apps=JSON.parse(await readFile('src/config/apps.generated.json','utf8'));
const registry=JSON.parse(await readFile('src/config/material-flow-registry.json','utf8'));
const platformJS=await readFile('src/platform/ghrab-platform.js','utf8');
const flowJS=await readFile('src/material-flow/material-flow.js','utf8');
const validatorJS=await readFile('src/shared/material-validator.js','utf8');
const results=[];
const materialFor=(id,viewport)=>({
 schema:'ghrab-material-v1',id:'synthetic-'+id+'-'+viewport+'-'+Date.now(),version:1,
 title:'STAGE05 SYNTHETIC '+id.toUpperCase(),subject:'English',language:'en',yearGroup:'1',level:'B1',
 objectives:['Compare three fictional examples'],
 content:{sourceText:'SYNTHETIC-STAGE05-SOURCE: neutral example with no personal data.',vocabulary:[],tasks:[
  {id:'q1',type:'select',prompt:'Pick A',options:['A','B','C','D'],answer:0,difficulty:1},
  {id:'q2',type:'select',prompt:'Pick B',options:['A','B','C','D'],answer:1,difficulty:1},
  {id:'q3',type:'select',prompt:'Pick C',options:['A','B','C','D'],answer:0,difficulty:1}
 ]},quality:{status:'ai-draft'},provenance:{containsPersonalData:false}
});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox']});
await mkdir(OUT,{recursive:true});
let failed=false;
try{
 for(const id of ['generator','differentiator','ludus']){
  for(const [screen,viewport] of [['desktop',{width:1366,height:768}],['mobile',{width:390,height:844}]]){
   const context=await browser.newContext({viewport,isMobile:screen==='mobile',hasTouch:screen==='mobile',serviceWorkers:'block',locale:'cs-CZ'});
   const page=await context.newPage();
   const m=materialFor(id,screen);
   const entry={target:id,viewport:screen,materialId:m.id,studioVersion:VERSION,status:'pending'};
   page.setDefaultTimeout(45000);
   try{
    const html='<!doctype html><html lang="cs" data-ghrab-app-id="ai-studio" data-ghrab-app-version="'+VERSION+'"><head><meta charset="utf-8"><title>Stage05 synthetic sender</title><script>window.GHRAB_PLATFORM_CONFIG={appId:"ai-studio",appVersion:"'+VERSION+'",autoFooter:false,requiredPlatformRange:">=1.1.2 <2.0.0"};</script></head><body>Stage05 synthetic sender</body></html>';
    await page.route(HARNESS,route=>route.fulfill({status:200,contentType:'text/html; charset=utf-8',body:html}));
    await page.goto(HARNESS,{waitUntil:'domcontentloaded',timeout:30000});
    await page.addScriptTag({content:platformJS});
    const prepared=await page.evaluate(async ({flowJS,validatorJS,apps,registry,m,id,studio,version})=>{
     const load=async code=>{const url=URL.createObjectURL(new Blob([code],{type:'text/javascript'}));try{return await import(url)}finally{URL.revokeObjectURL(url)}};
     const flow=await load(flowJS),validator=(await load(validatorJS)).validateMaterialPackage;
     const bridge=window.GHRAB_PLATFORM?.bridge;
     if(!bridge?.create||bridge.schema!=='ghrab-studio-handoff-v2')throw Error('Missing Bridge v2');
     const pii=structuredClone(m);pii.content.metadata={class_list:[{studentName:'Synthetic Person'}]};
     if(flow.inspectOutboundMaterial(pii,{validator}).ok)throw Error('PII admitted');
     const xss=structuredClone(m);xss.content.sourceText='<img src=x onerror=alert(1)>';
     if(flow.inspectOutboundMaterial(xss,{validator}).ok)throw Error('XSS admitted');
     const two=structuredClone(m);two.content.tasks.forEach(t=>{t.options=['A','B'];});
     if(flow.resolveTargets(two,apps,registry,{validator,studioUrl:studio}).find(x=>x.id==='ludus')?.reason!=='needs-tasks')
       throw Error('LUDUS admitted incompatible two-option MC4 tasks');
     const transport=flow.createHandoffTransport({bridge,validator,studioUrl:studio,apps,registry});
     let rejected=false;
     try{transport.prepare({targetId:id,material:m,ttlMs:1000,sourceAppVersion:version})}catch(e){rejected=String(e).includes('handoff-ttl')}
     if(!rejected)throw Error('Invalid TTL admitted');
     const packet=transport.prepare({targetId:id,material:m,ttlMs:600000,sourceAppVersion:version});
     if(!packet?.packet||packet.target?.id!==id)throw Error('No handoff');
     rejected=false;
     try{transport.prepare({targetId:id,material:m,ttlMs:600000,sourceAppVersion:version})}catch(e){rejected=String(e).includes('handoff-already-pending')}
     if(!rejected)throw Error('Pending handoff overwritten');
     return packet.launchUrl.href;
    },{flowJS,validatorJS,apps,registry,m,id,studio:STUDIO,version:VERSION});
    const app=apps.find(x=>x.id===id);
    assert.equal(prepared,app?.launchUrl,'Registered route must be used');
    const url=new URL(prepared);url.searchParams.set('studioHandoff','1');
    const response=await page.goto(url.href,{waitUntil:'load',timeout:65000});
    assert.ok(response?.ok(),'Consumer HTTP response not OK');
    const visible=(await page.locator('body').innerText({timeout:10000})).slice(0,10000);
    if (/tato aplikace je uzam(?:č|c)en(?:a|á)|přístup zatím nebyl aktivován|access has not been activated/i.test(visible)) {
      entry.blocker='AUTHORIZATION_REQUIRED';
      throw Error('AUTHORIZATION_REQUIRED: '+id+' requires a legitimately issued school access grant. Automated UAT cannot bypass licensing.');
    }
    if(id==='ludus'){
     await page.waitForFunction(materialId=>window.__spec?.materialId===materialId,m.id,{timeout:50000});
     assert.equal(await page.evaluate(()=>window.__spec.title),m.title);
     assert.equal(new URL(await page.evaluate(()=>window.__studioReturnUrl)).href,STUDIO);
    }else{
     const banner=page.locator('.studio-import-banner').first();
     await banner.waitFor({state:'attached',timeout:50000});
     assert.ok((await banner.innerText()).includes(m.title),'Banner missing material title');
     assert.equal(new URL(await banner.locator('a').getAttribute('href'),page.url()).href,STUDIO);
     if(id==='generator'){
      assert.equal(await page.locator('#nazev').inputValue(),m.title);
      assert.ok((await page.locator('#zadaniText').inputValue()).includes('SYNTHETIC-STAGE05-SOURCE'));
     }else{
      assert.equal(await page.locator('#mTopic').inputValue(),m.title);
      assert.ok((await page.locator('#pasteText').inputValue()).includes('SYNTHETIC-STAGE05-SOURCE'));
     }
    }
    const keys=await page.evaluate(()=>[localStorage.getItem('ghrab.platform.handoff.v2'),localStorage.getItem('ghrab.handoff.v1')]);
    assert.deepEqual(keys,[null,null],'Handoff should be consumed once');
    await page.screenshot({path:resolve(OUT,id+'-'+screen+'.png'),animations:'disabled'});
    const eventsBefore=await page.evaluate(()=>{try{return JSON.parse(localStorage.getItem('ghrab.pilot.events.v2')||'[]').filter(e=>e.type==='handoff-consumed').length}catch{return 0}});
    await page.reload({waitUntil:'load',timeout:65000});
    await page.waitForTimeout(1500);
    const eventsAfter=await page.evaluate(()=>{try{return JSON.parse(localStorage.getItem('ghrab.pilot.events.v2')||'[]').filter(e=>e.type==='handoff-consumed').length}catch{return 0}});
    assert.ok(eventsAfter<=eventsBefore,'Material handoff consumed more than once');
    if(id!=='ludus')assert.equal(await page.locator('.studio-import-banner').count(),0,'Material replay');
    entry.status='pass';
    console.log('PASS real consumer: '+id+' '+screen);
   }catch(e){
    failed=true;entry.status='fail';entry.error=String(e?.stack||e);
    console.error('FAIL real consumer: '+id+' '+screen+'\n'+entry.error);
    try{await page.screenshot({path:resolve(OUT,id+'-'+screen+'-failure.png')})}catch{}
   }finally{results.push(entry);await context.close()}
  }
 }
}finally{
 await browser.close();
 await writeFile(resolve(OUT,'results.json'),JSON.stringify({schema:'ghrab-stage05-real-consumer-uat-v1',sourceSha:process.env.GITHUB_SHA||'unrecorded',syntheticOnly:true,results},null,2)+'\n');
}
if(failed||results.length!==6||results.some(x=>x.status!=='pass'))process.exitCode=1;
