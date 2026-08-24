import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import {
  canonicalJson,
  createSecurityUpdatePack,
  findPrivateMaterial,
  verifySignedBundle,
} from "../src/tools/security-center/security-center-core.js";

function b64url(value) {
  return Buffer.from(value).toString("base64url");
}

async function fixture() {
  const keyId = "test-config-key-20260824";
  const pair = await webcrypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"],
  );
  const privateJwk = await webcrypto.subtle.exportKey("jwk", pair.privateKey);
  const publicJwk = await webcrypto.subtle.exportKey("jwk", pair.publicKey);
  Object.assign(privateJwk, { kid: keyId, use: "sig", alg: "ES256" });
  Object.assign(publicJwk, { kid: keyId, use: "sig", alg: "ES256" });
  const verifyKey = {
    schema: "ghrab-access-config-verify-key-v1",
    algorithm: "ES256",
    keyId,
    publicKey: publicJwk,
  };
  const bundle = {
    schema: "ghrab-access-config-bundle-v1",
    version: "access-p1-old",
    issuedAt: "2026-08-22T10:00:00.000Z",
    generatedAt: "2026-08-22T10:00:00.000Z",
    maxOfflineAgeHours: 24,
    maxSignedBundleAgeDays: 30,
    policy: {
      schema: "ghrab-access-policy-v1",
      administratorRoles: ["admin"],
      operatorRoles: ["operator"],
      operatorPages: ["access-registry"],
    },
    revocations: {
      schema: "ghrab-access-revocation-list-v1",
      updatedAt: "2026-08-22T10:00:00.000Z",
      revokedBefore: null,
      revokedJti: ["00000000-0000-4000-8000-000000000001"],
    },
    accessPublicKey: {
      schema: "ghrab-access-public-key-v1",
      keyId: "permit-key",
      publicKey: { kty: "EC", crv: "P-256", x: "x", y: "y" },
    },
  };
  const bytes = await webcrypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    pair.privateKey,
    new TextEncoder().encode(canonicalJson(bundle)),
  );
  const signature = {
    schema: "ghrab-access-config-signature-v1",
    algorithm: "ES256",
    keyId,
    bundleVersion: bundle.version,
    signature: b64url(bytes),
  };
  return { bundle, signature, verifyKey, privateJwk };
}

const current = await fixture();
const original = JSON.stringify(current.bundle);
assert.equal(
  await verifySignedBundle({
    bundle: current.bundle,
    signature: current.signature,
    verifyKey: current.verifyKey,
    cryptoImpl: webcrypto,
  }),
  true,
  "výchozí podpis musí být platný",
);

const added = "00000000-0000-4000-8000-000000000002";
const pack = await createSecurityUpdatePack({
  currentBundle: current.bundle,
  currentSignature: current.signature,
  verifyKey: current.verifyKey,
  privateKeyDocument: current.privateJwk,
  pendingJti: [added, added],
  sourceAppVersion: "0.21.32",
  now: new Date("2026-08-24T12:34:56.000Z"),
  cryptoImpl: webcrypto,
});

assert.equal(pack.schema, "ghrab-access-config-update-pack-v1");
assert.equal(pack.purpose, "revocation-update");
assert.equal(pack.previousBundleVersion, current.bundle.version);
assert.equal(pack.deploymentSharedAccessVersion, pack.bundle.version);
assert.equal(pack.signature.bundleVersion, pack.bundle.version);
assert.deepEqual(pack.changeSummary.addedRevokedJti, [added]);
assert.deepEqual(pack.bundle.revocations.revokedJti, [
  "00000000-0000-4000-8000-000000000001",
  added,
]);
assert.equal(pack.bundle.revocations.updatedAt, "2026-08-24T12:34:56.000Z");
assert.deepEqual(pack.bundle.policy, current.bundle.policy);
assert.deepEqual(pack.bundle.accessPublicKey, current.bundle.accessPublicKey);
assert.equal(JSON.stringify(current.bundle), original, "vstupní bundle se nesmí změnit");
assert.deepEqual(findPrivateMaterial(pack), [], "veřejný balíček nesmí obsahovat d");
assert.equal(
  await verifySignedBundle({
    bundle: pack.bundle,
    signature: pack.signature,
    verifyKey: pack.verifyKey,
    cryptoImpl: webcrypto,
  }),
  true,
  "nový podpis musí projít nezávislým ověřením",
);

const renewal = await createSecurityUpdatePack({
  currentBundle: current.bundle,
  currentSignature: current.signature,
  verifyKey: current.verifyKey,
  privateKeyDocument: current.privateJwk,
  pendingJti: [],
  sourceAppVersion: "0.21.32",
  now: new Date("2026-08-24T12:35:56.000Z"),
  cryptoImpl: webcrypto,
});
assert.equal(renewal.purpose, "bundle-renewal");
assert.equal(renewal.changeSummary.addedRevocationCount, 0);

const wrong = await fixture();
await assert.rejects(
  createSecurityUpdatePack({
    currentBundle: current.bundle,
    currentSignature: current.signature,
    verifyKey: current.verifyKey,
    privateKeyDocument: wrong.privateJwk,
    pendingJti: [added],
    sourceAppVersion: "0.21.32",
    cryptoImpl: webcrypto,
  }),
  /neodpovídá veřejnému klíči/u,
  "cizí soukromý klíč musí být odmítnut",
);

await assert.rejects(
  createSecurityUpdatePack({
    currentBundle: { ...current.bundle, maxOfflineAgeHours: 25 },
    currentSignature: current.signature,
    verifyKey: current.verifyKey,
    privateKeyDocument: current.privateJwk,
    pendingJti: [added],
    sourceAppVersion: "0.21.32",
    cryptoImpl: webcrypto,
  }),
  /nemá platný podpis/u,
  "pozměněný výchozí bundle musí být odmítnut",
);

console.log("PASS security-center: podpis, revokace, obnova a ochrana klíče");
