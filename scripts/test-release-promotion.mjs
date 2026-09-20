#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  classifyVersionChange,
  compareVersions,
  evaluateAutoPromotion,
  evaluateRepositoryFallback,
  isPendingRepositoryCandidate,
  validatePromotionPolicy,
  normalizeStudioBridge,
} from "./release-promotion.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const actualPolicy = JSON.parse(readFileSync(path.join(root, "src", "config", "release-promotion-policy.json"), "utf8"));
const actualWave = JSON.parse(readFileSync(path.join(root, "src", "config", "release-wave.json"), "utf8"));
const actualEntries = new Map((actualPolicy.applications || []).map((entry) => [entry.id, entry]));
const actualWaveEntries = new Map((actualWave.applications || []).map((entry) => [entry.id, entry]));
const actualApps = JSON.parse(readFileSync(path.join(root, "src", "config", "apps.generated.json"), "utf8"));
const actualSources = JSON.parse(readFileSync(path.join(root, "src", "config", "sources.json"), "utf8"));

const wave = { platformVersion: "1.1.2", requiredPlatformRange: ">=1.1.2 <2.0.0" };
const policyEntry = {
  id: "correspondence",
  mode: "auto-patch",
  minimumVersion: "5.10.25",
  assuranceBaseline: "GARP-2.5.1-SHIELD-PREP",
  requiredVerification: "deployment",
  expectedStudioBridge: "v2",
};
const source = { id: "correspondence", repository: "daniel22-dev/korespondencni-asistent" };
const baseApp = {
  id: "correspondence",
  version: "5.10.26",
  repository: "daniel22-dev/korespondencni-asistent",
  platform: {
    contract: "ghrab-platform-v1",
    platformVersion: "1.1.2",
    requiredPlatformRange: ">=1.1.2 <2.0.0",
    storagePrefix: "ghrab.correspondence.",
    cacheName: "ghrab-correspondence-v5.10.26",
    studioBridge: 2,
    artifactEnvelope: 1,
  },
  compatibility: { platformRange: ">=1.1.2 <2.0.0", studioBridge: "2.0" },
  aiCore: { serverReady: true },
};
const baseReport = {
  id: "correspondence",
  ok: true,
  verification: "deployment",
  repository: "daniel22-dev/korespondencni-asistent",
  version: "5.10.26",
  sourceVersion: "5.10.26",
  operationsWarning: null,
};
const decide = (overrides = {}) => evaluateAutoPromotion({
  app: structuredClone(overrides.app || baseApp),
  waveApp: overrides.waveApp || { id: "correspondence", version: "5.10.25" },
  source: overrides.source || source,
  sourceReport: overrides.sourceReport || baseReport,
  policyEntry: Object.prototype.hasOwnProperty.call(overrides, "policyEntry") ? overrides.policyEntry : policyEntry,
  wave: overrides.wave || wave,
  enabled: Object.prototype.hasOwnProperty.call(overrides, "enabled") ? overrides.enabled : true,
});

