#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..','..');
const OUT=path.join(ROOT,'audit-evidence','garp27-current');
fs.rmSync(OUT,{recursive:true,force:true}); fs.mkdirSync(OUT,{recursive:true});
const sha=(p)=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const version=JSON.parse(fs.readFileSync(path.join(ROOT,'package.json'),'utf8')).version;
const sourceCandidate=String(process.env.GHRAB_SOURCE_COMMIT||process.env.GITHUB_SHA||'').trim().toLowerCase();
if(sourceCandidate&&!/^[a-f0-9]{40}$/.test(sourceCandidate)){console.error(JSON.stringify({classification:'HARNESS_ERROR',status:'HARNESS_ERROR',message:'GARP 2.7 FOUNDATION requires a full 40-char source commit when a source identity is supplied'},null,2));process.exit(2);}
const sourceKind=sourceCandidate?(process.env.GHRAB_SOURCE_COMMIT?'release-source-commit':'git-commit'):'local-evidence-sha1-surrogate';
const steps=[
  ['contracts',['npm','run','qa:garp27:contracts']],
  ['policy-mutations',['npm','run','qa:garp27:policy-mutations']],
  ['app-mutations',['npm','run','qa:garp27:mutations']],
  ['auto-patch-contract',['npm','run','qa:garp27:auto-patch']],
  ['legacy-tooling',['npm','run','qa:garp25:tooling']],
  ['legacy-secret-scan',['npm','run','qa:garp25:secrets']],
  ['application-regressions',['npm','run','qa:garp27:regressions']],
  ['prepare-deployment',['npm','run','prepare:deployment-dist']],
  ['architecture',['npm','run','qa:garp27:architecture']],
  ['deployment-leak-scan',['npm','run','qa:garp25:deployment']],
];
const results=[]; let failed=0;
for(const [id,cmd] of steps){ const r=spawnSync(cmd[0],cmd.slice(1),{cwd:ROOT,encoding:'utf8',env:process.env,maxBuffer:40*1024*1024}); const file=path.join(OUT,`${id}.log`); fs.writeFileSync(file,`$ ${cmd.join(' ')}\nEXIT=${r.status}\n\n${r.stdout||''}\n${r.stderr||''}`); const pass=r.status===0; results.push({id,actualExit:r.status,pass,evidence:{id,sha256:sha(file)}}); if(!pass) failed+=1; }
const source=sourceCandidate||crypto.createHash('sha1').update(results.map((x)=>x.evidence.sha256).join('')).digest('hex');
const summary={classification:'GARP27_FOUNDATION_GATE',schema:'garp27-foundation-summary-v1',garpVersion:'2.7',appId:'ai-studio',appVersion:version,status:failed?'FAIL':'FOUNDATION_PASS_LIVE_NOT_TESTED',serverPhase:'DEFERRED_BY_OWNER_DECISION',liveStatus:'NOT_TESTED',sourceIdentity:{value:source,kind:sourceKind},steps:results,summary:{total:results.length,passed:results.filter((x)=>x.pass).length,failed}};
fs.writeFileSync(path.join(OUT,'foundation-summary.json'),`${JSON.stringify(summary,null,2)}\n`); console.log(JSON.stringify(summary,null,2)); process.exit(failed?1:0);
