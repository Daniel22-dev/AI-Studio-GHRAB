import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const root = path.resolve('.');
const dist = path.join(root, 'dist');
const outDir = path.join(root, 'qa-results');
const APP_VERSION = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8')).version;
const SESSION_GENERATION_KEY = 'ghrab.access.session-generation.v1';
const DRAFT_SUFFIX = 'workflow.draft.v1';

const appStub = `
const t=(cs,en)=>cs;
const safeGetItem=(key,fallback=null)=>{try{return localStorage.getItem(key)??fallback}catch{return fallback}};
const safeRemoveItem=(key)=>{try{localStorage.removeItem(key);return true}catch{return false}};
const safeSetJson=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));return true}catch{return false}};
window.GHRABPlatform={isSharedDevice:()=>true};
window.GHRAB={
 VERSION:'${APP_VERSION}',state:{language:'cs'},t,localised:(v)=>typeof v==='string'?v:(v?.cs||v?.en||''),
 safeGetItem,safeRemoveItem,safeSetJson,showToast:()=>{},loadApps:async()=>[],accessReady:Promise.resolve({valid:true}),
 readHandoff:()=>null,getWorkspace:()=>[],storageUsage:()=>({bytes:0}),hasAppAccess:()=>({enabled:true}),
 recordPilotEvent:()=>{},downloadArtifact:async()=>true,parseArtifactJson:async()=>null,
 saveWorkspaceMaterial:()=>true,deleteWorkspaceMaterial:()=>true,createHandoff:()=>({}),formatReason:(r)=>String(r||''),
 validMaterial:(m)=>Boolean(m&&m.schema==='ghrab-material-v1'),validateMaterialPackage:(m)=>({valid:Boolean(m&&m.schema==='ghrab-material-v1'),material:m,errors:[]})
};
`;

const mime = (file) => file.endsWith('.html') ? 'text/html; charset=utf-8' : file.endsWith('.js') ? 'text/javascript; charset=utf-8' : file.endsWith('.css') ? 'text/css; charset=utf-8' : file.endsWith('.json') ? 'application/json' : file.endsWith('.webmanifest') ? 'application/manifest+json' : 'application/octet-stream';
const server = createServer(async (req,res)=>{
  const pathname = new URL(req.url,'http://127.0.0.1').pathname;
  if(pathname==='/AI-Studio-GHRAB/app.js'){
    res.writeHead(200,{'Content-Type':'text/javascript; charset=utf-8','Cache-Control':'no-store'});
    res.end(appStub);
    return;
  }
  const rel = pathname.startsWith('/AI-Studio-GHRAB/') ? pathname.slice('/AI-Studio-GHRAB/'.length) : pathname.slice(1);
  const file = path.join(dist, rel || 'index.html');
  if(!file.startsWith(dist)){res.writeHead(403);res.end('forbidden');return;}
  try{const body=await readFile(file);res.writeHead(200,{'Content-Type':mime(file),'Cache-Control':'no-store'});res.end(body)}catch{res.writeHead(404);res.end('not found');}
});
await new Promise((resolve)=>server.listen(0,'127.0.0.1',resolve));
const port=server.address().port;
const base=`http://127.0.0.1:${port}`;

