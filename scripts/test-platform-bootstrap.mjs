import assert from 'node:assert/strict';

class FakeDocument extends EventTarget {
  constructor(loader) {
    super();
    this.loader = loader;
    this.documentElement = { dataset: {} };
  }
  querySelectorAll(selector) {
    return selector === 'script[data-ghrab-protected]' ? [{}] : [];
  }
  querySelector(selector) {
    return selector === 'script[data-ghrab-platform-loader]' ? this.loader : null;
  }
}

const loader = new EventTarget();
globalThis.window = globalThis;
globalThis.document = new FakeDocument(loader);
delete globalThis.GHRAB_PLATFORM;

const { waitForLocalPlatformUnlock } = await import('../src/access/app-guard.js');

const started = Date.now();
const pending = waitForLocalPlatformUnlock({ platformReadyTimeoutMs: 1000 });
setTimeout(() => {
  globalThis.GHRAB_PLATFORM = Object.freeze({
    contract: 'ghrab-platform-v1',
    unlockProtectedScripts() { return 1; },
  });
  document.dispatchEvent(new Event('ghrab:platform-ready'));
}, 80);

const platform = await pending;
assert.equal(typeof platform.unlockProtectedScripts, 'function');
assert.equal(document.documentElement.dataset.ghrabPlatformUnlockWait, 'ready');
assert.ok(Date.now() - started >= 60, 'guard must really wait for delayed platform readiness');

const missingLoaderDocument = new FakeDocument(null);
globalThis.document = missingLoaderDocument;
delete globalThis.GHRAB_PLATFORM;
await assert.rejects(
  waitForLocalPlatformUnlock({ platformReadyTimeoutMs: 500 }),
  /platform loader is missing/i,
);

console.log('platform bootstrap race regression: PASS');

const { readFile } = await import('node:fs/promises');
const swSource = await readFile(new URL('../src/sw.js', import.meta.url), 'utf8');
for (const runtimePath of [
  "access/app-guard.js",
  "access/access-control.js",
  "access/platform-runtime.js",
]) {
  assert.match(swSource, new RegExp(runtimePath.replaceAll('.', '\\.')),
    `${runtimePath} must bypass the Studio static PWA cache`);
}

const viewerSource = await readFile(new URL('../src/app/viewer.js', import.meta.url), 'utf8');
const freshSwCall = viewerSource.indexOf('await ensureCurrentStudioServiceWorker();');
const embedCall = viewerSource.indexOf('setApp(app);', freshSwCall);
assert.ok(freshSwCall >= 0 && embedCall > freshSwCall,
  'workspace must activate the current Studio service worker before embedding the satellite app');
console.log('service-worker transition regression: PASS');
