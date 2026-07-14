const TOKEN_KEY = 'ghrab.access.permit.v2';
const TOKEN_PREFIX = 'ghrab1';
const CONFIG_BASE = new URL('../config/', import.meta.url);
const accessState = {
  ready: false,
  token: null,
  permit: null,
  valid: false,
  reason: 'not-initialised',
  policy: null,
  revocations: null,
  publicKeyInfo: null,
  checkedAt: null
};

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function safeStorageGet(key){
  try { return localStorage.getItem(key); }
  catch { return null; }
}
function safeStorageSet(key, value){
  try { localStorage.setItem(key, value); return true; }
  catch { return false; }
}
function safeStorageRemove(key){
  try { localStorage.removeItem(key); return true; }
  catch { return false; }
}
function fromBase64Url(value){
  const normalised = String(value).replaceAll('-', '+').replaceAll('_', '/');
  const padded = normalised + '='.repeat((4 - normalised.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}
function toBase64Url(value){
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}
function decodeJsonSegment(value){
  return JSON.parse(textDecoder.decode(fromBase64Url(value)));
}
async function fetchJson(url){
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`${url.pathname}: ${response.status}`);
  return response.json();
}
function emitChange(){
  document.documentElement.classList.toggle('access-admin', isAdmin());
  document.documentElement.classList.toggle('access-ready', accessState.ready);
  document.dispatchEvent(new CustomEvent('ghrab:access-changed', { detail: getAccessSnapshot() }));
}
function resetVerification(reason, token = safeStorageGet(TOKEN_KEY)){
  accessState.token = token || null;
  accessState.permit = null;
  accessState.valid = false;
  accessState.reason = reason;
  accessState.checkedAt = new Date().toISOString();
}
function nowSeconds(){ return Math.floor(Date.now() / 1000); }
function normaliseApps(apps){
  return Array.isArray(apps) ? [...new Set(apps.filter(value => typeof value === 'string' && value.trim()).map(value => value.trim()))] : [];
}
function validateClaims(payload, policy, revocations){
  if (!payload || payload.schema !== 'ghrab-access-permit-v1') return 'invalid-schema';
  if (payload.iss !== policy.issuer || payload.aud !== policy.audience) return 'invalid-audience';
  if (!payload.sub || !payload.jti || !payload.kid || !payload.role) return 'missing-claims';
  if (!Number.isFinite(payload.iat) || !Number.isFinite(payload.exp)) return 'invalid-time-claims';
  const skew = Number(policy.clockSkewSeconds || 300);
  const now = nowSeconds();
  if (Number.isFinite(payload.nbf) && payload.nbf > now + skew) return 'not-yet-valid';
  if (payload.iat > now + skew) return 'issued-in-future';
  if (payload.exp <= now - skew) return 'expired';
  if (payload.exp <= payload.iat) return 'invalid-validity-window';
  const maximum = Number(policy.maximumPermitDays || 730) * 86400 + skew;
  if (payload.exp - payload.iat > maximum) return 'validity-too-long';
  if (revocations?.revokedBefore && payload.iat <= Math.floor(Date.parse(revocations.revokedBefore) / 1000)) return 'revoked-by-date';
  if (Array.isArray(revocations?.revokedJti) && revocations.revokedJti.includes(payload.jti)) return 'revoked';
  return null;
}
async function importVerificationKey(publicKeyInfo){
  return crypto.subtle.importKey(
    'jwk',
    publicKeyInfo.publicKey,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['verify']
  );
}
async function verifyToken(token){
  if (!token) return { valid: false, reason: 'missing' };
  const parts = String(token).trim().split('.');
  if (parts.length !== 3 || parts[0] !== TOKEN_PREFIX) return { valid: false, reason: 'invalid-format' };
  let payload;
  try { payload = decodeJsonSegment(parts[1]); }
  catch { return { valid: false, reason: 'invalid-payload' }; }
  if (payload.kid !== accessState.publicKeyInfo?.keyId) return { valid: false, reason: 'unknown-key' };
  const claimError = validateClaims(payload, accessState.policy, accessState.revocations);
  if (claimError) return { valid: false, reason: claimError, permit: payload };
  try {
    const key = await importVerificationKey(accessState.publicKeyInfo);
    const signature = fromBase64Url(parts[2]);
    const valid = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      key,
      signature,
      textEncoder.encode(parts[1])
    );
    return valid ? { valid: true, reason: 'valid', permit: { ...payload, apps: normaliseApps(payload.apps) } } : { valid: false, reason: 'invalid-signature', permit: payload };
  } catch {
    return { valid: false, reason: 'verification-error', permit: payload };
  }
}
export async function initialiseAccess(options = {}){
  accessState.ready = false;
  resetVerification('loading');
  try {
    const [policy, revocations, publicKeyInfo] = await Promise.all([
      fetchJson(options.policyUrl ? new URL(options.policyUrl, location.href) : new URL('access-policy.json', CONFIG_BASE)),
      fetchJson(options.revocationsUrl ? new URL(options.revocationsUrl, location.href) : new URL('revoked-access.json', CONFIG_BASE)),
      fetchJson(options.publicKeyUrl ? new URL(options.publicKeyUrl, location.href) : new URL('access-public-key.json', CONFIG_BASE))
    ]);
    if (policy.schema !== 'ghrab-access-policy-v1') throw new Error('invalid policy schema');
    if (revocations.schema !== 'ghrab-access-revocation-list-v1') throw new Error('invalid revocation schema');
    if (publicKeyInfo.schema !== 'ghrab-access-public-key-v1') throw new Error('invalid public key schema');
    accessState.policy = policy;
    accessState.revocations = revocations;
    accessState.publicKeyInfo = publicKeyInfo;
    const token = safeStorageGet(TOKEN_KEY);
    const result = await verifyToken(token);
    accessState.token = token;
    accessState.permit = result.permit || null;
    accessState.valid = result.valid;
    accessState.reason = result.reason;
    accessState.checkedAt = new Date().toISOString();
  } catch (error) {
    console.warn('AI Studio: access configuration could not be loaded', error);
    resetVerification('configuration-unavailable');
  }
  accessState.ready = true;
  emitChange();
  return getAccessSnapshot();
}
export async function inspectPermitToken(token){
  const clean = String(token || '').trim();
  if (!clean) return { ok: false, reason: 'missing' };
  if (!accessState.policy) await initialiseAccess();
  const result = await verifyToken(clean);
  return { ok: Boolean(result.valid), valid: Boolean(result.valid), reason: result.reason, permit: result.permit || null };
}
export async function setPermitToken(token){
  const clean = String(token || '').trim();
  if (!clean) return { ok: false, reason: 'missing' };
  if (!accessState.policy) await initialiseAccess();
  const result = await verifyToken(clean);
  if (!result.valid) return { ok: false, reason: result.reason, permit: result.permit || null };
  if (!safeStorageSet(TOKEN_KEY, clean)) return { ok: false, reason: 'storage-error' };
  accessState.token = clean;
  accessState.permit = result.permit;
  accessState.valid = true;
  accessState.reason = 'valid';
  accessState.checkedAt = new Date().toISOString();
  emitChange();
  return { ok: true, permit: result.permit };
}
export function clearPermit(){
  safeStorageRemove(TOKEN_KEY);
  resetVerification('missing', null);
  accessState.ready = true;
  emitChange();
}
export async function readPermitFile(file){
  if (!file) return { ok: false, reason: 'missing-file' };
  if (file.size > 128 * 1024) return { ok: false, reason: 'file-too-large' };
  try {
    const parsed = JSON.parse(await file.text());
    const token = typeof parsed === 'string' ? parsed : parsed?.token;
    return setPermitToken(token);
  } catch {
    return { ok: false, reason: 'invalid-file' };
  }
}
export function getAccessSnapshot(){
  return {
    ready: accessState.ready,
    valid: accessState.valid,
    reason: accessState.reason,
    permit: accessState.permit ? { ...accessState.permit, apps: [...(accessState.permit.apps || [])] } : null,
    policy: accessState.policy,
    checkedAt: accessState.checkedAt
  };
}
export function getPermitToken(){ return accessState.valid ? accessState.token : null; }
export function isAdmin(){
  if (!accessState.valid) return false;
  return (accessState.policy?.administratorRoles || ['admin']).includes(accessState.permit?.role);
}
export function hasAppAccess(appId){
  if (!accessState.ready) return { enabled: false, reason: 'loading', permit: null };
  if (!accessState.valid) return { enabled: false, reason: accessState.reason, permit: accessState.permit };
  if (isAdmin()) return { enabled: true, reason: 'administrator', permit: accessState.permit };
  const apps = accessState.permit?.apps || [];
  if (apps.includes('*') || apps.includes(appId)) return { enabled: true, reason: 'permitted', permit: accessState.permit };
  return { enabled: false, reason: 'app-not-permitted', permit: accessState.permit };
}
export function requiredTraining(appId){
  return accessState.policy?.applications?.[appId] || null;
}
export function formatReason(reason, language = 'cs'){
  const messages = {
    cs: {
      loading: 'Ověřuji přístup…', missing: 'Přístup zatím nebyl aktivován.', 'invalid-format': 'Přístupový kód má neplatný formát.', 'invalid-payload': 'Přístupový kód je poškozený.', 'invalid-schema': 'Přístupový kód používá nepodporovanou verzi.', 'invalid-audience': 'Přístupový kód nepatří k tomuto Studiu.', 'missing-claims': 'V přístupovém kódu chybí povinné údaje.', 'invalid-time-claims': 'Přístupový kód obsahuje neplatné datum.', 'not-yet-valid': 'Přístup ještě není platný.', 'issued-in-future': 'Přístupový kód má neplatné datum vydání.', expired: 'Platnost přístupu skončila.', 'invalid-validity-window': 'Přístupový kód má neplatnou dobu platnosti.', 'validity-too-long': 'Doba platnosti přístupu překračuje povolený limit.', 'revoked-by-date': 'Tento přístup byl centrálně zneplatněn.', revoked: 'Tento přístup byl správcem zneplatněn.', 'unknown-key': 'Přístupový kód byl podepsán neznámým klíčem.', 'invalid-signature': 'Digitální podpis přístupu není platný.', 'verification-error': 'Přístup se nepodařilo kryptograficky ověřit.', 'configuration-unavailable': 'Konfiguraci přístupů se nepodařilo načíst.', 'app-not-permitted': 'Tato aplikace není v přístupu odemčena.', administrator: 'Správcovský přístup je aktivní.', permitted: 'Přístup k aplikaci je aktivní.', 'storage-error': 'Prohlížeč nepovolil uložení přístupu.', 'invalid-file': 'Soubor s přístupem nelze přečíst.', 'file-too-large': 'Soubor s přístupem je příliš velký.', 'missing-file': 'Nebyl vybrán soubor.'
    },
    en: {
      loading: 'Verifying access…', missing: 'Access has not been activated yet.', 'invalid-format': 'The access code has an invalid format.', 'invalid-payload': 'The access code is damaged.', 'invalid-schema': 'The access code uses an unsupported version.', 'invalid-audience': 'The access code does not belong to this Studio.', 'missing-claims': 'Required access data is missing.', 'invalid-time-claims': 'The access code contains an invalid date.', 'not-yet-valid': 'Access is not valid yet.', 'issued-in-future': 'The access code has an invalid issue date.', expired: 'Access has expired.', 'invalid-validity-window': 'The access validity period is invalid.', 'validity-too-long': 'The access validity exceeds the allowed limit.', 'revoked-by-date': 'This access has been centrally revoked.', revoked: 'This access has been revoked by the administrator.', 'unknown-key': 'The access code was signed by an unknown key.', 'invalid-signature': 'The digital signature is invalid.', 'verification-error': 'Access could not be cryptographically verified.', 'configuration-unavailable': 'The access configuration could not be loaded.', 'app-not-permitted': 'This application is not unlocked in your access.', administrator: 'Administrator access is active.', permitted: 'Application access is active.', 'storage-error': 'The browser did not allow access to be saved.', 'invalid-file': 'The access file could not be read.', 'file-too-large': 'The access file is too large.', 'missing-file': 'No file was selected.'
    }
  };
  return messages[language]?.[reason] || messages.cs[reason] || reason;
}
export function encodePayloadForSigning(payload){
  return toBase64Url(textEncoder.encode(JSON.stringify(payload)));
}
