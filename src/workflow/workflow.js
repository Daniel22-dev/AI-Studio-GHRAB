const G = window.GHRAB;
const $ = selector => document.querySelector(selector);
const fields = {
  title: $('#wf-title'), subject: $('#wf-subject'), year: $('#wf-year'), level: $('#wf-level'),
  language: $('#wf-language'), quality: $('#wf-quality'), objectives: $('#wf-objectives'),
  source: $('#wf-source'), private: $('#wf-private')
};
const taskList = $('#task-list');
const validationHost = $('#workflow-validation');
const targetHost = $('#workflow-targets');
const workspaceHost = $('#workspace-grid');
const ludusResult = $('#ludus-compatibility');
let currentId = '';
let apps = [];
const DRAFT_KEY = 'ghrab.workflow.draft.v1';
let draftTimer = 0;
let lastSavedSignature = '';
let initialising = true;

const qualityLabels = {
  'ai-draft': ['Návrh AI','AI draft'],
  'teacher-reviewed': ['Zkontrolováno učitelem','Teacher-reviewed'],
  'classroom-tested': ['Vyzkoušeno ve výuce','Classroom-tested'],
  'commission-reviewed': ['Ověřeno předmětovou komisí','Commission-reviewed']
};

function uid(prefix='mat'){
  return `${prefix}-${Date.now().toString(36)}-${crypto.getRandomValues(new Uint32Array(1))[0].toString(36)}`;
}
function now(){ return new Date().toISOString(); }
function lines(value){ return value.split(/\r?\n/).map(v=>v.trim()).filter(Boolean); }
function safeFileName(value){ return String(value || 'material').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').toLowerCase() || 'material'; }
function dispatchInput(el){ el.dispatchEvent(new Event('input',{bubbles:true})); }
function materialSignature(material){
  const copy = JSON.parse(JSON.stringify(material));
  if (copy.provenance) { delete copy.provenance.createdAt; delete copy.provenance.updatedAt; delete copy.provenance.portalVersion; }
  return JSON.stringify(copy);
}
function setDraftStatus(message){ const host=$('#draft-status'); if(host) host.textContent=message; }
function saveDraft(){
  if (initialising) return;
  const material=collectMaterial();
  const ok=G.safeSetJson(DRAFT_KEY,{schema:'ghrab-workflow-draft-v1',savedAt:now(),material},{silent:true});
  if(ok) setDraftStatus(G.t('Koncept uložen automaticky.','Draft saved automatically.'));
  else setDraftStatus(G.t('Koncept se nepodařilo uložit.','Draft could not be saved.'));
}
function scheduleDraft(){ clearTimeout(draftTimer); setDraftStatus(G.t('Ukládám koncept…','Saving draft…')); draftTimer=setTimeout(saveDraft,650); }
function currentIsDirty(){ return materialSignature(collectMaterial()) !== lastSavedSignature; }

function taskData(row){
  const type = row.querySelector('[data-task-type]').value;
  const options = lines(row.querySelector('[data-task-options]').value);
  const answerRaw = row.querySelector('[data-task-answer]').value.trim();
  let answer = answerRaw;
  if(type === 'select' || type === 'truefalse'){
    const numeric = Number(answerRaw);
    if(Number.isInteger(numeric) && numeric >= 1) answer = numeric - 1;
    else {
      const idx = options.findIndex(o => o.toLocaleLowerCase() === answerRaw.toLocaleLowerCase());
      answer = idx >= 0 ? idx : answerRaw;
    }
  }
  return {
    id: row.dataset.taskId || uid('task'), type,
    prompt: row.querySelector('[data-task-prompt]').value.trim(), options,
    answer,
    explanation: row.querySelector('[data-task-explanation]').value.trim(),
    difficulty: Number(row.querySelector('[data-task-difficulty]').value || 2)
  };
}

function createTaskRow(task={}){
  const row = document.createElement('article');
  row.className = 'task-row panel-inset';
  row.dataset.taskId = task.id || uid('task');
  const header = document.createElement('div'); header.className='task-row-head';
  const title = document.createElement('strong'); title.textContent = G.t('Úloha','Task');
  const remove = document.createElement('button'); remove.type='button'; remove.className='task-remove'; remove.textContent='×'; remove.setAttribute('aria-label',G.t('Odstranit úlohu','Remove task')); remove.addEventListener('click',()=>{row.remove(); updateAll();});
  header.append(title,remove);

  const grid = document.createElement('div'); grid.className='form-grid task-grid';
  const makeField = (labelText, control) => { const wrap=document.createElement('div'); wrap.className='field'; const label=document.createElement('label'); label.textContent=labelText; wrap.append(label,control); return wrap; };
  const type = document.createElement('select'); type.dataset.taskType='';
  [['select','Výběr z možností','Multiple choice'],['truefalse','Pravda / nepravda','True / false'],['short','Krátká odpověď','Short answer'],['open','Otevřená odpověď','Open response'],['order','Řazení','Ordering']].forEach(([value,cs,en])=>{const o=document.createElement('option');o.value=value;o.textContent=G.t(cs,en);type.append(o)}); type.value=task.type||'select';
  const difficulty=document.createElement('select'); difficulty.dataset.taskDifficulty=''; [1,2,3].forEach(v=>{const o=document.createElement('option');o.value=String(v);o.textContent=`${G.t('Obtížnost','Difficulty')} ${v}`;difficulty.append(o)}); difficulty.value=String(task.difficulty||2);
  const prompt=document.createElement('textarea'); prompt.rows=2; prompt.dataset.taskPrompt=''; prompt.value=task.prompt||'';
  const options=document.createElement('textarea'); options.rows=3; options.dataset.taskOptions=''; options.value=(task.options||[]).join('\n'); options.placeholder=G.t('Každá možnost na nový řádek','One option per line');
  const answer=document.createElement('input'); answer.type='text'; answer.dataset.taskAnswer=''; answer.value=task.answer == null ? '' : (typeof task.answer==='number' ? String(task.answer+1) : String(task.answer)); answer.placeholder=G.t('Číslo možnosti nebo text odpovědi','Option number or answer text');
  const explanation=document.createElement('textarea'); explanation.rows=2; explanation.dataset.taskExplanation=''; explanation.value=task.explanation||'';
  grid.append(makeField(G.t('Typ','Type'),type),makeField(G.t('Obtížnost','Difficulty'),difficulty),makeField(G.t('Zadání','Prompt'),prompt),makeField(G.t('Možnosti / banka','Options / word bank'),options),makeField(G.t('Správná odpověď','Correct answer'),answer),makeField(G.t('Vysvětlení','Explanation'),explanation));
  row.append(header,grid);
  row.querySelectorAll('input,textarea,select').forEach(el=>el.addEventListener('input',updateAll));
  return row;
}

function collectMaterial(){
  const tasks=[...taskList.querySelectorAll('.task-row')].map(taskData).filter(t=>t.prompt || t.options.length || String(t.answer).trim());
  const objectives=lines(fields.objectives.value);
  return {
    schema:'ghrab-material-v1', id: currentId || uid(), version:1,
    title:fields.title.value.trim(), subject:fields.subject.value.trim(), yearGroup:fields.year.value.trim(), level:fields.level.value.trim(), language:fields.language.value,
    objectives,
    content:{ sourceText:fields.source.value.trim(), vocabulary:[], tasks },
    differentiation:{ variants:[] },
    quality:{ status:fields.quality.value, reviewedAt:fields.quality.value==='ai-draft'?null:now() },
    provenance:{ createdAt:now(), updatedAt:now(), containsPersonalData:!fields.private.checked, source:'ai-studio-workflow', portalVersion:G.VERSION },
    workflow:{ compatibleTargets: compatibility( {title:fields.title.value.trim(),subject:fields.subject.value.trim(),objectives,content:{sourceText:fields.source.value.trim(),tasks}} ).filter(x=>x.ready).map(x=>x.id) }
  };
}

function setMaterial(material){
  currentId = material.id || uid();
  fields.title.value=material.title||''; fields.subject.value=material.subject||''; fields.year.value=material.yearGroup||''; fields.level.value=material.level||''; fields.language.value=material.language||'cs'; fields.quality.value=material.quality?.status||'ai-draft'; fields.objectives.value=(material.objectives||[]).join('\n'); fields.source.value=material.content?.sourceText||''; fields.private.checked=material.provenance?.containsPersonalData===false;
  taskList.replaceChildren(...(material.content?.tasks||[]).map(createTaskRow));
  if(!taskList.children.length) taskList.append(createTaskRow());
  updateAll();
}

function validate(material){
  const checks = [
    {ok:material.schema==='ghrab-material-v1',cs:'Platné schéma GHRAB Material v1',en:'Valid GHRAB Material v1 schema'},
    {ok:Boolean(material.title),cs:'Název materiálu',en:'Resource title'},
    {ok:Boolean(material.subject),cs:'Předmět',en:'Subject'},
    {ok:material.objectives.length>0,cs:'Alespoň jeden výukový cíl',en:'At least one learning objective'},
    {ok:Boolean(material.content.sourceText)||material.content.tasks.length>0,cs:'Zdrojový obsah nebo strukturované úlohy',en:'Source content or structured tasks'},
    {ok:material.provenance.containsPersonalData===false,cs:'Potvrzeno bez osobních a citlivých údajů',en:'Confirmed free of personal and sensitive data'},
    {ok:material.content.tasks.every(t=>t.prompt),cs:'Všechny rozepsané úlohy mají zadání',en:'All started tasks have a prompt'}
  ];
  return checks;
}

function compatibility(material){
  const tasks=material.content?.tasks||[];
  const structured=tasks.filter(t=>t.prompt);
  const ludus=structured.filter(t=>['select','truefalse','short','order'].includes(t.type));
  return [
    {id:'differentiator',ready:Boolean(material.content?.sourceText)&&material.objectives?.length>0,reason:G.t('Potřebuje zdrojový obsah a výukový cíl.','Requires source content and a learning objective.')},
    {id:'generator',ready:Boolean(material.title)&&Boolean(material.subject)&&(Boolean(material.content?.sourceText)||structured.length>0),reason:G.t('Převezme název, skupinu, úroveň, látku a zdrojový obsah.','Takes title, group, level, topic and source content.')},
    {id:'ludus',ready:ludus.length>=3,reason:G.t(`Převoditelných úloh: ${ludus.length}. Pro smysluplnou hru jsou potřeba alespoň 3.`,`Convertible tasks: ${ludus.length}. At least 3 are needed for a meaningful game.`)},
    {id:'correspondence',ready:Boolean(material.content?.sourceText),reason:G.t('Zdrojový obsah lze převést na návrh školního sdělení.','Source content can be turned into a school communication draft.')}
  ];
}

function renderValidation(){
  const material=collectMaterial();
  validationHost.replaceChildren(...validate(material).map(check=>{const item=document.createElement('div');item.className=`validation-item ${check.ok?'ok':'missing'}`;const mark=document.createElement('span');mark.textContent=check.ok?'✓':'!';const text=document.createElement('span');text.textContent=G.t(check.cs,check.en);item.append(mark,text);return item;}));
}

function renderTargets(){
  const material=collectMaterial();
  const states=new Map(compatibility(material).map(x=>[x.id,x]));
  targetHost.replaceChildren(...apps.map(app=>{
    const state=states.get(app.id)||{ready:false,reason:G.t('Tento typ předávky zatím není definován.','This handoff type is not yet defined.')};
    const item=document.createElement('article');item.className=`target-card accent-${app.id}`;
    const head=document.createElement('div');head.className='target-head';
    const icon=document.createElement('img');icon.src=app.icon?.startsWith('http')?app.icon:`../${app.icon}`;icon.alt='';
    const text=document.createElement('div');const h=document.createElement('h3');h.textContent=G.localised(app.name);const p=document.createElement('p');p.textContent=state.reason;text.append(h,p);head.append(icon,text);
    const button=document.createElement('button');button.type='button';button.className='button target-button';button.disabled=!state.ready||!fields.private.checked;button.textContent=state.ready?G.t('Připravit a otevřít','Prepare and open'):G.t('Chybí podklady','Missing inputs');button.addEventListener('click',()=>handoff(app));
    item.append(head,button);return item;
  }));
}

function makeLudusContent(material){
  const convertible=(material.content.tasks||[]).filter(t=>t.prompt&&['select','truefalse','short','order'].includes(t.type));
  const stations=[];
  for(let i=0;i<convertible.length;i+=5){
    const slice=convertible.slice(i,i+5);
    const qs=slice.map(task=>{
      if(task.type==='select'||task.type==='truefalse'){
        const options=task.type==='truefalse'&&task.options.length<2?[G.t('Ano','Yes'),G.t('Ne','No')]:task.options;
        const answer=typeof task.answer==='number'?task.answer:Math.max(0,options.findIndex(o=>o.toLocaleLowerCase()===String(task.answer).toLocaleLowerCase()));
        return {t:task.prompt,opts:options,a:answer,exp:task.explanation||''};
      }
      if(task.type==='order') return {t:task.prompt,items:task.options,a:Array.isArray(task.answer)?task.answer:task.options,exp:task.explanation||''};
      return {t:task.prompt,bank:task.options,a:String(task.answer||''),exp:task.explanation||''};
    });
    const type=slice.every(t=>t.type==='select'||t.type==='truefalse')?'mc4':slice.every(t=>t.type==='order')?'order':'wordbank';
    stations.push({id:i/5,name:`${G.t('Stanice','Station')} ${i/5+1}`,icon:['✦','⌁','◇','⬡'][stations.length%4],topic:material.title,atmo:G.t('Výuková mise vytvořená v AI Studio GHRAB.','A learning mission created in AI Studio GHRAB.'),reward:{icon:'★',name:G.t('Datový fragment','Data fragment'),desc:G.t('Postup k další části mise.','Progress to the next part of the mission.')},exercise:{type,inst:G.t('Vyřešte úlohy a pokračujte v misi.','Solve the tasks and continue the mission.'),qs}});
  }
  return {
    schema:2,kind:'ludus.content',schemaVersion:'ludus-content-v2',
    game:{gameId:'studio-import',mechanicId:'content-only',engineStatus:'content-only',engineTitle:'AI Studio handoff',engineFile:''},
    meta:{world:'AI Studio GHRAB',docTitle:material.title,topic:material.title,subject:material.subject,teacher:'',saveKey:`ludus_studio_${material.id}`,skinId:'studio',skinSafe:true,frame:'content-only',sourceMaterialId:material.id},
    lang:{ui:'cs',content:material.language==='en'?'en':'cs',support:'cs'},
    theme:{variant:'safe',label:G.t('Bezpečný školní motiv','Safe school theme'),displayName:'AI Studio GHRAB',safeName:'AI Studio GHRAB',brandName:'',publication:G.t('Vhodné pro interní školní použití.','Suitable for internal school use.')},
    exerciseTypes:[...new Set(stations.map(s=>s.exercise.type))],
    flow:{model:'mapStationsFinalChallenge',label:G.t('Mapa stanic','Station map'),capabilities:{hasStations:true,hasBoss:false,hasTeams:true,hasSaveLoadResume:true},blocks:{stations,finalChallenge:null}},
    teams:[],stations,finalChallenge:null
  };
}

function renderLudus(){
  const material=collectMaterial(); const state=compatibility(material).find(x=>x.id==='ludus');
  ludusResult.dataset.level=state.ready?'green':'orange';
  ludusResult.textContent=state.ready?G.t('Balíček je připraven k převodu do LUDUS_CONTENT v2. Studio vytvoří stanice z podporovaných úloh.','The package is ready for conversion to LUDUS_CONTENT v2. The Studio will create stations from supported tasks.'):state.reason;
  $('#ludus-export').disabled=!state.ready||!fields.private.checked;
}

function updateAll(){ renderValidation(); renderTargets(); renderLudus(); scheduleDraft(); }

function downloadJson(data,name){ G.downloadJson(data,name); }
function handoff(app){
  const material=collectMaterial();
  const checks=validate(material); if(checks.some(c=>!c.ok)){G.showToast(G.t('Nejprve doplňte povinné údaje a potvrďte bezpečnost.','Complete required fields and confirm safety first.'));return;}
  currentId=material.id;
  const payload=G.createHandoff(app.id,material);
  if(!payload){G.showToast(G.t('Předávku se nepodařilo uložit. Uvolněte místní úložiště a zkuste to znovu.','The handoff could not be saved. Free local storage and try again.'));return;}
  if($('#handoff-backup')?.checked) downloadJson(material,`${safeFileName(material.title)}-pro-${app.id}.ghrab.json`);
  G.recordPilotEvent({type:'handoff',appId:app.id,materialId:material.id,estimatedMinutes:5});
  const target=new URL(app.launchUrl);target.searchParams.set('studioHandoff','1');target.searchParams.set('material',material.id);window.open(target.toString(),'_blank','noopener,noreferrer');
  G.showToast(G.t(`Předávka pro ${G.localised(app.name)} je připravena.`,`Handoff for ${G.localised(app.name)} is ready.`));
}

function saveWorkspace(){
  const material=collectMaterial(); currentId=material.id; material.provenance.createdAt=G.getWorkspace().find(x=>x.id===material.id)?.provenance?.createdAt||now();
  const saved=G.saveWorkspaceMaterial(material);
  if(!saved){G.showToast(G.t('Materiál se nepodařilo uložit. Exportujte jej do souboru a uvolněte místní úložiště.','The resource could not be saved. Export it to a file and free local storage.'));return;}
  lastSavedSignature=materialSignature(saved);
  G.safeRemoveItem(DRAFT_KEY);
  renderWorkspace(); G.recordPilotEvent({type:'material-saved',materialId:material.id,estimatedMinutes:10}); G.showToast(G.t('Materiál byl uložen v tomto prohlížeči.','The resource was saved in this browser.'));
}
function renderWorkspace(){
  const materials=G.getWorkspace();
  const usage=G.storageUsage();
  const workspaceKb=Math.round(new Blob([JSON.stringify(materials)]).size/1024);
  const storageHost=$('#workspace-storage');
  if(storageHost) storageHost.textContent=G.t(`Pracovní prostor: přibližně ${workspaceKb} kB · celkem místní data Studia: ${usage.kilobytes} kB.`,`Workspace: approximately ${workspaceKb} kB · total local Studio data: ${usage.kilobytes} kB.`);
  if(!materials.length){workspaceHost.innerHTML=`<div class="empty-state">${G.t('Pracovní prostor je zatím prázdný.','The workspace is empty.')}</div>`;return;}
  workspaceHost.replaceChildren(...materials.map(material=>{
    const card=document.createElement('article');card.className='workspace-card';
    const status=document.createElement('span');status.className='quality';status.textContent=G.t(...(qualityLabels[material.quality?.status]||qualityLabels['ai-draft']));
    const h=document.createElement('h3');h.textContent=material.title||G.t('Bez názvu','Untitled');
    const p=document.createElement('p');p.textContent=[material.subject,material.level,material.yearGroup].filter(Boolean).join(' · ');
    const meta=document.createElement('small');meta.textContent=G.t(`Aktualizováno ${new Date(material.provenance?.updatedAt||Date.now()).toLocaleString('cs-CZ')}`,`Updated ${new Date(material.provenance?.updatedAt||Date.now()).toLocaleString('en-GB')}`);
    const actions=document.createElement('div');actions.className='app-actions';
    const open=document.createElement('button');open.type='button';open.className='button secondary';open.textContent=G.t('Otevřít','Open');open.addEventListener('click',()=>{setMaterial(material);scrollTo({top:0,behavior:'smooth'});});
    const exp=document.createElement('button');exp.type='button';exp.className='button ghost';exp.textContent=G.t('Export','Export');exp.addEventListener('click',()=>downloadJson(material,`${safeFileName(material.title)}.ghrab.json`));
    const del=document.createElement('button');del.type='button';del.className='button danger';del.textContent=G.t('Smazat','Delete');del.addEventListener('click',()=>{if(confirm(G.t('Smazat tento místní materiál?','Delete this local resource?'))){G.deleteWorkspaceMaterial(material.id);renderWorkspace();}});
    actions.append(open,exp,del);card.append(status,h,p,meta,actions);return card;
  }));
}

async function importFile(file){
  try{const material=JSON.parse(await file.text());if(!G.validMaterial(material))throw new Error('schema');setMaterial(material);lastSavedSignature=materialSignature(material);G.showToast(G.t('Balíček byl načten.','Package loaded.'));}
  catch{G.showToast(G.t('Soubor není platný GHRAB Material v1.','The file is not a valid GHRAB Material v1 package.'));}
}

function sample(){
  setMaterial({schema:'ghrab-material-v1',id:uid(),version:1,title:'Past Simple: The unexpected journey',subject:'Anglický jazyk',yearGroup:'2. ročník',level:'B1',language:'en',objectives:['Žák rozpozná minulý čas pravidelných a nepravidelných sloves.','Žák seřadí události podle textu.'],content:{sourceText:'Last Saturday, Mia missed her usual bus. She walked to the station, met an old friend and discovered a small bookshop she had never seen before.',vocabulary:['missed','walked','met','discovered'],tasks:[{id:uid('task'),type:'select',prompt:'Why did Mia walk to the station?',options:['She missed her bus.','She lost her book.','She met a teacher.','She wanted to exercise.'],answer:0,explanation:'The text says she missed her usual bus.',difficulty:1},{id:uid('task'),type:'select',prompt:'Choose the correct past form: meet',options:['meeted','met','meet','meeting'],answer:1,explanation:'Meet is irregular: meet – met – met.',difficulty:1},{id:uid('task'),type:'truefalse',prompt:'Mia already knew the bookshop.',options:['True','False'],answer:1,explanation:'She had never seen it before.',difficulty:2},{id:uid('task'),type:'order',prompt:'Put the events in the correct order.',options:['Mia missed the bus.','She walked to the station.','She met an old friend.','She discovered a bookshop.'],answer:['Mia missed the bus.','She walked to the station.','She met an old friend.','She discovered a bookshop.'],explanation:'This follows the order in the text.',difficulty:2}],},differentiation:{variants:[]},quality:{status:'teacher-reviewed',reviewedAt:now()},provenance:{createdAt:now(),updatedAt:now(),containsPersonalData:false,source:'demo'}});
}

$('#task-add').addEventListener('click',()=>{taskList.append(createTaskRow());updateAll();});
$('#workflow-import').addEventListener('change',e=>{const file=e.target.files?.[0];if(file)importFile(file);e.target.value='';});
$('#workflow-sample').addEventListener('click',sample);
$('#workflow-clear').addEventListener('click',()=>{if(currentIsDirty()&&!confirm(G.t('Vymazat rozpracovaný materiál? Neuložené změny budou ztraceny.','Clear the draft resource? Unsaved changes will be lost.')))return;currentId='';G.safeRemoveItem(DRAFT_KEY);setMaterial({schema:'ghrab-material-v1',id:uid(),version:1,title:'',subject:'',yearGroup:'',level:'',language:'cs',objectives:[],content:{sourceText:'',tasks:[]},quality:{status:'ai-draft'},provenance:{containsPersonalData:true}});});
$('#workflow-save').addEventListener('click',saveWorkspace);
$('#workflow-export').addEventListener('click',()=>{const material=collectMaterial();downloadJson(material,`${safeFileName(material.title)}.ghrab.json`);G.recordPilotEvent({type:'material-exported',materialId:material.id,estimatedMinutes:2});});
$('#ludus-export').addEventListener('click',()=>{const material=collectMaterial();downloadJson(makeLudusContent(material),`${safeFileName(material.title)}-ludus-content-v2.json`);G.recordPilotEvent({type:'ludus-export',materialId:material.id,estimatedMinutes:15});});
Object.values(fields).forEach(el=>el.addEventListener('input',updateAll));
document.addEventListener('ghrab:language',()=>{[...taskList.querySelectorAll('.task-row')].forEach(row=>{const data=taskData(row);row.replaceWith(createTaskRow(data));});renderWorkspace();renderTargets();renderValidation();renderLudus();});
document.querySelector('[data-nav="workflow"]')?.setAttribute('aria-current','page');
Promise.all([G.loadApps()]).then(([loaded])=>{apps=loaded;renderTargets();});
const pending=G.readHandoff();
const draft=(()=>{try{return JSON.parse(G.safeGetItem(DRAFT_KEY,'null'))}catch{return null}})();
if(pending?.target==='workflow'&&G.validMaterial(pending.material)){
  setMaterial(pending.material);
  lastSavedSignature=materialSignature(pending.material);
}else if(draft?.schema==='ghrab-workflow-draft-v1'&&G.validMaterial(draft.material)){
  setMaterial(draft.material);
  lastSavedSignature='';
  G.showToast(G.t('Obnoven rozpracovaný materiál z tohoto prohlížeče.','A draft resource was restored from this browser.'));
}else{
  sample();
  lastSavedSignature=materialSignature(collectMaterial());
}
initialising=false;
setDraftStatus(G.t('Koncept se ukládá automaticky po první změně.','The draft is saved automatically after the first change.'));
addEventListener('beforeunload',event=>{if(!currentIsDirty())return;event.preventDefault();event.returnValue='';});
renderWorkspace(); renderValidation(); renderTargets(); renderLudus();
