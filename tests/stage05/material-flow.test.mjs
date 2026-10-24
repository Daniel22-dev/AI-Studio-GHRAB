import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import {
  CURRENT_WORKSPACE_KEY, LEGACY_WORKSPACE_KEY, createWorkspaceAdapter, mergeWorkspace,
  inspectOutboundMaterial, validateRegistry, assessContent, resolveTargets,
  createHandoffTransport
} from '../../src/material-flow/material-flow.js';
import { validateMaterialPackage } from '../../src/shared/material-validator.js';
import { createMaterialRepository, MaterialServerUnavailableError } from '../../src/library/material-service.js';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const registry = JSON.parse(fs.readFileSync(path.join(root,'src/config/material-flow-registry.json'),'utf8'));
const apps = JSON.parse(fs.readFileSync(path.join(root,'src/config/apps.generated.json'),'utf8'));
const studioUrl = 'https://daniel22-dev.github.io/AI-Studio-GHRAB/';
const material = (id='m1') => ({
  schema: 'ghrab-material-v1', id, version: 1, title:'Adjectives', subject:'English',
  language:'en', yearGroup:'1',level:'B1',objectives:['Compare two items'],
  content:{sourceText:'A familiar topic for discussion.', vocabulary: [],tasks:[
    {id:'q1',type:'select',prompt:'Pick A',options:['A','B','C','D'],answer:0,difficulty:1},
    {id:'q2',type:'select',prompt:'Pick B',options:['A','B','C','D'],answer:1,difficulty:1},
    {id:'q3',type:'select',prompt:'Pick C',options:['A','B','C','D'],answer:0,difficulty:1},
  ]}, quality:{status:'ai-draft'}, provenance:{containsPersonalData:false}
});
const memory = () => {
  const map = new Map(); let failKey=null;
  return {getItem:(key)=>map.get(key)??null,setItem:(key,val)=>{if(key===failKey)throw new Error('quota');map.set(key,String(val));},removeItem:(key)=>map.delete(key),setFail:(key)=>{failKey=key;},get length(){return map.size;},key:(i)=>[...map.keys()][i]??null};
};
function platform(storage=memory()) {
  const context={URL,TextEncoder,TextDecoder,Date,JSON,Math,Object,Array,Set,Map,Promise,String,Number,Boolean,RegExp,Error,TypeError,Uint8Array,console,
    crypto:webcrypto,localStorage:storage,sessionStorage:memory(),
    performance:{mark(){},measure(){},getEntriesByName(){return[]}},
    location:{href:studioUrl},
    document:{currentScript:{src:studioUrl+'ghrab/ghrab-platform.js'},documentElement:{dataset:{ghrabAppId:'ai-studio',ghrabAppVersion:'0.21.253'}},getElementById(){return null},readyState:'loading',addEventListener(){}},
  };
  context.window=context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root,'src/platform/ghrab-platform.js'),'utf8'),context);
  return {bridge:context.GHRAB_PLATFORM.bridge,storage};
}
const target = (id,launchUrl) => ({id,launchUrl:launchUrl||`https://daniel22-dev.github.io/${id==='ludus'?'Ludus':id==='generator'?'generator-testu':'diferenciator'}/`});
const available=[target('generator'),target('differentiator'),target('ludus')];

