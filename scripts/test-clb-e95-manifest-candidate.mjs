import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
const read=async path=>JSON.parse(await readFile(new URL('../'+path,import.meta.url),'utf8'));
const sha=x=>createHash('sha256').update(Buffer.from(x,'utf8')).digest('hex');
const SHA=/^[a-f0-9]{64}$/;
test('E9.5 manifest proposal has exact Cloudflare byte parity and NO substituted production release signature',async()=>{
 const [plan,m,g]=await Promise.all([
 read('src/integration/conversation-lab/cloudflare-manifest-install.json'),
 read('src/integration/conversation-lab/studio-manifest.proposed.json'),
 read('src/integration/conversation-lab/activation-gates.json')]);
 assert.equal(plan.schema,'ghrab-cl-e95-public-studio-manifest-upload-plan-v1');
 assert.equal(m.schema,'ai-studio-app-manifest-v1');
 assert.equal(m.id,'conversation-lab');
 assert.equal(m.version,'0.9.1');
 assert.match(plan.cloudflareZipSha256,SHA);
 assert.equal(plan.publicFileCount,21);
 const raw=await readFile(new URL('../src/integration/conversation-lab/studio-manifest.proposed.json',import.meta.url),'utf8');
 assert.equal(sha(raw),plan.expectedStudioManifestSha256,'candidate actual manifest content must match the separately prepared Cloudflare zip');
 assert.equal(plan.expectedStudioManifestSha256,'e139a829fadc59e1563632aae9995334c87e0b23f991dcf5e6b41dc9c1b51464');
 assert.equal(m.integration.manifestSha256,plan.expectedCatalogSha256);
 assert.equal(m.integration.signedStatementSha256,null);
 assert.equal(m.integration.teacherTrainingRequired,true);
 assert.equal(m.integration.credentialBridgeAllowed,false);
 assert.equal(m.integration.autoPromotionAllowed,false);
 assert.equal(m.launchUrl,plan.cloudflareOrigin+'/');
 assert.equal(m.manualUrl,plan.cloudflareOrigin+'/manual/');
 assert.equal(m.paths.manifest,plan.cloudflareOrigin+'/studio-manifest.json');
 assert.equal(m.aiCore.status,'not-applicable');
 assert.equal(m.platform.storagePrefix,'ghrab.conversation-lab.');
 assert.equal(m.integration.contentMode,'approved-public-only');
 assert.equal(plan.existingPlayerBytesChanged,false);
 assert.equal(plan.ownerCloudflareDeploymentConsent,'NOT_YET_FOR_THIS_ZIP');
 assert.equal(plan.actualCloudflareManifestLive,'PENDING');
 assert.equal(plan.signedTeacherAccessBundle,'ES256_VERIFIED_PRELIVE');
 assert.equal(plan.signedProductionReleaseStatement,'NOT_SIGNED');
 assert.equal(plan.independentGarpLive,'NOT_ATTESTED');
 assert.equal(g.stage,'PRELIVE_HOLD');
 assert.equal(g.studioManifestLiveStatus,'WAITING_FOR_OWNER_UPLOAD');
 assert.equal(g.studioManifestPlannedSha256,plan.expectedStudioManifestSha256);
 assert.equal(g.launcherEnabled,false);
});
test('E9.5 manifest is public-safe, static, has no age disclosure or AI/permit transport',async()=>{
 const m=await read('src/integration/conversation-lab/studio-manifest.proposed.json');
 const body=JSON.stringify(m).toLowerCase();
 for(const forbidden of ['dateofbirth','agegroup','recommendedage','localapikey','x-studio-permit','privatejwk','studentroster'])
   assert.ok(!body.includes(forbidden),'forbidden metadata '+forbidden);
 assert.equal(new URL(m.integration.externalTargetUrl).origin,'https://conversation-lab-ghrab.pages.dev');
 assert.equal(new URL(m.integration.externalTargetUrl).pathname,'/');
 assert.equal(new URL(m.integration.externalTargetUrl).search,'');
 assert.equal(new URL(m.integration.externalTargetUrl).hash,'');
 const appIds=(await read('src/config/apps.generated.json')).map(x=>x.id);
 assert.equal(appIds.includes('conversation-lab'),false,'active Studio card remains absent until controlled promotion');
});
