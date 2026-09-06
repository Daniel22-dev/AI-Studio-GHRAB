const GHRAB_SW_CONTRACT='ghrab-service-worker-v1';
/* GHRAB service-worker contract v1 · update activation is user-controlled. */
const APP_VERSION = "0.21.44";
const CACHE = "ghrab-ai-studio-v0.21.44";
const CACHE_PREFIXES = ["ghrab-ai-studio-v", "ai-studio-ghrab-v"];
const CORE_REQUIRED = [
  "./",
  "./index.html",
  "./app.js",
  "./styles.css",
  "./polish.css",
  "./startup-prepaint.js",
  "./manifest.webmanifest",
  "./app/index.html",
  "./app/viewer.js",
  "./app/viewer.css",
  "./app/embed-overrides.css",
  "./access/app-guard.js",
  "./access/access-control.js",
  "./access/deployment-config.js",
  "./access/platform-runtime.js",
  "./access/access-gate.css",
  "./config/deployment-baked.js",
  "./shared/material-validator.js",
  "./shared/safe-export.js",
  "./config/apps.generated.json",
  "./config/apps.fallback.json",
  "./config/access-policy.json",
  "./config/revoked-access.json",
  "./config/access-public-key.json",
  "./config/sync-report.json",
  "./config/ai-core.json",
  "./config/ai-runtime.json",
  "./config/ai-readiness.generated.json",
  "./ai-core/releases/1.0.0/ghrab-ai-core-manifest-1.0.0.json",
  "./ai-core/releases/1.0.0/ghrab-ai-core-1.0.0.js",
  "./assets/brand/brand-mark.svg",
  "./assets/brand/portal-gateway.webp",
  "./assets/brand/icon-32.png",
  "./assets/brand/school-logo.png",
  "./config/brand-manifest.json",
  "./config/platform-manifest.json",
  "./ghrab-platform.consumer.json"
];
const CORE_OPTIONAL = [
  "./access/access.js",
  "./access/error-reporter.css",
  "./access/error-reporter.js",
  "./access/index.html",
  "./assets/apps/activity-builder.png",
  "./assets/apps/correspondence.png",
  "./assets/apps/differentiator.png",
  "./assets/apps/essay-evaluator-v2.png",
  "./assets/apps/generator.png",
  "./assets/apps/lesson-hub.png",
  "./assets/apps/ludus.png",
  "./assets/apps/maturita-desk.png",
  "./assets/apps/sortio.svg",
  "./assets/brand/apple-touch-icon.png",
  "./assets/brand/icon-128.png",
  "./assets/brand/icon-192.png",
  "./assets/brand/icon-48.png",
  "./assets/brand/icon-512.png",
  "./assets/brand/icon-72.png",
  "./assets/brand/icon-96.png",
  "./assets/brand/icon-maskable-512.png",
  "./assets/brand/portal-core.svg",
  "./assets/brand/portal-ring-inner.svg",
  "./assets/brand/portal-ring-middle.svg",
  "./assets/brand/portal-ring-outer.svg",
  "./automation/automation.js",
  "./automation/index.html",
  "./bridge/studio-bridge.js",
  "./build-info.json",
  "./changelog/changelog.js",
  "./changelog/index.html",
  "./config/access-config-verify-key.json",
  "./config/data-manifest.json",
  "./config/permissions.json",
  "./config/platform-consumers.json",
  "./config/presentation.json",
  "./config/release-acceptance.json",
  "./config/security-headers.json",
  "./config/support.json",
  "./demo/demo.js",
  "./demo/index.html",
  "./library/catalog.json",
  "./library/index.html",
  "./library/library.js",
  "./library/material-service.js",
  "./library/materials/czech-syntax.ghrab.json",
  "./library/materials/past-simple.ghrab.json",
  "./library/materials/school-email.ghrab.json",
  "./library/materials/spanish-travel.ghrab.json",
  "./manualy/access-management.html",
  "./manualy/ai-studio-admin.html",
  "./manualy/ai-studio-admin.js",
  "./manualy/ai-studio-teacher.html",
  "./manualy/deputy-admin.html",
  "./manualy/ecosystem-guide.css",
  "./manualy/ecosystem-guide.html",
  "./manualy/error-report.css",
  "./manualy/error-report.html",
  "./manualy/index.html",
  "./manualy/manualy.css",
  "./manualy/manualy.js",
  "./manualy/pilot-report.css",
  "./manualy/pilot-report.html",
  "./manualy/pilot-report.js",
  "./manualy/studio-guide.css",
  "./manualy/support-link.js",
  "./manualy/viewer.css",
  "./manualy/viewer.html",
  "./manualy/viewer.js",
  "./modules/app-test-status.js",
  "./modules/portal-effects.js",
  "./modules/registry-client.js",
  "./pilot/index.html",
  "./pilot/pilot.js",
  "./portal-card-hotfix.css",
  "./privacy/pilot-event.js",
  "./safety/index.html",
  "./safety/safety.js",
  "./workflow/index.html",
  "./workflow/workflow.js"
];

