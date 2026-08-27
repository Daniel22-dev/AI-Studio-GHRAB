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

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(ROOT, relativePath), "utf8"));
}

function findPrivateMaterial(value, location = "$") {
  const findings = [];
  if (Array.isArray(value)) {
    value.forEach((item, index) => findings.push(...findPrivateMaterial(item, `${location}[${index}]`)));
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
  if (!source || !current) return false;
  return source[1] === current[1]
    && source[2] === current[2]
    && (Number(source[3]) === Number(current[3]) || Number(source[3]) + 1 === Number(current[3]));
}

const input = process.argv[2];
if (!input) {
  console.error("Použití: npm run access:validate-rotation -- cesta/k/VEREJNY-ROTACNI-BALICEK.json");
  process.exit(2);
}

const inputPath = path.resolve(process.cwd(), input);
const [pack, pkg, policy, revocations, accessPublicKey] = await Promise.all([
  JSON.parse(await readFile(inputPath, "utf8")),
  readJson("package.json"),
  readJson("src/config/access-policy.json"),
  readJson("src/config/revoked-access.json"),
  readJson("src/config/access-public-key.json"),
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

const issuedAt = Date.parse(pack.bundle?.issuedAt || pack.bundle?.generatedAt || "");
const clockSkewMs = Math.max(0, Number(pack.bundle?.policy?.clockSkewSeconds || 300)) * 1000;
const checks = [
  ["rotation.schema", pack.schema === "ghrab-access-config-rotation-pack-v1"],
  ["rotation.source-version", isCurrentOrPreviousPatch(pack.sourceAppVersion, pkg.version)],
  ["rotation.public-only", privateMaterial.length === 0],
  ["rotation.verify-key-schema", pack.verifyKey?.schema === "ghrab-access-config-verify-key-v1"],
  ["rotation.signature-schema", pack.signature?.schema === "ghrab-access-config-signature-v1"],
  ["rotation.algorithm", pack.verifyKey?.algorithm === "ES256" && pack.signature?.algorithm === "ES256"],
  ["rotation.curve", pack.verifyKey?.publicKey?.kty === "EC" && pack.verifyKey?.publicKey?.crv === "P-256"],
  ["rotation.key-id", pack.verifyKey?.keyId === pack.verifyKey?.publicKey?.kid && pack.verifyKey?.keyId === pack.signature?.keyId],
  ["rotation.bundle-version", pack.bundle?.version === pack.signature?.bundleVersion && pack.bundle?.version === pack.deploymentSharedAccessVersion],
  ["rotation.signature-length", signatureBytes.length === 64],
  ["rotation.signature-valid", signatureValid],
  ["rotation.issued-at", Number.isFinite(issuedAt) && issuedAt <= Date.now() + clockSkewMs],
  ["rotation.policy-current", sameJson(pack.bundle?.policy, policy)],
  ["rotation.revocations-current", sameJson(pack.bundle?.revocations, revocations)],
  ["rotation.permit-key-current", sameJson(pack.bundle?.accessPublicKey, accessPublicKey)],
  ["rotation.offline-limit", pack.bundle?.maxOfflineAgeHours === 24],
  ["rotation.signed-age-limit", pack.bundle?.maxSignedBundleAgeDays === 30],
  ["rotation.permit-limit", pack.bundle?.policy?.maximumPermitDays === 90],
  ["rotation.fail-closed", pack.bundle?.policy?.offlinePolicy?.failClosedWhenStale === true],
];

for (const [name, ok] of checks) console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
if (privateMaterial.length) console.error(`Soukromý materiál nalezen: ${privateMaterial.join(", ")}`);

const failures = checks.filter(([, ok]) => !ok).map(([name]) => name);
console.log(JSON.stringify({
  schema: "ghrab-access-rotation-validation-v1",
  status: failures.length ? "failed" : "passed",
  sourceAppVersion: pack.sourceAppVersion || null,
  bundleVersion: pack.bundle?.version || null,
  keyId: pack.verifyKey?.keyId || null,
  issuedAt: pack.bundle?.issuedAt || pack.bundle?.generatedAt || null,
  expiresAt: Number.isFinite(issuedAt)
    ? new Date(issuedAt + Number(pack.bundle?.maxSignedBundleAgeDays || 30) * 86400000).toISOString()
    : null,
  summary: { total: checks.length, passed: checks.length - failures.length, failed: failures.length },
  failures,
}, null, 2));

if (failures.length) process.exit(1);
