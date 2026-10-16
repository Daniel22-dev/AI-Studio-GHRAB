#!/usr/bin/env node
// Public read-only smoke: no school login, tokens, student data, writes or mutations.
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const sha40 = /^[a-f0-9]{40}$/, sha64 = /^[a-f0-9]{64}$/;
const SITE = 'https://daniel22-dev.github.io/AI-Studio-GHRAB/';
export function artifactDigest(files) {
  const rows = [...files].sort((a,b)=>Buffer.compare(Buffer.from(a.path), Buffer.from(b.path)));
  return sha(Buffer.from('ghrab-artifact-digest-v2\0' + rows.length + '\n' +
    rows.map(f=> f.path + '\0' + f.sha256 + '\0' + f.size + '\n').join('')));
}
export function validateManifest(m, expected) {
  const errors=[];
  if (!sha40.test(expected || '')) errors.push('invalid expected SHA');
  if (m?.schema !== 'ghrab-release-integrity-v2' ||
      m?.digestAlgorithmId !== 'ghrab-artifact-digest-v2' || m?.hashAlgorithm !== 'SHA-256')
    errors.push('invalid release integrity contract');
  if (m?.sourceCommit !== expected) errors.push('LIVE_SOURCE_SHA_MISMATCH');
  if (!Array.isArray(m?.files) || m.files.length < 150 || m.fileCount !== m.files.length)
    errors.push('INCOMPLETE_INVENTORY');
  else {
    const seen=new Set();
    for (const f of m.files) {
      if (typeof f.path !== 'string' || !f.path || f.path !== f.path.normalize('NFC') ||
          f.path.startsWith('/') || f.path.includes('\\') || f.path.includes('?') ||
          f.path.includes('#') || f.path.split('/').some(x=>!x || x==='.' || x==='..') ||
          seen.has(f.path) || !sha64.test(f.sha256 || '') ||
          !Number.isSafeInteger(f.size) || f.size < 0) {
        errors.push('INVALID_INVENTORY_PATH_OR_DIGEST');break;
      }
      seen.add(f.path);
    }
    if (artifactDigest(m.files) !== m.artifactDigest) errors.push('AGGREGATE_DIGEST_MISMATCH');
  }
  return errors;
}
export async function verifyInventory(m, read) {
  let cursor=0, valid=0;
  const errors=[];
  async function worker() {
    while (true) {
      const i=cursor++; if (i>=m.files.length) return;
      const f=m.files[i];
      try {
        const b=await read(f.path);
        if (b.length!==f.size || sha(b)!==f.sha256)
          errors.push({path:f.path,reason:'SIZE_OR_SHA256'});
        else valid++;
      } catch(e) { errors.push({path:f.path,reason:String(e.message||e).slice(0,110)}); }
    }
  }
  await Promise.all(Array.from({length:5}, worker));
  return {total:m.files.length,valid,failed:errors.length,examples:errors.slice(0,12)};
}
async function httpFile(relative) {
  const base=new URL(SITE), url=new URL(relative,base);
  if (url.origin!==base.origin || !url.pathname.startsWith(base.pathname))
    throw Error('Unsafe target URL');
  const response=await fetch(url,{headers:{'Cache-Control':'no-cache'},redirect:'error',
    signal:AbortSignal.timeout(25000)});
  if (response.status!==200) throw Error('HTTP '+response.status+' at '+relative);
  return Buffer.from(await response.arrayBuffer());
}
async function views(out, version) {
  const {chromium}=await import('playwright');
  const b=await chromium.launch({headless:true});
  const records=[];
  try {
    for (const [label,width,height] of [['desktop',1366,768],['mobile',390,844]]) {
      const context=await b.newContext({viewport:{width,height},
        serviceWorkers:'block',acceptDownloads:false});
      const page=await context.newPage();
      const jsErrors=[];
      page.on('pageerror',e=>{if(jsErrors.length<6)jsErrors.push(String(e).slice(0,150))});
      const response=await page.goto(SITE,{waitUntil:'domcontentloaded',timeout:35000});
      await page.waitForTimeout(2300);
      let dismissed=false;
      const dismiss=page.getByRole('button',{name:'Teď ne',exact:true});
      if (await dismiss.count() && await dismiss.first().isVisible()) {
        await dismiss.first().click({timeout:5000});dismissed=true;
        await page.waitForTimeout(700);
      }
      const dom=await page.evaluate(()=>({
        title:document.title,
        appId:document.documentElement.dataset.ghrabAppId||'',
        version:document.documentElement.dataset.appVersion||
          document.documentElement.dataset.ghrabAppVersion||'',
        access:document.documentElement.dataset.ghrabAccess||'',
        visibleLength:(document.body.innerText||'').length,
        overflow:Math.max(0,document.documentElement.scrollWidth-innerWidth)
      }));
      const screenshot='studio-live-'+label+'.png';
      await page.screenshot({path:path.join(out,screenshot),animations:'disabled',timeout:15000});
      const issues=[];
      if (response?.status()!==200) issues.push('HOME_HTTP');
      if (!/AI Studio/i.test(dom.title)) issues.push('TITLE');
      if (dom.appId!=='ai-studio') issues.push('APP_ID');
      if (dom.version!==version) issues.push('VERSION');
      if (dom.access==='granted') issues.push('ANONYMOUS_ACCESS');
      if (dom.visibleLength<50) issues.push('BLANK');
      if (dom.overflow>12) issues.push('HORIZONTAL_OVERFLOW');
      if (jsErrors.length) issues.push('UNCAUGHT_JAVASCRIPT');
      records.push({route:'/',viewport:label,http:response?.status()||0,
        dismissedInstallPrompt:dismissed,...dom,jsErrors,screenshot,issues});
      if (label==='desktop') {
        const mr=await page.goto(SITE+'manualy/',{waitUntil:'domcontentloaded',timeout:35000});
        await page.waitForTimeout(1700);
        const catalog=await page.evaluate(()=>({
          cards:document.querySelectorAll('.manual-card').length,
          unlocked:document.querySelectorAll('.manual-card.open').length,
          activeLinks:document.querySelectorAll('a.manual-open').length
        }));
        const shot='studio-manuals-anonymous.png';
        await page.screenshot({path:path.join(out,shot),timeout:15000});
        const problems=[];
        if (mr?.status()!==200) problems.push('MANUALS_HTTP');
        if (catalog.cards!==9) problems.push('MANUAL_CARD_COUNT');
        if (catalog.unlocked||catalog.activeLinks) problems.push('UNAUTHORIZED_MANUAL_ACCESS');
        records.push({route:'/manualy/',viewport:label,http:mr?.status()||0,
          ...catalog,screenshot:shot,issues:problems});
      }
      await context.close();
    }
  } finally {await b.close()}
  return records;
}
async function main(){
  const out=path.resolve('qa-results/live-studio-attestation');
  await mkdir(out,{recursive:true});
  const expected=process.env.EXPECTED_RELEASE_SHA;
  const report={schema:'ghrab-live-public-integrity-and-visual-v1',
    at:new Date().toISOString(),expectedSourceCommit:expected,url:SITE,
    scope:'ANONYMOUS PUBLIC GET ONLY',status:'FAIL',issues:[],views:[]};
  try {
    if (!sha40.test(expected||'')) throw Error('Missing exact expected SHA');
    const raw=await httpFile('release-integrity.json'), m=JSON.parse(raw);
    report.releaseManifestSha256=sha(raw);report.sourceCommit=m.sourceCommit;
    report.artifactDigest=m.artifactDigest;report.buildId=m.buildId;
    report.signatureStatus=m.signature?.status||null;
    report.issues.push(...validateManifest(m,expected));
    if (report.issues.length) throw Error('Invalid live release manifest');
    report.inventory=await verifyInventory(m,httpFile);
    if (report.inventory.failed) report.issues.push('LIVE_FILE_HASHES_FAILED');
    const build=JSON.parse(await httpFile('build-info.json'));
    const provenance=JSON.parse(await httpFile('build-provenance.json'));
    const security=JSON.parse(await httpFile('security-evidence-manifest.json'));
    report.version=build.version;
    if (build.version!==m.version) report.issues.push('VERSION_MISMATCH');
    if (provenance.source?.revision!==expected || security.sourceRevision!==expected)
      report.issues.push('SOURCE_PROVENANCE_MISMATCH');
    report.views=await views(out,m.version);
    for (const v of report.views) report.issues.push(...v.issues.map(x=>v.viewport+':'+v.route+':'+x));
    report.status=report.issues.length?'FAIL':'PASS';
  }catch(e){report.issues.push('HARNESS: '+String(e.message||e).slice(0,160))}
  await writeFile(path.join(out,'result.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({status:report.status,expected,source:report.sourceCommit,
    files:report.inventory,views:report.views.map(v=>({route:v.route,viewport:v.viewport,issues:v.issues})),
    issues:report.issues},null,2));
  if(report.status!=='PASS') process.exitCode=1;
}
if (process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) await main();
