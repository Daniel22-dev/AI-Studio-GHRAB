#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { computeArtifactDigest } from './release-identity-verifier.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const revision = 'a'.repeat(40);
const bytes = (obj) => Buffer.from(JSON.stringify(obj));

function createVerifiedApp(id, options = {}) {
  const version = options.version || '1.2.3';
  const baseUrl = `https://example.test/${id}/`;
  const source = { id, url: `${baseUrl}studio-manifest.json`, repository: 'example/school-app' };
  const data = new Map();
  const add = (name, value) => {
    const b = bytes(value);
    data.set(`${baseUrl}${name}`, b);
    return { url: `./${name}`, sha256: sha256(b) };
  };
  const evidence = add('security-evidence-manifest.json', {
    schema: 'ghrab-security-evidence-manifest-v2', appId: id, version,
    sourceRevision: options.mismatchedCommit ? 'b'.repeat(40) : revision,
  });
  const sbom = { bomFormat: 'CycloneDX', metadata: { component: { version } } };
  const sourceSbom = add('sbom-source.cdx.json', sbom);
  const deploymentSbom = add('sbom-deployment.cdx.json', sbom);
  const fingerprint = add('ai-fingerprint.json', {
    schema: 'ghrab-ai-assurance-fingerprint-v2', appId: id, appVersion: version,
  });
  const assurance = {
    schema: 'ghrab-patch-assurance-manifest-v1', appId: id, version,
    algorithm: 'SHA-256', sourceRevision: revision,
    artifacts: {
      securityEvidenceManifest: evidence, sourceSbom, deploymentSbom,
      aiAssuranceFingerprint: fingerprint,
    },
  };
  const assuranceBytes = options.badJson ? Buffer.from('{bad-json') : bytes(assurance);
  data.set(`${baseUrl}patch-assurance.json`, assuranceBytes);
  data.set(`https://raw.githubusercontent.com/example/school-app/${revision}/package.json`,
    bytes({ version: options.sourcePackageVersion || version }));
  const app = {
    id, version,
    assurance: {
      schema: 'ghrab-patch-assurance-v1',
      evidenceManifestUrl: './patch-assurance.json',
      evidenceManifestSha256: sha256(assuranceBytes),
    },
  };
  return { app, source, data };
}

function createTransitionalApp(id, options = {}) {
  const version = '1.2.3';
  const baseUrl = `https://example.test/${id}/`;
  const source = { id, url: `${baseUrl}studio-manifest.json`, repository: 'example/school-app' };
  const data = new Map();
  const add = (name, value) => {
    const b = Buffer.isBuffer(value) ? value : bytes(value);
    data.set(`${baseUrl}${name}`, b);
    return { path: name, sha256: sha256(b), size: b.length };
  };
  const js = add('app.js', Buffer.from('console.log(1);'));
  const manifest = add('studio-manifest.json', { id, version });
  const sbom = add('sbom.cdx.json', { bomFormat: 'CycloneDX' });
  const provenance = add('build-provenance.json', {
    schema: 'ghrab-build-provenance-v1',
    source: { revision: options.mismatchedCommit ? 'b'.repeat(40) : revision,
      repository: 'example/school-app' },
  });
  const evidence = add('security-evidence-manifest.json', {
    schema: 'ghrab-security-evidence-manifest-v1', appId: id, version, sourceRevision: revision,
  });
  const integrity = {
    schema: 'ghrab-release-integrity-v2',
    digestAlgorithmId: 'ghrab-artifact-digest-v2',
    hashAlgorithm: 'SHA-256', appId: id, version, sourceCommit: revision,
    artifactDigest: computeArtifactDigest([js]),
    manifestSha256: manifest.sha256, sbomSha256: sbom.sha256,
    buildProvenanceSha256: provenance.sha256,
    evidenceManifestSha256: evidence.sha256,
    assuranceMode: 'TRANSITIONAL',
    fileCount: 1, files: [js],
  };
  data.set(`${baseUrl}release-integrity.json`,
    options.corruptJson ? Buffer.from('{bad-json') : bytes(integrity));
  data.set(`https://raw.githubusercontent.com/example/school-app/${revision}/package.json`, bytes({ version }));
  return { app: { id, version, releaseIdentity: { contract: 'ghrab-release-integrity-v2' } },
    source, data, id };
}

