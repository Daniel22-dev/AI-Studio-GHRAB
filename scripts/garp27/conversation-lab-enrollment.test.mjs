#!/usr/bin/env node
import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluatePrelive, readSnapshot } from "./conversation-lab-enrollment.mjs";

const pristine = readSnapshot();
const errorsFor = (mutate) => {
  const sample = structuredClone(pristine);
  mutate(sample);
  return evaluatePrelive(sample);
};

test("original prelive enrollment passes every fail-closed invariant", () => {
  assert.deepEqual(evaluatePrelive(pristine), []);
});

const cases = [
  ["unexpected public Studio launcher", (x) => { x.admission.studioLauncher = "ENABLED"; }, "launcher-not-active"],
  ["incorrectly claimed LIVE GARP", (x) => { x.admission.garpLive = "PASS"; }, "no-live-certification"],
  ["unverified public origin promoted to verified", (x) => { x.admission.publicOrigin = "VERIFIED"; }, "launcher-not-active"],
  ["unapproved student materials issued", (x) => { x.admission.publishedLessonCount = 6; }, "no-claimed-content-approvals"],
  ["human glossary approval forged", (x) => { x.admission.approvedGlossCount = 222; }, "no-claimed-content-approvals"],
  ["automatic patch promotion prematurely enabled", (x) => { x.admission.autoPromotion = "ENABLED"; }, "promotion-deployment-dispatch-disabled"],
  ["cross repository dispatch enabled", (x) => { x.admission.crossRepositoryDispatch = "ENABLED"; }, "promotion-deployment-dispatch-disabled"],
  ["public deployment claimed complete", (x) => { x.admission.publicDeployment = "GO"; }, "promotion-deployment-dispatch-disabled"],
  ["Studio teacher access asserted without training gate", (x) => { x.admission.teacherStudioGate = "ENFORCED"; }, "separate-public-studio-access"],
  ["wrong private repository source", (x) => { x.admission.repository = "other/private-repo"; }, "registration-identity"],
  ["unexpected source policy modification", (x) => { x.policyBytes = Buffer.from("modified source policy"); }, "policy-source-blob"],
  ["mismatched source policy digest pin", (x) => { x.admission.sourcePolicyGitBlobSha1 = "0".repeat(40); }, "policy-source-blob"],
  ["source capabilities changed without proof", (x) => { x.capabilities.localStorage = true; }, "no-credentials-storage-ai-or-upload"],
  ["source capability digest pin changed", (x) => { x.admission.sourceCapabilityGitBlobSha1 = "0".repeat(40); }, "capability-source-blob"],
  ["canonical GARP reference touched", (x) => { x.baseBytes = Buffer.from("tamper"); }, "immutable-reference-blob"],
  ["invented additional app in overlay", (x) => { x.extended.apps.push({appId:"intruder",repository:"x/y"}); }, "overlay-adds-exactly-one-app"],
  ["reference inventory item reordered", (x) => { x.extended.apps.reverse(); }, "overlay-adds-exactly-one-app"],
  ["fake duplicate app identity", (x) => { x.extended.apps[0].appId = "conversation-lab"; }, "overlay-unique-identities"],
  ["private app prematurely added to published registry", (x) => { x.registries["src/config/apps.generated.json"].push({id:"conversation-lab"}); }, "not-in-live-registry:src/config/apps.generated.json"],
  ["private app prematurely enrolled for Studio Auto Promotion", (x) => { x.registries["src/config/release-promotion-policy.json"].applications.push({id:"conversation-lab"}); }, "not-in-live-registry:src/config/release-promotion-policy.json"],
  ["private app prematurely added to release wave", (x) => { x.registries["src/config/release-wave.json"].applications.push({id:"conversation-lab"}); }, "not-in-live-registry:src/config/release-wave.json"],
  ["removed active authority GARP 2.7", (x) => { x.policy.release.activeAuthority = "GARP-2.5.1"; }, "single-active-garp-authority"],
  ["provider API calls spuriously enabled", (x) => { x.policy.requestApiAi.registeredOperations = 1; }, "no-provider-operations"],
  ["public outgoing network destinations expanded", (x) => { x.policy.egress.allowedDestinations.push("https://api.example.org"); }, "same-origin-egress"],
  ["student login silently required", (x) => { x.capabilities.publicPlayerIdentity = "mandatory-login"; }, "split-public-teacher-identity"],
  ["live GARP reference falsely verified", (x) => { x.capabilities.liveStatus = "PASS"; }, "runtime-unverified"]
];

for (const [name, mutate, expected] of cases) {
  test("reject: " + name, () => {
    const errors = errorsFor(mutate);
    assert.ok(errors.includes(expected), "expected " + expected + ", observed " + errors.join(", "));
  });
}
