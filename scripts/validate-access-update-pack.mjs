#!/usr/bin/env node
import { createPublicKey, verify } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function findPrivateMaterial(value, location = "$") {
  const findings = [];
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      findings.push(...findPrivateMaterial(item, `${location}[${index}]`)),
    );
  } else if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      const child = `${location}.${key}`;
      if (key === "d" || /private(?:key|jwk)/i.test(key)) findings.push(child);
      findings.push(...findPrivateMaterial(item, child));
    }
  }
  return findings;
}

function sameJson(left, right) {
  return canonical(left) === canonical(right);
}

function isCurrentOrPreviousPatch(sourceVersion, currentVersion) {
  const source = String(sourceVersion || "").match(/^(\d+)\.(\d+)\.(\d+)$/);
  const current = String(currentVersion || "").match(/^(\d+)\.(\d+)\.(\d+)$/);
  return Boolean(
    source &&
      current &&
      source[1] === current[1] &&
      source[2] === current[2] &&
      [Number(current[3]), Number(current[3]) - 1].includes(Number(source[3])),
  );
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(ROOT, relativePath), "utf8"));
}

const input = process.argv[2];
if (!input) {
  console.error(
    "Použití: npm run access:validate-update -- cesta/k/VEREJNA-AKTUALIZACE-ZABEZPECENI.json",
  );
  process.exit(2);
}

const [pack, pkg, currentBundle, currentSignature, currentVerifyKey, policy] =
  await Promise.all([
    JSON.parse(await readFile(path.resolve(process.cwd(), input), "utf8")),
    readJson("package.json"),
    readJson("src/config/access-config-bundle.json"),
    readJson("src/config/access-config-bundle.sig.json"),
    readJson("src/config/access-config-verify-key.json"),
    readJson("src/config/access-policy.json"),
  ]);

const privateMaterial = findPrivateMaterial(pack);
const signatureBytes = Buffer.from(String(pack.signature?.signature || ""), "base64url");
let signatureValid = false;
try {
  const publicKey = createPublicKey({ key: pack.verifyKey?.publicKey, format: "jwk" });
  signatureValid = verify(
    "sha256",
    Buffer.from(canonical(pack.bundle), "utf8"),
    { key: publicKey, dsaEncoding: "ieee-p1363" },
    signatureBytes,
  );
} catch {
  signatureValid = false;
}

const currentRevoked = currentBundle.revocations?.revokedJti || [];
const proposedRevoked = pack.bundle?.revocations?.revokedJti || [];
const added = proposedRevoked.filter((jti) => !currentRevoked.includes(jti));
const issuedAt = Date.parse(pack.bundle?.issuedAt || pack.bundle?.generatedAt || "");
const clockSkewMs = Math.max(0, Number(pack.bundle?.policy?.clockSkewSeconds || 300)) * 1000;
const purpose = added.length ? "revocation-update" : "bundle-renewal";
const checks = [
  ["update.schema", pack.schema === "ghrab-access-config-update-pack-v1"],
  ["update.purpose", pack.purpose === purpose],
  ["update.source-version", isCurrentOrPreviousPatch(pack.sourceAppVersion, pkg.version)],
  ["update.public-only", privateMaterial.length === 0],
  ["update.previous-version", pack.previousBundleVersion === currentBundle.version],
  ["update.unique-version", pack.bundle?.version !== currentBundle.version],
  ["update.trust-anchor", sameJson(pack.verifyKey, currentVerifyKey)],
  ["update.signature-schema", pack.signature?.schema === "ghrab-access-config-signature-v1"],
  ["update.algorithm", pack.signature?.algorithm === "ES256"],
  ["update.key-id", pack.signature?.keyId === currentSignature.keyId],
  ["update.bundle-version", pack.signature?.bundleVersion === pack.bundle?.version],
  ["update.deployment-version", pack.deploymentSharedAccessVersion === pack.bundle?.version],
  ["update.signature-length", signatureBytes.length === 64],
  ["update.signature-valid", signatureValid],
  ["update.issued-at", Number.isFinite(issuedAt) && issuedAt <= Date.now() + clockSkewMs],
  ["update.policy-current", sameJson(pack.bundle?.policy, policy)],
  ["update.permit-key-current", sameJson(pack.bundle?.accessPublicKey, currentBundle.accessPublicKey)],
  [
    "update.revocations-superset",
    currentRevoked.every((jti) => proposedRevoked.includes(jti)),
  ],
  [
    "update.revoked-before-unchanged",
    (pack.bundle?.revocations?.revokedBefore || null) ===
      (currentBundle.revocations?.revokedBefore || null),
  ],
  [
    "update.revocation-summary",
    pack.changeSummary?.addedRevocationCount === added.length &&
      sameJson(pack.changeSummary?.addedRevokedJti || [], [...added].sort()) &&
      pack.changeSummary?.totalRevokedJti === proposedRevoked.length,
  ],
  [
    "update.revocations-unique",
    new Set(proposedRevoked).size === proposedRevoked.length,
  ],
  ["update.offline-limit", pack.bundle?.maxOfflineAgeHours === currentBundle.maxOfflineAgeHours],
  [
    "update.signed-age-limit",
    pack.bundle?.maxSignedBundleAgeDays === currentBundle.maxSignedBundleAgeDays,
  ],
];

for (const [name, ok] of checks) console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
if (privateMaterial.length) {
  console.error(`Soukromý materiál nalezen: ${privateMaterial.join(", ")}`);
}

const failures = checks.filter(([, ok]) => !ok).map(([name]) => name);
console.log(
  JSON.stringify(
    {
      schema: "ghrab-access-update-validation-v1",
      status: failures.length ? "failed" : "passed",
      sourceAppVersion: pack.sourceAppVersion || null,
      previousBundleVersion: pack.previousBundleVersion || null,
      bundleVersion: pack.bundle?.version || null,
      keyId: pack.verifyKey?.keyId || null,
      addedRevocationCount: added.length,
      summary: {
        total: checks.length,
        passed: checks.length - failures.length,
        failed: failures.length,
      },
      failures,
    },
    null,
    2,
  ),
);

if (failures.length) process.exit(1);
