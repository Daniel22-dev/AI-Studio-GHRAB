import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  validateClbPreliveControl,
  validateConversationLabTeacherTarget,
  checkedConversationLabTarget,
  assertClbSignedTrainingPolicy
} from '../src/integration/conversation-lab/teacher-launch.js';
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const read=async path=>JSON.parse(await readFile(root+'/'+path,'utf8'));
const sha='a'.repeat(64);
const studio='https://daniel22-dev.github.io';
const origin='https://conversation-lab-ghrab.pages.dev';
const fakeProd=prelive=>({
  ...prelive,stage:'PRODUCTION_AUTHORIZED',launchEnabled:true,
  publicOrigin:origin,releaseId:'cl-ai-b1-pilot-20261018',
  approvedDistributionManifestSha256:'93813482fabf53fe3ff5c0657b4f6b9c362f912aa496dd44c5b2c38de5ee7b4f',
  signedReleaseStatementSha256:'b'.repeat(64),
  publicStudioManifestSha256:'e139a829fadc59e1563632aae9995334c87e0b23f991dcf5e6b41dc9c1b51464',
  ownerReleaseAuthorization:'SIGNED',hostingOwnership:'VERIFIED',
  hostingHeaders:'VERIFIED',garpLive:'NOT_TESTED',
  garpFoundation:'VERIFIED_STATIC_GARP27_0_9_1',
  publicClientLive:'VERIFIED_EXACT_21_FILES',
  schoolServerLive:'DEFERRED_NOT_TESTED',
  independentSecurityApproval:'SIGNED_AND_VERIFIED',
  publicRelease:'MANUAL_RELEASE_APPROVED',approvedLessons:1,approvedCzechGlosses:37
});
const fakeApp=prod=>({
  id:'conversation-lab',
  version:'0.9.1',
  integration:{
    launchMode:'external-protected',
    securityBoundary:'isolated-anonymous-read-only',
    requiresHttps:true,
    contentMode:'approved-public-only',
    studioAccessIsLauncherGateOnly:true,
    teacherTrainingRequired:true,
    credentialBridgeAllowed:false,
    autoPromotionAllowed:false,
    releaseId:prod.releaseId,
    manifestSha256:prod.approvedDistributionManifestSha256,
    signedStatementSha256:null,
    externalTargetUrl:prod.publicOrigin+'/'
  }
});
test('checked-in Studio CLB launch control is PRELIVE and BLOCKS all launches',async()=>{
  const control=await read('src/integration/conversation-lab/launch-control.json');
  assert.equal(validateClbPreliveControl(control),true);
  assert.throws(()=>validateConversationLabTeacherTarget(fakeApp(control),control,{studioOrigin:studio}),/CLB_E9_RELEASE_NOT_AUTHORIZED/);
  assert.equal(control.launchEnabled,false);
  assert.equal(control.publicOrigin,null);
  const launcher=await readFile(root+'/src/app/external/launcher.js','utf8');
  assert.ok(launcher.includes('hasAppAccess(app.id)'));
  assert.ok(launcher.includes('app.id === "conversation-lab"'));
  assert.ok(launcher.includes('checkedConversationLabTarget(app, { studioOrigin: location.origin })'));
  assert.ok(launcher.indexOf('hasAppAccess(app.id)')<launcher.indexOf('checkedConversationLabTarget(app,'));
});
test('teacher entry requires Studio permit and the CLB training policy when eventually enabled',async()=>{
  const policy=await read('src/config/access-policy.json');
  // CLB-01 is now legitimately signed in PRELIVE; no Studio tile/release authorization is present.
  assert.equal(policy.applications['conversation-lab'].trainingCode,'CLB-01');
  const prelive=await read('security/garp27/conversation-lab-enrollment.json');
  assert.equal(prelive.teacherStudioGate,'NOT_CONNECTED');
  assert.equal(prelive.studioLauncher,'DISABLED');
  const registry=await read('src/config/apps.generated.json');
  assert.ok(!registry.some(x=>x.id==='conversation-lab'));
});
test('even simulated future authorized release still requires exact origin, release hashes and no Studio token bridge',async()=>{
  const future=fakeProd(await read('src/integration/conversation-lab/launch-control.json'));
  const app=fakeApp(future);
  // This is a unit contract proof only, NOT evidence of actual GARP LIVE or
  // human/rights signatures. Real records must be verified independently.
  assert.equal(validateConversationLabTeacherTarget(app,future,{studioOrigin:studio}),origin+'/');
  const bad=[
    x=>{x.app.integration.externalTargetUrl=origin+'/?permit=secret';},
    x=>{x.app.integration.externalTargetUrl=studio+'/';},
    x=>{x.app.integration.externalTargetUrl='http://clb-example.pages.dev/';},
    x=>{x.app.integration.externalTargetUrl=origin+'/#/lesson';},
    x=>{x.app.integration.credentialBridgeAllowed=true;},
    x=>{x.app.integration.releaseId='cl-other';},
    x=>{x.app.integration.manifestSha256='0'.repeat(64);},
    x=>{x.c.approvedLessons=0;},
    x=>{x.c.garpLive='VERIFIED';},
    x=>{x.c.garpFoundation='NOT_TESTED';},
    x=>{x.c.publicClientLive='NOT_TESTED';},
    x=>{x.c.schoolServerLive='VERIFIED';},
    x=>{x.c.independentSecurityApproval='NOT_GRANTED';},
    x=>{x.c.publicStudioManifestSha256='c'.repeat(64);},
    x=>{x.c.approvedDistributionManifestSha256='d'.repeat(64);},
    x=>{x.c.approvedCzechGlosses=36;},
    x=>{x.c.approvedLessons=2;},
    x=>{x.c.autoPromotion='ENABLED';},
    x=>{x.c.ownerReleaseAuthorization='NOT_GRANTED';},
    x=>{x.c.publicOrigin=studio;},
    x=>{x.c.approvedCzechGlosses=0;}
  ];
  for(const mutate of bad){
    const sample={app:structuredClone(app),c:structuredClone(future)};
    mutate(sample);
    assert.throws(()=>validateConversationLabTeacherTarget(sample.app,sample.c,{studioOrigin:studio}),/CLB_E9_/);
  }
});
test('same-origin Studio-only settings fail closed on missing or untrusted response',async()=>{
  const control=await read('src/integration/conversation-lab/launch-control.json');
  await assert.rejects(checkedConversationLabTarget(fakeApp(control),{
    studioOrigin:studio,
    fetchImpl:async()=>({ok:false,redirected:false})
  }),/CLB_E9_CONTROL_UNAVAILABLE/);
  await assert.rejects(checkedConversationLabTarget(fakeApp(control),{
    studioOrigin:studio,
    fetchImpl:async()=>({ok:true,redirected:false,json:async()=>control})
  }),/CLB_E9_RELEASE_NOT_AUTHORIZED/);
});
test('a forged PRELIVE status is never accepted',async()=>{
  const prelive=await read('src/integration/conversation-lab/launch-control.json');
  for(const mutate of [
    x=>{x.launchEnabled=true;},
    x=>{x.stage='PRODUCTION_AUTHORIZED';},
    x=>{x.garpLive='VERIFIED';},
    x=>{x.approvedLessons=6;},
    x=>{x.publicOrigin=origin;},
    x=>{x.studioCredentialBridge='ALLOWED';},
    x=>{x.autoPromotion='ENABLED';}
  ]){
    const p=structuredClone(prelive);
    mutate(p);
    assert.throws(()=>validateClbPreliveControl(p),/CLB_E9_PRELIVE_CONTROL_DRIFT/);
  }
});

