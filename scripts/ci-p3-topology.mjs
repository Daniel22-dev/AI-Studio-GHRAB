import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const API = "https://api.github.com";
const NAME = /^[A-Za-z0-9._-]+$/;
const SAFE_PATH = /^\/[A-Za-z0-9._/?=&-]+$/;

export function verifyPolicy(policy,wave) {
  const findings = [];
  if(policy.schema!=="ghrab-ecosystem-ci-topology-v1") findings.push("Invalid policy schema");
  if(wave.schema!=="ghrab-platform-release-wave-v1") findings.push("Unrecognized release wave");
  if(!NAME.test(policy.owner||"")) findings.push("Invalid owner");
  const waveIds=(wave.applications||[]).map(x=>x.id);
  const policyIds=(policy.apps||[]).map(x=>x.id);
  if(new Set(waveIds).size!==waveIds.length||new Set(policyIds).size!==policyIds.length) findings.push("Duplicate application IDs");
  if(waveIds.length!==9||policyIds.length!==9||waveIds.some(x=>!policyIds.includes(x))||policyIds.some(x=>!waveIds.includes(x))) findings.push("CI policy must exactly cover the nine current release-wave applications");
  const apps=[...(policy.apps||[]),policy.studio||{}];
  if(new Set(apps.map(x=>x.repository)).size!==apps.length) findings.push("Duplicate repository mapping");
  for(const a of apps){
    if(!NAME.test(a.repository||"")) findings.push("Invalid repository identifier");
    if(!Array.isArray(a.requiredContexts)||!a.requiredContexts.includes("p5-release-gate")) findings.push(`Missing immutable P5 baseline in ${a.repository}`);
    if(!a.promotionVariant) findings.push(`Missing promotion variant in ${a.repository}`);
  }
  return findings;
}

