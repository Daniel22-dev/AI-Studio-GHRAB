#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const json = (rel) => JSON.parse(read(rel));
const failures = [];
const check = (ok, message) => { if (!ok) failures.push(message); };

const sw = read('dist/sw.js');
const parseArray = (name) => {
  const block = sw.match(new RegExp(`const\\s+${name}\\s*=\\s*\\[([\\s\\S]*?)\\];`))?.[1] || '';
  return [...block.matchAll(/["'](\.\/[^"']+)["']/g)].map((match) => match[1]);
};
const required = parseArray('CORE_REQUIRED');
const optional = parseArray('CORE_OPTIONAL');
const installAssets = new Set([...required, ...optional]);

for (const asset of [
  './modules/registry-client.js',
  './modules/motion-policy.js',
  './privacy/pilot-event.js',
  './config/platform-consumers.json',
  './portal-card-hotfix.css',
]) check(required.includes(asset), `Critical offline shell misses ${asset}`);

for (const asset of ['./access/error-reporter.js', './access/error-reporter.css']) {
  check(optional.includes(asset), `Offline-essential reporter asset missing: ${asset}`);
}

for (const prefix of [
  './manualy/', './library/', './workflow/', './automation/', './demo/', './pilot/',
  './safety/', './changelog/', './assets/presentation/', './report/', './tools/',
  './api-usage/', './tests/', './integration/', './schemas/',
]) {
  check(![...installAssets].some((asset) => asset.startsWith(prefix)), `On-demand prefix leaked into install precache: ${prefix}`);
}
check(!installAssets.has('./config/access-config-bundle.json'), 'Signed access bundle must stay outside install precache.');
check(!installAssets.has('./config/access-config-bundle.sig.json'), 'Signed access bundle signature must stay outside install precache.');
check(!installAssets.has('./config/changelog.json'), 'Changelog must stay on-demand.');

const allSwAssets = [...sw.matchAll(/["'`](\.\/?[^"'`\s]+)["'`]/g)]
  .map((match) => match[1].split(/[?#]/)[0])
  .filter((asset, index, array) => array.indexOf(asset) === index);
let precacheBytes = 0;
for (const asset of allSwAssets) {
  const target = path.resolve(root, 'dist', asset.replace(/^\.\//, ''));
  if (target.startsWith(path.join(root, 'dist')) && fs.existsSync(target) && fs.statSync(target).isFile()) {
    precacheBytes += fs.statSync(target).size;
  }
}
const consumer = json('ghrab-platform.consumer.json');
const precacheBudget = Number(consumer.quality?.performanceBudget?.precacheBytes || 0);
check(precacheBudget > 0 && precacheBytes <= precacheBudget, `Precache ${precacheBytes} exceeds budget ${precacheBudget}.`);
check(precacheBudget <= 1_250_000, `Phase C precache budget regressed above 1.25 MB: ${precacheBudget}.`);

const apps = json('src/config/apps.generated.json');
for (const app of apps) {
  if (!app.icon?.startsWith('assets/apps/')) continue;
  check(/\.(?:webp|svg)$/.test(app.icon), `App icon is not WebP/SVG: ${app.id} -> ${app.icon}`);
  check(fs.existsSync(path.join(root, 'src', app.icon)), `App icon file missing: ${app.icon}`);
}
const pngAppIcons = fs.readdirSync(path.join(root, 'src/assets/apps')).filter((name) => name.endsWith('.png'));
check(pngAppIcons.length === 0, `Legacy PNG app icons remain: ${pngAppIcons.join(', ')}`);

const sourceStyles = fs.statSync(path.join(root, 'src/styles.css')).size + fs.statSync(path.join(root, 'src/polish.css')).size;
const distStyles = fs.statSync(path.join(root, 'dist/styles.css')).size + fs.statSync(path.join(root, 'dist/polish.css')).size;
check(distStyles < sourceStyles, `Distribution CSS was not compacted: ${distStyles} >= ${sourceStyles}.`);

const gitignore = read('.gitignore');
check(/^dist-school-server\/$/m.test(gitignore), 'dist-school-server/ is not ignored by git.');
const schoolBuilder = read('scripts/build-school-profile.mjs');
check(schoolBuilder.includes('fs.rmSync(targetDist') && schoolBuilder.includes('fs.cpSync(sourceDist, targetDist'), 'School-server dist is not reproducibly rebuilt from dist/.');
const packageJson = json('package.json');
check(String(packageJson.scripts?.test || '').includes('npm run build'), 'Clean-checkout npm test does not build dist before built-artifact regressions.');
const build = read('scripts/build.mjs');
check(build.includes('offlineEssentialAssets') && build.includes('compactCssWhitespace'), 'Phase C build strategy is missing.');
check(sw.includes('event.respondWith(cacheFirst(request))'), 'On-demand same-origin runtime cache path is missing.');

if (failures.length) {
  console.error('Performance Phase C tests failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`Performance Phase C tests: PASS (precache ${precacheBytes} B / ${precacheBudget} B; required ${required.length}, offline-essential ${optional.length}).`);
