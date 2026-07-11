import { buildImpactReport, normaliseMinutes, safeEvent, safeStatistics } from '../shared/safe-export.js';

await window.GHRAB.accessReady;
if (window.GHRAB.isAdmin()) {
const G=window.GHRAB;
const $=s=>document.querySelector(s);
let apps=[];
const CASE_KEY='ghrab.report.cases.v1';
const SETTINGS_KEY='ghrab.report.settings.v1';
function parse(key,fallback){try{return JSON.parse(G.safeGetItem(key)||JSON.stringify(fallback))}catch{return fallback}}
function getCases(){const x=parse(CASE_KEY,[]);return Array.isArray(x)?x:[]}
function saveCases(x){return G.safeSetJson(CASE_KEY,x.slice(-20))}
function getSettings(){return parse(SETTINGS_KEY,{})}
function saveSettings(){const data={title:$('#report-title').value,from:$('#report-from').value,to:$('#report-to').value,teachers:Number($('#report-teachers').value||0),subjects:Number($('#report-subjects').value||0)};G.safeSetJson(SETTINGS_KEY,data,{silent:true});return data}
function textEl(tag,text,cls){const e=document.createElement(tag);if(cls)e.className=cls;e.textContent=text;return e}
function eventLabel(type){const labels={handoff:['Předání mezi aplikacemi','Application handoff'],'material-saved':['Uložení materiálu','Resource saved'],'material-exported':['Export materiálu','Resource exported'],'ludus-export':['Export do LUDUSu','LUDUS export'],'feedback':['Zpětná vazba','Feedback'],'session':['Pilotní záznam','Pilot entry']};return G.t(...(labels[type]||[type,type]))}
function stats(){
 const launches=G.getLaunches();const events=G.getPilotEvents();const workspace=G.getWorkspace();
 return {launches,events,workspace,...safeStatistics({launches,events,workspace})};
}
function hours(minutes){return Math.round(Number(minutes||0)/60*10)/10}
function renderKpis(data,settings){
 const host=$('#report-kpis');host.replaceChildren();
 const vals=[
  [settings.teachers,G.t('zapojených učitelů','participating teachers')],
  [settings.subjects,G.t('zapojených předmětů','participating subjects')],
  [data.materialCount,G.t('místních materiálů','local resources')],
  [data.handoffs,G.t('předání mezi aplikacemi','application handoffs')],
  [hours(data.reportedMinutes),G.t('hodin vykázaných učiteli','teacher-reported hours')],
  [hours(data.estimatedMinutes),G.t('hodin orientačního odhadu (doplňkově)','indicative estimated hours (supplementary)')],
  [data.launchCount,G.t('spuštění ze Studia v tomto prohlížeči','launches from the Studio in this browser')]
 ];
 vals.forEach(([v,l])=>{const card=document.createElement('article');card.className='report-kpi';card.append(textEl('strong',String(v)),textEl('span',l));host.append(card)});
}
function renderApps(data){const host=$('#report-apps');host.replaceChildren(...apps.map(app=>{const count=data.launches[app.id]?.count||0;const row=document.createElement('div');row.className='report-app-row';const icon=document.createElement('img');icon.src=app.icon?.startsWith('http')?app.icon:`../${app.icon}`;icon.alt='';const name=textEl('strong',G.localised(app.name));const bar=document.createElement('span');bar.className='report-bar';const fill=document.createElement('i');const max=Math.max(1,...apps.map(a=>data.launches[a.id]?.count||0));fill.style.setProperty('--bar-width',`${Math.round(count/max*100)}%`);bar.append(fill);const val=textEl('b',String(count));row.append(icon,name,bar,val);return row}));}
function renderEvents(data){const host=$('#report-events');const counts=new Map();data.events.forEach(e=>counts.set(e.type,(counts.get(e.type)||0)+1));if(!counts.size){host.innerHTML=`<div class="empty-state">${G.t('Zatím nejsou zaznamenány žádné pracovní události.','No workflow events have been recorded yet.')}</div>`;return}host.replaceChildren(...[...counts.entries()].sort((a,b)=>b[1]-a[1]).map(([type,count])=>{const row=document.createElement('div');row.className='report-event-row';row.append(textEl('span',eventLabel(type)),textEl('strong',String(count)));return row}))}
function renderCases(){const host=$('#report-cases');const cases=getCases();if(!cases.length){host.innerHTML=`<div class="empty-state">${G.t('Doplňte alespoň jednu konkrétní zkušenost z výuky.','Add at least one concrete classroom experience.')}</div>`;return}host.replaceChildren(...cases.map((item,index)=>{const card=document.createElement('article');card.className='case-card';card.append(textEl('h4',item.title),textEl('p',item.text));const remove=document.createElement('button');remove.type='button';remove.className='case-remove';remove.textContent=G.t('Odebrat','Remove');remove.addEventListener('click',()=>{const list=getCases();list.splice(index,1);if(saveCases(list))renderCases()});card.append(remove);return card}))}
function renderQuality(data){const host=$('#report-quality');const labels={'ai-draft':['Návrh AI','AI draft'],'teacher-reviewed':['Zkontrolováno učitelem','Teacher-reviewed'],'classroom-tested':['Vyzkoušeno ve výuce','Classroom-tested'],'commission-reviewed':['Ověřeno komisí','Commission-reviewed']};host.replaceChildren(...Object.entries(labels).map(([k,v])=>{const row=document.createElement('div');row.className='quality-row';row.append(textEl('span',G.t(...v)),textEl('strong',String(data.qualityCounts[k]||0)));return row}))}
function renderRecommendations(data,settings){const host=$('#report-recommendations');const rec=[];if(settings.teachers<3)rec.push(G.t('Rozšířit pilot alespoň na tři učitele, aby výsledky nebyly závislé na zkušenosti jediného uživatele.','Expand the pilot to at least three teachers so results do not depend on a single user.'));if(data.handoffs<3)rec.push(G.t('Ověřit propojený pracovní postup na několika reálných materiálech.','Test the connected workflow on several real resources.'));if((data.qualityCounts['teacher-reviewed']||0)+(data.qualityCounts['classroom-tested']||0)===0)rec.push(G.t('Zavést povinnou učitelskou kontrolu a označení kvality sdílených materiálů.','Introduce mandatory teacher review and quality labels for shared resources.'));rec.push(G.t('Po skončení pilotu projednat s IT školní doménu, přihlášení, samostatnou databázi, zálohování a bezpečné uložení API klíčů.','After the pilot, discuss a school domain, sign-in, a separate database, backups and secure API-key storage with IT.'));host.replaceChildren(...rec.map(x=>textEl('li',x)))}
function render(){const settings=saveSettings();const data=stats();$('#report-period').textContent=[settings.title,settings.from&&settings.to?`${settings.from} – ${settings.to}`:''].filter(Boolean).join(' · ');renderKpis(data,settings);renderApps(data);renderEvents(data);renderCases();renderQuality(data);renderRecommendations(data,settings)}
function csvCell(v){return `"${String(v??'').replaceAll('"','""')}"`}
function downloadText(text,name,type='text/plain'){const b=new Blob([text],{type});const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)}
function setupDefaults(){const s=getSettings();const today=new Date();const from=new Date(today);from.setDate(from.getDate()-84);$('#report-title').value=s.title||'12týdenní pilot AI Studio GHRAB';$('#report-from').value=s.from||from.toISOString().slice(0,10);$('#report-to').value=s.to||today.toISOString().slice(0,10);$('#report-teachers').value=s.teachers??0;$('#report-subjects').value=s.subjects??0}
$('#case-add').addEventListener('click',()=>{const title=$('#case-title').value.trim(),text=$('#case-text').value.trim();if(!title||!text){G.showToast(G.t('Doplňte název i popis případové studie.','Enter both a title and description.'));return}const list=getCases();list.push({title,text,createdAt:new Date().toISOString()});if(!saveCases(list))return;$('#case-title').value='';$('#case-text').value='';render()});
['#report-title','#report-from','#report-to','#report-teachers','#report-subjects'].forEach(sel=>$(sel).addEventListener('input',render));
$('#report-print').addEventListener('click',()=>window.print());
$('#report-json').addEventListener('click',()=>{const payload=buildImpactReport({portalVersion:G.VERSION,settings:saveSettings(),launches:G.getLaunches(),events:G.getPilotEvents(),workspace:G.getWorkspace(),caseCount:getCases().length});G.downloadJson(payload,`ai-studio-anonymni-report-${new Date().toISOString().slice(0,10)}.json`)});
$('#report-csv').addEventListener('click',()=>{const rows=[['at','type','appId','reportedMinutes','estimatedMinutes','rating','outcome'],...G.getPilotEvents().map(e=>{const safe=safeEvent(e);const minutes=normaliseMinutes(e);return[safe.at,safe.type,safe.appId||'',minutes.reportedMinutes||'',minutes.estimatedMinutes||'',safe.rating||'',safe.outcome||'']})];downloadText(rows.map(r=>r.map(csvCell).join(',')).join('\n'),`ai-studio-anonymni-udalosti-${new Date().toISOString().slice(0,10)}.csv`,'text/csv;charset=utf-8')});
document.addEventListener('ghrab:language',render);setupDefaults();G.loadApps().then(x=>{apps=x;render()});
}