async function runScenario(browser, action) {
  const context=await browser.newContext();
  try {
    const page=await context.newPage();
    const canary=`GARP-STUDENT-CANARY-SIM03-${action}-${process.pid}`;
    await page.goto(`${base}/AI-Studio-GHRAB/workflow/index.html`,{waitUntil:'load'});
    await page.waitForSelector('#wf-title');
    await page.fill('#wf-title',`Synthetic ${canary}`);
    await page.fill('#wf-objectives',`Goal ${canary}`);
    await page.waitForTimeout(900);
    const before=await page.evaluate((marker)=>({
      hasDraft:[...Array(localStorage.length)].map((_,i)=>localStorage.key(i)).some((k)=>k&&k.includes('workflow.draft.v1')&&String(localStorage.getItem(k)).includes(marker)),
      historyGeneration:history.state?.ghrabSessionGeneration||'',
    }),canary);
    if(!before.hasDraft) throw new Error(`${action}: synthetic draft was not autosaved before destructive lifecycle action`);

    const lifecycle=await page.evaluate(async ({action,version})=>{
      globalThis.__GHRAB_DEPLOYMENT_CONFIG__={
        profile:'github-pages',authMode:'signed-permit',aiTransport:'not-applicable',telemetryMode:'local',
        apiBaseUrl:'',appBaseUrl:new URL('/AI-Studio-GHRAB/',location.href).href,
        features:{allowLocalProviderKeys:false},privacy:{sharedDeviceDefault:true},
      };
      const runtime=await import('../access/platform-runtime.js');
      await runtime.initialisePlatformRuntime({appId:'ai-studio',appVersion:version,mountControls:false});
      globalThis.GHRABPlatform.setSharedDevice(true);
      const result=action==='deleteMyData'
        ? await globalThis.GHRABPlatform.deleteMyData({reload:false})
        : await globalThis.GHRABPlatform.endWork({clearApplicationData:true,reload:false});
      return {
        ok:result.ok,
        sessionGenerationRotated:result.sessionGenerationRotated===true,
        generation:localStorage.getItem('ghrab.access.session-generation.v1')||'',
        canaryDraftStillPresent:[...Array(localStorage.length)].map((_,i)=>localStorage.key(i)).some((k)=>k&&k.includes('workflow.draft.v1')),
      };
    },{action,version:APP_VERSION});
    if(!lifecycle.ok || !lifecycle.sessionGenerationRotated || !lifecycle.generation || lifecycle.canaryDraftStillPresent) {
      throw new Error(`${action}: destructive lifecycle operation did not clear draft and rotate generation`);
    }

    await page.goto(`${base}/AI-Studio-GHRAB/index.html`,{waitUntil:'load'});
    await page.goBack({waitUntil:'load'}).catch(()=>{});
    await page.waitForSelector('#wf-title');
    await page.waitForTimeout(1000);
    const afterBack=await page.evaluate((marker)=>({
      title:document.querySelector('#wf-title')?.value||'',
      objectives:document.querySelector('#wf-objectives')?.value||'',
      status:document.querySelector('#draft-status')?.textContent||'',
      canaryInStorage:[...Array(localStorage.length)].map((_,i)=>localStorage.key(i)).some((k)=>k&&String(localStorage.getItem(k)).includes(marker)),
      currentGeneration:localStorage.getItem('ghrab.access.session-generation.v1')||'',
      historyGeneration:history.state?.ghrabSessionGeneration||'',
    }),canary);

    await page.fill('#wf-title','Nova hodina');
    await page.waitForTimeout(900);
    const afterEdit=await page.evaluate((marker)=>({
      canaryInStorage:[...Array(localStorage.length)].map((_,i)=>localStorage.key(i)).some((k)=>k&&String(localStorage.getItem(k)).includes(marker)),
      storedDraft:[...Array(localStorage.length)].map((_,i)=>localStorage.key(i)).find((k)=>k&&k.includes('workflow.draft.v1'))||'',
    }),canary);

    const second=await context.newPage();
    await second.goto(`${base}/AI-Studio-GHRAB/workflow/index.html`,{waitUntil:'load'});
    await second.waitForSelector('#wf-title');
    await second.waitForTimeout(700);
    const secondView=await second.evaluate((marker)=>({
      title:document.querySelector('#wf-title')?.value||'',
      objectives:document.querySelector('#wf-objectives')?.value||'',
      canaryInStorage:[...Array(localStorage.length)].map((_,i)=>localStorage.key(i)).some((k)=>k&&String(localStorage.getItem(k)).includes(marker)),
    }),canary);

    const generationMismatch=Boolean(afterBack.currentGeneration)&&afterBack.currentGeneration!==afterBack.historyGeneration;
    const pass=!afterBack.title.includes(canary)
      && !afterBack.objectives.includes(canary)
      && !afterBack.canaryInStorage
      && generationMismatch
      && !afterEdit.canaryInStorage
      && !secondView.title.includes(canary)
      && !secondView.objectives.includes(canary)
      && !secondView.canaryInStorage;
    return {
      action,
      canary:'synthetic-redacted',
      before:{hasDraft:before.hasDraft,historyGenerationPresent:Boolean(before.historyGeneration)},
      lifecycle,
      afterBack:{
        titleContainsCanary:afterBack.title.includes(canary),
        objectivesContainCanary:afterBack.objectives.includes(canary),
        canaryInStorage:afterBack.canaryInStorage,
        generationMismatch,
        status:afterBack.status,
      },
      afterEdit:{canaryInStorage:afterEdit.canaryInStorage,draftPresent:Boolean(afterEdit.storedDraft)},
      secondView:{
        titleContainsCanary:secondView.title.includes(canary),
        objectivesContainCanary:secondView.objectives.includes(canary),
        canaryInStorage:secondView.canaryInStorage,
      },
      status:pass?'passed':'failed',
    };
  } finally {
    await context.close().catch(()=>{});
  }
}

let browser;
try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
  const scenarios=[];
  scenarios.push(await runScenario(browser,'endWork'));
  scenarios.push(await runScenario(browser,'deleteMyData'));
  const pass=scenarios.every((scenario)=>scenario.status==='passed');
  const report={schema:'ghrab-sim03-shared-device-history-v2',appVersion:APP_VERSION,scenarios,status:pass?'passed':'failed'};
  await mkdir(outDir,{recursive:true});
  await writeFile(path.join(outDir,'qa-sim03-shared-device-history-report.json'),`${JSON.stringify(report,null,2)}\n`);
  console.log(JSON.stringify(report,null,2));
  if(!pass) process.exitCode=1;
}finally{
  await browser?.close().catch(()=>{});
  await new Promise((resolve)=>server.close(resolve));
}