test('canonical workspace merges legacy and modern without losing private drafts',()=>{
 const st=memory();let privateDraft=material('private');privateDraft.provenance.containsPersonalData=true;
 st.setItem(LEGACY_WORKSPACE_KEY,JSON.stringify([privateDraft]));st.setItem(CURRENT_WORKSPACE_KEY,JSON.stringify([material('public')]));
 const w=createWorkspaceAdapter(st,{validator:validateMaterialPackage});assert.equal(w.list().length,2);
 assert.equal(w.list().find(x=>x.id==='private').provenance.containsPersonalData,true);
 w.migrate();assert.deepEqual(JSON.parse(st.getItem(CURRENT_WORKSPACE_KEY)),JSON.parse(st.getItem(LEGACY_WORKSPACE_KEY)));
 w.save(material('third'));assert.equal(w.list().length,3);
 w.remove('private');assert.equal(w.list().length,2);
 assert.equal(JSON.parse(st.getItem(LEGACY_WORKSPACE_KEY)).some(x=>x.id==='private'),false);
});
test('version precedence, corrupt storage and rollback on second write failure',()=>{
 const st=memory();const newer={...material('same'),version:2};const older=material('same');
 st.setItem(CURRENT_WORKSPACE_KEY,JSON.stringify([older]));st.setItem(LEGACY_WORKSPACE_KEY,JSON.stringify([newer]));
 const w=createWorkspaceAdapter(st,{validator:validateMaterialPackage});assert.equal(w.list()[0].version,2);
 assert.throws(()=>w.save(older),/stale-workspace-version/);
 st.setItem(CURRENT_WORKSPACE_KEY,'not-json');assert.equal(w.list()[0].version,2);
 st.setItem(CURRENT_WORKSPACE_KEY,JSON.stringify([older]));const old=st.getItem(CURRENT_WORKSPACE_KEY);
 st.setFail(LEGACY_WORKSPACE_KEY);assert.throws(()=>w.save(material('other')),/quota/);
 assert.equal(st.getItem(CURRENT_WORKSPACE_KEY),old);
});
test('outbound preflight accepts anonymous content and rejects PII or unsafe material',()=>{
 assert.equal(validateMaterialPackage(material()).valid,true);
 assert.equal(inspectOutboundMaterial(material(),{validator:validateMaterialPackage}).ok,true);
 for(const change of [
   m=>m.provenance.containsPersonalData=true,
   m=>m.provenance.containsPersonalData=undefined,
   m=>m.content.sourceText='teacher@school.cz',
   m=>m.studentRoster=[{firstName:'name'}],
   m=>m.content.sourceText='<script>danger()</script>',
   m=>m.content.sourceText='X'.repeat(520000),
   m=>m.schema='not-material',
 ]){const m=material();change(m);assert.equal(inspectOutboundMaterial(m,{validator:validateMaterialPackage}).ok,false);}
});
test('declarative manifest contract, registry validation and per-content requirements',()=>{
 assert.equal(validateRegistry(registry),registry);
 assert.throws(()=>validateRegistry({...registry,targets:[registry.targets[0],registry.targets[0]]}),/registry-id/);
 assert.throws(()=>validateRegistry({...registry,targets:[{...registry.targets[0],bridgeVersion:1}]}),/registry-bridge/);
 const result=resolveTargets(material(),available,registry,{validator:validateMaterialPackage,studioUrl});
 assert.deepEqual(result.map(x=>[x.id,x.reason]),[['generator','compatible'],['differentiator','compatible'],['ludus','compatible']]);
 assert.equal(assessContent({...material(),objectives:[]},registry.targets[1]),'needs-objectives');
 assert.equal(assessContent({...material(),content:{sourceText:'',tasks:[]}},registry.targets[2]),'needs-tasks');
});
test('LUDUS rejects two-option MC4 and malformed imported task shapes',()=>{
  const two=material();
  two.content.tasks.forEach(t=>{t.options=['A','B'];});
  assert.equal(assessContent(two,registry.targets[2]),'needs-tasks');
  assert.deepEqual(resolveTargets(two,available,registry,{validator:validateMaterialPackage,studioUrl})
    .map(x=>[x.id,x.reason]),[['generator','compatible'],['differentiator','compatible'],['ludus','needs-tasks']]);
  assert.equal(assessContent(material(),registry.targets[2]),'compatible');
  const bad=material();bad.content.tasks.forEach(t=>{t.answer=7;});
  assert.equal(assessContent(bad,registry.targets[2]),'needs-tasks');
  const missing=material();missing.content.tasks.forEach(t=>{t.type='short';t.options=[];t.answer='word';});
  assert.equal(assessContent(missing,registry.targets[2]),'needs-tasks');
  const malformed=JSON.parse(JSON.stringify(registry));
  malformed.targets[2].requirements.taskOptionRules.select.exactOptions=-1;
  assert.throws(()=>validateRegistry(malformed),/option-rules/);
});
test('LUDUS preflight matches first 12 imported supported tasks and cannot hide invalid tasks',()=>{
 const withInvalidLater=material();withInvalidLater.content.tasks.push({
   id:'q4',type:'select',prompt:'Four choices required',options:['A','B'],answer:0,difficulty:1
 });
 assert.equal(assessContent(withInvalidLater,registry.targets[2]),'needs-tasks');

 const outsideLimit=material();
 outsideLimit.content.tasks=[
   ...Array.from({length:12},(_,i)=>({...material().content.tasks[0],id:'valid-'+i})),
   {id:'q13',type:'select',prompt:'Not imported',options:['A','B'],answer:0,difficulty:1}
 ];
 assert.equal(assessContent(outsideLimit,registry.targets[2]),'compatible');
 const hiddenValid=material();
 hiddenValid.content.tasks=[
   ...Array.from({length:12},(_,i)=>({id:'bad-'+i,type:'select',prompt:'Missing choices',options:['A','B'],answer:0,difficulty:1})),
   ...Array.from({length:3},(_,i)=>({...material().content.tasks[0],id:'valid-after-'+i}))
 ];
 assert.equal(assessContent(hiddenValid,registry.targets[2]),'needs-tasks');
 const open=material();
 open.content.tasks.unshift({id:'ignored',type:'open',prompt:'Explain your reasoning',difficulty:2});
 assert.equal(assessContent(open,registry.targets[2]),'compatible');
});

