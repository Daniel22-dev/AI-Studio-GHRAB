/**
 * Studio portal routing for Conversation Lab.
 * Only CLB uses the protected external launcher. Other apps preserve the
 * unchanged historic embedded viewer path.
 *
 * The public CLB player remains independently available to students at
 * its anonymous direct URL; Studio access is the teacher-side entry gate.
 */
export function studioPortalDestination(app,base) {
  if(typeof app?.id!=='string' || !app.id)throw Error('STUDIO_APP_ID_REQUIRED');
  const params=new URLSearchParams({app:app.id});
  if(app.id==='conversation-lab') {
    if(app.integration?.launchMode!=='external-protected')
      throw Error('CLB_E9_PORTAL_REQUIRES_PROTECTED_LAUNCHER');
    return `${base}app/external/?${params.toString()}`;
  }
  return `${base}app/?${params.toString()}`;
}
