// One-shot synthetic-only GARP27 regression diagnosis on pinned Studio candidate.
// Writes only test names, exits and error classes. Never exports raw command logs.
import {spawnSync} from 'node:child_process';
import {writeFileSync,mkdirSync} from 'node:fs';

const tasks=[
  ['qa:ecosystem','node','scripts/qa-ecosystem.mjs'],
  ['build','npm','run','build'],
  ['test:audit-regressions','npm','run','test:audit-regressions'],
  ['test:security-regressions','npm','run','test:security-regressions'],
  ['test:garp-security','npm','run','test:garp-security'],
  ['test:release-policy','npm','run','test:release-policy'],
  ['test:release-promotion','npm','run','test:release-promotion'],
  ['test:auto-patch-idempotence','npm','run','test:auto-patch-idempotence'],
];
const results=[];
for(const [name,cmd,...args] of tasks){
  const r=spawnSync(cmd,args,{cwd:process.cwd(),encoding:'utf8',timeout:240000,maxBuffer:30*1024*1024,env:process.env});
  const logs=[r.stdout||'',r.stderr||''].join('\n').replace(/\x1b\[[0-9;]*m/g,'');
  // Strictly allow-listed diagnostic classes/test names, never full logs/content.
  const failedCases=[...logs.matchAll(/^\s*(?:not ok|FAIL)\s+\d+\s*[-:]\s*([^\r\n]{0,100})/gmi)]
    .slice(0,15).map(m=>m[1].replace(/[^\w ,:().+-]/g,'?'));
  const errorClasses=[...new Set([...logs.matchAll(/\b(?:ERR_ASSERTION|AssertionError|TypeError|ReferenceError|SyntaxError|ENOENT|MODULE_NOT_FOUND|TimeoutError)\b/g)]
    .map(m=>m[0]))].slice(0,10);
  const assertionSummaries=[...logs.matchAll(/\bAssertionError\s*(?:\[[^\]]+\])?\s*:\s*([^\r\n]{0,100})/g)]
    .slice(0,5).map(m=>m[1].replace(/[^\w ,:().+-]/g,'?'));
  const code=Number.isInteger(r.status)?r.status:124;
  const entry={name,exitCode:code,pass:code===0,failedCases,errorClasses,assertionSummaries};
  results.push(entry);
  console.log(JSON.stringify(entry));
}
const evidence={schema:'ghrab-stage05-garp-diagnostic-v1',pinnedCandidate:process.env.GHRAB_STAGE05_UNDER_TEST,
  syntheticTestsOnly:true,noStudentData:true,results};
mkdirSync('qa-results/stage05',{recursive:true});
writeFileSync('qa-results/stage05/garp-regression-diagnostic.json',JSON.stringify(evidence,null,2)+'\n');
if(results.some(x=>!x.pass))process.exitCode=1;
