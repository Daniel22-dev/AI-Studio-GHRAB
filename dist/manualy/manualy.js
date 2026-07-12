const G = window.GHRAB;
const grid = document.querySelector('#manual-grid');
const accessSummary = document.querySelector('#manual-access-summary');
const syncState = document.querySelector('#manual-sync-state');
let apps = [];
let syncReport = null;

function make(tag, className, text){
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function accessText(access, appId){
  if (access.enabled) return access.reason === 'administrator'
    ? G.t('Správcovský přístup: manuál je odemčen.', 'Administrator access: the manual is unlocked.')
    : G.t('Manuál je odemčen stejným oprávněním jako aplikace.', 'The manual is unlocked by the same permit as the application.');
  const training = G.requiredTraining(appId);
  if (access.reason === 'app-not-permitted' && training) {
    return G.t(`Vyžaduje přístup po školení ${training.trainingCode} · verze ${training.trainingVersion}.`, `Requires access after training ${training.trainingCode} · version ${training.trainingVersion}.`);
  }
  return G.formatReason(access.reason, G.state.language);
}

function manualCard(app){
  const access = G.hasAppAccess(app.id);
  const available = Boolean(app.manualUrl);
  const enabled = access.enabled && available;
  const article = make('article', `manual-card ${enabled ? 'open' : 'locked'}`);
  article.style.setProperty('--manual-accent', app.accent || '#50e8ff');

  const head = make('div', 'manual-card-head');
  const icon = make('img', 'manual-app-icon');
  icon.src = `../${app.icon}`;
  icon.alt = '';
  icon.width = 62;
  icon.height = 62;
  const badge = make('span', `manual-access-badge ${enabled ? 'open' : 'locked'}`, enabled ? G.t('✓ Odemčeno', '✓ Unlocked') : G.t('🔒 Uzamčeno', '🔒 Locked'));
  head.append(icon, badge);

  const title = make('h2', '', G.localised(app.name));
  const version = make('div', 'manual-version', `${G.t('verze', 'version')} ${app.version || '—'}`);
  const description = make('p', 'manual-description', G.localised(app.description));
  const note = make('p', 'manual-access-note', available ? accessText(access, app.id) : G.t('Manuál zatím není v manifestu aplikace publikován.', 'The manual has not yet been published in the application manifest.'));
  const actions = make('div', 'manual-actions');

  if (enabled) {
    const open = make('a', 'button manual-open', G.t('Otevřít přímo v AI Studiu →', 'Open directly in AI Studio →'));
    open.href = `./viewer.html?app=${encodeURIComponent(app.id)}`;
    actions.append(open);
  } else {
    const locked = make('button', 'button secondary manual-locked-button', G.t('Manuál uzamčen', 'Manual locked'));
    locked.type = 'button';
    locked.disabled = true;
    actions.append(locked);
    const accessLink = make('a', 'button ghost', G.t('Můj přístup', 'My access'));
    accessLink.href = '../access/';
    actions.append(accessLink);
  }

  article.append(head, title, version, description, note, actions);
  return article;
}

function renderSummary(){
  const snapshot = G.getAccessSnapshot();
  const unlocked = apps.filter(app => G.hasAppAccess(app.id).enabled).length;
  accessSummary.replaceChildren();
  const symbol = make('span', 'manual-access-symbol', snapshot.valid ? (G.isAdmin() ? '◆' : '✓') : '🔒');
  const copy = make('div', 'manual-access-copy');
  if (G.isAdmin()) {
    copy.append(make('strong', '', G.t('Správce: všechny manuály jsou dostupné', 'Administrator: all manuals are available')), make('small', '', G.t(`Odemčeno ${apps.length} z ${apps.length} průvodců.`, `${apps.length} of ${apps.length} guides unlocked.`)));
  } else if (snapshot.valid) {
    copy.append(make('strong', '', G.t('Přístup učitele je aktivní', 'Teacher access is active')), make('small', '', G.t(`Odemčeno ${unlocked} z ${apps.length} manuálů podle absolvovaných školení.`, `${unlocked} of ${apps.length} manuals unlocked according to completed training.`)));
  } else {
    copy.append(make('strong', '', G.t('Přístup zatím není aktivován', 'Access has not been activated yet')), make('small', '', G.t('Karty zůstávají viditelné, jejich manuály však otevřete až po načtení platného oprávnění.', 'Cards remain visible, but their manuals open only after a valid permit has been loaded.')));
  }
  const link = make('a', 'button secondary', snapshot.valid ? G.t('Spravovat přístup', 'Manage access') : G.t('Aktivovat přístup', 'Activate access'));
  link.href = '../access/';
  accessSummary.append(symbol, copy, link);
}

function renderCards(){
  grid.replaceChildren();
  if (!apps.length) {
    grid.append(make('div', 'manual-empty', G.t('Registr manuálů se nepodařilo načíst.', 'The manual registry could not be loaded.')));
    return;
  }
  grid.append(...apps.map(manualCard));
  renderSummary();
}

function renderSyncState(){
  if (!apps.length) {
    syncState.textContent = G.t('Registr se nepodařilo načíst. Obnovte stránku.', 'The registry could not be loaded. Refresh the page.');
    syncState.className = 'manual-sync-state warn';
    return;
  }
  const live = syncReport?.sources?.filter(item => item.ok).length || 0;
  const total = syncReport?.sources?.length || apps.length;
  if (live === total && total > 0) {
    syncState.textContent = G.t(`Aktuální verze ověřeny u všech ${total} aplikací.`, `Current versions verified for all ${total} applications.`);
    syncState.className = 'manual-sync-state ok';
  } else {
    syncState.textContent = G.t(`K dispozici je bezpečný vestavěný registr ${apps.length} aplikací; živě ověřeno ${live}/${total}.`, `A safe built-in registry of ${apps.length} applications is available; ${live}/${total} verified live.`);
    syncState.className = 'manual-sync-state warn';
  }
}

async function load(){
  try {
    await G.accessReady;
    [apps, syncReport] = await Promise.all([G.loadApps(), G.loadSyncReport()]);
    renderCards();
    renderSyncState();
  } catch {
    apps = [];
    syncReport = null;
    renderCards();
    renderSyncState();
  }
}

document.addEventListener('ghrab:language', () => { renderCards(); renderSyncState(); });
document.addEventListener('ghrab:access-changed', renderCards);
load();
