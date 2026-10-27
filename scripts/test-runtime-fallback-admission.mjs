#!/usr/bin/env node
// Synthetic tests for fail-closed, live-verified runtime fallback admission.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { BASELINE, ONLY_EXCEPTION, LUDUS_EXCEPTION } from './release-wave-platform-policy.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const script = path.join(root, 'scripts/sync-runtime-fallback.mjs');
const version = '1.5.30';
const platformVersion = BASELINE.platformVersion;
const requiredPlatformRange = BASELINE.requiredPlatformRange;
const IDS = ['generator','differentiator','essay-evaluator','correspondence','ludus',
  'activity-builder','sortio','lesson-hub','maturita-desk','conversation-lab'];

function fixture() {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'ghrab-fallback-admission-'));
  const dir = path.join(work, 'src/config');
  fs.mkdirSync(dir, { recursive: true });
  fs.mkdirSync(path.join(work, 'scripts'), { recursive: true });
  fs.copyFileSync(script, path.join(work, 'scripts/sync-runtime-fallback.mjs'));
  fs.copyFileSync(path.join(root,'scripts/release-wave-platform-policy.mjs'),
    path.join(work,'scripts/release-wave-platform-policy.mjs'));
  const app = id => {
    const reviewed = id === ONLY_EXCEPTION.id ? ONLY_EXCEPTION : id === LUDUS_EXCEPTION.id ? LUDUS_EXCEPTION : null;
    const expectedVersion = reviewed ? reviewed.version : version;
    const platform = reviewed ? reviewed.platformVersion : platformVersion;
    const range = reviewed ? reviewed.requiredPlatformRange : requiredPlatformRange;
    return {
      id, version: expectedVersion,
      publishedAt: '2026-10-13T07:07:35.000Z',
      platform: { platformVersion: platform, requiredPlatformRange: range, cacheName: `ghrab-${id}-v${expectedVersion}` },
      compatibility: { platformRange: range },
    };
  };
  const generated = IDS.map(app);
  const fallback = structuredClone(generated);
  const wave = {
    schema: 'ghrab-platform-release-wave-v1', wave: BASELINE.wave,
    status: 'candidate', platformVersion, requiredPlatformRange,
    applications: generated.map(({ id, version }) =>
      id === ONLY_EXCEPTION.id ? { ...ONLY_EXCEPTION } : id === LUDUS_EXCEPTION.id ? { ...LUDUS_EXCEPTION } : { id, version }),
    policy: { requireSourceVerificationForDeploy: true, allowSnapshotForDeploy: false },
  };
  const report = {
    schema: 'ai-studio-sync-report-v1', generated: true,
    counts: { verified: 10, deployment: 10, repository: 0, snapshot: 0, total: 10 },
    sources: generated.map(({ id, version }) => ({ id, version, sourceVersion: version, ok: true, verification: 'deployment' })),
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

test('pre-sync legacy is read-only, applies only to exact committed Differentiator 1.1.2', () => {
  const f = fixture();
  try {
    const old = f.generated.find(row => row.id === ONLY_EXCEPTION.id);
    old.platform.platformVersion = BASELINE.platformVersion;
    old.platform.requiredPlatformRange = BASELINE.requiredPlatformRange;
    old.compatibility.platformRange = BASELINE.requiredPlatformRange;
    const oldFallback = f.fallback.find(row => row.id === ONLY_EXCEPTION.id);
    oldFallback.platform.platformVersion = BASELINE.platformVersion;
    oldFallback.platform.requiredPlatformRange = BASELINE.requiredPlatformRange;
    oldFallback.compatibility.platformRange = BASELINE.requiredPlatformRange;
    f.persist();
    assert.notEqual(f.run('--check').status, 0, 'stale 1.1.2 must fail strict current check');
    assert.equal(f.run('--check','--committed-presync-legacy').status, 0, 'exact old snapshot may be read-only audited');
    assert.notEqual(f.run('--committed-presync-legacy').status, 0, 'historical flag must never refresh');
    assert.equal(f.read('apps.fallback.json').find(row=>row.id===ONLY_EXCEPTION.id).platform.platformVersion,'1.1.2');
  } finally { f.dispose(); }
});

test('LUDUS 1.1.2 downgrade is never grandfathered by historical pre-sync check', () => {
  const f = fixture();
  try {
    for (const rows of [f.generated, f.fallback]) {
      const ludus = rows.find(row => row.id === LUDUS_EXCEPTION.id);
      ludus.platform.platformVersion = BASELINE.platformVersion;
      ludus.platform.requiredPlatformRange = BASELINE.requiredPlatformRange;
      ludus.compatibility.platformRange = BASELINE.requiredPlatformRange;
    }
    f.persist();
    assert.notEqual(f.run('--check').status, 0);
    assert.notEqual(f.run('--check','--committed-presync-legacy').status, 0);
    assert.equal(f.read('apps.fallback.json').find(row=>row.id==='ludus').platform.platformVersion,'1.1.2');
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
    f.report.counts.deployment = 9;
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
    f.report.counts.deployment = 1;
    f.report.counts.snapshot = 1;
    f.report.counts.verified = 1;
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
    f.wave.applications[2].version = '1.5.31';
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
    const before = source.indexOf('- name: Verify exact historical committed fallback before live synchronisation (read only)');
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
    assert.ok(source.includes('npm run sync:fallback') && source.includes('npm run qa:fallback'),
      `${relative}: verified refresh and strict equality gate must both remain present`);
  }
});
