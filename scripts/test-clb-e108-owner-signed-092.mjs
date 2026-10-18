import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash,createPublicKey,verify,webcrypto,generateKeyPairSync} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {verifyClbOwnerContentReceipt,validateClbPreliveControl} from '../src/integration/conversation-lab/teacher-launch.js';

const read=async p=>readFile(new URL('../'+p,import.meta.url));
const json=async p=>JSON.parse(await read(p));
const canonical=v=>Array.isArray(v)?'['+v.map(canonical).join(',')+']':v&&typeof v==='object'?
  '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}':JSON.stringify(v);
const sha=v=>createHash('sha256').update(v).digest('hex');
const signed='src/integration/conversation-lab/owner-content-release.v0.9.2.signed.json';
const original='src/integration/conversation-lab/owner-content-release.signed.json';
const digest='6f0588801d7ec4bc5b3314a4e351603cd6993890ef56b2a636ee497d0b3848c5';
const statementSha='aaa8bfa8bef547290de6cd552cbfb1e22d7d49478644899729bb7b382aeabdc5';
const zipSha='eeca610e36ea3f11366297728af39510ee9541f8960de72c444ea6683a8f84c0';
const manifestSha='c071bc4af56367458fb4e391019d3476790111f31495718e737bc339ee5cd134';
const catalogSha='2ab4cab8e95a8c124f1f8670b1cfe861f3e7557dfe9ece89c768bb2d7121fce6';
const domain='GHRAB-CLB-OWNER-CONTENT-RELEASE-v1\n';

test('E108 actual owner ES256 v0.9.2 public handoff verified by Studio PINNED key and original signed bytes',async()=>{
  const [bytes,r,trust,old]=await Promise.all([read(signed),json(signed),json('src/config/access-config-verify-key.json'),json(original)]);
  assert.equal(sha(bytes),statementSha,'signed JSON was reserialized, truncated, or replaced');
  assert.deepEqual(Object.keys(r).sort(),Object.keys(old).sort());
  assert.deepEqual(Object.keys(r.statement).sort(),Object.keys(old.statement).sort());
  assert.equal(r.schema,old.schema);
  assert.equal(r.purpose,'OWNER_CONTENT_RELEASE_ONLY_NOT_INDEPENDENT_SECURITY_GO');
  assert.equal(r.publicOnly,true);
  assert.equal(r.secretIncluded,false);
  assert.equal(r.studioReleaseGo,false);
  assert.equal(r.signingDomain,domain);
  assert.equal(r.signature.algorithm,'ES256');
  assert.equal(r.signature.keyId,trust.keyId);
  assert.equal(r.verifyKey.keyId,trust.keyId);
  for(const field of ['kty','crv','x','y'])assert.equal(r.verifyKey.publicKey[field],trust.publicKey[field]);
  const message=Buffer.from(r.signingDomain+canonical(r.statement),'utf8');
  assert.equal(sha(message),digest);
  assert.equal(r.statementSha256,digest);
  const sig=Buffer.from(r.signature.signature,'base64url');
  assert.equal(sig.length,64);
  const anchored=createPublicKey({key:trust.publicKey,format:'jwk'});
  assert.equal(verify('sha256',message,{key:anchored,dsaEncoding:'ieee-p1363'},sig),true);
  const wrong=generateKeyPairSync('ec',{namedCurve:'prime256v1'}).publicKey;
  assert.equal(verify('sha256',message,{key:wrong,dsaEncoding:'ieee-p1363'},sig),false);
  const mutations=[
    s=>{s.appVersion='0.9.1'},
    s=>{s.releaseId='cl-ai-b1-pilot-20261018'},
    s=>{s.contextualOfflineCzechGlosses=38},
    s=>{s.approvedLessonCount=2},
    s=>{s.publicStaticZipSha256='0'.repeat(64)},
    s=>{s.publicStudioManifestSha256='0'.repeat(64)},
    s=>{s.publicCatalogSha256='0'.repeat(64)},
    s=>{s.teacherPermitAndTrainingCode='NONE'},
    s=>{s.ownerAuthorisesProtectedTeacherStudioConnection=false},
    s=>{s.independentSecurityApproval='GRANTED'},
    s=>{s.studioProductionPromotion='GO'},
    s=>{s.signedAt='2026-10-18T14:37:13.631Z'}
  ];
  for(const [i,mutate] of mutations.entries()){
    const altered=structuredClone(r.statement);mutate(altered);
    const alteredBytes=Buffer.from(domain+canonical(altered),'utf8');
    assert.notEqual(sha(alteredBytes),digest,'negative '+i+' SHA must drift');
    assert.equal(verify('sha256',alteredBytes,{key:anchored,dsaEncoding:'ieee-p1363'},sig),false,'negative mutation '+i);
  }
  const serialized=JSON.stringify(r);
  assert.equal(serialized.includes('"privateJwk"'),false);
  assert.equal(serialized.includes('"d"'),false);
  assert.equal(old.statementSha256,'77549c561032c35e6c78bb52885ddcc0022d64a7115bb230c8997286e61e8d0a','v0.9.1 prelive receipt remains intact');
});