test('LUDUS truefalse accepts playable answers and rejects out-of-range or ambiguous answers',()=>{
 const base=material();
 const tf=(answer,options=['Ano','Ne'])=>({...base.content.tasks[0],type:'truefalse',options,answer});
 const valid=material();valid.content.tasks=[tf(0),tf('false'),tf(1,[])];
 assert.equal(assessContent(valid,registry.targets[2]),'compatible');
 for (const answer of [2,-1,1.5,'maybe',null]) {
   const invalid=material();invalid.content.tasks=[tf(answer),tf(answer),tf(answer)];
   assert.equal(assessContent(invalid,registry.targets[2]),'needs-tasks',String(answer));
 }
 const oneOption=material();oneOption.content.tasks=[tf(0,['Only']),tf(1,['Only']),tf('true',['Only'])];
 assert.equal(assessContent(oneOption,registry.targets[2]),'needs-tasks');
 const invalidRegistry=JSON.parse(JSON.stringify(registry));
 invalidRegistry.targets[2].requirements.maxImportedTasks=0;
 assert.throws(()=>validateRegistry(invalidRegistry),/import-limit/);
 invalidRegistry.targets[2].requirements.maxImportedTasks=12;
 invalidRegistry.targets[2].requirements.rejectInvalidTasks='yes';
 assert.throws(()=>validateRegistry(invalidRegistry),/task-strictness/);
});

