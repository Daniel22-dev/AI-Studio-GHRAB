const VERSION = '__APP_VERSION__';
const root = document.documentElement;
const page = document.body.dataset.page || 'home';
const base = page === 'home' ? './' : '../';
const state = {
  language: safeGetItem('ghrab.language') || 'cs',
  theme: safeGetItem('ghrab.theme') || 'dark',
  motion: safeGetItem('ghrab.motion') || 'auto'
};
const MOTION_MODES = ['auto', 'full', 'lite', 'off'];

const WORKSPACE_KEY = 'ghrab.workspace.v1';
const HANDOFF_KEY = 'ghrab.handoff.v1';
const PILOT_EVENTS_KEY = 'ghrab.pilot.events.v2';
const ACCESS_MODE_KEY = 'ghrab.access.mode.v1';
const TRAINED_APPS_KEY = 'ghrab.access.trainedApps.v1';
const FAVORITE_APPS_KEY = 'ghrab.favoriteApps.v1';
const HANDOFF_TTL_MS = 30 * 60 * 1000;
const WORKSPACE_SOFT_LIMIT_CHARS = 120000;
const t = (cs, en) => state.language === 'cs' ? cs : en;
const localised = (value) => {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  return value[state.language] || value.cs || value.en || '';
};

function applyLanguage(){
  root.lang = state.language;
  document.querySelectorAll('[data-cs][data-en]').forEach(el => { el.textContent = el.dataset[state.language]; });
  document.querySelectorAll('[data-cs-aria][data-en-aria]').forEach(el => { el.setAttribute('aria-label', el.dataset[`${state.language}Aria`]); });
  document.querySelectorAll('[data-cs-placeholder][data-en-placeholder]').forEach(el => { el.setAttribute('placeholder', el.dataset[`${state.language}Placeholder`]); });
  document.querySelectorAll('[data-lang]').forEach(btn => btn.setAttribute('aria-pressed', String(btn.dataset.lang === state.language)));
  document.title = document.body.dataset.titleEn && state.language === 'en' ? document.body.dataset.titleEn : (document.body.dataset.titleCs || 'AI Studio GHRAB');
  document.dispatchEvent(new CustomEvent('ghrab:language', { detail: { language: state.language } }));
}

function applyTheme(){
  root.dataset.theme = state.theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = state.theme === 'dark' ? '#030915' : '#dceaf3';
  document.querySelector('[data-theme-toggle]')?.setAttribute('aria-pressed', String(state.theme === 'light'));
}

function detectedMotionMode(){
  if (state.motion !== 'auto') return state.motion;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const compact = matchMedia('(max-width: 700px)').matches || matchMedia('(pointer: coarse)').matches;
  const saveData = Boolean(navigator.connection?.saveData);
  const lowMemory = Number(navigator.deviceMemory || 8) <= 4;
  const lowCpu = Number(navigator.hardwareConcurrency || 8) <= 4;
  if (reduced) return 'off';
  if (compact || saveData || lowMemory || lowCpu) return 'lite';
  return 'full';
}

function motionLabel(){
  const resolved = detectedMotionMode();
  const selected = state.motion;
  const names = {
    auto: t('automatické', 'automatic'),
    full: t('plné', 'full'),
    lite: t('úsporné', 'economy'),
    off: t('vypnuté', 'off')
  };
  return selected === 'auto'
    ? `${t('Animace', 'Motion')}: ${names.auto} (${names[resolved]})`
    : `${t('Animace', 'Motion')}: ${names[selected]}`;
}

function updateMotionButton(){
  const button = document.querySelector('[data-motion-toggle]');
  if (!button) return;
  const resolved = detectedMotionMode();
  const icons = { full: '✦', lite: '◌', off: '⏸' };
  button.textContent = state.motion === 'auto' ? 'A' : icons[resolved];
  button.dataset.mode = state.motion;
  button.setAttribute('aria-label', `${motionLabel()}. ${t('Kliknutím změnit režim.', 'Click to change mode.')}`);
  button.title = `${motionLabel()} · ${t('kliknutím změnit', 'click to change')}`;
}

function applyMotion(){
  root.dataset.motion = detectedMotionMode();
  root.dataset.motionPreference = state.motion;
  updateMotionButton();
  document.dispatchEvent(new CustomEvent('ghrab:motion', {
    detail: { selected: state.motion, resolved: root.dataset.motion }
  }));
}

function showToast(message){
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.append(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 3600);
}


