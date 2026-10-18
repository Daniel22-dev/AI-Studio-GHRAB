/**
 * Conversation Lab E9 - separate-origin teacher launcher assurance.
 * This is a guard, NOT a release approver. Current checked-in launch-control
 * blocks ALL teacher launches. Human content, GARP LIVE, signed release bytes
 * and verified HTTPS origin are independent, mandatory acceptance gates.
 *
 * Public student direct entry remains anonymous and cannot receive Studio
 * tokens. This Studio-only helper is never shipped to the public player.
 */
const APP_ID='conversation-lab';
const SHA64=/^[a-f0-9]{64}$/;
const RELEASE_ID=/^cl-[a-z0-9]+(?:-[a-z0-9]+)*$/;
const deny=code=>{throw Error('CLB_E9_'+code);};

/**
 * The Studio's requiredTraining() is sourced from the verified access bundle,
 * NOT a local unsigned JSON file. This check precedes hasAppAccess() so even
 * administrator overrides cannot accidentally use an absent/incorrect CLB
 * policy. Signed permit issuance and any admin override remain managed by
 * Studio, not by the public anonymous player.
 */
export function assertClbSignedTrainingPolicy(policy) {
  if(!policy || typeof policy!=='object' ||
    policy.trainingRequired!==true ||
    policy.trainingCode!=='CLB-01' ||
    policy.trainingVersion!=='2026-10' ||
    typeof policy.label?.cs!=='string' ||
    policy.label.cs!=='Conversation Lab' ||
    typeof policy.label?.en!=='string' ||
    policy.label.en!=='Conversation Lab')
    deny('SIGNED_TRAINING_POLICY_REQUIRED');
  return true;
}

export function validateClbPreliveControl(control) {
  if(!control || control.schema!=='ghrab-cl-studio-e9-teacher-launch-control-v1' ||
    control.appId!==APP_ID || control.stage!=='PRELIVE_HOLD' ||
    control.launchEnabled!==false ||
    control.teacherTrainingRequired!==true ||
    control.requiredTrainingCode!=='CLB-01' ||
    control.requiredTrainingVersion!=='2026-10' ||
    control.publicPlayer!=='ANONYMOUS_READ_ONLY' ||
    control.teacherEntry!=='STUDIO_PERMIT_AND_TRAINING_GATED' ||
    control.studentDirectEntry!=='ANONYMOUS_NO_STUDIO_ACCOUNT' ||
    control.publicOrigin!==null ||
    control.studioCredentialBridge!=='FORBIDDEN' ||
    control.publishStudentData!==false ||
    control.releaseId!==null || control.approvedDistributionManifestSha256!==null ||
    control.signedReleaseStatementSha256!==null ||
    control.ownerReleaseAuthorization!=='NOT_GRANTED' ||
    control.hostingOwnership!=='NOT_VERIFIED' ||
    control.hostingHeaders!=='NOT_VERIFIED' ||
    control.garpLive!=='NOT_TESTED' ||
    control.publicRelease!=='NO_GO' ||
    control.approvedLessons!==0 || control.approvedCzechGlosses!==0 ||
    control.autoPromotion!=='DISABLED' ||
    control.crossRepositoryDispatch!=='DISABLED')deny('PRELIVE_CONTROL_DRIFT');
  return true;
}
function canonicalOrigin(input) {
  if(typeof input!=='string' || input.length>240)deny('ORIGIN_MISSING');
  let url;try{url=new URL(input)}catch{deny('ORIGIN_INVALID')}
  if(url.origin!==input || url.protocol!=='https:' || url.username || url.password ||
    url.pathname!=='/' || url.search || url.hash || url.port ||
    url.hostname==='localhost' || url.hostname.endsWith('.invalid'))
    deny('ORIGIN_UNTRUSTED');
  return url.origin;
}

/**
 * Caller MUST independently call initialiseAccess() + hasAppAccess('conversation-lab').
 * The approved public CDN is NOT protected by Studio authentication; it can be
 * opened directly by any student with the link after release.
 */
