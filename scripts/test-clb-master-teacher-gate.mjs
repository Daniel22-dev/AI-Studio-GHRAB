import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash,webcrypto} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {
  clbIntegrationResourceUrl,assertClbSignedTrainingPolicy,
  validateClbMasterReleaseProfile,verifyClbMasterOwnerContentReceipt,
  validateClbMasterTeacherTarget,assertClbMasterOwnerAcceptance,
  checkedConversationLabMasterTarget,checkedConversationLabTarget,
  verifyClbOwnerContentReceipt
} from '../src/integration/conversation-lab/teacher-launch.js';
import {verifySignedBundle} from '../src/tools/security-center/security-center-core.js';

const root=new URL('../',import.meta.url);
const read=async path=>JSON.parse(await readFile(new URL(path,root),'utf8'));
const studio='https://daniel22-dev.github.io';
const origin='https://conversation-lab-ghrab.pages.dev';
const prefix='src/integration/conversation-lab/';
const canonical=value=>Array.isArray(value)?'['+value.map(canonical).join(',')+']':
  value!==null&&typeof value==='object'?'{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonical(value[key])).join(',')+'}':JSON.stringify(value);
const paths={
  control:new URL(prefix+'launch-control.v0.11.0.json',root).href,
  receipt:new URL(prefix+'owner-content-release.v0.11.0.signed.json',root).href,
  acceptance:new URL(prefix+'governance/project-owner-release.v0.11.0.json',root).href
};

