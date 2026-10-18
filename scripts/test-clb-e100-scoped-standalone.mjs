import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateConversationLabTeacherTarget,validateClbPreliveControl} from '../src/integration/conversation-lab/teacher-launch.js';
const json=async path=>JSON.parse(await readFile(new URL('../'+path,import.meta.url),'utf8'));
test('Static standalone GARP 2.7 may be verified without falsely claiming school-server LIVE',async()=>{
 const [control,owner,policy,live]=await Promise.all([
   json('src/integration/conversation-lab/launch-control.json'),
   json('src/integration/conversation-lab/owner-connection-consent.json'),
   json('security/garp27/apps/conversation-lab/garp-policy.json'),
   json('security/garp27/live-status.json')
 ]);
 assert.equal(validateClbPreliveControl(control),true);
 assert.equal(control.launchEnabled,false);
 assert.equal(control.garpLive,'NOT_TESTED');
 assert.equal(live.overall,'NOT_TESTED');
 assert.equal(policy.appVersion,'0.9.1');
 assert.equal(owner.consent,'GRANTED');
 const future={
  ...control,stage:'PRODUCTION_AUTHORIZED',launchEnabled:true,
  publicOrigin:'https://conversation-lab-ghrab.pages.dev',
  releaseId:'cl-ai-b1-pilot-20261018',
  approvedDistributionManifestSha256:'93813482fabf53fe3ff5c0657b4f6b9c362f912aa496dd44c5b2c38de5ee7b4f',
  signedReleaseStatementSha256:'c'.repeat(64),
  publicStudioManifestSha256:'e139a829fadc59e1563632aae9995334c87e0b23f991dcf5e6b41dc9c1b51464',
  ownerReleaseAuthorization:'SIGNED',
  hostingOwnership:'VERIFIED',hostingHeaders:'VERIFIED',
  garpLive:'NOT_TESTED',schoolServerLive:'DEFERRED_NOT_TESTED',
  garpFoundation:'VERIFIED_STATIC_GARP27_0_9_1',
  publicClientLive:'VERIFIED_EXACT_21_FILES',
  independentSecurityApproval:'SIGNED_AND_VERIFIED',
  publicRelease:'MANUAL_RELEASE_APPROVED',approvedLessons:1,approvedCzechGlosses:37
 };
 const app={
  id:'conversation-lab',version:'0.9.1',
  integration:{launchMode:'external-protected',securityBoundary:'isolated-anonymous-read-only',
   requiresHttps:true,contentMode:'approved-public-only',studioAccessIsLauncherGateOnly:true,
   teacherTrainingRequired:true,credentialBridgeAllowed:false,autoPromotionAllowed:false,
   releaseId:future.releaseId,manifestSha256:future.approvedDistributionManifestSha256,
   signedStatementSha256:null,externalTargetUrl:'https://conversation-lab-ghrab.pages.dev/'}
 };
 assert.equal(validateConversationLabTeacherTarget(app,future,{studioOrigin:'https://daniel22-dev.github.io'}),'https://conversation-lab-ghrab.pages.dev/');
 for(const mutation of [
  x=>x.schoolServerLive='VERIFIED',
  x=>x.garpLive='VERIFIED',
  x=>x.garpFoundation='NOT_TESTED',
  x=>x.publicClientLive='NOT_TESTED',
  x=>x.independentSecurityApproval='NOT_GRANTED',
  x=>x.publicStudioManifestSha256='e'.repeat(64),
  x=>x.ownerReleaseAuthorization='NOT_GRANTED',
  x=>x.signedReleaseStatementSha256=null,
  x=>x.approvedLessons=2,
  x=>x.approvedCzechGlosses=36
 ]){
  const corrupted=structuredClone(future);mutation(corrupted);
  assert.throws(()=>validateConversationLabTeacherTarget(app,corrupted,{studioOrigin:'https://daniel22-dev.github.io'}),/CLB_E9_/);
 }
 const unreviewed=structuredClone(app);
 unreviewed.integration.signedStatementSha256=future.signedReleaseStatementSha256;
 assert.throws(()=>validateConversationLabTeacherTarget(unreviewed,future,{studioOrigin:'https://daniel22-dev.github.io'}),/MANIFEST_RELEASE_BINDING/);
});
