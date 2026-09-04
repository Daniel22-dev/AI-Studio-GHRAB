import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptPath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptPath), '..');
const requested = process.argv.find((arg) => arg.startsWith('--case='))?.slice(7) || '';
const CANARY = process.env.GHRAB_GARP_CANARY || `GARP-SYNTHETIC-${process.pid}-7D1EA1E39C32`;
const APP_VERSION = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;

class StorageMock {
  constructor() { this.map = new Map(); }
  get length() { return this.map.size; }
  key(index) { return [...this.map.keys()][index] ?? null; }
  getItem(key) { return this.map.has(String(key)) ? this.map.get(String(key)) : null; }
  setItem(key, value) { this.map.set(String(key), String(value)); }
  removeItem(key) { this.map.delete(String(key)); }
  clear() { this.map.clear(); }
}

function installGlobals({ captureStorageListener = false } = {}) {
  globalThis.localStorage = new StorageMock();
  globalThis.sessionStorage = new StorageMock();
  globalThis.location = {
    href: 'https://audit.invalid/AI-Studio-GHRAB/audit.html?synthetic=1#fragment',
    origin: 'https://audit.invalid',
    pathname: '/AI-Studio-GHRAB/audit.html',
    reload() {},
  };
  Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, configurable: true });
  globalThis.CustomEvent = class CustomEvent { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } };
  const classList = { toggle() {} };
  globalThis.document = {
    documentElement: { classList, dataset: {}, hasAttribute() { return false; } },
    dispatchEvent() {}, body: {}, head: { append() {} }, currentScript: null,
    getElementById() { return null; }, addEventListener() {},
    createElement() { return { style: {}, dataset: {}, setAttribute() {}, append() {}, appendChild() {}, addEventListener() {}, attachShadow() { return this; }, focus() {}, querySelectorAll() { return []; } }; },
    querySelectorAll() { return []; }, readyState: 'loading',
  };
  globalThis.window = globalThis;
  globalThis.confirm = () => true;
  globalThis.caches = { async keys() { return []; }, async delete() { return true; } };
  const listeners = new Map();
  globalThis.addEventListener = captureStorageListener
    ? (type, callback) => { if (!listeners.has(type)) listeners.set(type, []); listeners.get(type).push(callback); }
    : () => {};
  return { listeners };
}

function deployment(profile = 'github-pages') {
  return profile === 'school-server'
    ? {
        profile, authMode: 'server-session', aiTransport: 'not-applicable', telemetryMode: 'local',
        apiBaseUrl: 'https://audit.invalid/api/v1/', appBaseUrl: 'https://audit.invalid/AI-Studio-GHRAB/',
        appBaseUrls: { 'ai-studio': 'https://audit.invalid/AI-Studio-GHRAB/' }, endpoints: { session: 'session', logout: 'session/logout' },
        features: { allowLocalProviderKeys: false },
      }
    : {
        profile, authMode: 'signed-permit', aiTransport: 'not-applicable', telemetryMode: 'local', apiBaseUrl: '',
        appBaseUrl: 'https://audit.invalid/AI-Studio-GHRAB/', appBaseUrls: { 'ai-studio': 'https://audit.invalid/AI-Studio-GHRAB/' },
        features: { allowLocalProviderKeys: true },
      };
}

