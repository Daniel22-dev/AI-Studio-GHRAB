#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";

const root=process.cwd(), dist=path.join(root,"dist"), evidenceDir=path.join(root,"qa-results","release-current");
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
const consumer=JSON.parse(fs.readFileSync("ghrab-platform.consumer.json","utf8"));
const appId="ai-studio", version=pkg.version;
const source=String(process.env.GHRAB_SOURCE_COMMIT||process.env.GITHUB_SHA||"").trim().toLowerCase();
const repository=String(process.env.GHRAB_SOURCE_REPOSITORY||process.env.GITHUB_REPOSITORY||"Daniel22-dev/AI-Studio-GHRAB").trim();
const runId=String(process.env.GITHUB_RUN_ID||"local"), runAttempt=String(process.env.GITHUB_RUN_ATTEMPT||"1");
const workflowRef=String(process.env.GITHUB_WORKFLOW_REF||"local");
const buildId=String(process.env.GHRAB_BUILD_ID||`github-${runId}-${runAttempt}`);
const releaseStage=String(process.env.GHRAB_RELEASE_STAGE||"PREP-VALIDATION");
if(!fs.existsSync(dist)) throw new Error("Studio release identity: missing dist");
if(!/^[0-9a-f]{40}$/.test(source)) throw new Error("Studio release identity: full 40-char source commit required");
const sha=f=>crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex");
function run(script,args=[],env={}){
  const r=spawnSync(process.execPath,[path.join(root,script),...args],{cwd:root,encoding:"utf8",env:{...process.env,...env}});
  if(r.status!==0) throw new Error(`${script} failed (exit ${r.status})\n${r.stdout||""}\n${r.stderr||""}`);
  return String(r.stdout||"")+String(r.stderr||"");
}

const manifest={
  schema:"ai-studio-release-manifest-v1", id:appId, version,
  repository:"Daniel22-dev/AI-Studio-GHRAB",
  launchUrl:"https://daniel22-dev.github.io/AI-Studio-GHRAB/",
  platform:{contract:consumer.platform.contract,version:consumer.platform.version,requiredRange:consumer.platform.requiredRange,brandVersion:consumer.brand.version},
  studioBridge:{contract:consumer.bridge.contract,maxBytes:consumer.bridge.maxBytes},
  artifact:{schema:consumer.artifact.schema,checksum:consumer.artifact.checksum,exports:consumer.artifact.exports,imports:consumer.artifact.imports},
  storage:{namespace:"ghrab.ai-studio.",migration:consumer.storageMigration?.id||null},
  cache:{name:consumer.cache.name,updateMessage:consumer.cache.updateMessage},
  releaseIdentity:{contract:"ghrab-release-integrity-v2",url:"./release-integrity.json"},
  deployment:{profile:"github-pages",sourceCommit:source,releaseStage}
};
fs.writeFileSync(path.join(dist,"studio-manifest.json"),JSON.stringify(manifest,null,2)+"\n");
run("scripts/verify-studio-release-manifest.mjs",[path.join(dist,"studio-manifest.json")]);
run("scripts/generate-studio-sbom.mjs",[path.join(dist,"sbom.cdx.json")]);

fs.rmSync(evidenceDir,{recursive:true,force:true}); fs.mkdirSync(evidenceDir,{recursive:true});
const context={schema:"ghrab-release-evidence-context-v1",appId,version,sourceCommit:source,
 buildRun:{provider:process.env.GITHUB_ACTIONS==="true"?"github-actions":"local",repository,workflowRef,runId,runAttempt},
 tooling:{garp:"2.5.1",platform:consumer.platform.version,node:process.version},profile:"GARP-2.5.1-SHIELD-PREP",gate:"P5-R2",
 releaseStage,environment:releaseStage==="LIVE-PUBLIC-PAGES"?"github-pages":"pre-production",status:"GREEN",createdAt:new Date().toISOString()};
