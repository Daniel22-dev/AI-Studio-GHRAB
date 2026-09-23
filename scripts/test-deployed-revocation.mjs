import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { webcrypto } from "node:crypto";
import { verifySignedBundle } from "../src/tools/security-center/security-center-core.js";

const REVOKED_OLD_TEACHER_JTI = "51ae2d7a-9c6f-434b-9f8a-21483b75f17c";
const EXPECTED_CONFIG_KEY = "ghrab-access-bundle-20260822195407Z-fxjS8DK9";
const EXPECTED_PERMIT_KEY = "ghrab-2026-07-10-6449ca2a";

async function json(path) {
  return JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
}

const bundle = await json("../src/config/access-config-bundle.json");
const signature = await json("../src/config/access-config-bundle.sig.json");
const verifyKey = await json("../src/config/access-config-verify-key.json");
const revocations = await json("../src/config/revoked-access.json");
const deployment = await json("../src/config/deployment.json");
const schoolDeployment = await json("../src/config/deployment.school-server.json");

assert.match(
  bundle.version,
  /^access-p1-\d{8}T\d{6}Z(?:-[A-Za-z0-9_-]+)?$/,
  "nasazený access bundle musí mít platný monotónní identifikátor verze",
);
assert.equal(signature.bundleVersion, bundle.version);
assert.equal(deployment.sharedAccessVersion, bundle.version);
assert.equal(schoolDeployment.sharedAccessVersion, bundle.version);
assert.equal(signature.keyId, EXPECTED_CONFIG_KEY);
assert.equal(verifyKey.keyId, EXPECTED_CONFIG_KEY);
assert.equal(bundle.accessPublicKey.activeKeyId, EXPECTED_PERMIT_KEY);
assert.equal(bundle.revocations.revokedBefore, null);
assert.deepEqual(bundle.revocations.revokedJti, [REVOKED_OLD_TEACHER_JTI]);
assert.deepEqual(revocations, bundle.revocations);
assert.equal(
  await verifySignedBundle({
    bundle,
    signature,
    verifyKey,
    cryptoImpl: webcrypto,
  }),
  true,
  "nasazený access bundle musí mít platný ES256 podpis",
);

console.log(
  "PASS deployed-revocation: platný podpis, přesné JTI a shodné deployment profily",
);
