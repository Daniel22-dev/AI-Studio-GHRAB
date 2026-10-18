import {test} from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {verifyClbOwnerContentReceipt,checkedConversationLabTarget} from '../src/integration/conversation-lab/teacher-launch.js';
const json=async p=>JSON.parse(await readFile(new URL('../'+p,import.meta.url),'utf8'));
const clone=v=>structuredClone(v);
const digest='77549c561032c35e6c78bb52885ddcc0022d64a7115bb230c8997286e61e8d0a';
const publicOrigin='https://conversation-lab-ghrab.pages.dev';
async function fixtures(){
 const [saved,control]=await Promise.all([
  json('src/integration/conversation-lab/owner-content-release.signed.json'),
  json('src/integration/conversation-lab/launch-control.json')
 ]);
 const prod={...control,stage:'PRODUCTION_AUTHORIZED',launchEnabled:true,publicOrigin,
   releaseId:'cl-ai-b1-pilot-20261018',
   approvedDistributionManifestSha256:'93813482fabf53fe3ff5c0657b4f6b9c362f912aa496dd44c5b2c38de5ee7b4f',
   publicStudioManifestSha256:'e139a829fadc59e1563632aae9995334c87e0b23f991dcf5e6b41dc9c1b51464',
   signedReleaseStatementSha256:digest,
   ownerReleaseAuthorization:'SIGNED',hostingOwnership:'VERIFIED',hostingHeaders:'VERIFIED',
   garpLive:'NOT_TESTED',garpFoundation:'VERIFIED_STATIC_GARP27_0_9_1',
   publicClientLive:'VERIFIED_EXACT_21_FILES',schoolServerLive:'DEFERRED_NOT_TESTED',
   independentSecurityApproval:'SIGNED_AND_VERIFIED',
   publicRelease:'MANUAL_RELEASE_APPROVED',approvedLessons:1,approvedCzechGlosses:37
 };
 const app={
  id:'conversation-lab',version:'0.9.1',
  integration:{
   launchMode:'external-protected',securityBoundary:'isolated-anonymous-read-only',
   requiresHttps:true,contentMode:'approved-public-only',
   studioAccessIsLauncherGateOnly:true,teacherTrainingRequired:true,
   credentialBridgeAllowed:false,autoPromotionAllowed:false,
   releaseId:prod.releaseId,manifestSha256:prod.approvedDistributionManifestSha256,
   signedStatementSha256:null,externalTargetUrl:publicOrigin+'/'
  }
 };
 return {saved,prod,app};
}
test('E102 browser WebCrypto verifies the actual owner signed content with static Studio trust anchor',async()=>{
 const {saved,prod,app}=await fixtures();
 assert.equal(await verifyClbOwnerContentReceipt(app,prod,saved,{cryptoImpl:webcrypto}),true);
});
test('E102 cryptographic key, signed content digest, owner consent and all B1 metadata are fail-closed',async()=>{
 const {saved,prod,app}=await fixtures();
 const corrupt=[
  r=>{r.verifyKey.publicKey.x='0'.repeat(43);},
  r=>{r.verifyKey.keyId='attacker-key';},
  r=>{r.signature.keyId='attacker-key';},
  r=>{r.signature.signature='0'.repeat(86);},
  r=>{r.statement.signedAt='2026-10-18T11:45:57.051Z';},
  r=>{r.statement.contextualOfflineCzechGlosses=38;},
  r=>{r.statement.ownerAuthorisesProtectedTeacherStudioConnection=false;},
  r=>{r.statement.studioProductionPromotion='GO';},
  r=>{r.statement.independentSecurityApproval='GRANTED';},
  r=>{r.statement.teacherPermitAndTrainingCode='OTHER';},
  r=>{r.statement.publicLessonSha256='0'.repeat(64);},
  r=>{r.statement.publicStudioManifestSha256='0'.repeat(64);},
  r=>{r.statement.exportExtra='unapproved';},
  r=>{r.statementSha256='1'.repeat(64);},
  r=>{r.studioReleaseGo=true;},
  r=>{r.signingDomain='UNTRUSTED\n';}
 ];
 for(const [i,mutate] of corrupt.entries()){
  const r=clone(saved);mutate(r);
  await assert.rejects(()=>verifyClbOwnerContentReceipt(app,prod,r,{cryptoImpl:webcrypto}),/CLB_E9_/,'negative mutation '+i);
 }
 const wrong=clone(prod);wrong.signedReleaseStatementSha256='0'.repeat(64);
 await assert.rejects(()=>verifyClbOwnerContentReceipt(app,wrong,saved,{cryptoImpl:webcrypto}),/CONTENT_BINDING_MISMATCH/);
 await assert.rejects(()=>verifyClbOwnerContentReceipt(app,prod,saved,{cryptoImpl:null}),/CONTENT_CRYPTO_UNAVAILABLE/);
});
test('E102 protected teacher redirect reads same-origin owner receipt ONLY after all existing release gates',async()=>{
 const {saved,prod,app}=await fixtures();
 const calls=[];
 const fetcher=async uri=>{
  calls.push(uri);
  if(uri==='../../integration/conversation-lab/launch-control.json')return {ok:true,redirected:false,json:async()=>prod};
  if(uri==='../../integration/conversation-lab/owner-content-release.signed.json')return {ok:true,redirected:false,json:async()=>saved};
  throw Error('UNEXPECTED_EXTERNAL_FETCH');
 };
 assert.equal(await checkedConversationLabTarget(app,{studioOrigin:'https://daniel22-dev.github.io',fetchImpl:fetcher,cryptoImpl:webcrypto}),publicOrigin+'/');
 assert.deepEqual(calls,[
  '../../integration/conversation-lab/launch-control.json',
  '../../integration/conversation-lab/owner-content-release.signed.json'
 ]);
 const held=await json('src/integration/conversation-lab/launch-control.json');
 const heldCalls=[];
 const heldFetch=async uri=>{heldCalls.push(uri);return {ok:true,redirected:false,json:async()=>held};};
 await assert.rejects(()=>checkedConversationLabTarget(app,{studioOrigin:'https://daniel22-dev.github.io',fetchImpl:heldFetch,cryptoImpl:webcrypto}),/CLB_E9_RELEASE_NOT_AUTHORIZED/);
 assert.deepEqual(heldCalls,['../../integration/conversation-lab/launch-control.json'],'the signed owner receipt cannot override PRELIVE_HOLD');
 const brokenFetch=async uri=>uri.includes('launch-control')?{ok:true,redirected:false,json:async()=>prod}:{ok:false,redirected:false};
 await assert.rejects(()=>checkedConversationLabTarget(app,{studioOrigin:'https://daniel22-dev.github.io',fetchImpl:brokenFetch,cryptoImpl:webcrypto}),/CLB_E9_OWNER_CONTENT_UNAVAILABLE/);
});