test('different origins, spoofed paths, incompatible content and unverified consumers fail closed',()=>{
 const cross=resolveTargets(material(),[target('generator','https://evil.example/generator/')],registry,{validator:validateMaterialPackage,studioUrl});
 assert.equal(cross[0].reason,'different-origin');
 const mismatched=resolveTargets(material(),[{...target('generator','https://daniel22-dev.github.io/evil/'),paths:{app:'https://daniel22-dev.github.io/generator-testu/'}}],registry,{validator:validateMaterialPackage,studioUrl});
 assert.equal(mismatched[0].reason,'launch-url-mismatch');
 const other=resolveTargets(material(),[target('some-other-app')],registry,{validator:validateMaterialPackage,studioUrl});
 assert.equal(other[0].reason,'no-import-contract');
 const unverified=JSON.parse(JSON.stringify(registry));unverified.targets[0].verification='disabled';
 assert.equal(resolveTargets(material(),[target('generator')],unverified,{validator:validateMaterialPackage,studioUrl})[0].reason,'inbound-disabled');
});
for(const id of ['generator','differentiator','ludus']) {
 test(`real Platform Bridge 2.0 packet is validated and consumed once by ${id}`,()=>{
   const p=platform(); const transport=createHandoffTransport({bridge:p.bridge,validator:validateMaterialPackage,registry,apps:available,studioUrl});
   const result=transport.prepare({targetId:id,material:material(),sourceAppVersion:'0.21.253'});
   assert.equal(result.packet.target,id);
   assert.equal(new URL(result.launchUrl).origin,new URL(studioUrl).origin);
   const pending=transport.pending(); assert.equal(pending?.target,id);
   assert.equal(p.bridge.validate(pending.packet,{target:id,maxBytes:500000}).ok,true);
   assert.throws(()=>transport.prepare({targetId:id,material:material()}),/pending/);
   const consumed=p.bridge.take({target:id,maxBytes:500000});assert.equal(consumed.material.id,'m1');
   assert.equal(p.bridge.take({target:id,maxBytes:500000}),null);
   assert.equal(transport.pending(),null);
 });
}
test('expired and malformed handoffs are rejected by real bridge',()=>{
 const p=platform();const t=createHandoffTransport({bridge:p.bridge,registry,apps:available,validator:validateMaterialPackage,studioUrl});
 t.prepare({targetId:'generator',material:material()});
 const packet=JSON.parse(p.storage.getItem('ghrab.platform.handoff.v2'));
 packet.expiresAt=new Date(Date.now()-2000).toISOString();
 p.storage.setItem('ghrab.platform.handoff.v2',JSON.stringify(packet));
 p.storage.removeItem('ghrab.handoff.v1');
 assert.equal(t.pending(),null);
 t.prepare({targetId:'generator',material:material()});
 p.storage.setItem('ghrab.platform.handoff.v2','{"schema":"invalid"}');
 p.storage.removeItem('ghrab.handoff.v1');
 assert.equal(t.pending(),null);
});
test('TTL bounds and unsafe material do not replace existing pending handoff',()=>{
 const p=platform();const t=createHandoffTransport({bridge:p.bridge,registry,apps:available,validator:validateMaterialPackage,studioUrl});
 assert.throws(()=>t.prepare({targetId:'generator',material:material(),ttlMs:1}),/ttl/);
 t.prepare({targetId:'generator',material:material()});const before=p.storage.getItem('ghrab.platform.handoff.v2');
 assert.throws(()=>t.prepare({targetId:'ludus',material:material('next')}),/pending/);
 assert.throws(()=>t.prepare({targetId:'generator',material:{...material(),studentEmail:'student@example.org'}}),/incompatible/);
 assert.equal(p.storage.getItem('ghrab.platform.handoff.v2'),before);
});
test('legacy payload is still readable by v2 bridge, but one-time consumption removes both keys',()=>{
 const p=platform();const now=Date.now();
 p.storage.setItem('ghrab.handoff.v1',JSON.stringify({schema:'ghrab-handoff-v1',target:'generator',createdAt:new Date(now).toISOString(),expiresAt:new Date(now+120000).toISOString(),sourceAppId:'ai-studio',sourceAppVersion:'0.21.253',material:material()}));
 assert.equal(p.bridge.peek({target:'generator'})?.material?.id,'m1');
 assert.equal(p.bridge.take({target:'generator'})?.material?.id,'m1');
 assert.equal(p.bridge.peek({target:'generator'}),null);
});
test('registry allowlisted paths prevent target manifest from redirecting inside same origin',()=>{
 const lookalike={...target('generator','https://daniel22-dev.github.io/another-repo/'),paths:{app:'https://daniel22-dev.github.io/another-repo/'}};
 const rows=resolveTargets(material(),[lookalike],registry,{validator:validateMaterialPackage,studioUrl});
 assert.equal(rows[0].compatible,false);
 assert.equal(rows[0].reason,'launch-url-mismatch');
 const hostile={...lookalike,materialFlow:{...registry.targets[0],id:'generator',allowedLaunchPaths:['/another-repo/']}};
 assert.equal(resolveTargets(material(),[hostile],registry,{validator:validateMaterialPackage,studioUrl})[0].reason,'launch-url-mismatch');
});
test('workspace reconciliation keeps more than the old 20-item cutoff without silent loss',()=>{
 const st=memory();const left=Array.from({length:20},(_,i)=>material('old-'+i));const right=Array.from({length:20},(_,i)=>material('new-'+i));
 st.setItem(LEGACY_WORKSPACE_KEY,JSON.stringify(left));st.setItem(CURRENT_WORKSPACE_KEY,JSON.stringify(right));
 const w=createWorkspaceAdapter(st,{validator:validateMaterialPackage});
 assert.equal(w.list().length,40);w.migrate();assert.equal(JSON.parse(st.getItem(CURRENT_WORKSPACE_KEY)).length,40);
});
test('new static Material Flow module is a mandatory offline precache dependency',()=>{
  const portal=fs.readFileSync(path.join(root,'src/app.js'),'utf8');
  const builder=fs.readFileSync(path.join(root,'scripts/build.mjs'),'utf8');
  assert.ok(portal.includes('from "./material-flow/material-flow.js"'),"Portal must statically import Material Flow");
  assert.ok(builder.includes('"./material-flow/material-flow.js"'),"Material Flow static module must be precached");
});
test('Studio-only editor selection contains no material text in navigation URL',()=>{
 const library=fs.readFileSync(path.join(root,'src/library/library.js'),'utf8');
 const workflow=fs.readFileSync(path.join(root,'src/workflow/workflow.js'),'utf8');
 assert.match(library,/sessionStorage\.setItem\("ghrab\.ai-studio\.material-flow\.edit-selection\.v1", material\.id\)/);
 assert.match(library,/location\.assign\("\.\.\/workflow\/"\)/);
 assert.match(workflow,/sessionStorage\.removeItem\(key\)/);
 assert.match(workflow,/G\.getWorkspace\(\)\.find\(\(row\) => row\.id === id\)/);
});
test('portable Save to Studio source helper rejects personal data before touching the bridge',async()=>{
 const old=globalThis.GHRAB_PLATFORM;
 let writes=0;
 globalThis.GHRAB_PLATFORM={bridge:{create(){writes+=1;throw new Error('unexpected-bridge-write');}}};
 try {
   const {saveMaterialToStudio}=await import('../../src/integration/save-to-studio.js');
   for(const update of [
      m=>m.provenance.containsPersonalData=true,
      m=>m.studentName='Private Student',
      m=>m.content.sourceText='student@school.cz',
      m=>m.content.context={school:{class_list:[{surname:'Private'}]}},
      m=>m.content.meta={'student-email':'hidden@example.org'},
      m=>m.content.metadata={'parent_telephone':'12345',attendance:['Here']},
      m=>m.content.sourceText='<iframe src="https://example.invalid"></iframe>',
      m=>m.content.sourceText='Select option with onload=bad()',
      m=>m.content.sourceText='javascript:alert(1)',
   ]) {
     const testMaterial=material();update(testMaterial);
     const result=saveMaterialToStudio({material:testMaterial,studioUrl:studioUrl,navigate:false});
     assert.equal(result.ok,false);assert.equal(result.reason,'unsafe-material');
   }
   assert.equal(writes,0);
 }finally{globalThis.GHRAB_PLATFORM=old;}
});

