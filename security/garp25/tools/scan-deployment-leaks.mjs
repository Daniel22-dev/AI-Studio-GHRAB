#!/usr/bin/env node
import { readdir, lstat, readFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { isPrivateKeyRule, scanSecretBuffer } from './secret-scan-common.mjs';

const root = path.resolve(process.argv[2] || 'dist');
const projectRoot = path.dirname(root);
const exceptionPath = path.join(projectRoot, 'security', 'garp25', 'source-secret-exceptions.json');
let exceptionEntries = [];
if (existsSync(exceptionPath)) {
  const parsed = JSON.parse(readFileSync(exceptionPath, 'utf8'));
  if (parsed?.schema !== 'ghrab-source-secret-exceptions-v1' || !Array.isArray(parsed.entries)) throw new Error('Invalid source-secret exception schema');
  exceptionEntries = parsed.entries;
}
function gitBlobSha(buffer) {
  return createHash('sha1').update(Buffer.from(`blob ${buffer.length}\0`, 'utf8')).update(buffer).digest('hex');
}
function reviewedSourceException(rel, rules) {
  if (!rules?.length || rules.some((id) => isPrivateKeyRule(id))) return null;
  const sourcePath = `src/${String(rel).replaceAll('\\\\','/')}`;
  const abs = path.join(projectRoot, sourcePath);
  if (!existsSync(abs)) return null;
  const sha = gitBlobSha(readFileSync(abs));
  const matching = exceptionEntries.filter((e) => e.sourcePath === sourcePath && e.sourceGitBlobSha === sha);
  const allowed = new Set(matching.flatMap((e) => e.allowedRules || []));
  if (!rules.every((id) => allowed.has(id))) return null;
  return { sourcePath, sourceGitBlobSha: sha, rules, rationale: matching.map((e) => e.rationale).filter(Boolean) };
}
const forbiddenDirs = new Set([
  '.git', '.github', '.svn', '.hg', '.vscode', '.idea', 'test', 'tests', '__tests__',
  'test-results', 'coverage', 'audit-evidence', 'PROMPTY', 'node_modules', '.claude'
]);
const forbiddenNames = new Set([
  'SHA256SUMS.private', 'private-key.pem', 'id_rsa', 'id_ed25519', '.npmrc', '.netrc', '.DS_Store'
]);
const forbiddenExt = new Set(['.map', '.pem', '.key', '.p12', '.pfx', '.p8', '.jks', '.keystore', '.kdb', '.ppk', '.asc', '.gpg', '.der', '.bak', '.orig']);
const errors = [];
const info = [];
const acceptedExceptions = [];

async function scanFile(abs, rel) {
  const result = scanSecretBuffer(await readFile(abs), rel);
  const exception = reviewedSourceException(rel, result.hits);
  if (result.hits.length && exception) acceptedExceptions.push({ path: rel, ...exception });
  else for (const label of result.hits) errors.push(`secret-pattern:${rel}:${label}`);
  if (result.binary && result.hits.length === 0) info.push(`binary-no-private-key-detected:${rel}`);
}
async function walk(dir, base = '') {
  for (const name of (await readdir(dir)).sort()) {
    const abs = path.join(dir, name), rel = path.posix.join(base, name);
    const st = await lstat(abs);
    if (st.isSymbolicLink()) { errors.push(`symlink:${rel}`); continue; }
    if (st.isDirectory()) {
      if (forbiddenDirs.has(name)) errors.push(`forbidden-dir:${rel}`);
      else await walk(abs, rel);
      continue;
    }
    if (!st.isFile()) { errors.push(`irregular-file:${rel}`); continue; }
    if (forbiddenNames.has(name)) errors.push(`forbidden-name:${rel}`);
    if (name === '.env' || name.startsWith('.env.')) errors.push(`forbidden-env-file:${rel}`);
    if (forbiddenExt.has(path.extname(name).toLowerCase())) errors.push(`forbidden-ext:${rel}`);
    await scanFile(abs, rel);
  }
}
await walk(root);
const hard = [...new Set(errors)];
if (hard.length) { console.error(JSON.stringify({ status: 'FAIL', errors: hard, acceptedExceptions, info: [...new Set(info)] }, null, 2)); process.exit(1); }
console.log(JSON.stringify({ status: 'PASS', root, acceptedExceptions, info: [...new Set(info)] }, null, 2));
