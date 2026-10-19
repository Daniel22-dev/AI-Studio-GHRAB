'use strict';
/**
 * Real browser / real teacher-entry regression with a fully intercepted HTTP
 * transport at the production URL shape. No request reaches GitHub/Cloudflare.
 * Positive release authorization is an explicit in-memory function fixture;
 * this harness never creates a fabricated owner-signed receipt.
 */
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
process.env.PLAYWRIGHT_BROWSERS_PATH||='/tmp/conversation-lab-browsers';
const pw=require(process.env.CLB_QA_PLAYWRIGHT||'/tmp/conversation-lab-qa-runtime/node_modules/playwright');
const settings=process.argv[2]?JSON.parse(fs.readFileSync(process.argv[2],'utf8')):{};
const studioRoot=path.resolve(settings.studioRoot||path.join(__dirname,'..'));
const workspace=path.resolve(studioRoot,'..');
const sourceRoot=path.resolve(settings.sourceRoot||path.join(workspace,'source-work/release/candidates/0.11.0'));
const buildRoot=path.resolve(settings.buildRoot||path.join(sourceRoot,'build'));
const output=path.resolve(settings.output||path.join(studioRoot,'qa/teacher-browser'));
const ORIGIN='https://daniel22-dev.github.io';
const BASE='/AI-Studio-GHRAB/';
const PUBLIC='https://conversation-lab-ghrab.pages.dev';
const TEACHER=ORIGIN+BASE+'conversation-lab/';
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const asJSON=bytes=>JSON.parse(bytes.toString('utf8'));
function snapshot(root){
  const files=new Map();
  function visit(relative=''){
    for(const entry of fs.readdirSync(path.join(root,relative),{withFileTypes:true})){
      const rel=path.posix.join(relative,entry.name);
      if(entry.isDirectory())visit(rel);else if(entry.isFile())files.set(rel,fs.readFileSync(path.join(root,rel)));
    }
  }
  visit();return files;
}
const teacher=snapshot(path.join(buildRoot,'teacher'));
const originalBuildTeacherEntry=teacher.get('teacher-entry.js');
const publicFiles=snapshot(path.join(buildRoot,'public'));
const studio=snapshot(path.join(studioRoot,'src'));
const stagedProfile=JSON.parse(studio.get('conversation-lab/release-profile.js').toString().match(/export default Object\.freeze\((\{.*\})\);/s)[1]);
const stagedHold=asJSON(studio.get('integration/conversation-lab/launch-control.v0.11.0.json'));
const sourceTeacherEntry=fs.readFileSync(path.join(sourceRoot,'teacher-entry.js'));
if(settings.requireExactBuildEntry!==false)assert.deepEqual(sourceTeacherEntry,originalBuildTeacherEntry,'Rebuild the teacher bundle after changing teacher-entry.js');
else teacher.set('teacher-entry.js',sourceTeacherEntry);
const buildReport=asJSON(fs.readFileSync(path.join(buildRoot,'build-report.json')));
const profile=buildReport.releaseProfile;
const oldReceipt=asJSON(studio.get('integration/conversation-lab/owner-content-release.v0.9.2.signed.json'));
const currentApps=asJSON(studio.get('config/apps.generated.json'));
const originalGate=studio.get('integration/conversation-lab/teacher-launch.js');
const originalAccess=studio.get('access/access-control.js');
assert.equal(profile.appVersion,'0.11.0');
assert.equal(profile.publicAppJsSha256,sha(teacher.get('assets/app.js')),'Teacher loader must match the exact candidate profile');
assert.equal(profile.signedReleaseStatementSha256,null,'This harness is for the unsigned 0.11.0 candidate');
fs.mkdirSync(output,{recursive:true});
const report={
  schema:'ghrab-clb-teacher-browser-regression-v1',startedAt:new Date().toISOString(),
  productionAuthorization:false,actualNewOwnerSignatureAvailable:false,
  transport:'PLAYWRIGHT_ROUTE_FULFILL_AT_PRODUCTION_ORIGINS_NO_EXTERNAL_NETWORK',
  positiveAuthorization:'EXPLICIT_IN_MEMORY_TEST_FUNCTION_ONLY_NO_OWNER_RECEIPT_CREATED',
  exactBuildTeacherEntryRequired:settings.requireExactBuildEntry!==false,
  verificationScope:{
    positiveUsesActual:['teacher-entry.js','signed CLB-01 policy verification','registry/deployment loader','SRI-protected player loader','MASTER lesson runtime and assets','teacher station/theme/QR controls','anonymous public player and candidate CSP headers'],
    positiveReplacesOnly:['hasAppAccess result: explicit synthetic teacher permission','checkedConversationLabMasterTarget result: explicit in-memory function returning canonical Cloudflare target'],
    actualNegativeEvidence:['No signed teacher permit: access denied','Actual unchanged historical B1 receipt: V2 MASTER gate rejects scope/schema','New 72-variant receipt missing: denied before content','Actual staged unsigned release profile and HOLD control: no unavailable asset requested'],
    notEstablished:['Production teacher access with a valid signed permit','Acceptance of an actual new 72-variant owner receipt, which is unavailable','Live Cloudflare deployment or headers','Production promotion or updated live Studio registry'],
    noOwnerReceiptGenerated:true,noExternalRequestAllowed:true
  },
  sourceTeacherEntrySha256:sha(teacher.get('teacher-entry.js')),
  originalBuildTeacherEntrySha256:sha(originalBuildTeacherEntry),
  originalBuildTeacherZipSha256:buildReport.teacherZipSha256,
  publicZipSha256:buildReport.publicZipSha256,
  stagedFiles:[...studio.keys()].filter(file=>file.startsWith('conversation-lab/')).sort(),
  stagedProfileSha256:sha(studio.get('conversation-lab/release-profile.js')),
  stagedHoldSha256:sha(studio.get('integration/conversation-lab/launch-control.v0.11.0.json')),
  masterGateSha256:sha(originalGate),actualAccessModuleSha256:sha(originalAccess),
  realB1ReceiptSha256:sha(studio.get('integration/conversation-lab/owner-content-release.v0.9.2.signed.json')),
  browserVersions:{},tests:[],failures:[]
};
const save=()=>{report.finishedAt=new Date().toISOString();fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');};

function accessFixture(scenario){return `// TEST ONLY transport fixture: actual signed policy, simulated teacher permission.
import * as actual from './access-control-actual.js';
export async function initialiseAccess(){globalThis.__clbTestEvents.push('initialiseAccess');${scenario.injectedNativeError?"throw Error('Failed to fetch https://CLB_DUMMY_USER:CLB_DUMMY_PASSWORD@example.invalid/private');":""}const value=await actual.initialiseAccess();globalThis.__clbActualAccessSnapshot=value;return value;}
export function requiredTraining(id){globalThis.__clbTestEvents.push('requiredTraining');return actual.requiredTraining(id);}
export function hasAppAccess(id){globalThis.__clbTestEvents.push('hasAppAccess:SYNTHETIC_TEACHER_PERMISSION');return {enabled:true,reason:'EXPLICIT_TEST_FIXTURE'};}
`;}
function syntheticGateFixture(){return `// TEST ONLY: no receipt, no signature, no production approval.
import {assertClbSignedTrainingPolicy as actualPolicy} from './teacher-launch-actual.js';
export function assertClbSignedTrainingPolicy(policy){globalThis.__clbTestEvents.push('signedPolicyCheck');return actualPolicy(policy);}
export async function checkedConversationLabMasterTarget(app,{studioOrigin,releaseProfile}){
  if(studioOrigin!==${JSON.stringify(ORIGIN)}||app.version!=='0.11.0'||releaseProfile.releaseId!=='cl-master-72-20261019-r1')throw Error('CLB_SYNTHETIC_FIXTURE_INVALID');
  globalThis.__clbTestEvents.push('SYNTHETIC_MASTER_RELEASE_GATE');return ${JSON.stringify(PUBLIC+'/')};
}
`;}
function readyControl(testProfile){return {
  schema:'ghrab-cl-studio-e9-teacher-launch-control-v1',appId:'conversation-lab',appVersion:'0.11.0',
  stage:'PRODUCTION_AUTHORIZED',launchEnabled:true,teacherTrainingRequired:true,
  requiredTrainingCode:'CLB-01',requiredTrainingVersion:'2026-10',
  teacherEntry:'STUDIO_SAME_ORIGIN_PERMIT_AND_TRAINING_GATED',studentDirectEntry:'ANONYMOUS_NO_STUDIO_ACCOUNT',
  publicPlayer:'ANONYMOUS_READ_ONLY',publicOrigin:PUBLIC,releaseId:testProfile.releaseId,
  approvedDistributionManifestSha256:testProfile.publicCatalogSha256,
  publicStudioManifestSha256:testProfile.publicStudioManifestSha256,
  signedReleaseStatementSha256:testProfile.signedReleaseStatementSha256,
  approvedLessons:72,approvedCzechGlosses:0,ownerReleaseAuthorization:'PROJECT_OWNER_S0_APPROVED',
  publicRelease:'MANUAL_RELEASE_APPROVED',hostingOwnership:'VERIFIED',hostingHeaders:'VERIFIED',
  garpFoundation:'VERIFIED_STATIC_GARP27_0_11_0',publicClientLive:'VERIFIED_EXACT_PUBLIC_INVENTORY',
  garpLive:'NOT_TESTED',schoolServerLive:'DEFERRED_NOT_TESTED',
  independentSecurityApproval:'OWNER_S0_AI_OPPOSITION_ACCEPTED',
  ownerRiskAcceptanceRef:'./governance/project-owner-release.v0.11.0.json',
  riskProfile:'S0_ANONYMOUS_STATIC_PUBLIC_PLAYER_ONLY',studioCredentialBridge:'FORBIDDEN',publishStudentData:false,
  autoPromotion:'DISABLED',crossRepositoryDispatch:'DISABLED'
};}
function candidateApps(testProfile){
  return currentApps.map(app=>app.id==='conversation-lab'?{
    ...app,version:'0.11.0',integration:{...app.integration,
      launchMode:'studio-teacher',releaseId:testProfile.releaseId,manifestSha256:testProfile.publicCatalogSha256,
      signedStatementSha256:testProfile.signedReleaseStatementSha256
    }
  }:app);
}
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml'};
function publicHeaders(){
  const headers={};let section=false;
  for(const line of publicFiles.get('_headers').toString().split('\n')){
    if(line==='/*'){section=true;continue;}
    const m=line.match(/^  ([^:]+):\s*(.*)$/);if(section&&m)headers[m[1]]=m[2];
  }
  return headers;
}
async function scenarioContext(browser,scenario,record){
  const context=await browser.newContext({viewport:{width:1440,height:1000},locale:'en-US',timezoneId:'Europe/Prague',serviceWorkers:'block'});
  await context.addInitScript(()=>{
    globalThis.__clbTestEvents=[];
    globalThis.__clbUnhandled=[];
    window.addEventListener('unhandledrejection',event=>globalThis.__clbUnhandled.push(String(event.reason)));
  });
  const testProfile=structuredClone(scenario.stagedOnly?stagedProfile:profile);
  if(scenario.oldReceipt)testProfile.signedReleaseStatementSha256=oldReceipt.statementSha256;
  if(scenario.missingReceipt||scenario.syntheticProfileDigest)testProfile.signedReleaseStatementSha256='f'.repeat(64);
  const apps=candidateApps(testProfile);
  await context.route('**/*',async route=>{
    const request=route.request(),u=new URL(request.url());
    const headers=await request.allHeaders();
    record.requests.push({url:request.url(),type:request.resourceType(),headers});
    if(![ORIGIN,PUBLIC].includes(u.origin)){
      record.unexpectedNetwork.push(request.url());await route.abort('blockedbyclient');return;
    }
    let bytes,file,extra={};
    if(u.origin===PUBLIC){
      file=decodeURIComponent(u.pathname.slice(1)||'index.html');
      bytes=publicFiles.get(file);extra=publicHeaders();
    }else if(u.pathname.startsWith(BASE+'conversation-lab/')){
      file=decodeURIComponent(u.pathname.slice((BASE+'conversation-lab/').length)||'index.html');
      bytes=scenario.stagedOnly?studio.get('conversation-lab/'+file):teacher.get(file);
      if(file==='release-profile.js'&&(scenario.oldReceipt||scenario.missingReceipt||scenario.syntheticProfileDigest))bytes=Buffer.from('export default Object.freeze('+JSON.stringify(testProfile)+');\n');
      if(file==='assets/app.js'&&scenario.tamperedLoader)bytes=Buffer.concat([bytes,Buffer.from('\n/* TEST ONLY integrity tamper */\n')]);
    }else if(u.pathname.startsWith(BASE)){
      file=decodeURIComponent(u.pathname.slice(BASE.length));bytes=studio.get(file);
      if(scenario.teacherPermissionFixture&&file==='access/access-control.js')bytes=Buffer.from(accessFixture(scenario));
      if(file==='access/access-control-actual.js')bytes=originalAccess;
      if(scenario.syntheticGate&&file==='integration/conversation-lab/teacher-launch.js')bytes=Buffer.from(syntheticGateFixture());
      if(file==='integration/conversation-lab/teacher-launch-actual.js')bytes=originalGate;
      if((file==='config/apps.generated.json'||file==='config/apps.fallback.json')&&!scenario.oldRegistry)bytes=Buffer.from(JSON.stringify(apps));
      if(file==='integration/conversation-lab/launch-control.v0.11.0.json')bytes=Buffer.from(JSON.stringify(scenario.oldReceipt||scenario.missingReceipt?readyControl(testProfile):stagedHold));
      if(file==='integration/conversation-lab/owner-content-release.v0.11.0.signed.json')bytes=scenario.oldReceipt?studio.get('integration/conversation-lab/owner-content-release.v0.9.2.signed.json'):undefined;
    }
    if(bytes===undefined){record.missingFiles.push(u.origin+u.pathname);await route.fulfill({status:404,contentType:'text/plain',body:'Test fixture: resource not present'});return;}
    await route.fulfill({status:200,headers:{'Content-Type':MIME[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer',...extra},body:bytes});
  });
  return context;
}
async function deniedCase(browser,engine,scenario){
  const record={engine,name:scenario.name,expect:'DENIED_BEFORE_CONTENT',teacherPermissionFixture:!!scenario.teacherPermissionFixture,injectedNativeError:!!scenario.injectedNativeError,stagedFilesOnly:!!scenario.stagedOnly,syntheticProfileDigest:!!scenario.syntheticProfileDigest,syntheticReleaseGate:false,requests:[],unexpectedNetwork:[],missingFiles:[],errors:[]};
  const context=await scenarioContext(browser,scenario,record),page=await context.newPage();
  page.setDefaultTimeout(7000);
  page.on('pageerror',error=>record.errors.push(error.message));
  try{
    await page.goto(scenario.url||TEACHER,{waitUntil:'load'});
    await page.waitForFunction(()=>document.documentElement.dataset.clbGate==='denied',null,{timeout:7000});
    record.status=await page.locator('#clb-gate-status').innerText();
    assert.match(record.status,scenario.code);
    assert.equal(await page.locator('.shell').isVisible(),false,'Unapproved catalog must stay hidden');
    assert.equal(await page.locator('#sectionNav').count(),0,'No lesson DOM before authorization');
    assert.equal(await page.evaluate(()=>typeof globalThis.__clbStartPlayer),'undefined','Player must not be installed');
    const contentRequests=record.requests.filter(r=>/\/conversation-lab\/(?:assets\/app\.js|assets\/masters\/|data\/)/.test(r.url));
    assert.deepEqual(contentRequests,[],'No player runtime, content JSON, QR, or MASTER may be requested');
    assert.deepEqual(record.unexpectedNetwork,[]);
    assert.deepEqual(record.errors,[]);
    const body=await page.locator('body').innerText();assert.doesNotMatch(body,/CLB_DUMMY_PASSWORD|CLB_DUMMY_USER/);
    record.actualAccess=await page.evaluate(()=>globalThis.__clbActualAccessSnapshot||null);
    record.events=await page.evaluate(()=>globalThis.__clbTestEvents);
    if(scenario.oldReceipt)assert.ok(record.requests.some(r=>r.url.endsWith('/owner-content-release.v0.11.0.signed.json')),'Must reach the actual old receipt rejection');
    if(scenario.missingReceipt)assert.ok(record.missingFiles.some(u=>u.endsWith('/owner-content-release.v0.11.0.signed.json')));
    if(scenario.stagedOnly){
      assert.deepEqual(record.missingFiles,[],'The public staged HOLD must never request an absent lesson, runtime, or receipt');
      assert.ok(record.requests.some(r=>r.url.endsWith('/launch-control.v0.11.0.json')),'The actual scoped HOLD file is requested from Studio');
      assert.ok(!record.requests.some(r=>r.url.endsWith('/owner-content-release.v0.11.0.signed.json')),'HOLD exits before any receipt request');
    }
    await page.screenshot({path:path.join(output,engine+'-'+scenario.name+'.png')});
    record.pass=true;
  }finally{report.tests.push(record);await context.close();save();}
}
async function syntheticPositive(browser,engine,tamperedLoader=false){
  const scenario={name:tamperedLoader?'synthetic-gate-tampered-loader':'synthetic-gate-teacher-to-anonymous-student',teacherPermissionFixture:true,syntheticGate:true,tamperedLoader};
  const record={engine,name:scenario.name,expect:tamperedLoader?'SRI_DENIED':'TEACHER_PLAYER_AND_ANONYMOUS_QR_WITH_SYNTHETIC_PERMISSION_AND_RELEASE_GATE',teacherPermissionFixture:true,syntheticReleaseGate:true,ownerReceiptCreated:false,requests:[],unexpectedNetwork:[],missingFiles:[],errors:[]};
  const context=await scenarioContext(browser,scenario,record),page=await context.newPage();
  page.setDefaultTimeout(10000);
  page.on('pageerror',error=>record.errors.push(error.message));
  try{
    await page.goto(TEACHER+'#/l/summer-holidays/fr/B2/s/s03',{waitUntil:'load'});
    if(tamperedLoader){
      await page.waitForFunction(()=>document.documentElement.dataset.clbGate==='denied');
      assert.match(await page.locator('#clb-gate-status').innerText(),/CLB_STUDIO_PLAYER_INTEGRITY_FAILED/);
      assert.equal(await page.evaluate(()=>typeof globalThis.__clbStartPlayer),'undefined');
      assert.ok(!record.requests.some(r=>/\/conversation-lab\/data\//.test(r.url)));
    }else{
      await page.locator('#sectionNav button').nth(7).waitFor({timeout:10000});
      assert.equal(new URL(page.url()).origin,ORIGIN);
      assert.equal(await page.locator('#languageSelect').inputValue(),'fr');
      assert.equal(await page.locator('#levelSwitch button.active').getAttribute('data-level'),'B2');
      assert.equal(await page.locator('#stationNum').innerText(),'3');
      await page.locator('#nextBtn').click();assert.equal(await page.locator('#stationNum').innerText(),'4');
      const theme=await page.locator('html').getAttribute('data-theme');await page.locator('#themeBtn').click();assert.notEqual(await page.locator('html').getAttribute('data-theme'),theme);
      await page.locator('#clb-share-open').click();await page.locator('#clb-share-qr svg').waitFor();
      record.studentUrl=await page.locator('#clb-share-url').inputValue();
      assert.equal(record.studentUrl,PUBLIC+'/#/l/summer-holidays/fr/B2/s/s04');
      const studentUrl=new URL(record.studentUrl);assert.equal(studentUrl.search,'');assert.equal(studentUrl.username,'');assert.equal(studentUrl.password,'');
      assert.ok(!record.requests.some(r=>new URL(r.url).origin===PUBLIC),'Teacher projects from Studio without contacting Cloudflare');
      await page.screenshot({path:path.join(output,engine+'-teacher-qr.png')});
      const anonymous=await scenarioContext(browser,{},record),student=await anonymous.newPage();
      student.on('pageerror',error=>record.errors.push(error.message));
      try{
        await student.goto(record.studentUrl,{waitUntil:'load'});
        await student.locator('#sectionNav button').nth(7).waitFor({timeout:10000});
        assert.equal(new URL(student.url()).origin,PUBLIC);
        assert.equal(await student.locator('#stationNum').innerText(),'4');
        assert.equal(await student.locator('#languageSelect').inputValue(),'fr');
        assert.equal(await student.evaluate(()=>localStorage.getItem('ghrab.access.permit.v2')),null);
        assert.equal(await student.locator('#clb-gate-status').count(),0);
        await student.screenshot({path:path.join(output,engine+'-anonymous-student.png')});
      }finally{await anonymous.close();}
      record.publicRequests=record.requests.filter(r=>new URL(r.url).origin===PUBLIC);
      for(const request of record.publicRequests){assert.ok(!request.headers.authorization);assert.ok(!request.headers.cookie);assert.ok(!request.headers.referer);}
    }
    record.events=await page.evaluate(()=>globalThis.__clbTestEvents);
    assert.deepEqual(record.events,['initialiseAccess','requiredTraining','signedPolicyCheck','hasAppAccess:SYNTHETIC_TEACHER_PERMISSION','SYNTHETIC_MASTER_RELEASE_GATE']);
    assert.ok(!record.requests.some(r=>r.url.includes('owner-content-release.v0.11.0.signed.json')),'Synthetic positive does not fabricate or fetch a new owner signature');
    assert.deepEqual(record.unexpectedNetwork,[]);assert.deepEqual(record.errors,[]);record.pass=true;
  }finally{report.tests.push(record);await context.close();save();}
}

(async()=>{
  for(const engine of settings.engines||['chromium','firefox','webkit']){
    const browser=await pw[engine].launch({headless:true});
    report.browserVersions[engine]=browser.version();
    try{
      const scenarios=[
        {name:'real-access-no-teacher-permit',code:/CLB_STUDIO_TEACHER_ACCESS_REQUIRED/},
        {name:'unsigned-master-staged-hold',stagedOnly:true,teacherPermissionFixture:true,code:/CLB_E9_MASTER_RELEASE_PROFILE_NOT_SIGNED_READY/},
        {name:'staged-hold-with-synthetic-profile-digest',stagedOnly:true,teacherPermissionFixture:true,syntheticProfileDigest:true,code:/CLB_E9_MASTER_RELEASE_NOT_AUTHORIZED/},
        {name:'actual-old-b1-receipt-rejected',teacherPermissionFixture:true,oldReceipt:true,code:/CLB_E9_MASTER_OWNER_CONTENT_RECEIPT_INVALID/},
        {name:'missing-new-library-receipt',teacherPermissionFixture:true,missingReceipt:true,code:/CLB_E9_MASTER_OWNER_CONTENT_UNAVAILABLE/},
        {name:'unexpected-native-error-redacted',teacherPermissionFixture:true,injectedNativeError:true,code:/CLB_STUDIO_UNAVAILABLE/},
        {name:'query-credential-refused',url:TEACHER+'?permit=CLB_DUMMY_PASSWORD',code:/CLB_STUDIO_ORIGIN_INVALID/},
        {name:'userinfo-credential-refused',url:'https://CLB_DUMMY_USER:CLB_DUMMY_PASSWORD@daniel22-dev.github.io'+BASE+'conversation-lab/',code:/CLB_STUDIO_ORIGIN_INVALID|CLB_STUDIO_UNAVAILABLE/}
      ];
      for(const scenario of scenarios){
        try{await deniedCase(browser,engine,scenario);console.log('PASS',engine,scenario.name);}
        catch(error){report.failures.push({engine,name:scenario.name,message:error.message});save();console.error('FAIL',engine,scenario.name,error.message);}
      }
      for(const tampered of [false,true]){
        try{await syntheticPositive(browser,engine,tampered);console.log('PASS',engine,tampered?'synthetic-sri-negative':'synthetic-teacher-student');}
        catch(error){report.failures.push({engine,name:tampered?'synthetic-sri-negative':'synthetic-teacher-student',message:error.message});save();console.error('FAIL',engine,error.message);}
      }
    }finally{await browser.close();}
  }
  save();console.log(JSON.stringify({tests:report.tests.length,passed:report.tests.filter(t=>t.pass).length,failures:report.failures.length,report:path.join(output,'report.json')}));
  if(report.failures.length)process.exitCode=1;
})().catch(error=>{report.failures.push({name:'harness',message:error.message,stack:error.stack});save();console.error(error);process.exitCode=1;});
