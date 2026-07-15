const CACHE = "ai-studio-ghrab-v__APP_VERSION__";
const CORE = [/*__CORE_ASSETS__*/];

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
    if (response.ok) {
      const cache = await caches.open(CACHE);
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    return (await caches.match(request)) || Response.error();
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE);
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    if (request.mode === "navigate")
      return (await caches.match("./index.html")) || Response.error();
    return Response.error();
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(CORE)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)),
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