fs.writeFileSync(path.join(evidenceDir,"release-context.json"),JSON.stringify(context,null,2)+"\n");
fs.writeFileSync(path.join(evidenceDir,"garp-tooling.txt"),run("security/garp25/tools/selftest-garp251.mjs"),"utf8");
fs.writeFileSync(path.join(evidenceDir,"source-secret-scan.txt"),run("security/garp25/tools/scan-source-secrets.mjs",["."]),"utf8");
fs.writeFileSync(path.join(evidenceDir,"deployment-leak-scan.txt"),run("security/garp25/tools/scan-deployment-leaks.mjs",[dist]),"utf8");
fs.writeFileSync(path.join(evidenceDir,"manifest-contract.txt"),run("scripts/verify-studio-release-manifest.mjs",[path.join(dist,"studio-manifest.json")]),"utf8");

run("security/garp25/tools/create-build-provenance.mjs",[path.join(dist,"studio-manifest.json"),path.join(dist,"build-provenance.json")],{
 GHRAB_SOURCE_REPOSITORY:repository,GHRAB_SOURCE_COMMIT:source,
 GHRAB_BUILDER_ID:process.env.GITHUB_ACTIONS==="true"?`github-actions://${repository}`:"local-untrusted-builder",
 GHRAB_WORKFLOW_REF:workflowRef,GHRAB_BUILD_ENTRYPOINT:"npm run prepare:studio-release",
 GHRAB_BUILD_FINISHED_AT:new Date().toISOString(),GHRAB_LOCKFILE:path.join(root,"package-lock.json"),
 GHRAB_BUILD_PROFILE:"GARP-2.5.1-SHIELD-PREP/P5-R2"
});
run("security/garp25/tools/create-evidence-manifest.mjs",[evidenceDir,path.join(dist,"security-evidence-manifest.json"),
 "--project-root",root,"--extra","package.json","--extra","package-lock.json","--extra","ghrab-platform.consumer.json",
 "--extra",".github/workflows/p5-release-gate.yml","--extra",".github/workflows/safe-promotion.yml","--extra",".github/workflows/deploy.yml"],{
 GHRAB_APP_ID:appId,GHRAB_APP_VERSION:version,GHRAB_SOURCE_COMMIT:source
});

const manifestSha256=sha(path.join(dist,"studio-manifest.json"));
const sbomSha256=sha(path.join(dist,"sbom.cdx.json"));
const buildProvenanceSha256=sha(path.join(dist,"build-provenance.json"));
const evidenceManifestSha256=sha(path.join(dist,"security-evidence-manifest.json"));
const integrityPath=path.join(dist,"release-integrity.json");
run("security/garp25/tools/create-release-integrity.mjs",[dist,appId,version,"TRANSITIONAL-UNSIGNED",integrityPath],{
 GHRAB_BUILD_ID:buildId,GHRAB_SOURCE_COMMIT:source,GHRAB_BUILD_PROVENANCE_SHA256:buildProvenanceSha256,
 GHRAB_SBOM_SHA256:sbomSha256,GHRAB_EVIDENCE_MANIFEST_SHA256:evidenceManifestSha256
});
const integrity=JSON.parse(fs.readFileSync(integrityPath,"utf8"));
Object.assign(integrity,{assuranceMode:"TRANSITIONAL",releaseStage,status:"GREEN",
 environment:releaseStage==="LIVE-PUBLIC-PAGES"?"github-pages":"pre-production",garpProfile:"GARP-2.5.1-SHIELD-PREP",gate:"P5-R2",
 manifestSha256,sbomSha256,buildProvenanceSha256,evidenceManifestSha256,buildRun:context.buildRun,tooling:context.tooling,
 signature:{algorithm:"Ed25519",keyId:"TRANSITIONAL-UNSIGNED",status:"NOT_PRESENT",note:"TRANSITIONAL: exact release identity is machine-verified; no production signing key is asserted."}});
fs.writeFileSync(integrityPath,JSON.stringify(integrity,null,2)+"\n");
run("security/garp25/tools/verify-release-integrity.mjs",[dist,integrityPath]);
run("security/garp25/tools/scan-deployment-leaks.mjs",[dist]);
console.log(JSON.stringify({status:"PASS",appId,version,sourceCommit:source,artifactDigest:integrity.artifactDigest,releaseStage,assuranceMode:"TRANSITIONAL",manifestSha256,sbomSha256,buildProvenanceSha256,evidenceManifestSha256},null,2));
