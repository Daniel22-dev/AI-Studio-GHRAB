#!/usr/bin/env node
// Synthetic tests for fail-closed, live-verified runtime fallback admission.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const script = path.join(root, 'scripts/sync-runtime-fallback.mjs');
const version = '1.5.30';
const platformVersion = '1.1.2';
const requiredPlatformRange = '>=1.1.2 <2.0.0';

function fixture() {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'ghrab-fallback-admission-'));
  const dir = path.join(work, 'src/config');
  fs.mkdirSync(dir, { recursive: true });
  fs.mkdirSync(path.join(work, 'scripts'), { recursive: true });
  fs.copyFileSync(script, path.join(work, 'scripts/sync-runtime-fallback.mjs'));
  // Runtime fallback now imports the shared exact-wave validator. Hermetic
  // subprocess fixtures must copy this dependency too; missing-module failures
  // are not evidence that the admission policy works.
  fs.copyFileSync(path.join(root, 'scripts/release-wave-platform-policy.mjs'),
    path.join(work, 'scripts/release-wave-platform-policy.mjs'));
  // Exact ten-app release wave. Differentiator alone has a verified
  // Platform 1.1.3 pin; all other apps remain on the 1.1.2 baseline.
  const app = id => {
    const upgraded = id === 'differentiator';
    const appVersion = upgraded ? '1.3.51' : version;
    const pVersion = upgraded ? '1.1.3' : platformVersion;
    const range = upgraded ? '>=1.1.3 <2.0.0' : requiredPlatformRange;
    return {
      id, version: appVersion,
      publishedAt: '2026-10-13T07:07:35.000Z',
      platform: { platformVersion: pVersion, requiredPlatformRange: range,
        cacheName: `ghrab-${id}-v${appVersion}` },
      compatibility: { platformRange: range },
    };
  };
  const generated = ['essay-evaluator', 'lesson-hub', 'differentiator',
    'generator', 'correspondence', 'ludus', 'activity-builder', 'sortio',
    'maturita-desk', 'conversation-lab'].map(app);
  const fallback = structuredClone(generated);
  const wave = {
    schema: 'ghrab-platform-release-wave-v1',
    wave: 'ghrab-platform-1.1.2-ecosystem-wave',
    status: 'candidate', platformVersion, requiredPlatformRange,
    policy: { requireSourceVerificationForDeploy: true,
      allowSnapshotForDeploy: false },
    applications: generated.map(({ id, version }) => id === 'differentiator'
      ? { id, version, platformVersion: '1.1.3',
        requiredPlatformRange: '>=1.1.3 <2.0.0' }
      : { id, version }),
  };
  const report = {
    schema: 'ai-studio-sync-report-v1', generated: true,
    counts: { verified: generated.length, deployment: generated.length,
      repository: 0, snapshot: 0, total: generated.length },
    sources: generated.map(({ id, version }) => ({ id, version,
      sourceVersion: version, ok: true, verification: 'deployment' })),
  };
  const write = (name, value) => fs.writeFileSync(path.join(dir, name), JSON.stringify(value, null, 2) + '\n');
  const read = name => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
  function persist() {
    write('apps.generated.json', generated);
    write('apps.fallback.json', fallback);
    write('release-wave.json', wave);
    write('sync-report.json', report);
  }
  persist();
  const run = (...args) => spawnSync(process.execPath, ['scripts/sync-runtime-fallback.mjs', ...args], {
    cwd: work, encoding: 'utf8', timeout: 15000,
  });
  return { work, generated, fallback, wave, report, write, read, persist, run,
    dispose: () => fs.rmSync(work, { recursive: true, force: true }) };
}

test('committed equal registries pass before remote synchronisation', () => {
  const f = fixture();
  try {
    const r = f.run('--check');
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.deepEqual(f.read('apps.fallback.json'), f.generated);
  } finally { f.dispose(); }
});

test('metadata drift is rejected even when versions are unchanged', () => {
  const f = fixture();
  try {
    f.fallback[0].publishedAt = '2026-10-13T06:58:21.000Z';
    f.persist();
    const r = f.run('--check');
    assert.notEqual(r.status, 0);
    assert.match(r.stderr + r.stdout, /fallback snapshot drift: metadata differs/);
    assert.notDeepEqual(f.read('apps.fallback.json'), f.generated);
  } finally { f.dispose(); }
});

test('live verified refresh repairs metadata drift and restores exact equality', () => {
  const f = fixture();
  try {
    f.fallback[0].publishedAt = '2026-10-13T06:58:21.000Z';
    f.persist();
    assert.notEqual(f.run('--check').status, 0);
    const refreshed = f.run();
    assert.equal(refreshed.status, 0, refreshed.stdout + refreshed.stderr);
    assert.deepEqual(f.read('apps.fallback.json'), f.generated);
    assert.equal(f.run('--check').status, 0);
  } finally { f.dispose(); }
});

test('repository verified fallback is not sufficient to refresh stored snapshots', () => {
  const f = fixture();
  try {
    f.report.sources[1].verification = 'repository';
    f.report.counts.deployment = f.generated.length - 1;
    f.report.counts.repository = 1;
    f.fallback[0].publishedAt = '2026-10-13T06:58:21.000Z';
    f.persist();
    const result = f.run();
    assert.notEqual(result.status, 0);
    assert.match(result.stderr + result.stdout, /refusing refresh without live deployment evidence/);
    assert.notDeepEqual(f.read('apps.fallback.json'), f.generated);
  } finally { f.dispose(); }
});

