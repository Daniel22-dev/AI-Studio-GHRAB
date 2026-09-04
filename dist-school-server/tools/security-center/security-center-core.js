const encoder = new TextEncoder();

export function canonicalJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function findPrivateMaterial(value, location = "$") {
  const findings = [];
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      findings.push(...findPrivateMaterial(item, `${location}[${index}]`));
    });
  } else if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      const child = `${location}.${key}`;
      if (key === "d" || /private(?:key|jwk)/i.test(key)) findings.push(child);
      findings.push(...findPrivateMaterial(item, child));
    }
  }
  return findings;
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function bytesToBase64Url(value) {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
}

function base64UrlToBytes(value) {
  const source = String(value || "")
    .replaceAll("-", "+")
    .replaceAll("_", "/");
  const padded = source.padEnd(Math.ceil(source.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function timestamp(date) {
  return date.toISOString().replace(/\D/g, "").slice(0, 14) + "Z";
}

function normaliseDate(value) {
  const date = value instanceof Date ? new Date(value) : new Date(value ?? Date.now());
  if (!Number.isFinite(date.getTime())) throw new Error("Neplatný čas aktualizace.");
  return date;
}

function normaliseJtiList(values) {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.map((value) => String(value || "").trim()))]
    .filter(Boolean)
    .map((jti) => {
      if (jti.length > 200 || !/^[A-Za-z0-9._:-]+$/u.test(jti)) {
        throw new Error("Některé JTI má neplatný formát.");
      }
      return jti;
    })
    .sort();
}

function configPrivateJwk(document) {
  if (document?.schema === "ghrab-access-config-private-key-v1") {
    return document.privateKey;
  }
  return document?.privateKey?.d ? document.privateKey : document;
}

function validateTrustAnchor(verifyKey) {
  if (
    verifyKey?.schema !== "ghrab-access-config-verify-key-v1" ||
    verifyKey?.algorithm !== "ES256" ||
    verifyKey?.publicKey?.kty !== "EC" ||
    verifyKey?.publicKey?.crv !== "P-256" ||
    !verifyKey?.publicKey?.x ||
    !verifyKey?.publicKey?.y ||
    !verifyKey?.keyId ||
    verifyKey.keyId !== verifyKey.publicKey.kid
  ) {
    throw new Error("Veřejný konfigurační klíč AI Studia není platný.");
  }
}

function validatePrivateJwk(document, verifyKey) {
  const jwk = configPrivateJwk(document);
  if (
    jwk?.kty !== "EC" ||
    jwk?.crv !== "P-256" ||
    !jwk?.d ||
    jwk?.x !== verifyKey.publicKey.x ||
    jwk?.y !== verifyKey.publicKey.y ||
    jwk?.kid !== verifyKey.keyId ||
    (jwk.alg && jwk.alg !== "ES256") ||
    (jwk.use && jwk.use !== "sig")
  ) {
    throw new Error(
      "Soukromý konfigurační klíč neodpovídá veřejnému klíči tohoto AI Studia.",
    );
  }
  return jwk;
}

export async function verifySignedBundle({
  bundle,
  signature,
  verifyKey,
  cryptoImpl = globalThis.crypto,
}) {
  validateTrustAnchor(verifyKey);
  if (!cryptoImpl?.subtle) throw new Error("Prohlížeč nepodporuje Web Crypto.");
  if (
    bundle?.schema !== "ghrab-access-config-bundle-v1" ||
    signature?.schema !== "ghrab-access-config-signature-v1" ||
    signature?.algorithm !== "ES256" ||
    signature?.keyId !== verifyKey.keyId ||
    signature?.bundleVersion !== bundle?.version
  ) {
    return false;
  }
  try {
    const publicKey = await cryptoImpl.subtle.importKey(
      "jwk",
      verifyKey.publicKey,
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["verify"],
    );
    const signatureBytes = base64UrlToBytes(signature.signature);
    if (signatureBytes.length !== 64) return false;
    return cryptoImpl.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      publicKey,
      signatureBytes,
      encoder.encode(canonicalJson(bundle)),
    );
  } catch {
    return false;
  }
}

