import { setPermitToken, readPermitFile, clearPermit, getAccessSnapshot, hasAppAccess, formatReason, initialiseAccess } from './access-control.js';
const G = window.GHRAB;
const current = document.querySelector('#access-current');
const appsHost = document.querySelector('#access-apps');
const tokenInput = document.querySelector('#access-token');
const fileInput = document.querySelector('#access-file');
const feedback = document.querySelector('#access-feedback');
const dateFormat = value => new Intl.DateTimeFormat(G.state.language === 'cs' ? 'cs-CZ' : 'en-GB', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(value * 1000));
function clearFeedback(){ feedback.textContent=''; feedback.className='form-feedback'; }
function showFeedback(message, ok=false){ feedback.textContent=message; feedback.className=`form-feedback ${ok?'success':'error'}`; }
function roleLabel(role){ return role === 'admin' ? G.t('Správce AI Studia','AI Studio administrator') : G.t('Proškolený učitel','Trained teacher'); }
function renderCurrent(){
  const snapshot=getAccessSnapshot(); current.replaceChildren();
  const badge=document.createElement('span'); badge.className=`access-state-badge ${snapshot.valid?'ok':'locked'}`; badge.textContent=snapshot.valid?G.t('Přístup aktivní','Access active'):G.t('Přístup neaktivní','Access inactive');
  const title=document.createElement('h2'); title.textContent=snapshot.valid?(snapshot.permit.displayName||roleLabel(snapshot.permit.role)):G.t('Žádné platné oprávnění','No valid permit');
  const description=document.createElement('p'); description.textContent=snapshot.valid?`${roleLabel(snapshot.permit.role)} · ${G.t('platnost do','valid until')} ${dateFormat(snapshot.permit.exp)}`:formatReason(snapshot.reason,G.state.language);
  current.append(badge,title,description);
  if(snapshot.valid){
    const meta=document.createElement('dl'); meta.className='access-meta';
    const rows=[[G.t('Identifikátor','Identifier'),snapshot.permit.jti],[G.t('Vydáno','Issued'),dateFormat(snapshot.permit.iat)],[G.t('Role','Role'),roleLabel(snapshot.permit.role)]];
    rows.forEach(([label,value])=>{const dt=document.createElement('dt');dt.textContent=label;const dd=document.createElement('dd');dd.textContent=value;meta.append(dt,dd)});current.append(meta);
  }
}
async function renderApps(){
  const apps=await G.loadApps(); appsHost.replaceChildren(...apps.map(app=>{
    const access=hasAppAccess(app.id); const card=document.createElement('article'); card.className=`access-app-card ${access.enabled?'enabled':'locked'}`;
    const icon=document.createElement('img');icon.src=`../${app.icon}`;icon.alt='';
    const body=document.createElement('div');const title=document.createElement('h3');title.textContent=G.localised(app.name);const state=document.createElement('p');state.textContent=access.enabled?G.t('Odemčeno','Unlocked'):G.t('Uzamčeno','Locked');
    const training=G.requiredTraining(app.id);const note=document.createElement('small');note.textContent=training?.trainingRequired?`${G.t('Školení','Training')} ${training.trainingCode} · ${training.trainingVersion}`:G.t('Bez povinného školení','No mandatory training');body.append(title,state,note);card.append(icon,body);return card;
  }));
}
async function render(){ renderCurrent(); await renderApps(); }
async function activateToken(token){ clearFeedback(); const result=await setPermitToken(token); if(result.ok){tokenInput.value='';fileInput.value='';showFeedback(G.t('Přístup byl úspěšně ověřen a aktivován.','Access was successfully verified and activated.'),true);await render();return}showFeedback(formatReason(result.reason,G.state.language)); }
document.querySelector('#access-activate').addEventListener('click',()=>activateToken(tokenInput.value));
fileInput.addEventListener('change',async()=>{const file=fileInput.files?.[0];if(!file)return;clearFeedback();const result=await readPermitFile(file);if(result.ok){tokenInput.value='';showFeedback(G.t('Přístupový soubor byl ověřen a aktivován.','The access file was verified and activated.'),true);await render();}else showFeedback(formatReason(result.reason,G.state.language));});
document.querySelector('#access-clear').addEventListener('click',()=>{if(!confirm(G.t('Odebrat přístup z tohoto prohlížeče?','Remove access from this browser?')))return;clearPermit();showFeedback(G.t('Přístup byl z tohoto zařízení odebrán.','Access was removed from this device.'),true);render();});
document.addEventListener('ghrab:language',render);document.addEventListener('ghrab:access-changed',render);await initialiseAccess();await render();
