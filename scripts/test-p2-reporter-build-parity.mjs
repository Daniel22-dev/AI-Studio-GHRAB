#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { evaluateParity, fingerprintDist } from './p2-reporter-build-parity.mjs';

async function withFixture(fn) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'ghrab-p2-test-'));
  const dist = path.join(root, 'dist');
  try {
    await mkdir(path.join(dist, 'assets'), { recursive: true });
    await writeFile(path.join(dist, 'index.html'), '<html>test</html>');
    await writeFile(path.join(dist, 'build-info.json'), '{"version":"0.21.241"}');
    await writeFile(path.join(dist, 'assets', 'app.js'), 'console.log("safe");');
    await fn({ root, dist });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
const report = (overrides = {}) => ({ schema: 'ghrab-error-reporter-test-v1', appId: 'ai-studio-reporter', version: '0.21.241', browser: { status: 'passed' }, passed: 74, failed: 0, ...overrides });
const judge = (before, after, overrides = {}) => evaluateParity({ before, after, exitCode: 0, reporter: report(), expectedVersion: '0.21.241', expectedAppId: 'ai-studio-reporter', ...overrides });

test('unchanged QA-built dist and current browser PASS are accepted', async () => {
  await withFixture(async ({ dist }) => {
    const before = await fingerprintDist(dist);
    const after = await fingerprintDist(dist);
    assert.deepEqual(before, after);
    assert.equal(judge(before, after).status, 'PASS');
    assert.equal(before.fileCount, 3);
  });
});
test('editing a single build byte is rejected even if file size is unchanged', async () => {
  await withFixture(async ({ dist }) => {
    const before = await fingerprintDist(dist);
    await writeFile(path.join(dist, 'assets', 'app.js'), 'console.log("bad!");');
    const after = await fingerprintDist(dist);
    assert.ok(judge(before, after).failures.includes('QA_DIST_MUTATED_OR_MISSING'));
  });
});
test('adding a build file is rejected', async () => {
  await withFixture(async ({ dist }) => {
    const before = await fingerprintDist(dist);
    await writeFile(path.join(dist, 'additional.js'), 'new');
    assert.equal(judge(before, await fingerprintDist(dist)).status, 'FAIL');
  });
});
test('removing a build file is rejected', async () => {
  await withFixture(async ({ dist }) => {
    const before = await fingerprintDist(dist);
    await rm(path.join(dist, 'assets', 'app.js'));
    assert.equal(judge(before, await fingerprintDist(dist)).status, 'FAIL');
  });
});
test('symlink in dist is refused rather than followed', async () => {
  await withFixture(async ({ dist }) => {
    await symlink(path.join(dist, 'assets', 'app.js'), path.join(dist, 'external.js'));
    await assert.rejects(() => fingerprintDist(dist), /Symlinks are forbidden/);
  });
});
test('dist directory symlink itself is refused', async () => {
  await withFixture(async ({ root, dist }) => {
    await symlink(dist, path.join(root, 'dist-link'));
    await assert.rejects(() => fingerprintDist(path.join(root, 'dist-link')), /real directory/);
  });
});
test('missing required build-info fails closed', async () => {
  await withFixture(async ({ dist }) => {
    await rm(path.join(dist, 'build-info.json'));
    await assert.rejects(() => fingerprintDist(dist), /build-info.json/);
  });
});
test('missing dist fails closed', async () => {
  await withFixture(async ({ root }) => {
    await assert.rejects(() => fingerprintDist(path.join(root, 'nonexistent')), /ENOENT/);
  });
});
test('nonzero reporter command is fatal despite preserved build', async () => {
  await withFixture(async ({ dist }) => {
    const stamp = await fingerprintDist(dist);
    assert.ok(judge(stamp, stamp, { exitCode: 1 }).failures.includes('REPORTER_COMMAND_FAILED'));
  });
});
test('reporter browser not-ready fails closed despite exit 0', async () => {
  await withFixture(async ({ dist }) => {
    const stamp = await fingerprintDist(dist);
    assert.ok(judge(stamp, stamp, { reporter: report({ browser: { status: 'not-ready-environment' } }) }).failures.includes('REPORTER_BROWSER_NOT_VERIFIED'));
  });
});
test('reported browser failure fails closed', async () => {
  await withFixture(async ({ dist }) => {
    const stamp = await fingerprintDist(dist);
    assert.equal(judge(stamp, stamp, { reporter: report({ browser: { status: 'failed' }, failed: 1 }) }).status, 'FAIL');
  });
});
test('missing/stale reporter evidence is rejected', async () => {
  await withFixture(async ({ dist }) => {
    const stamp = await fingerprintDist(dist);
    assert.ok(judge(stamp, stamp, { reporter: null }).failures.includes('REPORTER_EVIDENCE_MISSING_OR_INVALID'));
  });
});
test('wrong app identity is rejected', async () => {
  await withFixture(async ({ dist }) => {
    const stamp = await fingerprintDist(dist);
    assert.equal(judge(stamp, stamp, { reporter: report({ appId: 'other-app' }) }).status, 'FAIL');
  });
});
test('wrong application version is rejected', async () => {
  await withFixture(async ({ dist }) => {
    const stamp = await fingerprintDist(dist);
    assert.equal(judge(stamp, stamp, { reporter: report({ version: '0.21.240' }) }).status, 'FAIL');
  });
});
test('reporter must actually execute a positive number of checks', async () => {
  await withFixture(async ({ dist }) => {
    const stamp = await fingerprintDist(dist);
    assert.equal(judge(stamp, stamp, { reporter: report({ passed: 0 }) }).status, 'FAIL');
  });
});
test('unchanged dist ignores mtime and preserves content identity', async () => {
  await withFixture(async ({ dist }) => {
    const before = await fingerprintDist(dist);
    const bytes = await readFile(path.join(dist, 'assets', 'app.js'));
    await writeFile(path.join(dist, 'assets', 'app.js'), bytes);
    assert.deepEqual(await fingerprintDist(dist), before);
  });
});

test('deploy retains QA, reporter, evidence upload, GARP and P5 in mandatory order', async () => {
  const workflow = await readFile(new URL('../.github/workflows/deploy.yml', import.meta.url), 'utf8');
  const steps = [
    'Run GHRAB QA release gate',
    'Verify reporter against QA-certified build (P2)',
    'Upload QA evidence',
    'Run GARP 2.7 FOUNDATION gate',
    'Enforce P5 R2 release gate',
    'Prepare production deployment artifact',
    'Create LIVE Studio GARP release assurance',
  ];
  const positions = steps.map((step) => workflow.indexOf(`- name: ${step}`));
  assert.ok(positions.every((pos) => pos >= 0), `Missing required step: ${steps.filter((_, idx) => positions[idx] < 0)}`);
  for (let idx = 1; idx < positions.length; idx++) assert.ok(positions[idx] > positions[idx - 1], `Step out of order: ${steps[idx]}`);
  assert.ok(!workflow.includes('Build application for reporter regression'));
  assert.ok(workflow.includes('run: node scripts/p2-reporter-build-parity.mjs'));
  assert.ok(workflow.includes('if: always()'));
  assert.ok(workflow.includes('cancel-in-progress: false'));
});
test('QA release still destroys old dist and has a mandatory fresh build', async () => {
  const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  const manifest = JSON.parse(await readFile(new URL('../qa/qa-manifest.json', import.meta.url), 'utf8'));
  const qaRunner = await readFile(new URL('./qa-release.mjs', import.meta.url), 'utf8');
  assert.equal(manifest.buildRoot, 'dist');
  assert.equal(manifest.buildCommand, 'npm run build');
  assert.equal(manifest.testCommand, 'npm test');
  assert.ok(packageJson.scripts.test.includes('npm run build'));
  assert.equal(packageJson.scripts['test:reporter'], 'node scripts/test-error-reporter.mjs');
  assert.ok(qaRunner.includes('await rm(buildRoot, { recursive: true, force: true })'));
  assert.ok(qaRunner.includes('["project-build", manifest.buildCommand]'));
  assert.ok(qaRunner.includes('REQUIRED_GATES'));
});
test('P5 still runs negative parity cases before GARP FOUNDATION and release gate', async () => {
  const workflow = await readFile(new URL('../.github/workflows/p5-release-gate.yml', import.meta.url), 'utf8');
  const steps = [
    'Verify P2 reporter build parity and tamper rejection',
    'Run GARP 2.7 FOUNDATION gate',
    'Run P5 R2 release gate',
    'Verify Studio UX and manual PDF review contract',
    'Verify Studio release assurance chain',
  ];
  const positions = steps.map((step) => workflow.indexOf(`- name: ${step}`));
  assert.ok(positions.every((pos) => pos >= 0));
  for (let idx = 1; idx < positions.length; idx++) assert.ok(positions[idx] > positions[idx - 1]);
  assert.ok(workflow.includes('node --test scripts/test-p2-reporter-build-parity.mjs'));
  assert.ok(workflow.includes('npm ci --ignore-scripts'));
  assert.ok(workflow.includes('npx playwright install --with-deps chromium'));
});