const verifiedV2IdentityFixture = (appId, version) => ({
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

assert.equal(classifyVersionChange("5.10.25", "5.10.25"), "same");
assert.equal(classifyVersionChange("5.10.25", "5.10.26"), "patch");
assert.equal(classifyVersionChange("5.10.25", "5.11.0"), "minor");
assert.equal(classifyVersionChange("5.10.25", "6.0.0"), "major");
assert.equal(classifyVersionChange("5.10.25", "5.10.24"), "rollback");
assert.equal(classifyVersionChange("5.10.25", "5.10.26-beta.1"), "invalid");
assert.equal(normalizeStudioBridge(2), "v2");
assert.equal(normalizeStudioBridge("2.0"), "v2");
assert.equal(normalizeStudioBridge("not-applicable"), "not-applicable");
assert.equal(normalizeStudioBridge("v1"), null);
assert.equal(
  evaluateRepositoryFallback({ waveVersion: "7.1.40", candidateVersion: "7.1.40" }).status,
  "CURRENT",
);
assert.deepEqual(
  evaluateRepositoryFallback({ waveVersion: "7.1.40", candidateVersion: "7.1.41" }),
  {
    status: "PIN_WAVE",
    reasonCode: "SOURCE_CANDIDATE_PENDING_RELEASE",
    reason:
      "Repository contains a newer source candidate, but repository verification is not deployment evidence. Keep the accepted release-wave baseline until deployment or explicit manual reconciliation.",
  },
);
assert.equal(
  evaluateRepositoryFallback({ waveVersion: "7.1.40", candidateVersion: "7.1.39" }).reasonCode,
  "SOURCE_BEHIND_WAVE",
);
assert.equal(
  evaluateRepositoryFallback({ waveVersion: "7.1.40", candidateVersion: "7.1.41-beta.1" }).reasonCode,
  "INVALID_SOURCE_VERSION",
);
const pendingRepositorySource = {
  verification: "repository",
  registryPinned: true,
  pendingReleaseCandidate: true,
  releaseWaveVersion: "7.1.40",
  version: "7.1.40",
  sourceVersion: "7.1.41",
};
assert.equal(isPendingRepositoryCandidate(pendingRepositorySource, "7.1.40"), true);
assert.equal(isPendingRepositoryCandidate({ ...pendingRepositorySource, verification: "deployment" }, "7.1.40"), false);
assert.equal(isPendingRepositoryCandidate({ ...pendingRepositorySource, registryPinned: false }, "7.1.40"), false);
assert.equal(isPendingRepositoryCandidate({ ...pendingRepositorySource, sourceVersion: "7.1.40" }, "7.1.40"), false);
assert.equal(isPendingRepositoryCandidate({ ...pendingRepositorySource, sourceVersion: "7.1.39" }, "7.1.40"), false);

assert.deepEqual(validatePromotionPolicy(actualPolicy, ["generator", "differentiator", "essay-evaluator", "correspondence", "ludus", "activity-builder", "sortio", "lesson-hub", "maturita-desk"]), []);
assert.deepEqual(actualPolicy.applications.map((entry) => entry.id), ["generator", "correspondence", "differentiator", "essay-evaluator", "ludus", "activity-builder", "sortio", "lesson-hub"]);
const generatorMinimumVersion = actualEntries.get("generator")?.minimumVersion;
const generatorWaveVersion = actualWaveEntries.get("generator")?.version;
assert.equal(generatorMinimumVersion, "7.1.40");
assert.equal(actualEntries.get("generator")?.expectedStudioBridge, "v2");
assert.equal(actualEntries.get("generator")?.requiredEvidenceContract, "ghrab-release-integrity-v2");
const generatorBaselineComparison = compareVersions(generatorWaveVersion, generatorMinimumVersion);
assert.notEqual(generatorBaselineComparison, null, "generator: release-wave/minimum must be stable SemVer");
assert.ok(generatorBaselineComparison >= 0, `generator: release-wave ${generatorWaveVersion} must not precede reviewed minimum ${generatorMinimumVersion}`);
assert.ok(
  ["same", "patch"].includes(classifyVersionChange(generatorMinimumVersion, generatorWaveVersion)),
  `generator: release-wave ${generatorWaveVersion} must stay on the reviewed 7.1.x patch line`,
);
assert.equal(actualEntries.get("correspondence")?.minimumVersion, "5.10.25");
const differentiatorMinimumVersion = actualEntries.get("differentiator")?.minimumVersion;
const differentiatorWaveVersion = actualWaveEntries.get("differentiator")?.version;
assert.equal(differentiatorMinimumVersion, "1.3.47");
assert.equal(actualEntries.get("differentiator")?.expectedStudioBridge, "v2");
assert.equal(actualEntries.get("differentiator")?.requiredEvidenceContract, "ghrab-release-integrity-v2");
const differentiatorBaselineComparison = compareVersions(differentiatorWaveVersion, differentiatorMinimumVersion);
assert.notEqual(differentiatorBaselineComparison, null, "differentiator: release-wave/minimum must be stable SemVer");
assert.ok(differentiatorBaselineComparison >= 0, `differentiator: release-wave ${differentiatorWaveVersion} must not precede reviewed minimum ${differentiatorMinimumVersion}`);
assert.ok(
  ["same", "patch"].includes(classifyVersionChange(differentiatorMinimumVersion, differentiatorWaveVersion)),
  `differentiator: release-wave ${differentiatorWaveVersion} must stay on the reviewed 1.3.x patch line`,
);
assert.equal(actualEntries.get("correspondence")?.expectedStudioBridge, "v2");
assert.equal(actualEntries.get("essay-evaluator")?.minimumVersion, "1.5.25");
assert.equal(actualEntries.get("essay-evaluator")?.expectedStudioBridge, "not-applicable");
assert.equal(actualEntries.get("ludus")?.minimumVersion, "1.16.23");
assert.equal(actualEntries.get("ludus")?.expectedStudioBridge, "v2");
assert.equal(actualEntries.get("activity-builder")?.minimumVersion, "0.5.27");
assert.equal(actualEntries.get("activity-builder")?.expectedStudioBridge, "v2");
assert.equal(actualEntries.get("sortio")?.minimumVersion, "1.1.17");
assert.equal(actualEntries.get("sortio")?.expectedStudioBridge, "not-applicable");
assert.equal(actualEntries.get("lesson-hub")?.minimumVersion, "1.2.23");
assert.equal(actualEntries.get("lesson-hub")?.expectedStudioBridge, "v2");
assert.equal(actualEntries.get("lesson-hub")?.requiredEvidenceContract, "ghrab-release-integrity-v2");
assert.equal(actualWaveEntries.get("lesson-hub")?.version, "1.2.23");
assert.equal(actualEntries.has("maturita-desk"), false);


for (const [appId, version] of [
  ["maturita-desk", "1.0.3"],
]) {
  assert.equal(actualWaveEntries.get(appId)?.version, version, `${appId}: manual release-wave baseline must match the explicitly accepted version`);
  assert.equal(actualApps.find((app) => app.id === appId)?.version, version, `${appId}: registry must match the manual release-wave baseline`);
}

for (const entry of actualPolicy.applications) {
  const registryApp = actualApps.find((app) => app.id === entry.id);
  const sourceConfig = actualSources.find((item) => item.id === entry.id);
  const acceptedVersion = actualWaveEntries.get(entry.id)?.version;
  assert.ok(registryApp, `${entry.id}: current app registry entry missing`);
  assert.ok(sourceConfig, `${entry.id}: source registry entry missing`);
  assert.ok(acceptedVersion, `${entry.id}: accepted release-wave baseline missing`);
  const current = structuredClone(registryApp);
  current.version = acceptedVersion;
  current.platform = { ...current.platform, cacheName: `ghrab-${entry.id}-v${acceptedVersion}` };
  const currentVsMinimum = compareVersions(current.version, entry.minimumVersion);
  assert.notEqual(currentVsMinimum, null, `${entry.id}: current/minimum version must be stable SemVer`);
  assert.ok(currentVsMinimum >= 0, `${entry.id}: accepted baseline must not be below reviewed enrollment minimum`);
  const [major, minor, patch] = current.version.split(".").map(Number);
  const nextVersion = `${major}.${minor}.${patch + 1}`;
  const candidate = structuredClone(current);
  candidate.version = nextVersion;
  candidate.platform = { ...candidate.platform, cacheName: `ghrab-${entry.id}-v${nextVersion}` };
  const report = {
    id: entry.id,
    ok: true,
    verification: "deployment",
    repository: sourceConfig.repository,
    version: nextVersion,
    sourceVersion: nextVersion,
    operationsWarning: null,
    ...(entry.requiredEvidenceContract === "ghrab-release-integrity-v2"
      ? { releaseIdentity: verifiedV2IdentityFixture(entry.id, nextVersion) }
      : {}),
  };
  const decision = evaluateAutoPromotion({
    app: candidate,
    waveApp: { id: entry.id, version: current.version },
    source: sourceConfig,
    sourceReport: report,
    policyEntry: entry,
    wave,
    enabled: true,
  });
  assert.equal(decision.status, "ELIGIBLE", `${entry.id}: reviewed baseline must allow a contract-identical next patch`);
}

const generatorRegistry = actualApps.find((app) => app.id === "generator");
const generatorSource = actualSources.find((item) => item.id === "generator");
const generatorPolicy = actualEntries.get("generator");
assert.ok(generatorRegistry && generatorSource && generatorPolicy, "generator: policy/source/registry fixture missing");
const generatorCandidate = structuredClone(generatorRegistry);
generatorCandidate.version = "7.1.41";
generatorCandidate.platform = { ...generatorCandidate.platform, cacheName: "ghrab-generator-v7.1.41" };
const generatorReport = {
  id: "generator",
  ok: true,
  verification: "deployment",
  repository: generatorSource.repository,
  version: "7.1.41",
  sourceVersion: "7.1.41",
  operationsWarning: null,
  releaseIdentity: verifiedV2IdentityFixture("generator", "7.1.41"),
};
const generatorDecide = (app = generatorCandidate, report = generatorReport) => evaluateAutoPromotion({
  app,
  waveApp: { id: "generator", version: "7.1.40" },
  source: generatorSource,
  sourceReport: report,
  policyEntry: generatorPolicy,
  wave,
  enabled: true,
});
assert.equal(generatorDecide().status, "ELIGIBLE");
assert.equal(
  generatorDecide(generatorCandidate, { ...generatorReport, releaseIdentity: undefined }).reasonCode,
  "RELEASE_IDENTITY_UNVERIFIED",
);
for (const blockedVersion of ["7.2.0", "8.0.0"]) {
  const app = structuredClone(generatorCandidate);
  app.version = blockedVersion;
  app.platform.cacheName = `ghrab-generator-v${blockedVersion}`;
  const report = { ...generatorReport, version: blockedVersion, sourceVersion: blockedVersion };
  assert.equal(generatorDecide(app, report).reasonCode, "NON_PATCH_CHANGE");
}
{
  const app = structuredClone(generatorCandidate);
  app.version = "7.1.39";
  app.platform.cacheName = "ghrab-generator-v7.1.39";
  const report = { ...generatorReport, version: "7.1.39", sourceVersion: "7.1.39" };
  assert.equal(generatorDecide(app, report).reasonCode, "ROLLBACK");
}
assert.equal(generatorDecide(generatorCandidate, { ...generatorReport, repository: "attacker/repo" }).reasonCode, "REPOSITORY_IDENTITY");
{
  const app = structuredClone(generatorCandidate);
  app.platform.studioBridge = "not-applicable";
  app.compatibility = { ...app.compatibility, studioBridge: "not-applicable" };
  assert.equal(generatorDecide(app).reasonCode, "STUDIO_BRIDGE");
}

assert.deepEqual(validatePromotionPolicy({
  schema: "ghrab-release-promotion-policy-v1",
  mode: "transitional",
  atomic: true,
  defaultMode: "manual",
  applications: [policyEntry],
}, ["correspondence"]), []);

assert.equal(decide().status, "ELIGIBLE");
assert.equal(decide({ enabled: false }).reasonCode, "AUTO_PROMOTION_DISABLED");
assert.equal(decide({ policyEntry: null }).reasonCode, "NOT_ENROLLED");
assert.equal(decide({ waveApp: { id: "correspondence", version: "5.10.26" }, app: { ...baseApp, version: "5.10.26" } }).status, "CURRENT");
assert.equal(
  decide({
    waveApp: { id: "correspondence", version: "5.10.26" },
    app: { ...baseApp, version: "5.10.26" },
    sourceReport: {
      ...baseReport,
      verification: "repository",
      version: "5.10.26",
      sourceVersion: "5.10.27",
      registryPinned: true,
      pendingReleaseCandidate: true,
      releaseWaveVersion: "5.10.26",
    },
  }).reasonCode,
  "SOURCE_CANDIDATE_PENDING_RELEASE",
);
assert.equal(decide({ app: { ...baseApp, version: "5.11.0", platform: { ...baseApp.platform, cacheName: "ghrab-correspondence-v5.11.0" } }, sourceReport: { ...baseReport, version: "5.11.0", sourceVersion: "5.11.0" } }).reasonCode, "NON_PATCH_CHANGE");
assert.equal(decide({ app: { ...baseApp, version: "6.0.0", platform: { ...baseApp.platform, cacheName: "ghrab-correspondence-v6.0.0" } }, sourceReport: { ...baseReport, version: "6.0.0", sourceVersion: "6.0.0" } }).reasonCode, "NON_PATCH_CHANGE");
assert.equal(decide({ app: { ...baseApp, version: "5.10.24", platform: { ...baseApp.platform, cacheName: "ghrab-correspondence-v5.10.24" } }, sourceReport: { ...baseReport, version: "5.10.24", sourceVersion: "5.10.24" } }).reasonCode, "ROLLBACK");
assert.equal(decide({ sourceReport: { ...baseReport, verification: "repository" } }).reasonCode, "SOURCE_NOT_LIVE_DEPLOYMENT");
assert.equal(decide({ sourceReport: { ...baseReport, ok: false, verification: "snapshot" } }).reasonCode, "SOURCE_NOT_LIVE_DEPLOYMENT");
assert.equal(decide({ sourceReport: { ...baseReport, sourceVersion: "5.10.25" } }).reasonCode, "SOURCE_VERSION_DRIFT");
assert.equal(decide({ sourceReport: { ...baseReport, repository: "attacker/repo" } }).reasonCode, "REPOSITORY_IDENTITY");
assert.equal(decide({ app: { ...baseApp, platform: { ...baseApp.platform, platformVersion: "1.2.0" } } }).reasonCode, "PLATFORM_VERSION");
{
  const app = structuredClone(baseApp);
  delete app.platform.requiredPlatformRange;
  assert.equal(
    decide({ app }).reasonCode,
    "PLATFORM_RANGE",
    "manifest contract regression: missing requiredPlatformRange must block auto-patch",
  );
}
assert.equal(decide({ app: { ...baseApp, platform: { ...baseApp.platform, storagePrefix: "ghrab.other." } } }).reasonCode, "STORAGE_NAMESPACE");
assert.equal(decide({ app: { ...baseApp, platform: { ...baseApp.platform, studioBridge: "not-applicable" }, compatibility: { ...baseApp.compatibility, studioBridge: "not-applicable" } } }).reasonCode, "STUDIO_BRIDGE");
assert.equal(decide({ app: { ...baseApp, compatibility: { ...baseApp.compatibility, studioBridge: "not-applicable" } } }).reasonCode, "COMPATIBILITY_STUDIO_BRIDGE");
assert.equal(decide({ sourceReport: { ...baseReport, operationsWarning: "operations mismatch" } }).reasonCode, "AI_OPERATIONS_UNVERIFIED");
assert.equal(decide({ waveApp: { id: "correspondence", version: "5.10.24" } }).reasonCode, "PRE_GARP_BASELINE");

console.log("Release promotion policy tests: PASS (reviewed auto-patch baselines including Lesson Hub enrolled; stable patch only, live deployment only, fail-closed). ");