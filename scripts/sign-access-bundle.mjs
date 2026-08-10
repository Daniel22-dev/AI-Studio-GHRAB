#!/usr/bin/env node
import { createPrivateKey, createPublicKey, generateKeyPairSync, sign } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CONFIG = join(ROOT, 'src', 'config');
function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
function b64url(buffer) { return Buffer.from(buffer).toString('base64url'); }
function readJson(name) { return JSON.parse(readFileSync(join(CONFIG, name), 'utf8')); }

const privatePath = process.env.GHRAB_ACCESS_BUNDLE_PRIVATE_KEY || process.argv[2];
if (!privatePath || !existsSync(privatePath)) {
  console.error('Chybí soukromý JWK. Nastav GHRAB_ACCESS_BUNDLE_PRIVATE_KEY nebo předej cestu jako argument.');
  process.exit(2);
}
const privateJwk = JSON.parse(readFileSync(privatePath, 'utf8'));
const privateKey = createPrivateKey({ key: privateJwk, format: 'jwk' });
const publicJwk = createPublicKey(privateKey).export({ format: 'jwk' });
const keyId = String(privateJwk.kid || publicJwk.kid || 'ghrab-access-bundle-p1');
Object.assign(publicJwk, { kid: keyId, use: 'sig', alg: 'ES256' });
const policy = readJson('access-policy.json');
const bundle = {
  schema: 'ghrab-access-config-bundle-v1',
  version: String(process.env.GHRAB_ACCESS_BUNDLE_VERSION || 'access-p1-2026-08-04'),
  generatedAt: new Date().toISOString(),
  maxOfflineAgeHours: Number(policy.maxOfflineAgeHours || 24),
  policy,
  revocations: readJson('revoked-access.json'),
  accessPublicKey: readJson('access-public-key.json'),
};
const payload = Buffer.from(canonical(bundle), 'utf8');
const signature = sign('sha256', payload, { key: privateKey, dsaEncoding: 'ieee-p1363' });
const signatureDocument = {
  schema: 'ghrab-access-config-signature-v1',
  algorithm: 'ES256',
  keyId,
  bundleVersion: bundle.version,
  signature: b64url(signature),
};
writeFileSync(join(CONFIG, 'access-config-bundle.json'), `${JSON.stringify(bundle, null, 2)}\n`);
writeFileSync(join(CONFIG, 'access-config-bundle.sig.json'), `${JSON.stringify(signatureDocument, null, 2)}\n`);
writeFileSync(join(CONFIG, 'access-config-signing-key.json'), `${JSON.stringify({ schema: 'ghrab-access-config-signing-key-v1', algorithm: 'ES256', keyId, publicKey: publicJwk }, null, 2)}\n`);
console.log(JSON.stringify({ ok: true, keyId, bundleVersion: bundle.version, signatureBytes: signature.length }));
