/**
 * Scoped Platform 1.1.3 adoption for the independently source-verified
 * Differentiator. All other consumers remain pinned to Platform 1.1.2.
 * No general allowDrift knob, semver wildcard, or bypass of source/P5 gates.
 */
export const BASELINE = Object.freeze({
  wave: 'ghrab-platform-1.1.2-ecosystem-wave',
  platformVersion: '1.1.2',
  requiredPlatformRange: '>=1.1.2 <2.0.0',
});
export const ONLY_EXCEPTION = Object.freeze({
  id: 'differentiator', version: '1.3.51',
  platformVersion: '1.1.3', requiredPlatformRange: '>=1.1.3 <2.0.0',
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

// A scoped per-app verifier reusable by the runtime fallback admission gate.
// Does not permit arbitrary per-app exceptions, even outside full-wave tests.
export function pinnedPlatformForApp(wave, entry) {
  if (wave?.platformVersion !== BASELINE.platformVersion ||
      wave?.requiredPlatformRange !== BASELINE.requiredPlatformRange) fail('BASELINE_OR_SOURCE_POLICY');
  const exception = entry?.id === ONLY_EXCEPTION.id;
  const fields = exception ? EXTRA_FIELDS : BASE_FIELDS;
  if (!exactFields(entry, fields)) fail('ENTRY_FIELDS_OR_DUPLICATE');
  if (exception && fields.some(k => entry[k] !== ONLY_EXCEPTION[k]))
    fail('UNAUTHORIZED_DIFFERENTIATOR_VERSION');
  return {
    platformVersion: exception ? ONLY_EXCEPTION.platformVersion : BASELINE.platformVersion,
    requiredPlatformRange: exception ? ONLY_EXCEPTION.requiredPlatformRange : BASELINE.requiredPlatformRange,
  };
}

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
    if (typeof entry?.id !== 'string' || typeof entry?.version !== 'string' || result.has(entry.id))
      fail('ENTRY_FIELDS_OR_DUPLICATE');
    result.set(entry.id, Object.freeze(pinnedPlatformForApp(wave, entry)));
  }
  if (!result.has(ONLY_EXCEPTION.id)) fail('EXCEPTION_MISSING');
  return result;
}
