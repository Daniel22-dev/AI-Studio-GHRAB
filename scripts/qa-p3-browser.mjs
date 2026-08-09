#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const root = path.resolve('.');
const dist = path.join(root, 'dist');
const consumer = JSON.parse(await readFile(path.join(root, 'ghrab-platform.consumer.json'), 'utf8'));
const platformJs = (await readFile(path.join(dist, 'ghrab', 'ghrab-platform.js'), 'utf8'))
  .replace("new URL('./ghrab/ghrab-platform.js', location.href)", "new URL('https://example.test/app/ghrab/ghrab-platform.js')");
const platformCss = await readFile(path.join(dist, 'ghrab', 'ghrab-platform.css'), 'utf8');
const config = {
  appId: consumer.appId,
  appVersion: consumer.appVersion,
  requiredPlatformRange: consumer.platform.requiredRange || '>=1.1.0 <2.0.0',
  supportedThemeModes: ['light', 'dark', 'system'],
  defaultTheme: 'system',
  autoFooter: false,
  accessibility: { labels: { studentName: 'Jméno studenta' } },
};

const memory = `<script>(()=>{class M{constructor(){this.m=new Map()}get length(){return this.m.size}key(i){return [...this.m.keys()][i]??null}getItem(k){return this.m.has(String(k))?this.m.get(String(k)):null}setItem(k,v){this.m.set(String(k),String(v))}removeItem(k){this.m.delete(String(k))}clear(){this.m.clear()}};Object.defineProperty(window,'localStorage',{value:new M(),configurable:true});Object.defineProperty(window,'sessionStorage',{value:new M(),configurable:true});window.matchMedia=window.matchMedia||(()=>({matches:false,addEventListener(){},removeEventListener(){}}));})();<\/script>`;
const html = `<!doctype html><html lang="cs" data-ghrab-p3-harness="${consumer.appId}-${consumer.appVersion}" data-ghrab-app-id="${consumer.appId}" data-ghrab-app-version="${consumer.appVersion}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>P3 browser gate</title>${memory}<script id="ghrab-platform-config" type="application/json">${JSON.stringify(config)}</script><style>${platformCss}</style><script>${platformJs}<\/script></head><body><button id="launcher" type="button">Otevřít dialog</button><main id="main"><h1>P3 test</h1><input id="studentName"><button id="iconButton" type="button" title="Uložit"></button><img id="testImage" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=="><div id="dialog" role="dialog" aria-modal="true" hidden><h2>Kontrolní dialog</h2><button id="first" type="button">První</button><button id="last" type="button">Poslední</button><button id="close" type="button" data-close aria-label="Zavřít">x</button></div></main><script>launcher.addEventListener('click',()=>{dialog.hidden=false;window.GHRAB_PLATFORM.a11y.enhance(dialog)});document.getElementById('close').addEventListener('click',()=>{dialog.hidden=true});<\/script></body></html>`;

