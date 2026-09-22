#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
const root=process.cwd(), dist=path.join(root,"dist"), ev=path.join(root,"qa-results","release-current");
const pkg=JSON.parse(fs.readFileSync("package.json","utf8")), appId="ai-studio";
const files={integrity:path.join(dist,"release-integrity.json"),manifest:path.join(dist,"studio-manifest.json"),sbom:path.join(dist,"sbom.cdx.json"),provenance:path.join(dist,"build-provenance.json"),evidence:path.join(dist,"security-evidence-manifest.json")};
const checks=[]; const add=(id,ok,detail="")=>checks.push({id,ok:Boolean(ok),detail:String(detail).slice(0,600)});
const sha=f=>crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex"), is64=v=>/^[a-f0-9]{64}$/i.test(String(v||"")), is40=v=>/^[a-f0-9]{40}$/i.test(String(v||""));
for(const [n,f] of Object.entries(files)) add(`file.${n}`,fs.existsSync(f),f);
if(checks.some(x=>!x.ok)) finish();
const i=JSON.parse(fs.readFileSync(files.integrity,"utf8")), m=JSON.parse(fs.readFileSync(files.manifest,"utf8"));
add("identity.schema",i.schema==="ghrab-release-integrity-v2",i.schema); add("identity.app",i.appId===appId,i.appId); add("identity.version",i.version===pkg.version,i.version);
add("identity.commit",is40(i.sourceCommit),i.sourceCommit); add("identity.artifact",is64(i.artifactDigest),i.artifactDigest); add("identity.mode",i.assuranceMode==="TRANSITIONAL",i.assuranceMode);
add("identity.no-false-signature",i.signature?.status==="NOT_PRESENT",i.signature?.status);
add("manifest.contract",m.schema==="ai-studio-release-manifest-v1"&&m.releaseIdentity?.contract==="ghrab-release-integrity-v2",m.schema);
add("manifest.version",m.id===appId&&m.version===pkg.version,`${m.id}/${m.version}`);
for(const [field,file] of [["manifestSha256",files.manifest],["sbomSha256",files.sbom],["buildProvenanceSha256",files.provenance],["evidenceManifestSha256",files.evidence]]) add(`link.${field}`,String(i[field]||"").toLowerCase()===sha(file),i[field]);
try{const p=JSON.parse(fs.readFileSync(files.provenance,"utf8"));add("provenance.schema",p.schema==="ghrab-build-provenance-v1",p.schema);add("provenance.source",p.source?.revision===i.sourceCommit,p.source?.revision);add("provenance.subject",p.subject?.sha256===i.manifestSha256,p.subject?.sha256);add("provenance.no-false-slsa",p.assurance?.claimedSlsaLevel==null,p.assurance?.claimedSlsaLevel);}catch(e){add("provenance.readable",false,e.message)}
try{const e=JSON.parse(fs.readFileSync(files.evidence,"utf8"));add("evidence.schema",["ghrab-security-evidence-manifest-v1","ghrab-security-evidence-manifest-v2"].includes(e.schema),e.schema);add("evidence.release",e.appId===appId&&e.version===pkg.version&&e.sourceRevision===i.sourceCommit,`${e.appId}/${e.version}`);}catch(e){add("evidence.readable",false,e.message)}
try{const s=JSON.parse(fs.readFileSync(files.sbom,"utf8"));add("sbom.format",s.bomFormat==="CycloneDX",s.bomFormat);add("sbom.version",s.metadata?.component?.version===pkg.version,s.metadata?.component?.version);}catch(e){add("sbom.readable",false,e.message)}
function run(id,script,args){const r=spawnSync(process.execPath,[path.join(root,script),...args],{cwd:root,encoding:"utf8"});add(id,r.status===0,`exit=${r.status}; ${r.stdout||""}${r.stderr||""}`)}
run("verify.release-integrity","security/garp25/tools/verify-release-integrity.mjs",[dist,files.integrity]);
run("verify.deployment-leaks","security/garp25/tools/scan-deployment-leaks.mjs",[dist]);
if(fs.existsSync(ev)) run("verify.evidence","security/garp25/tools/verify-evidence-manifest.mjs",[ev,files.evidence,"--project-root",root]); else add("verify.evidence",false,"qa-results/release-current missing");
finish();
function finish(){const failed=checks.filter(x=>!x.ok);const report={schema:"ai-studio-release-chain-verification-v1",appId,version:pkg.version,status:failed.length?"failed":"passed",summary:{total:checks.length,passed:checks.length-failed.length,failed:failed.length},failed:failed.map(x=>x.id),checks};console[failed.length?"error":"log"](JSON.stringify(report,null,2));process.exit(failed.length?1:0)}