function responseJson(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

async function importFresh(relative, tag) {
  const url = pathToFileURL(path.join(root, relative));
  url.searchParams.set('garp-regression', `${tag}-${process.pid}-${Date.now()}`);
  return import(url.href);
}

async function caseServerMissingApps() {
  installGlobals();
  globalThis.__GHRAB_DEPLOYMENT_CONFIG__ = deployment('school-server');
  globalThis.fetch = async (url) => {
    if (String(url).includes('/session')) return responseJson({ schema: 'ghrab-session-v1', authenticated: true, user: { id: 'synthetic-teacher', role: 'teacher' }, requestToken: 'TEST_request_token_sentinel' });
    throw new Error(`unexpected fetch ${url}`);
  };
  const access = await importFresh('src/access/access-control.js', 'missing-apps');
  const snapshot = await access.initialiseAccess({ authMode: 'server-session', sessionUrl: 'https://audit.invalid/api/v1/session' });
  const decision = access.hasAppAccess('essay-evaluator');
  return { pass: snapshot.valid === true && decision.enabled === false && decision.reason === 'app-not-permitted' && Array.isArray(decision.permit?.apps) && decision.permit.apps.length === 0, decision };
}

async function caseServerExplicitAppsAndExpiry() {
  const { listeners } = installGlobals({ captureStorageListener: true });
  globalThis.__GHRAB_DEPLOYMENT_CONFIG__ = deployment('school-server');
  const expiresAt = new Date(Date.now() + 60_000).toISOString();
  globalThis.fetch = async (url) => {
    if (String(url).includes('/session')) return responseJson({ schema: 'ghrab-session-v1', authenticated: true, expiresAt, user: { id: 'synthetic-teacher', role: 'teacher', apps: ['essay-evaluator'] }, requestToken: 'TEST_request_token_sentinel' });
    throw new Error(`unexpected fetch ${url}`);
  };
  const access = await importFresh('src/access/access-control.js', 'explicit-apps');
  await access.initialiseAccess({ authMode: 'server-session', sessionUrl: 'https://audit.invalid/api/v1/session' });
  const allowed = access.hasAppAccess('essay-evaluator');
  const deniedOther = access.hasAppAccess('test-generator');
  const originalNow = Date.now;
  Date.now = () => Date.parse(expiresAt) + 1000;
  const expired = access.hasAppAccess('essay-evaluator');
  Date.now = originalNow;
  for (const callback of listeners.get('storage') || []) callback({ key: 'ghrab.access.end-session.v1', newValue: 'synthetic-signal' });
  const afterCrossTabEnd = access.hasAppAccess('essay-evaluator');
  return {
    pass: allowed.enabled === true && deniedOther.enabled === false && expired.enabled === false && expired.reason === 'expired' && afterCrossTabEnd.enabled === false,
    allowed: allowed.reason, deniedOther: deniedOther.reason, expired: expired.reason, afterCrossTabEnd: afterCrossTabEnd.reason,
  };
}

async function loadManifest() {
  return fs.readFileSync(path.join(root, 'src/config/data-manifest.json'), 'utf8');
}

async function caseDeletionAndEndWork() {
  installGlobals();
  globalThis.__GHRAB_DEPLOYMENT_CONFIG__ = deployment('github-pages');
  const manifest = await loadManifest();
  globalThis.fetch = async (url) => {
    if (String(url).endsWith('/config/data-manifest.json')) return new Response(manifest, { status: 200, headers: { 'Content-Type': 'application/json' } });
    throw new Error(`unexpected fetch ${url}`);
  };
  const runtime = await importFresh('src/access/platform-runtime.js', 'delete-end');
  await runtime.initialisePlatformRuntime({ appId: 'ai-studio', appVersion: APP_VERSION, mountControls: false });
  const keys = [
    'ghrab.ai-studio.workspace.v1',
    'ghrab.workflow.draft.v1',
    'ghrab.report.settings.v2',
    'ghrab.report.imports.v1',
    'ghrab.access.issued-registry.v1',
    'ghrab.access.last-known-good.v1',
    'ghrab.shared-access-cache-refreshed.synthetic',
    'ghrab.pilot.events.v2',
    'ghrab.platform.handoff.v2',
    'ghrab.handoff.v1',
    'ghrab.access.permit.v2',
  ];
  for (const key of keys) localStorage.setItem(key, JSON.stringify({ value: CANARY }));
  sessionStorage.setItem('ghrab.ai-studio.role-preview.v1', CANARY);
  sessionStorage.setItem('ghrab.platform.shared-device.v1', 'true');
  sessionStorage.setItem(`ghrab.startup-intro.${APP_VERSION}`, 'seen');
  const ended = await globalThis.GHRABPlatform.endWork({ clearApplicationData: true, reload: false });
  const remaining = keys.filter((key) => localStorage.getItem(key) !== null);
  const remainingSession = ['ghrab.ai-studio.role-preview.v1', 'ghrab.platform.shared-device.v1', `ghrab.startup-intro.${APP_VERSION}`]
    .filter((key) => sessionStorage.getItem(key) !== null);
  const generation = localStorage.getItem('ghrab.access.session-generation.v1');
  const suiteGeneration = localStorage.getItem('ghrab.platform.suite-session-generation.v1');
  return {
    pass: ended.ok === true && remaining.length === 0 && remainingSession.length === 0 && ended.local?.verification?.complete === true && ended.sessionGenerationRotated === true && ended.suiteSessionSignalled === true && Boolean(generation) && Boolean(suiteGeneration) && !generation.includes(CANARY) && !suiteGeneration.includes(CANARY),
    endedOk: ended.ok, remaining, remainingSession, generationRotated: ended.sessionGenerationRotated, suiteSessionSignalled: ended.suiteSessionSignalled, generationPresent: Boolean(generation), suiteGenerationPresent: Boolean(suiteGeneration), verification: ended.local?.verification,
  };
}

async function casePersonalEndWorkPreservesContent() {
  installGlobals();
  globalThis.__GHRAB_DEPLOYMENT_CONFIG__ = deployment('github-pages');
  const manifest = await loadManifest();
  globalThis.fetch = async (url) => {
    if (String(url).endsWith('/config/data-manifest.json')) return new Response(manifest, { status: 200, headers: { 'Content-Type': 'application/json' } });
    throw new Error(`unexpected fetch ${url}`);
  };
  const runtime = await importFresh('src/access/platform-runtime.js', 'personal-end');
  await runtime.initialisePlatformRuntime({ appId: 'ai-studio', appVersion: APP_VERSION, mountControls: false });
  const preserved = ['ghrab.workflow.draft.v1', 'ghrab.report.imports.v1', 'ghrab.access.issued-registry.v1', 'ghrab.pilot.events.v2'];
  for (const key of preserved) localStorage.setItem(key, CANARY);
  localStorage.setItem('ghrab.platform.handoff.v2', CANARY);
  localStorage.setItem('ghrab.access.permit.v2', CANARY);
  sessionStorage.setItem('ghrab.ai-studio.role-preview.v1', CANARY);
  const ended = await globalThis.GHRABPlatform.endWork({ clearApplicationData: false, reload: false });
  const contentPreserved = preserved.every((key) => localStorage.getItem(key) === CANARY);
  const transientGone = localStorage.getItem('ghrab.platform.handoff.v2') === null && localStorage.getItem('ghrab.access.permit.v2') === null && sessionStorage.getItem('ghrab.ai-studio.role-preview.v1') === null;
  return { pass: ended.ok === true && contentPreserved && transientGone && ended.local?.verification?.complete === true, contentPreserved, transientGone, verification: ended.local?.verification };
}

async function caseOwnedUnmappedDeletionFailsClosed() {
  installGlobals();
  globalThis.__GHRAB_DEPLOYMENT_CONFIG__ = deployment('github-pages');
  const manifest = await loadManifest();
  globalThis.fetch = async (url) => {
    if (String(url).endsWith('/config/data-manifest.json')) return new Response(manifest, { status: 200, headers: { 'Content-Type': 'application/json' } });
    throw new Error(`unexpected fetch ${url}`);
  };
  const runtime = await importFresh('src/access/platform-runtime.js', 'default-owned');
  await runtime.initialisePlatformRuntime({ appId: 'ai-studio', appVersion: APP_VERSION, mountControls: false });
  localStorage.setItem('ghrab.synthetic-new-module.draft.v1', CANARY);
  localStorage.setItem('ghrab.correspondence.synthetic-child-state', CANARY);
  const result = await globalThis.GHRABPlatform.deleteMyData({ reload: false });
  const unknownGone = localStorage.getItem('ghrab.synthetic-new-module.draft.v1') === null;
  const childPreserved = localStorage.getItem('ghrab.correspondence.synthetic-child-state') === CANARY;
  return {
    pass: result.ok === true && unknownGone && childPreserved && result.local?.verification?.complete === true,
    ok: result.ok, unknownGone, childPreserved, remaining: result.local?.verification?.remaining || [], errors: result.local?.errors || [],
  };
}

async function caseDeleteRotatesGeneration() {
  installGlobals();
  globalThis.__GHRAB_DEPLOYMENT_CONFIG__ = deployment('github-pages');
  const manifest = await loadManifest();
  globalThis.fetch = async (url) => {
    if (String(url).endsWith('/config/data-manifest.json')) return new Response(manifest, { status: 200, headers: { 'Content-Type': 'application/json' } });
    throw new Error(`unexpected fetch ${url}`);
  };
  const runtime = await importFresh('src/access/platform-runtime.js', 'delete-generation');
  await runtime.initialisePlatformRuntime({ appId: 'ai-studio', appVersion: APP_VERSION, mountControls: false });
  localStorage.setItem('ghrab.access.session-generation.v1', 'stale-generation');
  localStorage.setItem('ghrab.ai-studio.workflow.draft.v1', CANARY);
  const result = await globalThis.GHRABPlatform.deleteMyData({ reload: false });
  const generation = localStorage.getItem('ghrab.access.session-generation.v1');
  const draftGone = localStorage.getItem('ghrab.ai-studio.workflow.draft.v1') === null;
  return {
    pass: result.ok === true && result.sessionGenerationRotated === true && Boolean(generation) && generation !== 'stale-generation' && !generation.includes(CANARY) && draftGone && result.local?.verification?.complete === true,
    ok: result.ok, generationRotated: result.sessionGenerationRotated, generationPresent: Boolean(generation), generationChanged: generation !== 'stale-generation', draftGone, verification: result.local?.verification,
  };
}

async function caseSuiteTombstoneReserved() {
  installGlobals();
  globalThis.__GHRAB_DEPLOYMENT_CONFIG__ = deployment('github-pages');
  const manifest = await loadManifest();
  globalThis.fetch = async (url) => {
    if (String(url).endsWith('/config/data-manifest.json')) return new Response(manifest, { status: 200, headers: { 'Content-Type': 'application/json' } });
    throw new Error(`unexpected fetch ${url}`);
  };
  const runtime = await importFresh('src/access/platform-runtime.js', 'suite-tombstone-reserved');
  await runtime.initialisePlatformRuntime({ appId: 'ai-studio', appVersion: APP_VERSION, mountControls: false });
  localStorage.setItem('ghrab.platform.suite-session-generation.v1', 'synthetic-suite-generation');
  localStorage.setItem('ghrab.ai-studio.workspace.v1', CANARY);
  const result = await globalThis.GHRABPlatform.deleteMyData({ reload: false });
  return { pass: result.ok === true && localStorage.getItem('ghrab.platform.suite-session-generation.v1') === 'synthetic-suite-generation' && localStorage.getItem('ghrab.ai-studio.workspace.v1') === null, suiteGeneration: localStorage.getItem('ghrab.platform.suite-session-generation.v1'), verification: result.local?.verification };
}

async function caseDeleteManifestUnavailable() {
  installGlobals();
  globalThis.__GHRAB_DEPLOYMENT_CONFIG__ = deployment('github-pages');
  globalThis.fetch = async () => { throw new Error('synthetic manifest outage'); };
  const runtime = await importFresh('src/access/platform-runtime.js', 'manifest-outage');
  await runtime.initialisePlatformRuntime({ appId: 'ai-studio', appVersion: APP_VERSION, mountControls: false });
  localStorage.setItem('ghrab.ai-studio.workspace.v1', CANARY);
  const result = await globalThis.GHRABPlatform.deleteMyData({ reload: false });
  return { pass: result.ok === false && result.reason === 'data-manifest-unavailable' && localStorage.getItem('ghrab.ai-studio.workspace.v1') === CANARY, ok: result.ok, reason: result.reason };
}

async function casePlatformTelemetry() {
  installGlobals();
  const consumer = JSON.parse(fs.readFileSync(path.join(root, 'ghrab-platform.consumer.json'), 'utf8'));
  document.currentScript = { src: 'https://audit.invalid/AI-Studio-GHRAB/src/platform/ghrab-platform.js' };
  document.documentElement.dataset = { ghrabAppId: 'ai-studio', ghrabAppVersion: APP_VERSION };
  globalThis.GHRAB_PLATFORM_CONFIG = { appId: 'ai-studio', appVersion: APP_VERSION, requiredPlatformRange: consumer.platform.requiredRange, bridgeMaxBytes: 500000, autoFooter: false };
  const code = fs.readFileSync(path.join(root, 'src/platform/ghrab-platform.js'), 'utf8');
  (0, eval)(code);
  const material = { schema: 'ghrab-material-v1', id: CANARY, content: { text: 'synthetic-only' } };
  globalThis.GHRAB_PLATFORM.bridge.create({ material, target: 'synthetic-target', sourceAppId: 'ai-studio', sourceAppVersion: APP_VERSION, writeLegacy: false });
  const row = JSON.parse(localStorage.getItem('ghrab.pilot.events.v2'))[0];
  return { pass: row && !Object.hasOwn(row, 'materialId') && !JSON.stringify(row).includes(CANARY), keys: Object.keys(row || {}) };
}

async function caseHandoffCollisionFailClosed() {
  installGlobals();
  const consumer = JSON.parse(fs.readFileSync(path.join(root, 'ghrab-platform.consumer.json'), 'utf8'));
  document.currentScript = { src: 'https://audit.invalid/AI-Studio-GHRAB/src/platform/ghrab-platform.js' };
  document.documentElement.dataset = { ghrabAppId: 'ai-studio', ghrabAppVersion: APP_VERSION };
  globalThis.GHRAB_PLATFORM_CONFIG = { appId: 'ai-studio', appVersion: APP_VERSION, requiredPlatformRange: consumer.platform.requiredRange, bridgeMaxBytes: 500000, autoFooter: false };
  const code = fs.readFileSync(path.join(root, 'src/platform/ghrab-platform.js'), 'utf8');
  (0, eval)(code);
  const a = { schema: 'ghrab-material-v1', id: 'synthetic-a', content: { text: 'A' } };
  const b = { schema: 'ghrab-material-v1', id: 'synthetic-b', content: { text: 'B' } };
  const first = globalThis.GHRAB_PLATFORM.bridge.create({ material: a, target: 'synthetic-target', sourceAppId: 'ai-studio', sourceAppVersion: APP_VERSION, writeLegacy: false });
  const second = globalThis.GHRAB_PLATFORM.bridge.create({ material: b, target: 'synthetic-target', sourceAppId: 'ai-studio', sourceAppVersion: APP_VERSION, writeLegacy: false });
  const peek = globalThis.GHRAB_PLATFORM.bridge.peek({ target: 'synthetic-target' });
  const taken = globalThis.GHRAB_PLATFORM.bridge.take({ target: 'synthetic-target' });
  const third = globalThis.GHRAB_PLATFORM.bridge.create({ material: b, target: 'synthetic-target', sourceAppId: 'ai-studio', sourceAppVersion: APP_VERSION, writeLegacy: false });
  return { pass: first?.material?.id === 'synthetic-a' && second === null && peek?.material?.id === 'synthetic-a' && taken?.material?.id === 'synthetic-a' && third?.material?.id === 'synthetic-b' };
}

async function casePilotEventSanitizerAndWorkflow() {
  const privacy = await importFresh('src/privacy/pilot-event.js', 'pilot-privacy');
  const cleaned = privacy.sanitizePilotEvent({
    type: 'material-saved', appId: 'ai-studio', estimatedMinutes: 10,
    materialId: CANARY, title: CANARY, notes: CANARY,
  });
  const workflow = fs.readFileSync(path.join(root, 'src/workflow/workflow.js'), 'utf8');
  const app = fs.readFileSync(path.join(root, 'src/app.js'), 'utf8');
  return {
    pass: cleaned?.type === 'material-saved' && cleaned?.appId === 'ai-studio' && !JSON.stringify(cleaned).includes(CANARY) &&
      !Object.hasOwn(cleaned, 'materialId') && !workflow.includes('materialId: material.id') &&
      !workflow.includes('searchParams.set("material", material.id)') &&
      app.includes('sanitizePilotEvent(event)') && app.includes('cleanPilotEventStore(PILOT_EVENTS_KEY);'),
    cleanedKeys: Object.keys(cleaned || {}),
  };
}


async function caseStorageManifestSourceCoverage() {
  const manifest = JSON.parse(await loadManifest());
  const localRule = manifest.ownership?.localStorageRule || {};
  const sessionRule = manifest.ownership?.sessionStorageRule || {};
  const matches = (pattern, key) => String(pattern).endsWith('*') ? key.startsWith(String(pattern).slice(0, -1)) : key === pattern;
  const reservedByRule = (rule, key) => (rule?.reserved || []).some((pattern) => matches(pattern, key));
  const ownedByRule = (rule, key) => Boolean(rule?.prefix) && key.startsWith(String(rule.prefix)) && !reservedByRule(rule, key) && !(rule.exceptions || []).some((pattern) => matches(pattern, key));
  const jsFiles = [];
  const collect = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) collect(full);
      else if (entry.isFile() && full.endsWith('.js')) jsFiles.push(full);
    }
  };
  collect(path.join(root, 'src'));
  const ignored = new Set(['ghrab.json']);
  const keys = new Set();
  for (const full of jsFiles) {
    const source = fs.readFileSync(full, 'utf8');
    for (const match of source.matchAll(/ghrab\.[A-Za-z0-9._-]+/gu)) {
      const key = match[0];
      if (!ignored.has(key)) keys.add(key.endsWith('.') ? `${key}synthetic` : key);
    }
  }
  const uncovered = [...keys].filter((key) => !reservedByRule(localRule, key) && !reservedByRule(sessionRule, key) && !ownedByRule(localRule, key) && !ownedByRule(sessionRule, key) &&
    !(manifest.ownership?.localStoragePatterns || []).some((pattern) => matches(pattern, key)) &&
    !(manifest.ownership?.sessionStoragePatterns || []).some((pattern) => matches(pattern, key))).sort();
  const consumers = JSON.parse(fs.readFileSync(path.join(root, 'src/config/platform-consumers.json'), 'utf8'));
  const childPrefixes = consumers.filter((item) => item.id !== 'ai-studio').map((item) => `${item.platform?.storagePrefix || ''}*`).filter((value) => value !== '*').sort();
  const localExceptions = [...(localRule.exceptions || [])].sort();
  const sessionExceptions = [...(sessionRule.exceptions || [])].sort();
  const exceptionCoverage = JSON.stringify(childPrefixes) === JSON.stringify(localExceptions) && JSON.stringify(childPrefixes) === JSON.stringify(sessionExceptions);
  const reservedSafe = JSON.stringify(localRule.reserved || []) === JSON.stringify(['ghrab.platform.suite-session-generation.v1']) && JSON.stringify(sessionRule.reserved || []) === JSON.stringify(['ghrab.platform.suite-session-generation.v1']);
  const ruleSafe = localRule.prefix === 'ghrab.' && sessionRule.prefix === 'ghrab.' && reservedSafe;
  return {
    pass: uncovered.length === 0 && ruleSafe && exceptionCoverage && manifest.storageNamespace?.migrationId === 'p2-storage-namespace-v2',
    uncovered, scannedKeys: keys.size, scannedFiles: jsFiles.length, ruleSafe, reservedSafe, exceptionCoverage, childPrefixes,
  };
}

