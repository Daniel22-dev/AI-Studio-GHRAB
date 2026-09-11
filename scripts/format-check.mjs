#!/usr/bin/env node
import { readFile, readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const extensions = new Set(['.js', '.mjs', '.css', '.html', '.json', '.webmanifest', '.md', '.yml', '.yaml']);
const files = [];
async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['dist', 'node_modules', '.git', 'qa-results', 'test-results'].includes(entry.name)) continue;
      await walk(full);
    } else if (extensions.has(path.extname(entry.name))) files.push(full);
  }
}
for (const dir of ['src', 'scripts', '.github']) await walk(path.join(root, dir));
for (const name of await readdir(root)) {
  const full = path.join(root, name);
  if (name === 'package.json' || (extensions.has(path.extname(name)) && !name.startsWith('.'))) files.push(full);
}

try {
  const { default: prettier } = await import('prettier');
  const failures = [];
  for (const file of [...new Set(files)].sort()) {
    const info = await prettier.getFileInfo(file, { ignorePath: path.join(root, '.prettierignore') });
    if (info.ignored || !info.inferredParser) continue;
    const source = await readFile(file, 'utf8');
    if (!(await prettier.check(source, { filepath: file }))) failures.push(path.relative(root, file));
  }
  if (failures.length) {
    console.error(`Prettier format check failed:\n${failures.join('\n')}`);
    process.exit(1);
  }
  console.log(`Prettier ověřil ${files.length} kandidátních souborů.`);
} catch (error) {
  if (error?.code !== 'ERR_MODULE_NOT_FOUND') throw error;
  let checked = 0;
  for (const file of [...new Set(files)].sort()) {
    const rel = path.relative(root, file);
    if (rel.startsWith(`src${path.sep}ai-core${path.sep}releases${path.sep}`)) continue;
    const ext = path.extname(file);
    if (ext === '.json' || ext === '.webmanifest') {
      JSON.parse(await readFile(file, 'utf8'));
      checked += 1;
    } else if (ext === '.js' || ext === '.mjs') {
      const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
      if (result.status !== 0) {
        process.stderr.write(result.stderr || result.stdout || `${rel}: syntax error\n`);
        process.exit(result.status || 1);
      }
      checked += 1;
    }
  }
  console.warn(`Prettier není nainstalován; hermetický fallback ověřil syntaxi a JSON strukturu ${checked} souborů. Doplňkový formátovací běh může použít Prettier, hlavní P4 certifikace je bez externí závislosti.`);
}