test('migration preserves raw corrupt legacy records and fails closed on writes', () => {
  const st = memory();
  const valid = material('safe');
  const malformed = { schema: 'ghrab-material-v1', id: 'legacy-unknown', customNotes: 'preserve my draft' };
  st.setItem(CURRENT_WORKSPACE_KEY, JSON.stringify([valid]));
  st.setItem(LEGACY_WORKSPACE_KEY, JSON.stringify([malformed]));
  const originalCurrent = st.getItem(CURRENT_WORKSPACE_KEY);
  const originalLegacy = st.getItem(LEGACY_WORKSPACE_KEY);
  const adapter = createWorkspaceAdapter(st, { validator: validateMaterialPackage });
  assert.deepEqual(adapter.list().map((x) => x.id), ['safe']);
  assert.throws(() => adapter.migrate(), /workspace-integrity-error/);
  assert.throws(() => adapter.save(material('another')), /workspace-integrity-error/);
  assert.throws(() => adapter.remove('safe'), /workspace-integrity-error/);
  assert.equal(st.getItem(CURRENT_WORKSPACE_KEY), originalCurrent);
  assert.equal(st.getItem(LEGACY_WORKSPACE_KEY), originalLegacy);
  st.setItem(LEGACY_WORKSPACE_KEY, '{not-json');
  assert.throws(() => adapter.migrate(), /workspace-integrity-error/);
  assert.equal(st.getItem(LEGACY_WORKSPACE_KEY), '{not-json');
});

