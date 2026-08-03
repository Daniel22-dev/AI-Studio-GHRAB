const CACHE = "ai-studio-ghrab-v__APP_VERSION__";
const CORE_REQUIRED = [/*__CORE_REQUIRED__*/];
const CORE_OPTIONAL = [/*__CORE_OPTIONAL__*/];

function isConfigurationRequest(request) {
  const url = new URL(request.url);
  return (
    url.pathname.includes("/config/") ||
    url.pathname.endsWith("/build-info.json")
  );
}

async function networkFirst(request) {
  try {
    const response = await fetch(request, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const cache = await caches.open(CACHE);
    await cache.put(request, response.clone());
    return response;
  } catch {
    return (await caches.match(request, { ignoreSearch: true })) || Response.error();
  }
}

async function cachedNavigation(request) {
  const direct = await caches.match(request, { ignoreSearch: true });
  if (direct) return direct;
  const url = new URL(request.url);
  if (url.pathname.endsWith("/")) {
    const indexUrl = new URL("index.html", url);
    const directoryIndex = await caches.match(indexUrl, { ignoreSearch: true });
    if (directoryIndex) return directoryIndex;
  }
  return null;
}

async function cacheFirst(request) {
  const cached =
    request.mode === "navigate"
      ? await cachedNavigation(request)
      : await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE);
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    if (request.mode === "navigate") {
      return (
        (await cachedNavigation(request)) ||
        (await caches.match("./index.html")) ||
        Response.error()
      );
    }
    return Response.error();
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll(CORE_REQUIRED);
      await Promise.allSettled(
        CORE_OPTIONAL.map((asset) => cache.add(asset)),
      );
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) => key.startsWith("ai-studio-ghrab-v") && key !== CACHE,
            )
            .map((key) => caches.delete(key)),
        ),
      ),
  );
});

self.addEventListener("fetch", (event) => {
  if (
    event.request.method !== "GET" ||
    new URL(event.request.url).origin !== self.location.origin
  )
    return;
  event.respondWith(
    isConfigurationRequest(event.request)
      ? networkFirst(event.request)
      : cacheFirst(event.request),
  );
});