// Explicitly synthetic metadata. There is no owner-signed 0.11.0 receipt here.
async function syntheticFixture() {
  const trust=await read('src/config/access-config-verify-key.json');
  const topics=['artificial-intelligence','the-pressure-to-succeed','summer-holidays'];
  const profile={
    schema:'ghrab-clb-master-release-profile-v1',appId:'conversation-lab',
    appVersion:'0.11.0',releaseId:'cl-master-72-20261019-r1',publicOrigin:origin,
    publicStaticZipSha256:'1'.repeat(64),publicStudioManifestSha256:'2'.repeat(64),
    publicCatalogSha256:'3'.repeat(64),publicAppJsSha256:'4'.repeat(64),
    publicQrIndexSha256:'5'.repeat(64),publicGlossaryIndexSha256:'6'.repeat(64),
    approvedLessonIds:topics.flatMap(topic=>['en','es','de','fr'].flatMap(language=>
      ['A1','A2','B1','B2','C1','C2'].map(level=>`${topic}/${language}/${level}`))).sort(),
    approvedLessonCount:72,approvedTopicIds:topics,approvedQrVectorCount:576,
    legacyOfflineDictionaryCount:12,contextualOfflineCzechGlosses:0
  };
  const {schema:profileSchema,...fields}=profile;
  const statement={...fields,
    schema:'ghrab-clb-owner-content-release-statement-v2',
    purpose:'OWNER_AUTHORISES_EXACT_CONVERSATION_LIBRARY_CONTENT_NOT_INDEPENDENT_SECURITY_CERTIFICATION',
    ownerPedagogicalApproval:true,ownerPublicationRightsSelfAttested:true,
    ownerAuthorisesPublicLibraryRelease:true,ownerAuthorisesProtectedTeacherStudioConnection:true,
    teacherPermitAndTrainingCode:'CLB-01',studentAccess:'ANONYMOUS_READ_ONLY',
    studioCredentialBridge:'FORBIDDEN',independentSecurityApproval:'NOT_GRANTED',
    garp27SchoolRuntimeLive:'NOT_TESTED_DEFERRED',studioReleaseP5:'PENDING',
    studioProductionPromotion:'NO_GO_UNTIL_SEPARATE_GATES',signedAt:'2026-10-19T16:00:00.000Z'
  };
  const signingDomain='GHRAB-CLB-OWNER-CONTENT-RELEASE-v2\n';
  profile.signedReleaseStatementSha256=createHash('sha256').update(signingDomain+canonical(statement)).digest('hex');
  const receipt={
    schema:'ghrab-clb-owner-signed-library-release-v2',
    purpose:'OWNER_CONTENT_RELEASE_ONLY_NOT_INDEPENDENT_SECURITY_GO',
    publicOnly:true,secretIncluded:false,studioReleaseGo:false,signingDomain,
    statement,statementSha256:profile.signedReleaseStatementSha256,
    signature:{algorithm:'ES256',keyId:trust.keyId,signature:Buffer.alloc(64).toString('base64url')},
    verifyKey:{keyId:trust.keyId,publicKey:trust.publicKey}
  };
  const app={id:'conversation-lab',version:'0.11.0',integration:{
    launchMode:'studio-teacher',securityBoundary:'isolated-anonymous-read-only',requiresHttps:true,
    contentMode:'approved-public-only',teacherTrainingRequired:true,credentialBridgeAllowed:false,
    autoPromotionAllowed:false,releaseId:profile.releaseId,manifestSha256:profile.publicCatalogSha256,
    signedStatementSha256:profile.signedReleaseStatementSha256,externalTargetUrl:origin+'/'
  }};
  const control={
    schema:'ghrab-cl-studio-e9-teacher-launch-control-v1',appId:'conversation-lab',appVersion:'0.11.0',
    stage:'PRODUCTION_AUTHORIZED',launchEnabled:true,teacherTrainingRequired:true,
    requiredTrainingCode:'CLB-01',requiredTrainingVersion:'2026-10',
    teacherEntry:'STUDIO_SAME_ORIGIN_PERMIT_AND_TRAINING_GATED',
    studentDirectEntry:'ANONYMOUS_NO_STUDIO_ACCOUNT',publicPlayer:'ANONYMOUS_READ_ONLY',
    publicOrigin:origin,releaseId:profile.releaseId,
    approvedDistributionManifestSha256:profile.publicCatalogSha256,
    publicStudioManifestSha256:profile.publicStudioManifestSha256,
    signedReleaseStatementSha256:profile.signedReleaseStatementSha256,
    approvedLessons:72,approvedCzechGlosses:0,ownerReleaseAuthorization:'PROJECT_OWNER_S0_APPROVED',
    publicRelease:'MANUAL_RELEASE_APPROVED',hostingOwnership:'VERIFIED',hostingHeaders:'VERIFIED',
    garpFoundation:'VERIFIED_STATIC_GARP27_0_11_0',publicClientLive:'VERIFIED_EXACT_PUBLIC_INVENTORY',
    garpLive:'NOT_TESTED',schoolServerLive:'DEFERRED_NOT_TESTED',
    independentSecurityApproval:'OWNER_S0_AI_OPPOSITION_ACCEPTED',
    ownerRiskAcceptanceRef:'./governance/project-owner-release.v0.11.0.json',
    riskProfile:'S0_ANONYMOUS_STATIC_PUBLIC_PLAYER_ONLY',studioCredentialBridge:'FORBIDDEN',
    publishStudentData:false,autoPromotion:'DISABLED',crossRepositoryDispatch:'DISABLED'
  };
  const acceptance={
    schema:'ghrab-clb-project-owner-release-acceptance-v1',appId:'conversation-lab',appVersion:'0.11.0',
    releaseId:profile.releaseId,publicOrigin:origin,ownerGitHubLogin:'Daniel22-dev',
    ownerGitHubUserId:287402620,source:'DIRECT_PROJECT_OWNER_CHAT_INSTRUCTION',
    ownerAuthority:'AI_STUDIO_PROJECT_LEAD_SELF_ASSERTED',riskAcceptanceByProjectOwner:true,
    schoolInstitutionalSignoff:'NOT_ATTESTED',independentSecurityApproval:'NOT_CLAIMED',
    publicArtifact:{ownerSignedStatementSha256:profile.signedReleaseStatementSha256,
      zipSha256:profile.publicStaticZipSha256,publicManifestSha256:profile.publicStudioManifestSha256,
      publicCatalogSha256:profile.publicCatalogSha256},
    studentIdentityOrStoredAnswers:false,studioTokenForwarding:false,autoPromotion:false
  };
  return {profile,receipt,app,control,acceptance};
}

