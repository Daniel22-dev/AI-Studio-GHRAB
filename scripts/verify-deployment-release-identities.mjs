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
let verified = 0;
let absent = 0;
let failed = 0;

for (const item of report.sources || []) {
  const appStartedAt = performance.now();
  const stats = { requests: 0, attempts: 0, retries: 0 };
  const recordTiming = (status) => timings.push({
    appId: item.id,
    status,
    durationMs: elapsedMs(appStartedAt),
    fetchRequests: stats.requests,
    fetchAttempts: stats.attempts,
    fetchRetries: stats.retries,
  });
  const app = appBy.get(item.id);
  const source = sourceBy.get(item.id);
  if (!app || !source) {
    recordTiming('SKIPPED_UNREGISTERED');
    continue;
  }
  if (item.verification !== 'deployment' || item.ok !== true) {
    item.releaseIdentity = { status: 'NOT_APPLICABLE', reason: 'source is not a verified live deployment' };
    recordTiming('NOT_APPLICABLE');
    continue;
  }
  try {
    const identity = await verifyDeploymentReleaseIdentity({ app, source, stats });
    item.releaseIdentity = identity;
    if (identity.status === 'VERIFIED') {
      verified += 1;
      console.log(`Release identity ${item.id}: VERIFIED ${identity.version} contract=${identity.contract} commit=${identity.sourceCommit} artifact=${identity.artifactDigest || identity.patchAssuranceSha256}`);
    } else {
      absent += 1;
      console.log(`Release identity ${item.id}: ABSENT (live deployment has no declared exact-release contract yet).`);
    }
  } catch (error) {
    failed += 1;
    item.releaseIdentity = {
      status: 'FAILED',
      contract: app?.releaseIdentity?.contract || app?.assurance?.schema || null,
      error: error.message,
    };
    item.ok = false;
    item.identityError = error.message;
    console.error(`Release identity ${item.id}: FAILED — ${error.message}`);
  } finally {
    recordTiming(item.releaseIdentity.status);
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