let browser;
try {
  browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });
  const page = await browser.newPage();
  const browserErrors = [];
  page.on('pageerror', (error) => browserErrors.push(String(error)));

  await page.setContent(html, { waitUntil: 'load' });
  const harnessId = `${consumer.appId}-${consumer.appVersion}`;
  await page.waitForFunction(
    (id) => document.readyState === 'complete' && document.documentElement?.dataset?.ghrabP3Harness === id,
    harnessId,
    { timeout: 5000 },
  );
  await page.waitForFunction(
    (id) => Boolean(
      document.documentElement?.dataset?.ghrabP3Harness === id
      && window.GHRAB_PLATFORM
      && window.GHRAB_PLATFORM.version
      && document.documentElement.dataset.ghrabA11y
    ),
    harnessId,
    { timeout: 5000 },
  );
  await page.waitForTimeout(120);

  const ready = await page.evaluate((id) => Boolean(
    document.documentElement?.dataset?.ghrabP3Harness === id
    && window.GHRAB_PLATFORM
    && window.GHRAB_PLATFORM.version
    && document.documentElement.dataset.ghrabA11y
  ), harnessId);
  if (!ready) {
    const debug = await page.evaluate(() => ({
      platform: typeof window.GHRAB_PLATFORM,
      scripts: document.scripts.length,
      html: document.documentElement.outerHTML.slice(0, 1000),
    }));
    throw new Error(`Platform runtime timeout: ${JSON.stringify({ debug, browserErrors })}`);
  }

  const result = await page.evaluate(async () => {
    const p = window.GHRAB_PLATFORM;
    const checks = {};
    if (!p) return { checks: { platformPresent: false }, failed: ['platformPresent'], activeElement: document.activeElement?.id || '', snapshot: null };
    const studentName = document.getElementById('studentName');
    const iconButton = document.getElementById('iconButton');
    const testImage = document.getElementById('testImage');
    const launcher = document.getElementById('launcher');
    const dialog = document.getElementById('dialog');
    const first = document.getElementById('first');
    const close = document.getElementById('close');
    checks.platformPresent = true;
    checks.version = p.version === '1.1.0';
    checks.a11yContract = p.a11y.contract === 'ghrab-a11y-v1';
    checks.performanceContract = p.performance.contract === 'ghrab-performance-v1';
    checks.moduleContract = p.modules.contract === 'ghrab-lazy-modules-v1';
    checks.skipLink = !!document.querySelector('[data-ghrab-skip-link]');
    checks.liveRegion = !!document.querySelector('#ghrab-a11y-live-region[role="status"]');
    checks.inputName = studentName.getAttribute('aria-label') === 'Jméno studenta';
    checks.iconName = iconButton.getAttribute('aria-label') === 'Uložit';
    checks.imageAlt = testImage.hasAttribute('alt');
    launcher.focus();
    launcher.click();
    await new Promise((resolve) => setTimeout(resolve, 40));
    checks.dialogName = dialog.hasAttribute('aria-labelledby') || dialog.hasAttribute('aria-label');
    checks.initialFocus = dialog.contains(document.activeElement);
    close.focus();
    close.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    checks.tabWrap = document.activeElement === first;
    first.focus();
    first.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }));
    checks.shiftTabWrap = document.activeElement === close;
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    await new Promise((resolve) => setTimeout(resolve, 40));
    checks.escapeClosed = dialog.hidden === true;
    checks.focusReturned = document.activeElement === launcher;
    p.a11y.announce('Hotovo');
    await new Promise((resolve) => setTimeout(resolve, 30));
    checks.announcement = document.getElementById('ghrab-a11y-live-region').textContent === 'Hotovo';
    const start = p.performance.mark('browser-start');
    const end = p.performance.mark('browser-end');
    const measure = p.performance.measure('browser-measure', start, end);
    const snap = p.performance.snapshot();
    checks.performance = Boolean(measure && snap.contract === 'ghrab-performance-v1');
    await p.modules.loadScript('data:text/javascript,window.__ghrabP3Lazy%3D42', { name: 'p3-test' });
    checks.lazy = window.__ghrabP3Lazy === 42 && p.modules.loaded.size >= 1;
    return {
      checks,
      failed: Object.entries(checks).filter(([, value]) => !value).map(([key]) => key),
      activeElement: document.activeElement?.id || '',
      snapshot: snap,
    };
  });

  const report = {
    schema: 'ghrab-p3-browser-result-v1',
    appId: consumer.appId,
    appVersion: consumer.appVersion,
    chromium: 'playwright-managed',
    result,
    browserErrors,
    status: result.failed.length || browserErrors.length ? 'failed' : 'passed',
  };
  await writeFile(path.join(dist, 'qa-p3-browser-report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  if (result.failed.length || browserErrors.length) process.exitCode = 1;
} finally {
  await browser?.close().catch(() => {});
}
