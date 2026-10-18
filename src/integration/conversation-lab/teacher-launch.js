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
const OWNER_RECEIPT_DOMAIN='GHRAB-CLB-OWNER-CONTENT-RELEASE-v1\n';
const OWNER_RECEIPT_SHA='77549c561032c35e6c78bb52885ddcc0022d64a7115bb230c8997286e61e8d0a';
const OWNER_TRUST_KEY_ID='ghrab-access-bundle-20260822195407Z-fxjS8DK9';
// Pinned public key, not extracted from the receipt itself. Rotating signing
// authority must be independently reviewed and requires this code to change.
const OWNER_TRUST_PUBLIC_JWK=Object.freeze({
  kty:'EC',crv:'P-256',
  x:'bYxfni4Vsy90xRYtk8qdP9oSame-uHavew5XjHgy3K0',
  y:'aEC5jZaXh9Ipj-xrG5_myRsh6T32GhTIfQ9dgFWQJxg'
});
function canonicalClbJson(value){
  if(Array.isArray(value))return '['+value.map(canonicalClbJson).join(',')+']';
  if(value!==null&&typeof value==='object')
    return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonicalClbJson(value[k])).join(',')+'}';
  return JSON.stringify(value);
}
function decodeClbSignature(value){
  if(typeof value!=='string'||!/^[A-Za-z0-9_-]{84,92}$/.test(value))deny('CONTENT_SIGNATURE_ENCODING');
  let bytes;
  try{
    const base=value.replace(/-/g,'+').replace(/_/g,'/');
    bytes=Uint8Array.from(atob(base+'='.repeat((4-base.length%4)%4)),c=>c.charCodeAt(0));
  }catch{deny('CONTENT_SIGNATURE_ENCODING')}
  if(bytes.length!==64)deny('CONTENT_SIGNATURE_LENGTH');
  return bytes;
}

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

/**
 * Crypto-check a PUBLIC owner content receipt at the Studio origin before
 * teacher redirection. This is OWNER permission for one B1 lesson only:
 * it is never an independent security/GARP reviewer signature.
 *
 * Verified using a pinned public key in this source, NOT the receipt's
 * self-reported JWK. Cloudflare does not receive credentials or this receipt.
 */
