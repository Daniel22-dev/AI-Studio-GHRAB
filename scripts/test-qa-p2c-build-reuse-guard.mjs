#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm, symlink } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { beginObservedBuild, finishObservedBuild } from './qa-p2b-build-observer.mjs';
import { attestReporterBuildReuse, assertP2CReuseEvidence, P2C_SCHEMA } from './qa-p2c-build-reuse-guard.mjs';

const sha = 'e'.repeat(40);
const env = {
  GHRAB_QA_P2C_REUSE: '1', GHRAB_QA_P2B_TRACE: '1',
  GHRAB_QA_P2B_PHASE: 'project-tests', GITHUB_SHA: sha,
};
const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '..');
const traces = (root) => path.join(root,'qa-results','p2b-build-traces');
const evidence = (root) => path.join(root,'qa-results','p2c-built-artifact-reuse.json');
const browser = (root) => path.join(root,'test-results','error-reporter.json');
const output = (root) => path.join(root,'dist','index.html');

async function fixture(action, { numBuilds = 2, browserStatus = 'passed', commit = sha } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'ghrab-p2c-'));
  const original = process.env.GITHUB_SHA;
  try {
    process.env.GITHUB_SHA = commit;
    for (const dir of ['src', 'scripts', 'vendor', 'qa', 'dist', 'test-results'])
      await mkdir(path.join(root,dir),{recursive:true});
    for (const file of ['package.json','package-lock.json','ghrab-platform.consumer.json'])
      await writeFile(path.join(root,file),'{}\n');
    await writeFile(path.join(root,'src','index.html'),'<html>safe</html>\n');
    await writeFile(path.join(root,'scripts','build.mjs'),'// valid build\n');
    await writeFile(path.join(root,'vendor','platform.js'),'export const value = true;\n');
    await writeFile(output(root),'<html>safe</html>\n');
    await writeFile(path.join(root,'dist','build-info.json'),'{"builtAt":"2026-10-16T04:00:00.000Z","version":"1"}\n');
    await writeFile(path.join(root,'dist','platform-build-info.json'),'{"builtAt":"2026-10-16T04:00:00.001Z","version":"1"}\n');
    await writeFile(browser(root),JSON.stringify({browser:{status:browserStatus}}));
    for(let i=0;i<numBuilds;i++){
      const started=await beginObservedBuild(root,'project-tests');
      await finishObservedBuild(root,started);
      await new Promise(resolve=>setTimeout(resolve,5));
    }
    await action(root);
  } finally {
    if(original===undefined) delete process.env.GITHUB_SHA; else process.env.GITHUB_SHA=original;
    await rm(root,{recursive:true,force:true});
  }
}
const buildMore = async(root,phase='project-build')=>{
  const started=await beginObservedBuild(root,phase);
  await finishObservedBuild(root,started);
};

// All tests use tiny independent roots. Each case deliberately verifies that a
// changed source, build artefact, audit trace, or browser result blocks reuse.
test('reuse is granted only for two witnessed builds and PASS reporter', async()=>fixture(async root=>{
  const result=await attestReporterBuildReuse(root,{env});
  assert.equal(result.status,'VERIFIED_REUSE');
  assert.equal(result.schema,P2C_SCHEMA);
  assert.equal(result.skipCount,1);
  assert.equal(result.precedingBuilds,2);
  assert.equal(result.reporterBrowserStatus,'passed');
  assert.equal(result.distFileCount,3);
  const onDisk=JSON.parse(await readFile(evidence(root),'utf8'));
  assert.deepEqual(result,onDisk);
}));

test('final QA evidence proves exactly two observed test builds and one independent project build',async()=>fixture(async root=>{
  await attestReporterBuildReuse(root,{env});
  await buildMore(root);
  const result=await assertP2CReuseEvidence(root,{env});
  assert.equal(result.status,'VERIFIED_REUSE');
}));

test('only one previously observed test build cannot be reused',async()=>fixture(async root=>{
  await assert.rejects(()=>attestReporterBuildReuse(root,{env}),/precisely two complete/);
},{numBuilds:1}));

