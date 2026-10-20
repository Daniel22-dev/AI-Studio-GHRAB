/** Exact MASTER byte boundary. No generic minifier/platform injector may rewrite this library. */
import { readFile, readdir, lstat } from 'node:fs/promises';
import path from 'node:path';
import { createHash, webcrypto } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { expectedClbStudioTree, readClbTree, CLB_STUDIO_TRANSFORMED } from './clb-studio-adapter.mjs';
const sha = b => createHash('sha256').update(b).digest('hex');
const need = (value, message) => { if (!value) throw Error('CLB_INTEGRITY_' + message); };
const PUBLIC_INVENTORY_SHA = '8d1468774044361a8217af2237eb44804bf07d440c6aac459970289cdfc9e6c8';
const teacherPins = {
  'index.html': 'e8a7eb32d22a25ab3f895b4e81697ec8a27083016a5be071f820238a0ac0cb09',
  '404.html': '67ee8a659679a689afc5f9335b711d3292c093e4016077c8f29b163ba4bedcc7',
  'teacher-entry.js': 'e939c09674ab33869cdaa9f2f155a5b538c188c7a33c31bbc114a296cab27ade'
};
const publicOnly = new Set(['_headers', 'robots.txt', 'assets/public-entry.js']);
export async function verifyClbMasterFiles(root, treeRoot) {
  if (path.resolve(treeRoot) !== path.resolve(root, 'src')) {
    const sourceProof = await verifyClbMasterFiles(root, path.join(root, 'src'));
    const pkg = JSON.parse(await readFile(path.join(root, 'package.json')));
    const expected = await expectedClbStudioTree(root, pkg.version);
    const actual = await readClbTree(path.join(treeRoot, 'conversation-lab'));
    need(actual.size === expected.size, 'DEPLOYED_FILE_SET');
    for (const [name, bytes] of expected) need(actual.get(name)?.equals(bytes), 'DEPLOYED_ENVELOPE_OR_PAYLOAD_' + name);
    const sw = await readFile(path.join(treeRoot, 'sw.js'), 'utf8').catch(() => '');
    const blocks = [...sw.matchAll(/const CORE_(?:REQUIRED|OPTIONAL)\s*=\s*\[([\s\S]*?)\]/g)].map(m => m[1]).join('');
    need(!/\.\/conversation-lab\//.test(blocks), 'LIBRARY_MUST_NOT_PRECACHE');
    return { ...sourceProof, preservedPublicFiles: 114, originalSourcePublicFiles: 115,
      deploymentAdapter: 'ghrab-clb-studio-csp-envelope-v1', transformedFiles: [...CLB_STUDIO_TRANSFORMED], studioVersion: pkg.version };
  }
  const teacherRoot = path.join(treeRoot, 'conversation-lab');
  const inventoryRaw = await readFile(path.join(root, 'config/clb-master-public-inventory.json'));
  need(sha(inventoryRaw) === PUBLIC_INVENTORY_SHA, 'PUBLIC_INVENTORY_PIN');
  const publicInventory = JSON.parse(inventoryRaw);
  const { default: profile } = await import(pathToFileURL(path.join(root, 'src/conversation-lab/release-profile.js')));
  const { verifyClbMasterOwnerContentReceipt } = await import(pathToFileURL(path.join(root, 'src/integration/conversation-lab/teacher-launch.js')));
  const receipt = JSON.parse(await readFile(path.join(root, 'src/integration/conversation-lab/owner-content-release.v0.11.0.signed.json')));
  await verifyClbMasterOwnerContentReceipt(receipt, profile, { cryptoImpl: webcrypto });
  const actual = new Map();
  async function walk(dir, prefix = '') {
    for (const ent of await readdir(dir, { withFileTypes: true })) {
      need(!ent.isSymbolicLink(), 'SYMLINK');
      const rel = prefix + ent.name;
      if (ent.isDirectory()) await walk(path.join(dir, ent.name), rel + '/');
      else { need(ent.isFile(), 'NON_FILE'); actual.set(rel, await readFile(path.join(dir, ent.name))); }
    }
  }
  await walk(teacherRoot);
  const expectedNames = new Set(Object.keys(publicInventory.files).filter(n => !publicOnly.has(n)));
  expectedNames.add('teacher-entry.js'); expectedNames.add('release-profile.js'); expectedNames.add('teacher-integrity.json');
  need(actual.size === 120 && expectedNames.size === 120 && [...actual.keys()].every(n => expectedNames.has(n)), 'FILE_SET');
  const teacherInventory = JSON.parse(actual.get('teacher-integrity.json'));
  need(teacherInventory.publicZipSha256 === profile.publicStaticZipSha256 && teacherInventory.version === '0.11.0' &&
    teacherInventory.releaseId === profile.releaseId && teacherInventory.signedReleaseStatementSha256 === receipt.statementSha256 &&
    Object.keys(teacherInventory.files).length === 119, 'TEACHER_INVENTORY_SCOPE');
  for (const [name, bytes] of actual) {
    if (name === 'teacher-integrity.json') continue;
    const record = teacherInventory.files[name];
    need(record && sha(bytes) === record.sha256 && bytes.length === record.size, 'INVENTORY_DIGEST_' + name);
    if (teacherPins[name]) need(sha(bytes) === teacherPins[name], 'TEACHER_PIN_' + name);
    else if (name === 'release-profile.js') need(bytes.equals(await readFile(path.join(root, 'src/conversation-lab/release-profile.js'))), 'PROFILE_BYTE_PARITY');
    else need(publicInventory.files[name]?.sha256 === sha(bytes) && publicInventory.files[name]?.size === bytes.length, 'SIGNED_SOURCE_BYTE_' + name);
  }
  const catalog = JSON.parse(actual.get('data/catalog.json'));
  need(catalog.entries.length === 72, 'CATALOG_COUNT');
  need(sha(actual.get('assets/app.js')) === profile.publicAppJsSha256, 'LOADER_SRI');
  const sw = await readFile(path.join(treeRoot, 'sw.js'), 'utf8').catch(() => '');
  const core = sw.match(/const CORE_REQUIRED\s*=\s*\[([\s\S]*?)\]/)?.[1] || '';
  const optional = sw.match(/const CORE_OPTIONAL\s*=\s*\[([\s\S]*?)\]/)?.[1] || '';
  need(!/\.\/conversation-lab\//.test(core + optional), 'LIBRARY_MUST_NOT_PRECACHE');
  return { status: 'PASS', files: actual.size, variants: 72, preservedPublicFiles: 115, sourceInventorySha256: PUBLIC_INVENTORY_SHA };
}
