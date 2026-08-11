const GHRAB_SW_CONTRACT='ghrab-service-worker-v1';
/* GHRAB service-worker contract v1 · update activation is user-controlled. */
const APP_VERSION = "__APP_VERSION__";
const CACHE = "ghrab-ai-studio-v__APP_VERSION__";
const CACHE_PREFIXES = ["ghrab-ai-studio-v", "ai-studio-ghrab-v"];
const CORE_REQUIRED = [/*__CORE_REQUIRED__*/
];
const CORE_OPTIONAL = [/*__CORE_OPTIONAL__*/

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
