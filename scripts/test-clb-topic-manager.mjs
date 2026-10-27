/** Zero-dependency, no Actions billing. Run `node --test scripts/test-clb-topic-manager.mjs`.
 * Local authoring helper only: NO PUBLIC RELEASE OR OWNER/P5 EXCEPTION.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
const root=new URL('../src/conversation-lab-topics/',import.meta.url);
const js=await readFile(new URL('./app.js',root),'utf8');
const page=await readFile(new URL('./index.html',root),'utf8');
const gate=await readFile(new URL('./gate.js',root),'utf8');
const ctx={module:{exports:{}}};
runInNewContext(js,ctx,{timeout:5000});
const core=ctx.module.exports;
const fakeStation={title:'Topic',subtitle:'Practise reasoning',main:'What is important here?',
 questions:['Give an example.','Who benefits?','What could change?'],
 support:['One reason is...','For example...','I agree because...'],
 challenge:'Discuss the opposing view.',stretch:'Find a compromise.'};
const fakeLevel={warm:'Talk together.',stations:Array.from({length:8},()=>({...fakeStation})),
 vocab:Array.from({length:12},(_,i)=>['term'+i,'meaning'+i]),
 toolkit:Array.from({length:4},(_,i)=>['function'+i,'example'+i])};
const synthetic=()=>`<!doctype html><script>const CONTENT = ${JSON.stringify({en:{ui:{title:'My Lesson',hero:'Discuss together.'},levels:{B2:fakeLevel}}})};\nconst CZ_GLOSSARY = {};\n</script>`;
test('manager lives next to signed 0.11 instead of mutating its 120-file boundary',()=>{
 assert.ok(root.pathname.includes('/src/conversation-lab-topics/'));
 assert.ok(!root.pathname.includes('/src/conversation-lab/'));
 assert.ok(page.includes('<script src="./gate.js" type="module">'));
});
test('Studio gate uses native signed policy, teacher permit and top-level same origin',()=>{
 for(const token of ["initialiseAccess()","requiredTraining('conversation-lab')",
 "assertClbSignedTrainingPolicy","hasAppAccess('conversation-lab')",
 "window.top!==window.self",'https://daniel22-dev.github.io'])assert.ok(gate.includes(token),token);
 assert.ok(!gate.includes('localStorage.setItem'));
});
test('Czech authored filenames resolve to canonical signed public topic IDs',()=>{
 const cases={
  'Vánoce.html':'weihnachten',
  'Umela-inteligence_konverzacni-karta.html':'artificial-intelligence',
  'Prazdniny_konverzacni-karta.html':'summer-holidays',
  'Tlak-na-vykon_konverzacni-karta.html':'the-pressure-to-succeed',
  'Jidlo-piti-restaurace_konverzacni-karta.html':'jidlo-piti-restaurace',
  'Rodina_konverzacni-karta.html':'rodina'};
 for(const [name,expected] of Object.entries(cases))
  assert.equal(core.canonicalTopicId(core.slugify(name)),expected);
});
test('standalone parser accepts real CEFR shape without executing source JS',()=>{
 const card=core.parseCard(synthetic(),'demo-topic.html');
 assert.equal(card.id,'demo-topic');assert.equal(card.variantCount,1);
 assert.equal(card.questionCount,32);
 assert.equal(core.findLesson(card,'en','B2').stations.length,8);
});
test('unknown active code or malformed question count cannot become executable HTML',()=>{
 const card=core.parseCard(synthetic()+'<script>throw Error("never execute")</script>','demo-topic.html');
 assert.equal(card.variantCount,1);
 const bad={...card,content:{en:{...card.content.en,levels:{B2:{...fakeLevel,stations:[fakeStation]}}}}};
 assert.throws(()=>core.validateRecord(bad),/EIGHT_STATIONS/);
});
test('malicious HTML is exported as escaped JSON, not active markup',()=>{
 const text=core.safeSeedText({main:'<img src=x onerror=alert(1)>'});
 assert.ok(!text.includes('<img'));
 assert.equal(JSON.parse(text).main,'<img src=x onerror=alert(1)>');
});
test('no backend, bearer token, eval, or teaching credentials in manager app source',()=>{
 assert.ok(!/\beval\s*\(/.test(js));
 assert.ok(!/new\s+Function\s*\(/.test(js));
 assert.ok(!/credentials:\s*['"]include['"]/.test(js));
 assert.ok(!js.includes('Authorization: Bearer'));
 assert.ok(!js.includes('cloudflareApiToken'));
});

test('four optional student speaking supports survive static import and local backup',()=>{
 const fourth='My next test is on Friday. What about yours?';
 const extended={...fakeStation,support:[...fakeStation.support,fourth]};
 const level={...fakeLevel,stations:Array.from({length:8},()=>({...extended}))};
 const raw='<!doctype html><script>const CONTENT = '+JSON.stringify({
   en:{ui:{title:'Studying for tests'},levels:{A1:level}}
 })+';const CZ_GLOSSARY = {};</script>';
 const record=core.parseCard(raw,'study-skills.html');
 assert.equal(record.content.en.levels.A1.stations[0].support.length,4);
 assert.equal(record.content.en.levels.A1.stations[0].support[3],fourth);
 const backup=JSON.stringify({schema:'ghrab-clb-local-library-v1',items:[record]});
 const restored=core.restoreBackup(backup);
 assert.equal(restored[0].content.en.levels.A1.stations[7].support[3],fourth);
 const five=structuredClone(record);
 five.content.en.levels.A1.stations[0].support.push('A fifth forbidden support');
 assert.throws(()=>core.validateRecord(five),/STATION_CONTENT/);
 const unsafe=structuredClone(record);
 unsafe.content.en.levels.A1.stations[0].support[3]='\u0000invalid';
 assert.throws(()=>core.validateRecord(unsafe),/STATION_CONTENT/);
});
