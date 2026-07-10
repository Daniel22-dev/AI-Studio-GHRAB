import { execFileSync } from 'node:child_process';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { safeExportSelfTest } from '../src/shared/safe-export.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const src = path.join(root, 'src');
const dist = path.join(root, 'dist');
const errors = [];
const fail = message => errors.push(message);
const loadJson = async file => {
  try { return JSON.parse(await readFile(file, 'utf8')); }
  catch (error) { fail(`Neplatný JSON ${path.relative(root, file)}: ${error.message}`); return null; }
};
const walk = async dir => {
  const entries = await readdir(dir, { withFileTypes: true });
  const result = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...await walk(full)); else result.push(full);
  }
  return result;
};

const pkg = await loadJson(path.join(root, 'package.json'));
const apps = await loadJson(path.join(src, 'config/apps.generated.json'));
const fallback = await loadJson(path.join(src, 'config/apps.fallback.json'));
const sources = await loadJson(path.join(src, 'config/sources.json'));
const syncReport = await loadJson(path.join(src, 'config/sync-report.json'));
const catalog = await loadJson(path.join(src, 'library/catalog.json'));
const schema = await loadJson(path.join(src, 'schemas/ghrab-material-v1.schema.json'));
const handoffSchema = await loadJson(path.join(src, 'schemas/ghrab-handoff-v1.schema.json'));
const ludusSchema = await loadJson(path.join(src, 'schemas/ludus-content-v2.schema.json'));
const manifest = await loadJson(path.join(src, 'manifest.webmanifest'));
const permissions = await loadJson(path.join(src, 'config/permissions.json'));
const changes = await loadJson(path.join(src, 'config/changelog.json'));