test('three previously observed test builds cannot be reused',async()=>fixture(async root=>{
  await assert.rejects(()=>attestReporterBuildReuse(root,{env}),/precisely two complete/);
},{numBuilds:3}));

test('a missing completion blocks reuse',async()=>fixture(async root=>{
  const names=(await readdir(traces(root))).filter(f=>f.endsWith('.completed.json'));
  await rm(path.join(traces(root), names[0]));
  await assert.rejects(()=>attestReporterBuildReuse(root,{env}),/precisely two complete/);
}));

test('modification of source inputs blocks reuse',async()=>fixture(async root=>{
  await writeFile(path.join(root,'src','index.html'),'<html>changed</html>\n');
  await assert.rejects(()=>attestReporterBuildReuse(root,{env}),/build inputs changed/);
}));

test('modification of dist bytes blocks reuse',async()=>fixture(async root=>{
  await writeFile(output(root),'<html>tampered</html>\n');
  await assert.rejects(()=>attestReporterBuildReuse(root,{env}),/dist bytes changed/);
}));

test('timestamp change alone blocks reuse even though P2B normalized SHA is unchanged',async()=>fixture(async root=>{
  await writeFile(path.join(root,'dist','build-info.json'),'{"builtAt":"2026-10-16T04:12:00.000Z","version":"1"}\n');
  await assert.rejects(()=>attestReporterBuildReuse(root,{env}),/dist bytes changed/);
}));

test('browser NOT_READY is not an acceptable witness',async()=>fixture(async root=>{
  await assert.rejects(()=>attestReporterBuildReuse(root,{env}),/reporter browser regression did not PASS/);
},{browserStatus:'skipped'}));

test('browser report missing blocks reuse',async()=>fixture(async root=>{
  await rm(browser(root));
  await assert.rejects(()=>attestReporterBuildReuse(root,{env}),/ENOENT/);
}));

test('corrupt browser report blocks reuse',async()=>fixture(async root=>{
  await writeFile(browser(root),'not-json');
  await assert.rejects(()=>attestReporterBuildReuse(root,{env}),/JSON/);
}));

test('foreign source SHA blocks reuse',async()=>fixture(async root=>{
  await assert.rejects(()=>attestReporterBuildReuse(root,{env:{...env,GITHUB_SHA:'f'.repeat(40)}}),/source commit differs/);
}));

test('changed Node version in trace blocks reuse',async()=>fixture(async root=>{
  const f=(await readdir(traces(root))).find(x=>x.endsWith('.started.json'));
  const loc=path.join(traces(root),f);
  const item=JSON.parse(await readFile(loc,'utf8'));
  item.nodeVersion='v0.0.0';
  await writeFile(loc,JSON.stringify(item));
  await assert.rejects(()=>attestReporterBuildReuse(root,{env}),/build environment differs/);
}));

test('corrupt P2B raw output digest blocks reuse',async()=>fixture(async root=>{
  const f=(await readdir(traces(root))).find(x=>x.endsWith('.completed.json'));
  const loc=path.join(traces(root),f);
  const item=JSON.parse(await readFile(loc,'utf8'));
  item.output.raw.sha256='f'.repeat(64);
  await writeFile(loc,JSON.stringify(item));
  await assert.rejects(()=>attestReporterBuildReuse(root,{env}),/tree SHA-256 is internally inconsistent/);
}));

test('symlink in dist is rejected by full-tree byte observer',async()=>fixture(async root=>{
  await symlink(output(root),path.join(root,'dist','alias.html'));
  await assert.rejects(()=>attestReporterBuildReuse(root,{env}),/symlink refused/);
}));

test('symlink in P2B trace is rejected',async()=>fixture(async root=>{
  const f=(await readdir(traces(root))).find(x=>x.endsWith('.started.json'));
  const loc=path.join(traces(root),f);
  await rm(loc);
  await symlink(browser(root),loc);
  await assert.rejects(()=>attestReporterBuildReuse(root,{env}),/non-regular file/);
}));

