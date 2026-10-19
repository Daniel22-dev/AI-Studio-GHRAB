import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {webcrypto} from 'node:crypto';
import originalProfile from '../src/conversation-lab/release-profile.js';
import {verifyClbMasterOwnerContentReceipt,checkedConversationLabMasterTarget} from '../src/integration/conversation-lab/teacher-launch.js';
const load=async p=>JSON.parse(await readFile(new URL('../'+p,import.meta.url),'utf8'));
const receipt=await load('src/integration/conversation-lab/owner-content-release.v0.11.0.signed.json');
const signedProfile={...originalProfile,signedReleaseStatementSha256:receipt.statementSha256};
const clone=x=>structuredClone(x);

test('Actual owner-supplied 72-variant V2 receipt verifies against the unchanged independently pinned Studio key',async()=>{
 assert.equal(receipt.statementSha256,'7a5d3f31f0ebd146fc3c154f4ba16ddb26cbfa14b06313645ac8be54853f3d79');
 assert.equal(await verifyClbMasterOwnerContentReceipt(receipt,signedProfile,{cryptoImpl:webcrypto}),true);
 assert.equal(receipt.statement.approvedLessonCount,72);
 assert.equal(receipt.statement.approvedQrVectorCount,576);
 assert.equal(receipt.statement.contextualOfflineCzechGlosses,0);
 assert.equal(receipt.statement.independentSecurityApproval,'NOT_GRANTED');
 assert.equal(receipt.studioReleaseGo,false);
});

test('Every source asset pin is bound to the actual signature',async()=>{
 for(const field of ['publicStaticZipSha256','publicStudioManifestSha256','publicCatalogSha256','publicAppJsSha256','publicQrIndexSha256','publicGlossaryIndexSha256']){
  const changed={...signedProfile,[field]:'f'.repeat(64)};
  await assert.rejects(()=>verifyClbMasterOwnerContentReceipt(receipt,changed,{cryptoImpl:webcrypto}),/MASTER_OWNER_CONTENT_BINDING_MISMATCH/);
 }
});

test('The original signature must never be presented as a signature over the configuration-repaired transport ZIP',async()=>{
 const newTransport={...signedProfile,publicStaticZipSha256:'6ad3894c2943e76b7ad954ae277e71dd10d528b2f8fdd707793f2dfa3fbc0f74'};
 await assert.rejects(()=>verifyClbMasterOwnerContentReceipt(receipt,newTransport,{cryptoImpl:webcrypto}),/MASTER_OWNER_CONTENT_BINDING_MISMATCH/);
});

test('Corrupt signature and self-supplied trust fail actual crypto checks',async()=>{
 const corrupt=clone(receipt);corrupt.signature.signature='A'.repeat(86);
 await assert.rejects(()=>verifyClbMasterOwnerContentReceipt(corrupt,signedProfile,{cryptoImpl:webcrypto}),/MASTER_OWNER_CONTENT_SIGNATURE_INVALID/);
 const forged=clone(receipt);forged.verifyKey.publicKey.x='A'.repeat(43);
 await assert.rejects(()=>verifyClbMasterOwnerContentReceipt(forged,signedProfile,{cryptoImpl:webcrypto}),/MASTER_OWNER_CONTENT_TRUST_MISMATCH/);
});

test('Unsigned timestamp or content changes cannot piggyback on the received signature',async()=>{
 const changed=clone(receipt);changed.statement.signedAt='2026-10-19T16:59:58.560Z';
 await assert.rejects(()=>verifyClbMasterOwnerContentReceipt(changed,signedProfile,{cryptoImpl:webcrypto}),/MASTER_OWNER_CONTENT_HASH_INVALID/);
 const scope=clone(receipt);scope.statement.approvedLessonCount=73;
 await assert.rejects(()=>verifyClbMasterOwnerContentReceipt(scope,signedProfile,{cryptoImpl:webcrypto}),/MASTER_OWNER_CONTENT_SCOPE_MISMATCH/);
});

test('Received content approval cannot bypass an explicit rollback HOLD or fetch runtime',async()=>{
 const control={...await load('src/integration/conversation-lab/launch-control.v0.11.0.json'),stage:'PRELIVE_HOLD',launchEnabled:false};
 assert.equal(control.stage,'PRELIVE_HOLD');assert.equal(control.launchEnabled,false);
 const app={id:'conversation-lab',version:'0.11.0',integration:{launchMode:'studio-teacher',securityBoundary:'isolated-anonymous-read-only',requiresHttps:true,contentMode:'approved-public-only',teacherTrainingRequired:true,credentialBridgeAllowed:false,autoPromotionAllowed:false,releaseId:signedProfile.releaseId,manifestSha256:signedProfile.publicCatalogSha256,signedStatementSha256:receipt.statementSha256,externalTargetUrl:signedProfile.publicOrigin+'/'}};
 const calls=[];
 await assert.rejects(()=>checkedConversationLabMasterTarget(app,{studioOrigin:'https://daniel22-dev.github.io',releaseProfile:signedProfile,cryptoImpl:webcrypto,fetchImpl:async url=>{calls.push(url);return {ok:true,redirected:false,json:async()=>control};}}),/MASTER_RELEASE_NOT_AUTHORIZED/);
 assert.equal(calls.length,1);assert.ok(calls[0].endsWith('/launch-control.v0.11.0.json'));
});
