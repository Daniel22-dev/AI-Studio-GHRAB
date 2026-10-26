import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {webcrypto} from 'node:crypto';
import profile from '../src/conversation-lab/release-profile.js';
import {verifyClbMasterFiles} from './lib/clb-master-integrity.mjs';
import {checkedConversationLabMasterTarget} from '../src/integration/conversation-lab/teacher-launch.js';
import {ONLY_EXCEPTION, LUDUS_EXCEPTION, validateWavePlatformPins} from './release-wave-platform-policy.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const load=async p=>JSON.parse(await readFile(path.join(root,p),'utf8'));
const app=(await load('src/config/apps.generated.json')).find(a=>a.id==='conversation-lab');
const control=await load('src/integration/conversation-lab/launch-control.v0.11.0.json');

test('Full installed MASTER tree preserves all reviewed bytes and actual content signature',async()=>{
 const r=await verifyClbMasterFiles(root,path.join(root,'src'));
 assert.equal(r.files,120);assert.equal(r.variants,72);assert.equal(r.preservedPublicFiles,115);
});
test('Real 72-variant crypto and exact owner decision permit the same-origin teacher connection',async()=>{
 const seen=[];
 const target=await checkedConversationLabMasterTarget(app,{studioOrigin:'https://daniel22-dev.github.io',releaseProfile:profile,cryptoImpl:webcrypto,fetchImpl:async(url,options)=>{
  assert.equal(options.credentials,'same-origin');assert.equal(options.redirect,'error');seen.push(url);
  const file=fileURLToPath(url);assert.ok(file.startsWith(path.join(root,'src/integration/conversation-lab')+path.sep));
  return {ok:true,redirected:false,json:async()=>JSON.parse(await readFile(file,'utf8'))};
 }});
 assert.equal(target,'https://conversation-lab-ghrab.pages.dev/');assert.equal(seen.length,3);
});
test('Rollback HOLD stops before receipt or lesson requests despite valid signed metadata',async()=>{
 const calls=[];
 await assert.rejects(()=>checkedConversationLabMasterTarget(app,{studioOrigin:'https://daniel22-dev.github.io',releaseProfile:profile,cryptoImpl:webcrypto,fetchImpl:async url=>{
  calls.push(url);return {ok:true,redirected:false,json:async()=>({...control,stage:'PRELIVE_HOLD',launchEnabled:false})};
 }}),/MASTER_RELEASE_NOT_AUTHORIZED/);
 assert.equal(calls.length,1);assert.ok(calls[0].endsWith('/launch-control.v0.11.0.json'));
});
test('No owner signature is recast as independent or school-server certification',async()=>{
 const owner=await load('src/integration/conversation-lab/governance/project-owner-release.v0.11.0.json');
 assert.equal(owner.independentSecurityApproval,'NOT_CLAIMED');assert.equal(owner.schoolInstitutionalSignoff,'NOT_ATTESTED');
 assert.equal(owner.hostingRepair.signedByOriginalReceipt,false);assert.equal(control.garpLive,'NOT_TESTED');assert.equal(control.schoolServerLive,'DEFERRED_NOT_TESTED');
});
test('CLB isolation: seven immutable apps + two exact, independently approved production releases',async()=>{
 const before=await load('scripts/fixtures/clb-current-nine-apps.json');
 const wave=await load('src/config/release-wave.json');
 const pins=validateWavePlatformPins(wave);
 const oldById=new Map(before.map(a=>[a.id,a]));
 const registered=new Map(wave.applications.map(a=>[a.id,a]));
 const verifiedOverrides=new Map([
  ['differentiator',{
   entry:ONLY_EXCEPTION, publishedAt:'2026-10-25T14:41:07.280Z',
  }],
  ['ludus',{
   entry:LUDUS_EXCEPTION,publishedAt:'2026-10-26T17:10:45.146Z',
   assuranceSha256:'7a7035d8f4d91bc422abe640c97abbbba24d1af39dfc8cda059d0ef05b6460fb',
  }],
 ]);
 for(const file of ['apps.generated.json','apps.fallback.json']){
  const apps=await load('src/config/'+file);
  const other=apps.filter(a=>a.id!=='conversation-lab');
  assert.deepEqual(other.map(a=>a.id),before.map(a=>a.id));
  assert.deepEqual(other.map(a=>[a.id,a.version]),
   wave.applications.filter(a=>a.id!=='conversation-lab').map(a=>[a.id,a.version]));
  for(const app of other){
   const original=oldById.get(app.id);
   assert.ok(original,'Historical CLB snapshot missing '+app.id);
   const override=verifiedOverrides.get(app.id);
   if(!override){
    assert.deepEqual(app,original,'Unreviewed app delta forbidden: '+app.id);
    continue;
   }
   const approved=override.entry;
   assert.deepEqual(registered.get(app.id),approved,'Exact release-wave entry drift: '+app.id);
   assert.deepEqual(pins.get(app.id),{
    platformVersion:approved.platformVersion,
    requiredPlatformRange:approved.requiredPlatformRange,
   });
   assert.equal(app.version,approved.version);
   assert.equal(app.platform?.platformVersion,approved.platformVersion);
   assert.equal(app.platform?.requiredPlatformRange,approved.requiredPlatformRange);
   assert.equal(app.compatibility?.platformRange,approved.requiredPlatformRange);
   assert.equal(app.publishedAt,override.publishedAt);
   if(app.id==='ludus'){
    assert.equal(app.platform.cacheName,'ghrab-ludus-v1.16.32');
    assert.equal(app.platform.requiredRange,approved.requiredPlatformRange);
    assert.deepEqual(app.capabilities,[...original.capabilities,'material-flow-outbound']);
    assert.equal(app.assurance?.evidenceManifestSha256,override.assuranceSha256);
   }
   // Revert ONLY the explicit, immutable list of separately certified fields.
   // Every other field must match the signed-CLB-era nine-app baseline byte for byte.
   const normalized=structuredClone(app);
   normalized.version=original.version;
   normalized.publishedAt=original.publishedAt;
   normalized.platform.platformVersion=original.platform.platformVersion;
   normalized.platform.requiredPlatformRange=original.platform.requiredPlatformRange;
   normalized.compatibility.platformRange=original.compatibility.platformRange;
   if(app.id==='ludus'){
    normalized.platform.cacheName=original.platform.cacheName;
    normalized.platform.requiredRange=original.platform.requiredRange;
    normalized.capabilities=structuredClone(original.capabilities);
    normalized.assurance.evidenceManifestSha256=original.assurance.evidenceManifestSha256;
   }
   assert.deepEqual(normalized,original,'Unreviewed registry mutation for '+app.id);
  }
 }
});
