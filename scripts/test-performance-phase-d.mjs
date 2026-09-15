#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const json = (rel) => JSON.parse(read(rel));
const failures = [];
const check = (ok, message) => { if (!ok) failures.push(message); };

const startup = read('src/startup-prepaint.js');
const app = read('src/app.js');
const home = read('src/index.html');
const runtime = read('scripts/qa-p5-runtime.mjs');
const acceptance = read('scripts/qa-p5-acceptance.mjs');
const consumer = json('ghrab-platform.consumer.json');
const packageJson = json('package.json');

check(startup.includes('performance.mark("ghrab-studio-start")'), 'Startup mark is missing.');
check(app.includes('ghrab-studio-render-ready') && app.includes('ghrab-studio-render-ready-ms'), 'Render-ready performance marks are missing.');
check(app.includes('root.dataset.studioRenderReady = "true"'), 'Render-ready dataset signal is missing.');
check(app.includes('data-portal-asset') || app.includes('dataset.portalAsset'), 'Deferred portal asset loader is missing.');

const gatewayTag = home.match(/<img\b[^>]*class="portal-core-image"[^>]*>/s)?.[0] || '';
check(Boolean(gatewayTag), 'Portal gateway image tag is missing.');
check(!/\ssrc=/.test(gatewayTag), 'Portal gateway is still eager-loaded through src.');
check(/data-portal-asset=/.test(gatewayTag), 'Portal gateway has no deferred asset path.');
check(/width="760"/.test(gatewayTag) && /height="760"/.test(gatewayTag), 'Deferred gateway lacks intrinsic dimensions.');
check(/decoding="async"/.test(gatewayTag) && /fetchpriority="low"/.test(gatewayTag), 'Deferred gateway lacks async/low-priority hints.');

for (const token of [
  'Emulation.setCPUThrottlingRate',
  'Performance.getMetrics',
  'runtimeBudget',
  'referenceProfile',
  'maxRenderReadyMs',
  'maxJsHeapUsedBytes',
  'maxLayoutDurationMs',
  'maxTaskDurationMs',
  'performanceFailures',
  "schema:'ghrab-p5-runtime-audit-v3'",
]) check(runtime.includes(token), `Runtime performance gate is missing ${token}.`);

check(acceptance.includes('runtime.performance-budget') && acceptance.includes('performanceFailures'), 'Release acceptance does not explicitly enforce runtime performance.');
check(consumer.quality?.requireRuntimeBudget === true, 'Runtime budget is not mandatory.');
check(Number(consumer.quality?.referenceProfile?.cpuSlowdown) === 4, 'Reference CPU slowdown must remain 4x.');
check(consumer.quality?.referenceProfile?.viewport === '1366x768', 'Reference viewport must remain 1366x768.');
check(Number(consumer.quality?.performanceBudget?.entryCriticalBytes) <= 420000, 'Critical entry budget was not tightened to <= 420 kB.');
check(String(packageJson.scripts?.test || '').includes('test:performance-phase-d'), 'Main npm test does not include Phase D regression.');

const distIndex = path.join(root, 'dist/index.html');
if (fs.existsSync(distIndex)) {
  const qualityScript = read('scripts/qa-p3-quality.mjs');
  check(qualityScript.includes('entryCriticalBytes'), 'Static critical entry metric is missing.');
  const html = fs.readFileSync(distIndex, 'utf8');
  check(!/<img\b[^>]*class="portal-core-image"[^>]*\ssrc=/s.test(html), 'Built gateway reverted to eager src.');
}

if (failures.length) {
  console.error('Performance Phase D tests failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Performance Phase D tests: PASS (runtime budgets enforced; portal gateway deferred; critical-entry reserve protected).');
