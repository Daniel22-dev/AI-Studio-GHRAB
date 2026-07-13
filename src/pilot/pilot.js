import { safeStatistics } from '../shared/safe-export.js';

await window.GHRAB.accessReady;
if (window.GHRAB.isAdmin()) {
const G=window.GHRAB;
const $=s=>document.querySelector(s);
let apps=[];
const PHASE_KEY='ghrab.pilot.phase';
const phases=[
  {id:1,title:['Rámec','Framework'],text:['Dobrovolníci, pravidla AI, anonymizace, IT konzultace a první bezpečné scénáře.','Volunteers, AI rules, anonymisation, IT consultation and first safe scenarios.']},
  {id:2,title:['Ověření','Validation'],text:['Reálné použití 2–3 nástrojů, automatická anonymní měření, učitelská kontrola a první výstupy do výuky.','Real use of 2–3 tools, automatic anonymous measurement, teacher review and first classroom outputs.']},
  {id:3,title:['Rozšíření','Expansion'],text:['Dobrovolné zapojení dalších předmětových komisí, úpravy podle potřeb a miniškolení.','Voluntary involvement of other subject teams, adjustments based on needs and mini-training.']},
  {id:4,title:['Vyhodnocení','Evaluation'],text:['Souhrn přínosu, rizik, nákladů a doporučení, zda pokračovat v oficiálním školním provozu.','Summary of benefits, risks, costs and recommendation on official school operation.']}
];
function eventLabel(e){
  const types={handoff:['Předání materiálu','Material handoff'],'handoff-consumed':['Převzetí materiálu','Material received'],'material-saved':['Uložení materiálu','Resource saved'],'material-exported':['Export materiálu','Resource export'],'ludus-export':['Export LUDUS','LUDUS export']};
  if(e.type==='generation'){
    const outcomes={success:['Test úspěšně vygenerován','Test generated successfully'],error:['Generování skončilo chybou','Generation ended with an error'],cancelled:['Generování zrušeno','Generation cancelled']};
    return G.t(...(outcomes[e.outcome]||['Generování testu','Test generation']));
  }
  return G.t(...(types[e.type]||[e.type,e.type]));
}
function appName(id){return G.localised(apps.find(a=>a.id===id)?.name)||G.t('AI Studio','AI Studio')}
function metrics(){const events=G.getPilotEvents(),launches=G.getLaunches(),workspace=G.getWorkspace();return{events,launches,workspace,...safeStatistics({events,launches,workspace})}}
function duration(seconds){
  const total=Math.max(0,Math.round(Number(seconds||0)));
  const h=Math.floor(total/3600),m=Math.floor((total%3600)/60);
  if(h)return `${h} h ${m} min`;
  if(m)return `${m} min`;
  return `${total} s`;
}
function renderKpis(){
  const m=metrics(),host=$('#pilot-kpis');
  const vals=[
    [m.launchCount,G.t('spuštění ze Studia v tomto prohlížeči','launches from the Studio in this browser')],
    [duration(m.activeSeconds),G.t('aktivního času v aplikacích','active time in applications')],
    [m.generationSuccess,G.t('úspěšně vygenerovaných testů','tests generated successfully')],
    [m.generationErrors,G.t('generování ukončených chybou','generations ending with an error')],
    [m.materialCount,G.t('místních materiálů','local resources')],
    [m.handoffs,G.t('předání mezi aplikacemi','application handoffs')]
  ];
  host.replaceChildren(...vals.map(([v,l])=>{const a=document.createElement('article');a.className='pilot-kpi';const strong=document.createElement('strong');strong.textContent=String(v);const span=document.createElement('span');span.textContent=l;a.append(strong,span);return a}));
}
function renderTimeline(){const current=Math.max(1,Math.min(4,Number($('#pilot-phase').value||1)));G.safeSetItem(PHASE_KEY,String(current),{silent:true});const host=$('#pilot-timeline');host.replaceChildren(...phases.map(p=>{const item=document.createElement('article');item.className='timeline-item';if(current>p.id)item.classList.add('complete');else if(current===p.id)item.classList.add('current');const w=document.createElement('div');w.className='timeline-week';w.textContent=`${G.t('Fáze','Phase')} ${p.id}`;const d=document.createElement('div');const h=document.createElement('h2');h.textContent=G.t(...p.title);const text=document.createElement('p');text.textContent=G.t(...p.text);d.append(h,text);item.append(w,d);return item}))}
function renderEvents(){const list=G.getPilotEvents().slice().reverse().slice(0,20),host=$('#pilot-events');if(!list.length){host.innerHTML=`<div class="empty-state">${G.t('Zatím nejsou žádné automatické pilotní záznamy.','There are no automatic pilot records yet.')}</div>`;return}host.replaceChildren(...list.map(e=>{const row=document.createElement('article');row.className=`pilot-event result-${e.outcome||e.result||'auto'}`;const top=document.createElement('div');const strong=document.createElement('strong');strong.textContent=eventLabel(e);const time=document.createElement('time');time.textContent=new Date(e.at).toLocaleString(G.state.language==='cs'?'cs-CZ':'en-GB');top.append(strong,time);const p=document.createElement('p');p.textContent=appName(e.appId);row.append(top,p);return row}))}
function render(){renderKpis();renderTimeline();renderEvents()}
$('#pilot-phase').value=G.safeGetItem(PHASE_KEY)||'1';
$('#pilot-phase').addEventListener('input',renderTimeline);
$('#export-pilot').addEventListener('click',()=>G.downloadPilotSummary());
$('#reset-pilot').addEventListener('click',()=>{if(confirm(G.t('Opravdu vymazat místní počty spuštění, aktivní čas, technické události a nastavení fáze? Materiály v pracovním prostoru zůstanou zachovány.','Clear local launches, active time, technical events and phase setting? Workspace resources will remain.'))){G.safeRemoveItem('ghrab.pilot.launches');G.clearPilotEvents();G.safeRemoveItem(PHASE_KEY);$('#pilot-phase').value='1';render()}});
document.addEventListener('ghrab:language',render);
G.loadApps().then(x=>{apps=x;render()});
render();

}
