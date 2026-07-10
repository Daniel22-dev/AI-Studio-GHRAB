const VERSION = '__APP_VERSION__';
const root = document.documentElement;
const page = document.body.dataset.page || 'home';
const base = page === 'home' ? './' : '../';
const state = {
  language: localStorage.getItem('ghrab.language') || 'cs',
  theme: localStorage.getItem('ghrab.theme') || 'dark'
};
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

function setupChrome(){
  document.querySelectorAll('[data-lang]').forEach(btn => btn.addEventListener('click', () => {
    state.language = btn.dataset.lang;
    localStorage.setItem('ghrab.language', state.language);
    applyLanguage();
  }));
  document.querySelector('[data-theme-toggle]')?.addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('ghrab.theme', state.theme);
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
  try { return JSON.parse(localStorage.getItem('ghrab.pilot.launches') || '{}'); }
  catch { return {}; }
}
function recordLaunch(id){
  const launches = getLaunches();
  const item = launches[id] || { count: 0, lastOpened: null };
  item.count += 1;
  item.lastOpened = new Date().toISOString();
  launches[id] = item;
  localStorage.setItem('ghrab.pilot.launches', JSON.stringify(launches));
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

function el(tag, className, text){
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function portalAppCard(app, index){
  const article = el('article', 'portal-app-card');
  article.dataset.position = String(index);
  article.dataset.appId = app.id;
  article.classList.add(`accent-${app.id}`);

  const head = el('div', 'portal-card-head');
  const identity = el('div', 'portal-app-identity');
  const icon = el('img', 'portal-app-icon');
  icon.src = app.icon?.startsWith('http') ? app.icon : `${base}${app.icon}`;
  icon.alt = '';
  const identityText = el('div');
  identityText.append(el('span', 'status', localised(app.status)));
  identity.append(icon, identityText);
  head.append(identity, el('span', 'chip version-chip', `v${app.version}`));

  const title = el('h2', '', localised(app.name));
  const description = el('p', '', localised(app.description));
  const meta = el('div', 'portal-card-meta');
  (app.tags || []).slice(0, 4).forEach(tag => meta.append(el('span', 'chip', localised(tag))));

  const launch = el('a', 'portal-launch', '→');
  launch.href = app.launchUrl;
  launch.target = '_blank';
  launch.rel = 'noopener noreferrer';
  launch.setAttribute('aria-label', `${t('Spustit', 'Launch')} ${localised(app.name)}`);
  launch.addEventListener('pointerdown', () => article.classList.add('is-activating'));
  launch.addEventListener('click', () => recordLaunch(app.id));
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
    const card = portalAppCard(app, i + 4);
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
    const render = () => {
      grid.replaceChildren(...apps.slice(0, 4).map(portalAppCard));
      renderExtraApps(apps.slice(4));
    };
    render();
    document.addEventListener('ghrab:language', render);
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
  if (!canvas || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const ctx = canvas.getContext('2d');
  let stars = [];
  let raf = 0;
  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.floor(innerWidth * dpr); canvas.height = Math.floor(innerHeight * dpr);
    canvas.style.width = `${innerWidth}px`; canvas.style.height = `${innerHeight}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.min(150, Math.floor(innerWidth / 8));
    stars = Array.from({ length: count }, () => ({ x: Math.random() * innerWidth, y: Math.random() * innerHeight, r: Math.random() * 1.15 + .15, a: Math.random() * .65 + .2, s: Math.random() * .08 + .015 }));
  };
  const draw = () => {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const star of stars) {
      star.y += star.s; if (star.y > innerHeight + 2) star.y = -2;
      ctx.beginPath(); ctx.fillStyle = `rgba(166,235,255,${star.a})`; ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2); ctx.fill();
    }
    raf = requestAnimationFrame(draw);
  };
  resize(); draw();
  addEventListener('resize', resize, { passive: true });
  addEventListener('pagehide', () => cancelAnimationFrame(raf), { once: true });
}

async function registerPwa(){
  if ('serviceWorker' in navigator) {
    try { await navigator.serviceWorker.register(`${base}sw.js`); } catch { /* optional */ }
  }
}

window.GHRAB = { VERSION, state, t, localised, base, loadApps, loadSyncReport, getLaunches, recordLaunch, applyLanguage };
setupChrome(); applyTheme(); applyLanguage(); renderHome(); setupStarfield(); registerPwa();
