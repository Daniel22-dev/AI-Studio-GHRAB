import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { verifyPolicy, assessRepository, makeReport, renderMarkdown, createGitHubClient, inspectRepository } from "./ci-p3-topology.mjs";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const policy=JSON.parse(await readFile(path.join(ROOT,"ci/topology-policy.json"),"utf8"));
const wave={schema:"ghrab-platform-release-wave-v1",applications:policy.apps.map(({id})=>({id,version:"1.0.0"}))};
const app=policy.apps.find(x=>x.id==="ludus");
const legacyApp=policy.apps.find(x=>x.id==="essay-evaluator");
function snapshotFor(item=app){
 return {
  branch:{protected:true},
  rulesets:[{enforcement:"active",target:"branch",conditions:{ref_name:{include:["~DEFAULT_BRANCH"]}},rules:[{type:"required_status_checks",parameters:{required_status_checks:item.requiredContexts.map(context=>({context}))}}]}],
  workflows:{
   "p5-release-gate.yml":"jobs:\n  p5-release-gate:\n    steps:\n      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683\n",
   "safe-promotion.yml":"jobs:\n  guard:\n    if: github.head_ref == 'candidate'\n",
   "deploy.yml":"jobs:\n  build:\n    steps:\n      - name: Build\n  deploy:\n    needs: build\n    steps:\n      - uses: actions/deploy-pages@d6db90164ac5ed86f2b6aed7e0febac5b3c0c03e\n      - run: echo $GITHUB_SHA\n"
  }
 };
}
function codes(result){return result.findings.map(f=>f.code)}
test("Policy covers nine wave apps", ()=>{assert.deepEqual(verifyPolicy(policy,wave),[])});
test("Missing wave app fails", ()=>{assert.match(verifyPolicy(policy,{...wave,applications:wave.applications.slice(1)}).join(" "),/exactly cover/)});
test("Duplicate wave ID fails", ()=>{assert.match(verifyPolicy(policy,{...wave,applications:[...wave.applications.slice(0,-1),wave.applications[0]]}).join(" "),/Duplicate/)});
test("P5 cannot be removed from policy", ()=>{const b=structuredClone(policy);b.apps[0].requiredContexts=[];assert.match(verifyPolicy(b,wave).join(" "),/P5 baseline/)});
test("Unsafe repository name fails", ()=>{const b=structuredClone(policy);b.apps[0].repository="evil/../other";assert.match(verifyPolicy(b,wave).join(" "),/Invalid repository/)});
test("Active protected ruleset baseline passes", ()=>{const x=assessRepository(app,snapshotFor());assert.equal(x.status,"PASS");assert.deepEqual(x.findings,[])});
test("Unprotected main is FAIL", ()=>{const b=snapshotFor();b.branch.protected=false;assert.ok(codes(assessRepository(app,b)).includes("MAIN_NOT_PROTECTED"))});
test("Required axe cannot be removed", ()=>{const b=snapshotFor();b.rulesets[0].rules[0].parameters.required_status_checks=[{context:"test"},{context:"p5-release-gate"}];assert.ok(codes(assessRepository(app,b)).includes("REQUIRED_CONTEXT_MISSING"))});
test("Inactive ruleset cannot protect main", ()=>{const b=snapshotFor();b.rulesets[0].enforcement="disabled";assert.equal(assessRepository(app,b).status,"FAIL")});
test("Different branch ruleset cannot protect main", ()=>{const b=snapshotFor();b.rulesets[0].conditions.ref_name.include=["refs/heads/develop"];assert.equal(assessRepository(app,b).status,"FAIL")});
test("Legacy protected Hodnotitel is WARN not GREEN", ()=>{const b=snapshotFor(legacyApp);b.rulesets=[];b.branch.protection={required_status_checks:{contexts:["p5-release-gate"]}};const x=assessRepository(legacyApp,b);assert.equal(x.status,"WARN");assert.equal(x.protectionMode,"legacy-branch-protection")});
test("Legacy protection missing P5 is FAIL", ()=>{const b=snapshotFor(legacyApp);b.rulesets=[];b.branch.protection={required_status_checks:{contexts:[]}};assert.equal(assessRepository(legacyApp,b).status,"FAIL")});
test("Other repo cannot silently switch to legacy", ()=>{const b=snapshotFor(app);b.rulesets=[];b.branch.protection={required_status_checks:{contexts:app.requiredContexts}};assert.equal(assessRepository(app,b).status,"FAIL")});
test("Renamed canonical P5 job is FAIL", ()=>{const b=snapshotFor();b.workflows["p5-release-gate.yml"]="jobs:\n  renamed-job:\n";assert.ok(codes(assessRepository(app,b)).includes("P5_CONTEXT_OWNER_MISSING"))});
test("Missing dependency blocks audit", ()=>{const b=snapshotFor();b.workflows["deploy.yml"]=b.workflows["deploy.yml"].replace("needs: build","# removed");assert.ok(codes(assessRepository(app,b)).includes("DEPLOY_DEPENDENCY_MISSING"))});
test("Missing SHA binding blocks audit", ()=>{const b=snapshotFor();b.workflows["deploy.yml"]=b.workflows["deploy.yml"].replace("$GITHUB_SHA","release");assert.ok(codes(assessRepository(app,b)).includes("SOURCE_IDENTITY_NOT_VISIBLE"))});
test("Unpinned action cannot pass GREEN", ()=>{const b=snapshotFor();b.workflows["deploy.yml"]=b.workflows["deploy.yml"].replace("actions/deploy-pages@d6db90164ac5ed86f2b6aed7e0febac5b3c0c03e","actions/deploy-pages@v4");const x=assessRepository(app,b);assert.equal(x.status,"WARN");assert.ok(codes(x).includes("UNPINNED_ACTION"))});
test("Absent promotion workflow is FAIL", ()=>{const b=snapshotFor();delete b.workflows["safe-promotion.yml"];assert.ok(codes(assessRepository(app,b)).includes("WORKFLOW_MISSING"))});
test("PASS WARN FAIL reports stay distinct", ()=>{assert.equal(makeReport([assessRepository(app,snapshotFor())]).status,"PASS");const b=snapshotFor(legacyApp);b.rulesets=[];b.branch.protection={required_status_checks:{contexts:["p5-release-gate"]}};assert.equal(makeReport([assessRepository(legacyApp,b)]).status,"WARN");const c=snapshotFor();c.branch.protected=false;const r=makeReport([assessRepository(app,c)]);assert.equal(r.status,"FAIL");assert.match(renderMarkdown(r),/MAIN_NOT_PROTECTED/)});
test("Client allows fixed public Github URL only", async()=>{let used=0;const client=createGitHubClient("",async url=>{used++;assert.equal(url,"https://api.github.com/repos/Daniel22-dev/Ludus/branches/main");return {ok:true,json:async()=>({protected:true})}});assert.deepEqual(await client("/repos/Daniel22-dev/Ludus/branches/main"),{protected:true});await assert.rejects(client("https://evil.example/"),/Unsafe/);await assert.rejects(client("/repos/../secrets"),/Unsafe/);assert.equal(used,1)});
test("Inspector reads only canonical GitHub source paths", async()=>{const s=snapshotFor(),seen=[];const enc=t=>({type:"file",encoding:"base64",content:Buffer.from(t).toString("base64")});const request=async route=>{seen.push(route);if(route.endsWith("/branches/main"))return s.branch;if(route.includes("/rulesets/"))return s.rulesets[0];if(route.includes("/rulesets?"))return [{id:42,enforcement:"active",target:"branch"}];for(const [k,v] of Object.entries(s.workflows))if(route.includes(`${k}?ref=main`))return enc(v);throw Error("Unexpected route")};const x=await inspectRepository("Daniel22-dev",app,request);assert.equal(x.status,"PASS");assert.equal(seen.length,6);assert.ok(seen.every(x=>x.startsWith("/repos/Daniel22-dev/Ludus/")))});
test("API failures propagate and cannot become GREEN", async()=>{await assert.rejects(inspectRepository("Daniel22-dev",app,async()=>{throw Error("HTTP 403")}),/HTTP 403/)});