test('E108 exact 0.9.2 signature scope pins 21-file ZIP/manifest/catalog and ONLY one B1 lesson',async()=>{
  const {statement:s}=await json(signed);
  assert.equal(s.schema,'ghrab-clb-owner-content-release-statement-v1');
  assert.equal(s.appId,'conversation-lab');
  assert.equal(s.appVersion,'0.9.2');
  assert.equal(s.releaseId,'cl-ai-b1-pilot-20261018-r2');
  assert.equal(s.publicOrigin,'https://conversation-lab-ghrab.pages.dev');
  assert.equal(s.publicStaticZipSha256,zipSha);
  assert.equal(s.publicStudioManifestSha256,manifestSha);
  assert.equal(s.publicCatalogSha256,catalogSha);
  assert.equal(s.publicLessonSha256,'4a163857dc2b90e3b9a3a60e8e4440f7c45c2a1f2530f970a99543925fe390b9');
  assert.equal(s.publicAppJsSha256,'dabcaced97ca6ec21890a43eb43cf5da3600d106d0164fd5de570ebc7855c03a');
  assert.deepEqual(s.approvedLessonIds,['artificial-intelligence/en/B1']);
  assert.equal(s.approvedLessonCount,1);
  assert.equal(s.contextualOfflineCzechGlosses,37);
  assert.equal(s.ownerPedagogicalApproval,true);
  assert.equal(s.ownerPublicationRightsSelfAttested,true);
  assert.equal(s.ownerAuthorisesPublicPilot,true);
  assert.equal(s.ownerAuthorisesProtectedTeacherStudioConnection,true);
  assert.equal(s.teacherPermitAndTrainingCode,'CLB-01');
  assert.equal(s.studentAccess,'ANONYMOUS_READ_ONLY');
  assert.equal(s.studioCredentialBridge,'FORBIDDEN');
  assert.equal(s.independentSecurityApproval,'NOT_GRANTED');
  assert.equal(s.garp27SchoolRuntimeLive,'NOT_TESTED_DEFERRED');
  assert.equal(s.studioReleaseP5,'PENDING');
  assert.equal(s.studioProductionPromotion,'NO_GO_UNTIL_SEPARATE_GATES');
  assert.equal(s.signedAt,'2026-10-18T14:37:13.630Z');
});

test('E108 valid owner content signature must not override PRELIVE_HOLD or authenticate future 0.9.2 teacher launches',async()=>{
  const [r,control,apps,promotion]=await Promise.all([
    json(signed),
    json('src/integration/conversation-lab/launch-control.json'),
    json('src/config/apps.generated.json'),
    json('src/config/release-promotion-policy.json')
  ]);
  assert.equal(validateClbPreliveControl(control),true);
  assert.equal(control.launchEnabled,false);
  assert.equal(control.stage,'PRELIVE_HOLD');
  assert.equal(control.signedReleaseStatementSha256,null);
  assert.equal(control.independentSecurityApproval,undefined);
  assert.equal(control.publicRelease,'NO_GO');
  assert.equal(promotion.applications.some(x=>x.id==='conversation-lab'),false);
  assert.equal(apps.some(x=>x.id==='conversation-lab'),false,'separate owner receipt MUST NOT auto-register an unpublished app');
  const app=await json('src/integration/conversation-lab/studio-manifest.proposed.json');
  assert.equal(app.version,'0.9.1','existing baseline manifest stays unchanged');
  const attempted={...app,version:'0.9.2',integration:{
    ...app.integration,
    releaseId:r.statement.releaseId,
    manifestSha256:r.statement.publicCatalogSha256
  }};
  await assert.rejects(
    ()=>verifyClbOwnerContentReceipt(attempted,control,r,{cryptoImpl:webcrypto}),
    /CLB_E9_OWNER_CONTENT_BINDING_MISMATCH/,
    'new source-level 0.9.2 support still requires exact signed runtime control and real security/P5 authority'
  );
});