async function caseStorageMigrationV2() {
  installGlobals();
  globalThis.Storage = StorageMock;
  document.currentScript = { src: 'https://audit.invalid/AI-Studio-GHRAB/src/platform/ghrab-platform.js' };
  document.documentElement.dataset = { ghrabAppId: 'ai-studio', ghrabAppVersion: APP_VERSION };
  const consumer = JSON.parse(fs.readFileSync(path.join(root, 'ghrab-platform.consumer.json'), 'utf8'));
  globalThis.GHRAB_PLATFORM_CONFIG = { appId: 'ai-studio', appVersion: APP_VERSION, requiredPlatformRange: consumer.platform.requiredRange, bridgeMaxBytes: 500000, autoFooter: false, storageMigration: consumer.storageMigration };
  const legacy = ['ghrab.workflow.draft.v1','ghrab.report.settings.v2','ghrab.report.imports.v1','ghrab.access.issued-registry.v1'];
  for (const key of legacy) localStorage.setItem(key, `${CANARY}:${key}`);
  const code = fs.readFileSync(path.join(root, 'src/platform/ghrab-platform.js'), 'utf8');
  (0, eval)(code);
  const expected = new Map(consumer.storageMigration.mappings.filter((m) => legacy.includes(m.legacy)).map((m) => [m.legacy, m.canonical]));
  const moved = [...expected].every(([oldKey, newKey]) => !localStorage.map.has(oldKey) && localStorage.map.get(newKey) === `${CANARY}:${oldKey}`);
  const marker = localStorage.map.get('ghrab.ai-studio.migration.p2-storage-namespace-v2.done');
  return { pass: moved && Boolean(marker) && globalThis.GHRAB_PLATFORM.storageMigration?.status === 'completed', moved, status: globalThis.GHRAB_PLATFORM.storageMigration?.status, keys: [...localStorage.map.keys()], expected: [...expected] };
}

