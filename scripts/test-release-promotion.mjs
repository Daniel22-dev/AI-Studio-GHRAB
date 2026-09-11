#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  classifyVersionChange,
  evaluateAutoPromotion,
  validatePromotionPolicy,
} from "./release-promotion.mjs";

const wave = { platformVersion: "1.1.2", requiredPlatformRange: ">=1.1.2 <2.0.0" };
const policyEntry = {
  id: "correspondence",
  mode: "auto-patch",
  minimumVersion: "5.10.25",
  assuranceBaseline: "GARP-2.5.1-SHIELD-PREP",
  requiredVerification: "deployment",
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
  compatibility: { platformRange: ">=1.1.2 <2.0.0" },
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
assert.equal(decide({ sourceReport: { ...baseReport, operationsWarning: "operations mismatch" } }).reasonCode, "AI_OPERATIONS_UNVERIFIED");
assert.equal(decide({ waveApp: { id: "correspondence", version: "5.10.24" } }).reasonCode, "PRE_GARP_BASELINE");

console.log("Release promotion policy tests: PASS (stable patch only, live deployment only, GARP-enrolled, fail-closed). ");
