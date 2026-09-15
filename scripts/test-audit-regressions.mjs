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
for (const rel of ['config/access-config-bundle.json', 'config/access-config-bundle.sig.json']) {
  check(`SW bypasses ${rel}`, runtimeBlock.includes(`'${rel}'`));
}
check('SW has network-first fetch branch', /isRuntimeNetworkFirst\(url, scopePath\)[\s\S]*?networkFirst\(request\)/.test(sw));
check('SW has no dead runtime-config contract', !sw.includes("relative === 'runtime-config.js'"));
check('SW cached navigation is immediate', sw.includes('navigationCacheFirst') && /request\.mode === 'navigate'[\s\S]*?navigationCacheFirst\(request, fallback\)/.test(sw));
check('SW optional precache concurrency is bounded', /const batchSize = 4/.test(sw) && /optionalAssets\.slice\(index, index \+ batchSize\)/.test(sw));

const build = read('scripts/build.mjs');
const builtSw = read('dist/sw.js');
const installPrecache = [
  ...(builtSw.match(/const CORE_REQUIRED = \[([\s\S]*?)\];/)?.[1]?.matchAll(/["'](\.\/[^"']+)["']/g) || []),
  ...(builtSw.match(/const CORE_OPTIONAL = \[([\s\S]*?)\];/)?.[1]?.matchAll(/["'](\.\/[^"']+)["']/g) || []),
].map((match) => match[1]);
for (const rel of ['./access/app-guard.js', './access/access-control.js', './access/platform-runtime.js']) {
  check(`Precache keeps offline fallback ${rel}`, installPrecache.includes(rel));
}
check('Deployment profile is not precached as required', !installPrecache.includes('./config/deployment.json'));
check('Changelog is excluded from install precache', !installPrecache.includes('./config/changelog.json'));
check('Runtime changelog is split into bounded archive chunks', build.includes('maxChunkBytes = 120000') && build.includes('changelog.archive-'));
check('Changelog UI loads runtime archives', fs.readFileSync(path.join(root, 'src/changelog/changelog.js'), 'utf8').includes('data.archives'));
const sourceChangelog = json('src/config/changelog.json');
const runtimeChangelog = json('dist/config/changelog.json');
const runtimeArchiveNames = Array.isArray(runtimeChangelog.archives) ? runtimeChangelog.archives : [];
const runtimeChangelogParts = [runtimeChangelog, ...runtimeArchiveNames.map((name) => json(`dist/config/${name}`))];
const runtimeChangelogItems = runtimeChangelogParts.flatMap((part) => part.items || []);
const expectedRuntimeChangelogItems = JSON.parse(JSON.stringify(sourceChangelog.items).replaceAll('__APP_VERSION__', json('package.json').version));
check('Runtime changelog preserves every source item', JSON.stringify(runtimeChangelogItems) === JSON.stringify(expectedRuntimeChangelogItems));
check('Runtime changelog chunks stay below 120 kB target', runtimeChangelogParts.every((_, index) => {
  const rel = index === 0 ? 'dist/config/changelog.json' : `dist/config/${runtimeArchiveNames[index - 1]}`;
  return fs.statSync(path.join(root, rel)).size <= 120000;
}));
check('Access bundle is excluded from install precache', !installPrecache.includes('./config/access-config-bundle.json') && !installPrecache.includes('./config/access-config-bundle.sig.json'));
check('Build bakes deployment profile', build.includes('deployment-baked.js') && build.includes('deploymentProfile'));
check('Build checks signed bundle freshness', build.includes('checkAccessBundleFreshness'));

const pkg = json('package.json');
check('P5 CI blocks stale signed bundle', pkg.scripts?.['qa:p5:ci']?.includes('access:check:required'));
const deployWorkflow = read('.github/workflows/deploy.yml');
check('Deploy blocks stale signed bundle before build', deployWorkflow.includes('npm run access:check:required'));

const deploymentConfig = read('src/access/deployment-config.js');
check('Deployment loader prefers build-time profile', deploymentConfig.includes('BAKED_DEPLOYMENT_CONFIG') && deploymentConfig.includes('configurationSource: "build-time"'));
check('Deployment fallback is fail-closed', deploymentConfig.includes('profile: "configuration-unavailable"') && deploymentConfig.includes('allowLocalProviderKeys: false'));

const platformRuntime = read('src/access/platform-runtime.js');
check('Local keys require explicit allow', platformRuntime.includes('allowLocalProviderKeys === true'));
check('Unavailable profile disables AI transport', platformRuntime.includes('selectedMode === "disabled" ? []'));

const prepaint = read('src/startup-prepaint.js');
const canonical = prepaint.indexOf('ghrab.ai-studio.motion.v1');
const legacy = prepaint.indexOf('ghrab.motion');
check('Prepaint reads canonical motion key first', canonical >= 0 && legacy > canonical);
check('Startup intro seen state is persistent and version-independent', prepaint.includes('ghrab.startup-intro.seen.v1') && prepaint.includes('localStorage.getItem(INTRO_SEEN_KEY)') && !prepaint.includes('sessionStorage.getItem(`ghrab.startup-intro.'));

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
check('School build bakes fail-closed deployment', schoolBuild.includes('deployment-baked.js') && schoolBuild.includes('allowLocalProviderKeys'));

const workflowFiles = fs.readdirSync(path.join(root, '.github/workflows')).filter((name) => name.endsWith('.yml'));
for (const name of workflowFiles) {
  const workflow = read(`.github/workflows/${name}`);
  const mutable = [...workflow.matchAll(/uses:\s*[^\s@]+@([^\s#]+)/g)].filter((match) => !/^[0-9a-f]{40}$/.test(match[1]));
  check(`Workflow actions are SHA-pinned: ${name}`, mutable.length === 0, mutable.map((match) => match[0]).join(', '));
}
check('School build validates stale SW references', /runtime-config\\\.js|runtime-config\\?\.js|runtime-config/.test(schoolBuild) && schoolBuild.includes('deployment\\.school-server'));

const offlineStartBrowser = read('scripts/test-offline-start-browser.mjs');
check(
  'Offline browser card count follows generated registry',
  offlineStartBrowser.includes("config', 'apps.generated.json") &&
    offlineStartBrowser.includes('const expectedCards = registryApps.length') &&
    offlineStartBrowser.includes('result.onlineCards === expectedCards') &&
    offlineStartBrowser.includes('result.offlineCards === expectedCards'),
);

const qualityScript = read('scripts/qa-p3-quality.mjs');
check('P3 quality report exposes release status', /status:\s*failedChecks\.length\s*\?\s*'failed'\s*:\s*'passed'/.test(qualityScript));

const validator = read('qa/project-validator.mjs');
check('Precache budget comes from consumer', validator.includes('performanceBudget?.precacheBytes'));
check('No legacy 1536 KiB precache constant', !validator.includes('1536 * 1024'));
check('Security validator compares CSP profile', validator.includes('CSP_PROFILE_MISMATCH'));

const failed = checks.filter((item) => !item.ok);
for (const item of checks) console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.label}${item.detail ? ` — ${item.detail}` : ''}`);
console.log(`audit regressions: ${checks.length - failed.length}/${checks.length} PASS`);
if (failed.length) process.exit(1);