async function caseSaveToStudioCollision() {
  installGlobals();
  let navigations = 0;
  globalThis.location.assign = () => { navigations += 1; };
  globalThis.GHRAB_PLATFORM = { bridge: { create: () => null, peek: () => ({ schema: 'ghrab-handoff-v2', id: 'synthetic-pending' }) } };
  const helper = await importFresh('src/integration/save-to-studio.js', 'save-to-studio-collision');
  const material = { schema: 'ghrab-material-v1', id: 'synthetic-material', content: { sourceText: CANARY } };
  const blocked = helper.saveMaterialToStudio({ material, studioUrl: 'https://audit.invalid/AI-Studio-GHRAB/', sourceAppId: 'synthetic-app', sourceAppVersion: '1.0.0', navigate: true });
  globalThis.GHRAB_PLATFORM = { bridge: { create: () => ({ schema: 'ghrab-handoff-v2', id: 'synthetic-new' }), peek: () => null } };
  const accepted = helper.saveMaterialToStudio({ material, studioUrl: 'https://audit.invalid/AI-Studio-GHRAB/', sourceAppId: 'synthetic-app', sourceAppVersion: '1.0.0', navigate: true });
  return { pass: blocked.ok === false && blocked.reason === 'handoff-pending' && accepted.ok === true && navigations === 1, blockedReason: blocked.reason, accepted: accepted.ok, navigations };
}


