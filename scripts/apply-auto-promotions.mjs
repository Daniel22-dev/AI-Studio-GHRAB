#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const reportPath = path.resolve(root, process.argv[2] || "qa-results/release-promotion-report.json");
const wavePath = path.resolve(root, process.argv[3] || "src/config/release-wave.json");
const appsPath = path.resolve(root, process.argv[4] || "src/config/apps.generated.json");
const policyPath = path.resolve(root, process.argv[5] || "src/config/release-promotion-policy.json");

const readJson = (file) => readFile(file, "utf8").then(JSON.parse);
const [report, wave, apps, policy] = await Promise.all([
  readJson(reportPath),
  readJson(wavePath),
  readJson(appsPath),
  readJson(policyPath),
]);

const SHA256 = /^[a-f0-9]{64}$/i;
const COMMIT = /^[a-f0-9]{40}$/i;
const REQUIRED_ASSURANCE_ARTIFACTS = [
  "securityEvidenceManifest",
  "sourceSbom",
  "deploymentSbom",
  "aiAssuranceFingerprint",
];

const fail = (message) => {
  console.error(`AUTO-PROMOTION APPLY: FAIL - ${message}`);
  process.exit(1);
};
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
const sameAppPrefix = (candidate, launchUrl) => {
  try {
    const candidateUrl = new URL(candidate);
    const base = new URL(".", launchUrl);
    return candidateUrl.protocol === "https:" && candidateUrl.href.startsWith(base.href);
  } catch {
    return false;
  }
};
const fetchBytes = async (url, timeoutMs = 15000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
      headers: { "user-agent": "AI-Studio-GHRAB-patch-assurance" },
    });
    if (!response.ok) fail(`${url}: HTTP ${response.status}`);
    return Buffer.from(await response.arrayBuffer());
  } catch (error) {
    fail(`${url}: ${error.message}`);
  } finally {
    clearTimeout(timer);
  }
};
const parseJsonBytes = (bytes, label, appId) => {
  try {
    return JSON.parse(bytes.toString("utf8"));
  } catch {
    fail(`${appId}: ${label} neni validni JSON`);
  }
};

if (report?.schema !== "ghrab-release-promotion-report-v1") fail("neplatne schema promotion reportu");
if (report?.autoPromotionEnabled !== true) fail("promotion report nema povolene auto-promotion");
if (report?.sourceVerificationRequired !== true) fail("promotion report nevychazi z povinneho overeni zdroju");
if (!Array.isArray(report?.gateErrors)) fail("promotion report nema gateErrors pole");
if (report.gateErrors.length) fail(`promotion gate obsahuje ${report.gateErrors.length} chybu/chyb`);
if (wave?.schema !== "ghrab-platform-release-wave-v1") fail("neplatne schema release wave");
if (wave?.wave !== report?.releaseWave) fail("promotion report patri k jine release wave");
if (wave?.platformVersion !== report?.platformVersion) fail("promotion report patri k jine platformni verzi");
if (!Array.isArray(wave?.applications)) fail("release wave nema applications pole");
if (!Array.isArray(report?.decisions)) fail("promotion report nema decisions pole");
if (!Array.isArray(apps)) fail("apps.generated neni pole");
if (!Array.isArray(policy?.applications)) fail("release promotion policy nema applications pole");

const eligible = report.decisions.filter((decision) => decision?.status === "ELIGIBLE");
if (!eligible.length) {
  console.log("AUTO-PROMOTION APPLY: no eligible patch promotions; release wave unchanged.");
  process.exit(0);
}

