/**
 * Conversation Lab — teacher-owned topic library, static/offline import edition.
 * No remote upload endpoint, tokens, identities, eval, external scripts or HTML execution.
 * SOURCE HTML is treated strictly as data: only literal CONTENT and CZ_GLOSSARY JSON.
 * This is a local authoring/teaching aid; it does not publish student QR routes.
 */
(function (global) {
  'use strict';
  const LANGS=['en','es','de','fr'],CEFR=['A1','A2','B1','B2','C1','C2'];
  const MAX_SOURCE=3_000_000,MAX_RECORDS=250,MAX_BACKUP=65_000_000;
  const DB_NAME='ghrab-clb-topic-library-v1',DB_VERSION=1;
  const SEED_SCHEMA='ghrab-clb-local-library-v1';
  const SLUG=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  const ROUTE=/^#\/l\/([a-z0-9]+(?:-[a-z0-9]+)*)\/(en|es|de|fr)\/(A1|A2|B1|B2|C1|C2)\/s\/(s0[1-8])$/;
  function fail(code){throw new Error('CLB_TOPICS_'+code);}
  function need(condition,code){if(!condition)fail(code);}
  const textOk=x=>typeof x==='string'&&x.trim().length>0&&x.length<=3000&&
     !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(x);
  const simpleObject=o=>o!==null&&typeof o==='object'&&!Array.isArray(o);
  function slugify(name){
    need(typeof name==='string'&&name.length<250&&name.length>0&&
      !name.includes('/')&&!name.includes('\\')&&!name.includes('\u0000'),'FILENAME_INVALID');
    const value=name.replace(/\.(?:html?|json)$/i,'').replace(/\s*\(\d+\)$/,'')
      .replace(/[_ ]+/g,'-').replace(/-konverzacni-karta.*$/i,'')
      .normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
      .toLowerCase().replace(/[^a-z0-9-]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'');
    need(SLUG.test(value)&&value.length<=100,'TOPIC_ID_INVALID');
    return value;
  }
  // Keep the original signed Cloudflare topic identity stable across Czech
  // HTML filenames. A new SHA still requires its own owner/P5 release review.
  const TOPIC_ALIASES=Object.freeze({
    'van-oce':'weihnachten','vanoce':'weihnachten',
    'umela-inteligence':'artificial-intelligence',
    'tlak-na-vykon':'the-pressure-to-succeed',
    'prazdniny':'summer-holidays'
  });
  function canonicalTopicId(id){return TOPIC_ALIASES[id]||id;}
  function jsonLiteral(source,name){
    need(typeof source==='string'&&source.length<=MAX_SOURCE,'HTML_SIZE');
    const re=new RegExp('\\bconst\\s+'+name+'\\s*=\\s*','g');
    let match,count=0;
    while((match=re.exec(source))!==null){count++;if(count>1)break;}
    need(count===1,'JSON_LITERAL_'+name+'_NOT_UNIQUE');
    re.lastIndex=0;match=re.exec(source);
    let i=match.index+match[0].length;
    need(source[i]==='{','JSON_LITERAL_'+name+'_OBJECT');
    let depth=0,inString=false,escaped=false,end=-1;
    for(let j=i;j<source.length;j++){
      const c=source[j];
      if(inString){if(escaped){escaped=false;continue;}if(c==='\\'){escaped=true;continue;}if(c==='"')inString=false;continue;}
      if(c==='"'){inString=true;continue;}
      if(c==='{'||c==='[')depth++;
      else if(c==='}'||c===']'){depth--;if(depth===0){end=j+1;break;}need(depth>=0,'JSON_BALANCE');}
    }
    need(end>i&&source.slice(end).trimStart().startsWith(';'),'JSON_LITERAL_'+name+'_TERMINATION');
    try{return JSON.parse(source.slice(i,end));}catch{fail('JSON_PARSE_'+name);}
  }
  function validPairs(pairs,count){
    return Array.isArray(pairs)&&pairs.length===count&&pairs.every(p=>
      Array.isArray(p)&&p.length===2&&p.every(textOk));
  }
  function inspectContent(content){
    need(simpleObject(content)&&Object.keys(content).length>=1&&
      Object.keys(content).every(l=>LANGS.includes(l)),'LANGUAGE_MAP');
    let variants=0,questions=0;
    for(const lang of Object.keys(content)){
      const block=content[lang];
      need(simpleObject(block)&&simpleObject(block.ui)&&
        simpleObject(block.levels)&&Object.keys(block.levels).length>0,'LANGUAGE_BLOCK');
      need(textOk(block.ui.title),'UI_TITLE');
      for(const [cefr,level] of Object.entries(block.levels)){
        need(CEFR.includes(cefr)&&simpleObject(level)&&textOk(level.warm),'LEVEL_SHAPE');
        need(Array.isArray(level.stations)&&level.stations.length===8,'EIGHT_STATIONS');
        for(const station of level.stations){
          need(simpleObject(station)&&
            ['title','subtitle','main','challenge','stretch'].every(k=>textOk(station[k]))&&
            Array.isArray(station.questions)&&station.questions.length===3&&
            station.questions.every(textOk)&&
            Array.isArray(station.support)&&[3,4].includes(station.support.length)&&
            station.support.every(textOk),'STATION_CONTENT');
          if(station.explanations!==undefined){
            need(Array.isArray(station.explanations)&&station.explanations.length===3&&
              station.explanations.every(x=>textOk(x)||validPairs([x],1)),
              'EXPLANATIONS_FORMAT');
          }
          questions+=4;
        }
        need(validPairs(level.vocab,12)&&validPairs(level.toolkit,4),'VOCAB_TOOLKIT');
        variants++;
      }
    }
    need(variants<=24&&questions===variants*32,'VARIANT_MATRIX');
    return {variantCount:variants,questionCount:questions};
  }
  function validGlossary(glossary){
    if(glossary===null||glossary===undefined)return {};
    need(simpleObject(glossary),'GLOSSARY_OBJECT');
    for(const [name,block] of Object.entries(glossary)){
      need(['words','phrases'].includes(name)&&simpleObject(block),'GLOSSARY_SECTION');
      for(const [language,items] of Object.entries(block)){
        need(LANGS.includes(language)&&simpleObject(items)&&
          Object.keys(items).length<=15000,'GLOSSARY_LANGUAGE');
        for(const [source,translation] of Object.entries(items))
          need(textOk(source)&&textOk(translation),'GLOSSARY_TEXT');
      }
    }
    return glossary;
  }
  function validateRecord(record){
    need(simpleObject(record)&&typeof record.id==='string'&&SLUG.test(record.id)&&
      record.id.length<=100&&typeof record.fileName==='string'&&
      record.fileName.length<=240,'RECORD_ID');
    const counts=inspectContent(record.content);
    const glossary=validGlossary(record.glossary);
    const language=record.content.en?'en':Object.keys(record.content)[0];
    if(record.sourceMasterSha256!==undefined)
      need(typeof record.sourceMasterSha256==='string'&&/^[a-f0-9]{64}$/.test(record.sourceMasterSha256),
        'SOURCE_MASTER_SHA');
    return {id:record.id,fileName:record.fileName,content:record.content,
      ...(record.sourceMasterSha256?{sourceMasterSha256:record.sourceMasterSha256}:{}),
      glossary,variantCount:counts.variantCount,questionCount:counts.questionCount,
      title:record.content[language].ui.title,
      importedAt:typeof record.importedAt==='string'?record.importedAt:new Date().toISOString(),
      fingerprint:typeof record.fingerprint==='string'&&/^[a-f0-9]{16,64}$/.test(record.fingerprint)
        ?record.fingerprint:''};
  }
  function parseCard(source,fileName){
    need(typeof fileName==='string'&&/\.html?$/i.test(fileName),'HTML_FILE_REQUIRED');
    const content=jsonLiteral(source,'CONTENT');
    const glossary=jsonLiteral(source,'CZ_GLOSSARY');
    return validateRecord({id:slugify(fileName),fileName,content,glossary,
      importedAt:new Date().toISOString()});
  }
  function findLesson(record,language,cefr){
    need(record&&LANGS.includes(language)&&CEFR.includes(cefr),'SELECTION');
    return record.content?.[language]?.levels?.[cefr]||null;
  }
  function canUse(record,language,cefr){return Boolean(findLesson(record,language,cefr));}
  function labelsFor(record,language,cefr){
    const item=record.content[language];
    need(item&&item.levels[cefr],'LABEL_SELECTION');
    const layer=(cefr==='A1'||cefr==='A2')?item.uiSimple:
      cefr==='B1'?item.uiB1:null;
    return {...item.ui,...(simpleObject(layer)?layer:{})};
  }
  function restoreBackup(text){
    need(typeof text==='string'&&text.length>0&&text.length<=MAX_BACKUP,'BACKUP_SIZE');
    let obj;try{obj=JSON.parse(text);}catch{fail('BACKUP_JSON');}
    need(simpleObject(obj)&&obj.schema===SEED_SCHEMA&&Array.isArray(obj.items)&&
      obj.items.length<=MAX_RECORDS,'BACKUP_SCHEMA');
    const result=[],ids=new Set();
    for(const item of obj.items){const rec=validateRecord(item);
      need(!ids.has(rec.id),'BACKUP_DUPLICATE_ID');ids.add(rec.id);result.push(rec);}
    return result;
  }
  function safeSeedText(value){return JSON.stringify(value).replace(/</g,'\\u003c').replace(/>/g,'\\u003e')
      .replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');}
  function shortHash(text){let h1=2166136261,h2=2246822519;
    for(let i=0;i<text.length;i++){
      const v=text.charCodeAt(i);h1=Math.imul(h1^v,16777619);
      h2=Math.imul(h2^v,2246822519);
    }
    return (h1>>>0).toString(16).padStart(8,'0')+(h2>>>0).toString(16).padStart(8,'0');
  }
  const core=Object.freeze({LANGS,CEFR,parseCard,slugify,canonicalTopicId,inspectContent,validateRecord,
    findLesson,canUse,labelsFor,restoreBackup,safeSeedText,shortHash});
  if(typeof module==='object'&&module.exports)module.exports=core;
  if(typeof document==='undefined')return;

  const $=id=>document.getElementById(id);
  const state={records:new Map(),db:null,persistent:false,lang:'en',cefr:'B2',
    search:'',active:null,station:1,timer:null,clock:240,clockDeadline:0,running:false,
    theme:'dark',student:document.documentElement.dataset.mode==='student'};
  function el(tag,cls,value){const n=document.createElement(tag);
    if(cls)n.className=cls;if(value!==undefined)n.textContent=String(value);return n;}
  function inform(message,bad=false){$('notice').textContent=message;
    $('notice').hidden=false;$('notice').classList.toggle('bad',bad);}
  function hideNotice(){$('notice').hidden=true;}
  function setStorageStatus(){
    $('storage-indicator').textContent=state.persistent?'● Uloženo v tomto prohlížeči':
      '⚠ Pouze dočasná paměť – exportujte HTML';
  }
  function openDatabase(){return new Promise((resolve,reject)=>{
    if(!('indexedDB' in global)){reject(Error('STORAGE_UNAVAILABLE'));return;}
    let req;try{req=global.indexedDB.open(DB_NAME,DB_VERSION);}catch(e){reject(e);return;}
    req.onupgradeneeded=()=>{const db=req.result;
      if(!db.objectStoreNames.contains('topics'))db.createObjectStore('topics',{keyPath:'id'});
      if(!db.objectStoreNames.contains('meta'))db.createObjectStore('meta');};
    req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||Error('DB_OPEN'));
    req.onblocked=()=>reject(Error('DB_BLOCKED'));
  });}
  function dbRequest(store,mode,fn){return new Promise((resolve,reject)=>{
    if(!state.db){resolve(null);return;}
    let tx,request;
    try{tx=state.db.transaction(store,mode);request=fn(tx.objectStore(store));}
    catch(e){reject(e);return;}
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error||Error('DB_REQUEST'));
    tx.onerror=()=>reject(tx.error||Error('DB_TRANSACTION'));
  });}
  async function persist(record){
    if(!state.db)return;
    try{await dbRequest('topics','readwrite',s=>s.put(record));}
    catch{state.persistent=false;state.db=null;setStorageStatus();inform('Uložení v prohlížeči selhalo. Stáhněte si aktuální knihovnu jako HTML, aby se změny neztratily.',true);}
  }
  async function forget(id){
    if(!state.db)return;
    try{await dbRequest('topics','readwrite',s=>s.delete(id));}
    catch{state.persistent=false;state.db=null;setStorageStatus();inform('Odstranění z úložiště selhalo; doporučujeme stáhnout novou knihovnu.',true);}
  }
  async function startStore(seed){
    if(state.student){for(const row of seed)state.records.set(row.id,row);return;}
    try{
      state.db=await openDatabase();state.persistent=true;
      const old=await dbRequest('topics','readonly',s=>s.getAll());
      for(const record of old||[]){
        try{const safe=validateRecord(record);state.records.set(safe.id,safe);}
        catch{/* A damaged entry is not executed or shown. */}
      }
      const signature=shortHash(seed.map(r=>r.id+':'+r.fingerprint).join('|'));
      const seen=await dbRequest('meta','readonly',s=>s.get('seedSignature'));
      if(seen!==signature){
        for(const item of seed){
          if(!state.records.has(item.id)){state.records.set(item.id,item);await persist(item);}
        }
        await dbRequest('meta','readwrite',s=>s.put(signature,'seedSignature'));
      }
    }catch{
      state.persistent=false;state.db=null;
      for(const item of seed)state.records.set(item.id,item);
      inform('Prohlížeč nepovolil trvalé úložiště. Import funguje, ale pro zachování změn stáhněte „Uložit knihovnu jako HTML“.',true);
    }
  }
  function currentList(){return [...state.records.values()].sort((a,b)=>
    a.title.localeCompare(b.title,'cs'));}
  function stats(){const list=currentList();$('count-topics').textContent=list.length;
    $('count-chip').textContent=list.length;
    $('count-variants').textContent=list.reduce((n,x)=>n+x.variantCount,0);
    $('count-questions').textContent=list.reduce((n,x)=>n+x.questionCount,0);}
  function addButton(parent,text,label,fn,cls='subtle'){
    const btn=el('button','btn '+cls,text);btn.type='button';if(label)btn.setAttribute('aria-label',label);
    btn.addEventListener('click',fn);parent.append(btn);return btn;
  }
  function renderLibrary(){
    stats();const grid=$('topic-grid');grid.replaceChildren();
    const query=state.search.trim().toLocaleLowerCase('cs');let shown=0;
    for(const rec of currentList()){
      const title=(rec.content[state.lang]?.ui?.title||rec.title);
      if(query&&!([title,rec.title,rec.id,rec.fileName].join(' ').toLocaleLowerCase('cs').includes(query)))continue;
      const available=canUse(rec,state.lang,state.cefr);
      const card=el('article','topic-card');
      const head=el('div','topic-card-head');head.append(el('span','topic-mark',title.slice(0,2).toUpperCase()));
      head.append(el('small','',available?state.lang.toUpperCase()+' · '+state.cefr:'JINÁ JAZYKOVÁ VARIANTA'));card.append(head);
      card.append(el('h3','',title));
      const ui=rec.content[state.lang]?.ui||rec.content.en?.ui;
      const desc=el('p','summary',ui?.hero||'Konverzační téma');card.append(desc);
      const tags=el('div','topic-tags');
      tags.append(el('span','',rec.variantCount+' variant'),el('span','',
        Object.keys(rec.content).map(x=>x.toUpperCase()).join(' · ')),el('span','',rec.questionCount+' otázek'));
      card.append(tags);
      const actions=el('div','topic-actions');
      const open=addButton(actions,'Otevřít →','Otevřít '+title,()=>{
        const lang=available?state.lang:Object.keys(rec.content)[0];
        const cefr=available?state.cefr:Object.keys(rec.content[lang].levels)[0];
        global.location.hash=`#/l/${rec.id}/${lang}/${cefr}/s/s01`;
        route();
      },'primary');open.disabled=state.student?false:false;
      if(!state.student){
        addButton(actions,'⇩ Pro studenty','Exportovat '+title+' pro studenty',
          ()=>void exportPortable([rec],'student',`${rec.id}_konverzace_student.html`).catch(e=>inform(e.message,true)));
        addButton(actions,'⇧ Připravit vydání','Vytvořit kontrolní balíček pro '+title,
          ()=>void exportPublicationDraft([rec]).catch(e=>inform(e.message,true)));
        const rm=addButton(actions,'✕','Odstranit '+title,async()=>{
          if(!global.confirm('Opravdu odstranit téma „'+title+'“ z této knihovny?'))return;
          state.records.delete(rec.id);await forget(rec.id);renderLibrary();
          inform('Téma bylo odstraněno z této knihovny.');},'subtle');rm.classList.add('danger');
      }
      card.append(actions);grid.append(card);shown++;
    }
    $('library-empty').hidden=shown!==0;
  }
  function selected(){return state.records.get(state.active);}
  function stopTimer(){if(state.timer!==null)global.clearInterval(state.timer);
    state.timer=null;state.running=false;}
  function timerDraw(){const min=String(Math.floor(state.clock/60)).padStart(2,'0'),sec=String(state.clock%60).padStart(2,'0');
    $('timer-face').textContent=min+':'+sec;
    $('timer-start').textContent=state.running?'Ⅱ Pauza':'▶ Start';
    $('timer-start').setAttribute('aria-pressed',String(state.running));}
  function timerTick(){if(!state.running)return;state.clock=Math.max(0,
    Math.ceil((state.clockDeadline-performance.now())/1000));
    if(state.clock<=0)stopTimer();timerDraw();}
  function resetTimer(){stopTimer();const m=Number($('timer-minutes').value),s=Number($('timer-seconds').value);
    if(Number.isInteger(m)&&Number.isInteger(s)&&m>=0&&m<=59&&s>=0&&s<=59&&m*60+s>=1){
      state.clock=m*60+s;}else{state.clock=240;$('timer-minutes').value='4';$('timer-seconds').value='0';}
    timerDraw();}
  function showStation(){
    const rec=selected(),lesson=findLesson(rec,state.lang,state.cefr),part=lesson.stations[state.station-1];
    $('station-index').textContent=String(state.station).padStart(2,'0');
    $('station-title').textContent=part.title;
    $('station-subtitle').textContent=part.subtitle;
    $('main-question').textContent=part.main;
    const follow=$('follow-up-list');follow.replaceChildren();
    for(let i=0;i<3;i++){
      const row=el('div','follow-row');row.append(el('span','follow-num',String(i+1)));
      const content=el('div','follow-text');content.append(el('span','',part.questions[i]));
      const explain=part.explanations?.[i];
      if(explain){const phrase=Array.isArray(explain)?explain.join(' · '):explain;
        const details=el('details','');const summary=el('summary','explain-toggle','Vysvětlení');
        details.append(summary,el('p','explain-text',phrase));content.append(details);}
      row.append(content);follow.append(row);
    }
    const support=$('prompt-support');support.replaceChildren();
    for(const item of part.support)support.append(el('li','',item));
    $('prompt-challenge').textContent=part.challenge;$('prompt-stretch').textContent=part.stretch;
    $('station-progress').textContent='Stanice '+state.station+' z 8';
    $('station-prev').disabled=state.station===1;$('station-next').disabled=state.station===8;
    const nav=$('station-tabs');nav.replaceChildren();
    for(let i=1;i<=8;i++){
      const tab=el('button','',String(i).padStart(2,'0')+' · '+lesson.stations[i-1].title);
      tab.type='button';tab.setAttribute('aria-current',String(i===state.station));
      tab.addEventListener('click',()=>navigateStation(i));nav.append(tab);
    }
    resetTimer();
  }
  function showResources(lesson){
    for(const [id,list] of [['vocabulary',lesson.vocab],['toolkit',lesson.toolkit]]){
      const parent=$(id);parent.replaceChildren();
      for(const [a,b] of list){const row=el('div','resource-row');row.append(el('b','',a),el('span','',b));parent.append(row);}
    }
  }
  function renderViewer(){const rec=selected();if(!rec)return;
    const lesson=findLesson(rec,state.lang,state.cefr);if(!lesson)return;
    const ui=labelsFor(rec,state.lang,state.cefr);
    $('lesson-title').textContent=ui.title;
    $('lesson-hero').textContent=ui.hero||'';
    $('lesson-kicker').textContent=rec.id.replace(/-/g,' ')+' · CONVERSATION LAB';
    $('lesson-warmup').textContent=lesson.warm;
    $('viewer-lang').textContent=state.lang.toUpperCase();$('viewer-cefr').textContent=state.cefr;
    const goal=ui['goal'+state.cefr]||'';$('lesson-goal').textContent=goal;
    $('lesson-goal').hidden=!goal;
    $('lesson-position').textContent=rec.title;
    $('library').hidden=true;$('hero').hidden=true;$('viewer').hidden=false;
    $('upload-zone').hidden=true;
    showResources(lesson);showStation();
  }
  function showLibrary(){stopTimer();state.active=null;$('viewer').hidden=true;
    $('library').hidden=false;$('hero').hidden=false;$('upload-zone').hidden=state.student;
    renderLibrary();}
  function navigateStation(n){const rec=selected();if(!rec||n<1||n>8)return;
    state.station=n;const target=`#/l/${rec.id}/${state.lang}/${state.cefr}/s/s${String(n).padStart(2,'0')}`;
    if(location.hash!==target)location.hash=target;else showStation();}
  function route(){const m=ROUTE.exec(location.hash);
    if(!m){showLibrary();return;}
    const rec=state.records.get(m[1]);if(!rec||!canUse(rec,m[2],m[3])){
      showLibrary();inform('Požadovaná varianta v této knihovně není dostupná.',true);return;}
    const changed=state.active!==m[1]||state.lang!==m[2]||state.cefr!==m[3];
    state.active=m[1];state.lang=m[2];state.cefr=m[3];state.station=Number(m[4].slice(1));
    $('language-select').value=state.lang;$('cefr-select').value=state.cefr;
    if(changed||$('viewer').hidden)renderViewer();else showStation();
  }
  function saveBlob(bytes,type,name){const blob=new Blob([bytes],{type}),u=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=u;a.download=name;
    document.body.append(a);a.click();a.remove();
    global.setTimeout(()=>URL.revokeObjectURL(u),1200);
  }
  function exportJson(){const items=currentList();
    const payload={schema:SEED_SCHEMA,createdAt:new Date().toISOString(),items};
    saveBlob(JSON.stringify(payload,null,2),'application/json;charset=utf-8',
      'Conversation_Lab_zaloha_'+new Date().toISOString().slice(0,10)+'.json');
    inform('Záloha knihovny byla připravena ke stažení ('+items.length+' témat).');}
  async function getSource(filename,inlineId){const inline=$(inlineId);
    if(inline&&inline.textContent.trim())return inline.textContent;
    need(location.protocol==='https:'||location.hostname==='127.0.0.1' ||
      location.hostname==='localhost','SOURCE_NOT_BUNDLED');
    const u=new URL('./'+filename,document.baseURI);
    need(u.origin===location.origin,'SOURCE_ORIGIN');
    const res=await fetch(u.href,{mode:'same-origin',credentials:'omit',redirect:'error',cache:'no-store'});
    need(res.status===200&&res.ok&&!res.redirected&&res.url===u.href,'SOURCE_FETCH');
    return res.text();
  }
  async function exportPortable(items,mode,name){
    need(Array.isArray(items)&&items.length<=MAX_RECORDS&&['teacher','student'].includes(mode),
      'PORTABLE_SCOPE');
    // No imported HTML or its JS goes into the resulting document: only validated JSON.
    const css=await getSource('styles.css','clb-inline-styles');
    const js=await getSource('app.js','clb-app-inline');
    const publication=mode==='teacher'?await getSource('publication.js','clb-publication-inline'):null;
    const root=document.documentElement.cloneNode(true);root.dataset.mode=mode;root.dataset.theme='dark';
    // The downloaded portable file uses inline CSS+JS; Studio's source CSP
    // must never be copied into it, or the offline browser would block both.
    for(const meta of root.querySelectorAll('meta[http-equiv="Content-Security-Policy"]'))meta.remove();
    for(const link of root.querySelectorAll('link[rel="stylesheet"]'))link.remove();
    for(const script of root.querySelectorAll('script[src]'))script.remove();
    const existingStyle=root.querySelector('#clb-inline-styles');if(existingStyle)existingStyle.remove();
    const style=document.createElement('style');style.id='clb-inline-styles';style.textContent=css;
    root.querySelector('head').append(style);
    const seed=root.querySelector('#clb-seed');need(seed,'PORTABLE_SEED');
    seed.textContent=safeSeedText({schema:SEED_SCHEMA,items});
    const embedded=root.querySelector('#clb-app-inline');if(embedded)embedded.remove();
    if(publication){
      root.querySelector('#clb-publication-inline')?.remove();
      const pubScript=document.createElement('script');pubScript.id='clb-publication-inline';
      pubScript.textContent=publication.replace(/<\/(script)/gi,'<\\/$1');
      root.querySelector('body').append(pubScript);
    }
    const code=document.createElement('script');code.id='clb-app-inline';
    // Inline JS never contains markup from a card. Its closing-tag sequences
    // are escaped when serialised into HTML, independent of the original JSON.
    code.textContent=js.replace(/<\/(script)/gi,'<\\/$1');
    root.querySelector('body').append(code);
    for(const id of ['topic-grid','station-tabs','follow-up-list','prompt-support','vocabulary','toolkit']){
      root.querySelector('#'+id)?.replaceChildren();
    }
    const notice=root.querySelector('#notice');if(notice){notice.textContent='';notice.hidden=true;}
    const viewer=root.querySelector('#viewer');if(viewer)viewer.hidden=true;
    const lib=root.querySelector('#library');if(lib)lib.hidden=false;
    const hero=root.querySelector('#hero');if(hero)hero.hidden=false;
    const upload=root.querySelector('#upload-zone');if(upload)upload.hidden=mode==='student';
    const out='<!doctype html>\n'+root.outerHTML;
    need(root.querySelectorAll('script[src]').length===0,'PORTABLE_GATE_LEAK');
    saveBlob(out,'text/html;charset=utf-8',name);
    inform(mode==='student'?'Samostatná studentská lekce byla připravena ke stažení.':
      'Aktuální knihovna byla uložena jako samostatná HTML aplikace.');
  }
  async function exportPublicationDraft(items){
    need(!state.student&&Array.isArray(items)&&items.length>0,'AUTHOR_EXPORT_ONLY');
    const publisher=global.CLBPublication;
    need(publisher&&typeof publisher.makeDraft==='function'&&
      typeof publisher.inspectDraft==='function','PUBLICATION_MODULE_MISSING');
    if(!global.confirm('Připravit '+items.length+
      ' témat k veřejnému vydání? Balíček obsahuje texty otázek a slovníky. '+
      'Nic se zatím neodešle na GitHub ani Cloudflare. Před zveřejněním je nutná revize a podpisy.'))return;
    const draft=await publisher.makeDraft(items,core.validateRecord);
    await publisher.inspectDraft(draft,core.validateRecord);
    saveBlob(JSON.stringify(draft,null,2),'application/json;charset=utf-8',
      'CLB_NAVRH_K_PUBLIKACI_'+new Date().toISOString().slice(0,10)+'.json');
    inform('Připraven neveřejný návrh: '+draft.topicCount+' témat, '+
      draft.variantCount+' variant. Na GitHub ani Cloudflare se nic neodeslalo.');
  }
  async function importFiles(files){
    if(state.student)return;
    const sources=Array.from(files||[]).filter(x=>x?.name&&/\.html?$/i.test(x.name));
    if(!sources.length){inform('Vyberte jeden nebo více souborů HTML.',true);return;}
    const results=[];let added=0,updated=0;
    for(const file of sources){
      try{
        need(file.size>0&&file.size<=MAX_SOURCE,'FILE_TOO_LARGE');
        need(global.crypto?.subtle,'SHA256_UNAVAILABLE');
        const sourceBytes=await file.arrayBuffer();
        need(sourceBytes.byteLength===file.size&&sourceBytes.byteLength<=MAX_SOURCE,'FILE_BYTES');
        const originalSha=Array.from(new Uint8Array(await global.crypto.subtle.digest(
          'SHA-256',sourceBytes)),b=>b.toString(16).padStart(2,'0')).join('');
        let raw;try{raw=new TextDecoder('utf-8',{fatal:true}).decode(sourceBytes);}
        catch{fail('INVALID_UTF8_SOURCE');}
        const rec=parseCard(raw,file.name);
        rec.id=canonicalTopicId(rec.id);
        rec.sourceMasterSha256=originalSha;
        need(state.records.size<MAX_RECORDS||state.records.has(rec.id),'LIBRARY_FULL');
        rec.fingerprint=originalSha;
        const old=state.records.get(rec.id);
        if(old?.fingerprint===rec.fingerprint){results.push(file.name+': beze změny');continue;}
        if(old)updated++;else added++;
        state.records.set(rec.id,rec);await persist(rec);
      }catch(e){results.push(file.name+': '+String(e?.message||'neznámý formát').slice(0,130));}
    }
    renderLibrary();const summary='Import dokončen: '+added+' nových, '+updated+' aktualizovaných témat.';
    inform(summary+(results.length?' '+results.slice(0,5).join(' | '):''),
      Boolean(results.some(x=>x.includes('CLB_TOPICS_'))));
  }
  async function importBackup(file){
    if(state.student)return;
    try{
      need(file?.size>0&&file.size<=MAX_BACKUP,'BACKUP_FILE_SIZE');
      const items=restoreBackup(await file.text());
      const combined=new Set([...state.records.keys(),...items.map(x=>x.id)]);
      need(combined.size<=MAX_RECORDS,'LIBRARY_FULL');
      for(const item of items){state.records.set(item.id,item);await persist(item);}
      renderLibrary();inform('Obnoveno '+items.length+' témat ze zálohy.');
    }catch(e){inform('Zálohu nelze použít: '+(e.message||'neznámý problém'),true);}
  }
  function bind(){
    $('theme-toggle').addEventListener('click',()=>{
      state.theme=state.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=state.theme;
      $('theme-toggle').textContent=state.theme==='dark'?'☀ Světlý režim':'☾ Tmavý režim';
    });
    $('language-select').addEventListener('change',()=>{state.lang=$('language-select').value;renderLibrary();});
    $('cefr-select').addEventListener('change',()=>{state.cefr=$('cefr-select').value;renderLibrary();});
    $('search').addEventListener('input',()=>{state.search=$('search').value;renderLibrary();});
    $('back-library').addEventListener('click',()=>{location.hash='#/library';route();});
    $('station-prev').addEventListener('click',()=>navigateStation(state.station-1));
    $('station-next').addEventListener('click',()=>navigateStation(state.station+1));
    $('viewer-fullscreen').addEventListener('click',async()=>{
      const target=$('viewer');try{
        if(document.fullscreenElement){await document.exitFullscreen();return;}
        await target.requestFullscreen?.();
      }catch{inform('Tento prohlížeč celou obrazovku nepovolil.',true);}
    });
    $('timer-start').addEventListener('click',()=>{
      if(state.running){timerTick();stopTimer();timerDraw();return;}
      if(state.clock<=0)resetTimer();state.running=true;
      state.clockDeadline=performance.now()+state.clock*1000;
      state.timer=setInterval(timerTick,180);timerDraw();
    });
    $('timer-reset').addEventListener('click',resetTimer);
    $('timer-minutes').addEventListener('change',resetTimer);
    $('timer-seconds').addEventListener('change',resetTimer);
    if(!state.student){
      $('upload-trigger').addEventListener('click',()=>$('topic-files').click());
      $('topic-files').addEventListener('change',e=>{void importFiles(e.target.files);
        e.target.value='';});
      $('backup-import-trigger').addEventListener('click',()=>$('backup-files').click());
      $('backup-files').addEventListener('change',e=>{
        const file=e.target.files?.[0];if(file)void importBackup(file);e.target.value='';});
      $('export-backup').addEventListener('click',exportJson);
      $('export-publication-draft')?.addEventListener('click',()=>void exportPublicationDraft(currentList()).catch(e=>inform(e.message,true)));
      $('export-all-html').addEventListener('click',()=>void exportPortable(currentList(),'teacher',
        'Conversation_Lab_Moje_Temata.html').catch(e=>inform(e.message,true)));
      const zone=$('upload-zone');
      zone.addEventListener('dragover',e=>{e.preventDefault();zone.classList.add('dragover');});
      zone.addEventListener('dragleave',()=>zone.classList.remove('dragover'));
      zone.addEventListener('drop',e=>{e.preventDefault();zone.classList.remove('dragover');
        void importFiles(e.dataTransfer?.files);});
    }
    window.addEventListener('hashchange',route);
    window.addEventListener('pagehide',stopTimer);
    window.addEventListener('pageshow',event=>{if(event.persisted)route();});
  }
  async function init(){
    if(!$('clb-app'))return;
    let seed=[];
    try{const raw=JSON.parse($('clb-seed').textContent||'[]');
      const items=Array.isArray(raw)?raw:raw?.items;
      need(Array.isArray(items)&&items.length<=MAX_RECORDS,'SEED_FORMAT');
      seed=items.map(validateRecord);
      need(new Set(seed.map(x=>x.id)).size===seed.length,'SEED_DUPLICATES');
    }catch(e){inform('Nelze načíst předpřipravenou knihovnu: '+e.message,true);}
    bind();await startStore(seed);setStorageStatus();
    if(state.student){$('hero').querySelector('h1').textContent='Konverzace pro vaši hodinu.';
      $('hero').querySelector('p').textContent='Vyberte jazyk, úroveň a některou z osmi stanic. Pracujte ve dvojicích.';
      $('upload-zone').hidden=true;$('studio-return').hidden=true;
    }else if(location.origin==='https://daniel22-dev.github.io'&&
      location.pathname.startsWith('/AI-Studio-GHRAB/conversation-lab-topics/')){
      $('studio-return').hidden=false;
    }
    route();
    if(!state.student&&state.records.size===0){inform('Knihovna je prázdná. Nahrajte své HTML konverzační karty – jednou nebo hromadně.');}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>void init());
  else void init();
})(typeof globalThis!=='undefined'?globalThis:this);
