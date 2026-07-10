import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const configDir = path.join(root, 'src', 'config');
const offline = process.argv.includes('--offline');
const sources = JSON.parse(await readFile(path.join(configDir, 'sources.json'), 'utf8'));
const fallback = JSON.parse(await readFile(path.join(configDir, 'apps.fallback.json'), 'utf8'));
const fallbackById = new Map(fallback.map(app => [app.id, app]));
const required = ['schema','id','name','version','status','description','launchUrl','repository','icon','accent'];
const semver = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;

function validate(app, expectedId){
  if (!app || typeof app !== 'object') throw new Error('manifest není objekt');
  for (const key of required) if (!app[key]) throw new Error(`chybí ${key}`);
  if (app.schema !== 'ai-studio-app-manifest-v1') throw new Error('neznámé schema');
  if (app.id !== expectedId) throw new Error(`id ${app.id} neodpovídá ${expectedId}`);
  if (!semver.test(app.version)) throw new Error(`neplatná verze ${app.version}`);
  if (!/^https:\/\//.test(app.launchUrl)) throw new Error('launchUrl není HTTPS');
  if (!app.name.cs || !app.name.en || !app.description.cs || !app.description.en) throw new Error('chybí překlad');
  const statusText = `${app.status?.cs || ''} ${app.status?.en || ''}`.toLowerCase();
  if (/produk|production/.test(statusText)) throw new Error('status před schválením školy nesmí deklarovat produkční provoz');
  return app;
}

async function fetchManifest(source){
  if (offline) throw new Error('offline režim');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(source.url, { signal: controller.signal, headers: { 'user-agent': 'AI-Studio-GHRAB-registry-sync' } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return validate(await response.json(), source.id);
  } finally { clearTimeout(timer); }
}

const apps = [];
const reportSources = [];
for (const source of sources) {
  try {
    const app = await fetchManifest(source);
    apps.push(app);
    reportSources.push({ id: source.id, url: source.url, ok: true, version: app.version });
  } catch (error) {
    const app = fallbackById.get(source.id);
    if (!app) throw new Error(`Chybí fallback pro ${source.id}: ${error.message}`);
    apps.push(validate(app, source.id));
    reportSources.push({ id: source.id, url: source.url, ok: false, version: app.version, error: error.message });
  }
}

const okCount = reportSources.filter(item => item.ok).length;
const mode = okCount === reportSources.length ? 'live' : okCount === 0 ? 'fallback' : 'mixed';
const report = { schema: 'ai-studio-sync-report-v1', generatedAt: new Date().toISOString(), mode, sources: reportSources };
await writeFile(path.join(configDir, 'apps.generated.json'), JSON.stringify(apps, null, 2) + '\n', 'utf8');
await writeFile(path.join(configDir, 'sync-report.json'), JSON.stringify(report, null, 2) + '\n', 'utf8');
console.log(`Registr: ${apps.length} aplikací, režim ${mode}, ověřeno ${okCount}/${reportSources.length}.`);
