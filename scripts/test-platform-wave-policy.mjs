import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validatePlatformWave } from './platform-wave-policy.mjs';

const SHA = '601edef93e9029b48433f64a0ee7074c314588cd';
const wave = { platformVersion: '1.1.2', requiredPlatformRange: '>=1.1.2 <2.0.0' };
const upgrade = { id: 'differentiator', version: '1.3.51', platformVersion: '1.1.3',
  requiredPlatformRange: '>=1.1.3 <2.0.0', verifiedReleaseCommit: SHA };
const app = { id: 'differentiator', version: '1.3.51',
  platform: { platformVersion: '1.1.3', requiredPlatformRange: '>=1.1.3 <2.0.0' },
  compatibility: { platformRange: '>=1.1.3 <2.0.0' } };
const report = { ok: true, verification: 'deployment', releaseIdentity: {
  status: 'VERIFIED', contract: 'ghrab-release-integrity-v2',
  appId: 'differentiator', version: '1.3.51', sourceCommit: SHA } };
const run = (options = {}) => validatePlatformWave({
  wave, waveApp: upgrade, app, sourceReport: report, requireSourceVerification: true, ...options,
});

test('baseline 1.1.2 remains locked', () => {
  const baseline = { ...app, platform: { platformVersion: '1.1.2', requiredPlatformRange: '>=1.1.2 <2.0.0' },
    compatibility: { platformRange: '>=1.1.2 <2.0.0' } };
  assert.deepEqual(run({ app: baseline, waveApp: { id: 'generator', version: '7.1.101' }, sourceReport: null }), []);
});
test('verified deployment upgrade accepted only on declared target', () => assert.deepEqual(run(), []));
test('undeclared upgrade fails', () => assert.match(run({ waveApp: { id: 'differentiator', version: '1.3.51' } }).join(' '), /wave platform drift/));
test('partial exception fails', () => {
  const partial = { ...upgrade }; delete partial.requiredPlatformRange;
  assert.match(run({ waveApp: partial }).join(' '), /incomplete/);
});
test('stale source commit fails', () => assert.match(run({ sourceReport: { ...report, releaseIdentity: {
  ...report.releaseIdentity, sourceCommit: 'a'.repeat(40) } } }).join(' '), /exact live-deployment/));
test('repository-only and absent signed identities fail', () => {
  assert.match(run({ sourceReport: { ...report, verification: 'repository' } }).join(' '), /exact live-deployment/);
  assert.match(run({ sourceReport: { ...report, releaseIdentity: { ...report.releaseIdentity, status: 'ABSENT' } } }).join(' '), /exact live-deployment/);
});
test('wrong app id/version or missing identity fails', () => {
  assert.match(run({ sourceReport: null }).join(' '), /exact live-deployment/);
  assert.match(run({ app: { ...app, version: '1.3.52' } }).join(' '), /exact live-deployment/);
});
test('downgrade and widened range fail', () => {
  assert.match(run({ waveApp: { ...upgrade, platformVersion: '1.1.1', requiredPlatformRange: '>=1.1.1 <2.0.0' } }).join(' '), /downgrade/);
  assert.match(run({ waveApp: { ...upgrade, requiredPlatformRange: '>=1.1.2 <2.0.0' } }).join(' '), /exact upgraded/);
});
test('non-SHA commit and app range drift fail', () => {
  assert.match(run({ waveApp: { ...upgrade, verifiedReleaseCommit: '601edef' } }).join(' '), /full, reviewed/);
  assert.match(run({ app: { ...app, compatibility: { platformRange: '>=1.1.2 <2.0.0' } } }).join(' '), /compatibility platform range drift/);
});