async function caseMaliciousImportBounds() {
  const validator = await importFresh('src/shared/material-validator.js', 'malicious-import');
  const oversized = validator.validateMaterialFile({ size: (2 * 1024 * 1024) + 1 });
  const synthetic = {
    schema: 'ghrab-material-v1', id: 'synthetic-import', version: 1, title: 'Synthetic', subject: 'Audit',
    objectives: [], content: { sourceText: 'safe', tasks: [] }, quality: { status: 'teacher-reviewed' },
    provenance: { updatedAt: new Date().toISOString() },
  };
  const valid = validator.validateMaterialPackage(synthetic);
  const poisoned = structuredClone(synthetic);
  poisoned.content.sourceText = 'X'.repeat(500001);
  poisoned.content.tasks = [{ id: 't1', type: 'open', prompt: 'Y'.repeat(6001) }];
  const rejected = validator.validateMaterialPackage(poisoned);
  return {
    pass: oversized.valid === false && oversized.errors?.[0]?.code === 'too-large' && valid.valid === true && rejected.valid === false && rejected.errors.some((item) => item.code === 'too-long'),
    oversizedCode: oversized.errors?.[0]?.code, rejectedCodes: [...new Set(rejected.errors.map((item) => item.code))],
  };
}

async function caseSafePilotExportCanary() {
  const safeExport = await importFresh('src/shared/safe-export.js', 'safe-export-canary');
  const now = new Date().toISOString();
  const period = safeExport.periodOfDate(now);
  const report = safeExport.buildPilotSummary({
    portalVersion: APP_VERSION, currentPhase: 1, sourceId: 'synthetic-source', period,
    launches: {},
    events: [{ at: now, type: 'handoff', appId: 'generator', materialId: CANARY, title: CANARY, note: CANARY }],
    workspace: [{ title: CANARY, content: { sourceText: CANARY }, quality: { status: 'teacher-reviewed' }, provenance: { updatedAt: now } }],
  });
  const serialized = JSON.stringify(report);
  return { pass: !serialized.includes(CANARY) && report.totals?.materials === 1 && Array.isArray(report.events), schema: report.schema };
}