function safeGetItem(key, fallback = null){
  try {
    const value = localStorage.getItem(key);
    return value == null ? fallback : value;
  } catch (error) {
    console.warn(`AI Studio: čtení localStorage selhalo pro ${key}`, error);
    return fallback;
  }
}

function storageErrorMessage(error){
  const quota = error?.name === 'QuotaExceededError' || error?.name === 'NS_ERROR_DOM_QUOTA_REACHED' || error?.code === 22 || error?.code === 1014;
  return quota
    ? t('Místní úložiště je plné. Exportujte důležité materiály a smažte starší položky.', 'Local storage is full. Export important resources and delete older items.')
    : t('Prohlížeč nepovolil uložení dat. Zkontrolujte soukromý režim nebo nastavení úložiště.', 'The browser did not allow data to be saved. Check private mode or storage settings.');
}
function safeSetItem(key, value, options = {}){
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.warn(`AI Studio: zápis do localStorage selhal pro ${key}`, error);
    if (!options.silent) showToast(storageErrorMessage(error));
    return false;
  }
}
function safeSetJson(key, value, options = {}){
  try { return safeSetItem(key, JSON.stringify(value), options); }
  catch (error) {
    console.warn(`AI Studio: serializace dat selhala pro ${key}`, error);
    if (!options.silent) showToast(t('Data se nepodařilo připravit k uložení.', 'The data could not be prepared for storage.'));
    return false;
  }
}
function safeRemoveItem(key){
  try { localStorage.removeItem(key); return true; }
  catch (error) { console.warn(`AI Studio: odstranění localStorage selhalo pro ${key}`, error); return false; }
}
function storageUsage(){
  let bytes = 0;
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      const value = key ? localStorage.getItem(key) || '' : '';
      bytes += new Blob([key || '', value]).size;
    }
  } catch { /* best effort */ }
  return { bytes, kilobytes: Math.round(bytes / 1024), megabytes: Math.round(bytes / 1024 / 1024 * 100) / 100 };
}
function validMaterial(material){
  return Boolean(material && material.schema === 'ghrab-material-v1' && material.id && material.title && material.subject && material.content && typeof material.content === 'object');
}

function ensureHeaderControl(attribute, text){
  const actions = document.querySelector('.header-actions');
  if (!actions) return null;
  let button = actions.querySelector(`[${attribute}]`);
  if (button) return button;
  button = document.createElement('button');
  button.className = 'icon-button';
  button.type = 'button';
  button.setAttribute(attribute, '');
  button.textContent = text;
  actions.append(button);
  return button;
}

function setupMotionControl(){
  const button = ensureHeaderControl('data-motion-toggle', 'A');
  button?.addEventListener('click', () => {
    const index = MOTION_MODES.indexOf(state.motion);
    state.motion = MOTION_MODES[(index + 1) % MOTION_MODES.length];
    safeSetItem('ghrab.motion', state.motion);
    applyMotion();
    showToast(motionLabel());
  });
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  media.addEventListener?.('change', () => { if (state.motion === 'auto') applyMotion(); });
}

function fullscreenElement(){
  return document.fullscreenElement || document.webkitFullscreenElement || null;
}

function updateFullscreenButton(){
  const button = document.querySelector('[data-fullscreen-toggle]');
  if (!button) return;
  const active = Boolean(fullscreenElement());
  button.textContent = active ? '⤢' : '⛶';
  button.setAttribute('aria-pressed', String(active));
  button.setAttribute('aria-label', active ? t('Ukončit celou obrazovku', 'Exit full screen') : t('Zobrazit na celou obrazovku', 'Enter full screen'));
  button.title = active ? t('Ukončit celou obrazovku', 'Exit full screen') : t('Celá obrazovka', 'Full screen');
  root.classList.toggle('is-fullscreen', active);
}

async function toggleFullscreen(){
  const target = document.documentElement;
  try {
    if (fullscreenElement()) {
      if (document.exitFullscreen) await document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      return;
    }
    if (target.requestFullscreen) {
      await target.requestFullscreen({ navigationUI: 'hide' });
      return;
    }
    if (target.webkitRequestFullscreen) {
      target.webkitRequestFullscreen();
      return;
    }
    showToast(t('Tento prohlížeč nepodporuje celou obrazovku. Na telefonu nainstalujte AI Studio na plochu.', 'This browser does not support full screen. Install AI Studio to the home screen on mobile.'));
  } catch {
    showToast(t('Celou obrazovku se nepodařilo aktivovat. Zkuste F11 nebo nainstalovanou PWA.', 'Full screen could not be activated. Try F11 or the installed PWA.'));
  }
}