test('Module-relative evidence URLs work from both teacher entries and never escape the Studio directory',()=>{
  const moduleUrl=studio+'/AI-Studio-GHRAB/integration/conversation-lab/teacher-launch.js';
  for(const entry of ['/AI-Studio-GHRAB/app/external/','/AI-Studio-GHRAB/conversation-lab/']) {
    assert.equal(clbIntegrationResourceUrl('./launch-control.json',moduleUrl),studio+'/AI-Studio-GHRAB/integration/conversation-lab/launch-control.json',entry);
  }
  assert.equal(clbIntegrationResourceUrl('../../integration/conversation-lab/owner-content-release.v0.9.2.signed.json',moduleUrl),studio+'/AI-Studio-GHRAB/integration/conversation-lab/owner-content-release.v0.9.2.signed.json');
  for(const resource of ['../../config/access-config-bundle.json','https://evil.example/x','//evil.example/x','/integration/x','./receipt.json?token=secret','./receipt.json#secret','..\\config\\private.json']) {
    assert.throws(()=>clbIntegrationResourceUrl(resource,moduleUrl),/CLB_E9_INTEGRATION_RESOURCE_/);
  }
});

test('Actual signed CLB-01 policy and both B1 owner receipts still verify under the existing trust anchor',async()=>{
  const [bundle,signature,verifyKey]=await Promise.all([
    'src/config/access-config-bundle.json','src/config/access-config-bundle.sig.json','src/config/access-config-verify-key.json'
  ].map(read));
  assert.equal(await verifySignedBundle({bundle,signature,verifyKey,cryptoImpl:webcrypto}),true);
  assertClbSignedTrainingPolicy(bundle.policy.applications['conversation-lab']);
  for(const name of ['owner-content-release.signed.json','owner-content-release.v0.9.2.signed.json']) {
    const receipt=await read(prefix+name),s=receipt.statement;
    const app={version:s.appVersion,integration:{manifestSha256:s.publicCatalogSha256}};
    const control={releaseId:s.releaseId,publicOrigin:s.publicOrigin,
      approvedDistributionManifestSha256:s.publicCatalogSha256,publicStudioManifestSha256:s.publicStudioManifestSha256,
      approvedLessons:1,approvedCzechGlosses:37,signedReleaseStatementSha256:receipt.statementSha256};
    assert.equal(await verifyClbOwnerContentReceipt(app,control,receipt,{cryptoImpl:webcrypto}),true);
    assert.deepEqual(s.approvedLessonIds,['artificial-intelligence/en/B1']);
  }
});

test('Actual 0.9.2 teacher launch preserves signature, owner scope and same-origin fetches after URL fix',async()=>{
  const [apps,control,receipt,decision]=await Promise.all([
    'scripts/fixtures/clb-legacy-0.9.2-app.json',prefix+'launch-control.json',
    prefix+'owner-content-release.v0.9.2.signed.json',prefix+'governance/project-owner-release.v0.9.2.json'
  ].map(read));
  const expected=[prefix+'launch-control.json',prefix+'owner-content-release.v0.9.2.signed.json',prefix+'governance/project-owner-release.v0.9.2.json'].map(path=>new URL(path,root).href);
  const values=[control,receipt,decision],seen=[];
  const target=await checkedConversationLabTarget(apps,{
    studioOrigin:studio,cryptoImpl:webcrypto,fetchImpl:async(url,options)=>{
      seen.push(url);assert.deepEqual(options,{method:'GET',credentials:'same-origin',cache:'no-store',redirect:'error'});
      const index=expected.indexOf(url);assert.ok(index>=0);return {ok:true,redirected:false,json:async()=>values[index]};
    }
  });
  assert.equal(target,origin+'/');assert.deepEqual(seen,expected);
});

test('Unsigned MASTER profile and wrong variants cannot enable the teacher entry',async()=>{
  const {profile}=await syntheticFixture();
  assert.equal(validateClbMasterReleaseProfile(profile),true);
  for(const change of [
    p=>{p.signedReleaseStatementSha256=null},p=>{p.appVersion='0.10.1'},
    p=>{p.approvedLessonIds.pop()},p=>{p.approvedLessonIds[0]='artificial-intelligence/en/B1'},
    p=>{p.approvedTopicIds=['artificial-intelligence']},p=>{p.contextualOfflineCzechGlosses=37},
    p=>{p.publicCatalogSha256=null},p=>{p.approvedQrVectorCount=72}
  ]){const changed=structuredClone(profile);change(changed);assert.throws(()=>validateClbMasterReleaseProfile(changed),/NOT_SIGNED_READY/);}
});