async function caseAiSurfaceNonApplicable() {
  const activeProfiles = [
    'src/config/deployment.json',
    'src/config/deployment.school-server.json',
    'src/config/deployment.school-server.example.json',
  ].map((file) => ({ file, value: JSON.parse(fs.readFileSync(path.join(root, file), 'utf8')) }));
  const activeProfilesSafe = activeProfiles.every(({ value }) => value.aiTransport === 'not-applicable');
  const runtimeSource = fs.readFileSync(path.join(root, 'src/access/platform-runtime.js'), 'utf8');
  const runtimeCallCount = [...runtimeSource.matchAll(/\bcreateAiRuntimeConfig\s*\(/gu)].length;
  const jsFiles = [];
  const collect = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) collect(full);
      else if (entry.isFile() && full.endsWith('.js')) jsFiles.push(full);
    }
  };
  collect(path.join(root, 'src'));
  const externalCallers = [];
  for (const file of jsFiles) {
    const rel = path.relative(root, file).split(path.sep).join('/');
    if (rel === 'src/access/platform-runtime.js') continue;
    const source = fs.readFileSync(file, 'utf8');
    if (/\bcreateAiRuntimeConfig\s*\(/u.test(source)) externalCallers.push(rel);
  }
  const publicP0 = fs.existsSync(path.join(root, 'dist/config/deployment.school-server-p0.json'));
  const schoolP0 = fs.existsSync(path.join(root, 'dist-school-server/config/deployment.school-server-p0.json'));
  const bakedProfiles = ['dist/config/deployment-baked.js', 'dist-school-server/config/deployment-baked.js']
    .filter((file) => fs.existsSync(path.join(root, file)))
    .map((file) => ({ file, source: fs.readFileSync(path.join(root, file), 'utf8') }));
  const bakedSafe = bakedProfiles.every(({ source }) => source.includes('"aiTransport": "not-applicable"'));
  return {
    pass: activeProfilesSafe && runtimeCallCount === 1 && externalCallers.length === 0 && !publicP0 && !schoolP0 && bakedSafe,
    activeProfiles: activeProfiles.map(({ file, value }) => ({ file, aiTransport: value.aiTransport })),
    runtimeCallCount,
    externalCallers,
    publicP0,
    schoolP0,
    bakedSafe,
  };
}

