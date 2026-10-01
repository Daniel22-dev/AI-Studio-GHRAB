import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');

const prep = spawnSync(process.execPath, [path.join(root, 'scripts', 'prepare-production-dist.mjs'), dist], {
  cwd: root,
  encoding: 'utf8',
});
if (prep.status !== 0) {
  process.stderr.write(prep.stdout || '');
  process.stderr.write(prep.stderr || '');
  process.exit(prep.status || 1);
}

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  });
}

const failures = [];
if (fs.existsSync(path.join(dist, 'tests'))) failures.push('dist/tests still exists');

const integration = path.join(dist, 'integration');
const integrationHtml = walk(integration).filter((file) => file.toLowerCase().endsWith('.html'));
if (integrationHtml.length) failures.push(`integration HTML remains: ${integrationHtml.map((file) => path.relative(dist, file)).join(', ')}`);
if (!fs.existsSync(path.join(integration, 'save-to-studio.js'))) failures.push('integration/save-to-studio.js was removed');

const htmlFiles = walk(dist).filter((file) => file.toLowerCase().endsWith('.html'));
for (const file of htmlFiles) {
  const text = fs.readFileSync(file, 'utf8');
  const head = text.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1] || '';
  const csp = head.match(/<meta\b[^>]*http-equiv=["']Content-Security-Policy["'][\s\S]*?>/i);
  const firstScript = head.match(/<script\b[^>]*>/i);
  const name = path.relative(dist, file).split(path.sep).join('/');
  if (!csp) {
    failures.push(`${name}: missing CSP meta`);
    continue;
  }
  if (!firstScript) {
    failures.push(`${name}: missing script in head`);
    continue;
  }
  const cspPos = head.indexOf(csp[0]);
  const scriptPos = head.indexOf(firstScript[0]);
  if (cspPos > scriptPos) failures.push(`${name}: CSP meta is after first script`);
  if (!/\bsrc=["'][^"']*frame-guard\.js\?v=[^"']+["']/i.test(firstScript[0])) {
    failures.push(`${name}: frame-guard.js is not the first script`);
  }
}

const sw = fs.readFileSync(path.join(dist, 'sw.js'), 'utf8');
if (!sw.includes('"./frame-guard.js"')) failures.push('frame-guard.js is missing from service-worker CORE_REQUIRED');

if (failures.length) {
  console.error(JSON.stringify({ status: 'FAIL', failures }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ status: 'PASS', htmlFiles: htmlFiles.length, integrationHtml: 0, testsRemoved: true }, null, 2));