test('outside trace QA scope reuse is always blocked',async()=>fixture(async root=>{
  await assert.rejects(()=>attestReporterBuildReuse(root,{env:{...env,GHRAB_QA_P2B_TRACE:'0'}}),/not in explicitly enabled/);
}));

test('outside project-tests phase reuse is always blocked',async()=>fixture(async root=>{
  await assert.rejects(()=>attestReporterBuildReuse(root,{env:{...env,GHRAB_QA_P2B_PHASE:'project-build'}}),/not in explicitly enabled/);
}));

test('missing explicit reuse permission blocks reuse',async()=>fixture(async root=>{
  await assert.rejects(()=>attestReporterBuildReuse(root,{env:{...env,GHRAB_QA_P2C_REUSE:'0'}}),/not in explicitly enabled/);
}));

test('a second reuse or pre-existing evidence file is refused',async()=>fixture(async root=>{
  await attestReporterBuildReuse(root,{env});
  await assert.rejects(()=>attestReporterBuildReuse(root,{env}),/already exists/);
}));

test('missing project-build evidence blocks finalization',async()=>fixture(async root=>{
  await attestReporterBuildReuse(root,{env});
  await assert.rejects(()=>assertP2CReuseEvidence(root,{env}),/incomplete or extra/);
}));

test('an unapproved additional internal rebuild blocks finalization',async()=>fixture(async root=>{
  await attestReporterBuildReuse(root,{env});
  await buildMore(root,'project-tests');
  await buildMore(root,'project-build');
  await assert.rejects(()=>assertP2CReuseEvidence(root,{env}),/incomplete or extra/);
}));

test('missing P2C reuse report blocks finalization',async()=>fixture(async root=>{
  await buildMore(root);
  await assert.rejects(()=>assertP2CReuseEvidence(root,{env}),/ENOENT/);
}));

test('reporter evidence modified after reuse blocks QA finalization',async()=>fixture(async root=>{
  await attestReporterBuildReuse(root,{env});
  await buildMore(root);
  await writeFile(browser(root),JSON.stringify({browser:{status:'passed'},changed:true}));
  await assert.rejects(()=>assertP2CReuseEvidence(root,{env}),/reporter evidence changed/);
}));

test('tampered P2C report SHA blocks finalization',async()=>fixture(async root=>{
  await attestReporterBuildReuse(root,{env});
  await buildMore(root);
  const loc=evidence(root),j=JSON.parse(await readFile(loc,'utf8'));
  j.inputSha256='f'.repeat(64);
  await writeFile(loc,JSON.stringify(j));
  await assert.rejects(()=>assertP2CReuseEvidence(root,{env}),/does not match P2B/);
}));

test('code keeps independent project-build, GARP and P5 and preserves outside-QA rebuild',async()=>{
  const [qa,testSource,manifest,workflow,packageInfo]=await Promise.all([
    readFile(path.join(repo,'scripts','qa-release.mjs'),'utf8'),
    readFile(path.join(repo,'scripts','test.mjs'),'utf8'),
    readFile(path.join(repo,'qa','qa-manifest.json'),'utf8').then(JSON.parse),
    readFile(path.join(repo,'.github','workflows','p5-release-gate.yml'),'utf8'),
    readFile(path.join(repo,'package.json'),'utf8').then(JSON.parse),
  ]);
  assert.equal(manifest.buildCommand,'npm run build');
  assert.equal(manifest.testCommand,'npm test');
  assert.ok(packageInfo.scripts.test.includes('npm run build'));
  assert.match(qa,/\["project-build", manifest\.buildCommand\]/);
  assert.match(qa,/finalizeBuildObservations\(ROOT\)/);
  assert.match(qa,/assertP2CReuseEvidence\(ROOT\)/);
  assert.match(testSource,/GHRAB_QA_P2C_REUSE === "1"/);
  assert.match(testSource,/execFileSync\(process\.execPath, \[path\.join\(root, "scripts\/build\.mjs"\)\]/);
  assert.match(workflow,/Run GARP 2\.7 FOUNDATION gate/);
  assert.match(workflow,/Run P5 R2 release gate/);
});
