import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';

const raw=async path=>readFile(new URL('../'+path,import.meta.url));
const json=async path=>JSON.parse(await raw(path));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const p='src/integration/conversation-lab/';
const appIds=['generator','differentiator','essay-evaluator','correspondence','ludus','activity-builder','sortio','lesson-hub','maturita-desk'];

test('E112 exact tenth app design matches independently ES256-signed 0.9.2 public manifest, never 0.9.1',async()=>{
 const [candidate,manifestBytes,receipt]=await Promise.all([
  json(p+'catalog-activation.v0.9.2.candidate.json'),
  raw(p+'studio-manifest.v0.9.2.proposed.json'),
  json(p+'owner-content-release.v0.9.2.signed.json')
 ]);
 const manifest=JSON.parse(manifestBytes);
 assert.equal(candidate.status,'PRELIVE_DESIGN_ONLY_NO_RUNTIME_REGISTRY_CHANGE');
 assert.equal(candidate.appId,'conversation-lab');
 assert.equal(candidate.appVersion,'0.9.2');
 assert.equal(candidate.releaseId,'cl-ai-b1-pilot-20261018-r2');
 assert.equal(candidate.appManifestSha256,sha(manifestBytes));
 assert.equal(candidate.appManifestSha256,'c071bc4af56367458fb4e391019d3476790111f31495718e737bc339ee5cd134');
 assert.equal(candidate.publishedCatalogSha256,'2ab4cab8e95a8c124f1f8670b1cfe861f3e7557dfe9ece89c768bb2d7121fce6');
 assert.equal(candidate.publicStaticZipSha256,'eeca610e36ea3f11366297728af39510ee9541f8960de72c444ea6683a8f84c0');
 assert.equal(candidate.signedOwnerStatementSha256,'6f0588801d7ec4bc5b3314a4e351603cd6993890ef56b2a636ee497d0b3848c5');
 assert.equal(candidate.appVersion,manifest.version);
 assert.equal(candidate.releaseId,manifest.integration.releaseId);
 assert.equal(candidate.publicOrigin,new URL(manifest.launchUrl).origin);
 assert.equal(candidate.publishedCatalogSha256,manifest.integration.manifestSha256);
 assert.equal(candidate.signedOwnerStatementSha256,receipt.statementSha256);
 assert.equal(candidate.publicStaticZipSha256,receipt.statement.publicStaticZipSha256);
 assert.equal(candidate.appManifestSha256,receipt.statement.publicStudioManifestSha256);
 assert.equal(candidate.publishedCatalogSha256,receipt.statement.publicCatalogSha256);
 assert.equal(manifest.id,'conversation-lab');
 assert.equal(manifest.integration.launchMode,'external-protected');
 assert.equal(manifest.integration.studioAccessIsLauncherGateOnly,true);
 assert.equal(manifest.integration.teacherTrainingRequired,true);
 assert.equal(manifest.integration.credentialBridgeAllowed,false);
 assert.equal(manifest.integration.autoPromotionAllowed,false);
 assert.equal(manifest.integration.signedStatementSha256,null);
});

test('E112 a proposed tenth tile cannot mutate checked-in nine real runtime apps or release permissions',async()=>{
 const [candidate,apps,fallback,sources,control,promotion]=await Promise.all([
  json(p+'catalog-activation.v0.9.2.candidate.json'),
  json('src/config/apps.generated.json'),
  json('src/config/apps.fallback.json'),
  json('src/config/sources.json'),
  json(p+'launch-control.json'),
  json('src/config/release-promotion-policy.json')
 ]);
 for(const list of [apps,fallback,sources]){
  assert.deepEqual(list.map(x=>x.id),appIds);
  assert.equal(list.some(x=>x.id==='conversation-lab'),false);
 }
 assert.deepEqual(apps,fallback);
 assert.deepEqual(candidate.unchangedRuntimeAppIds,appIds);
 assert.deepEqual(candidate.approvedNewAppIds,['conversation-lab']);
 assert.equal(candidate.currentProductionCatalogCount,9);
 assert.equal(candidate.requestedFutureProductionCatalogCount,10);
 assert.equal(candidate.activeRegistryWriteIncluded,false);
 assert.equal(candidate.launchControlWriteIncluded,false);
 assert.equal(candidate.autoPromotion,false);
 assert.equal(candidate.studioCredentialBridge,false);
 assert.equal(candidate.studentEntry,'ANONYMOUS_READ_ONLY');
 assert.equal(candidate.teacherTrainingPolicy.code,'CLB-01');
 assert.equal(control.stage,'PRELIVE_HOLD');
 assert.equal(control.launchEnabled,false);
 assert.equal(control.publicOrigin,null);
 assert.equal(control.releaseId,null);
 assert.equal(promotion.applications.some(x=>x.id==='conversation-lab'),false);
 assert.equal(candidate.productionActivation,'NO_GO');
 assert.equal(candidate.independentRiskAcceptance,'NOT_RECORDED');
 assert.equal(candidate.studioP5,'NOT_EXECUTED_FOR_RELEASE');
 assert.equal(candidate.cloudflare092LiveExactHashes,'NOT_VERIFIED');
});
