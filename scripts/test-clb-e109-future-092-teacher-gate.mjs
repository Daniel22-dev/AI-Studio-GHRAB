import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,webcrypto} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {
  assertClbSignedTrainingPolicy,validateClbPreliveControl,
  validateConversationLabTeacherTarget,verifyClbOwnerContentReceipt,checkedConversationLabTarget
} from '../src/integration/conversation-lab/teacher-launch.js';
const j=async p=>JSON.parse(await readFile(new URL('../'+p,import.meta.url),'utf8'));
const origin='https://conversation-lab-ghrab.pages.dev';
const studio='https://daniel22-dev.github.io';
const receiptPath='../../integration/conversation-lab/owner-content-release.v0.9.2.signed.json';
const controlPath='../../integration/conversation-lab/launch-control.json';
const digest='6f0588801d7ec4bc5b3314a4e351603cd6993890ef56b2a636ee497d0b3848c5';
const catalogSha='2ab4cab8e95a8c124f1f8670b1cfe861f3e7557dfe9ece89c768bb2d7121fce6';
const manifestSha='c071bc4af56367458fb4e391019d3476790111f31495718e737bc339ee5cd134';
const clone=v=>structuredClone(v);
async function fixture(){
  const [receipt,app,held]=await Promise.all([
    j('src/integration/conversation-lab/owner-content-release.v0.9.2.signed.json'),
    j('src/integration/conversation-lab/studio-manifest.v0.9.2.proposed.json'),
    j('src/integration/conversation-lab/launch-control.json')
  ]);
  // FUTURE-PRODUCTION-SIMULATION ONLY. NEVER WRITE THIS CONTROL FILE TO GITHUB.
  // These flags model evidence that is NOT yet present; they are test fixtures,
  // not independent security attestations or authorization for a deployment.
  const simulated={...held,
    stage:'PRODUCTION_AUTHORIZED',launchEnabled:true,publicOrigin:origin,
    releaseId:receipt.statement.releaseId,
    approvedDistributionManifestSha256:catalogSha,
    publicStudioManifestSha256:manifestSha,
    signedReleaseStatementSha256:digest,
    ownerReleaseAuthorization:'SIGNED',
    hostingOwnership:'VERIFIED',hostingHeaders:'VERIFIED',garpLive:'NOT_TESTED',
    garpFoundation:'VERIFIED_STATIC_GARP27_0_9_2',
    publicClientLive:'VERIFIED_EXACT_21_FILES',schoolServerLive:'DEFERRED_NOT_TESTED',
    independentSecurityApproval:'SIGNED_AND_VERIFIED',publicRelease:'MANUAL_RELEASE_APPROVED',
    approvedLessons:1,approvedCzechGlosses:37
  };
  return {receipt,app,held,simulated};
}

test('E109 future isolated 0.9.2 route accepts only exact signed B1 receipt with Studio browser WebCrypto after ALL simulated mandatory gates',async()=>{
  const {receipt,app,simulated}=await fixture();
  assert.equal(app.version,'0.9.2');
  assert.equal(app.integration.releaseId,receipt.statement.releaseId);
  assert.equal(app.integration.manifestSha256,catalogSha);
  assert.equal(app.integration.signedStatementSha256,null);
  assertClbSignedTrainingPolicy({trainingRequired:true,trainingCode:'CLB-01',trainingVersion:'2026-10',label:{cs:'Conversation Lab',en:'Conversation Lab'}});
  assert.equal(validateConversationLabTeacherTarget(app,simulated,{studioOrigin:studio}),origin+'/');
  assert.equal(await verifyClbOwnerContentReceipt(app,simulated,receipt,{cryptoImpl:webcrypto}),true);
  const paths=[];
  const fetcher=async p=>{
    paths.push(p);
    if(p===controlPath)return {ok:true,redirected:false,json:async()=>simulated};
    if(p===receiptPath)return {ok:true,redirected:false,json:async()=>receipt};
    throw Error('E109_UNEXPECTED_REQUEST');
  };
  assert.equal(await checkedConversationLabTarget(app,{studioOrigin:studio,fetchImpl:fetcher,cryptoImpl:webcrypto}),origin+'/');
  assert.deepEqual(paths,[controlPath,receiptPath],'same-origin signed v0.9.2 receipt must be read AFTER release control');
});

test('E109 real checked-in release remains PRELIVE_HOLD: signed v0.9.2 cannot make public/teacher production active',async()=>{
  const {app,held}=await fixture();
  assert.equal(validateClbPreliveControl(held),true);
  assert.equal(held.stage,'PRELIVE_HOLD');
  assert.equal(held.launchEnabled,false);
  assert.equal(held.releaseId,null);
  const requests=[];
  const fetcher=async p=>{requests.push(p);return {ok:true,redirected:false,json:async()=>held};};
  await assert.rejects(()=>checkedConversationLabTarget(app,{studioOrigin:studio,fetchImpl:fetcher,cryptoImpl:webcrypto}),/CLB_E9_RELEASE_NOT_AUTHORIZED/);
  assert.deepEqual(requests,[controlPath],'no owner receipt fetch is allowed before all real gates');
  const [apps,sources,promotion,liveManifest]=await Promise.all([
    j('src/config/apps.generated.json'),j('src/config/sources.json'),
    j('src/config/release-promotion-policy.json'),
    j('src/integration/conversation-lab/studio-manifest.proposed.json')
  ]);
  assert.equal(apps.some(x=>x.id==='conversation-lab'),false);
  assert.equal(sources.some(x=>x.id==='conversation-lab'),false);
  assert.equal(promotion.applications.some(x=>x.id==='conversation-lab'),false);
  assert.equal(liveManifest.version,'0.9.1','the old baseline is untouched');
  assert.equal(liveManifest.integration.releaseId,'cl-ai-b1-pilot-20261018');
});