test('source snapshot / failed verification blocks refresh and preserves fallback', () => {
  const f = fixture();
  try {
    f.report.sources[0].verification = 'snapshot';
    f.report.sources[0].ok = false;
    f.report.counts.deployment = f.generated.length - 1;
    f.report.counts.snapshot = 1;
    f.report.counts.verified = f.generated.length - 1;
    f.fallback[0].publishedAt = '2026-10-13T06:58:21.000Z';
    f.persist();
    assert.notEqual(f.run().status, 0);
    assert.notDeepEqual(f.read('apps.fallback.json'), f.generated);
  } finally { f.dispose(); }
});

test('a source version mismatch cannot be laundered into fallback', () => {
  const f = fixture();
  try {
    f.report.sources[0].version = '1.5.31';
    f.persist();
    const r = f.run();
    assert.notEqual(r.status, 0);
    assert.match(r.stderr + r.stdout, /does not match generated/);
  } finally { f.dispose(); }
});

test('release-wave drift blocks refreshing fallback', () => {
  const f = fixture();
  try {
    f.wave.applications[1].version = '1.5.31';
    f.persist();
    const r = f.run();
    assert.notEqual(r.status, 0);
    assert.match(r.stderr + r.stdout, /does not match release-wave/);
  } finally { f.dispose(); }
});

test('CI workflows verify committed snapshots, then refresh only after live verification', () => {
  const paths = ['.github/workflows/p5-release-gate.yml', '.github/workflows/deploy.yml'];
  for (const relative of paths) {
    const source = fs.readFileSync(path.join(root, relative), 'utf8');
    const before = relative.includes('p5-')
      ? source.indexOf('- name: Verify exact historical committed fallback before live synchronisation (read only)')
      : source.indexOf('- name: Verify committed runtime fallback before live synchronisation');
    const sync = source.indexOf('- name: Synchronise application manifests');
    const verified = relative.includes('p5-')
      ? source.indexOf('- name: Verify committed release-wave against live sources')
      : source.indexOf('- name: Verify Platform 1.1.2 release-wave sources');
    const refresh = source.indexOf('- name: Refresh runtime fallback from all live-verified sources');
    const gate = relative.includes('p5-')
      ? source.indexOf('- name: Run P5 R2 release gate')
      : source.indexOf('- name: Run GHRAB QA release gate');
    assert.ok(before !== -1 && before < sync && sync < verified && verified < refresh && refresh < gate,
      `${relative}: committed -> live verified -> refreshed fallback -> release gate order must be preserved`);
    if (relative.includes('p5-')) {
      // Historical exception is read-only and confined to PRE-SYNC; the
      // post-live refresh/check must not include this exception flag.
      assert.match(source, /sync-runtime-fallback\.mjs --check --committed-presync-legacy/);
      const refreshBody = source.slice(refresh, gate);
      assert.doesNotMatch(refreshBody, /committed-presync-legacy/);
    }
    assert.ok(source.includes('npm run sync:fallback') && source.includes('npm run qa:fallback'),
      `${relative}: verified refresh and strict equality gate must both remain present`);
  }
});


test('old Differentiator snapshot is admitted exclusively by read-only pre-sync', () => {
  const f = fixture();
  try {
    const current = f.generated.find(x => x.id === 'differentiator');
    current.platform.platformVersion = '1.1.2';
    current.platform.requiredPlatformRange = '>=1.1.2 <2.0.0';
    current.compatibility.platformRange = '>=1.1.2 <2.0.0';
    const index = f.fallback.findIndex(x => x.id === 'differentiator');
    f.fallback[index] = structuredClone(current);
    f.persist();
    const historical = f.run('--check', '--committed-presync-legacy');
    assert.equal(historical.status, 0, historical.stdout + historical.stderr);
    const plainCheck = f.run('--check');
    assert.notEqual(plainCheck.status, 0);
    assert.match(plainCheck.stdout + plainCheck.stderr, /exact release-wave pin/);
    const refresh = f.run();
    assert.notEqual(refresh.status, 0);
    const flaggedRefresh = f.run('--committed-presync-legacy');
    assert.notEqual(flaggedRefresh.status, 0);
    assert.match(flaggedRefresh.stdout + flaggedRefresh.stderr, /historical snapshot flag cannot refresh/);
  } finally { f.dispose(); }
});

test('historical exemption never approves another app or a manipulated Differentiator range', () => {
  const f = fixture();
  try {
    f.generated[0].platform.platformVersion = '1.1.3';
    f.fallback[0] = structuredClone(f.generated[0]);
    f.persist();
    const anotherApp = f.run('--check', '--committed-presync-legacy');
    assert.notEqual(anotherApp.status, 0);
    assert.match(anotherApp.stdout + anotherApp.stderr, /exact release-wave pin/);
    f.generated[0].platform.platformVersion = '1.1.2';
    f.fallback[0] = structuredClone(f.generated[0]);
    const diff = f.generated.find(x => x.id === 'differentiator');
    diff.platform.platformVersion = '1.1.2';
    diff.platform.requiredPlatformRange = '>=1.1.2 <2.0.0';
    // Deliberately inconsistent compatibility range must fail closed.
    f.fallback[f.fallback.findIndex(x => x.id === 'differentiator')] = structuredClone(diff);
    f.persist();
    const malformed = f.run('--check', '--committed-presync-legacy');
    assert.notEqual(malformed.status, 0);
    assert.match(malformed.stdout + malformed.stderr, /exact release-wave pin/);
  } finally { f.dispose(); }
});