for (const [label, list] of [['generated registry', apps], ['fallback registry', fallback]]) {
  if (!Array.isArray(list) || list.length < 4) fail(`${label} musí obsahovat alespoň čtyři aplikace.`);
  if (!Array.isArray(list)) continue;
  const ids = new Set();
  for (const app of list) {
    if (app.schema !== 'ai-studio-app-manifest-v1') fail(`${label}: ${app.id || '?'} má neplatné schema.`);
    if (!app.id || ids.has(app.id)) fail(`${label}: neplatné nebo duplicitní id ${app.id}`);
    ids.add(app.id);
    if (!/^https:\/\//.test(app.launchUrl || '')) fail(`${app.id} nemá HTTPS launchUrl.`);
    if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(app.version || '')) fail(`${app.id} nemá SemVer verzi.`);
    if (!app.name?.cs || !app.name?.en || !app.description?.cs || !app.description?.en) fail(`${app.id} nemá úplný překlad.`);
    const statusText = `${app.status?.cs || ''} ${app.status?.en || ''}`.toLowerCase();
    if (/produk|production/.test(statusText)) fail(`${app.id}: status nesmí deklarovat produkční provoz před schválením školy.`);
    if (!/^#[0-9a-f]{6}$/i.test(app.accent || '')) fail(`${app.id} nemá platný accent.`);
    try { await stat(path.join(src, app.icon)); } catch { fail(`Chybí ikona ${app.id}: ${app.icon}`); }
  }
}
if (!Array.isArray(sources) || sources.length < 4) fail('sources.json musí obsahovat alespoň čtyři zdroje.');
if (syncReport?.schema !== 'ai-studio-sync-report-v1') fail('sync-report.json má neplatné schema.');
if (!Array.isArray(syncReport?.sources) || syncReport.sources.length !== sources?.length) fail('Sync report neodpovídá seznamu zdrojů.');

if (permissions?.schema !== 'ai-studio-permissions-v1') fail('permissions.json má neplatné schema.');
if (!permissions?.apps || Object.keys(permissions.apps).length < 4) fail('permissions.json musí obsahovat oprávnění pro aplikace.');
if (Array.isArray(apps)) {
  for (const app of apps) if (!permissions?.apps?.[app.id]) fail(`permissions.json neobsahuje aplikaci ${app.id}.`);
}
if (changes?.schema !== 'ai-studio-changelog-v1') fail('changelog.json má neplatné schema.');
if (!Array.isArray(changes?.items) || !changes.items.some(item => item.version === pkg?.version)) fail('Changelog musí obsahovat aktuální verzi.');

if (!Array.isArray(catalog?.items) || catalog.items.length < 4) fail('Knihovna musí obsahovat alespoň čtyři ukázkové položky.');
if (catalog?.items) {
  for (const item of catalog.items) {
    const file = path.join(src, item.download);
    const sample = await loadJson(file);
    if (sample?.schema !== 'ghrab-material-v1') fail(`${item.id}: nesprávné schema ukázky.`);
    if (!sample?.id || !sample?.title || !sample?.subject) fail(`${item.id}: chybí povinná pole.`);
  }
}
if (schema?.$id !== 'https://ghrabuvka.cz/schemas/ghrab-material-v1.schema.json') fail('Výměnné schema má neočekávané $id.');
if (handoffSchema?.$id !== 'https://ghrabuvka.cz/schemas/ghrab-handoff-v1.schema.json') fail('Handoff schema má neočekávané $id.');
if (ludusSchema?.$id !== 'https://ghrabuvka.cz/schemas/ludus-content-v2.schema.json') fail('LUDUS schema má neočekávané $id.');
if (![pkg?.version, '__APP_VERSION__'].includes(manifest?.version)) fail('Verze PWA manifestu se neshoduje s package.json.');

const sourceFiles = await walk(src);
const secretPatterns = [/AIza[0-9A-Za-z_-]{20,}/g,/sk-[0-9A-Za-z_-]{20,}/g,/github_pat_[0-9A-Za-z_]{20,}/g,/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g];
for (const file of sourceFiles.filter(f => /\.(html|js|json|md|css|yml|yaml)$/.test(f))) {
  const text = await readFile(file, 'utf8');
  for (const pattern of secretPatterns) { pattern.lastIndex = 0; if (pattern.test(text)) fail(`Možné tajemství v ${path.relative(root, file)}`); }
  if (/\sstyle=["']/i.test(text) && file.endsWith('.html')) fail(`Inline style není povolen CSP: ${path.relative(root, file)}`);
}
for (const file of sourceFiles.filter(f => f.endsWith('.js'))) {
  try { execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' }); }
  catch (error) { fail(`Chyba syntaxe JS v ${path.relative(root, file)}: ${error.stderr?.toString() || error.message}`); }
}
for (const file of sourceFiles.filter(f => f.endsWith('.html'))) {
  const html = await readFile(file, 'utf8');
  const ids = [...html.matchAll(/\sid=["']([^"']+)["']/g)].map(m => m[1]);
  const seen = new Set();
  for (const id of ids) { if (seen.has(id)) fail(`Duplicitní id ${id} v ${path.relative(root, file)}`); seen.add(id); }
  if (!html.includes('Autor a vývojový garant: Daniel Baláž')) fail(`Chybí sjednocené zápatí v ${path.relative(root, file)}`);
  if (!html.includes('changelog/') || !html.includes('tests/')) fail(`Chybí odkazy na changelog nebo kontrolu Studia v ${path.relative(root, file)}`);
  if (!html.includes('Content-Security-Policy')) fail(`Chybí CSP v ${path.relative(root, file)}`);
  if (!html.includes('name="viewport"') && !html.includes("name='viewport'")) fail(`Chybí viewport v ${path.relative(root, file)}`);
}
if (!safeExportSelfTest()) fail('Funkční test bezpečného exportu selhal: citlivá testovací data pronikla do exportu.');
const directStorageWriters = sourceFiles.filter(file => file.endsWith('.js') && !file.endsWith(path.join('src','app.js')) && !file.endsWith(path.join('src','bridge','studio-bridge.js')) && !file.endsWith(path.join('src','tests','tests.js')));
for (const file of directStorageWriters) {
  const text = await readFile(file, 'utf8');
  if (text.includes('localStorage.setItem(')) fail(`Přímý zápis do localStorage mimo bezpečný helper: ${path.relative(root, file)}`);
}


try { execFileSync(process.execPath, [path.join(root, 'scripts/build.mjs')], { stdio: 'inherit' }); }
catch { fail('Build selhal.'); }
const distFiles = await walk(dist);
const required = [
  'index.html','styles.css','app.js','manifest.webmanifest','sw.js','build-info.json',
  'automation/index.html','automation/automation.js','workflow/index.html','workflow/workflow.js','report/index.html','report/report.js','bridge/studio-bridge.js','safety/index.html','demo/index.html','library/index.html','pilot/index.html','changelog/index.html','changelog/changelog.js','tests/index.html','tests/tests.js',
  'config/apps.generated.json','config/apps.fallback.json','config/sources.json','config/sync-report.json','config/permissions.json','config/changelog.json',
  'assets/brand/portal-core.svg','library/catalog.json','shared/safe-export.js','schemas/ghrab-material-v1.schema.json','schemas/ghrab-handoff-v1.schema.json','schemas/ludus-content-v2.schema.json'
];
for (const relative of required) if (!distFiles.includes(path.join(dist, relative))) fail(`Build neobsahuje ${relative}`);
const builtSw = await readFile(path.join(dist, 'sw.js'), 'utf8');
const coreBlock = builtSw.match(/const CORE = \[([\s\S]*?)\];/)?.[1] || '';
const precacheItems = [...coreBlock.matchAll(/['"](\.\/[^'"]+)['"]/g)].map(match => match[1].replace(/^\.\//, '').replace(/\/$/, 'index.html'));
if (!precacheItems.length) fail('Service worker neobsahuje čitelný seznam CORE precache.');
for (const relative of precacheItems) {
  if (!distFiles.includes(path.join(dist, relative))) fail(`PWA precache odkazuje na chybějící soubor ${relative}`);
}
for (const file of distFiles.filter(f => /\.(?:html|js|json|webmanifest|css|md)$/.test(f))) {
  const text = await readFile(file, 'utf8');
  if (text.includes('__APP_VERSION__')) fail(`V buildu zůstal token verze: ${path.relative(dist, file)}`);
}
if (errors.length) {
  console.error('\nVALIDACE SELHALA:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log('\nVšechny kontroly AI Studio GHRAB prošly.');
