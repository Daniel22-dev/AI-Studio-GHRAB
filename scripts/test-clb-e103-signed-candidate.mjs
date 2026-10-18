import test from 'node:test';
import assert from 'node:assert/strict';
import { createPublicKey, verify } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const json = async path => JSON.parse(await readFile(new URL('../' + path, import.meta.url), 'utf8'));
const canonical = value => Array.isArray(value)
  ? '[' + value.map(canonical).join(',') + ']'
  : value && typeof value === 'object'
    ? '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}'
    : JSON.stringify(value);

const receiptSha = '77549c561032c35e6c78bb52885ddcc0022d64a7115bb230c8997286e61e8d0a';
const origin = 'https://conversation-lab-ghrab.pages.dev/';
const trustKey = Object.freeze({
  kty: 'EC', crv: 'P-256',
  x: 'bYxfni4Vsy90xRYtk8qdP9oSame-uHavew5XjHgy3K0',
  y: 'aEC5jZaXh9Ipj-xrG5_myRsh6T32GhTIfQ9dgFWQJxg'
});

test('E103: exact signed CLB-01 training bundle remains cryptographically valid in a TEN-APP candidate', async () => {
  const [bundle, signature, trust, policy, apps, fallback, sources] = await Promise.all([
    ...['src/config/access-config-bundle.json', 'src/config/access-config-bundle.sig.json',
      'src/config/access-config-verify-key.json', 'src/config/access-policy.json',
      'src/config/apps.generated.json', 'src/config/apps.fallback.json',
      'src/config/sources.json'].map(json)
  ]);
  assert.equal(bundle.version, 'access-p1-20261018062951Z');
  assert.equal(signature.schema, 'ghrab-access-config-signature-v1');
  assert.equal(signature.algorithm, 'ES256');
  assert.equal(signature.keyId, 'ghrab-access-bundle-20260822195407Z-fxjS8DK9');
  assert.equal(signature.keyId, trust.keyId);
  for (const field of ['kty', 'crv', 'x', 'y']) assert.equal(trust.publicKey[field], trustKey[field]);
  assert.equal(signature.bundleVersion, bundle.version);
  const key = createPublicKey({ key: trustKey, format: 'jwk' });
  assert.equal(verify('sha256', Buffer.from(canonical(bundle), 'utf8'),
    { key, dsaEncoding: 'ieee-p1363' }, Buffer.from(signature.signature, 'base64url')), true);
  assert.deepEqual(bundle.policy, policy);
  assert.equal(Object.keys(policy.applications).length, 10);
  assert.deepEqual(policy.applications['conversation-lab'], {
    trainingRequired: true, trainingCode: 'CLB-01', trainingVersion: '2026-10',
    label: { cs: 'Conversation Lab', en: 'Conversation Lab' }
  });
  const tampered = structuredClone(bundle);
  tampered.policy.applications['conversation-lab'].trainingRequired = false;
  assert.equal(verify('sha256', Buffer.from(canonical(tampered), 'utf8'),
    { key, dsaEncoding: 'ieee-p1363' }, Buffer.from(signature.signature, 'base64url')), false);
  for (const list of [apps, fallback, sources]) {
    assert.equal(list.length, 10, 'ten-app candidate must include the exact catalog entry');
    assert.equal(list.filter(x => x.id === 'conversation-lab').length, 1);
  }
  assert.deepEqual(apps, fallback);
});

test('E103: ten-app catalog staging is NOT equivalent to authority to launch', async () => {
  const [control, gates, apps, promotion, enrollment, receipt] = await Promise.all([
    ...['src/integration/conversation-lab/launch-control.json',
      'src/integration/conversation-lab/activation-gates.json',
      'src/config/apps.generated.json',
      'src/config/release-promotion-policy.json',
      'security/garp27/conversation-lab-enrollment.json',
      'src/integration/conversation-lab/owner-content-release.signed.json'].map(json)
  ]);
  assert.equal(control.stage, 'PRELIVE_HOLD');
  assert.equal(control.launchEnabled, false);
  assert.equal(control.publicOrigin, null);
  assert.equal(control.releaseId, null);
  assert.equal(control.ownerReleaseAuthorization, 'NOT_GRANTED');
  assert.equal(control.signedReleaseStatementSha256, null);
  assert.equal(control.publicRelease, 'NO_GO');
  assert.equal(control.garpLive, 'NOT_TESTED');
  assert.equal(control.autoPromotion, 'DISABLED');
  assert.equal(control.crossRepositoryDispatch, 'DISABLED');
  assert.equal(gates.independentSecurityGo, 'NOT_GRANTED');
  assert.equal(gates.studioP5, 'NOT_RUN_FOR_THIS_RELEASE');
  assert.equal(gates.launcherEnabled, false);
  assert.equal(gates.signing.ownerContentSignatureVerified, true);
  assert.equal(gates.signing.ownerContentStatementSha256, receiptSha);
  assert.equal(receipt.statementSha256, receiptSha);
  assert.equal(receipt.statement.studioProductionPromotion, 'NO_GO_UNTIL_SEPARATE_GATES');
  assert.equal(receipt.studioReleaseGo, false);
  assert.equal(enrollment.publicDeployment, 'NO_GO');
  assert.equal(enrollment.studioLauncher, 'DISABLED');
  assert.equal(enrollment.garpLive, 'NOT_TESTED');
  assert.equal(promotion.applications.some(x => x.id === 'conversation-lab'), false);
  const tile = apps.find(x => x.id === 'conversation-lab');
  assert.equal(tile.version, '0.9.1');
  assert.equal(tile.integration.launchMode, 'external-protected');
  assert.equal(tile.integration.externalTargetUrl, origin);
  assert.equal(tile.integration.teacherTrainingRequired, true);
  assert.equal(tile.integration.studioAccessIsLauncherGateOnly, true);
  assert.equal(tile.integration.credentialBridgeAllowed, false);
  assert.equal(tile.integration.autoPromotionAllowed, false);
  assert.equal(tile.integration.signedStatementSha256, null);
  assert.equal(tile.integration.releaseId, 'cl-ai-b1-pilot-20261018');
});
