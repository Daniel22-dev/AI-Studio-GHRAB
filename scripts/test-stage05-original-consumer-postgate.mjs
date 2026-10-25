// Stage05: isolated post-authorization contract checks using original, immutable
// consumer scripts. NO live authorization or school-gate bypass: only an inert
// Node VM with synthetic DOM/storage, never the live school's protected UI.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createHash, webcrypto } from 'node:crypto';

const STUDIO='https://daniel22-dev.github.io/AI-Studio-GHRAB/';
const HANDOFF='ghrab.platform.handoff.v2',LEGACY='ghrab.handoff.v1';
const EVENT='ghrab.pilot.events.v2';
const sourcePlatform=fs.readFileSync('src/platform/ghrab-platform.js','utf8');

const versions={
 generator:{
   repo:'generator-testu',rev:'2c00a101c52a40897c2fc1e59ffce19ddfa3d3f4',
   path:'src/js/17-ai-studio-bridge.js',blob:'06500d837f1285b4a839ed2ce2561f841a9af287',
   appVersion:'7.1.101',platformPath:'vendor/ghrab-platform-1.1.2/ghrab-platform.js',
   platformBlob:'d8a36f023e2930b0b3c0bb045e5ed6b2e464bd2a',route:'generator-testu'
 },
 differentiator:{
   repo:'diferenciator',rev:'601edef93e9029b48433f64a0ee7074c314588cd',
   path:'src/js/25-ai-studio-bridge.js',blob:'0bb16709725224f2b2733b8f72bdf89ca89a1535',
   appVersion:'1.3.51',platformPath:'vendor/ghrab-platform-1.1.3/ghrab-platform.js',
   platformBlob:'5fc3cf7f250aefe295508eaed7a0f5717c8f8993',route:'diferenciator'
 },
 ludus:{
   repo:'Ludus',rev:'a5ac946600fba95fe9c4f77ac7a7a5b440945f0d',
   path:'src/index.html',blob:'88bc986ed77c497b1907ff087339c9384524e267',
   appVersion:'1.16.31',platformPath:'vendor/ghrab-platform-1.1.2/ghrab-platform.js',
   platformBlob:'d8a36f023e2930b0b3c0bb045e5ed6b2e464bd2a',route:'Ludus'
 }
};
async function immutableBlob(meta,path,expectedBlob){
 const endpoint='https://raw.githubusercontent.com/Daniel22-dev/'+meta.repo+'/'+meta.rev+'/'+path;
 const signal=AbortSignal.timeout(35000);
 const response=await fetch(endpoint,{signal,headers:{'Accept':'text/plain'}});
 assert.equal(response.status,200,'pinned consumer source unavailable: '+meta.repo+'/'+path);
 const bytes=Buffer.from(await response.arrayBuffer());
 const digest=createHash('sha1').update(Buffer.from('blob '+bytes.length+'\0')).update(bytes).digest('hex');
 assert.equal(digest,expectedBlob,'consumer pinned blob SHA mismatch: '+meta.repo+'/'+path);
 return bytes.toString('utf8');
}
function material(id){
 return {
  schema:'ghrab-material-v1',id:'stage05-isolated-'+id,version:1,
  title:'Stage05 synteticke tema '+id,subject:'English',language:'en',
  yearGroup:'1',level:'B1',objectives:['Compare three fictional examples'],
  content:{sourceText:'SYNTHETIC-STAGE05-SOURCE: fictional educational sample.',
   vocabulary:[],tasks:[0,1,2].map((n)=>({
    id:'q'+n,type:'select',prompt:'Pick the synthetic option '+n,
    options:['A','B','C','D'],answer:n,difficulty:1}))},
  quality:{status:'ai-draft'},provenance:{containsPersonalData:false}
 };
}
function memoryStorage(){
 const map=new Map();
 return {getItem:k=>map.has(k)?map.get(k):null,setItem:(k,v)=>map.set(k,String(v)),
 removeItem:k=>map.delete(k),entries:()=>[...map.entries()]};
}
class FakeElement{
 constructor(tag='input'){
  this.tagName=tag;this.children=[];this.value='';this.textContent='';
  this.className='';this.attributes={};this.events=[];
 }
 append(...items){this.children.push(...items);}
 prepend(...items){this.children.unshift(...items);}
 setAttribute(key,value){this.attributes[key]=String(value);}
 dispatchEvent(ev){this.events.push(ev.type);return true;}
 remove(){this.removed=true;}
}
function sandbox(){
 const nodes=new Map(),listeners=new Map(),promises=[],errors=[],storedPacks=[];
 const localStorage=memoryStorage();
 const body=new FakeElement('body'),container=new FakeElement('div'),wrap=new FakeElement('div');
 const getNode=id=>{if(!nodes.has(id))nodes.set(id,new FakeElement());return nodes.get(id);};
 const document={
  currentScript:{src:STUDIO+'ghrab/ghrab-platform.js'},
  documentElement:{dataset:{ghrabAppId:'ai-studio',ghrabAppVersion:'0.21.256'}},
  readyState:'loading',body,
  getElementById:getNode,
  querySelector(selector){if(selector==='.container')return container;
    if(selector==='.wrap')return wrap;return getNode(selector)},
  querySelectorAll(){return[]},
  createElement:tag=>new FakeElement(tag),
  addEventListener(){},
 };
 const context={
  document,localStorage,sessionStorage:memoryStorage(),URL,URLSearchParams,TextEncoder,
  TextDecoder,Uint8Array,crypto:webcrypto,console,structuredClone,Event:class Event{constructor(type){this.type=type;}},
  performance:{mark(){},measure(){},getEntriesByName(){return[]}},
  location:{href:STUDIO,search:''},
  GHRAB_PLATFORM_CONFIG:{appId:'ai-studio',appVersion:'0.21.256',autoFooter:false},
  addEventListener(type,fn){const a=listeners.get(type)||[];a.push(fn);listeners.set(type,a);},
  setTimeout(fn){try{const result=fn();if(result?.then)promises.push(result);}catch(err){errors.push(err)}return 1;},
  clearTimeout(){},
  // Inert application UI dependencies. Access policy is not present in this VM.
  generatorPersistenceAllowed:()=>true, pickJazyk(){},applyVisualState(){},
  validate(){},saveSnapshot(){},uiToast(){},
  state:{}, normalizeTargetGroupValue:x=>String(x||''),
  syncCefrHintFromSubject(){},hide(){},show(){},setStatus(){},
  $:getNode,
  SKINS:[{id:'arcanum'}],cleanExternalText:(x,max)=>String(x||'').slice(0,max),
  cleanExternalList:(x,max)=>Array.isArray(x)?x.slice(0,max):[],
  getGameEngine:()=>({}),engineSupports:()=>['mc4','mc2','wordbank'],
  normalizeStations:stations=>stations,
  defaultTeams:()=>[],packMeta:pack=>pack,
  refresh(){},renderStage(){},renderCore(){},updateSteps(){},
  async injectAndStore(pack,world){storedPacks.push({pack,world});},
  go(){},toast(){},
 };
 context.window=context;
 vm.createContext(context);
 const script=(code,name)=>vm.runInContext(code,context,{filename:name,timeout:10000});
 const fire=async type=>{
  for(const fn of listeners.get(type)||[])fn();
  await Promise.all(promises);
  if(errors.length)throw errors[0];
 };
 return {context,document,storage:localStorage,nodes,container,wrap,
  storedPacks,script,fire};
}
function ludusImporter(html){
 const start=html.indexOf("const STUDIO_HANDOFF_KEY='ghrab.handoff.v1'");
 const end=html.indexOf("const endWorkBtn=$('#endWork')",start);
 assert.ok(start>=0&&end>start,'LUDUS actual importer block missing');
 return html.slice(start,end);
}
async function runReceiver(id,{tamper=false,wrongTarget=false}={}){
 const meta=versions[id],appCode=await immutableBlob(meta,meta.path,meta.blob);
 const recvPlatform=await immutableBlob(meta,meta.platformPath,meta.platformBlob);
 const w=sandbox(),m=material(id);
 // Use the actual Studio Bridge v2 implementation to create the packet.
 w.script(sourcePlatform,'studio-platform.js');
 const target=wrongTarget?'nonexistent-target':id;
 const created=w.context.GHRAB_PLATFORM.bridge.create({
  target,sourceAppId:'ai-studio',sourceAppVersion:'0.21.256',
  studioUrl:STUDIO,material:m,writeLegacy:false,ttlMs:600000
 });
 assert.equal(created?.schema,'ghrab-studio-handoff-v2');
 assert.ok(w.storage.getItem(HANDOFF));
 assert.equal(w.storage.getItem(LEGACY),null,'Legacy bridge must remain unused');
 if(tamper){
  const packet=JSON.parse(w.storage.getItem(HANDOFF));
  packet.payload.value.title='TAMPERED';
  w.storage.setItem(HANDOFF,JSON.stringify(packet));
 }
 // Switch to a different published app with its own exact vendor Platform.
 w.context.document.documentElement.dataset={ghrabAppId:id,ghrabAppVersion:meta.appVersion};
 w.context.document.currentScript.src='https://daniel22-dev.github.io/'+meta.route+'/ghrab/ghrab-platform.js';
 w.context.GHRAB_PLATFORM_CONFIG={appId:id,appVersion:meta.appVersion,autoFooter:false};
 w.context.location={href:'https://daniel22-dev.github.io/'+meta.route+'/?studioHandoff=1',search:'?studioHandoff=1'};
 w.script(recvPlatform,id+'-platform.js');
 const code=id==='ludus'?ludusImporter(appCode):appCode;
 w.script(code,id+'-original-importer.js');
 await w.fire('load');
 assert.equal(w.storage.getItem(HANDOFF),null,'Bridge v2 packet not consumed or rejected');
 assert.equal(w.storage.getItem(LEGACY),null,'Legacy handoff unexpectedly created');
 const events=JSON.parse(w.storage.getItem(EVENT)||'[]');
 const v2=events.filter(e=>e.type==='handoff-consumed'&&e.contractVersion===2&&e.sourceAppId==='ai-studio');
 if(tamper||wrongTarget){
  assert.equal(v2.length,0,'Rejected packet must not produce a v2 consume event');
  if(id==='ludus')assert.notEqual(w.context.__spec?.materialId,m.id,'Rejected packet must not import a game');
  else assert.equal(w.nodes.get(id==='generator'?'nazev':'mTopic')?.value||'','');
 } else {
  assert.equal(v2.length,1,'Bridge v2 must be consumed once by the actual receiver script');
  if(id==='generator'){
   assert.equal(w.nodes.get('nazev')?.value,m.title);
   assert.ok(w.nodes.get('zadaniText')?.value.includes('SYNTHETIC-STAGE05-SOURCE'));
   assert.ok(w.container.children.some(x=>x.className==='studio-import-banner'));
  } else if(id==='differentiator'){
   assert.equal(w.nodes.get('mTopic')?.value,m.title);
   assert.ok(w.nodes.get('pasteText')?.value.includes('SYNTHETIC-STAGE05-SOURCE'));
   assert.ok(w.wrap.children.some(x=>x.className==='studio-import-banner'));
  } else {
   assert.equal(w.context.__spec?.materialId,m.id);
   assert.equal(w.context.__studioReturnUrl,STUDIO);
   assert.equal(w.storedPacks.length,1);
   assert.equal(w.storedPacks[0].pack.stations.length,3);
   assert.equal(w.storedPacks[0].pack.meta.sourceMaterialId,m.id);
  }
 }
}
for(const id of Object.keys(versions)){
 test('Stage05 isolated original '+id+' consumer: v2 handoff, autofill and consume-once',async()=>{
  await runReceiver(id);
 });
 test('Stage05 isolated '+id+' consumer: tampered v2 packet fails closed',async()=>{
  await runReceiver(id,{tamper:true});
 });
 test('Stage05 isolated '+id+' consumer: wrong-target v2 packet fails closed',async()=>{
  await runReceiver(id,{wrongTarget:true});
 });
}
