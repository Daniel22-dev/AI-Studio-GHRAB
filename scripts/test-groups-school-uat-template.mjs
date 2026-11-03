#!/usr/bin/env node
/**
 * Public-only, synthetic UAT template integrity gate.
 * This NEVER validates real school acceptance or grants release approval.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => JSON.parse(readFileSync(join(root, path), "utf8"));
const template = read("docs/groups-v2/uat-evidence-template.json");
const wave = read("src/config/release-wave.json");
const release = read("src/config/release-acceptance.json");

const ids = (prefix, start, count) =>
  Array.from({ length: count }, (_, i) => prefix + String(start + i).padStart(2, "0"));
const required = (object, expected, section) => {
  assert.deepEqual(Object.keys(object).sort(), [...expected].sort(), section + " inventory");
  assert.ok(Object.values(object).every((status) => status === "NOT_RUN"), section + " must remain NOT_RUN in the public template");
};

assert.equal(template.schema, "ghrab-groups-v2-school-uat-template-v1");
assert.equal(template.status, "NOT_RUN");
assert.equal(template.purpose, "SYNTHETIC_ONLY_SCHOOL_WITNESSED_UAT");
assert.equal(template.evidencePolicy, "COPY_TO_APPROVED_PRIVATE_SCHOOL_STORAGE_ONLY");
assert.equal(template.finalFiveAppSha, "REVERIFY_ALL_FIVE_ON_TEST_DAY");
required(template.prerequisites, ids("A", 1, 5), "Prerequisites");
required(template.scenarios, ids("U", 1, 11), "Scenarios");
required(template.approvals, ids("D", 1, 5), "Approvals");
required(template.physicalDevices, [
  "WINDOWS_CHROME",
  "WINDOWS_EDGE",
  "ANDROID_CHROME",
  "IPHONE_SAFARI",
  "IPAD_SAFARI_SPLIT_VIEW",
], "Devices");

for (const key of [
  "schoolDataControllerApproved",
  "backendTenantIsolationVerified",
  "managedProfilesExceptionApproved",
  "realTeacherABVerified",
  "legacyOwnerMigrationApproved",
  "oldServiceWorkerClearanceVerified",
  "productionReleaseAuthorized",
]) {
  assert.equal(template[key], false, key + " must not be preapproved");
}
assert.equal(template.noPersonalDataIncluded, true);
assert.equal(wave.policy.syntheticDataOnlyUntilWaveGreen, true);
assert.equal(release.primaryRuntime.currentUseApproved, false);

const source = JSON.stringify(template);
assert.doesNotMatch(source, /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i, "No e-mail addresses in public template");
assert.doesNotMatch(source, /"(?:studentName|studentEmail|accessToken|refreshToken|secret|password)"\s*:/i, "No student or credential fields in public template");

console.log("PASS: public-only Groups v2 UAT template is structurally valid; school UAT NOT RUN; production NO-GO.");
