#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  classifyVersionChange,
  evaluateAutoPromotion,
  validatePromotionPolicy,
  normalizeStudioBridge,
} from "./release-promotion.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const actualPolicy = JSON.parse(readFileSync(path.join(root, "src", "config", "release-promotion-policy.json"), "utf8"));
const actualEntries = new Map((actualPolicy.applications || []).map((entry) => [entry.id, entry]));
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

assert.deepEqual(validatePromotionPolicy(actualPolicy, ["generator", "differentiator", "essay-evaluator", "correspondence", "ludus", "activity-builder", "sortio", "lesson-hub", "maturita-desk"]), []);
assert.deepEqual(actualPolicy.applications.map((entry) => entry.id), ["correspondence", "essay-evaluator", "ludus"]);
assert.equal(actualEntries.get("correspondence")?.minimumVersion, "5.10.25");
assert.equal(actualEntries.get("correspondence")?.expectedStudioBridge, "v2");
assert.equal(actualEntries.get("essay-evaluator")?.minimumVersion, "1.5.25");
assert.equal(actualEntries.get("essay-evaluator")?.expectedStudioBridge, "not-applicable");
assert.equal(actualEntries.get("ludus")?.minimumVersion, "1.16.23");
assert.equal(actualEntries.get("ludus")?.expectedStudioBridge, "v2");
assert.equal(actualEntries.has("lesson-hub"), false);
assert.equal(actualEntries.has("differentiator"), false);
assert.equal(actualEntries.has("generator"), false);

for (const entry of actualPolicy.applications) {
  const current = actualApps.find((app) => app.id === entry.id);
  const sourceConfig = actualSources.find((item) => item.id === entry.id);
  assert.ok(current, `${entry.id}: current app registry entry missing`);
  assert.ok(sourceConfig, `${entry.id}: source registry entry missing`);
  assert.equal(current.version, entry.minimumVersion, `${entry.id}: enrollment minimum must match reviewed current baseline`);
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
assert.equal(decide({ app: { ...baseApp, version: "5.11.0", platform: { ...baseApp.platform, cacheName: "ghrab-correspondence-v5.11.0" } }, sourceReport: { ...baseReport, version: "5.11.0", sourceVersion: "5.11.0" } }).reasonCode, "NON_PATCH_CHANGE");
assert.equal(decide({ app: { ...baseApp, version: "6.0.0", platform: { ...baseApp.platform, cacheName: "ghrab-correspondence-v6.0.0" } }, sourceReport: { ...baseReport, version: "6.0.0", sourceVersion: "6.0.0" } }).reasonCode, "NON_PATCH_CHANGE");
assert.equal(decide({ app: { ...baseApp, version: "5.10.24", platform: { ...baseApp.platform, cacheName: "ghrab-correspondence-v5.10.24" } }, sourceReport: { ...baseReport, version: "5.10.24", sourceVersion: "5.10.24" } }).reasonCode, "ROLLBACK");
assert.equal(decide({ sourceReport: { ...baseReport, verification: "repository" } }).reasonCode, "SOURCE_NOT_LIVE_DEPLOYMENT");
assert.equal(decide({ sourceReport: { ...baseReport, ok: false, verification: "snapshot" } }).reasonCode, "SOURCE_NOT_LIVE_DEPLOYMENT");
assert.equal(decide({ sourceReport: { ...baseReport, sourceVersion: "5.10.25" } }).reasonCode, "SOURCE_VERSION_DRIFT");
assert.equal(decide({ sourceReport: { ...baseReport, repository: "attacker/repo" } }).reasonCode, "REPOSITORY_IDENTITY");
assert.equal(decide({ app: { ...baseApp, platform: { ...baseApp.platform, platformVersion: "1.2.0" } } }).reasonCode, "PLATFORM_VERSION");
assert.equal(decide({ app: { ...baseApp, platform: { ...baseApp.platform, storagePrefix: "ghrab.other." } } }).reasonCode, "STORAGE_NAMESPACE");
assert.equal(decide({ app: { ...baseApp, platform: { ...baseApp.platform, studioBridge: "not-applicable" }, compatibility: { ...baseApp.compatibility, studioBridge: "not-applicable" } } }).reasonCode, "STUDIO_BRIDGE");
assert.equal(decide({ app: { ...baseApp, compatibility: { ...baseApp.compatibility, studioBridge: "not-applicable" } } }).reasonCode, "COMPATIBILITY_STUDIO_BRIDGE");
assert.equal(decide({ sourceReport: { ...baseReport, operationsWarning: "operations mismatch" } }).reasonCode, "AI_OPERATIONS_UNVERIFIED");
assert.equal(decide({ waveApp: { id: "correspondence", version: "5.10.24" } }).reasonCode, "PRE_GARP_BASELINE");

console.log("Release promotion policy tests: PASS (stable patch only, live deployment only, GARP-enrolled, fail-closed). ");