export async function createSecurityUpdatePack({
  currentBundle,
  currentSignature,
  verifyKey,
  privateKeyDocument,
  pendingJti,
  sourceAppVersion,
  now,
  cryptoImpl = globalThis.crypto,
}) {
  if (!cryptoImpl?.subtle || !cryptoImpl?.getRandomValues) {
    throw new Error("Prohlížeč nepodporuje potřebnou kryptografii.");
  }
  if (
    !(await verifySignedBundle({
      bundle: currentBundle,
      signature: currentSignature,
      verifyKey,
      cryptoImpl,
    }))
  ) {
    throw new Error("Současná bezpečnostní konfigurace nemá platný podpis.");
  }

  const privateJwk = validatePrivateJwk(privateKeyDocument, verifyKey);
  const privateKey = await cryptoImpl.subtle.importKey(
    "jwk",
    privateJwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const createdAt = normaliseDate(now);
  const createdIso = createdAt.toISOString();
  const random = bytesToBase64Url(cryptoImpl.getRandomValues(new Uint8Array(6)));
  const bundleVersion = `access-p1-${timestamp(createdAt)}-${random}`;
  if (bundleVersion === currentBundle.version) {
    throw new Error("Nová bezpečnostní verze musí být jedinečná.");
  }

  const deployedJti = normaliseJtiList(currentBundle.revocations?.revokedJti);
  const requestedJti = normaliseJtiList(pendingJti);
  const revokedJti = [...new Set([...deployedJti, ...requestedJti])].sort();
  const addedJti = requestedJti.filter((jti) => !deployedJti.includes(jti));
  const bundle = {
    schema: "ghrab-access-config-bundle-v1",
    version: bundleVersion,
    issuedAt: createdIso,
    generatedAt: createdIso,
    maxOfflineAgeHours: Number(currentBundle.maxOfflineAgeHours),
    maxSignedBundleAgeDays: Number(currentBundle.maxSignedBundleAgeDays),
    policy: cloneJson(currentBundle.policy),
    revocations: {
      ...cloneJson(currentBundle.revocations || {}),
      schema: "ghrab-access-revocation-list-v1",
      updatedAt: createdIso,
      revokedJti,
    },
    accessPublicKey: cloneJson(currentBundle.accessPublicKey),
  };
  const signatureBytes = await cryptoImpl.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    encoder.encode(canonicalJson(bundle)),
  );
  const signature = {
    schema: "ghrab-access-config-signature-v1",
    algorithm: "ES256",
    keyId: verifyKey.keyId,
    bundleVersion,
    signature: bytesToBase64Url(signatureBytes),
  };
  const verified = await verifySignedBundle({
    bundle,
    signature,
    verifyKey,
    cryptoImpl,
  });
  if (!verified) throw new Error("Kontrolní ověření nového podpisu selhalo.");

  const pack = {
    schema: "ghrab-access-config-update-pack-v1",
    purpose: addedJti.length ? "revocation-update" : "bundle-renewal",
    sourceAppVersion: String(sourceAppVersion || ""),
    createdAt: createdIso,
    previousBundleVersion: currentBundle.version,
    verifyKey: cloneJson(verifyKey),
    bundle,
    signature,
    deploymentSharedAccessVersion: bundleVersion,
    changeSummary: {
      addedRevocationCount: addedJti.length,
      addedRevokedJti: addedJti,
      totalRevokedJti: revokedJti.length,
    },
  };
  const privateMaterial = findPrivateMaterial(pack);
  if (privateMaterial.length) {
    throw new Error("Veřejný balíček by obsahoval soukromý materiál.");
  }
  return pack;
}
