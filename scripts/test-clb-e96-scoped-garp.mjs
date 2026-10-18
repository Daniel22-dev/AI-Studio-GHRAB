import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const j=async p=>JSON.parse(await readFile(new URL('../'+p,import.meta.url),'utf8'));
test('GARP 2.7 2026-09-23 r2 school runtime is DEFERRED; cannot convert browser tests into server LIVE',async()=>{
 const [profile,matrix,masterLive,manifest]=await Promise.all([
  j('security/garp27/conversation-lab-standalone-release-profile.candidate.json'),
  j('vendor/garp-2.7-consolidated-r2/MASTER/CAPABILITY-MATRIX.json'),
  j('security/garp27/live-status.json'),
  j('src/integration/conversation-lab/studio-manifest.proposed.json')
 ]);
 assert.equal(matrix.garpVersion,'2.7');
 assert.equal(matrix.serverImplementation,'DEFERRED_BY_OWNER_DECISION');
 assert.equal(matrix.phases.find(x=>x.id==='SCHOOL_SERVER').active,false);
 assert.equal(matrix.phases.find(x=>x.id==='LIVE').status,'NOT_TESTED');
 assert.equal(masterLive.overall,'NOT_TESTED');
 assert.equal(profile.schoolServerRuntime.ownerDecision,'DEFERRED_BY_OWNER_DECISION');
 assert.equal(profile.schoolServerRuntime.garpLive,'NOT_TESTED');
 assert.equal(profile.schoolServerRuntime.canClaimPass,false);
 assert.equal(profile.publicClientLive.status,'TECHNICAL_VERIFIED');
 assert.equal(profile.publicClientLive.manifestSha256,'e139a829fadc59e1563632aae9995334c87e0b23f991dcf5e6b41dc9c1b51464');
 assert.equal(profile.publicClientLive.catalogSha256,manifest.integration.manifestSha256);
 assert.equal(profile.publicAppVersion,manifest.version);
});
test('GARP scoped standalone admission stays HOLD until full 0.9.1 source policy, signed release & independent review',async()=>{
 const [p,mirror,controller]=await Promise.all([
  j('security/garp27/conversation-lab-standalone-release-profile.candidate.json'),
  j('security/garp27/apps/conversation-lab/garp-policy.json'),
  j('src/integration/conversation-lab/launch-control.json')
 ]);
 assert.equal(mirror.appVersion,'0.9.1');
 assert.equal(p.garp27Foundation.studioPolicyMirrorAppVersion,mirror.appVersion);
 assert.equal(p.garp27Foundation.actualPublicAppVersion,mirror.appVersion);
 assert.equal(p.garp27Foundation.policyMirrorAligned,true);
 assert.equal(p.garp27Foundation.signedReleaseStatement,false);
 assert.equal(p.garp27Foundation.independentSecurityApproval,false);
 assert.equal(p.releaseState,'HOLD_PENDING_RECONCILIATION');
 assert.equal(controller.stage,'PRELIVE_HOLD');
 assert.equal(controller.launchEnabled,false);
 assert.equal(controller.garpLive,'NOT_TESTED');
 assert.equal(p.requiredLauncherReleaseModel.oldUnscopedGarpLiveBooleanIsUnsatisfiable,true);
});
