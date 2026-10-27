/**
 * Exact source-verified Platform 1.1.3 exceptions for Differentiator and LUDUS.
 * The other eight consumers remain on the immutable 1.1.2 baseline.
 * No general allowDrift, wildcard or bypass of source/identity/P5 gates.
 */
export const BASELINE = Object.freeze({
  wave: 'ghrab-platform-1.1.2-ecosystem-wave',
  platformVersion: '1.1.2',
  requiredPlatformRange: '>=1.1.2 <2.0.0',
});
export const ONLY_EXCEPTION = Object.freeze({
  // Historical exported name retained for existing Differentiator regression fixtures.
  id: 'differentiator', version: '1.3.51',
  platformVersion: '1.1.3', requiredPlatformRange: '>=1.1.3 <2.0.0',
});
// Explicit owner-authorized E7 rebaseline after verified production release.
// Public LUDUS 1.16.32 source 187db534efe254804882f20dc0bbc5677984dc94
// was independently verified by the source-identity gate on 2026-10-26.
export const LUDUS_EXCEPTION = Object.freeze({
  id: 'ludus', version: '1.16.32',
  platformVersion: '1.1.3', requiredPlatformRange: '>=1.1.3 <2.0.0',
});
const APPROVED_EXCEPTIONS = Object.freeze({
  differentiator: ONLY_EXCEPTION,
  ludus: LUDUS_EXCEPTION,
});
const BASE_FIELDS = Object.freeze(['id', 'version']);
const EXTRA_FIELDS = Object.freeze([...BASE_FIELDS, 'platformVersion', 'requiredPlatformRange']);
const fail = code => { throw Error(`GHRAB_WAVE_PIN_${code}`); };
const exactFields = (value, expected) => value !== null && typeof value === 'object' &&
  !Array.isArray(value) && Object.keys(value).length === expected.length &&
  expected.every(k => Object.hasOwn(value, k));

/**
 * Validate the whole explicit wave before allowing any per-app lookup.
 * Real app-manifest/source identities are checked separately by
 * qa-ecosystem.mjs --require-source-verification and P5, not by this helper.
 */
export function validateWavePlatformPins(wave) {
  if (!wave || wave.schema !== 'ghrab-platform-release-wave-v1' ||
      wave.status !== 'candidate' || wave.wave !== BASELINE.wave ||
      wave.platformVersion !== BASELINE.platformVersion ||
      wave.requiredPlatformRange !== BASELINE.requiredPlatformRange ||
      wave.policy?.requireSourceVerificationForDeploy !== true ||
      wave.policy?.allowSnapshotForDeploy !== false ||
      !Array.isArray(wave.applications) || wave.applications.length !== 10) {
    fail('BASELINE_OR_SOURCE_POLICY');
  }
  const result = new Map();
  for (const entry of wave.applications) {
    const exception = APPROVED_EXCEPTIONS[entry?.id] || null;
    const required = exception ? EXTRA_FIELDS : BASE_FIELDS;
    if (!exactFields(entry, required) || typeof entry.id !== 'string' ||
        typeof entry.version !== 'string' || result.has(entry.id)) fail('ENTRY_FIELDS_OR_DUPLICATE');
    if (exception && required.some(k => entry[k] !== exception[k])) {
      fail(entry.id === 'ludus' ? 'UNAUTHORIZED_LUDUS_VERSION' : 'UNAUTHORIZED_DIFFERENTIATOR_VERSION');
    }
    result.set(entry.id, Object.freeze({
      platformVersion: exception ? exception.platformVersion : BASELINE.platformVersion,
      requiredPlatformRange: exception ? exception.requiredPlatformRange : BASELINE.requiredPlatformRange,
    }));
  }
  if (!result.has(ONLY_EXCEPTION.id) || !result.has(LUDUS_EXCEPTION.id)) fail('EXCEPTION_MISSING');
  return result;
}

/**
 * Transitional PRE-SYNC read-only validation of the last committed 1.1.2
 * snapshot. The caller MUST require --check and the explicit pre-sync flag;
 * refresh and post-sync checks always use validateWavePlatformPins instead.
 */
export function isPinnedHistoricalDifferentiatorSnapshot(app) {
  return app?.id === ONLY_EXCEPTION.id && app.version === ONLY_EXCEPTION.version &&
    app.platform?.platformVersion === BASELINE.platformVersion &&
    app.platform?.requiredPlatformRange === BASELINE.requiredPlatformRange &&
    app.compatibility?.platformRange === BASELINE.requiredPlatformRange;
}
