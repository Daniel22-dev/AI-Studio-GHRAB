import { createPublicKey, verify } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

async function readJson(root, relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
}

export async function checkAccessBundleFreshness({
  root,
  now = Date.now(),
  required = false,
  log = console,
} = {}) {
  const projectRoot = path.resolve(root || process.cwd());
  const [bundle, signature, verifyKey, deployment, sourcePolicy] = await Promise.all([
    readJson(projectRoot, "src/config/access-config-bundle.json"),
    readJson(projectRoot, "src/config/access-config-bundle.sig.json"),
    readJson(projectRoot, "src/config/access-config-verify-key.json"),
    readJson(projectRoot, "src/config/deployment.json"),
    readJson(projectRoot, "src/config/access-policy.json"),
  ]);
  const failures = [];
  const issuedAt = bundle.issuedAt || bundle.generatedAt || "";
  const issuedMs = Date.parse(issuedAt);
  const clockSkewMs = Math.max(0, Number(bundle.policy?.clockSkewSeconds || 300)) * 1000;
  const maxAgeDays = Math.max(1, Number(
    sourcePolicy.maxSignedBundleAgeDays ?? bundle.maxSignedBundleAgeDays ?? 30,
  ));
  const ageHours = Number.isFinite(issuedMs) ? Math.max(0, (now - issuedMs) / 3600000) : Number.POSITIVE_INFINITY;

  if (!Number.isFinite(issuedMs)) failures.push("bundle nemá platný podepsaný issuedAt/generatedAt");
  else if (issuedMs > now + clockSkewMs) failures.push("bundle je vydán v budoucnosti");
  if (signature.bundleVersion !== bundle.version) failures.push("podpis odkazuje na jinou bundle.version");
  if (deployment.sharedAccessVersion !== bundle.version) failures.push("deployment.sharedAccessVersion neodpovídá bundle.version");
  if (verifyKey.keyId !== signature.keyId) failures.push("ověřovací klíč neodpovídá podpisu bundle");

  try {
    const publicKey = createPublicKey({ key: verifyKey.publicKey, format: "jwk" });
    const valid = verify(
      "sha256",
      Buffer.from(canonical(bundle), "utf8"),
      { key: publicKey, dsaEncoding: "ieee-p1363" },
      Buffer.from(String(signature.signature || ""), "base64url"),
    );
    if (!valid) failures.push("kryptografický podpis bundle není platný");
  } catch (error) {
    failures.push(`podpis bundle nelze ověřit: ${error.message}`);
  }

  if (ageHours > maxAgeDays * 24) {
    failures.push(`podepsaný bundle je starý ${ageHours.toFixed(1)} h; limit je ${maxAgeDays} dní`);
  }

  const result = {
    ok: failures.length === 0,
    required,
    bundleVersion: bundle.version,
    issuedAt,
    ageHours,
    maxAgeDays,
    failures,
  };
  const summary = `Access bundle ${bundle.version}: ${ageHours.toFixed(1)} h / limit ${maxAgeDays} dní.`;
  if (result.ok) log.log(summary);
  else if (required) log.error(`${summary} ${failures.join("; ")}`);
  else log.warn(`${summary} VAROVÁNÍ: ${failures.join("; ")}`);
  return result;
}
