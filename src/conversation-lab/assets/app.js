(()=>{
'use strict';
/** 0.11.0: the three exact, pinned MASTER presentations; no alternative lesson renderer. */
/** Stable content links never include identity, permission, expiry or revision. */
const LANGUAGES = Object.freeze(['en', 'es', 'de', 'fr']);
const CEFR = Object.freeze(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);
const STATIONS = Object.freeze(['s01', 's02', 's03', 's04', 's05', 's06', 's07', 's08']);
const ROUTE = /^#\/l\/([a-z0-9]+(?:-[a-z0-9]+)*)\/(en|es|de|fr)\/(A1|A2|B1|B2|C1|C2)\/s\/(s0[1-8])$/;
const DEMO = /^#\/demo\/s\/(s0[1-8])$/;
function parseRoute(hash) {
  if (!hash || hash === '#' || hash === '#/' || hash === '#/library') return { type: 'library' };
  if (hash === '#/demo') return { type: 'demo', stationId: 's01' };
  const demo = DEMO.exec(hash);
  if (demo) return { type: 'demo', stationId: demo[1] };
  const match = ROUTE.exec(hash);
  if (!match) return { type: 'invalid' };
  return { type: 'lesson', lessonId: match[1], language: match[2], cefr: match[3], stationId: match[4] };
}
function buildRoute({ lessonId, language, cefr, stationId }) {
  const hash = `#/l/${lessonId}/${language}/${cefr}/s/${stationId}`;
  if (parseRoute(hash).type !== 'lesson') throw new TypeError('Invalid canonical lesson route');
  return hash;
}
/** Local synthetic preview route. Never expose it from a public build. */
function buildDemoRoute(stationId) {
  if (!STATIONS.includes(stationId)) throw new TypeError('Invalid demo station');
  return `#/demo/s/${stationId}`;
}

const PIN=Object.freeze({"version":"0.11.0","releaseId":"cl-master-72-20261019-r1","topics":["artificial-intelligence","the-pressure-to-succeed","summer-holidays"],"catalogSha256":"809b009d66af3d52bc7676b7ba5b0be8cda6cbb34b24f7e5b5b109a2d3f94e38","masterIndexSha256":"c1fcb257ae7d39e58f0023fe0f945c14502d1d1e9b32a4242db157313229989a","qrIndexSha256":"160ba2042abf46da19c38b28fe0c7364412dcf03f2e3bf83b43130b2dbfbbb1d"});
const ROOT=new URL('../',document.currentScript.src);
const PUBLIC_ORIGIN='https://conversation-lab-ghrab.pages.dev';
const STUDIO_ORIGIN='https://daniel22-dev.github.io';
const LANGS={en:'Angličtina',es:'Španělština',de:'Němčina',fr:'Francouzština'};
const LEVELS=['A1','A2','B1','B2','C1','C2'];
const $=id=>document.getElementById(id);
let catalog,masterIndex,qrIndex,activeTopic=null,teacherMode=false,qrObjectUrl=null;
let routed=false;
let routeTimer=null,lastRouteWrite=-Infinity,pendingRoute=null;
const node=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
const fail=code=>{throw Error(code);};
function pathUrl(path){
  if(typeof path!=='string'||!/^[a-zA-Z0-9_./-]+$/.test(path)||path.startsWith('/')||path.split('/').some(p=>!p||p==='.'||p==='..'))fail('CLB_ASSET_PATH_INVALID');
  const url=new URL(path,ROOT);
  if(url.username||url.password||url.origin!==ROOT.origin||!url.pathname.startsWith(ROOT.pathname))fail('CLB_ASSET_ORIGIN_INVALID');
  return url;
}
async function digest(bytes){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');}
async function exactBytes(path,expected,mime,max=2097152){
  if(!/^[a-f0-9]{64}$/.test(expected))fail('CLB_DIGEST_MISSING');
  const url=pathUrl(path);
  const r=await fetch(url,{method:'GET',credentials:'omit',cache:'no-store',redirect:'error',referrerPolicy:'no-referrer'});
  if(!r.ok||r.redirected||r.url!==url.href)fail('CLB_ASSET_FETCH_FAILED');
  const contentType=(r.headers.get('content-type')||'').split(';')[0].trim().toLowerCase();
  if(!mime.includes(contentType))fail('CLB_ASSET_MIME_INVALID');
  const declared=Number(r.headers.get('content-length')||0);if(declared>max)fail('CLB_ASSET_TOO_LARGE');
  const reader=r.body?.getReader();let bytes;
  if(reader){const chunks=[];let total=0;for(;;){const {value,done}=await reader.read();if(done)break;total+=value.byteLength;if(total>max){await reader.cancel();fail('CLB_ASSET_TOO_LARGE');}chunks.push(value);}bytes=new Uint8Array(total);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}}
  else{bytes=new Uint8Array(await r.arrayBuffer());if(bytes.byteLength>max)fail('CLB_ASSET_TOO_LARGE');}
  if(await digest(bytes)!==expected)fail('CLB_ASSET_DIGEST_MISMATCH');
  return new TextDecoder('utf-8',{fatal:true}).decode(bytes);
}
const exactJson=async(path,hash,max)=>JSON.parse(await exactBytes(path,hash,['application/json'],max));
function assertBoundary(teacher){
  const here=new URL(location.href);
  if(window.self!==window.top||here.search||here.username||here.password||ROOT.username||ROOT.password)fail('CLB_ORIGIN_OR_FRAME_INVALID');
  if(teacher){if(location.origin!==STUDIO_ORIGIN||ROOT.pathname!=='/AI-Studio-GHRAB/conversation-lab/')fail('CLB_TEACHER_ORIGIN_INVALID');}
  else if(!(location.origin===PUBLIC_ORIGIN||/^https:\/\/[a-z0-9-]+\.conversation-lab-ghrab\.pages\.dev$/.test(location.origin)||/^http:\/\/(localhost|127\.0\.0\.1):[0-9]{2,5}$/.test(location.origin)))fail('CLB_PUBLIC_ORIGIN_INVALID');
}
function assertCatalog(value){
  if(value.schema!=='ghrab-cl-public-catalog-v1'||value.releaseId!==PIN.releaseId||value.entries?.length!==72||value.topics?.length!==3)fail('CLB_CATALOG_SCOPE_INVALID');
  const ids=new Set();
  for(const entry of value.entries){const key=[entry.lessonId,entry.language,entry.cefr].join('/');if(ids.has(key)||!PIN.topics.includes(entry.lessonId)||!Object.hasOwn(LANGS,entry.language)||!LEVELS.includes(entry.cefr)||!/^[a-f0-9]{64}$/.test(entry.sha256))fail('CLB_CATALOG_VARIANT_INVALID');ids.add(key);pathUrl(entry.path);}
  for(const topic of PIN.topics)for(const language of Object.keys(LANGS))for(const cefr of LEVELS)if(!ids.has(`${topic}/${language}/${cefr}`))fail('CLB_CATALOG_INCOMPLETE');
}
function variant(route){return catalog.entries.find(e=>e.lessonId===route.lessonId&&e.language===route.language&&e.cefr===route.cefr);}
function showError(error){
  document.documentElement.dataset.clbReady='error';
  const box=node('section','');box.id='clb-gate-status';box.setAttribute('role','alert');
  box.append(node('h1','','Lekci nelze otevřít'),node('p','','Odkaz nebo soubory tohoto vydání nejsou platné. Vraťte se do knihovny a zkuste lekci otevřít znovu.'));
  const safeCode=/^CLB_[A-Z0-9_]+$/.test(error?.message||'')?error.message:'CLB_CONTENT_UNAVAILABLE';
  const code=node('small','',safeCode);box.append(code);
  const back=node('p','');const a=node('a','','← Knihovna témat');a.href='#/library';back.append(a);box.append(back);document.body.replaceChildren(box);
  window.addEventListener('hashchange',()=>location.reload(),{once:true});
}
function setTheme(value){document.documentElement.dataset.theme=value;$('theme-toggle').textContent=value==='dark'?'☀ Denní režim':'☾ Noční režim';$('theme-toggle').setAttribute('aria-pressed',String(value==='dark'));}
function renderLibrary(){
  const language=$('library-language').value,cefr=$('library-level').value,root=$('catalog-cards');root.replaceChildren();
  for(const [index,topic] of catalog.topics.entries()){
    const entry=variant({lessonId:topic.id,language,cefr});if(!entry)fail('CLB_LIBRARY_SELECTION_INVALID');
    const card=node('article','lesson-card'),top=node('div','lesson-card-top');
    top.append(node('span','card-mark',topic.monogram),node('span','card-index',`TÉMA ${String(index+1).padStart(2,'0')} / 03`));
    const pills=node('div','pills');for(const text of ['EN · ES · DE · FR','A1–C2','8 stanic'])pills.append(node('span','',text));
    const link=node('a','open-card',`Otevřít · ${LANGS[language]} ${cefr} →`);link.href=buildRoute({...entry,stationId:'s01'});
    card.append(top,node('h3','',topic.label),node('p','card-desc',topic.subtitle),pills,link);root.append(card);
  }
}
function library(){
  document.documentElement.lang='cs';document.title='Conversation Lab · AI Studio GHRAB';
  $('skip-link').addEventListener('click',event=>{event.preventDefault();$('content').focus();});
  $('library-language').addEventListener('change',renderLibrary);$('library-level').addEventListener('change',renderLibrary);
  $('theme-toggle').addEventListener('click',()=>setTheme(document.documentElement.dataset.theme==='dark'?'light':'dark'));
  setTheme('dark');renderLibrary();document.documentElement.dataset.clbReady='library';
}
function sri(hex){return 'sha256-'+btoa(String.fromCharCode(...hex.match(/../g).map(x=>parseInt(x,16))));}
function stylesheet(path,hash,id){return new Promise((resolve,reject)=>{const link=document.createElement('link');link.id=id;link.rel='stylesheet';link.href=pathUrl(path).href;link.integrity=sri(hash);link.crossOrigin='anonymous';link.onload=resolve;link.onerror=()=>reject(Error('CLB_STYLESHEET_INTEGRITY_FAILED'));document.head.append(link);});}
function script(path,hash){return new Promise((resolve,reject)=>{const el=document.createElement('script');el.src=pathUrl(path).href;el.integrity=sri(hash);el.crossOrigin='anonymous';el.onload=resolve;el.onerror=()=>reject(Error('CLB_RUNTIME_INTEGRITY_FAILED'));document.head.append(el);});}
function shareDialog(){
  const dialog=node('dialog','');dialog.id='clb-share';dialog.setAttribute('aria-labelledby','clb-share-title');
  const head=node('div','clb-share-head'),heading=node('h2','','Sdílet konverzaci');heading.id='clb-share-title';
  const close=node('button','','×');close.type='button';close.setAttribute('aria-label','Zavřít sdílení');close.addEventListener('click',()=>dialog.close());head.append(heading,close);
  const details=node('p','');details.id='clb-share-details';const qr=node('div','');qr.id='clb-share-qr';qr.setAttribute('role','img');qr.setAttribute('aria-label','QR kód odkazu na aktuální stanici');
  const label=node('label','','Odkaz pro studenty');label.htmlFor='clb-share-url';const input=node('input','');input.id='clb-share-url';input.readOnly=true;input.spellcheck=false;
  const actions=node('div','');actions.id='clb-share-actions';const copy=node('button','','Kopírovat odkaz');copy.id='clb-share-copy';copy.type='button';
  copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(input.value);$('clb-share-notice').textContent='Odkaz zkopírován.';}catch{$('clb-share-notice').textContent='Označený odkaz zkopírujte ručně.';input.focus();input.select();}});
  const download=node('a','','Stáhnout QR (SVG)');download.id='clb-share-download';actions.append(copy,download);
  const note=node('p','','QR neobsahuje přihlašovací údaje ani osobní informace.');note.id='clb-share-notice';dialog.append(head,details,qr,label,input,actions,note);
  dialog.addEventListener('close',()=>{if(qrObjectUrl){URL.revokeObjectURL(qrObjectUrl);qrObjectUrl=null;}});document.body.append(dialog);return dialog;
}
async function share(){
  const state=globalThis.__clbMasterController.state(),route={type:'lesson',...state};
  if(!variant(route))fail('CLB_SHARE_VARIANT_INVALID');
  const canonical=PUBLIC_ORIGIN+'/'+buildRoute(route),dialog=$('clb-share')||shareDialog();
  const descriptor=qrIndex.entries.find(e=>e.topicId===route.lessonId&&e.language===route.language);if(!descriptor)fail('CLB_QR_MISSING');
  const bundle=await exactJson(descriptor.path,descriptor.sha256,1048576),vector=bundle.vectors?.[`${route.cefr}/${route.stationId}`];
  if(bundle.topicId!==route.lessonId||bundle.language!==route.language||!vector||!Number.isInteger(vector.viewBox)||vector.viewBox<21||vector.viewBox>185||typeof vector.path!=='string'||! /^(?:M\d+ \d+h1v1h-1z)+$/.test(vector.path))fail('CLB_QR_VECTOR_INVALID');
  const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('xmlns',ns);svg.setAttribute('viewBox',`0 0 ${vector.viewBox} ${vector.viewBox}`);svg.setAttribute('shape-rendering','crispEdges');
  const white=document.createElementNS(ns,'rect');white.setAttribute('width',vector.viewBox);white.setAttribute('height',vector.viewBox);white.setAttribute('fill','#fff');
  const pixels=document.createElementNS(ns,'path');pixels.setAttribute('d',vector.path);pixels.setAttribute('fill','#000');svg.append(white,pixels);$('clb-share-qr').replaceChildren(svg);
  $('clb-share-details').textContent=`${catalog.topics.find(t=>t.id===route.lessonId).label} · ${route.language.toUpperCase()} · ${route.cefr} · stanice ${Number(route.stationId.slice(1))}`;
  $('clb-share-url').value=canonical;
  if(qrObjectUrl)URL.revokeObjectURL(qrObjectUrl);qrObjectUrl=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)],{type:'image/svg+xml'}));
  $('clb-share-download').href=qrObjectUrl;$('clb-share-download').download=`conversation-lab-${route.lessonId}-${route.language}-${route.cefr}-${route.stationId}.svg`;
  $('clb-share-notice').textContent=teacherMode||location.origin===PUBLIC_ORIGIN?'QR neobsahuje přihlašovací údaje ani osobní informace.':'QR míří na produkční Cloudflare. Před nasazením tam může být ještě starší vydání.';
  dialog.showModal();
}
function toolsBar(){
  const tools=node('nav','');tools.id='clb-integration-tools';tools.setAttribute('aria-label','Conversation Lab – knihovna a sdílení');
  const back=node('a','','← Knihovna');back.href='#/library';
  const qr=node('button','','▦ QR pro studenty');qr.type='button';qr.id='clb-share-open';qr.addEventListener('click',()=>share().catch(showError));tools.append(back,qr);document.body.append(tools);
}
function cancelRouteWrite(){clearTimeout(routeTimer);routeTimer=null;pendingRoute=null;}
function flushRouteWrite(){
  routeTimer=null;
  if(pendingRoute===null||pendingRoute===location.hash){pendingRoute=null;return;}
  // Browser history quotas also apply to replaceState. Keep rapid presentation
  // changes responsive and commit only the latest route, at most once per 350 ms.
  const delay=350-(performance.now()-lastRouteWrite);
  if(delay>0){routeTimer=setTimeout(flushRouteWrite,Math.ceil(delay));return;}
  try{history.replaceState(null,'',pendingRoute);lastRouteWrite=performance.now();pendingRoute=null;}
  catch{routeTimer=setTimeout(flushRouteWrite,1000);}
}
function updateRoute(state){
  pendingRoute=buildRoute(state);
  if(pendingRoute===location.hash){cancelRouteWrite();return;}
  if(routeTimer===null)flushRouteWrite();
}
async function master(route){
  const entry=variant(route);if(!entry)fail('CLB_VARIANT_NOT_FOUND');
  const desc=masterIndex.topics.find(x=>x.topicId===route.lessonId);if(!desc)fail('CLB_MASTER_NOT_FOUND');
  // Per-variant data is verified as well as the pinned entire MASTER presentation.
  const lesson=await exactJson(entry.path,entry.sha256);
  if(lesson.lessonId!==route.lessonId||lesson.language!==route.language||lesson.cefr!==route.cefr||lesson.lesson?.stations?.length!==8)fail('CLB_LESSON_SCOPE_INVALID');
  const html=await exactBytes(desc.html.path,desc.html.sha256,['text/html']);
  const doc=new DOMParser().parseFromString(html,'text/html');
  if(doc.body.querySelector('script,iframe,object,embed,base,link')||!doc.body.querySelector('.app'))fail('CLB_MASTER_TEMPLATE_INVALID');
  for(const el of doc.body.querySelectorAll('*'))for(const attr of el.attributes)if(/^on/i.test(attr.name))fail('CLB_MASTER_INLINE_HANDLER_INVALID');
  $('catalog-style')?.remove();
  await stylesheet(desc.css.path,desc.css.sha256,'master-style');
  document.body.replaceChildren(...Array.from(doc.body.childNodes).map(n=>document.importNode(n,true)));
  activeTopic=route.lessonId;
  await script(desc.runtime.path,desc.runtime.sha256);
  if(!globalThis.__clbMasterController)fail('CLB_MASTER_RUNTIME_MISSING');
  globalThis.__clbMasterController.start(route,updateRoute);toolsBar();
  document.documentElement.dataset.clbReady='lesson';
}
async function routeChange(){
  cancelRouteWrite();
  const route=parseRoute(location.hash);if(route.type!=='lesson'&&route.type!=='library')fail('CLB_ROUTE_INVALID');
  if(routed){
    if(route.type==='lesson'&&route.lessonId===activeTopic){if(!variant(route))fail('CLB_VARIANT_NOT_FOUND');globalThis.__clbMasterController.navigate(route);return;}
    location.reload();return;
  }
  routed=true;if(route.type==='library')library();else await master(route);
}
async function startPlayer({teacher=false}={}){
  try{
    teacherMode=teacher;assertBoundary(teacher);
    catalog=await exactJson('data/catalog.json',PIN.catalogSha256);assertCatalog(catalog);
    [masterIndex,qrIndex]=await Promise.all([exactJson('data/master-index.json',PIN.masterIndexSha256),exactJson('data/qr-index.json',PIN.qrIndexSha256)]);
    if(masterIndex.releaseId!==PIN.releaseId||masterIndex.topics?.length!==3||qrIndex.releaseId!==PIN.releaseId||qrIndex.entries?.length!==12)fail('CLB_RELEASE_INDEX_INVALID');
    document.documentElement.dataset.clbGate='approved';$('clb-gate-status')?.remove();
    window.addEventListener('hashchange',()=>routeChange().catch(showError));
    await routeChange();
  }catch(error){showError(error);}
}
globalThis.__clbStartPlayer=startPlayer;

})();