function fixture(rows, { behavior = null, evidenceWriteError = false } = {}) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ghrab-identity-timing-'));
  const dir = path.join(tmp, 'src/config');
  fs.mkdirSync(dir, { recursive: true });
  fs.mkdirSync(path.join(tmp, 'scripts'), { recursive: true });
  for (const name of ['verify-deployment-release-identities.mjs', 'release-identity-verifier.mjs']) {
    fs.copyFileSync(path.join(root, 'scripts', name), path.join(tmp, 'scripts', name));
  }
  const apps = [], sources = [], report = { sources: [] };
  const responses = {};
  for (const row of rows) {
    if (row.app) apps.push(row.app);
    if (row.source) sources.push(row.source);
    for (const [url, value] of row.data || []) responses[url] = value.toString('base64');
    report.sources.push({ id: row.id || row.app?.id, verification: row.verification ?? 'deployment', ok: row.ok ?? true });
  }
  for (const [name, value] of [
    ['apps.generated.json', apps], ['sources.json', sources], ['sync-report.json', report],
  ]) fs.writeFileSync(path.join(dir, name), `${JSON.stringify(value)}\n`);
  fs.writeFileSync(path.join(tmp, 'mock.json'), JSON.stringify({ responses, behavior }));
  fs.writeFileSync(path.join(tmp, 'scripts', 'mock-fetch.mjs'), `
    import fs from 'node:fs';
    const fixture = JSON.parse(fs.readFileSync(new URL('../mock.json', import.meta.url), 'utf8'));
    const counts = new Map();
    globalThis.fetch = async (input) => {
      const url = String(input);
      const count = (counts.get(url) || 0) + 1;
      counts.set(url, count);
      const scenario = fixture.behavior;
      if (scenario && url.includes(scenario.urlPart)) {
        if (scenario.type === 'timeout') {
          const error = new Error('synthetic timeout');
          error.name = 'TimeoutError';
          throw error;
        }
        if (scenario.type === 'http404') return new Response('missing', { status: 404 });
        if (scenario.type === 'http429') return new Response('limited', { status: 429 });
        if (scenario.type === 'http429Once' && count === 1)
          return new Response('limited', { status: 429 });
        if (scenario.type === 'checksum' && url.includes('patch-assurance.json'))
          return new Response('modified body', { status: 200 });
      }
      const body = fixture.responses[url];
      return body ? new Response(Buffer.from(body, 'base64'), { status: 200 })
        : new Response('unexpected URL', { status: 404 });
    };
  `);
  if (evidenceWriteError) fs.writeFileSync(path.join(tmp, 'qa-results'), 'must remain a file');
  const run = () => spawnSync(process.execPath, [
    '--import', './scripts/mock-fetch.mjs', './scripts/verify-deployment-release-identities.mjs',
  ], { cwd: tmp, encoding: 'utf8', timeout: 20000 });
  const read = (name) => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
  const telemetry = () => JSON.parse(fs.readFileSync(path.join(tmp, 'qa-results/release-identity-timing.json'), 'utf8'));
  return { tmp, run, read, telemetry, dispose: () => fs.rmSync(tmp, { recursive: true, force: true }) };
}

function runCase(rows, opts, verify) {
  const f = fixture(rows, opts);
  try {
    const result = f.run();
    assert.equal(result.error, undefined, result.error?.message);
    verify(f, result);
  } finally { f.dispose(); }
}

const verified = (id, options = {}) => {
  const row = createVerifiedApp(id, options);
  return { ...row, id };
};

