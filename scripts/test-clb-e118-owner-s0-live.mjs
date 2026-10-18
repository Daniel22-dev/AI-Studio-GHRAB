import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {verifySignedBundle} from '../src/tools/security-center/security-center-core.js';
import {assertClbSignedTrainingPolicy,validateConversationLabTeacherTarget,checkedConversationLabTarget,verifyClbOwnerContentReceipt,assertClbProjectOwnerS0Acceptance} from '../src/integration/conversation-lab/teacher-launch.js';
const load=async f=>JSON.parse(await readFile(new URL('../'+f,import.meta.url),'utf8'));
const pref='src/integration/conversation-lab/';
const site='https://conversation-lab-ghrab.pages.dev/';
const controlPath='../../integration/conversation-lab/launch-control.json';
const receiptPath='../../integration/conversation-lab/owner-content-release.v0.9.2.signed.json';
const decisionPath='../../integration/conversation-lab/governance/project-owner-release.v0.9.2.json';
const old=[['generator','7.1.99'],['differentiator','1.3.51'],['essay-evaluator','1.5.30'],['correspondence','5.10.34'],['ludus','1.16.31'],['activity-builder','0.5.30'],['sortio','1.1.23'],['lesson-hub','1.2.26'],['maturita-desk','1.0.6']];
const clone=v=>structuredClone(v);
async function fixture(){
 const [apps,control,receipt,decision,bundle,signature,key]=await Promise.all([
  load('src/config/apps.generated.json'),load(pref+'launch-control.json'),
  load(pref+'owner-content-release.v0.9.2.signed.json'),
  load(pref+'governance/project-owner-release.v0.9.2.json'),
  load('src/config/access-config-bundle.json'),
  load('src/config/access-config-bundle.sig.json'),
  load('src/config/access-config-verify-key.json')
 ]);
 return {apps,app:apps.find(a=>a.id==='conversation-lab'),control,receipt,decision,bundle,signature,key};
}
test('E118 exactly ten apps with unchanged original nine, auto-promotion off',async()=>{
 const x=await fixture();
 const [fallback,sources,wave,readiness,consumers,sync,promotion]=await Promise.all([
  load('src/config/apps.fallback.json'),load('src/config/sources.json'),
  load('src/config/release-wave.json'),load('src/config/ai-readiness.generated.json'),
  load('src/config/platform-consumers.json'),load('src/config/sync-report.json'),
  load('src/config/release-promotion-policy.json')]);
 assert.equal(x.apps.length,10);
 assert.deepEqual(x.apps.slice(0,9).map(v=>[v.id,v.version]),old);
 assert.deepEqual(fallback,x.apps);
 assert.equal(sources.length,10);
 assert.equal(wave.applications.length,10);
 assert.equal(readiness.summary.totalApps,10);
 assert.equal(readiness.summary.notApplicableApps,4);
 assert.equal(consumers.length,11);
 assert.equal(sync.counts.verified,10);
 assert.equal(x.app.version,'0.9.2');
 assert.equal(x.app.integration.launchMode,'external-protected');
 assert.equal(x.app.integration.autoPromotionAllowed,false);
 assert.equal(x.app.integration.credentialBridgeAllowed,false);
 assert.equal(x.app.integration.signedStatementSha256,null);
 assert.equal(promotion.applications.some(v=>v.id==='conversation-lab'),false);
});
test('E118 actual signed CLB-01 bundle and exact owner public content both verify under pinned Studio key',async()=>{
 const x=await fixture();
 assert.equal(await verifySignedBundle({bundle:x.bundle,signature:x.signature,verifyKey:x.key,cryptoImpl:webcrypto}),true);
 assertClbSignedTrainingPolicy(x.bundle.policy.applications['conversation-lab']);
 assert.equal(x.receipt.studioReleaseGo,false);
 assert.equal(x.receipt.statement.independentSecurityApproval,'NOT_GRANTED');
 assert.equal(await verifyClbOwnerContentReceipt(x.app,x.control,x.receipt,{cryptoImpl:webcrypto}),true);
 assert.equal(x.decision.independentSecurityApproval,'NOT_CLAIMED');
 assert.equal(x.decision.schoolInstitutionalSignoff,'NOT_ATTESTED');
 assert.equal(assertClbProjectOwnerS0Acceptance(x.decision,x.app,x.control),true);
});
test('E118 signed teacher-only redirect follows strict Studio-origin control, ES256 receipt and separate owner decision',async()=>{
 const x=await fixture();
 assert.equal(x.control.stage,'PRODUCTION_AUTHORIZED');
 assert.equal(x.control.launchEnabled,true);
 assert.equal(x.control.publicRelease,'MANUAL_RELEASE_APPROVED');
 assert.equal(x.control.garpLive,'NOT_TESTED');
 assert.equal(x.control.schoolServerLive,'DEFERRED_NOT_TESTED');
 assert.equal(x.control.independentSecurityApproval,'OWNER_S0_AI_OPPOSITION_ACCEPTED');
 assert.equal(x.control.riskProfile,'S0_ANONYMOUS_STATIC_PUBLIC_PLAYER_ONLY');
 assert.equal(x.control.autoPromotion,'DISABLED');
 assert.equal(x.control.crossRepositoryDispatch,'DISABLED');
 assert.equal(x.control.studioCredentialBridge,'FORBIDDEN');
 assert.equal(x.control.publishStudentData,false);
 assert.equal(validateConversationLabTeacherTarget(x.app,x.control,{studioOrigin:'https://daniel22-dev.github.io'}),site);
 const paths=[];
 const fake=async (path,opts)=>{
  paths.push({path,opts});
  const value=path===controlPath?x.control:path===receiptPath?x.receipt:path===decisionPath?x.decision:null;
  return value?{ok:true,redirected:false,json:async()=>value}:{ok:false};
 };
 assert.equal(await checkedConversationLabTarget(x.app,{studioOrigin:'https://daniel22-dev.github.io',fetchImpl:fake,cryptoImpl:webcrypto}),site);
 assert.deepEqual(paths.map(x=>x.path),[controlPath,receiptPath,decisionPath]);
 assert.ok(paths.every(x=>x.opts.credentials==='same-origin'&&x.opts.cache==='no-store'&&x.opts.redirect==='error'));
});
test('E118 reject mutated control, forged project owner decision and tampered signed content',async()=>{
 const x=await fixture();
 const controls=[
  c=>{c.launchEnabled=false},c=>{c.stage='PRELIVE_HOLD'},c=>{c.publicRelease='NO_GO'},
  c=>{c.independentSecurityApproval='SIGNED_AND_VERIFIED'},c=>{c.ownerReleaseAuthorization='NOT_GRANTED'},
  c=>{c.ownerRiskAcceptanceRef='https://evil.invalid'},c=>{c.requiredTrainingCode='NONE'},
  c=>{c.hostingHeaders='NOT_VERIFIED'},c=>{c.garpLive='VERIFIED'},
  c=>{c.schoolServerLive='FALSE_LIVE'},c=>{c.releaseId='other'},
  c=>{c.autoPromotion='ENABLED'},
  c=>{c.studioCredentialBridge='ALLOWED'}
 ];
 for(let i=0;i<controls.length;i++){
  const v=clone(x.control);controls[i](v);
  assert.throws(()=>validateConversationLabTeacherTarget(x.app,v,{studioOrigin:'https://daniel22-dev.github.io'}),/CLB_E9_/,'bad release control '+i);
 }
 // A syntactically valid SHA-256 value must fail at the *cryptographic*
 // receipt binding boundary, not at the earlier URL/control schema gate.
 const wrongSha=clone(x.control);wrongSha.signedReleaseStatementSha256='f'.repeat(64);
 assert.equal(validateConversationLabTeacherTarget(x.app,wrongSha,{studioOrigin:'https://daniel22-dev.github.io'}),site);
 await assert.rejects(
  ()=>verifyClbOwnerContentReceipt(x.app,wrongSha,x.receipt,{cryptoImpl:webcrypto}),
  /CLB_E9_OWNER_CONTENT_BINDING_MISMATCH/
 );
 const owners=[
  r=>{r.ownerGitHubLogin='evil'},r=>{r.ownerGitHubUserId=1},r=>{r.appVersion='0.9.3'},
  r=>{r.riskAcceptanceByProjectOwner=false},r=>{r.independentSecurityApproval='FAKE_CERTIFIED'},
  r=>{r.publicArtifact.zipSha256='f'.repeat(64)},
  r=>{r.technicalReview.independentHumanSecurityCertification=true},
  r=>{r.schoolInstitutionalSignoff='ATTESTED'},r=>{r.studioTokenForwarding=true}
 ];
 for(let i=0;i<owners.length;i++){
  const v=clone(x.decision);owners[i](v);
  assert.throws(()=>assertClbProjectOwnerS0Acceptance(v,x.app,x.control),/CLB_E9_OWNER_S0_ACCEPTANCE_SCOPE_INVALID/,'bad owner acceptance '+i);
 }
 const signed=clone(x.receipt);signed.statement.publicCatalogSha256='f'.repeat(64);
 await assert.rejects(()=>verifyClbOwnerContentReceipt(x.app,x.control,signed,{cryptoImpl:webcrypto}),/CLB_E9_/);
 await assert.rejects(()=>checkedConversationLabTarget(x.app,{
  studioOrigin:'https://daniel22-dev.github.io',
  fetchImpl:async p=>p===controlPath?{ok:true,redirected:false,json:async()=>x.control}:p===receiptPath?{ok:true,redirected:false,json:async()=>x.receipt}:{ok:false},
  cryptoImpl:webcrypto
 }),/CLB_E9_OWNER_S0_ACCEPTANCE_UNAVAILABLE/);
});