const waveById = new Map(wave.applications.map((entry) => [entry?.id, entry]));
const appById = new Map(apps.map((entry) => [entry?.id, entry]));
const policyById = new Map(policy.applications.map((entry) => [entry?.id, entry]));
const seen = new Set();
for (const decision of eligible) {
  if (!decision?.appId || seen.has(decision.appId)) fail(`chybi nebo je duplicitni appId ${decision?.appId || "?"}`);
  seen.add(decision.appId);
  if (decision.change !== "patch") fail(`${decision.appId}: povolena je pouze patch promotion`);
  if (decision.reasonCode !== "SAFE_PATCH_DEPLOYMENT") fail(`${decision.appId}: neocekavany reasonCode ${decision.reasonCode || "?"}`);
  if (decision.verification !== "deployment") fail(`${decision.appId}: chybi live deployment verification`);
  const entry = waveById.get(decision.appId);
  if (!entry) fail(`${decision.appId}: chybi v release wave`);
  if (entry.version !== decision.fromVersion) {
    fail(`${decision.appId}: release wave drift (${entry.version || "?"} != ${decision.fromVersion || "?"})`);
  }
  if (!/^\d+\.\d+\.\d+$/.test(String(decision.toVersion || ""))) fail(`${decision.appId}: cilova verze neni stabilni SemVer`);

  const policyEntry = policyById.get(decision.appId);
  const requiredEvidenceContract = policyEntry?.requiredEvidenceContract || null;
  if (!requiredEvidenceContract) continue;
  if (requiredEvidenceContract !== "ghrab-patch-assurance-v1") {
    fail(`${decision.appId}: neznamy requiredEvidenceContract ${requiredEvidenceContract}`);
  }

  const app = appById.get(decision.appId);
  if (!app) fail(`${decision.appId}: candidate chybi v apps.generated`);
  if (app.version !== decision.toVersion) fail(`${decision.appId}: apps.generated candidate version drift`);
  const assurance = app.assurance;
  if (!assurance || assurance.schema !== requiredEvidenceContract) {
    fail(`${decision.appId}: candidate nema ${requiredEvidenceContract}`);
  }
  if (!sameAppPrefix(assurance.evidenceManifestUrl, app.launchUrl)) {
    fail(`${decision.appId}: evidenceManifestUrl neni HTTPS pod prefixem aplikace`);
  }
  if (!SHA256.test(String(assurance.evidenceManifestSha256 || ""))) {
    fail(`${decision.appId}: evidence manifest nema platny SHA-256`);
  }

  const assuranceBytes = await fetchBytes(assurance.evidenceManifestUrl);
  const assuranceDigest = digest(assuranceBytes);
  if (assuranceDigest !== assurance.evidenceManifestSha256) {
    fail(`${decision.appId}: patch assurance manifest SHA-256 mismatch`);
  }
  const assuranceManifest = parseJsonBytes(assuranceBytes, "patch assurance manifest", decision.appId);
  if (assuranceManifest?.schema !== "ghrab-patch-assurance-manifest-v1") {
    fail(`${decision.appId}: patch assurance manifest ma neplatne schema`);
  }
  if (assuranceManifest?.appId !== decision.appId || assuranceManifest?.version !== decision.toVersion) {
    fail(`${decision.appId}: patch assurance manifest neodpovida candidate verzi`);
  }
  if (!COMMIT.test(String(assuranceManifest?.sourceRevision || ""))) {
    fail(`${decision.appId}: patch assurance manifest nema platny sourceRevision commit`);
  }

  for (const name of REQUIRED_ASSURANCE_ARTIFACTS) {
    const artifact = assuranceManifest?.artifacts?.[name];
    if (!artifact || typeof artifact !== "object") fail(`${decision.appId}: chybi assurance artifact ${name}`);
    if (!sameAppPrefix(artifact.url, app.launchUrl)) fail(`${decision.appId}: ${name} URL neni HTTPS pod prefixem aplikace`);
    if (!SHA256.test(String(artifact.sha256 || ""))) fail(`${decision.appId}: ${name} nema platny SHA-256`);

    const bytes = await fetchBytes(artifact.url);
    if (digest(bytes) !== artifact.sha256) fail(`${decision.appId}: ${name} SHA-256 mismatch`);
    const document = parseJsonBytes(bytes, name, decision.appId);

    if (name === "securityEvidenceManifest") {
      if (document?.schema !== "ghrab-security-evidence-manifest-v2") fail(`${decision.appId}: security evidence manifest nema schema v2`);
      if (document?.appId !== decision.appId || document?.version !== decision.toVersion) fail(`${decision.appId}: security evidence manifest neodpovida candidate verzi`);
    } else if (name === "sourceSbom" || name === "deploymentSbom") {
      if (document?.bomFormat !== "CycloneDX") fail(`${decision.appId}: ${name} neni CycloneDX SBOM`);
      const componentVersion = document?.metadata?.component?.version;
      if (componentVersion && componentVersion !== decision.toVersion) fail(`${decision.appId}: ${name} version drift`);
    } else if (name === "aiAssuranceFingerprint") {
      if (document?.schema !== "ghrab-ai-assurance-fingerprint-v2") fail(`${decision.appId}: AI assurance fingerprint nema podporovane schema`);
      if (document?.appId !== decision.appId || document?.appVersion !== decision.toVersion) fail(`${decision.appId}: AI assurance fingerprint neodpovida candidate verzi`);
      if (!SHA256.test(String(document?.aggregate || ""))) fail(`${decision.appId}: AI assurance fingerprint nema platny aggregate SHA-256`);
    }
  }
  console.log(`PATCH-ASSURANCE ${decision.appId} ${decision.toVersion}: VERIFIED ${assuranceDigest}`);
}

const promoted = new Map(eligible.map((decision) => [decision.appId, decision.toVersion]));
const nextWave = {
  ...wave,
  applications: wave.applications.map((entry) =>
    promoted.has(entry.id) ? { ...entry, version: promoted.get(entry.id) } : entry,
  ),
};

await writeFile(wavePath, `${JSON.stringify(nextWave, null, 2)}\n`, "utf8");
for (const decision of eligible) {
  console.log(`AUTO-PROMOTION APPLY ${decision.appId}: ${decision.fromVersion} -> ${decision.toVersion}`);
}
console.log(`AUTO-PROMOTION APPLY: PASS (${eligible.length} patch promotion${eligible.length === 1 ? "" : "s"}).`);