test('Real B1 receipts cannot authorize the MASTER library even with a valid historical ES256 signature',async()=>{
  const {profile}=await syntheticFixture();
  for(const name of ['owner-content-release.signed.json','owner-content-release.v0.9.2.signed.json']) {
    const actual=await read(prefix+name);
    await assert.rejects(()=>verifyClbMasterOwnerContentReceipt(actual,profile,{cryptoImpl:webcrypto}),/MASTER_OWNER_CONTENT_RECEIPT_INVALID/);
  }
});

test('Correctly shaped 0.11.0 metadata with a fabricated signature fails actual WebCrypto verification',async()=>{
  const {profile,receipt}=await syntheticFixture();
  await assert.rejects(()=>verifyClbMasterOwnerContentReceipt(receipt,profile,{cryptoImpl:webcrypto}),/MASTER_OWNER_CONTENT_SIGNATURE_INVALID/);
  await assert.rejects(()=>verifyClbMasterOwnerContentReceipt(receipt,profile,{cryptoImpl:null}),/CONTENT_CRYPTO_UNAVAILABLE/);
});

test('V2 content, publication scope, digests and pinned trust cannot be silently changed',async()=>{
  const {profile,receipt}=await syntheticFixture();
  const changes=[
    r=>{r.verifyKey.keyId='attacker'},r=>{r.verifyKey.publicKey.x='A'.repeat(43)},
    r=>{r.signature.keyId='attacker'},r=>{r.signingDomain='fake\n'},
    r=>{r.statement.publicCatalogSha256='e'.repeat(64)},r=>{r.statement.publicQrIndexSha256='e'.repeat(64)},
    r=>{r.statement.approvedLessonCount=1},r=>{r.statement.ownerAuthorisesPublicLibraryRelease=false},
    r=>{r.statement.studentAccess='STUDIO_ACCOUNT'},r=>{r.statement.studioCredentialBridge='ALLOWED'},
    r=>{r.statement.independentSecurityApproval='GRANTED'},r=>{r.statement.contextualOfflineCzechGlosses=37},
    r=>{r.statement.signedAt='SET_AT_SIGNATURE_TIME'},r=>{r.statement.signedAt='2026-10-19T16:00:00.001Z'},
    r=>{r.statement.extraUnapprovedField='new content'},r=>{r.statementSha256='0'.repeat(64)},
    r=>{r.studioReleaseGo=true}
  ];
  for(const change of changes){const mutated=structuredClone(receipt);change(mutated);await assert.rejects(()=>verifyClbMasterOwnerContentReceipt(mutated,profile,{cryptoImpl:webcrypto}),/CLB_E9_/);}
});

test('Same-origin teacher release requires exact MASTER routing, live evidence and anonymous student target',async()=>{
  const {app,control,profile}=await syntheticFixture();
  assert.equal(validateClbMasterTeacherTarget(app,control,profile,{studioOrigin:studio}),origin+'/');
  for(const change of [
    x=>{x.app.version='0.9.2'},x=>{x.app.integration.launchMode='external-protected'},
    x=>{x.app.integration.externalTargetUrl+='?permit=secret'},x=>{x.app.integration.signedStatementSha256=null},
    x=>{x.control.launchEnabled=false},x=>{x.control.stage='PRELIVE_HOLD'},
    x=>{x.control.hostingHeaders='NOT_VERIFIED'},x=>{x.control.publicClientLive='NOT_TESTED'},
    x=>{x.control.garpLive='VERIFIED'},x=>{x.control.schoolServerLive='VERIFIED'},
    x=>{x.control.studioCredentialBridge='ALLOWED'},x=>{x.control.approvedLessons=1},
    x=>{x.control.ownerRiskAcceptanceRef='https://evil.example/private'},x=>{x.control.autoPromotion='ENABLED'},
    x=>{x.control.requiredTrainingCode='GEN-01'},x=>{x.control.publicOrigin=studio}
  ]){const x=structuredClone({app,control});change(x);assert.throws(()=>validateClbMasterTeacherTarget(x.app,x.control,profile,{studioOrigin:studio}),/CLB_E9_/);}
  assert.throws(()=>validateClbMasterTeacherTarget(app,control,profile,{studioOrigin:origin}),/ORIGIN_MUST_BE_ISOLATED/);
});

