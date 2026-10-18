import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,createPublicKey,generateKeyPairSync,verify} from 'node:crypto';
import {readFile} from 'node:fs/promises';
const ROOT=new URL('../',import.meta.url);
const json=async path=>JSON.parse(await readFile(new URL(path,ROOT),'utf8'));
const canonical=v=>Array.isArray(v)?'['+v.map(canonical).join(',')+']'
  :v&&typeof v==='object'?'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}':JSON.stringify(v);
const digest=x=>createHash('sha256').update(x).digest('hex');
const BUNDLE='src/integration/conversation-lab/owner-content-release.signed.json';
const DIGEST='77549c561032c35e6c78bb52885ddcc0022d64a7115bb230c8997286e61e8d0a';
const domain='GHRAB-CLB-OWNER-CONTENT-RELEASE-v1\n';
const manifestExpected='e139a829fadc59e1563632aae9995334c87e0b23f991dcf5e6b41dc9c1b51464';
function verifyReceipt(receipt,key,statement=receipt.statement){
  return verify('sha256',Buffer.from(receipt.signingDomain+canonical(statement),'utf8'),{key,dsaEncoding:'ieee-p1363'},Buffer.from(receipt.signature.signature,'base64url'));
}
test('E101 owner CONTENT receipt is signed by the existing trusted Studio ES256 key, not a self-signed JWK',async()=>{
 const [r,trust]=await Promise.all([json(BUNDLE),json('src/config/access-config-verify-key.json')]);
 assert.deepEqual(Object.keys(r).sort(),['schema','purpose','publicOnly','secretIncluded','statement','signingDomain','statementSha256','signature','verifyKey','studioReleaseGo'].sort());
 assert.equal(r.schema,'ghrab-clb-owner-signed-public-release-handoff-v1');
 assert.equal(r.purpose,'OWNER_CONTENT_RELEASE_ONLY_NOT_INDEPENDENT_SECURITY_GO');
 assert.equal(r.publicOnly,true);
 assert.equal(r.secretIncluded,false);
 assert.equal(r.studioReleaseGo,false);
 assert.equal(r.signingDomain,domain);
 assert.equal(r.signature.algorithm,'ES256');
 assert.equal(r.signature.keyId,trust.keyId);
 assert.equal(r.verifyKey.keyId,trust.keyId);
 for(const f of ['kty','crv','x','y'])assert.equal(r.verifyKey.publicKey[f],trust.publicKey[f]);
 const raw=Buffer.from(r.signingDomain+canonical(r.statement),'utf8');
 assert.equal(digest(raw),DIGEST);
 assert.equal(r.statementSha256,DIGEST);
 const sig=Buffer.from(r.signature.signature,'base64url');
 assert.equal(sig.length,64);
 const trusted=createPublicKey({key:trust.publicKey,format:'jwk'});
 assert.equal(verifyReceipt(r,trusted),true,'actual domain-separated owner signature must verify');
 const altered=structuredClone(r.statement);
 altered.approvedLessonCount=2;
 assert.equal(verifyReceipt(r,trusted,altered),false,'added second lesson invalidates signed owner approval');
 altered.approvedLessonCount=1;
 altered.ownerAuthorisesProtectedTeacherStudioConnection=false;
 assert.equal(verifyReceipt(r,trusted,altered),false,'retracted Studio consent cannot inherit previous signature');
 const wrongKey=generateKeyPairSync('ec',{namedCurve:'prime256v1'}).publicKey;
 assert.equal(verifyReceipt(r,wrongKey),false,'arbitrary self-issued trust must fail');
 const serialized=JSON.stringify(r);
 assert.equal(JSON.stringify(r.verifyKey.publicKey).includes('"d"'),false);
 assert.equal(/"private(?:Key|Jwk)"\s*:/i.test(serialized),false);
});
test('E101 owner exact approved B1 release pins all externally verified 21-file hashes and is not security or P5 GO',async()=>{
 const [r,plan,manifest,control,gates]=await Promise.all([
  json(BUNDLE),
  json('src/integration/conversation-lab/cloudflare-manifest-install.json'),
  json('src/integration/conversation-lab/studio-manifest.proposed.json'),
  json('src/integration/conversation-lab/launch-control.json'),
  json('src/integration/conversation-lab/activation-gates.json')
 ]);
 const s=r.statement;
 assert.deepEqual(Object.keys(s).sort(),['schema','purpose','appId','appVersion','releaseId','publicOrigin',
  'publicStaticZipSha256','publicStudioManifestSha256','publicCatalogSha256','publicLessonSha256','publicAppJsSha256',
  'approvedLessonIds','approvedLessonCount','contextualOfflineCzechGlosses','ownerPedagogicalApproval',
  'ownerPublicationRightsSelfAttested','ownerAuthorisesPublicPilot','ownerAuthorisesProtectedTeacherStudioConnection',
  'teacherPermitAndTrainingCode','studentAccess','studioCredentialBridge','independentSecurityApproval',
  'garp27SchoolRuntimeLive','studioReleaseP5','studioProductionPromotion','signedAt'].sort());
 assert.equal(s.schema,'ghrab-clb-owner-content-release-statement-v1');
 assert.equal(s.purpose,'OWNER_AUTHORISES_EXACT_AI_B1_PUBLIC_PILOT_AND_STUDIO_INTEGRATION_NOT_SECURITY_GO');
 assert.equal(s.appId,'conversation-lab');
 assert.equal(s.appVersion,'0.9.1');
 assert.equal(s.releaseId,manifest.integration.releaseId);
 assert.equal(s.publicOrigin,plan.cloudflareOrigin);
 assert.equal(s.publicStaticZipSha256,plan.cloudflareZipSha256);
 assert.equal(s.publicStudioManifestSha256,manifestExpected);
 assert.equal(s.publicStudioManifestSha256,plan.expectedStudioManifestSha256);
 assert.equal(s.publicCatalogSha256,manifest.integration.manifestSha256);
 assert.equal(s.publicLessonSha256,plan.expectedLessonSha256);
 assert.equal(s.publicAppJsSha256,plan.expectedAppJsSha256);
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
 assert.equal(s.signedAt,'2026-10-18T11:45:57.050Z');
 assert.equal(manifest.integration.signedStatementSha256,null,'Cloudflare manifest remains unchanged');
 assert.equal(control.stage,'PRELIVE_HOLD');
 assert.equal(control.launchEnabled,false);
 assert.equal(control.signedReleaseStatementSha256,null);
 assert.equal(gates.independentSecurityGo,'NOT_GRANTED');
 assert.equal(gates.studioP5,'NOT_RUN_FOR_THIS_RELEASE');
});
