#!/usr/bin/env node
// P2: keep the error-reporter browser regression, but run it against the
// freshly QA-built dist instead of building an artifact that qa:release deletes.
// The content-addressed before/after check fails closed on any dist mutation.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { lstat, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHA256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

export async function fingerprintDist(distDir) {
  const rootStat = await lstat(distDir);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) {
    throw new Error('QA build dist must be a real directory (not a symlink)');
  }
  const files = [];
  async function visit(directory, relativePrefix = '') {
    const names = (await readdir(directory)).sort();
    for (const name of names) {
      const absolute = path.join(directory, name);
      const relative = relativePrefix ? `${relativePrefix}/${name}` : name;
      const stat = await lstat(absolute);
      if (stat.isSymbolicLink()) throw new Error(`Symlinks are forbidden in QA build: ${relative}`);
      if (stat.isDirectory()) {
        await visit(absolute, relative);
      } else if (stat.isFile()) {
        const bytes = await readFile(absolute);
        files.push({ path: relative, bytes: bytes.length, sha256: SHA256(bytes) });
      } else {
        throw new Error(`Unsupported file type in QA build: ${relative}`);
      }
    }
  }
  await visit(distDir);
  if (!files.length || !files.some((f) => f.path === 'index.html') || !files.some((f) => f.path === 'build-info.json')) {
    throw new Error('QA build must contain index.html and build-info.json');
  }
  return {
    digest: SHA256(Buffer.from(JSON.stringify(files))),
    fileCount: files.length,
    byteCount: files.reduce((total, file) => total + file.bytes, 0),
  };
}

export function evaluateParity({ before, after, exitCode, reporter, expectedVersion, expectedAppId }) {
  const failures = [];
  if (exitCode !== 0) failures.push('REPORTER_COMMAND_FAILED');
  if (!before || !after || before.digest !== after.digest || before.fileCount !== after.fileCount || before.byteCount !== after.byteCount) {
    failures.push('QA_DIST_MUTATED_OR_MISSING');
  }
  if (!reporter || reporter.schema !== 'ghrab-error-reporter-test-v1' || reporter.appId !== expectedAppId || reporter.version !== expectedVersion) {
    failures.push('REPORTER_EVIDENCE_MISSING_OR_INVALID');
  } else {
    if (reporter.browser?.status !== 'passed') failures.push('REPORTER_BROWSER_NOT_VERIFIED');
    if (!Number.isInteger(reporter.failed) || reporter.failed !== 0 || !Number.isInteger(reporter.passed) || reporter.passed < 1) {
      failures.push('REPORTER_REGRESSIONS_NOT_GREEN');
    }
  }
  return { status: failures.length ? 'FAIL' : 'PASS', failures };
}

async function main() {
  const qaDir = path.join(PROJECT_ROOT, 'qa-results');
  const evidencePath = path.join(PROJECT_ROOT, 'test-results', 'error-reporter.json');
  const distDir = path.join(PROJECT_ROOT, 'dist');
  const outputPath = path.join(qaDir, 'p2-reporter-build-parity.json');
  const expectedVersion = JSON.parse(await readFile(path.join(PROJECT_ROOT, 'package.json'), 'utf8')).version;
  const reporterConfig = JSON.parse(await readFile(path.join(PROJECT_ROOT, 'reporter-test.config.json'), 'utf8'));
  const expectedAppId = reporterConfig.appId;
  const started = Date.now();
  let before = null;
  let after = null;
  let reporter = null;
  let exitCode = null;
  let reason = null;
  let commandResult = null;
  try {
    // Never let a previous run's report satisfy the current build's evidence gate.
    await rm(evidencePath, { force: true });
    before = await fingerprintDist(distDir);
    commandResult = spawnSync('npm', ['run', 'test:reporter'], {
      cwd: PROJECT_ROOT,
      env: process.env,
      stdio: 'inherit',
      timeout: 180000,
      shell: false,
    });
    exitCode = commandResult.status;
    if (commandResult.error) reason = String(commandResult.error.message || commandResult.error);
  } catch (error) {
    reason = String(error.message || error);
  } finally {
    // Snapshot even on test failure: any changed dist is a blocker, never a cache hit.
    try { after = await fingerprintDist(distDir); }
    catch (error) { reason = [reason, String(error.message || error)].filter(Boolean).join(' | '); }
    try { reporter = JSON.parse(await readFile(evidencePath, 'utf8')); }
    catch (error) { reason = [reason, `Reporter evidence: ${String(error.message || error)}`].filter(Boolean).join(' | '); }
  }
  const verdict = evaluateParity({ before, after, exitCode, reporter, expectedVersion, expectedAppId });
  if (reason) verdict.failures.push('P2_HARNESS_ERROR');
  verdict.status = verdict.failures.length ? 'FAIL' : 'PASS';
  const evidence = {
    schema: 'ghrab-p2-reporter-build-parity-v1',
    status: verdict.status,
    sourceCommit: process.env.GITHUB_SHA || null,
    expectedVersion,
    expectedAppId,
    qaDistBefore: before,
    qaDistAfter: after,
    reporter: reporter ? { schema: reporter.schema, appId: reporter.appId, version: reporter.version,
      browser: reporter.browser?.status || 'missing', passed: reporter.passed, failed: reporter.failed } : null,
    commandExitCode: exitCode,
    durationMs: Date.now() - started,
    failures: verdict.failures,
    ...(reason ? { reason } : {}),
  };
  await mkdir(qaDir, { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
  console.log(`P2 reporter/QA-build parity ${evidence.status}: dist=${after?.digest || 'missing'} reporter=${reporter?.browser?.status || 'missing'}`);
  if (evidence.status !== 'PASS') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