test('E109 exact staged public v0.9.2 Studio manifest is BYTE-IDENTICAL to owner-signed ZIP manifest',async()=>{
  const bytes=await readFile(new URL('../src/integration/conversation-lab/studio-manifest.v0.9.2.proposed.json',import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),manifestSha);
});

test('E109 negative gates: forged future-release approval, version/host/hash substitution and self-reported signatures fail closed',async()=>{
  const {receipt,app,simulated}=await fixture();
  const rejects=[
    ['independentSecurityApproval',c=>{c.independentSecurityApproval='NOT_GRANTED'}],
    ['GARP foundation',c=>{c.garpFoundation='VERIFIED_STATIC_GARP27_0_9_1'}],
    ['fake school server LIVE',c=>{c.schoolServerLive='VERIFIED'}],
    ['catalog digest',c=>{c.approvedDistributionManifestSha256='0'.repeat(64)}],
    ['manifest digest',c=>{c.publicStudioManifestSha256='0'.repeat(64)}],
    ['hosting headers',c=>{c.hostingHeaders='NOT_VERIFIED'}],
    ['owner authorization',c=>{c.ownerReleaseAuthorization='NOT_GRANTED'}],
    ['public LIVE',c=>{c.publicClientLive='NOT_TESTED'}],
    ['public release',c=>{c.publicRelease='NO_GO'}],
    ['training version',c=>{c.requiredTrainingVersion='2026-11'}],
    ['credential bridge',c=>{c.studioCredentialBridge='ALLOWED'}],
    ['token promotion',c=>{c.autoPromotion='ENABLED'}],
    ['new releaseId',c=>{c.releaseId='cl-ai-b1-pilot-20261018-r3'}],
    ['wrong origin',c=>{c.publicOrigin='https://evil.example'}]
  ];
  for(const [name,mutate] of rejects){
    const changed=clone(simulated);mutate(changed);
    assert.throws(()=>validateConversationLabTeacherTarget(app,changed,{studioOrigin:studio}),/CLB_E9_/,'control tamper '+name);
  }
  // The raw 64-hex owner digest passes syntax validation but MUST be rejected
  // at the cryptographic receipt-binding boundary, not by URL control parsing.
  const wrongOwnerSha=clone(simulated);
  wrongOwnerSha.signedReleaseStatementSha256='0'.repeat(64);
  assert.equal(validateConversationLabTeacherTarget(app,wrongOwnerSha,{studioOrigin:studio}),origin+'/');
  await assert.rejects(
    ()=>verifyClbOwnerContentReceipt(app,wrongOwnerSha,receipt,{cryptoImpl:webcrypto}),
    /CLB_E9_OWNER_CONTENT_BINDING_MISMATCH/
  );
  const corrupt=[
    r=>{r.signature.signature='0'.repeat(86)},
    r=>{r.verifyKey.publicKey.x='0'.repeat(43)},
    r=>{r.signature.keyId='self-issued'},
    r=>{r.statement.publicStaticZipSha256='0'.repeat(64)},
    r=>{r.statement.approvedLessonCount=2},
    r=>{r.statement.independentSecurityApproval='GRANTED'},
    r=>{r.statement.ownerAuthorisesProtectedTeacherStudioConnection=false},
    r=>{r.statementSha256='0'.repeat(64)}
  ];
  for(const [i,change] of corrupt.entries()){
    const changed=clone(receipt);change(changed);
    await assert.rejects(()=>verifyClbOwnerContentReceipt(app,simulated,changed,{cryptoImpl:webcrypto}),/CLB_E9_/,'owner content mutation '+i);
  }
  await assert.rejects(()=>verifyClbOwnerContentReceipt(app,simulated,receipt,{cryptoImpl:null}),/CLB_E9_CONTENT_CRYPTO_UNAVAILABLE/);
  const wrong=clone(app);wrong.version='0.9.3';
  assert.throws(()=>validateConversationLabTeacherTarget(wrong,simulated,{studioOrigin:studio}),/CLB_E9_PILOT_SCOPE_MISMATCH/);
  const badPermit={trainingRequired:false,trainingCode:'CLB-01',trainingVersion:'2026-10',label:{cs:'Conversation Lab',en:'Conversation Lab'}};
  assert.throws(()=>assertClbSignedTrainingPolicy(badPermit),/CLB_E9_SIGNED_TRAINING_POLICY_REQUIRED/);
});