test('CLB-01 requires exact training policy from verified Studio access bundle (not from unsigned local policy)',async()=>{
  const valid={
    trainingRequired:true,trainingCode:'CLB-01',trainingVersion:'2026-10',
    label:{cs:'Conversation Lab',en:'Conversation Lab'}
  };
  assert.equal(assertClbSignedTrainingPolicy(valid),true);
  assert.throws(()=>assertClbSignedTrainingPolicy(null),/CLB_E9_SIGNED_TRAINING_POLICY_REQUIRED/);
  assert.throws(()=>assertClbSignedTrainingPolicy(undefined),/CLB_E9_SIGNED_TRAINING_POLICY_REQUIRED/);
  for(const mutate of [
    x => { delete x.trainingRequired; },
    x => { x.trainingRequired=false; },
    x => { x.trainingCode='GEN-01'; },
    x => { x.trainingCode='CLB-1'; },
    x => { x.trainingVersion='2026-09'; },
    x => { x.label.cs='Conversation LAB (fake)'; },
    x => { x.label.en='Another app'; }
  ]){
    const entry=structuredClone(valid);
    mutate(entry);
    assert.throws(()=>assertClbSignedTrainingPolicy(entry),/CLB_E9_SIGNED_TRAINING_POLICY_REQUIRED/);
  }
  const launcher=await readFile(root+'/src/app/external/launcher.js','utf8');
  assert.match(launcher,/requiredTraining\(app\.id\)/);
  assert.match(launcher,/assertClbSignedTrainingPolicy\(requiredTraining\(app\.id\)\)/);
  assert.ok(launcher.indexOf('assertClbSignedTrainingPolicy(requiredTraining(app.id))')<launcher.indexOf('hasAppAccess(app.id)'));
  const bundle=await read('src/config/access-config-bundle.json');
  assert.equal(bundle.policy.applications['conversation-lab'].trainingCode,'CLB-01','signed CLB-01 PRELIVE exists without production tile');
  const control=await read('src/integration/conversation-lab/launch-control.json');
  assert.equal(control.launchEnabled,false);
});
