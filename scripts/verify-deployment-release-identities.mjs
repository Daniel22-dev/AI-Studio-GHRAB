#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyDeploymentReleaseIdentity } from './release-identity-verifier.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cfg = path.join(root, 'src', 'config');
const read = (name) => readFile(path.join(cfg, name), 'utf8').then(JSON.parse);
const [apps, sources, report] = await Promise.all([
  read('apps.generated.json'),
  read('sources.json'),
  read('sync-report.json'),
]);

const startedAt = performance.now();
const timings = [];
const elapsedMs = (started) => Math.max(0, Math.round(performance.now() - started));
const appBy = new Map((apps || []).map((app) => [app.id, app]));
const sourceBy = new Map((sources || []).map((source) => [source.id, source]));
// P1: overlap independent APPLICATION checks only. Each application's existing
// fetch/retry/digest/provenance verification remains sequential and unchanged.
// 1 is the emergency serial rollback; 3 is the reviewed upper bound.
const requestedConcurrency = process.env.GHRAB_RELEASE_IDENTITY_CONCURRENCY;
const concurrency = requestedConcurrency === undefined ? 3 : Number(requestedConcurrency);
if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 3) {
  throw new Error('GHRAB_RELEASE_IDENTITY_CONCURRENCY must be an integer from 1 to 3');
}

const entries = report.sources || [];
// Preserve EVERY original source row, including duplicates and unregistered rows.
// Results are committed to sync-report.json only after ALL checks have settled.
const outcomes = new Array(entries.length);
let nextIndex = 0;

async function verifyOne(item) {
  const appStartedAt = performance.now();
  const stats = { requests: 0, attempts: 0, retries: 0 };
  const finish = (kind, status, identity, errorMessage, message) => ({
    kind,
    identity,
    errorMessage,
    message,
    timing: {
      appId: item.id,
      status,
      durationMs: elapsedMs(appStartedAt),
      fetchRequests: stats.requests,
      fetchAttempts: stats.attempts,
      fetchRetries: stats.retries,
    },
  });
  const app = appBy.get(item.id);
  const source = sourceBy.get(item.id);
  if (!app || !source) {
    return finish('SKIP', 'SKIPPED_UNREGISTERED');
  }
  if (item.verification !== 'deployment' || item.ok !== true) {
    return finish('NOT_APPLICABLE', 'NOT_APPLICABLE', {
      status: 'NOT_APPLICABLE', reason: 'source is not a verified live deployment',
    });
  }

  try {
    const identity = await verifyDeploymentReleaseIdentity({ app, source, stats });
    if (identity.status === 'VERIFIED') {
      return finish('VERIFIED', identity.status, identity, undefined,
        `Release identity ${item.id}: VERIFIED ${identity.version} contract=${identity.contract} commit=${identity.sourceCommit} artifact=${identity.artifactDigest || identity.patchAssuranceSha256}`);
    }
    return finish('ABSENT', identity.status, identity, undefined,
      `Release identity ${item.id}: ABSENT (live deployment has no declared exact-release contract yet).`);
  } catch (error) {
    // A failed identity is never ignored, even when another worker succeeds.
    const errorMessage = error.message;
    return finish('FAILED', 'FAILED', {
      status: 'FAILED',
      contract: app?.releaseIdentity?.contract || app?.assurance?.schema || null,
      error: errorMessage,
    }, errorMessage, `Release identity ${item.id}: FAILED — ${errorMessage}`);
  }
}

async function worker() {
  while (nextIndex < entries.length) {
    // JS increments synchronously before awaiting; no app is verified twice.
    const index = nextIndex++;
    outcomes[index] = await verifyOne(entries[index]);
  }
}
await Promise.all(Array.from({ length: Math.min(concurrency, entries.length) }, () => worker()));

let verified = 0;
let absent = 0;
let failed = 0;
for (let index = 0; index < entries.length; index += 1) {
  const item = entries[index];
  const result = outcomes[index];
  timings.push(result.timing);
  if (result.kind !== 'SKIP') item.releaseIdentity = result.identity;
  if (result.kind === 'VERIFIED') verified += 1;
  if (result.kind === 'ABSENT') absent += 1;
  if (result.kind === 'FAILED') {
    failed += 1;
    item.ok = false;
    item.identityError = result.errorMessage;
  }
  // Deterministic logs, independent of the network response completion order.
  if (result.message) {
    if (result.kind === 'FAILED') console.error(result.message);
    else console.log(result.message);
  }
}

report.releaseIdentity = {
  verified,
  absent,
  failed,
  checkedAt: new Date().toISOString(),
};
await writeFile(path.join(cfg, 'sync-report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');

// Independent advisory evidence: never affect the existing fail-closed decision.
const timingReport = {
  schema: 'ghrab-release-identity-timing-v1',
  generatedAt: new Date().toISOString(),
  runnerGithubSha: process.env.GITHUB_SHA || null,
  totals: {
    checked: timings.length,
    verified, absent, failed,
    notApplicable: timings.filter((entry) => entry.status === 'NOT_APPLICABLE').length,
    skippedUnregistered: timings.filter((entry) => entry.status === 'SKIPPED_UNREGISTERED').length,
    durationMs: elapsedMs(startedAt),
    fetchRequests: timings.reduce((sum, entry) => sum + entry.fetchRequests, 0),
    fetchAttempts: timings.reduce((sum, entry) => sum + entry.fetchAttempts, 0),
    fetchRetries: timings.reduce((sum, entry) => sum + entry.fetchRetries, 0),
  },
  applications: timings,
};
try {
  const evidenceDir = path.join(root, 'qa-results');
  await mkdir(evidenceDir, { recursive: true });
  await writeFile(path.join(evidenceDir, 'release-identity-timing.json'),
    `${JSON.stringify(timingReport, null, 2)}\n`, 'utf8');
} catch (error) {
  console.warn(`Advisory release identity timing evidence not written: ${error.message}`);
}

if (failed) {
  console.error(`Release identity verification: FAIL (${failed} deploymentů selhalo, ${verified} ověřeno, ${absent} bez identity kontraktu).`);
  process.exit(1);
}
console.log(`Release identity verification: PASS (${verified} ověřeno, ${absent} live deploymentů zatím bez identity kontraktu).`);
