#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const REFERENCE = "vendor/garp-2.7-consolidated-r2/MASTER/INVENTORY/ecosystem-apps.json";
const POLICY = "security/garp27/apps/conversation-lab/garp-policy.json";
const CAPABILITIES = "security/garp27/apps/conversation-lab/capability-inventory.json";
const EFFECTIVE = "security/garp27/ecosystem-apps.extended.json";
const ENROLLMENT = "security/garp27/conversation-lab-enrollment.json";
const APP_ID = "conversation-lab";
const SOURCE_REPO = "Daniel22-dev/conversation-lab-source";
const PINNED_BASE_GIT_BLOB = "ce32244daf3ea685d9d8e4defaea56a90790cde4";

export function gitBlobSha1(bytes) {
  const buffer = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  return crypto.createHash("sha1").update("blob " + buffer.length + "\0").update(buffer).digest("hex");
}

export function readSnapshot(root = ROOT) {
  const json = (name) => JSON.parse(fs.readFileSync(path.join(root, name), "utf8"));
  const registries = [
    "src/config/apps.generated.json",
    "src/config/apps.fallback.json",
    "src/config/apps.local.json",
    "src/config/sources.json",
    "src/config/release-wave.json",
    "src/config/release-promotion-policy.json",
    "src/config/platform-consumers.json"
  ];
  return {
    admission: json(ENROLLMENT),
    base: json(REFERENCE),
    extended: json(EFFECTIVE),
    policy: json(POLICY),
    capabilities: json(CAPABILITIES),
    policyBytes: fs.readFileSync(path.join(root, POLICY)),
    capabilityBytes: fs.readFileSync(path.join(root, CAPABILITIES)),
    baseBytes: fs.readFileSync(path.join(root, REFERENCE)),
    registries: Object.fromEntries(registries.map((name) => [name, json(name)]))
  };
}

