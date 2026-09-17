#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
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

const appBy = new Map((apps || []).map((app) => [app.id, app]));
const sourceBy = new Map((sources || []).map((source) => [source.id, source]));
let verified = 0;
let absent = 0;
let failed = 0;

for (const item of report.sources || []) {
  const app = appBy.get(item.id);
  const source = sourceBy.get(item.id);
  if (!app || !source) continue;
  if (item.verification !== 'deployment' || item.ok !== true) {
    item.releaseIdentity = { status: 'NOT_APPLICABLE', reason: 'source is not a verified live deployment' };
    continue;
  }
  try {
    const identity = await verifyDeploymentReleaseIdentity({ app, source });
    item.releaseIdentity = identity;
    if (identity.status === 'VERIFIED') {
      verified += 1;
      console.log(`Release identity ${item.id}: VERIFIED ${identity.version} commit=${identity.sourceCommit} artifact=${identity.artifactDigest}`);
    } else {
      absent += 1;
      console.log(`Release identity ${item.id}: ABSENT (live deployment has no declared exact-release contract yet).`);
    }
  } catch (error) {
    failed += 1;
    item.releaseIdentity = {
      status: 'FAILED',
      contract: app?.releaseIdentity?.contract || null,
      error: error.message,
    };
    item.ok = false;
    item.identityError = error.message;
    console.error(`Release identity ${item.id}: FAILED — ${error.message}`);
  }
}

report.releaseIdentity = {
  verified,
  absent,
  failed,
  checkedAt: new Date().toISOString(),
};
await writeFile(path.join(cfg, 'sync-report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');

if (failed) {
  console.error(`Release identity verification: FAIL (${failed} deploymentů selhalo, ${verified} ověřeno, ${absent} bez identity kontraktu).`);
  process.exit(1);
}
console.log(`Release identity verification: PASS (${verified} ověřeno, ${absent} live deploymentů zatím bez identity kontraktu).`);