async function caseSuiteSessionProtocol() {
  const { listeners } = installGlobals({ captureStorageListener: true });
  const consumer = JSON.parse(fs.readFileSync(path.join(root, 'ghrab-platform.consumer.json'), 'utf8'));
  const code = fs.readFileSync(path.join(root, 'src/platform/ghrab-platform.js'), 'utf8');
  document.currentScript = { src: 'https://audit.invalid/AI-Studio-GHRAB/src/platform/ghrab-platform.js' };
  document.documentElement.dataset = { ghrabAppId: 'ai-studio', ghrabAppVersion: APP_VERSION };
  globalThis.GHRAB_PLATFORM_CONFIG = { appId: 'ai-studio', appVersion: APP_VERSION, requiredPlatformRange: consumer.platform.requiredRange, bridgeMaxBytes: 500000, autoFooter: false };
  (0, eval)(code);
  const studioSession = globalThis.GHRAB_PLATFORM.session;
  const first = studioSession.end({ reason: 'synthetic-studio-end', clearApplicationData: true });
  const persisted = localStorage.getItem('ghrab.platform.suite-session-generation.v1');

  document.documentElement.dataset = { ghrabAppId: 'synthetic-child', ghrabAppVersion: '1.0.0' };
  globalThis.GHRAB_PLATFORM_CONFIG = { appId: 'synthetic-child', appVersion: '1.0.0', requiredPlatformRange: consumer.platform.requiredRange, bridgeMaxBytes: 500000, autoFooter: false };
  (0, eval)(code);
  const childSession = globalThis.GHRAB_PLATFORM.session;
  let calls = 0;
  childSession.onEnd((detail) => { calls += 1; return { ok: Boolean(detail.generation) }; });
  await new Promise((resolve) => setTimeout(resolve, 0));
  const firstSeen = localStorage.getItem('ghrab.synthetic-child.suite-session-seen.v1');

  const second = studioSession.end({ reason: 'synthetic-second-end', clearApplicationData: true });
  for (const callback of listeners.get('storage') || []) callback({ key: 'ghrab.platform.suite-session-generation.v1', oldValue: persisted, newValue: second.generation });
  await new Promise((resolve) => setTimeout(resolve, 0));
  const secondSeen = localStorage.getItem('ghrab.synthetic-child.suite-session-seen.v1');
  return { pass: first.ok === true && Boolean(persisted) && firstSeen === persisted && second.ok === true && second.generation !== persisted && secondSeen === second.generation && calls >= 2 && childSession.pending() === false, calls, firstGeneration: persisted, secondGeneration: second.generation, firstSeen, secondSeen };
}