test('Owner acceptance remains separate metadata and cannot claim institutional or independent security approval',async()=>{
  const {acceptance,profile}=await syntheticFixture();
  assert.equal(assertClbMasterOwnerAcceptance(acceptance,profile),true);
  for(const change of [
    r=>{r.appVersion='0.9.2'},r=>{r.ownerGitHubLogin='someone-else'},
    r=>{r.publicArtifact.zipSha256='e'.repeat(64)},r=>{r.riskAcceptanceByProjectOwner=false},
    r=>{r.independentSecurityApproval='CERTIFIED'},r=>{r.schoolInstitutionalSignoff='ATTESTED'},
    r=>{r.studioTokenForwarding=true},r=>{r.autoPromotion=true}
  ]){const r=structuredClone(acceptance);change(r);assert.throws(()=>assertClbMasterOwnerAcceptance(r,profile),/MASTER_OWNER_ACCEPTANCE_SCOPE_INVALID/);}
});

test('HOLD control prevents receipt fetch, crypto execution and teacher release completion',async()=>{
  const {app,control,profile}=await syntheticFixture();control.stage='PRELIVE_HOLD';control.launchEnabled=false;
  const calls=[];
  await assert.rejects(()=>checkedConversationLabMasterTarget(app,{
    studioOrigin:studio,releaseProfile:profile,cryptoImpl:null,
    fetchImpl:async url=>{calls.push(url);return {ok:true,redirected:false,json:async()=>control};}
  }),/MASTER_RELEASE_NOT_AUTHORIZED/);
  assert.deepEqual(calls,[paths.control]);
});

test('Missing, redirected or invalid Studio evidence fails closed',async()=>{
  const {app,profile}=await syntheticFixture();
  for(const fetchImpl of [async()=>({ok:false}),async()=>({ok:true,redirected:true}),async()=>{throw Error('network');},async()=>({ok:true,redirected:false,json:async()=>{throw Error('json');}})]) {
    await assert.rejects(()=>checkedConversationLabMasterTarget(app,{studioOrigin:studio,releaseProfile:profile,fetchImpl,cryptoImpl:webcrypto}),/CLB_E9_MASTER_CONTROL_/);
  }
});

test('Synthetic positive ordering only: check control, verify receipt, then owner metadata; this is not real release approval',async()=>{
  const {app,profile,control,receipt,acceptance}=await syntheticFixture();
  const events=[],values=new Map([[paths.control,control],[paths.receipt,receipt],[paths.acceptance,acceptance]]);
  const syntheticCrypto={subtle:{
    digest:(...args)=>webcrypto.subtle.digest(...args),
    importKey:(...args)=>webcrypto.subtle.importKey(...args),
    verify:async()=>{events.push('SYNTHETIC_VERIFY');return true;}
  }};
  const actual=await checkedConversationLabMasterTarget(app,{
    studioOrigin:studio,releaseProfile:profile,cryptoImpl:syntheticCrypto,
    fetchImpl:async(url,options)=>{
      events.push(url);assert.ok(values.has(url));
      assert.deepEqual(options,{method:'GET',credentials:'same-origin',cache:'no-store',redirect:'error'});
      return {ok:true,redirected:false,json:async()=>values.get(url)};
    }
  });
  assert.equal(actual,origin+'/');
  assert.deepEqual(events,[paths.control,paths.receipt,'SYNTHETIC_VERIFY',paths.acceptance]);
});

test('Actual crypto failure stops before unsigned owner metadata; no approval can rescue a forged receipt',async()=>{
  const {app,profile,control,receipt}=await syntheticFixture(),calls=[];
  await assert.rejects(()=>checkedConversationLabMasterTarget(app,{
    studioOrigin:studio,releaseProfile:profile,cryptoImpl:webcrypto,
    fetchImpl:async url=>{calls.push(url);return {ok:true,redirected:false,json:async()=>url===paths.control?control:receipt};}
  }),/MASTER_OWNER_CONTENT_SIGNATURE_INVALID/);
  assert.deepEqual(calls,[paths.control,paths.receipt]);
});