self.addEventListener('message', (event) => {
  if (['GHRAB_SKIP_WAITING', 'SKIP_WAITING'].includes(event.data?.type)) self.skipWaiting();
});

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(CORE_REQUIRED);
    const optionalAssets = CORE_OPTIONAL;
    if (optionalAssets.length) {
      const results = await Promise.allSettled(optionalAssets.map((asset) => cache.add(asset)));
      const failed = results.filter((item) => item.status === 'rejected').length;
      if (failed) console.warn(`[GHRAB SW] ${failed} volitelných assetů nebylo uloženo do offline cache.`);
    }
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter((key) => CACHE_PREFIXES.some((prefix) => key.startsWith(prefix)) && key !== CACHE)
      .map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

async function networkFirst(request, fallbackUrl = '') {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request, { cache: 'no-store' });
    if (!response || !response.ok) throw new Error(`HTTP ${response?.status || 0}`);
    await cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    if (fallbackUrl) {
      const fallback = await cache.match(fallbackUrl, { ignoreSearch: true });
      if (fallback) return fallback;
    }
    throw error;
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const url = new URL(request.url);
  const requestedVersion = url.searchParams.get("v");
  if (requestedVersion && requestedVersion !== APP_VERSION) {
    return fetch(request, { cache: "no-store" });
  }
  const cached = await cache.match(request, {
    ignoreSearch: requestedVersion === APP_VERSION,
  });
  if (cached) return cached;
  const response = await fetch(request);
  if (response?.ok) await cache.put(request, response.clone());
  return response;
}

const RUNTIME_NETWORK_FIRST = Object.freeze([
  'access/app-guard.js',
  'access/access-control.js',
  'access/platform-runtime.js',
]);

function isRuntimeNetworkFirst(url, scopePath) {
  return RUNTIME_NETWORK_FIRST.includes(url.pathname.slice(scopePath.length));
}

function isRuntimeRequest(url, scopePath) {
  const relative = url.pathname.slice(scopePath.length);
  return relative === 'config/deployment.json' ||
    relative === 'config/access-config-bundle.json' ||
    relative === 'config/access-config-bundle.sig.json' ||
    /^(?:api|auth|session|health)(?:\/|$)/.test(relative);
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  // HTML5 video/audio metadata and seeking use byte-range requests. CacheStorage cannot store 206 responses; let the browser handle them directly.
  if (request.headers.has('range')) return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  const scopePath = new URL('./', self.location.href).pathname;
  if (!url.pathname.startsWith(scopePath) || isRuntimeRequest(url, scopePath)) return;
  if (isRuntimeNetworkFirst(url, scopePath)) {
    event.respondWith(networkFirst(request));
    return;
  }
  if (request.mode === 'navigate') {
    const fallback = url.pathname.includes('/manualy/') ? './manualy/index.html' : './index.html';
    event.respondWith(networkFirst(request, fallback));
    return;
  }
  // Static metadata intentionally requested with cache: 'no-store' still needs
  // an application-cache fallback when the browser is offline. Runtime API,
  // auth/session/health and deployment requests remain excluded above.
  if (request.cache === 'no-store') {
    event.respondWith(networkFirst(request));
    return;
  }
  if (url.pathname.endsWith('/manifest.webmanifest') || url.pathname.endsWith('/build-info.json')) {
    event.respondWith(networkFirst(request));
    return;
  }
  event.respondWith(cacheFirst(request));
});

/* GHRAB_PLATFORM_P3_START */
const GHRAB_PLATFORM_P3_ASSETS=["./ghrab/ghrab-platform.js","./ghrab/ghrab-platform.css","./ghrab/ghrab-artifact-envelope-v1.schema.json","./ghrab/ghrab-app-registry-v2.schema.json","./ghrab/ghrab-platform-manifest-1.1.2.json","./assets/brand/school-logo.png","./ghrab-platform.consumer.json"];
self.addEventListener('install',event=>event.waitUntil((async()=>{const cache=await caches.open("ghrab-ai-studio-v0.21.44");const results=await Promise.allSettled(GHRAB_PLATFORM_P3_ASSETS.map(asset=>cache.add(asset)));const failed=results.filter(item=>item.status==='rejected');if(failed.length)throw new Error('GHRAB Platform P3 precache selhal: '+failed.length);})()));
/* GHRAB_PLATFORM_P3_END */