export function assessRepository(app,snapshot) {
  const findings=[];
  const add=(severity,code,details)=>findings.push({severity,code,details});
  const branch=snapshot.branch||{};
  const rulesets=(snapshot.rulesets||[]).filter(x=>x.enforcement==="active"&&x.target==="branch"&&(x.conditions?.ref_name?.include||[]).some(n=>["~DEFAULT_BRANCH","refs/heads/main","main"].includes(n)));
  let protectionMode="unverified",requiredContexts=[];
  if(rulesets.length){
    protectionMode="active-ruleset";
    requiredContexts=[...new Set(rulesets.flatMap(x=>(x.rules||[]).filter(r=>r.type==="required_status_checks").flatMap(r=>(r.parameters?.required_status_checks||[]).map(z=>z.context))))];
  } else if(branch.protected===true&&app.legacyProtectionAllowed) {
    protectionMode="legacy-branch-protection";
    requiredContexts=[...new Set(branch.protection?.required_status_checks?.contexts||[])];
    add("WARN","LEGACY_BRANCH_PROTECTION","Legacy main protection is allowed but should be independently reviewed");
  } else if(branch.protected===true){
    add("FAIL","RULESET_UNVERIFIED","Protected main has no verifiable active main ruleset");
  }
  if(branch.protected!==true) add("FAIL","MAIN_NOT_PROTECTED","GitHub does not mark main protected");
  for(const context of app.requiredContexts) if(!requiredContexts.includes(context)) add("FAIL","REQUIRED_CONTEXT_MISSING",`Main protection does not require ${context}`);
  const workflows=snapshot.workflows||{};
  for(const file of ["safe-promotion.yml","p5-release-gate.yml","deploy.yml"]) if(!workflows[file]) add("FAIL","WORKFLOW_MISSING",`.github/workflows/${file} missing`);
  const p5=workflows["p5-release-gate.yml"]||"",deploy=workflows["deploy.yml"]||"",promotion=workflows["safe-promotion.yml"]||"";
  if(p5&&!/^  p5-release-gate:\s*$/m.test(p5)) add("FAIL","P5_CONTEXT_OWNER_MISSING","The canonical P5 job was renamed or removed");
  if(deploy&&!deploy.includes("actions/deploy-pages@")) add("FAIL","PAGES_DEPLOY_MISSING","No GitHub Pages deployment action");
  if(deploy&&!/(^|\n)\s+needs:\s+/m.test(deploy)) add("FAIL","DEPLOY_DEPENDENCY_MISSING","Deploy has no explicit job dependencies");
  if(promotion&&!/candidate/.test(promotion)) add("FAIL","SAFE_PROMOTION_TOPOLOGY_MISSING","Safe Promotion lacks candidate branch");
  if(deploy&&!/github\.sha|GITHUB_SHA|workflow_run\.head_sha|merged_main_sha/.test(deploy)) add("FAIL","SOURCE_IDENTITY_NOT_VISIBLE","Deploy has no visible SHA reference");
  for(const [file,content] of Object.entries(workflows)){
    for(const [,action,ref] of content.matchAll(/uses:\s*(actions\/[\w-]+)@([^\s#]+)/g))
      if(!/^[0-9a-f]{40}$/.test(ref)) add("WARN","UNPINNED_ACTION",`${file}: ${action}@${ref}`);
  }
  const uniq=(array)=>[...new Set(array)].sort();
  const nodeVersions=uniq(Object.values(workflows).flatMap(s=>[...s.matchAll(/node-version:\s*['"]?([\w.]+)/g)].map(m=>m[1])));
  const runnerImages=uniq(Object.values(workflows).flatMap(s=>[...s.matchAll(/runs-on:\s*(ubuntu[-\w.]*)/g)].map(m=>m[1])));
  return {id:app.id||"studio",repository:app.repository,promotionVariant:app.promotionVariant,protectionMode,protected:branch.protected===true,requiredContexts:requiredContexts.sort(),baselineContexts:[...app.requiredContexts].sort(),workflows:Object.keys(workflows).sort(),nodeVersions,runnerImages,browserInstalls:Object.values(workflows).reduce((n,s)=>n+(s.match(/playwright install --with-deps chromium/g)||[]).length,0),p5RunnerIncludesGarp27:/garp27|garp-2\.7/i.test(p5),findings,status:findings.some(f=>f.severity==="FAIL")?"FAIL":findings.some(f=>f.severity==="WARN")?"WARN":"PASS"};
}

export function makeReport(results,policyFindings=[]) {
  const failures=results.flatMap(r=>r.findings.filter(f=>f.severity==="FAIL"));
  return {schema:"ghrab-ci-topology-report-v1",generatedAt:new Date().toISOString(),status:policyFindings.length||failures.length?"FAIL":results.some(r=>r.status==="WARN")?"WARN":"PASS",checkedRepositories:results.length,failingFindings:policyFindings.length+failures.length,policyFindings,results};
}

export function renderMarkdown(report) {
  const rows=report.results.map(r=>`| ${r.repository} | ${r.protectionMode} | ${r.baselineContexts.join(", ")} | ${r.nodeVersions.join(" / ")||"n/a"} | ${r.runnerImages.join(" / ")||"n/a"} | ${r.status} |`);
  const findings=report.results.flatMap(r=>r.findings.map(f=>`- **${f.severity} ${r.repository} / ${f.code}:** ${f.details}`));
  return ["# GHRAB ecosystem CI topology audit (P3)","",`Result: **${report.status}**. Repositories: ${report.checkedRepositories}. Hard findings: ${report.failingFindings}.`,"","This is a read-only audit. It does not certify P5, alter repositories, or authorize deployment.","","| Repository | Protected-main mode | Minimum required contexts | Node in workflows | Runner image | Status |","|---|---|---|---|---|---|",...rows,"","## Findings","",...report.policyFindings.map(s=>`- **FAIL POLICY:** ${s}`),...(findings.length?findings:["No topology deviations detected."]),"","A WARN may represent permitted legacy protection; it must not be called GREEN.",""].join("\n");
}

export function createGitHubClient(token="",fetchImpl=fetch) {
  return async(route)=>{
    if(!SAFE_PATH.test(route)||route.includes(".."))throw Error("Unsafe GitHub API route");
    const headers={Accept:"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28","User-Agent":"ghrab-ci-p3-readonly-audit",...(token?{Authorization:`Bearer ${token}`}:{})};
    const response=await fetchImpl(`${API}${route}`,{headers,signal:AbortSignal.timeout(18000)});
    if(!response.ok)throw Error(`GitHub read API ${response.status}: ${route}`);
    return response.json();
  };
}

function decodeContent(item,file) {
  if(!item||item.type!=="file"||item.encoding!=="base64"||!item.content)throw Error(`Missing GitHub source: ${file}`);
  return Buffer.from(item.content.replace(/\s/g,""),"base64").toString("utf8");
}

export async function inspectRepository(owner,app,request) {
  const prefix=`/repos/${owner}/${app.repository}`;
  const [branch,ruleList,p5,deploy,promotion]=await Promise.all([
    request(`${prefix}/branches/main`),
    request(`${prefix}/rulesets?includes_parents=true`),
    request(`${prefix}/contents/.github/workflows/p5-release-gate.yml?ref=main`),
    request(`${prefix}/contents/.github/workflows/deploy.yml?ref=main`),
    request(`${prefix}/contents/.github/workflows/safe-promotion.yml?ref=main`)
  ]);
  const rulesets=await Promise.all(ruleList.filter(x=>x.enforcement==="active"&&x.target==="branch").map(x=>request(`${prefix}/rulesets/${x.id}`)));
  return assessRepository(app,{branch,rulesets,workflows:{"p5-release-gate.yml":decodeContent(p5,"p5-release-gate.yml"),"deploy.yml":decodeContent(deploy,"deploy.yml"),"safe-promotion.yml":decodeContent(promotion,"safe-promotion.yml")}});
}

async function main() {
  const policy=JSON.parse(await readFile(path.join(ROOT,"ci/topology-policy.json"),"utf8"));
  const wave=JSON.parse(await readFile(path.join(ROOT,policy.waveFile),"utf8"));
  const policyFindings=verifyPolicy(policy,wave);
  const request=createGitHubClient(process.env.GITHUB_TOKEN||"");
  const apps=[...policy.apps,{id:"studio",...policy.studio}],results=[];
  if(!policyFindings.length){
    for(const app of apps){
      try{results.push(await inspectRepository(policy.owner,app,request));}
      catch(error){results.push({id:app.id,repository:app.repository,promotionVariant:app.promotionVariant,protectionMode:"unverified",baselineContexts:app.requiredContexts,requiredContexts:[],nodeVersions:[],runnerImages:[],workflows:[],findings:[{severity:"FAIL",code:"SOURCE_UNAVAILABLE",details:String(error.message)}],status:"FAIL"});}
    }
  }
  const report=makeReport(results,policyFindings);
  const outDir=path.join(ROOT,"qa-results/ci-p3");
  await mkdir(outDir,{recursive:true});
  await Promise.all([writeFile(path.join(outDir,"topology.json"),JSON.stringify(report,null,2)+"\n"),writeFile(path.join(outDir,"topology.md"),renderMarkdown(report))]);
  console.log(`ECOSYSTEM CI P3: ${report.status} (${results.length} repositories, ${report.failingFindings} hard findings)`);
  for(const r of results)console.log(`${r.repository}: ${r.status} [${r.protectionMode}]`);
  if(report.status==="FAIL")process.exitCode=1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
