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

test('CLB 0.12 public pilot URL is pinned, anonymous and strictly separate from Studio', async () => {
  const src = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  const match = src.match(/const CLB_012_PILOT_URL = "([^"]+)";/);
  assert.ok(match, 'Studio pilot URL is not pinned');
  const target = new URL(match[1]);
  assert.equal(target.href, 'https://conversation-lab-012-pilot.danikin35.workers.dev/');
  assert.equal(target.pathname, '/');
  assert.equal(target.search, '');
  assert.equal(target.hash, '');
  assert.equal(target.username, '');
  assert.equal(target.password, '');
  assert.notEqual(target.origin, 'https://daniel22-dev.github.io');
});

test('CLB pilot shortcut is gated by signed Studio access, not shown in colleague preview or maintenance', async () => {
  const src = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  const begin = src.indexOf('function portalAppCard(');
  const end = src.indexOf('function renderExtraApps(', begin);
  assert.ok(begin >= 0 && end > begin, 'Portal card source was not found');
  const card = src.slice(begin, end);
  for (const required of [
    'const access = hasAppAccess(app.id)',
    'if (access.enabled) {',
    'const previewMode = isColleaguePreview()',
    'app.id === "conversation-lab"',
    '!previewMode',
    'canLaunchForOperationalStatus(operationalStatus)',
    'pilot.href = CLB_012_PILOT_URL',
    'pilot.target = "_blank"',
    'pilot.rel = "noopener noreferrer"',
    'pilot.referrerPolicy = "no-referrer"',
  ]) assert.ok(card.includes(required), required);
  assert.ok(card.indexOf('if (access.enabled) {') < card.indexOf('pilot.href = CLB_012_PILOT_URL'));
  assert.ok(card.indexOf('actions.append(launch)') < card.indexOf('actions.append(pilot)'));
  assert.ok(card.includes('actions.classList.add("has-clb-012-pilot")'));
  assert.doesNotMatch(card, /pilot\\.href\\s*\\+|permit=.*pilot|token=.*pilot/);
});

test('topic manager links to the same public pilot without credentials or referrer', async () => {
  const src = await readFile(new URL('../src/conversation-lab-topics/index.html', import.meta.url), 'utf8');
  const marker = '<div class="toolbar-actions" data-teacher-only>';
  const start = src.indexOf(marker);
  assert.ok(start >= 0);
  const toolbar = src.slice(start, src.indexOf('</div>', start));
  assert.match(toolbar, /href="https:\/\/conversation-lab-012-pilot\\.danikin35\\.workers\\.dev\//);
  assert.match(toolbar, /target="_blank"/);
  assert.match(toolbar, /rel="noopener noreferrer"/);
  assert.match(toolbar, /referrerpolicy="no-referrer"/);
  assert.match(toolbar, /Pilot 0\\.12/);
  assert.match(toolbar, /href="https:\/\/conversation-lab-ghrab\\.pages\\.dev\//);
});

test('pilot CTA is responsive; signed 0.11 Studio registry and release data remain untouched', async () => {
  const css = await readFile(new URL('../src/polish.css', import.meta.url), 'utf8');
  assert.match(css, /\\.portal-card-bottom\\.has-clb-012-pilot\\s*\\{[^}]*flex-wrap:\\s*wrap/s);
  assert.match(css, /@media \\(max-width:\\s*440px\\)/);
  const list = JSON.parse(await readFile(new URL('../src/config/apps.generated.json', import.meta.url), 'utf8'));
  const app = list.find(x => x.id === 'conversation-lab');
  assert.equal(app.version, '0.11.0');
  assert.equal(app.integration.launchMode, 'studio-teacher');
  assert.equal(app.integration.externalTargetUrl, 'https://conversation-lab-ghrab.pages.dev/');
  const legacy = await readFile(new URL('../src/conversation-lab/teacher-entry.js', import.meta.url), 'utf8');
  assert.doesNotMatch(legacy, /conversation-lab-012-pilot/);
});