function setupFullscreenControl(){
  const button = ensureHeaderControl('data-fullscreen-toggle', '⛶');
  button?.addEventListener('click', toggleFullscreen);
  document.addEventListener('fullscreenchange', updateFullscreenButton);
  document.addEventListener('webkitfullscreenchange', updateFullscreenButton);
  updateFullscreenButton();
}

function setupChrome(){
  setupMotionControl();
  setupFullscreenControl();
  document.querySelectorAll('[data-lang]').forEach(btn => btn.addEventListener('click', () => {
    state.language = btn.dataset.lang;
    safeSetItem('ghrab.language', state.language);
    applyLanguage();
    updateMotionButton();
    updateFullscreenButton();
  }));
  document.querySelector('[data-theme-toggle]')?.addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    safeSetItem('ghrab.theme', state.theme);
    applyTheme();
  });
  const navToggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.main-nav');
  navToggle?.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(open));
  });
  document.querySelectorAll('.main-nav a').forEach(a => a.addEventListener('click', () => {
    nav?.classList.remove('open'); navToggle?.setAttribute('aria-expanded', 'false');
  }));
  document.querySelector(`.main-nav a[data-nav="${page}"]`)?.setAttribute('aria-current', 'page');
}

function getLaunches(){
  try { return JSON.parse(safeGetItem('ghrab.pilot.launches', '{}')); }
  catch { return {}; }
}
function recordLaunch(id){
  const launches = getLaunches();
  const item = launches[id] || { count: 0, lastOpened: null };
  item.count += 1;
  item.lastOpened = new Date().toISOString();
  launches[id] = item;
  return safeSetJson('ghrab.pilot.launches', launches);
}