test('successful verified release retains original decision and reports requests', () => {
  runCase([verified('app-alpha')], {}, (f, r) => {
    assert.equal(r.status, 0, r.stderr);
    assert.equal(f.read('sync-report.json').releaseIdentity.verified, 1);
    assert.equal(f.read('sync-report.json').sources[0].releaseIdentity.status, 'VERIFIED');
    const t = f.telemetry();
    assert.equal(t.schema, 'ghrab-release-identity-timing-v1');
    assert.equal(t.totals.verified, 1);
    assert.equal(t.totals.fetchRequests, 6);
    assert.equal(t.totals.fetchAttempts, 6);
    assert.equal(t.totals.fetchRetries, 0);
    assert.deepEqual(t.applications.map((a) => a.status), ['VERIFIED']);
    assert.ok(t.totals.durationMs >= 0);
    assert.ok(t.applications[0].durationMs >= 0);
  });
});

test('ABSENT and NOT_APPLICABLE remain non-failing, with no outbound requests', () => {
  const blank = verified('app-empty');
  delete blank.app.assurance;
  const other = verified('app-ignored');
  runCase([blank, { ...other, ok: false }], {}, (f, r) => {
    assert.equal(r.status, 0, r.stderr);
    assert.deepEqual(f.telemetry().applications.map((a) => a.status), ['ABSENT', 'NOT_APPLICABLE']);
    assert.equal(f.telemetry().totals.fetchRequests, 0);
    assert.equal(f.read('sync-report.json').releaseIdentity.absent, 1);
  });
});

test('unregistered source stays skipped and its status is advisory only', () => {
  runCase([{ id: 'missing', verification: 'deployment' }], {}, (f, r) => {
    assert.equal(r.status, 0, r.stderr);
    assert.deepEqual(f.telemetry().applications.map((a) => a.status), ['SKIPPED_UNREGISTERED']);
    assert.equal(f.telemetry().totals.skippedUnregistered, 1);
    assert.equal(f.read('sync-report.json').sources[0].releaseIdentity, undefined);
  });
});

test('HTTP 404 fails closed and still writes non-sensitive advisory evidence', () => {
  runCase([verified('app-alpha')], { behavior: { type: 'http404', urlPart: 'patch-assurance.json' } }, (f, r) => {
    assert.equal(r.status, 1);
    assert.equal(f.read('sync-report.json').sources[0].ok, false);
    assert.equal(f.read('sync-report.json').sources[0].releaseIdentity.status, 'FAILED');
    assert.equal(f.telemetry().totals.failed, 1);
    assert.equal(f.telemetry().totals.fetchAttempts, 1);
    assert.equal(f.telemetry().applications[0].error, undefined);
  });
});

test('HTTP 429 successful retry does not bypass SHA-256 verification', () => {
  runCase([verified('app-alpha')], { behavior: { type: 'http429Once', urlPart: 'patch-assurance.json' } }, (f, r) => {
    assert.equal(r.status, 0, r.stderr);
    assert.equal(f.telemetry().totals.fetchRequests, 6);
    assert.equal(f.telemetry().totals.fetchAttempts, 7);
    assert.equal(f.telemetry().totals.fetchRetries, 1);
    assert.equal(f.read('sync-report.json').sources[0].releaseIdentity.status, 'VERIFIED');
  });
});

test('HTTP 429 exhausted retries still fail closed', () => {
  runCase([verified('app-alpha')], { behavior: { type: 'http429', urlPart: 'patch-assurance.json' } }, (f, r) => {
    assert.equal(r.status, 1);
    assert.equal(f.telemetry().totals.fetchRequests, 1);
    assert.equal(f.telemetry().totals.fetchAttempts, 3);
    assert.equal(f.telemetry().totals.fetchRetries, 2);
  });
});

test('network timeout exhausted retries still fail closed', () => {
  runCase([verified('app-alpha')], { behavior: { type: 'timeout', urlPart: 'patch-assurance.json' } }, (f, r) => {
    assert.equal(r.status, 1);
    assert.equal(f.telemetry().totals.fetchAttempts, 3);
    assert.equal(f.telemetry().totals.fetchRetries, 2);
  });
});