test('nested roster aliases are rejected, but canonical provenance privacy flag is permitted', () => {
  const valid = material();
  assert.equal(inspectOutboundMaterial(valid, { validator: validateMaterialPackage }).ok, true);
  for (const key of ['student_name', 'student-email', 'pupilRoster', 'class_list', 'full_name', 'personal_data']) {
    const unsafe = material(); unsafe[key] = ['Candidate'];
    assert.ok(inspectOutboundMaterial(unsafe, { validator: validateMaterialPackage }).reasons.includes('student-record-field'), key);
  }
});

test('pending handoff cancellation requires same Studio source and exact packet id', () => {
  const p = platform();
  const t = createHandoffTransport({ bridge: p.bridge, registry, apps: available, validator: validateMaterialPackage, studioUrl, storage: p.storage });
  t.prepare({ targetId: 'generator', material: material() });
  assert.equal(t.cancelOwn(), true);
  assert.equal(p.storage.getItem('ghrab.platform.handoff.v2'), null);
  assert.equal(p.storage.getItem('ghrab.handoff.v1'), null);
  assert.equal(t.cancelOwn(), false);
  p.bridge.create({ target: 'ai-studio', material: material(), sourceAppId: 'differentiator', sourceAppVersion: '1.3.51', studioUrl });
  const before = p.storage.getItem('ghrab.platform.handoff.v2');
  assert.equal(t.cancelOwn(), false);
  assert.equal(p.storage.getItem('ghrab.platform.handoff.v2'), before);
});

test('source helper rejects same-origin lookalike Studio paths before bridge storage', async () => {
  const previousBridge = globalThis.GHRAB_PLATFORM;
  const previousLocation = globalThis.location;
  globalThis.location = {href: studioUrl};
  let writes = 0;
  globalThis.GHRAB_PLATFORM = {bridge:{create() {writes++;return {};}}};
  try {
    const {saveMaterialToStudio} = await import('../../src/integration/save-to-studio.js');
    assert.deepEqual(
      [saveMaterialToStudio({material:material(),studioUrl:'https://daniel22-dev.github.io/rogue/',navigate:false}).reason,
       saveMaterialToStudio({material:material(),studioUrl:'https://untrusted.example/AI-Studio-GHRAB/',navigate:false}).reason],
      ['untrusted-studio-path','different-origin']
    );
    assert.equal(writes, 0);
  } finally {
    if(previousLocation === undefined) delete globalThis.location; else globalThis.location=previousLocation;
    globalThis.GHRAB_PLATFORM=previousBridge;
  }
});


