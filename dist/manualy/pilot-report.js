await window.GHRAB.accessReady;
const G=window.GHRAB;
const buttons=[...document.querySelectorAll('[data-guide-step]')];
const panels=[...document.querySelectorAll('[data-guide-panel]')];
const prev=document.querySelector('#guide-prev');
const next=document.querySelector('#guide-next');
const progress=document.querySelector('#guide-progress');
let current=0;
function render(){
  current=Math.max(0,Math.min(panels.length-1,current));
  buttons.forEach((button,index)=>{button.classList.toggle('active',index===current);button.setAttribute('aria-current',index===current?'step':'false')});
  panels.forEach((panel,index)=>panel.classList.toggle('active',index===current));
  prev.disabled=current===0;
  next.disabled=current===panels.length-1;
  progress.textContent=`${current+1} / ${panels.length}`;
}
buttons.forEach((button,index)=>button.addEventListener('click',()=>{current=index;render()}));
prev.addEventListener('click',()=>{current-=1;render()});
next.addEventListener('click',()=>{current+=1;render()});
document.querySelector('#guide-download').addEventListener('click',()=>{G.downloadPilotSummary();G.showToast(G.t('Anonymní souhrn byl stažen. Nyní jej přiložte ke školnímu e-mailu.','The anonymous summary was downloaded. Now attach it to your school email.'))});
document.addEventListener('ghrab:language',render);
render();
