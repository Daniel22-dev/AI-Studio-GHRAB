const CACHE = 'ai-studio-ghrab-v0.8.0';
const CORE = [
  './','./index.html','./styles.css','./polish.css','./app.js','./manifest.webmanifest',
  './config/apps.generated.json','./config/apps.fallback.json','./config/sources.json','./config/sync-report.json','./config/permissions.json','./config/changelog.json','./config/access-policy.json','./config/access-public-key.json','./config/revoked-access.json',
  './assets/brand/brand-mark.svg','./assets/brand/portal-core.svg','./assets/brand/portal-gateway.png','./assets/brand/icon-32.png','./assets/brand/icon-48.png','./assets/brand/icon-72.png','./assets/brand/icon-96.png','./assets/brand/icon-128.png','./assets/brand/icon-192.png','./assets/brand/icon-512.png','./assets/brand/icon-maskable-512.png','./assets/brand/apple-touch-icon.png',
  './assets/apps/generator.png','./assets/apps/differentiator.png','./assets/apps/essay-evaluator-v2.png','./assets/apps/ludus.png','./assets/apps/correspondence.png',
  './shared/safe-export.js','./shared/material-validator.js','./access/index.html','./access/access.js','./access/access-control.js','./access/app-guard.js','./access/access-gate.css',
  './automation/index.html','./automation/automation.js','./workflow/index.html','./workflow/workflow.js','./report/index.html','./report/report.js','./bridge/studio-bridge.js','./demo/index.html','./demo/demo.js','./library/index.html','./library/library.js','./library/catalog.json','./manualy/index.html','./manualy/manualy.js','./manualy/manualy.css','./manualy/viewer.html','./manualy/viewer.js','./manualy/viewer.css',
  './library/materials/past-simple.ghrab.json','./library/materials/spanish-travel.ghrab.json','./library/materials/czech-syntax.ghrab.json','./library/materials/school-email.ghrab.json',
  './safety/index.html','./safety/safety.js','./pilot/index.html','./pilot/pilot.js','./changelog/index.html','./changelog/changelog.js','./tests/index.html','./tests/tests.js','./tools/access-issuer/index.html','./tools/access-issuer/issuer.js',
  './integration/README.md','./integration/VERIFY-INTEGRATION.md','./integration/app-guard-snippet.html','./integration/protected-bootstrap.example.js','./integration/generator-access-bootstrap.example.js','./integration/differentiator-access-bootstrap.example.js','./integration/essay-evaluator-access-bootstrap.example.js','./integration/ludus-access-bootstrap.example.js','./integration/correspondence-access-bootstrap.example.js',
  './schemas/ghrab-material-v1.schema.json','./schemas/ghrab-handoff-v1.schema.json','./schemas/ludus-content-v2.schema.json'
];
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(fetch(event.request).then(response => {
    if (response.ok) { const copy = response.clone(); caches.open(CACHE).then(cache => cache.put(event.request, copy)); }
    return response;
  }).catch(() => caches.match(event.request).then(hit => hit || (event.request.mode === 'navigate' ? caches.match('./index.html') : Response.error()))));
});
