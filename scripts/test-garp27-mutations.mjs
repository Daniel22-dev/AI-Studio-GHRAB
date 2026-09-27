#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';

const checks=[];
const add=(id,pass,detail='')=>checks.push({id,pass:Boolean(pass),detail:String(detail).slice(0,400)});
const read=(p)=>fs.readFileSync(p,'utf8');
const json=(p)=>JSON.parse(read(p));
const sha=(p)=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');

const access=read('src/access/access-control.js');
const runtime=read('src/access/platform-runtime.js');
const material=read('src/shared/material-validator.js');
const app=read('src/app.js');
const sw=read('src/sw.js');
const deployment=json('src/config/deployment.json');
const school=json('src/config/deployment.school-server.json');
const inventory=json('security/garp27/capability-inventory.json');
const core=json('src/config/ai-core.json');
const policy=json('src/config/release-promotion-policy.json');
const autoPatch=read('scripts/test-auto-patch-idempotence.mjs');
const foundationGate=read('scripts/garp27/foundation-gate.mjs');
const releaseIdentity=read('scripts/create-studio-release-identity.mjs');
const p5Workflow=read('.github/workflows/p5-release-gate.yml');
const deployWorkflow=read('.github/workflows/deploy.yml');

add('signed-permit-ecdsa-p256', access.includes('crypto.subtle.verify') && access.includes('namedCurve: "P-256"') && access.includes('invalid-signature'));
add('signed-bundle-fail-closed', access.includes('verifyAccessBundle') && access.includes('invalid access bundle signature') && access.includes('configuration-stale'));
add('revocation-enforced', access.includes('revokedBefore') && access.includes('revokedJti') && access.includes('return "revoked"'));
add('school-local-provider-keys-disabled', school.profile==='school-server' && school.features?.allowLocalProviderKeys===false && school.authMode==='server-session');
add('studio-ui-has-no-ai-transport', deployment.aiTransport==='not-applicable' && school.aiTransport==='not-applicable' && inventory.aiOperations?.length===0 && inventory.agentic===false);
add('shared-device-cleanup-verification', runtime.includes('verifyManifestClear') && runtime.includes('clearByManifest') && runtime.includes('deleteMyData') && runtime.includes('endWork'));
add('suite-session-tombstone', runtime.includes('ghrab.platform.suite-session-generation.v1') && runtime.includes('signalSuiteSessionEnd'));
add('bounded-material-input', /sourceText:\s*500000/.test(material) && material.includes('překračuje limit'));
add('artifact-envelope-checksum', app.includes('verifyChecksum: true') && app.includes('maxBytes: 500000'));
let coreDigests=true;
for(const [name,meta] of Object.entries(core.activeRelease?.artifacts||{})){ const f=path.join('src',core.activeRelease.releasePath,name); if(!fs.existsSync(f)||sha(f)!==String(meta.sha256||'').toLowerCase()) coreDigests=false; }
add('ai-core-immutable-digests', coreDigests && core.distribution?.immutableRelease===true && core.distribution?.consumerCopiesMustMatchSha256===true);
const installStart=sw.indexOf("addEventListener('install'"); const activateStart=sw.indexOf("addEventListener('activate'"); const installBody=installStart>=0&&activateStart>installStart?sw.slice(installStart,activateStart):'';
add('service-worker-no-auto-skip-waiting', installStart>=0 && !installBody.includes('skipWaiting'));
add('safe-promotion-serialized-idempotent', autoPatch.includes('group:\\s*ai-studio-auto-patch-ingest') && autoPatch.includes('identical already-accepted dispatch must be a NO-OP'));
add('release-policy-has-reviewed-auto-patch-set', Array.isArray(policy.applications) && policy.applications.length>=9 && policy.applications.every((x)=>x.id&&x.mode&&x.assuranceBaseline&&x.requiredVerification));
add('foundation-release-source-binding', foundationGate.includes('process.env.GHRAB_SOURCE_COMMIT') && releaseIdentity.includes('foundation.sourceIdentity?.value || ""') && releaseIdentity.includes('FOUNDATION source mismatch') && p5Workflow.includes('GHRAB_SOURCE_COMMIT: ${{ github.event.pull_request.head.sha || github.sha }}') && deployWorkflow.includes('GHRAB_SOURCE_COMMIT: ${{ github.sha }}'));

const failed=checks.filter((x)=>!x.pass).length;
console.log(JSON.stringify({classification:'AI_STUDIO_GARP27_MUTATIONS',status:failed?'FAIL':'PASS',checks,summary:{total:checks.length,passed:checks.length-failed,failed}},null,2));
process.exit(failed?1:0);
