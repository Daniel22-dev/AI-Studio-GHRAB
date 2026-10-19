/** Bind the unchanged public manifest to its separately verified Studio receipt. */
import { readFileSync } from 'node:fs';
import { webcrypto, createHash } from 'node:crypto';
import profile from '../../src/conversation-lab/release-profile.js';
import { verifyClbMasterOwnerContentReceipt } from '../../src/integration/conversation-lab/teacher-launch.js';
const receipt = JSON.parse(readFileSync(new URL('../../src/integration/conversation-lab/owner-content-release.v0.11.0.signed.json', import.meta.url)));
await verifyClbMasterOwnerContentReceipt(receipt, profile, { cryptoImpl: webcrypto });
const expectedUrl = profile.publicOrigin + '/studio-manifest.json';
export function verifyClbPublicManifestBytes(raw, source) {
  if (source.id !== 'conversation-lab') return;
  if (source.url !== expectedUrl || createHash('sha256').update(raw).digest('hex') !== profile.publicStudioManifestSha256)
    throw Error('CLB_PUBLIC_MANIFEST_PIN_MISMATCH');
}
export function bindClbMasterRegistry(app, source) {
  if (app.id !== 'conversation-lab') return app;
  if (source.id !== app.id || source.url !== expectedUrl || app.version !== profile.appVersion ||
      app.integration?.launchMode !== 'studio-teacher' || app.integration?.releaseId !== profile.releaseId ||
      app.integration?.manifestSha256 !== profile.publicCatalogSha256 || app.integration?.externalTargetUrl !== profile.publicOrigin + '/' ||
      app.integration?.credentialBridgeAllowed !== false || app.integration?.autoPromotionAllowed !== false ||
      app.integration?.teacherTrainingRequired !== true ||
      ![null, profile.signedReleaseStatementSha256].includes(app.integration?.signedStatementSha256))
    throw Error('CLB_REGISTRY_RELEASE_BINDING_MISMATCH');
  return { ...app, integration: { ...app.integration, signedStatementSha256: profile.signedReleaseStatementSha256 } };
}
