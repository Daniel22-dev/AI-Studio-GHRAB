import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const json=async path=>JSON.parse(await readFile(new URL('../'+path,import.meta.url),'utf8'));
const legacyIds=['generator','differentiator','essay-evaluator','correspondence','ludus','activity-builder','sortio','lesson-hub','maturita-desk'];
const expectedIds=[...legacyIds,'conversation-lab'];
const url='https://conversation-lab-ghrab.pages.dev/';
const textDigest=s=>createHash('sha256').update(s).digest('hex');
const manifests=['src/config/apps.generated.json','src/config/apps.fallback.json'];
test('E9.6 release candidate includes exactly 10 apps with the same first nine entries',async()=>{
 const [sources,generated,fallback,consumers,readiness,wave,report,bundle,policy]=await Promise.all([
  ...['src/config/sources.json',...manifests,'src/config/platform-consumers.json','src/config/ai-readiness.generated.json','src/config/release-wave.json','src/config/sync-report.json','src/config/access-config-bundle.json','src/config/access-policy.json'].map(json)
 ]);
 for(const [kind,items,key] of [['sources',sources,'id'],['generated',generated,'id'],['fallback',fallback,'id'],['wave',wave.applications,'id'],['report',report.sources,'id']]){
  assert.deepEqual(items.map(x=>x[key]),expectedIds,kind+' must add CLB only once, last');
 }
 assert.deepEqual(readiness.applications.map(x=>x.appId).slice(0,-1).sort(),[...legacyIds].sort(),'all prior readiness entries survive in their existing list ordering');
 assert.equal(readiness.applications.at(-1).appId,'conversation-lab');
 assert.equal(consumers.length,11);
 assert.deepEqual(consumers.filter(x=>x.id!=='ai-studio').map(x=>x.id).sort(),[...expectedIds].sort());
 for(const index of legacyIds.keys())assert.deepEqual(generated[index],fallback[index],'older apps must not diverge between fallback and live snapshot');
 assert.equal(bundle.version,'access-p1-20261018062951Z');
 assert.deepEqual(bundle.policy,policy);
 assert.deepEqual(policy.applications['conversation-lab'],{trainingRequired:true,trainingCode:'CLB-01',trainingVersion:'2026-10',label:{cs:'Conversation Lab',en:'Conversation Lab'}});
 assert.equal(Object.keys(policy.applications).length,10);
 assert.equal(readiness.summary.totalApps,10);
 assert.equal(readiness.summary.notApplicableApps,4);
 assert.equal(report.counts.total,10);
 assert.equal(report.counts.verified,10);
 assert.equal(report.counts.deployment,10);
 assert.equal(report.releaseIdentity.absent,1);
 assert.equal(report.releaseIdentity.failed,0);
});
test('E9.6 live manifest, manual and approved B1 content pin to the same audited isolated Cloudflare origin',async()=>{
 const [apps,sources,ready,report,wave,consumers,manifest,hostPlan]=await Promise.all([
  ...['src/config/apps.generated.json','src/config/sources.json','src/config/ai-readiness.generated.json','src/config/sync-report.json','src/config/release-wave.json','src/config/platform-consumers.json','src/integration/conversation-lab/studio-manifest.proposed.json','src/integration/conversation-lab/cloudflare-manifest-install.json'].map(json)
 ]);
 const app=apps.at(-1);
 assert.deepEqual(app,manifest,'new catalog app must equal the previously reviewed live manifest proposal');
 assert.equal(app.version,'0.9.1');
 assert.equal(app.launchUrl,url);
 assert.equal(app.manualUrl,url+'manual/');
 assert.equal(app.paths.manifest,url+'studio-manifest.json');
 assert.equal(app.integration.launchMode,'external-protected');
 assert.equal(app.integration.contentMode,'approved-public-only');
 assert.equal(app.integration.manifestSha256,hostPlan.expectedCatalogSha256);
 assert.equal(app.integration.signedStatementSha256,null,'a signature cannot be invented by registry synchronisation');
 assert.equal(app.integration.credentialBridgeAllowed,false);
 assert.equal(app.aiCore.status,'not-applicable');
 assert.equal(app.platform.cacheName,'ghrab-conversation-lab-v0.9.1');
 assert.equal(app.platform.storagePrefix,'ghrab.conversation-lab.');
 const src=sources.at(-1);
 assert.equal(src.repository,'Daniel22-dev/conversation-lab-source');
 assert.equal(src.url,url+'studio-manifest.json');
 assert.equal(ready.applications.at(-1).status,'not-applicable');
 assert.equal(report.sources.at(-1).verification,'deployment');
 assert.equal(report.sources.at(-1).releaseIdentity.status,'ABSENT','full GARP release integrity is still pending');
 assert.equal(wave.applications.at(-1).version,app.version);
 const c=consumers.at(-1);
 assert.equal(c.version,app.version);
 assert.equal(c.paths.app,url);
 assert.equal(c.paths.manual,app.manualUrl);
 assert.equal(c.platform.storagePrefix,app.platform.storagePrefix);
 assert.equal(c.cacheName,app.platform.cacheName);
});
test('E9.6 registration is a DRAFT candidate: signed policy and public player do not override ungranted Studio/GARP release',async()=>{
 const [control,gates,promotion,signPolicy]=await Promise.all([
  ...['src/integration/conversation-lab/launch-control.json','src/integration/conversation-lab/activation-gates.json','src/config/release-promotion-policy.json','src/config/access-config-bundle.sig.json'].map(json)
 ]);
 assert.equal(control.stage,'PRELIVE_HOLD');
 assert.equal(control.launchEnabled,false);
 assert.equal(control.ownerReleaseAuthorization,'NOT_GRANTED');
 assert.equal(control.garpLive,'NOT_TESTED');
 assert.equal(control.publicRelease,'NO_GO');
 assert.equal(gates.independentSecurityGo,'NOT_GRANTED');
 assert.equal(gates.studioP5,'NOT_RUN_FOR_THIS_RELEASE');
 assert.equal(gates.signing.productionStatement,'OWNER_CONTENT_ES256_SIGNED_NO_INDEPENDENT_SECURITY_GO');
 assert.equal(gates.signing.ownerContentStatementSha256,'77549c561032c35e6c78bb52885ddcc0022d64a7115bb230c8997286e61e8d0a');
 assert.equal(gates.signing.ownerContentSignatureVerified,true);
 assert.equal(gates.ownerSignedPublicPilotContent,true);
 assert.equal(gates.independentSecurityGo,'NOT_GRANTED');
 assert.equal(gates.launcherEnabled,false);
 assert.equal(promotion.defaultMode,'manual');
 assert.equal(promotion.applications.some(x=>x.id==='conversation-lab'),false,'CLB must not auto-promote');
 assert.equal(signPolicy.algorithm,'ES256');
 const oldVersion=await json('src/config/deployment.json');
 assert.equal(oldVersion.sharedAccessVersion,'access-p1-20261018062951Z');
});