export function validateConversationLabTeacherTarget(app,control,{studioOrigin}={}) {
  if(!app || app.id!==APP_ID || !control ||
    control.schema!=='ghrab-cl-studio-e9-teacher-launch-control-v1' ||
    control.appId!==APP_ID)deny('APP_OR_CONTROL_IDENTITY');
  if(control.stage!=='PRODUCTION_AUTHORIZED' || control.launchEnabled!==true ||
    control.teacherTrainingRequired!==true ||
    control.requiredTrainingCode!=='CLB-01' ||
    control.requiredTrainingVersion!=='2026-10' ||
    control.publicPlayer!=='ANONYMOUS_READ_ONLY' ||
    control.teacherEntry!=='STUDIO_PERMIT_AND_TRAINING_GATED' ||
    control.studentDirectEntry!=='ANONYMOUS_NO_STUDIO_ACCOUNT' ||
    control.studioCredentialBridge!=='FORBIDDEN' ||
    control.publishStudentData!==false ||
    control.ownerReleaseAuthorization!=='SIGNED' ||
    control.hostingOwnership!=='VERIFIED' ||
    control.hostingHeaders!=='VERIFIED' ||
    // GARP 2.7 FOUNDATION (static standalone) is independent from future
    // school-server LIVE. A published B1 on Cloudflare cannot honestly certify
    // a server which has not been deployed; it must remain NOT_TESTED.
    control.garpLive!=='NOT_TESTED' ||
    control.garpFoundation!=='VERIFIED_STATIC_GARP27_0_9_1' ||
    control.publicClientLive!=='VERIFIED_EXACT_21_FILES' ||
    control.schoolServerLive!=='DEFERRED_NOT_TESTED' ||
    control.independentSecurityApproval!=='SIGNED_AND_VERIFIED' ||
    control.publicRelease!=='MANUAL_RELEASE_APPROVED' ||
    !Number.isSafeInteger(control.approvedLessons) || control.approvedLessons<1 ||
    !Number.isSafeInteger(control.approvedCzechGlosses) || control.approvedCzechGlosses<1 ||
    control.autoPromotion!=='DISABLED' ||
    control.crossRepositoryDispatch!=='DISABLED' ||
    !RELEASE_ID.test(control.releaseId??'') ||
    !SHA64.test(control.approvedDistributionManifestSha256??'') ||
    !SHA64.test(control.signedReleaseStatementSha256??''))deny('RELEASE_NOT_AUTHORIZED');
  // First pilot is exact scoped release v0.9.1, not blanket permission for
  // later unpublished lessons or a new origin. A new release must change
  // this source-level trust policy and pass review again.
  if(app.version!=='0.9.1' ||
    control.releaseId!=='cl-ai-b1-pilot-20261018' ||
    control.publicOrigin!=='https://conversation-lab-ghrab.pages.dev' ||
    control.approvedDistributionManifestSha256!=='93813482fabf53fe3ff5c0657b4f6b9c362f912aa496dd44c5b2c38de5ee7b4f' ||
    control.publicStudioManifestSha256!=='e139a829fadc59e1563632aae9995334c87e0b23f991dcf5e6b41dc9c1b51464' ||
    control.approvedLessons!==1 || control.approvedCzechGlosses!==37)
    deny('PILOT_SCOPE_MISMATCH');
  const studio=canonicalOrigin(studioOrigin);
  const publicOrigin=canonicalOrigin(control.publicOrigin);
  if(studio===publicOrigin)deny('ORIGIN_MUST_BE_ISOLATED');
  if(app.integration?.launchMode!=='external-protected' ||
    app.integration?.securityBoundary!=='isolated-anonymous-read-only' ||
    app.integration?.requiresHttps!==true ||
    app.integration?.contentMode!=='approved-public-only' ||
    app.integration?.studioAccessIsLauncherGateOnly!==true ||
    app.integration?.teacherTrainingRequired!==true ||
    app.integration?.credentialBridgeAllowed!==false ||
    app.integration?.autoPromotionAllowed!==false ||
    app.integration?.releaseId!==control.releaseId ||
    app.integration?.manifestSha256!==control.approvedDistributionManifestSha256 ||
    // The externally published Studio manifest is intentionally stable and
    // declares no production signature. A separately verified ES256 owner
    // content release lives on the trusted Studio origin, referenced by the
    // exact digest in launch-control; no third Cloudflare upload is required.
    app.integration?.signedStatementSha256!==null)
    deny('MANIFEST_RELEASE_BINDING');
  const raw=app.integration.externalTargetUrl;
  if(typeof raw!=='string')deny('TARGET_UNTRUSTED');
  let target;try{target=new URL(raw)}catch{deny('TARGET_UNTRUSTED')}
  if(target.href!==publicOrigin+'/' || target.origin!==publicOrigin ||
     target.pathname!=='/' || target.search || target.hash ||
     target.username || target.password)deny('TARGET_NOT_EXACT_PUBLIC_ORIGIN');
  // Only an exact public root is transferred. No teacher permit, user ID,
  // query, referrer token, roster or callback can be appended.
  return target.href;
}

/** Static teacher launch control is stored within Studio origin only. */
export async function checkedConversationLabTarget(app,{
  studioOrigin,fetchImpl=globalThis.fetch
}={}) {
  if(typeof fetchImpl!=='function')deny('CONFIG_FETCH_UNAVAILABLE');
  const response=await fetchImpl('../../integration/conversation-lab/launch-control.json',{
    method:'GET',credentials:'same-origin',cache:'no-store',redirect:'error'
  });
  if(!response?.ok || response.redirected)deny('CONTROL_UNAVAILABLE');
  let control;try{control=await response.json()}catch{deny('CONTROL_INVALID_JSON')}
  return validateConversationLabTeacherTarget(app,control,{studioOrigin});
}
