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
const PILOT_RELEASES=Object.freeze({
  '0.9.1':Object.freeze({
    version:'0.9.1',releaseId:'cl-ai-b1-pilot-20261018',
    publicOrigin:'https://conversation-lab-ghrab.pages.dev',
    staticZipSha:'4c37353e88a64512a112b7ed2912dddf3d73955c5fe4a493f1a6c89533d76d4d',
    manifestSha:'e139a829fadc59e1563632aae9995334c87e0b23f991dcf5e6b41dc9c1b51464',
    catalogSha:'93813482fabf53fe3ff5c0657b4f6b9c362f912aa496dd44c5b2c38de5ee7b4f',
    lessonSha:'4a163857dc2b90e3b9a3a60e8e4440f7c45c2a1f2530f970a99543925fe390b9',
    appJsSha:'dabcaced97ca6ec21890a43eb43cf5da3600d106d0164fd5de570ebc7855c03a',
    statementSha:'77549c561032c35e6c78bb52885ddcc0022d64a7115bb230c8997286e61e8d0a',
    foundation:'VERIFIED_STATIC_GARP27_0_9_1',
    receiptPath:'../../integration/conversation-lab/owner-content-release.signed.json'
  }),
  '0.9.2':Object.freeze({
    version:'0.9.2',releaseId:'cl-ai-b1-pilot-20261018-r2',
    publicOrigin:'https://conversation-lab-ghrab.pages.dev',
    staticZipSha:'eeca610e36ea3f11366297728af39510ee9541f8960de72c444ea6683a8f84c0',
    manifestSha:'c071bc4af56367458fb4e391019d3476790111f31495718e737bc339ee5cd134',
    catalogSha:'2ab4cab8e95a8c124f1f8670b1cfe861f3e7557dfe9ece89c768bb2d7121fce6',
    lessonSha:'4a163857dc2b90e3b9a3a60e8e4440f7c45c2a1f2530f970a99543925fe390b9',
    appJsSha:'dabcaced97ca6ec21890a43eb43cf5da3600d106d0164fd5de570ebc7855c03a',
    statementSha:'6f0588801d7ec4bc5b3314a4e351603cd6993890ef56b2a636ee497d0b3848c5',
    foundation:'VERIFIED_STATIC_GARP27_0_9_2',
    receiptPath:'../../integration/conversation-lab/owner-content-release.v0.9.2.signed.json'
  })
});
// Strictly scoped release pins are code-reviewed. Merely listing a signed owner
// receipt DOES NOT authorize any release: launch-control remains PRELIVE_HOLD,
// and independent security, exact live deployment and P5 remain mandatory.
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
  const release=PILOT_RELEASES[app.version];
  if(!release)deny('PILOT_SCOPE_MISMATCH');
  if(control.stage!=='PRODUCTION_AUTHORIZED' || control.launchEnabled!==true ||
    control.teacherTrainingRequired!==true ||
    control.requiredTrainingCode!=='CLB-01' ||
    control.requiredTrainingVersion!=='2026-10' ||
    control.publicPlayer!=='ANONYMOUS_READ_ONLY' ||
    control.teacherEntry!=='STUDIO_PERMIT_AND_TRAINING_GATED' ||
    control.studentDirectEntry!=='ANONYMOUS_NO_STUDIO_ACCOUNT' ||
    control.studioCredentialBridge!=='FORBIDDEN' ||
    control.publishStudentData!==false ||
    control.ownerReleaseAuthorization!=='PROJECT_OWNER_S0_APPROVED' ||
    control.hostingOwnership!=='VERIFIED' ||
    control.hostingHeaders!=='VERIFIED' ||
    // GARP 2.7 FOUNDATION (static standalone) is independent from future
    // school-server LIVE. A published B1 on Cloudflare cannot honestly certify
    // a server which has not been deployed; it must remain NOT_TESTED.
    control.garpLive!=='NOT_TESTED' ||
    control.garpFoundation!==release.foundation ||
    control.publicClientLive!=='VERIFIED_EXACT_21_FILES' ||
    control.schoolServerLive!=='DEFERRED_NOT_TESTED' ||
    // S0 owner acceptance and Claude technical opposition are NOT an independently signed security certificate.
    control.independentSecurityApproval!=='OWNER_S0_AI_OPPOSITION_ACCEPTED' ||
    control.ownerRiskAcceptanceRef!=='../../integration/conversation-lab/governance/project-owner-release.v0.9.2.json' ||
    control.riskProfile!=='S0_ANONYMOUS_STATIC_PUBLIC_PLAYER_ONLY' ||
    control.publicRelease!=='MANUAL_RELEASE_APPROVED' ||
    !Number.isSafeInteger(control.approvedLessons) || control.approvedLessons<1 ||
    !Number.isSafeInteger(control.approvedCzechGlosses) || control.approvedCzechGlosses<1 ||
    control.autoPromotion!=='DISABLED' ||
    control.crossRepositoryDispatch!=='DISABLED' ||
    !RELEASE_ID.test(control.releaseId??'') ||
    !SHA64.test(control.approvedDistributionManifestSha256??'') ||
    !SHA64.test(control.signedReleaseStatementSha256??''))deny('RELEASE_NOT_AUTHORIZED');
  // Both exact, explicitly pinned public releases are accepted in SOURCE
  // only. Neither is authorized while the actual launch-control stays HOLD.
  if(app.version!=='0.9.2')deny('OWNER_S0_RELEASE_SCOPE');
  if(control.releaseId!==release.releaseId ||
    control.publicOrigin!==release.publicOrigin ||
    control.approvedDistributionManifestSha256!==release.catalogSha ||
    control.publicStudioManifestSha256!==release.manifestSha ||
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
  const release=PILOT_RELEASES[app?.version];
  if(!release)deny('OWNER_CONTENT_SCOPE_MISMATCH');
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
    statement.appId!==APP_ID||statement.appVersion!==release.version||
    statement.releaseId!==release.releaseId||
    statement.publicOrigin!==release.publicOrigin||
    statement.publicStudioManifestSha256!==release.manifestSha||
    statement.publicStaticZipSha256!==release.staticZipSha||
    statement.publicCatalogSha256!==release.catalogSha||
    statement.publicLessonSha256!==release.lessonSha||
    statement.publicAppJsSha256!==release.appJsSha||
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
    receipt.statementSha256!==release.statementSha)
    deny('OWNER_CONTENT_BINDING_MISMATCH');
  const subtle=cryptoImpl?.subtle;
  if(!subtle||typeof TextEncoder==='undefined')deny('CONTENT_CRYPTO_UNAVAILABLE');
  const bytes=new TextEncoder().encode(receipt.signingDomain+canonicalClbJson(statement));
  let okay=false;
  try{
    const digest=new Uint8Array(await subtle.digest('SHA-256',bytes));
    const digestHex=Array.from(digest,x=>x.toString(16).padStart(2,'0')).join('');
    if(digestHex!==release.statementSha)deny('OWNER_CONTENT_HASH_INVALID');
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


/**
 * Project owner acceptance is a separate PUBLIC metadata record and is NOT
 * an independent human security certificate or a digital signature. The
 * signed ES256 owner content, signed teacher permit, and actual safe-promotion
 * P5 remain separate required defenses. A modified or missing record fails
 * closed; no Studio token or identity is transferred to the public player.
 */
export function assertClbProjectOwnerS0Acceptance(record,app,control) {
  const release=PILOT_RELEASES[app?.version];
  if(!release||release.version!=='0.9.2'||
    !record||record.schema!=='ghrab-clb-project-owner-release-acceptance-v1'||
    record.appId!==APP_ID||record.appVersion!==release.version||
    record.releaseId!==control.releaseId||
    record.releaseId!==release.releaseId||
    record.publicOrigin!==release.publicOrigin||
    record.ownerGitHubLogin!=='Daniel22-dev'||
    record.ownerGitHubUserId!==287402620||
    record.ownerAuthority!=='AI_STUDIO_PROJECT_LEAD_SELF_ASSERTED'||
    record.source!=='DIRECT_PROJECT_OWNER_CHAT_INSTRUCTION'||
    record.decisionDate!=='2026-10-18'||
    record.decision!=='PROJECT_OWNER_APPROVES_TECHNICALLY_VALIDATED_LOW_RISK_PILOT_AND_TEACHER_LAUNCH_AFTER_P5'||
    record.riskAcceptanceByProjectOwner!==true||
    record.schoolInstitutionalSignoff!=='NOT_ATTESTED'||
    record.independentSecurityApproval!=='NOT_CLAIMED'||
    record.publicArtifact?.ownerSignedStatementSha256!==release.statementSha||
    record.publicArtifact?.zipSha256!==release.staticZipSha||
    record.publicArtifact?.publicManifestSha256!==release.manifestSha||
    record.publicArtifact?.publicCatalogSha256!==release.catalogSha||
    record.technicalReview?.independentHumanSecurityCertification!==false||
    record.technicalReview?.verdict!=='TECHNICAL_PRE_GO'||
    record.verification?.liveCloudflare!=='E114_19_OF_19_SHA256_5_OF_5_404'||
    record.verification?.browser!=='E115_WEBKIT_CHROMIUM_8_OF_8'||
    record.verification?.signedContent!=='ES256_TRUSTED_STUDIO_ANCHOR'||
    record.verification?.teacherAccess!=='CLB_01_SIGNED_POLICY'||
    record.studioTokenForwarding!==false||
    record.studentIdentityOrStoredAnswers!==false||
    record.autoPromotion!==false)
      deny('OWNER_S0_ACCEPTANCE_SCOPE_INVALID');
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
    signed=await fetchImpl(PILOT_RELEASES[app.version].receiptPath,{
      method:'GET',credentials:'same-origin',cache:'no-store',redirect:'error'
    });
  }catch{deny('OWNER_CONTENT_UNAVAILABLE')}
  if(!signed?.ok||signed.redirected)deny('OWNER_CONTENT_UNAVAILABLE');
  let receipt;try{receipt=await signed.json()}catch{deny('OWNER_CONTENT_INVALID_JSON')}
  await verifyClbOwnerContentReceipt(app,control,receipt,{cryptoImpl});
  let ownerDecision;
  try {
    ownerDecision=await fetchImpl(control.ownerRiskAcceptanceRef,{
      method:'GET',credentials:'same-origin',cache:'no-store',redirect:'error'
    });
  }catch{deny('OWNER_S0_ACCEPTANCE_UNAVAILABLE')}
  if(!ownerDecision?.ok||ownerDecision.redirected)deny('OWNER_S0_ACCEPTANCE_UNAVAILABLE');
  let decision;try{decision=await ownerDecision.json()}catch{deny('OWNER_S0_ACCEPTANCE_INVALID_JSON')}
  assertClbProjectOwnerS0Acceptance(decision,app,control);
  return target;
}
