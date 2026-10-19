import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {webcrypto} from 'node:crypto';
import profile from '../src/conversation-lab/release-profile.js';
import {verifyClbMasterFiles} from './lib/clb-master-integrity.mjs';
import {checkedConversationLabMasterTarget} from '../src/integration/conversation-lab/teacher-launch.js';
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
test('All nine unrelated registry entries are unchanged, including the existing GIT release',async()=>{
 const before=await load('scripts/fixtures/clb-original-nine-apps.json');
 for(const file of ['apps.generated.json','apps.fallback.json']){
  const apps=await load('src/config/'+file);assert.deepEqual(apps.filter(a=>a.id!=='conversation-lab'),before);
  assert.equal(apps.find(a=>a.id==='generator').version,'7.1.100');
 }
});
