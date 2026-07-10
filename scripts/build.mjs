import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const src = path.join(root, 'src');
const dist = path.join(root, 'dist');
const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await cp(src, dist, { recursive: true });

async function walk(dir){
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(full));
    else files.push(full);
  }
  return files;
}

for (const file of await walk(dist)) {
  if (!/\.(?:html|js|json|webmanifest|css|md)$/.test(file)) continue;
  const content = await readFile(file, 'utf8');
  if (content.includes('__APP_VERSION__')) {
    await writeFile(file, content.replaceAll('__APP_VERSION__', pkg.version), 'utf8');
  }
}

const syncReport = JSON.parse(await readFile(path.join(src, 'config', 'sync-report.json'), 'utf8'));
const apps = JSON.parse(await readFile(path.join(src, 'config', 'apps.generated.json'), 'utf8'));
await writeFile(
  path.join(dist, 'build-info.json'),
  JSON.stringify({
    version: pkg.version,
    builtAt: new Date().toISOString(),
    syncMode: syncReport.mode,
    apps: apps.map(app => ({ id: app.id, version: app.version }))
  }, null, 2) + '\n',
  'utf8'
);

console.log(`AI Studio GHRAB ${pkg.version} built to dist/`);