export function evaluatePrelive(input) {
  const errors = [];
  const check = (ok, code) => { if (!ok) errors.push(code); };
  const a = input.admission ?? {};
  const b = input.base ?? {};
  const e = input.extended ?? {};
  const p = input.policy ?? {};
  const c = input.capabilities ?? {};
  const refApp = { appId: APP_ID, repository: SOURCE_REPO };
  const original = Array.isArray(b.apps) ? b.apps : [];
  const expanded = Array.isArray(e.apps) ? e.apps : [];

  check(a.schema === "ghrab-garp27-prelive-enrollment-v1", "registration-schema");
  check(a.garpVersion === "2.7" && a.appId === APP_ID && a.repository === SOURCE_REPO, "registration-identity");
  check(/^[a-f0-9]{40}$/.test(a.sourceRevision ?? ""), "source-revision");
  check(a.referenceInventory === REFERENCE && a.effectiveInventory === EFFECTIVE, "inventory-paths");
  check(a.policyMirror === POLICY && a.capabilityMirror === CAPABILITIES, "mirror-paths");
  check(a.sourcePolicyGitBlobSha1 === gitBlobSha1(input.policyBytes ?? ""), "policy-source-blob");
  check(a.sourceCapabilityGitBlobSha1 === gitBlobSha1(input.capabilityBytes ?? ""), "capability-source-blob");
  check(gitBlobSha1(input.baseBytes ?? "") === PINNED_BASE_GIT_BLOB, "immutable-reference-blob");
  check(b.schema === "garp27-ecosystem-app-inventory-v1" && b.garpVersion === "2.7", "canonical-reference-contract");
  check(original.length >= 10 && !original.some((x) => x.appId === APP_ID), "canonical-does-not-contain-unadmitted-app");
  check(e.schema === b.schema && e.garpVersion === b.garpVersion && e.revision === b.revision, "overlay-contract");
  check(
    expanded.length === original.length + 1 &&
    JSON.stringify(expanded.slice(0, original.length)) === JSON.stringify(original) &&
    JSON.stringify(expanded.at(-1)) === JSON.stringify(refApp),
    "overlay-adds-exactly-one-app"
  );
  check(
    new Set(expanded.map((x) => x.appId)).size === expanded.length &&
    expanded.every((x) => typeof x.appId === "string" && typeof x.repository === "string"),
    "overlay-unique-identities"
  );
  check(p.schema === "garp27-policy-v1" && p.garpVersion === "2.7" && p.appId === APP_ID && p.appVersion === "0.9.1", "mirrored-policy-identity");
  check(p.requestApiAi?.registeredOperations === 0 && p.requestApiAi?.agentic === false, "no-provider-operations");
  check(p.egress?.defaultDeny === true && JSON.stringify(p.egress?.allowedDestinations) === JSON.stringify(["same-origin"]), "same-origin-egress");
  check(p.release?.activeAuthority === "GARP-2.7", "single-active-garp-authority");
  check(c.schema === "garp27-clb-capability-draft-v1" && c.appId === APP_ID && c.appVersion === p.appVersion, "mirrored-capability-identity");
  check(c.publicPlayerIdentity === "anonymous-direct-open" && c.studioLaunchIdentity === "teacher-permit-checked-at-studio-only", "split-public-teacher-identity");
  check(
    Array.isArray(c.aiOperations) && c.aiOperations.length === 0 && c.agentic === false &&
    c.localStorage === false && c.sessionStorage === false && c.indexedDB === false &&
    c.uploads === false,
    "no-credentials-storage-ai-or-upload"
  );
  check(c.liveStatus === "NOT_TESTED" && c.futureServiceWorker === "disabled", "runtime-unverified");
  check(a.admission === "REGISTERED_PRELIVE_POLICY_ONLY" && a.garpLive === "NOT_TESTED", "no-live-certification");
  check(a.publicPlayer === "ANONYMOUS_READ_ONLY" && a.teacherStudioGate === "NOT_CONNECTED", "separate-public-studio-access");
  check(a.studioLauncher === "DISABLED" && a.publicOrigin === "NOT_VERIFIED", "launcher-not-active");
  check(a.publishedLessonCount === 0 && a.approvedGlossCount === 0, "no-claimed-content-approvals");
  check(
    a.publicDeployment === "NO_GO" &&
    a.autoPromotion === "DISABLED" &&
    a.crossRepositoryDispatch === "DISABLED",
    "promotion-deployment-dispatch-disabled"
  );
  const registryPaths = Object.keys(input.registries ?? {});
  check(registryPaths.length === 7, "runtime-registry-set-complete");
  for (const name of registryPaths) {
    const registry = input.registries[name];
    const entries = Array.isArray(registry) ? registry : registry?.applications;
    check(Array.isArray(entries) && !entries.some((x) => (x.id ?? x.appId) === APP_ID), "not-in-live-registry:" + name);
  }
  return errors;
}

function main() {
  const snap = readSnapshot();
  const errors = evaluatePrelive(snap);
  const vendored = path.join(ROOT, "vendor/garp-2.7-consolidated-r2");
  const args = [
    path.join(vendored, "MASTER/TOOLS/validate-policy.mjs"),
    path.join(ROOT, POLICY),
    "--core", path.join(vendored, "MASTER/CONTRACTS/garp27-core.json"),
    "--inventory", path.join(ROOT, EFFECTIVE)
  ];
  const validation = spawnSync(process.execPath, args, { cwd: ROOT, encoding: "utf8" });
  if (validation.status !== 0) errors.push("normative-garp27-g02-policy-validation");
  const result = {
    classification: "GARP27_CONVERSATION_LAB_PRELIVE_ADMISSION",
    status: errors.length ? "FAIL" : "PASS",
    scope: "POLICY_REGISTRATION_ONLY",
    appId: APP_ID,
    normativePolicyValidation: validation.status === 0 ? "PASS" : "FAIL",
    vendorReferenceIntact: !errors.includes("immutable-reference-blob"),
    live: "NOT_TESTED",
    publicDeployment: "NO_GO",
    studioLauncher: "DISABLED",
    autoPromotion: "DISABLED",
    issues: errors,
    validatorOutput: validation.status === 0 ? "GARP27 policy structurally admitted with Studio-local extension" : String(validation.stderr || validation.stdout || "").slice(0, 1400)
  };
  console.log(JSON.stringify(result, null, 2));
  if (errors.length) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
