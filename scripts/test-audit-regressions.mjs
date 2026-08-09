#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const json = (rel) => JSON.parse(read(rel));
const checks = [];
const check = (label, ok, detail = '') => checks.push({ label, ok: Boolean(ok), detail: String(detail || '') });

const sw = read('src/sw.js');
for (const rel of ['access/app-guard.js', 'access/access-control.js', 'access/platform-runtime.js']) {
  check(`SW network-first ${rel}`, sw.includes(`'${rel}'`) && sw.includes('RUNTIME_NETWORK_FIRST'));
}
const runtimeBlock = sw.match(/function isRuntimeRequest[\s\S]*?\n\}/)?.[0] || '';
check('SW runtime-only list excludes gate code', !/access\/(?:app-guard|access-control|platform-runtime)\.js/.test(runtimeBlock));
check('SW has network-first fetch branch', /isRuntimeNetworkFirst\(url, scopePath\)[\s\S]*?networkFirst\(request\)/.test(sw));
check('SW has no dead runtime-config contract', !sw.includes("relative === 'runtime-config.js'"));

const build = read('scripts/build.mjs');
for (const rel of ['./access/app-guard.js', './access/access-control.js', './access/platform-runtime.js']) {
  check(`Precache keeps offline fallback ${rel}`, build.includes(JSON.stringify(rel)));
}
check('Deployment profile is not precached as required', !/requiredCacheFiles[\s\S]*?\.\/config\/deployment\.json/.test(build));
check('Changelog is excluded from install precache', build.includes('file !== \"./config/changelog.json\"'));

const prepaint = read('src/startup-prepaint.js');
const canonical = prepaint.indexOf('ghrab.ai-studio.motion.v1');
const legacy = prepaint.indexOf('ghrab.motion');
check('Prepaint reads canonical motion key first', canonical >= 0 && legacy > canonical);

const app = read('src/app.js');
check('Language sync listener is persistent', !/addEventListener\(\s*["']ghrab:language["']\s*,\s*update\s*,\s*\{\s*once\s*:\s*true/.test(app));
check('Stale src consumer removed', !fs.existsSync(path.join(root, 'src/ghrab-platform.consumer.json')));

const consumer = json('ghrab-platform.consumer.json');
const manifest = json('src/manifest.webmanifest');
check('PWA platform version matches consumer', manifest.ghrab_platform?.version === consumer.platform.version);
check('PWA platform range matches consumer', manifest.ghrab_platform?.required_range === consumer.platform.requiredRange);
check('Theme contract is truthful dark-only', JSON.stringify(consumer.theme?.supported) === JSON.stringify(['dark']));

const qaManifest = json('qa/qa-manifest.json');
check('Visual gate includes 390x844', qaManifest.requiredViewports?.some((v) => v.width === 390 && v.height === 844));
check('Runtime gate includes width 390', consumer.quality?.runtimeAudit?.viewports?.includes(390));

const headers = json('src/config/security-headers.json');
const staticCsp = headers.staticProfile?.contentSecurityPolicy || '';
const schoolCsp = headers.schoolServerProfile?.headers?.['Content-Security-Policy'] || '';
check('Static CSP has no unsafe-inline', !staticCsp.includes("'unsafe-inline'"));
check('School CSP has no unsafe-inline', !schoolCsp.includes("'unsafe-inline'"));
check('School profile has HSTS', Boolean(headers.schoolServerProfile?.headers?.['Strict-Transport-Security']));

const schoolBuild = read('scripts/build-school-profile.mjs');
check('School build derives P5 phase from consumer', schoolBuild.includes('consumer.quality?.stage'));
check('School build derives provider-key flag', schoolBuild.includes('deployment.features?.allowLocalProviderKeys'));
check('School build derives gateway flag', schoolBuild.includes('deployment.features?.schoolGatewayReady'));
check('School build removes example profile', schoolBuild.includes('deployment.school-server.example.json'));
check('School build validates stale SW references', /runtime-config\\\.js|runtime-config\\?\.js|runtime-config/.test(schoolBuild) && schoolBuild.includes('deployment\\.school-server'));

const validator = read('qa/project-validator.mjs');
check('Precache budget comes from consumer', validator.includes('performanceBudget?.precacheBytes'));
check('No legacy 1536 KiB precache constant', !validator.includes('1536 * 1024'));
check('Security validator compares CSP profile', validator.includes('CSP_PROFILE_MISMATCH'));

const failed = checks.filter((item) => !item.ok);
for (const item of checks) console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.label}${item.detail ? ` — ${item.detail}` : ''}`);
console.log(`audit regressions: ${checks.length - failed.length}/${checks.length} PASS`);
if (failed.length) process.exit(1);