async function casePlatformVersionAndDiagnostics() {
  const active = fs.readFileSync(path.join(root, 'src/platform/ghrab-platform.js'), 'utf8');
  const consumer = JSON.parse(fs.readFileSync(path.join(root, 'ghrab-platform.consumer.json'), 'utf8'));
  const vendorPath = path.join(root, `vendor/ghrab-platform-${consumer.platform.version}/ghrab-platform.js`);
  const vendor = fs.readFileSync(vendorPath, 'utf8');
  const guard = fs.readFileSync(path.join(root, 'src/access/app-guard.js'), 'utf8');
  const quality = fs.readFileSync(path.join(root, 'scripts/qa-p3-quality.mjs'), 'utf8');
  const browser = fs.readFileSync(path.join(root, 'scripts/qa-p3-browser.mjs'), 'utf8');
  const build = fs.readFileSync(path.join(root, 'scripts/build.mjs'), 'utf8');
  const p5 = fs.readFileSync(path.join(root, 'scripts/qa-p5-release.mjs'), 'utf8');
  const activeHash = (await import('node:crypto')).createHash('sha256').update(active).digest('hex');
  const vendorHash = (await import('node:crypto')).createHash('sha256').update(vendor).digest('hex');
  const built = fs.existsSync(path.join(root, 'dist/build-info.json')) ? JSON.parse(fs.readFileSync(path.join(root, 'dist/build-info.json'), 'utf8')) : null;
  const platformBuilt = fs.existsSync(path.join(root, 'dist/platform-build-info.json')) ? JSON.parse(fs.readFileSync(path.join(root, 'dist/platform-build-info.json'), 'utf8')) : null;
  const schoolBuilt = fs.existsSync(path.join(root, 'dist-school-server/build-info.json')) ? JSON.parse(fs.readFileSync(path.join(root, 'dist-school-server/build-info.json'), 'utf8')) : null;
  const sourceOk = active.includes(`const PLATFORM_VERSION = '${consumer.platform.version}'`) && activeHash === vendorHash && consumer.platform.requiredRange.startsWith(`>=${consumer.platform.version}`) && guard.includes('safeGatePageUrl()');
  const releaseSurfaceOk = quality.includes("platformBuildInfo?.platformVersion === consumer.platform?.version") && !quality.includes("=== '1.1.0'") && browser.includes('p.version === expectedPlatformVersion') && browser.includes('consumer.platform.version') && !browser.includes("p.version === '1.1.0'") && build.includes('version: consumer.platform.version') && !build.includes('version: "1.1.0"') && p5.includes('`ghrab-platform-${vendorVersion}`') && !p5.includes("'ghrab-platform-1.1.0'");
  const builtOk = (!built || (built.version === APP_VERSION && built.platform?.version === consumer.platform.version)) && (!platformBuilt || platformBuilt.platformVersion === consumer.platform.version) && (!schoolBuilt || schoolBuilt.platform?.version === consumer.platform.version);
  return { pass: sourceOk && releaseSurfaceOk && builtOk, activeHash, vendorHash, requiredRange: consumer.platform.requiredRange, sourceOk, releaseSurfaceOk, builtOk, builtPlatform: built?.platform?.version || null };
}

const cases = {
  'server-missing-apps': caseServerMissingApps,
  'server-explicit-apps-expiry': caseServerExplicitAppsAndExpiry,
  'deletion-end-work': caseDeletionAndEndWork,
  'personal-end-work-preserves-content': casePersonalEndWorkPreservesContent,
  'owned-unmapped-deletion-fails-closed': caseOwnedUnmappedDeletionFailsClosed,
  'delete-rotates-generation': caseDeleteRotatesGeneration,
  'suite-tombstone-reserved': caseSuiteTombstoneReserved,
  'delete-manifest-unavailable': caseDeleteManifestUnavailable,
  'platform-telemetry': casePlatformTelemetry,
  'pilot-event-workflow-privacy': casePilotEventSanitizerAndWorkflow,
  'handoff-collision-fail-closed': caseHandoffCollisionFailClosed,
  'save-to-studio-collision': caseSaveToStudioCollision,
  'storage-manifest-source-coverage': caseStorageManifestSourceCoverage,
  'storage-migration-v2': caseStorageMigrationV2,
  'malicious-import-bounds': caseMaliciousImportBounds,
  'safe-pilot-export-canary': caseSafePilotExportCanary,
  'ai-surface-non-applicable': caseAiSurfaceNonApplicable,
  'suite-session-protocol': caseSuiteSessionProtocol,
  'platform-version-diagnostics': casePlatformVersionAndDiagnostics,
};

if (requested) {
  const fn = cases[requested];
  if (!fn) { console.error(`Unknown case: ${requested}`); process.exit(2); }
  try {
    const result = await fn();
    console.log(JSON.stringify({ case: requested, ...result }));
    process.exit(result.pass ? 0 : 1);
  } catch (error) {
    console.error(JSON.stringify({ case: requested, pass: false, error: String(error?.stack || error) }));
    process.exit(1);
  }
}

let failed = 0;
for (const name of Object.keys(cases)) {
  const run = spawnSync(process.execPath, [scriptPath, `--case=${name}`], { cwd: root, encoding: 'utf8', env: { ...process.env, GHRAB_GARP_SYNTHETIC_ONLY: '1' } });
  const stdout = String(run.stdout || '').trim();
  const stderr = String(run.stderr || '').trim();
  let parsed = null;
  try { parsed = JSON.parse(stdout.split(/\r?\n/u).filter(Boolean).at(-1) || '{}'); } catch { /* handled below */ }
  const pass = run.status === 0 && parsed?.pass === true;
  if (!pass) failed += 1;
  console.log(`${pass ? 'PASS' : 'FAIL'} GARP regression: ${name}${parsed?.reason ? ` (${parsed.reason})` : ''}`);
  if (!pass) {
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
  }
}
if (failed) {
  console.error(`GARP security regressions: ${failed} failed.`);
  process.exit(1);
}
console.log(`GARP security regressions: ${Object.keys(cases).length}/${Object.keys(cases).length} PASS (synthetic data only).`);
