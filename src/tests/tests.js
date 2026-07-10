import { safeExportSelfTest } from '../shared/safe-export.js';

const T=window.GHRAB; const box=document.querySelector('#test-results'); const run=document.querySelector('#run-tests');
function card(label, ok, detail){ const article=document.createElement('article'); article.className=`test-card ${ok?'ok':'fail'}`; const s=document.createElement('span'); s.textContent=ok?'✓':'!'; const h=document.createElement('h2'); h.textContent=label; const p=document.createElement('p'); p.textContent=detail; article.append(s,h,p); return article; }
async function imageOk(src){ return new Promise(resolve=>{ const img=new Image(); img.onload=()=>resolve(true); img.onerror=()=>resolve(false); img.src=src; }); }
function localStorageOk(){try{localStorage.setItem('ghrab.selftest','ok');const ok=localStorage.getItem('ghrab.selftest')==='ok';localStorage.removeItem('ghrab.selftest');return ok}catch{return false}}
function safeExportCheck(){ return safeExportSelfTest(); }

async function runChecks(){
  const results=[];
  try{ const apps=await T.loadApps(); results.push(card(T.t('Registr aplikací','Application registry'), Array.isArray(apps)&&apps.length>=4, T.t(`${apps.length} aplikace načteny.`,`${apps.length} applications loaded.`)));
    const icons=await Promise.all(apps.map(app=>imageOk(`../${app.icon}`))); results.push(card(T.t('Ikony aplikací','Application icons'), icons.every(Boolean), T.t(`${icons.filter(Boolean).length}/${icons.length} ikon je dostupných.`,`${icons.filter(Boolean).length}/${icons.length} icons are available.`))); }
  catch(e){ results.push(card(T.t('Registr aplikací','Application registry'), false, e.message)); }
  const storage=localStorageOk(); results.push(card(T.t('Lokální úložiště','Local storage'), storage, storage?T.t('Prohlížeč umí ukládat pracovní prostor, proškolení a pilotní údaje.','The browser can store workspace, training and pilot data.'):T.t('Úložiště je blokované.','Storage is blocked.')));
  try{ const material={schema:'ghrab-material-v1',id:'selftest',title:'Selftest',subject:'QA',level:'B1',content:{sourceText:'test',tasks:[]},createdAt:new Date().toISOString(),provenance:{}}; const created=T.createHandoff('generator', material); const ok=Boolean(created)&&T.readHandoff()?.material?.id==='selftest'; T.clearHandoff(); results.push(card(T.t('Handoff','Handoff'), ok, T.t('Krátkodobé předání materiálu je funkční.','Short-term material handoff works.'))); } catch(e){ results.push(card(T.t('Handoff','Handoff'), false, e.message)); }
  try{ const events=T.getPilotEvents(); results.push(card(T.t('Pilotní statistiky','Pilot statistics'), Array.isArray(events), T.t(`${events.length} anonymních událostí v tomto prohlížeči.`,`${events.length} anonymous events in this browser.`))); } catch(e){ results.push(card(T.t('Pilotní statistiky','Pilot statistics'), false, e.message)); }
  try{ const perms=await T.loadPermissions(); const ok=Boolean(perms?.apps&&Object.keys(perms.apps).length>=4&&perms?.serverEnforcement?.required); results.push(card(T.t('Model proškolení','Training model'), ok, T.t('Konfigurace lokálního dema a budoucích serverových oprávnění je dostupná.','Local demo and future server permission configuration is available.'))); } catch(e){ results.push(card(T.t('Model proškolení','Training model'), false, e.message)); }
  results.push(card(T.t('Bezpečný anonymní export','Safe anonymous export'), safeExportCheck(), T.t('Kontrola spustila skutečné exportní transformace nad záměrně citlivým testovacím objektem.','The check ran the real export transformations on an intentionally sensitive test object.')));
  const usage=T.storageUsage(); results.push(card(T.t('Ochrana místního úložiště','Local storage protection'), typeof T.safeSetJson==='function'&&Number.isFinite(usage.bytes), T.t(`Bezpečný zápis je aktivní · místní data přibližně ${usage.kilobytes} kB.`,`Safe writes are active · local data approximately ${usage.kilobytes} kB.`)));
  const langSwitch=Boolean(document.querySelector('.segmented [data-lang="cs"]')&&document.querySelector('.segmented [data-lang="en"]')); results.push(card(T.t('Mobilní přepínač jazyka','Mobile language switch'), langSwitch, T.t('Přepínač CZ/EN je součástí hlavičky i v mobilním režimu.','The CZ/EN switch remains part of the header in mobile mode.')));
  const sw='serviceWorker' in navigator; results.push(card(T.t('PWA jádro','PWA core'), sw, sw?T.t('Prohlížeč podporuje service worker.','Browser supports service workers.'):T.t('Tento režim nepodporuje service worker.','This mode does not support service workers.')));
  box.replaceChildren(...results);
}
async function renderTrainingDemo(){
  const host=document.querySelector('#training-list'); if(!host) return;
  const radios=[...document.querySelectorAll('input[name="access-mode"]')];
  radios.forEach(r=>{r.checked=T.getAccessMode()===r.value; r.onchange=()=>{T.setAccessMode(r.value); renderTrainingDemo(); T.showToast(T.t('Režim přístupu uložen. Vraťte se na Domů a uvidíte změnu karet.','Access mode saved. Return Home to see card changes.'));};});
  let apps=[]; try{apps=await T.loadApps()}catch{}
  const trained=T.getTrainedApps();
  host.replaceChildren(...apps.map(app=>{
    const label=document.createElement('label');
    const input=document.createElement('input'); input.type='checkbox'; input.value=app.id; input.checked=trained.includes(app.id);
    input.addEventListener('change',()=>{const next=new Set(T.getTrainedApps()); input.checked?next.add(app.id):next.delete(app.id); T.setTrainedApps([...next]);});
    const span=document.createElement('span'); const strong=document.createElement('strong'); strong.textContent=T.localised(app.name); const small=document.createElement('small'); small.textContent=T.t('označit jako proškoleno v tomto prohlížeči','mark as trained in this browser'); span.append(strong,document.createElement('br'),small); label.append(input,span); return label;
  }));
}
run?.addEventListener('click', runChecks); document.addEventListener('ghrab:language', ()=>{runChecks();renderTrainingDemo()}); document.addEventListener('ghrab:access', renderTrainingDemo); renderTrainingDemo(); runChecks();
