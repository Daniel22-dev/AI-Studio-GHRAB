import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {studioPortalDestination,studioPrimaryPortalDestination,CLB_012_PILOT_URL} from '../src/integration/conversation-lab/portal-route.js';
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
 assert.match(app,/return studioPrimaryPortalDestination\(app, base\)/);
 assert.match(app,/const access = hasAppAccess\(app\.id\)/);
 assert.match(entry,/assertClbSignedTrainingPolicy\(requiredTraining\(app\.id\)\)/);
 assert.match(entry,/checkedConversationLabTarget\(app, \{ studioOrigin: location\.origin \}\)/);
});


test('Main Conversation Lab CTA opens all 0.12 cards; signed 0.11 remains available', () => {
  const teacher={
    id:'conversation-lab',version:'0.11.0',
    integration:{launchMode:'studio-teacher',releaseId:'cl-master-72-20261019-r1',
      teacherTrainingRequired:true,credentialBridgeAllowed:false,
      securityBoundary:'isolated-anonymous-read-only'}
  };
  assert.equal(CLB_012_PILOT_URL, 'https://conversation-lab-012-pilot.danikin35.workers.dev/');
  assert.equal(studioPrimaryPortalDestination(teacher, './'), CLB_012_PILOT_URL);
  assert.equal(studioPrimaryPortalDestination(teacher, '../'), CLB_012_PILOT_URL);
  assert.equal(studioPortalDestination(teacher, './'), './conversation-lab/');
  assert.equal(studioPortalDestination(teacher, '../'), '../conversation-lab/');
  for (const id of ['generator','differentiator','essay-evaluator','correspondence','ludus','activity-builder','sortio','lesson-hub','maturita-desk']) {
    assert.equal(studioPrimaryPortalDestination({id}, './'), studioPortalDestination({id}, './'));
  }
  // Upgrading the signed legacy content must not block unrelated public 0.12.
  for (const upgraded of [
    {...teacher,version:'0.12.0'},
    {...teacher,integration:{...teacher.integration,releaseId:'later-signed-release'}},
  ]) assert.equal(studioPrimaryPortalDestination(upgraded,'./'),CLB_012_PILOT_URL);
  for (const corrupted of [
    {...teacher,integration:{...teacher.integration,credentialBridgeAllowed:true}},
    {...teacher,integration:{...teacher.integration,launchMode:'direct'}},
    {...teacher,integration:{...teacher.integration,teacherTrainingRequired:false}},
  ]) assert.throws(()=>studioPrimaryPortalDestination(corrupted,'./'),/CLB_012_STUDIO_LAUNCH_NOT_AUTHORIZED/);
  const target=new URL(CLB_012_PILOT_URL);
  assert.equal(target.protocol,'https:');
  assert.equal(target.pathname,'/');
  assert.equal(target.search,'');
  assert.equal(target.hash,'');
  assert.equal(target.username,'');
  assert.equal(target.password,'');
});