test('bad checksum fails closed, even with otherwise valid manifest', () => {
  runCase([verified('app-alpha')], { behavior: { type: 'checksum', urlPart: 'patch-assurance.json' } }, (f, r) => {
    assert.equal(r.status, 1);
    assert.match(r.stderr, /digest/);
    assert.equal(f.telemetry().totals.failed, 1);
  });
});

test('corrupt JSON fails closed after checksum matches', () => {
  runCase([verified('app-alpha', { badJson: true })], {}, (f, r) => {
    assert.equal(r.status, 1);
    assert.match(r.stderr, /JSON/);
    assert.equal(f.telemetry().totals.failed, 1);
  });
});

test('incorrect source revision is rejected after positive SHA checks', () => {
  runCase([verified('app-alpha', { mismatchedCommit: true })], {}, (f, r) => {
    assert.equal(r.status, 1);
    assert.match(r.stderr, /sourceRevision.*drift/);
    assert.equal(f.telemetry().totals.failed, 1);
  });
});

test('mixed statuses keep stable order and original fail-closed exit code', () => {
  const absent = verified('app-absent');
  delete absent.app.assurance;
  runCase([
    verified('app-good'), absent,
    { ...verified('app-na'), ok: false },
    verified('app-bad', { badJson: true }),
    { id: 'missing' },
  ], {}, (f, r) => {
    assert.equal(r.status, 1);
    const t = f.telemetry();
    assert.deepEqual(t.applications.map((a) => a.appId),
      ['app-good', 'app-absent', 'app-na', 'app-bad', 'missing']);
    assert.deepEqual(t.applications.map((a) => a.status),
      ['VERIFIED', 'ABSENT', 'NOT_APPLICABLE', 'FAILED', 'SKIPPED_UNREGISTERED']);
    assert.equal(t.totals.verified, 1);
    assert.equal(t.totals.absent, 1);
    assert.equal(t.totals.failed, 1);
    assert.equal(t.totals.notApplicable, 1);
    assert.equal(t.totals.skippedUnregistered, 1);
  });
});

test('TRANSITIONAL release integrity v2 verifies complete artifact digest', () => {
  runCase([createTransitionalApp('app-transitional')], {}, (f, r) => {
    assert.equal(r.status, 0, r.stderr);
    assert.equal(f.read('sync-report.json').sources[0].releaseIdentity.status, 'VERIFIED');
    assert.equal(f.read('sync-report.json').sources[0].releaseIdentity.verifiedFileCount, 1);
    assert.equal(f.telemetry().totals.fetchRequests, 9);
    assert.equal(f.telemetry().totals.fetchAttempts, 9);
    assert.equal(f.telemetry().applications[0].status, 'VERIFIED');
  });
});

test('TRANSITIONAL release integrity source commit mismatch remains fail closed', () => {
  runCase([createTransitionalApp('app-transitional', { mismatchedCommit: true })], {}, (f, r) => {
    assert.equal(r.status, 1, r.stderr);
    assert.match(r.stderr, /build provenance source commit drift/);
    assert.equal(f.telemetry().totals.failed, 1);
  });
});

test('TRANSITIONAL corrupt JSON and HTTP 404 remain fail closed', () => {
  runCase([createTransitionalApp('app-transitional', { corruptJson: true })], {}, (f, r) => {
    assert.equal(r.status, 1);
    assert.match(r.stderr, /JSON/);
    assert.equal(f.telemetry().totals.fetchRequests, 1);
  });
  runCase([createTransitionalApp('app-transitional')],
    { behavior: { type: 'http404', urlPart: 'release-integrity.json' } }, (f, r) => {
      assert.equal(r.status, 1);
      assert.match(r.stderr, /HTTP 404/);
      assert.equal(f.telemetry().totals.fetchRequests, 1);
    });
});

test('advisory write failure cannot downgrade an otherwise successful gate', () => {
  runCase([verified('app-alpha')], { evidenceWriteError: true }, (f, r) => {
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stderr, /Advisory release identity timing evidence not written/);
    assert.equal(f.read('sync-report.json').releaseIdentity.verified, 1);
  });
});
