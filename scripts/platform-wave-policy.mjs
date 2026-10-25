// Per-app Platform 1.1.x transitions during a mixed release wave.
// Global wave baseline stays binding absent explicitly reviewed live evidence.
const SHA = /^[a-f0-9]{40}$/;
const SEMVER = /^\d+\.\d+\.\d+$/;
const has = (obj, key) => Object.prototype.hasOwnProperty.call(obj || {}, key);
const parts = (v) => String(v).split('.').map(Number);
function compare(a, b) {
  const x = parts(a), y = parts(b);
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] < y[i] ? -1 : 1;
  return 0;
}
export function validatePlatformWave({wave, waveApp, app, sourceReport, requireSourceVerification = false}) {
  const errors = [];
  const keys = ['platformVersion', 'requiredPlatformRange', 'verifiedReleaseCommit'];
  const exception = keys.some((key) => has(waveApp, key));
  let platformVersion = wave?.platformVersion;
  let requiredRange = wave?.requiredPlatformRange;
  if (exception) {
    if (!keys.every((key) => has(waveApp, key))) {
      errors.push('wave exception incomplete: platformVersion, requiredPlatformRange and verifiedReleaseCommit are all required.');
    } else {
      platformVersion = waveApp.platformVersion;
      requiredRange = waveApp.requiredPlatformRange;
      if (!SEMVER.test(platformVersion) || !SEMVER.test(wave?.platformVersion || '')) {
        errors.push('wave exception platform version is invalid.');
      } else if (compare(platformVersion, wave.platformVersion) < 0) {
        errors.push('wave exception cannot downgrade the platform.');
      }
      if (requiredRange !== '>=' + platformVersion + ' <2.0.0') {
        errors.push('wave exception must require the exact upgraded platform floor.');
      }
      if (!SHA.test(waveApp.verifiedReleaseCommit)) {
        errors.push('wave exception requires a full, reviewed deployment source commit.');
      }
      if (requireSourceVerification) {
        const identity = sourceReport?.releaseIdentity;
        if (sourceReport?.ok !== true || sourceReport?.verification !== 'deployment' ||
            identity?.status !== 'VERIFIED' || identity?.contract !== 'ghrab-release-integrity-v2' ||
            identity?.appId !== app?.id || identity?.version !== app?.version ||
            identity?.sourceCommit !== waveApp.verifiedReleaseCommit) {
          errors.push('wave exception lacks a current, exact live-deployment release identity.');
        }
      }
    }
  }
  if (app?.platform?.platformVersion !== platformVersion) {
    errors.push('wave platform drift (' + (app?.platform?.platformVersion || '?') + ' != ' + (platformVersion || '?') + ').');
  }
  if (app?.platform?.requiredPlatformRange !== requiredRange) errors.push('wave required range drift.');
  if (app?.compatibility?.platformRange !== requiredRange) errors.push('compatibility platform range drift.');
  return errors;
}
