/**
 * Conversation Lab teacher UI: same-origin, standalone Studio route.
 * Public students use their own separate Cloudflare URL from QR links.
 * NO Cloudflare iframe (frame-ancestors denies embedding).
 *
 * Signed E9 release verification occurs inside the teacher-entry module;
 * this routing switch must never be mistaken for release authorization.
 * Existing signed B1 v0.9.2 keeps its original external launcher path.
 */
const TEACHER_VERSION = '0.11.0';
const TEACHER_RELEASE = 'cl-master-72-20261019-r1';

export function studioPortalDestination(app, base) {
  if (typeof app?.id !== 'string' || !app.id) throw Error('STUDIO_APP_ID_REQUIRED');
  const params = new URLSearchParams({app: app.id});
  if (app.id === 'conversation-lab') {
    if (app.integration?.launchMode === 'studio-teacher') {
      if (app.version !== TEACHER_VERSION ||
          app.integration.releaseId !== TEACHER_RELEASE ||
          app.integration.teacherTrainingRequired !== true ||
          app.integration.credentialBridgeAllowed !== false ||
          app.integration.securityBoundary !== 'isolated-anonymous-read-only') {
        throw Error('CLB_E9_STUDIO_TEACHER_NOT_SIGNED_READY');
      }
      // The target is locally hosted on the AI Studio origin, not Cloudflare.
      // A separate teacher-entry.js MUST enforce signed CLB-01 and E9 release.
      return `${base}conversation-lab/`;
    }
    if (app.integration?.launchMode !== 'external-protected')
      throw Error('CLB_E9_PORTAL_REQUIRES_PROTECTED_LAUNCHER');
    return `${base}app/external/?${params.toString()}`;
  }
  return `${base}app/?${params.toString()}`;
}

/** Pinned, unsigned public catalog. This is a teacher-UI navigation target,
 * not a replacement for the signed 0.11 student release or its QR links. */
export const CLB_012_PILOT_URL = 'https://conversation-lab-012-pilot.danikin35.workers.dev/';

/** Route the main Studio CTA to the approved 0.12 catalog while checking the
 * existing signed legacy manifest contract first. All other apps are unchanged. */
export function studioPrimaryPortalDestination(app, base) {
  if (typeof app?.id !== 'string' || !app.id) throw Error('STUDIO_APP_ID_REQUIRED');
  if (app.id !== 'conversation-lab') return studioPortalDestination(app, base);
  // Public 0.12 has a separate lifecycle from signed 0.11, but the Studio
  // teacher entry must still preserve its restricted no-credential boundary.
  if (app.integration?.launchMode !== 'studio-teacher' ||
      app.integration?.teacherTrainingRequired !== true ||
      app.integration?.credentialBridgeAllowed !== false ||
      app.integration?.securityBoundary !== 'isolated-anonymous-read-only')
    throw Error('CLB_012_STUDIO_LAUNCH_NOT_AUTHORIZED');
  return CLB_012_PILOT_URL;
}
