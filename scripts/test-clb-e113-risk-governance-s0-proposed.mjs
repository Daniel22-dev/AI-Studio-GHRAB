import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const load=async p=>JSON.parse(await readFile(new URL('../'+p,import.meta.url),'utf8'));
const base='src/integration/conversation-lab/';

test('E113 institutional S0 proposal is not an independent security approval or GARP change',async()=>{
 const [risk,control,gate,enrol,apps,fallback,promotion]=await Promise.all([
  load(base+'governance/s0-risk-proposal.v0.9.2.json'),
  load(base+'launch-control.json'),
  load(base+'activation-gates.json'),
  load('security/garp27/conversation-lab-enrollment.json'),
  load('src/config/apps.generated.json'),
  load('src/config/apps.fallback.json'),
  load('src/config/release-promotion-policy.json')
 ]);
 assert.equal(risk.schema,'ghrab-clb-s0-risk-classification-proposal-v1');
 assert.equal(risk.version,'0.9.2');
 assert.equal(risk.status,'PROPOSED_NOT_APPROVED');
 assert.equal(risk.effectivePolicy,'GARP_2_7_CURRENT_RULES_UNCHANGED');
 assert.equal(risk.riskAccepted,false);
 assert.equal(risk.productionGO,false);
 assert.equal(risk.reviewerSignature,'NOT_PRESENT');
 assert.equal(risk.institutionalApprover,'NOT_RECORDED');
 assert.equal(risk.riskReview.isHumanSecurityCertification,false);
 assert.equal(risk.riskReview.hasInstitutionalAuthority,false);
 assert.equal(risk.signatureTrustRoot,'NOT_ESTABLISHED_SEPARATE_INSTITUTIONAL_KEY');
 assert.equal(risk.publicArtifactZipSha256,'eeca610e36ea3f11366297728af39510ee9541f8960de72c444ea6683a8f84c0');
 assert.equal(risk.contentOwnerConsentSha256,'6f0588801d7ec4bc5b3314a4e351603cd6993890ef56b2a636ee497d0b3848c5');
 assert.deepEqual(risk.residualFindings.map(x=>x.id),['F-01','F-03','F-04','F-05','F-06']);
 assert.equal(risk.residualFindings.find(x=>x.id==='F-01').fixInSigned092,false);
 assert.equal(risk.residualFindings.find(x=>x.id==='F-03').evidence,'NOT_INSPECTED');
 assert.equal(risk.notCovered.includes('SERVER_SESSION'),true);
 assert.equal(control.stage,'PRELIVE_HOLD');
 assert.equal(control.launchEnabled,false);
 assert.equal(control.publicRelease,'NO_GO');
 assert.equal(control.ownerReleaseAuthorization,'NOT_GRANTED');
 assert.equal(control.releaseId,null);
 assert.equal(gate.independentSecurityGo,'NOT_GRANTED');
 assert.equal(gate.studioP5,'NOT_RUN_FOR_THIS_RELEASE');
 assert.equal(gate.runtimeRegistryModified,false);
 assert.equal(enrol.admission,'REGISTERED_PRELIVE_POLICY_ONLY');
 assert.equal(enrol.publicDeployment,'NO_GO');
 assert.equal(enrol.studioLauncher,'DISABLED');
 assert.equal(apps.length,9);
 assert.deepEqual(apps,fallback);
 assert.equal(apps.some(x=>x.id==='conversation-lab'),false);
 assert.equal(promotion.applications.some(x=>x.id==='conversation-lab'),false);
});
