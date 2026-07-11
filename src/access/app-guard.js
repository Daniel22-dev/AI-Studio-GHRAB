import { initialiseAccess, hasAppAccess, requiredTraining, formatReason } from './access-control.js';

function language(){ return document.documentElement.lang === 'en' ? 'en' : 'cs'; }
function text(cs, en){ return language() === 'cs' ? cs : en; }
function studioHref(options){ return options.studioUrl || new URL('../', import.meta.url).href; }
function renderGate(appId, access, options = {}){
  const training = requiredTraining(appId);
  const appName = training?.label?.[language()] || training?.label?.cs || appId;
  document.documentElement.dataset.ghrabAccess = 'denied';
  document.body.replaceChildren();
  document.body.className = 'ghrab-access-gate-body';
  const main = document.createElement('main'); main.className = 'ghrab-access-gate';
  const mark = document.createElement('div'); mark.className = 'ghrab-access-gate-mark'; mark.textContent = '⬡';
  const eyebrow = document.createElement('p'); eyebrow.className = 'ghrab-access-gate-eyebrow'; eyebrow.textContent = 'AI STUDIO GHRAB';
  const title = document.createElement('h1'); title.textContent = text('Tato aplikace je uzamčena', 'This application is locked');
  const description = document.createElement('p');
  description.textContent = text(
    `${appName} se odemkne po aktivaci platného přístupu vydaného správcem AI Studia.`,
    `${appName} is unlocked after activating valid access issued by the AI Studio administrator.`
  );
  const reason = document.createElement('p'); reason.className = 'ghrab-access-gate-reason'; reason.textContent = formatReason(access.reason, language());
  if (training?.trainingRequired) {
    const trainingLine = document.createElement('p'); trainingLine.className = 'ghrab-access-gate-training';
    trainingLine.textContent = text(`Požadované školení: ${training.trainingCode} · verze ${training.trainingVersion}`, `Required training: ${training.trainingCode} · version ${training.trainingVersion}`);
    main.append(mark, eyebrow, title, description, reason, trainingLine);
  } else main.append(mark, eyebrow, title, description, reason);
  const actions = document.createElement('div'); actions.className = 'ghrab-access-gate-actions';
  const back = document.createElement('a'); back.href = studioHref(options); back.textContent = text('Otevřít AI Studio', 'Open AI Studio'); back.className = 'ghrab-access-gate-primary';
  const accessPage = document.createElement('a'); accessPage.href = new URL('access/', studioHref(options)).href; accessPage.textContent = text('Aktivovat přístup', 'Activate access'); accessPage.className = 'ghrab-access-gate-secondary';
  actions.append(back, accessPage); main.append(actions); document.body.append(main);
}
export async function protectApp(appId, options = {}){
  document.documentElement.dataset.ghrabAccess = 'checking';
  const snapshot = await initialiseAccess(options);
  const access = hasAppAccess(appId);
  if (snapshot.ready && access.enabled) {
    document.documentElement.dataset.ghrabAccess = 'granted';
    document.dispatchEvent(new CustomEvent('ghrab:app-access-granted', { detail: { appId, permit: access.permit } }));
    return true;
  }
  renderGate(appId, access, options);
  return false;
}
