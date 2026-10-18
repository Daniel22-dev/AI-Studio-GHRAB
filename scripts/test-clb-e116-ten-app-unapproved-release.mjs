import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash,webcrypto} from 'node:crypto';
import {
  assertClbSignedTrainingPolicy,
  checkedConversationLabTarget,
  validateClbPreliveControl,
  verifyClbOwnerContentReceipt
} from '../src/integration/conversation-lab/teacher-launch.js';
const load=async f=>JSON.parse(await readFile(new URL('../'+f,import.meta.url),'utf8'));
const old=[
  ['generator','7.1.99'],['differentiator','1.3.51'],['essay-evaluator','1.5.30'],
  ['correspondence','5.10.34'],['ludus','1.16.31'],['activity-builder','0.5.30'],
  ['sortio','1.1.23'],['lesson-hub','1.2.26'],['maturita-desk','1.0.6']
];
const digest=v=>createHash('sha256').update(v).digest('hex');
const manifestPath='src/integration/conversation-lab/studio-manifest.v0.9.2.proposed.json';
const ownerReceiptPath='src/integration/conversation-lab/owner-content-release.v0.9.2.signed.json';

test('E116 ten-app real registry is the original nine exactly plus owner-signed 0.9.2 CLB',async()=>{
 const [apps,fallback,sources,wave,ready,consumers,report,prm,manifest,bytes,owner]=await Promise.all([
  load('src/config/apps.generated.json'),load('src/config/apps.fallback.json'),load('src/config/sources.json'),
  load('src/config/release-wave.json'),load('src/config/ai-readiness.generated.json'),
  load('src/config/platform-consumers.json'),load('src/config/sync-report.json'),
  load('src/config/release-promotion-policy.json'),load(manifestPath),
  readFile(new URL('../'+manifestPath,import.meta.url)),load(ownerReceiptPath)
 ]);
 const expectIds=old.map(x=>x[0]).concat('conversation-lab');
 for(const [name,arr,key] of [
  ['apps',apps,'id'],['fallback',fallback,'id'],['sources',sources,'id'],
  ['wave',wave.applications,'id'],['readiness',ready.applications,'appId'],
  ['consumers without Studio',consumers.filter(x=>x.id!=='ai-studio'),'id'],
  ['report',report.sources,'id']
 ]){
  assert.equal(arr.length,10,name+' count');
  assert.equal(new Set(arr.map(x=>x[key])).size,10,name+' duplicates');
  assert.deepEqual(arr.map(x=>x[key]).sort(),[...expectIds].sort(),name+' identity');
 }
 assert.deepEqual(apps,fallback);
 assert.deepEqual(apps.slice(0,9).map(a=>[a.id,a.version]),old,'all nine original app IDs/versions must remain unchanged');
 assert.deepEqual(sources.slice(0,9).map(x=>x.id),old.map(x=>x[0]));
 assert.deepEqual(wave.applications.slice(0,9).map(x=>[x.id,x.version]),old);
 assert.deepEqual(ready.summary,{totalApps:10,readyApps:6,certifiedPendingApps:0,notMigratedApps:0,notApplicableApps:4,incompatibleApps:0});
 assert.deepEqual(apps[9],manifest,'the real registry must be the exact staged owner approved 0.9.2 Studio manifest');
 assert.equal(digest(bytes),'c071bc4af56367458fb4e391019d3476790111f31495718e737bc339ee5cd134');
 const clb=apps[9];
 assert.equal(clb.version,'0.9.2');
 assert.equal(clb.integration.launchMode,'external-protected');
 assert.equal(clb.integration.studioAccessIsLauncherGateOnly,true);
 assert.equal(clb.integration.teacherTrainingRequired,true);
 assert.equal(clb.integration.credentialBridgeAllowed,false);
 assert.equal(clb.integration.autoPromotionAllowed,false);
 assert.equal(clb.integration.signedStatementSha256,null);
 assert.equal(clb.integration.releaseId,owner.statement.releaseId);
 assert.equal(clb.integration.manifestSha256,owner.statement.publicCatalogSha256);
 assert.equal(report.sources.at(-1).ok,true);
 assert.equal(report.sources.at(-1).verification,'deployment');
 assert.equal(report.sources.at(-1).version,'0.9.2');
 assert.equal(prm.mode,'transitional');
 assert.equal(prm.defaultMode,'manual');
 assert.equal(prm.applications.some(x=>x.id==='conversation-lab'),false,'new CLB never enters GARP auto-patch');
 assert.equal(ready.applications.at(-1).status,'not-applicable','no remote LLM API');
 assert.equal(sources.at(-1).url,'https://conversation-lab-ghrab.pages.dev/studio-manifest.json');
 assert.equal(consumers.at(-1).cacheName,'ghrab-conversation-lab-v0.9.2');
});

test('E116 even with visible tenth catalog card the actual Studio teacher launcher MUST fail closed until authenticated school approval and P5',async()=>{
 const [control,apps,receipt,risk,policy]=await Promise.all([
  load('src/integration/conversation-lab/launch-control.json'),load('src/config/apps.generated.json'),
  load(ownerReceiptPath),load('src/integration/conversation-lab/governance/s0-risk-proposal.v0.9.2.json'),
  load('src/config/access-policy.json')
 ]);
 assert.equal(validateClbPreliveControl(control),true);
 assert.equal(control.stage,'PRELIVE_HOLD');
 assert.equal(control.launchEnabled,false);
 assert.equal(control.signedReleaseStatementSha256,null);
 assert.equal(control.publicRelease,'NO_GO');
 assert.equal(risk.status,'PROPOSED_NOT_APPROVED');
 assert.equal(risk.riskAccepted,false);
 assert.equal(risk.productionGO,false);
 assert.equal(policy.applications['conversation-lab'].trainingRequired,true);
 assertClbSignedTrainingPolicy(policy.applications['conversation-lab']);
 assert.equal(receipt.studioReleaseGo,false);
 assert.equal(receipt.statement.independentSecurityApproval,'NOT_GRANTED');
 assert.equal(receipt.statement.studioReleaseP5,'PENDING');
 assert.equal(receipt.statement.studioProductionPromotion,'NO_GO_UNTIL_SEPARATE_GATES');
 const app=apps.find(x=>x.id==='conversation-lab');
 const calls=[];
 await assert.rejects(
  checkedConversationLabTarget(app,{
   studioOrigin:'https://daniel22-dev.github.io',
   cryptoImpl:webcrypto,
   fetchImpl:async(path)=>{calls.push(path);return {ok:true,redirected:false,json:async()=>control}}
  }),
  /CLB_E9_RELEASE_NOT_AUTHORIZED/,'signed content or catalog alone cannot unlock teacher redirect'
 );
 assert.deepEqual(calls,['../../integration/conversation-lab/launch-control.json'],'a blocked launcher must NOT fetch private receipt or redirect');
 await assert.rejects(
  verifyClbOwnerContentReceipt(app,{...control,releaseId:app.integration.releaseId},receipt,{cryptoImpl:webcrypto}),
  /CLB_E9_OWNER_CONTENT_BINDING_MISMATCH/,'receipt must not bypass unapproved release SHA control'
 );
});
