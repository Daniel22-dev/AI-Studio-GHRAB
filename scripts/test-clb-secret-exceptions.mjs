import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash, generateKeyPairSync, randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { scanSecretBuffer, isPrivateKeyRule } from '../security/garp25/tools/secret-scan-common.mjs';

const root = path.resolve('.');
const policyPath = 'security/garp25/source-secret-exceptions.json';
const policy = JSON.parse(fs.readFileSync(policyPath, 'utf8'));
const lexical = policy.entries.filter(e => e.path.startsWith('src/conversation-lab/'));
const qa = policy.entries.filter(e => e.path === 'scripts/qa-clb-teacher-entry-browser.cjs');
const blob = b => createHash('sha1').update(Buffer.from('blob ' + b.length + '\0')).update(b).digest('hex');
const sourceScanner = path.join(root, 'security/garp25/tools/scan-source-secrets.mjs');
const deployScanner = path.join(root, 'security/garp25/tools/scan-deployment-leaks.mjs');
function write(base, name, bytes) {
  const p = path.join(base, name); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, bytes);
}
function scan(base, deployed = false) {
  const r = spawnSync(process.execPath, [deployed ? deployScanner : sourceScanner, deployed ? path.join(base, 'dist') : base], { encoding: 'utf8', maxBuffer: 8e6 });
  assert.equal(r.error, undefined);
  return { exit: r.status, report: JSON.parse(r.stdout || r.stderr) };
}
function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'clb-exception-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  write(dir, policyPath, JSON.stringify(policy));
  for (const e of [...lexical, ...qa]) {
    const b = fs.readFileSync(e.sourcePath); write(dir, e.sourcePath, b);
    if (e.sourcePath.startsWith('src/')) write(dir, 'dist/' + e.sourcePath.slice(4), b);
  }
  return dir;
}
test('exact vocabulary and dummy redaction fixture are hash-bound, never broadly allowed', t => {
  assert.equal(lexical.length, 9); assert.equal(qa.length, 1);
  const scanner = fs.readFileSync('security/garp25/tools/secret-scan-common.mjs', 'utf8');
  const literal = scanner.match(/^const assignedQuoted = (\/.*\/gi);$/m); assert.ok(literal);
  const re = new RegExp(literal[1].slice(1, -3), 'gi');
  for (const e of lexical) {
    const b = fs.readFileSync(e.sourcePath);
    assert.equal(e.path, e.sourcePath); assert.equal(blob(b), e.sourceGitBlobSha);
    assert.equal(e.requireExactDeployedBytes, true);
    assert.deepEqual(e.allowedRules, ['assigned-secret-literal']);
    assert.deepEqual(scanSecretBuffer(b, e.path).hits, ['assigned-secret-literal']);
    re.lastIndex = 0; const matches = [...b.toString().matchAll(re)];
    assert.equal(matches.length, e.path.endsWith('.js') ? 2 : 1);
    for (const m of matches) { assert.equal(m[1], 'secret'); assert.equal(m[3], 'tajn\u00fd; tajemstv\u00ed'); }
  }
  const qb = fs.readFileSync(qa[0].sourcePath);
  assert.equal(blob(qb), qa[0].sourceGitBlobSha);
  assert.deepEqual(qa[0].allowedRules, ['credential-url']);
  assert.deepEqual(scanSecretBuffer(qb, qa[0].path).hits, ['credential-url']);
  const dummyUrl = qb.toString().match(/https?:\/\/CLB_DUMMY_USER:[^'"\s]+/);
  assert.ok(dummyUrl, 'Expected the explicit dummy redaction URL');
  const parsedDummy = new URL(dummyUrl[0]);
  assert.equal(parsedDummy.username, 'CLB_DUMMY_USER');
  assert.equal(parsedDummy.password, 'CLB_DUMMY_PASSWORD');
  assert.equal(parsedDummy.hostname, 'example.invalid');
  const dir = fixture(t);
  const s = scan(dir), d = scan(dir, true);
  assert.equal(s.exit, 0); assert.equal(s.report.acceptedExceptions.length, 10);
  assert.equal(d.exit, 0); assert.equal(d.report.acceptedExceptions.length, 9);
});
test('changing any of the ten reviewed source blobs invalidates its exception', t => {
  const dir = fixture(t);
  for (const e of [...lexical, ...qa]) {
    const b = fs.readFileSync(e.sourcePath); write(dir, e.sourcePath, Buffer.concat([b, Buffer.from('\n')]));
    const r = scan(dir); assert.equal(r.exit, 1, e.path);
    assert.ok(r.report.findings.some(x => x.path === e.path), e.path);
    write(dir, e.sourcePath, b);
  }
});
test('modified deployment is rejected even when each reviewed source remains intact', t => {
  const dir = fixture(t);
  for (const e of lexical) {
    const name = 'dist/' + e.sourcePath.slice(4), b = fs.readFileSync(e.sourcePath);
    write(dir, name, Buffer.concat([b, Buffer.from('\n')]));
    const r = scan(dir, true); assert.equal(r.exit, 1, name);
    assert.ok(r.report.errors.some(x => x.includes(e.sourcePath.slice(4))), name);
    write(dir, name, b);
  }
});
test('unreviewed credentials outside those paths remain blocked', t => {
  const dir = fixture(t);
  const data = Buffer.from(JSON.stringify({ password: randomBytes(24).toString('hex') }));
  write(dir, 'src/unreviewed.json', data); write(dir, 'dist/unreviewed.json', data);
  assert.equal(scan(dir).exit, 1); assert.equal(scan(dir, true).exit, 1);
});
test('private key detection cannot be waived even by a forged exact-hash exception', t => {
  const dir = fixture(t), entry = structuredClone(lexical[0]);
  const ephemeral = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const bytes = Buffer.from(ephemeral.privateKey.export({ type: 'pkcs8', format: 'pem' }));
  const hits = scanSecretBuffer(bytes, entry.path).hits;
  assert.ok(hits.some(isPrivateKeyRule));
  entry.sourceGitBlobSha = blob(bytes); entry.allowedRules = hits;
  write(dir, policyPath, JSON.stringify({ schema: policy.schema, entries: [entry] }));
  write(dir, entry.sourcePath, bytes); write(dir, 'dist/' + entry.sourcePath.slice(4), bytes);
  const s = scan(dir), d = scan(dir, true);
  assert.equal(s.exit, 1); assert.ok(s.report.findings.some(x => x.path === entry.path && x.rules.some(isPrivateKeyRule)));
  assert.equal(d.exit, 1); assert.ok(d.report.errors.some(x => x.includes('private-key')));
});