function parseLocal(key, fallback){
  try { return JSON.parse(safeGetItem(key, JSON.stringify(fallback))); }
  catch { return fallback; }
}
function getWorkspace(){
  const list = parseLocal(WORKSPACE_KEY, []);
  return Array.isArray(list) ? list : [];
}
function saveWorkspaceMaterial(material){
  const list = getWorkspace();
  const copy = typeof structuredClone === 'function' ? structuredClone(material) : JSON.parse(JSON.stringify(material));
  copy.provenance = copy.provenance || {};
  copy.provenance.updatedAt = new Date().toISOString();
  const index = list.findIndex(item => item.id === copy.id);
  if (index >= 0) list[index] = copy; else list.unshift(copy);
  const sourceLength = String(copy.content?.sourceText || '').length;
  if (sourceLength > WORKSPACE_SOFT_LIMIT_CHARS) {
    showToast(t(`Zdrojový text má ${sourceLength.toLocaleString('cs-CZ')} znaků. Uložení může zabrat výraznou část místního úložiště.`, `The source text has ${sourceLength.toLocaleString('en-GB')} characters. Saving it may use a significant part of local storage.`));
  }
  return safeSetJson(WORKSPACE_KEY, list.slice(0, 20)) ? copy : null;
}
function deleteWorkspaceMaterial(id){
  return safeSetJson(WORKSPACE_KEY, getWorkspace().filter(item => item.id !== id));
}
function createHandoff(target, material){
  if (!validMaterial(material)) throw new Error('Invalid GHRAB Material v1');
  const payload = {
    schema: 'ghrab-handoff-v1', target, createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + HANDOFF_TTL_MS).toISOString(),
    source: 'ai-studio-ghrab', portalVersion: VERSION, studioUrl: new URL(base, location.href).href, material
  };
  return safeSetJson(HANDOFF_KEY, payload) ? payload : null;
}
function readHandoff(){
  const payload = parseLocal(HANDOFF_KEY, null);
  if (!payload || payload.schema !== 'ghrab-handoff-v1') return null;
  if (Date.parse(payload.expiresAt || '') < Date.now()) { safeRemoveItem(HANDOFF_KEY); return null; }
  return payload;
}
function clearHandoff(){ return safeRemoveItem(HANDOFF_KEY); }
function getPilotEvents(){
  const list = parseLocal(PILOT_EVENTS_KEY, []);
  return Array.isArray(list) ? list : [];
}
function recordPilotEvent(event){
  const item = { id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`, at: new Date().toISOString(), ...event };
  const list = getPilotEvents(); list.push(item);
  return safeSetJson(PILOT_EVENTS_KEY, list.slice(-500)) ? item : null;
}
function clearPilotEvents(){ return safeRemoveItem(PILOT_EVENTS_KEY); }
function downloadJson(data, filename){
  const blob = new Blob([JSON.stringify(data, null, 2) + '\n'], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob); const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

async function fetchJson(url){
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  return response.json();
}
async function loadApps(){
  try { return await fetchJson(`${base}config/apps.generated.json`); }
  catch { return fetchJson(`${base}config/apps.fallback.json`); }
}
async function loadSyncReport(){
  try { return await fetchJson(`${base}config/sync-report.json`); }
  catch { return null; }
}
async function loadPermissions(){
  try { return await fetchJson(`${base}config/permissions.json`); }
  catch { return null; }
}

function el(tag, className, text){
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}


function getAccessMode(){
  return safeGetItem(ACCESS_MODE_KEY, 'open');
}
function setAccessMode(mode){
  const allowed = ['open','training-demo'];
  safeSetItem(ACCESS_MODE_KEY, allowed.includes(mode) ? mode : 'open');
  document.dispatchEvent(new CustomEvent('ghrab:access', { detail: { mode: getAccessMode() } }));
}
function getTrainedApps(){
  const list = parseLocal(TRAINED_APPS_KEY, []);
  return Array.isArray(list) ? list.filter(Boolean) : [];
}
function setTrainedApps(list){
  safeSetJson(TRAINED_APPS_KEY, [...new Set(list)].slice(0, 80));
  document.dispatchEvent(new CustomEvent('ghrab:access', { detail: { mode: getAccessMode(), trainedApps: getTrainedApps() } }));
}
function hasLocalAccess(appId, permissionInfo){
  const mode = getAccessMode();
  if (mode !== 'training-demo') return { enabled: true, mode, reason: t('Lokální pilotní režim: aplikace je dostupná.', 'Local pilot mode: the app is available.') };
  if (!permissionInfo?.trainingRequired) return { enabled: true, mode, reason: t('Aplikace nevyžaduje proškolení.', 'The app does not require training.') };
  const trained = getTrainedApps().includes(appId);
  return {
    enabled: trained,
    mode,
    reason: trained
      ? t(`Proškolení ${permissionInfo.trainingCode} je v tomto prohlížeči označeno jako splněné.`, `Training ${permissionInfo.trainingCode} is marked as completed in this browser.`)
      : t(`Lokální demo: aplikace je uzamčena, dokud není označeno proškolení ${permissionInfo.trainingCode}.`, `Local demo: the app is locked until training ${permissionInfo.trainingCode} is marked as completed.`)
  };
}
function getFavoriteApps(){
  const list = parseLocal(FAVORITE_APPS_KEY, []);
  return Array.isArray(list) ? list.filter(Boolean).slice(0,4) : [];
}
function setFavoriteApps(list){
  safeSetJson(FAVORITE_APPS_KEY, [...new Set(list)].slice(0,4));
  document.dispatchEvent(new CustomEvent('ghrab:favorites', { detail: { favorites: getFavoriteApps() } }));
}
function toggleFavoriteApp(appId){
  const current = getFavoriteApps().filter(id => id !== appId);
  if (!getFavoriteApps().includes(appId)) current.unshift(appId);
  setFavoriteApps(current.slice(0,4));
}
function selectCoreApps(apps){
  if (apps.length <= 4) return { core: apps, extra: [] };
  const fav = getFavoriteApps();
  const byId = new Map(apps.map(app => [app.id, app]));
  const core = fav.map(id => byId.get(id)).filter(Boolean);
  for (const app of apps) if (core.length < 4 && !core.some(x => x.id === app.id)) core.push(app);
  const coreIds = new Set(core.map(app => app.id));
  return { core, extra: apps.filter(app => !coreIds.has(app.id)) };
}
function accessChip(access){
  const chip = el('span', `chip access-chip ${access.enabled ? 'access-ok' : 'access-locked'}`, access.enabled ? t('Dostupné', 'Available') : t('Uzamčeno', 'Locked'));
  chip.title = access.reason;
  return chip;
}

function permissionInfoFor(app, permissions){
  return permissions?.apps?.[app.id] || null;
}
function permissionChip(info){
  if (!info?.trainingRequired) return null;
  const label = t(`Proškolení ${info.trainingCode}`, `Training ${info.trainingCode}`);
  const chip = el('span', 'chip training-chip', label);
  chip.title = t('V serverless režimu jde o informativní štítek. Ostrý přístup musí později vynutit backend.', 'In serverless mode this is an informational label. Real access must later be enforced by the backend.');
  return chip;
}
function portalAppCard(app, index, permissions){
  const info = permissionInfoFor(app, permissions);
  const access = hasLocalAccess(app.id, info);
  const favorites = getFavoriteApps();
  const article = el('article', 'portal-app-card');
  article.dataset.position = String(index);
  article.dataset.appId = app.id;
  article.classList.add(`accent-${app.id}`);
  if (!access.enabled) article.classList.add('is-locked');
  if (favorites.includes(app.id)) article.classList.add('is-favorite');
  article.title = access.reason;

  const head = el('div', 'portal-card-head');
  const identity = el('div', 'portal-app-identity');
  const icon = el('img', 'portal-app-icon');
  icon.src = app.icon?.startsWith('http') ? app.icon : `${base}${app.icon}`;
  icon.alt = '';
  const identityText = el('div');
  identityText.append(el('span', 'status', localised(app.status)));
  identity.append(icon, identityText);
  const headActions = el('div', 'portal-card-actions');
  const pin = el('button', `icon-button pin-button ${favorites.includes(app.id) ? 'is-pinned' : ''}`, '★');
  pin.type = 'button';
  pin.setAttribute('aria-label', favorites.includes(app.id) ? t('Odebrat z Top 4', 'Remove from Top 4') : t('Přidat do Top 4', 'Add to Top 4'));
  pin.title = favorites.includes(app.id) ? t('Odebrat z Top 4', 'Remove from Top 4') : t('Přidat do Top 4', 'Add to Top 4');
  pin.addEventListener('click', event => { event.preventDefault(); event.stopPropagation(); toggleFavoriteApp(app.id); renderHome(); });
  headActions.append(pin, el('span', 'chip version-chip', `v${app.version}`));
  head.append(identity, headActions);

  const title = el('h2', '', localised(app.name));
  const description = el('p', '', localised(app.description));
  const meta = el('div', 'portal-card-meta');
  (app.tags || []).slice(0, 4).forEach(tag => meta.append(el('span', 'chip', localised(tag))));
  const pchip = permissionChip(info);
  if (pchip) meta.append(pchip);
  meta.append(accessChip(access));

  const launch = el('a', 'portal-launch', '→');
  launch.href = access.enabled ? app.launchUrl : '#';
  launch.target = access.enabled ? '_blank' : '_self';
  launch.rel = 'noopener noreferrer';
  launch.setAttribute('aria-label', `${t('Spustit', 'Launch')} ${localised(app.name)}`);
  launch.addEventListener('pointerdown', () => article.classList.add('is-activating'));
  const activate = event => {
    if (!access.enabled) {
      event?.preventDefault?.();
      showToast(access.reason);
      article.classList.add('lock-pulse');
      setTimeout(() => article.classList.remove('lock-pulse'), 700);
      return false;
    }
    recordLaunch(app.id);
    return true;
  };
  launch.addEventListener('click', activate);
  article.addEventListener('click', event => {
    if (event.target.closest('a,button,input,select,textarea,label')) return;
    if (!activate(event)) return;
    window.open(app.launchUrl, '_blank', 'noopener,noreferrer');
  });
  article.tabIndex = 0;
  article.setAttribute('role', 'link');
  article.setAttribute('aria-label', `${t('Spustit', 'Launch')} ${localised(app.name)}. ${access.reason}`);
  article.addEventListener('keydown', event => {
    if (!['Enter', ' '].includes(event.key)) return;
    event.preventDefault();
    if (!activate(event)) return;
    window.open(app.launchUrl, '_blank', 'noopener,noreferrer');
  });
  article.append(head, title, description, meta, launch);
  return article;
}

function renderExtraApps(apps){
  document.querySelector('.extra-destinations')?.remove();
  if (!apps.length) return;
  const section = el('section', 'section shell extra-destinations');
  const heading = el('div', 'section-heading compact');
  const wrap = el('div');
  wrap.append(el('p', 'eyebrow', t('DALŠÍ DESTINACE', 'MORE DESTINATIONS')), el('h2', '', t('Nově připojené aplikace', 'Newly connected applications')));
  heading.append(wrap);
  const grid = el('div', 'app-grid');
  apps.forEach((app, i) => {
    const card = portalAppCard(app, i + 4, window.__GHRAB_PERMISSIONS__);
    card.removeAttribute('data-position');
    card.classList.add('extra-app-card');
    grid.append(card);
  });
  section.append(heading, grid);
  document.querySelector('.mission-strip')?.before(section);
}

async function renderHome(){
  const grid = document.querySelector('#portal-apps');
  if (!grid) return;
  try {
    const apps = await loadApps();
    const permissions = await loadPermissions();
    window.__GHRAB_PERMISSIONS__ = permissions;
    const render = () => {
      const selection = selectCoreApps(apps);
      grid.replaceChildren(...selection.core.map((app, index) => portalAppCard(app, index, permissions)));
      renderExtraApps(selection.extra);
    };
    render();
    document.addEventListener('ghrab:language', render);
    document.addEventListener('ghrab:access', render);
    document.addEventListener('ghrab:favorites', render);
  } catch {
    grid.innerHTML = `<div class="portal-empty">${t('Registr aplikací se nepodařilo načíst. Obnovte stránku.','The application registry could not be loaded. Refresh the page.')}</div>`;
  }

  const report = await loadSyncReport();
  const summary = document.querySelector('#sync-summary');
  if (summary && report) {
    const ok = report.sources?.filter(item => item.ok).length || 0;
    const total = report.sources?.length || 0;
    const text = () => t(`${ok}/${total} manifestů ověřeno · sestavení ${new Date(report.generatedAt).toLocaleString('cs-CZ')}`, `${ok}/${total} manifests verified · built ${new Date(report.generatedAt).toLocaleString('en-GB')}`);
    summary.textContent = text();
    document.addEventListener('ghrab:language', () => { summary.textContent = text(); });
  }
}

function setupStarfield(){
  const canvas = document.querySelector('#starfield');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: true });
  let stars = [];
  let raf = 0;
  let running = false;
  let lastFrame = 0;
  const frameInterval = 1000 / 30;

  const resize = () => {
    if (!running) return;
    const dpr = Math.min(devicePixelRatio || 1, 1.35);
    canvas.width = Math.floor(innerWidth * dpr);
    canvas.height = Math.floor(innerHeight * dpr);
    canvas.style.width = `${innerWidth}px`;
    canvas.style.height = `${innerHeight}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.min(95, Math.max(38, Math.floor(innerWidth / 15)));
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * innerWidth,
      y: Math.random() * innerHeight,
      r: Math.random() * .9 + .12,
      a: Math.random() * .52 + .18,
      s: Math.random() * .055 + .012
    }));
  };

  const draw = timestamp => {
    if (!running) return;
    raf = requestAnimationFrame(draw);
    if (document.hidden || timestamp - lastFrame < frameInterval) return;
    lastFrame = timestamp;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const star of stars) {
      star.y += star.s;
      if (star.y > innerHeight + 2) star.y = -2;
      ctx.beginPath();
      ctx.fillStyle = `rgba(166,235,255,${star.a})`;
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const stop = () => {
    running = false;
    cancelAnimationFrame(raf);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvas.hidden = true;
  };

  const start = () => {
    if (root.dataset.motion !== 'full') { stop(); return; }
    if (running) return;
    running = true;
    canvas.hidden = false;
    resize();
    raf = requestAnimationFrame(draw);
  };

  addEventListener('resize', resize, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && running) lastFrame = 0;
  });
  document.addEventListener('ghrab:motion', start);
  addEventListener('pagehide', stop, { once: true });
  start();
}

async function registerPwa(){
  if ('serviceWorker' in navigator) {
    try { await navigator.serviceWorker.register(`${base}sw.js`); } catch { /* optional */ }
  }
}

window.GHRAB = { VERSION, state, t, localised, base, loadApps, loadSyncReport, loadPermissions, getLaunches, recordLaunch, getWorkspace, saveWorkspaceMaterial, deleteWorkspaceMaterial, createHandoff, readHandoff, clearHandoff, getPilotEvents, recordPilotEvent, clearPilotEvents, downloadJson, showToast, applyLanguage, applyMotion, getAccessMode, setAccessMode, getTrainedApps, setTrainedApps, hasLocalAccess, getFavoriteApps, setFavoriteApps, toggleFavoriteApp, safeGetItem, safeSetItem, safeSetJson, safeRemoveItem, storageUsage, validMaterial };
setupChrome(); applyTheme(); applyLanguage(); applyMotion(); renderHome(); setupStarfield(); registerPwa();
