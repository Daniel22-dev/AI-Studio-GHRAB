#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import { evaluateAutoPromotion } from "./release-promotion.mjs";

const execFileAsync = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = async (p) => JSON.parse(await readFile(p, "utf8"));
const sha256 = (data) => createHash("sha256").update(data).digest("hex");

const [wave, apps, sources, policy] = await Promise.all([
  readJson(path.join(root, "src/config/release-wave.json")),
  readJson(path.join(root, "src/config/apps.generated.json")),
  readJson(path.join(root, "src/config/sources.json")),
  readJson(path.join(root, "src/config/release-promotion-policy.json")),
]);

const appId = "essay-evaluator";
const waveApp = wave.applications.find((entry) => entry.id === appId);
const currentApp = apps.find((entry) => entry.id === appId);
const source = sources.find((entry) => entry.id === appId);
const policyEntry = policy.applications.find((entry) => entry.id === appId);
assert.ok(waveApp && currentApp && source && policyEntry, "essay-evaluator auto-patch fixtures must exist");

const reportFor = (version, identity = undefined) => ({
  id: appId,
  ok: true,
  verification: "deployment",
  repository: source.repository,
  version,
  sourceVersion: version,
  operationsWarning: null,
  ...(identity ? { releaseIdentity: identity } : {}),
});

const identityFor = (version) => ({
  status: "VERIFIED",
  contract: "ghrab-release-integrity-v2",
  appId,
  version,
  assuranceMode: "TRANSITIONAL",
  sourceCommit: "a".repeat(40),
  artifactDigest: "b".repeat(64),
  manifestSha256: "c".repeat(64),
  sbomSha256: "d".repeat(64),
  buildProvenanceSha256: "e".repeat(64),
  evidenceManifestSha256: "f".repeat(64),
});

const duplicateDecision = evaluateAutoPromotion({
  app: structuredClone(currentApp),
  waveApp: structuredClone(waveApp),
  source,
  sourceReport: reportFor(waveApp.version),
  policyEntry,
  wave,
  enabled: true,
});
assert.equal(duplicateDecision.status, "CURRENT", "identical already-accepted dispatch must be a NO-OP");

const [major, minor, patch] = waveApp.version.split(".").map(Number);
const nextVersion = `${major}.${minor}.${patch + 1}`;
const nextApp = structuredClone(currentApp);
nextApp.version = nextVersion;
if (nextApp.platform?.cacheName) nextApp.platform.cacheName = `ghrab-${appId}-v${nextVersion}`;

const firstDecision = evaluateAutoPromotion({
  app: nextApp,
  waveApp: structuredClone(waveApp),
  source,
  sourceReport: reportFor(nextVersion, identityFor(nextVersion)),
  policyEntry,
  wave,
  enabled: true,
});
assert.equal(firstDecision.status, "ELIGIBLE", "first higher patch must be eligible");

const afterFirstWave = { ...waveApp, version: nextVersion };
const queuedDuplicateDecision = evaluateAutoPromotion({
  app: nextApp,
  waveApp: afterFirstWave,
  source,
  sourceReport: reportFor(nextVersion, identityFor(nextVersion)),
  policyEntry,
  wave,
  enabled: true,
});
assert.equal(
  queuedDuplicateDecision.status,
  "CURRENT",
  "queued concurrent duplicate must become CURRENT after the first promotion",
);

const workflowText = await readFile(path.join(root, ".github/workflows/auto-patch-ingest.yml"), "utf8");
assert.match(workflowText, /group:\s*ai-studio-auto-patch-ingest/, "auto-patch workflow must serialize ingests");
assert.match(workflowText, /cancel-in-progress:\s*false/, "queued duplicate must not cancel the active ingest");
assert.match(
  workflowText,
  /remote_candidate[\s\S]*BASE_SHA[\s\S]*refusing stale persistence/,
  "workflow must retain stale-candidate fail-closed persistence guard",
);

const tmp = await mkdtemp(path.join(os.tmpdir(), "ghrab-auto-patch-idempotence-"));
try {
  const wavePath = path.join(tmp, "release-wave.json");
  const appsPath = path.join(tmp, "apps.generated.json");
  const policyPath = path.join(tmp, "release-promotion-policy.json");
  const reportPath = path.join(tmp, "release-promotion-report.json");
  await Promise.all([
    writeFile(wavePath, JSON.stringify(wave, null, 2) + "\n"),
    writeFile(appsPath, JSON.stringify(apps, null, 2) + "\n"),
    writeFile(policyPath, JSON.stringify(policy, null, 2) + "\n"),
    writeFile(
      reportPath,
      JSON.stringify(
        {
          schema: "ghrab-release-promotion-report-v1",
          autoPromotionEnabled: true,
          sourceVerificationRequired: true,
          gateErrors: [],
          releaseWave: wave.wave,
          platformVersion: wave.platformVersion,
          decisions: [
            {
              appId,
              status: "CURRENT",
              change: "same",
              fromVersion: waveApp.version,
              toVersion: waveApp.version,
              verification: "deployment",
              reasonCode: "CURRENT",
            },
          ],
        },
        null,
        2,
      ) + "\n",
    ),
  ]);

  const before = sha256(await readFile(wavePath));
  const applyScript = path.join(root, "scripts/apply-auto-promotions.mjs");
  const args = [applyScript, reportPath, wavePath, appsPath, policyPath];
  const [runA, runB] = await Promise.all([
    execFileAsync(process.execPath, args, { cwd: root }),
    execFileAsync(process.execPath, args, { cwd: root }),
  ]);
  assert.match(runA.stdout, /release wave unchanged/i);
  assert.match(runB.stdout, /release wave unchanged/i);
  const after = sha256(await readFile(wavePath));
  assert.equal(after, before, "two concurrent duplicate NO-OP applies must not mutate release-wave");
} finally {
  await rm(tmp, { recursive: true, force: true });
}

console.log(
  `Auto-patch idempotence tests: PASS (${appId} duplicate=CURRENT; concurrent duplicate=serialized/NO-OP; wave unchanged).`,
);
