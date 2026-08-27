import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const appGuard = await readFile(path.join(root, 'src/access/app-guard.js'), 'utf8');
const accessStub = `
export async function initialiseAccess(){return {ready:true,permit:{role:'teacher'}}}
export function hasAppAccess(){return {enabled:true,permit:{sub:'qa',role:'teacher',apps:['correspondence']}}}
export function requiredTraining(){return null}
export function formatReason(reason){return String(reason||'')}
`;
const platformRuntimeStub = `export async function initialisePlatformRuntime(){document.documentElement.dataset.platformRuntimeStub='ready';return {}}`;
const harness = `<!doctype html><html lang="cs"><head><meta charset="utf-8"><title>platform race</title>
<script defer data-ghrab-platform-loader>
setTimeout(()=>{
  window.GHRAB_PLATFORM={
    contract:'ghrab-platform-v1',
    compatibility:{ok:true},
    unlockProtectedScripts(){
      const nodes=[...document.querySelectorAll('script[data-ghrab-protected]')];
      for(const source of nodes){const executable=document.createElement('script');executable.textContent=source.textContent||'';source.replaceWith(executable)}
      return nodes.length;
    }
  };
  document.dispatchEvent(new CustomEvent('ghrab:platform-ready'));
},250);
</script></head><body>
<script type="application/ghrab-protected" data-ghrab-protected>window.__SATELLITE_READY__=true;<\/script>
<script type="module">
const started=performance.now();
try{
  const {protectApp}=await import('/AI-Studio-GHRAB/access/app-guard.js');
  const allowed=await protectApp('correspondence',{errorReporter:false,telemetry:false,platformRuntime:true,platformReadyTimeoutMs:2000});
  if(!allowed) throw new Error('access denied');
  const unlocked=window.GHRAB_PLATFORM?.unlockProtectedScripts?.();
  if(unlocked!==1||window.__SATELLITE_READY__!==true) throw new Error('protected runtime did not unlock');
  document.body.dataset.elapsed=String(Math.round(performance.now()-started));
  document.body.dataset.testResult='pass';
}catch(error){document.body.dataset.testResult='fail';document.body.dataset.error=String(error?.stack||error)}
<\/script></body></html>`;

const routes = new Map([
  ['/harness.html', ['text/html; charset=utf-8', harness]],
  ['/AI-Studio-GHRAB/access/app-guard.js', ['text/javascript; charset=utf-8', appGuard]],
  ['/AI-Studio-GHRAB/access/access-control.js', ['text/javascript; charset=utf-8', accessStub]],
  ['/AI-Studio-GHRAB/access/platform-runtime.js', ['text/javascript; charset=utf-8', platformRuntimeStub]],
]);
const server = createServer((req,res)=>{
  const item=routes.get(new URL(req.url,'http://127.0.0.1').pathname);
  if(!item){res.writeHead(404);res.end('not found');return}
  res.writeHead(200,{'Content-Type':item[0],'Cache-Control':'no-store'});res.end(item[1]);
});
await new Promise((resolve)=>server.listen(0,'127.0.0.1',resolve));
const port=server.address().port;
let browser;
try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
  const page=await browser.newPage();
  const errors=[];
  page.on('pageerror',(error)=>errors.push(String(error)));
  page.on('console',(msg)=>{if(msg.type()==='error')errors.push(msg.text())});
  await page.goto(`http://127.0.0.1:${port}/harness.html`,{waitUntil:'load'});
  await page.waitForFunction(()=>document.body.dataset.testResult,{timeout:5000});
  const result=await page.evaluate(()=>({result:document.body.dataset.testResult,error:document.body.dataset.error||'',elapsed:Number(document.body.dataset.elapsed||0),wait:document.documentElement.dataset.ghrabPlatformUnlockWait||''}));
  if(result.result!=='pass') throw new Error(result.error||'browser harness failed');
  if(result.elapsed<180) throw new Error(`guard did not wait for delayed platform (${result.elapsed} ms)`);
  if(result.wait!=='ready') throw new Error(`unexpected wait state ${result.wait}`);
  if(errors.length) throw new Error(`browser errors: ${errors.join(' | ')}`);
  console.log(`platform bootstrap browser regression: PASS (${result.elapsed} ms)`);
} finally {
  await browser?.close().catch(()=>{});
  await new Promise((resolve)=>server.close(resolve));
}
