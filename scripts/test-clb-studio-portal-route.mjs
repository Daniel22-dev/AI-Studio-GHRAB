import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {studioPortalDestination} from '../src/integration/conversation-lab/portal-route.js';
const external=Object.freeze({id:'conversation-lab',integration:{launchMode:'external-protected'}});
test('CLB teacher portal opens verified same-origin protected Studio launcher and never raw public URL',()=>{
 const actual=studioPortalDestination(external,'./');
 assert.equal(actual,'./app/external/?app=conversation-lab');
 assert.ok(!actual.includes('pages.dev'));
 assert.ok(!actual.includes('permit'));
 assert.equal(studioPortalDestination(external,'../'),'../app/external/?app=conversation-lab');
});
test('CLB direct/iframe launch and missing guard fail closed',()=>{
 for(const launchMode of [undefined,null,'iframe','direct','external','normal']){
  assert.throws(()=>studioPortalDestination({id:'conversation-lab',integration:{launchMode}},'./'),/CLB_E9_PORTAL_REQUIRES_PROTECTED_LAUNCHER/);
 }
 for(const app of [null,{}, {id:''}])assert.throws(()=>studioPortalDestination(app,'./'),/STUDIO_APP_ID_REQUIRED/);
});
test('CLB v0.11.0 teacher route remains inside Studio without Cloudflare iframe or permit in URL',()=>{
 const teacher={id:'conversation-lab',version:'0.11.0',integration:{
   launchMode:'studio-teacher',releaseId:'cl-master-72-20261019-r1',
   teacherTrainingRequired:true,credentialBridgeAllowed:false,
   securityBoundary:'isolated-anonymous-read-only'
 }};
 assert.equal(studioPortalDestination(teacher,'./'),'./conversation-lab/');
 assert.equal(studioPortalDestination(teacher,'../'),'../conversation-lab/');
 assert.equal(studioPortalDestination(teacher,'/AI-Studio-GHRAB/'),'/AI-Studio-GHRAB/conversation-lab/');
 assert.doesNotMatch(studioPortalDestination(teacher,'./'),/pages\.dev|permit|token|[?]/);
 for(const patch of [
   {version:'0.9.2'},
   {version:'0.10.1'},
   {integration:{...teacher.integration,releaseId:'cl-three-topics-72-20261019-r2'}},
   {integration:{...teacher.integration,releaseId:'cl-ai-b1-pilot-20261018-r2'}},
   {integration:{...teacher.integration,teacherTrainingRequired:false}},
   {integration:{...teacher.integration,credentialBridgeAllowed:true}},
   {integration:{...teacher.integration,securityBoundary:'allow-iframe'}}
 ]){
   assert.throws(()=>studioPortalDestination({...teacher,...patch},'./'),/CLB_E9_STUDIO_TEACHER_NOT_SIGNED_READY/);
 }
});
test('Nine pre-existing Studio apps retain the exact viewer route byte-for-byte',()=>{
 const ids=['generator','differentiator','essay-evaluator','correspondence','ludus','activity-builder','sortio','lesson-hub','maturita-desk'];
 for(const id of ids){
  assert.equal(studioPortalDestination({id},'./'),`./app/?app=${id}`);
  assert.equal(studioPortalDestination({id},'../'),`../app/?app=${id}`);
 }
});
test('Home portal keeps hasAppAccess and protected backend guard remains enforcing signed CLB-01',async()=>{
 const app=await readFile(new URL('../src/app.js',import.meta.url),'utf8');
 const entry=await readFile(new URL('../src/app/external/launcher.js',import.meta.url),'utf8');
 assert.match(app,/return studioPortalDestination\(app, base\)/);
 assert.match(app,/const access = hasAppAccess\(app\.id\)/);
 assert.match(entry,/assertClbSignedTrainingPolicy\(requiredTraining\(app\.id\)\)/);
 assert.match(entry,/checkedConversationLabTarget\(app, \{ studioOrigin: location\.origin \}\)/);
});
