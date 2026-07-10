let apps=[];
const stats=document.querySelector('#pilot-stats');
function render(){
  const launches=window.GHRAB.getLaunches();
  if(!apps.length){stats.innerHTML='';return;}
  stats.replaceChildren(...apps.map(app=>{const item=launches[app.id]||{count:0};const d=document.createElement('div');d.className='stat-card';d.innerHTML=`<strong>${item.count}</strong><span>${window.GHRAB.t(app.name.cs,app.name.en)}</span>`;return d;}));
}
window.GHRAB.loadApps().then(data=>{apps=data;render();}); document.addEventListener('ghrab:language',render);
document.querySelector('#export-pilot').addEventListener('click',()=>{
  const payload={schema:'ghrab-pilot-summary-v1',exportedAt:new Date().toISOString(),portalVersion:window.GHRAB.VERSION,launches:window.GHRAB.getLaunches(),privacy:'No names, content or student results included.'};
  const blob=new Blob([JSON.stringify(payload,null,2)+'\n'],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`ghrab-pilot-summary-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
});
document.querySelector('#reset-pilot').addEventListener('click',()=>{if(confirm(window.GHRAB.t('Opravdu vymazat místní přehled spuštění?','Clear the local launch overview?'))){localStorage.removeItem('ghrab.pilot.launches');render();}});
document.querySelector('[data-nav="pilot"]')?.setAttribute('aria-current','page');