test('Portal main button, card click and keyboard share the protected primary route', async () => {
  const src=await readFile(new URL('../src/app.js',import.meta.url),'utf8');
  assert.match(src,/return studioPrimaryPortalDestination\(app, base\)/);
  assert.match(src,/const destination = embeddedApplicationUrl\(app\);/);
  assert.match(src,/outbound\.href = destination/);
  assert.match(src,/outbound\.rel = "noreferrer noopener"/);
  assert.match(src,/outbound\.referrerPolicy = "no-referrer"/);
  assert.match(src,/outbound\.click\(\)/);
  assert.match(src,/window\.location\.assign\(destination\)/);
  assert.match(src,/catch \(error\) \{[\s\S]*?Spuštění aplikace se nezdařilo/);
  const begin=src.indexOf('function portalAppCard(');
  const end=src.indexOf('function renderExtraApps(',begin);
  assert.ok(begin>=0 && end>begin);
  const card=src.slice(begin,end);
  assert.match(card,/const access = hasAppAccess\(app\.id\)/);
  assert.match(card,/if \(access\.enabled\) \{/);
  assert.match(card,/const previewMode = isColleaguePreview\(\)/);
  assert.match(card,/launch\.disabled = previewMode/);
  assert.equal((card.match(/launchApp\(app, article\)/g)||[]).length,3,
    'button, tile click and keyboard must share one gated launch');
  assert.match(card,/canLaunchForOperationalStatus\(operationalStatus\)/);
  assert.match(card,/Spustit aplikaci/);
  assert.match(card,/nové konverzační karty 0\.12/);
  assert.match(card,/has-clb-version-switch/);
  assert.doesNotMatch(card,/pilot\.href\s*=/);
});

test('Signed legacy 0.11 remains reachable only by gated secondary link and teacher-entry',async()=>{
  const src=await readFile(new URL('../src/app.js',import.meta.url),'utf8');
  const begin=src.indexOf('function portalAppCard(');
  const end=src.indexOf('function renderExtraApps(',begin);
  const card=src.slice(begin,end);
  const gate=card.indexOf('if (access.enabled) {');
  const old=card.indexOf('legacy.href = legacyDestination');
  assert.ok(gate>=0 && old>gate);
  assert.match(card,/!previewMode &&/);
  assert.match(card,/canLaunchForOperationalStatus\(operationalStatus\)/);
  assert.match(card,/Původní 0\.11/);
  assert.match(card,/legacy\.rel = "noopener noreferrer"/);
  assert.match(card,/legacyDestination = studioPortalDestination\(app, base\)/);
  assert.match(card,/if \(legacyDestination\)/);
  const legacy=await readFile(new URL('../src/conversation-lab/teacher-entry.js',import.meta.url),'utf8');
  assert.match(legacy,/assertClbSignedTrainingPolicy\(requiredTraining\('conversation-lab'\)\)/);
  assert.match(legacy,/hasAppAccess\('conversation-lab'\)/);
  assert.match(legacy,/checkedConversationLabMasterTarget/);
  assert.doesNotMatch(legacy,/conversation-lab-012-pilot/);
  const reg=JSON.parse(await readFile(new URL('../src/config/apps.generated.json',import.meta.url),'utf8'))
    .find(x=>x.id==='conversation-lab');
  assert.equal(reg.version,'0.11.0');
  assert.equal(reg.integration.launchMode,'studio-teacher');
  assert.equal(reg.integration.externalTargetUrl,'https://conversation-lab-ghrab.pages.dev/');
});

test('Teacher Topic Manager keeps both separate 0.11 and 0.12 destinations',async()=>{
 const src=await readFile(new URL('../src/conversation-lab-topics/index.html',import.meta.url),'utf8');
 const start=src.indexOf('<div class="toolbar-actions" data-teacher-only>');
 assert.ok(start>=0);
 const toolbar=src.slice(start,src.indexOf('</div>',start));
 assert.match(toolbar,/conversation-lab-012-pilot\.danikin35\.workers\.dev/);
 assert.match(toolbar,/conversation-lab-ghrab\.pages\.dev/);
 assert.match(toolbar,/referrerpolicy="no-referrer"/);
});

test('Portal version switch remains responsive and maintains current signed registry',async()=>{
 const css=await readFile(new URL('../src/polish.css',import.meta.url),'utf8');
 assert.match(css,/\.portal-card-bottom\.has-clb-version-switch\s*\{[^}]*flex-wrap:\s*wrap/s);
 assert.match(css,/\.clb-011-legacy-link/);
 assert.match(css,/@media \(max-width:\s*440px\)/);
 const app=await readFile(new URL('../src/app.js',import.meta.url),'utf8');
 assert.match(app,/pilot 0\.12 \/ archiv 0\.11/);
 assert.doesNotMatch(app,/const CLB_012_PILOT_URL/);
});
