const { loadApps, loadSyncReport, localised, t, base } = window.GHRAB;
const appHost = document.querySelector('#automation-apps');
const summaryHost = document.querySelector('#automation-summary');
const tableBody = document.querySelector('#sync-table-body');

function appRow(app){
  const row = document.createElement('article');
  row.className = 'automation-app';
  row.classList.add(`accent-${app.id}`);
  const icon = document.createElement('img'); icon.src = app.icon?.startsWith('http') ? app.icon : `${base}${app.icon}`; icon.alt = '';
  const text = document.createElement('div');
  const h = document.createElement('h3'); h.textContent = localised(app.name);
  const p = document.createElement('p'); p.textContent = app.repository || app.launchUrl;
  text.append(h,p);
  const v = document.createElement('span'); v.className = 'automation-version'; v.textContent = `v${app.version}`;
  row.append(icon,text,v); return row;
}
function kpi(value, labelCs, labelEn){
  const card = document.createElement('article'); card.className = 'automation-kpi';
  const strong = document.createElement('strong'); strong.textContent = value;
  const span = document.createElement('span'); span.textContent = t(labelCs,labelEn);
  card.append(strong,span); return card;
}
function renderTable(report, apps){
  tableBody.replaceChildren();
  const byId = new Map(apps.map(a => [a.id,a]));
  for(const source of report?.sources || []){
    const tr = document.createElement('tr');
    const app = byId.get(source.id);
    const values = [localised(app?.name) || source.id, source.url, source.ok ? t('Ověřeno','Verified') : t('Použit záložní registr','Fallback registry'), source.version || app?.version || '—'];
    values.forEach((value,index)=>{const td=document.createElement('td');td.textContent=value;if(index===2)td.className=source.ok?'sync-ok':'sync-warn';tr.append(td)});
    tableBody.append(tr);
  }
}
async function render(){
  const [apps,report] = await Promise.all([loadApps(),loadSyncReport()]);
  appHost.replaceChildren(...apps.map(appRow));
  const ok = report?.sources?.filter(s=>s.ok).length || 0;
  const total = report?.sources?.length || apps.length;
  const time = report?.generatedAt ? new Date(report.generatedAt).toLocaleString(document.documentElement.lang === 'en' ? 'en-GB':'cs-CZ') : '—';
  summaryHost.replaceChildren(kpi(apps.length,t('aplikací','applications'),t('aplikací','applications')),kpi(`${ok}/${total}`,'manifestů ověřeno','manifests verified'),kpi(report?.mode || 'fallback','režim synchronizace','sync mode'),kpi(time,'poslední build','latest build'));
  renderTable(report || {sources:[]},apps);
}
render().catch(()=>{ if(appHost) appHost.textContent=t('Data automatizace se nepodařilo načíst.','Automation data could not be loaded.'); });
document.addEventListener('ghrab:language',render);
