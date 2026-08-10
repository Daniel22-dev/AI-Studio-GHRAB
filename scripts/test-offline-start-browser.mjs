#!/usr/bin/env node
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright';

const root = path.resolve('.');
const dist = path.join(root, 'dist');
const reportPath = path.join(dist, 'qa-p3-browser-report.json');
if (!fs.existsSync(path.join(dist, 'index.html'))) throw new Error('Offline browser regression vyžaduje hotový dist/.');

const mime = (file) => file.endsWith('.html') ? 'text/html; charset=utf-8'
  : file.endsWith('.js') ? 'text/javascript; charset=utf-8'
    : file.endsWith('.css') ? 'text/css; charset=utf-8'
      : file.endsWith('.json') || file.endsWith('.webmanifest') ? 'application/json; charset=utf-8'
        : file.endsWith('.svg') ? 'image/svg+xml'
          : file.endsWith('.png') ? 'image/png'
            : file.endsWith('.webp') ? 'image/webp'
              : 'application/octet-stream';

const server = http.createServer((req, res) => {
  try {
    const url = new URL(req.url || '/', 'http://127.0.0.1');
    let rel = decodeURIComponent(url.pathname).replace(/^\/+/, '');
    if (!rel || rel.endsWith('/')) rel += 'index.html';
    rel = path.posix.normalize(rel).replace(/^\.\.\//g, '');
    const file = path.resolve(dist, ...rel.split('/'));
    if (!file.startsWith(`${dist}${path.sep}`) && file !== dist) {
      res.writeHead(403); res.end(); return;
    }
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404); res.end(); return;
    }
    res.writeHead(200, { 'content-type': mime(file), 'cache-control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  } catch (error) {
    res.writeHead(500); res.end(String(error));
  }
});
await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
const port = server.address().port;
const baseUrl = `http://127.0.0.1:${port}/`;
let browser;
let context;
let result = { passed: false, onlineCards: 0, offlineCards: 0, controlled: false, errors: [] };
try {
  browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'] });
  context = await browser.newContext({ serviceWorkers: 'allow' });
  const page = await context.newPage();
  page.on('pageerror', (error) => result.errors.push(String(error)));
  await page.addInitScript(() => {
    try {
      localStorage.setItem('ghrab.ai-studio.motion.v1', 'off');
      sessionStorage.setItem(`ghrab.startup-intro.${document.documentElement?.dataset?.appVersion || ''}`, 'seen');
    } catch {}
  });
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.waitForSelector('.portal-app-card', { timeout: 10000 });
  result.onlineCards = await page.locator('.portal-app-card').count();
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  if (!await page.evaluate(() => Boolean(navigator.serviceWorker.controller))) {
    await page.reload({ waitUntil: 'networkidle' });
  }
  result.controlled = await page.evaluate(() => Boolean(navigator.serviceWorker.controller));
  if (!result.controlled) throw new Error('Service worker po online warm-upu stránku nekontroluje.');
  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 10000 });
  await page.waitForSelector('.portal-app-card', { timeout: 10000 });
  result.offlineCards = await page.locator('.portal-app-card').count();
  result.passed = result.onlineCards === 8 && result.offlineCards === 8 && result.errors.length === 0;
  if (!result.passed) throw new Error(`Offline start nesplnil kontrakt: ${JSON.stringify(result)}`);
} catch (error) {
  result.error = error?.stack || String(error);
  throw error;
} finally {
  try {
    if (fs.existsSync(reportPath)) {
      const report = JSON.parse(await fsp.readFile(reportPath, 'utf8'));
      report.offlineStart = result;
      if (!result.passed) report.status = 'failed';
      await fsp.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
    }
  } catch (reportError) {
    console.error('Offline regression report update failed:', reportError);
  }
  await context?.close().catch(() => {});
  await browser?.close().catch(() => {});
  await new Promise((resolve) => server.close(resolve));
}
console.log(JSON.stringify({ schema: 'ghrab-offline-start-browser-v1', ...result }, null, 2));