test('school-server material publication and fork reject PII even with a false or absent privacy flag',async()=>{
 const config={
   profile:'school-server',
   studioBaseUrl:'https://school.example/ai-studio/',
   apiBaseUrl:'https://school.example/api/v1/',
   features:{schoolServerConnected:true,sharedMaterialLibrary:true},
   endpoints:{materials:'materials'}
 };
 const G={deploymentReady:Promise.resolve(config),validateMaterialPackage,t:(cs)=>cs,VERSION:'0.21.255'};
 const repo=createMaterialRepository(G);
 const previousFetch=globalThis.fetch;
 const calls=[];
 globalThis.fetch=async (url,opts)=>{
   calls.push({url:String(url),opts});
   return {ok:true,status:201,json:async()=>({schema:'ghrab-shared-material-record-v1',id:'test-safe',material:material()})};
 };
 try{
   const mutations=[
     m=>delete m.provenance.containsPersonalData,
     m=>{m.provenance.containsPersonalData=true;},
     m=>{m.content.sourceText='Synthetic educator: schoolteacher@example.test';},
     m=>{m.content.metadata={class_list:[{studentName:'Sensitive pupil'}]};},
     m=>{m.content.sourceText='<img src=x onerror=alert(1)>';},
     m=>{m.student_email='secret@example.test';}
   ];
   for(const mutate of mutations){
     const unsafe=material();mutate(unsafe);
     await assert.rejects(repo.publishToCommission(unsafe,'english'),/anonymizace/);
   }
   assert.equal(calls.length,0,'Rejected material must never hit the network');
   const accepted=await repo.publishToCommission(material(),'english');
   assert.equal(accepted.id,'test-safe');
   assert.equal(calls.length,1);
   assert.equal(calls[0].url,'https://school.example/api/v1/materials');
   assert.equal(calls[0].opts.credentials,'same-origin');
   const request=JSON.parse(calls[0].opts.body);
   assert.equal(request.visibility.commissionId,'english');
   assert.equal(request.material.provenance.containsPersonalData,false);
   globalThis.fetch=async () => ({ok:true,status:200,json:async()=>({
     material:{...material(),content:{...material().content,meta:{studentName:'Secret'}}}
   })});
   await assert.rejects(repo.forkToWorkspace('test-safe'),/anonymizace/);
 } finally {globalThis.fetch=previousFetch;}
});

test('school-server material API never sends teaching data to another origin or escapes API prefix',async()=>{
 const base={
   profile:'school-server',studioBaseUrl:'https://school.example/ai-studio/',
   apiBaseUrl:'https://school.example/api/v1/',
   features:{schoolServerConnected:true,sharedMaterialLibrary:true},
   endpoints:{materials:'materials'}
 };
 const G=config=>({deploymentReady:Promise.resolve(config),validateMaterialPackage,t:cs=>cs,VERSION:'0.21.255'});
 const previousFetch=globalThis.fetch;
 let calls=0;globalThis.fetch=async()=>{calls++;throw new Error('network should be blocked')};
 try{
   for(const config of [
     {...base,apiBaseUrl:'https://outside.example/api/v1/'},
     {...base,endpoints:{materials:'https://outside.example/steal'}},
     {...base,endpoints:{materials:'../outside'}},
   ]){
     const repo=createMaterialRepository(G(config));
     await assert.rejects(repo.publishToCommission(material(),'english'),/Material API must stay within/);
   }
   assert.equal(calls,0);
   const disconnected=createMaterialRepository(G({...base,profile:'github-pages',features:{schoolServerConnected:false,sharedMaterialLibrary:false}}));
   await assert.rejects(disconnected.publishToCommission(material(),'english'),MaterialServerUnavailableError);
   assert.equal(calls,0);
 } finally {globalThis.fetch=previousFetch;}
});
