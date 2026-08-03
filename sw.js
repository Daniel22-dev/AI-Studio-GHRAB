const CACHE = "ai-studio-ghrab-v0.20.1";
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
  "./access/access-control.js",
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
  "./assets/brand/icon-32.png"
];
const CORE_OPTIONAL = [
  "./access/access-gate.css",
  "./access/access.js",
  "./access/app-guard.js",
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
  "./assets/brand/school-logo.jpg",
  "./automation/automation.js",
  "./automation/index.html",
  "./bridge/studio-bridge.js",
  "./build-info.json",
  "./changelog/changelog.js",
  "./changelog/index.html",
  "./config/ai-core-consumers.json",
  "./config/ai-readiness-baseline.json",
  "./config/changelog.json",
  "./config/permissions.json",
  "./config/sources.json",
  "./config/support.json",
  "./demo/demo.js",
  "./demo/index.html",
  "./library/catalog.json",
  "./library/index.html",
  "./library/library.js",
  "./library/materials/czech-syntax.ghrab.json",
  "./library/materials/past-simple.ghrab.json",
  "./library/materials/school-email.ghrab.json",
  "./library/materials/spanish-travel.ghrab.json",
  "./manualy/access-management.html",
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
  "./manualy/support-link.js",
  "./manualy/viewer.css",
  "./manualy/viewer.html",
  "./manualy/viewer.js",
  "./pilot/index.html",
  "./pilot/pilot.js",
  "./report/index.html",
  "./report/report.js",
  "./safety/index.html",
  "./safety/safety.js",
  "./workflow/index.html",
  "./workflow/workflow.js"
];

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
