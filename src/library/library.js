let catalog = { items: [] };
const grid = document.querySelector('#library-grid');
const subject = document.querySelector('#subject-filter');
const type = document.querySelector('#type-filter');
const search = document.querySelector('#library-search');

function label(value){ return typeof value === 'string' ? value : value?.[window.GHRAB.state.language] || ''; }
function option(value, text){ const o=document.createElement('option'); o.value=value; o.textContent=text; return o; }
function uniqueOptions(keyField, labelField){
  const map = new Map();
  catalog.items.forEach(item => map.set(item[keyField], label(item[labelField])));
  return [...map.entries()].sort((a,b)=>a[1].localeCompare(b[1], window.GHRAB.state.language));
}
function renderFilters(){
  const currentS=subject.value || 'all', currentT=type.value || 'all';
  subject.replaceChildren(option('all', window.GHRAB.t('Všechny','All')));
  type.replaceChildren(option('all', window.GHRAB.t('Všechny','All')));
  uniqueOptions('subjectKey','subject').forEach(([key,text])=>subject.append(option(key,text)));
  uniqueOptions('typeKey','type').forEach(([key,text])=>type.append(option(key,text)));
  subject.value=[...subject.options].some(o=>o.value===currentS)?currentS:'all';
  type.value=[...type.options].some(o=>o.value===currentT)?currentT:'all';
}
function render(){
  const q=search.value.trim().toLocaleLowerCase();
  const items=catalog.items.filter(i =>
    (subject.value==='all'||i.subjectKey===subject.value) &&
    (type.value==='all'||i.typeKey===type.value) &&
    (!q || [i.title.cs,i.title.en,i.description.cs,i.description.en,i.topic.cs,i.topic.en].join(' ').toLocaleLowerCase().includes(q))
  );
  if(!items.length){grid.innerHTML=`<div class="empty-state">${window.GHRAB.t('Žádný materiál neodpovídá filtrům.','No material matches the filters.')}</div>`;return;}
  grid.replaceChildren(...items.map(i=>{
    const a=document.createElement('article'); a.className='material-card';
    a.innerHTML=`<span class="quality">${label(i.quality)}</span><h2>${label(i.title)}</h2><p>${label(i.description)}</p><div class="app-meta"><span class="chip">${label(i.subject)}</span><span class="chip">${i.level}</span><span class="chip">${label(i.type)}</span></div><div class="app-actions"><a class="button primary" href="../${i.download}" download>${window.GHRAB.t('Stáhnout balíček','Download package')}</a><a class="button ghost" href="../schemas/ghrab-material-v1.schema.json" target="_blank" rel="noopener">${window.GHRAB.t('Zobrazit schéma','View schema')}</a></div>`;
    return a;
  }));
}
fetch('../library/catalog.json').then(r=>r.json()).then(data=>{catalog=data;renderFilters();render();}).catch(()=>grid.innerHTML=`<div class="empty-state">${window.GHRAB.t('Katalog se nepodařilo načíst.','The catalogue could not be loaded.')}</div>`);
[subject,type,search].forEach(el=>el.addEventListener('input',render));
document.addEventListener('ghrab:language',()=>{renderFilters();render();});
document.querySelector('[data-nav="library"]')?.setAttribute('aria-current','page');