export async function verifyClbOwnerContentReceipt(app,control,receipt,{
  cryptoImpl=globalThis.crypto
}={}) {
  if(!receipt||receipt.schema!=='ghrab-clb-owner-signed-public-release-handoff-v1'||
    receipt.purpose!=='OWNER_CONTENT_RELEASE_ONLY_NOT_INDEPENDENT_SECURITY_GO'||
    receipt.publicOnly!==true||receipt.secretIncluded!==false||
    receipt.studioReleaseGo!==false||
    receipt.signingDomain!==OWNER_RECEIPT_DOMAIN||
    receipt.signature?.algorithm!=='ES256'||
    receipt.signature?.keyId!==OWNER_TRUST_KEY_ID||
    receipt.verifyKey?.keyId!==OWNER_TRUST_KEY_ID)
    deny('OWNER_CONTENT_RECEIPT_INVALID');
  for(const field of ['kty','crv','x','y'])
    if(receipt.verifyKey?.publicKey?.[field]!==OWNER_TRUST_PUBLIC_JWK[field])
      deny('OWNER_CONTENT_TRUST_MISMATCH');
  const statement=receipt.statement;
  if(!statement||statement.schema!=='ghrab-clb-owner-content-release-statement-v1'||
    statement.purpose!=='OWNER_AUTHORISES_EXACT_AI_B1_PUBLIC_PILOT_AND_STUDIO_INTEGRATION_NOT_SECURITY_GO'||
    statement.appId!==APP_ID||statement.appVersion!=='0.9.1'||
    statement.releaseId!=='cl-ai-b1-pilot-20261018'||
    statement.publicOrigin!=='https://conversation-lab-ghrab.pages.dev'||
    statement.publicStudioManifestSha256!=='e139a829fadc59e1563632aae9995334c87e0b23f991dcf5e6b41dc9c1b51464'||
    statement.publicStaticZipSha256!=='4c37353e88a64512a112b7ed2912dddf3d73955c5fe4a493f1a6c89533d76d4d'||
    statement.publicCatalogSha256!=='93813482fabf53fe3ff5c0657b4f6b9c362f912aa496dd44c5b2c38de5ee7b4f'||
    statement.publicLessonSha256!=='4a163857dc2b90e3b9a3a60e8e4440f7c45c2a1f2530f970a99543925fe390b9'||
    statement.publicAppJsSha256!=='dabcaced97ca6ec21890a43eb43cf5da3600d106d0164fd5de570ebc7855c03a'||
    JSON.stringify(statement.approvedLessonIds)!=='["artificial-intelligence/en/B1"]'||
    statement.approvedLessonCount!==1||
    statement.contextualOfflineCzechGlosses!==37||
    statement.ownerPedagogicalApproval!==true||
    statement.ownerPublicationRightsSelfAttested!==true||
    statement.ownerAuthorisesPublicPilot!==true||
    statement.ownerAuthorisesProtectedTeacherStudioConnection!==true||
    statement.teacherPermitAndTrainingCode!=='CLB-01'||
    statement.studentAccess!=='ANONYMOUS_READ_ONLY'||
    statement.studioCredentialBridge!=='FORBIDDEN'||
    statement.independentSecurityApproval!=='NOT_GRANTED'||
    statement.garp27SchoolRuntimeLive!=='NOT_TESTED_DEFERRED'||
    statement.studioReleaseP5!=='PENDING'||
    statement.studioProductionPromotion!=='NO_GO_UNTIL_SEPARATE_GATES')
    deny('OWNER_CONTENT_SCOPE_MISMATCH');
  if(statement.releaseId!==control.releaseId||
    statement.publicOrigin!==control.publicOrigin||
    statement.publicCatalogSha256!==control.approvedDistributionManifestSha256||
    statement.publicStudioManifestSha256!==control.publicStudioManifestSha256||
    statement.approvedLessonCount!==control.approvedLessons||
    statement.contextualOfflineCzechGlosses!==control.approvedCzechGlosses||
    statement.appVersion!==app.version||
    statement.publicCatalogSha256!==app.integration?.manifestSha256||
    receipt.statementSha256!==control.signedReleaseStatementSha256||
    receipt.statementSha256!==OWNER_RECEIPT_SHA)
    deny('OWNER_CONTENT_BINDING_MISMATCH');
  const subtle=cryptoImpl?.subtle;
  if(!subtle||typeof TextEncoder==='undefined')deny('CONTENT_CRYPTO_UNAVAILABLE');
  const bytes=new TextEncoder().encode(receipt.signingDomain+canonicalClbJson(statement));
  let okay=false;
  try{
    const digest=new Uint8Array(await subtle.digest('SHA-256',bytes));
    const digestHex=Array.from(digest,x=>x.toString(16).padStart(2,'0')).join('');
    if(digestHex!==OWNER_RECEIPT_SHA)deny('OWNER_CONTENT_HASH_INVALID');
    const pub=await subtle.importKey('jwk',OWNER_TRUST_PUBLIC_JWK,{
      name:'ECDSA',namedCurve:'P-256'
    },false,['verify']);
    okay=await subtle.verify({name:'ECDSA',hash:'SHA-256'},pub,
      decodeClbSignature(receipt.signature.signature),bytes);
  }catch(error){
    if(String(error?.message||error).startsWith('CLB_E9_'))throw error;
    deny('CONTENT_CRYPTO_VERIFY_FAILED');
  }
  if(!okay)deny('OWNER_CONTENT_SIGNATURE_INVALID');
  return true;
}

/** Static teacher launch control is stored within Studio origin only. */
export async function checkedConversationLabTarget(app,{
  studioOrigin,fetchImpl=globalThis.fetch,cryptoImpl=globalThis.crypto
}={}) {
  if(typeof fetchImpl!=='function')deny('CONFIG_FETCH_UNAVAILABLE');
  const response=await fetchImpl('../../integration/conversation-lab/launch-control.json',{
    method:'GET',credentials:'same-origin',cache:'no-store',redirect:'error'
  });
  if(!response?.ok || response.redirected)deny('CONTROL_UNAVAILABLE');
  let control;try{control=await response.json()}catch{deny('CONTROL_INVALID_JSON')}
  // Always evaluate the existing permit/training/release guard FIRST.
  // A PRELIVE_HOLD exits here and cannot be overridden by signed owner bytes.
  const target=validateConversationLabTeacherTarget(app,control,{studioOrigin});
  let signed;
  try {
    signed=await fetchImpl('../../integration/conversation-lab/owner-content-release.signed.json',{
      method:'GET',credentials:'same-origin',cache:'no-store',redirect:'error'
    });
  }catch{deny('OWNER_CONTENT_UNAVAILABLE')}
  if(!signed?.ok||signed.redirected)deny('OWNER_CONTENT_UNAVAILABLE');
  let receipt;try{receipt=await signed.json()}catch{deny('OWNER_CONTENT_INVALID_JSON')}
  await verifyClbOwnerContentReceipt(app,control,receipt,{cryptoImpl});
  return target;
}
