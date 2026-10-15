#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, symlink, writeFile, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  beginObservedBuild,
  finishObservedBuild,
  fingerprintBuildInputs,
  fingerprintBuiltDist,
  compareBuildObservations,
  finalizeBuildObservations,
} from './qa-p2b-build-observer.mjs';

const SHA = 'a'.repeat(64);
const valid = (phase, opts={}) => ({
  schema: 'ghrab-qa-p2b-build-observation-v1',
  id: phase,
  phase,
  sourceCommit: SHA,
  nodeVersion: 'v22.16.0',
  platform: 'linux', arch: 'x64',
  startedAt: '2026-10-15T21:47:01.000Z',
  input: { sha256: 'a'.repeat(64), files: [{path:'src/index.html',sha256:'a'.repeat(64)}] },
  output: {
    raw: {sha256:'b'.repeat(64),files:[{path:'index.html',sha256:'b'.repeat(64)}]},
    normalized:{sha256:'c'.repeat(64),files:[{path:'index.html',sha256:'c'.repeat(64)}]},
    normalizedFields:['build-info.json:builtAt','platform-build-info.json:builtAt'],
  },
  ...opts,
});
const clone = x => JSON.parse(JSON.stringify(x));
async function fixture(action) {
  const root = await mkdtemp(path.join(os.tmpdir(),'ghrab-p2b-'));
  try {
    for (const dir of ['src','scripts','vendor','qa','dist','qa-results']) await mkdir(path.join(root,dir),{recursive:true});
    for (const file of ['package.json','package-lock.json','ghrab-platform.consumer.json']) await writeFile(path.join(root,file),'{}\n');
    await writeFile(path.join(root,'src/index.html'),'<html>safe</html>\n');
    await writeFile(path.join(root,'scripts/build.mjs'),'// safe\n');
    await writeFile(path.join(root,'vendor/platform.js'),'const secure=true;\n');
    await writeFile(path.join(root,'dist/index.html'),'<html>safe</html>\n');
    await writeFile(path.join(root,'dist/build-info.json'),'{"version":"1","builtAt":"2026-10-15T21:47:00.000Z"}\n');
    await writeFile(path.join(root,'dist/platform-build-info.json'),'{"version":"1","builtAt":"2026-10-15T21:47:00.001Z"}\n');
    await action(root);
  } finally {await rm(root,{recursive:true,force:true});}
}

test('two unchanged build trees have identical raw and normalized hashes',async()=>{await fixture(async root=>{
  const one=await fingerprintBuiltDist(root),two=await fingerprintBuiltDist(root);
  assert.deepEqual(one,two); assert.equal(one.raw.fileCount,3);
});});
test('builtAt in both metadata files is excluded ONLY from normalized output',async()=>{await fixture(async root=>{
  const a=await fingerprintBuiltDist(root);
  await writeFile(path.join(root,'dist/build-info.json'),'{"version":"1","builtAt":"2026-10-15T21:49:01.000Z"}\n');
  await writeFile(path.join(root,'dist/platform-build-info.json'),'{"version":"1","builtAt":"2026-10-15T21:49:01.001Z"}\n');
  const b=await fingerprintBuiltDist(root);
  assert.notEqual(a.raw.sha256,b.raw.sha256);
  assert.equal(a.normalized.sha256,b.normalized.sha256);
});});
test('changing a non-timestamp JSON field changes normalized output',async()=>{await fixture(async root=>{
  const before=await fingerprintBuiltDist(root);
  await writeFile(path.join(root,'dist/build-info.json'),'{"version":"99","builtAt":"2026-10-15T21:47:00.000Z"}\n');
  assert.notEqual((await fingerprintBuiltDist(root)).normalized.sha256,before.normalized.sha256);
});});
test('tampered application byte changes raw AND normalized output',async()=>{await fixture(async root=>{
  const before=await fingerprintBuiltDist(root);
  await writeFile(path.join(root,'dist/index.html'),'<html>evil</html>\n');
  const after=await fingerprintBuiltDist(root);
  assert.notEqual(before.raw.sha256,after.raw.sha256);
  assert.notEqual(before.normalized.sha256,after.normalized.sha256);
});});
test('symlink in output is rejected',async()=>{await fixture(async root=>{
  await symlink(path.join(root,'dist','index.html'),path.join(root,'dist','link.html'));
  await assert.rejects(()=>fingerprintBuiltDist(root),/symlink refused/);
});});
test('symlink in input is rejected',async()=>{await fixture(async root=>{
  await symlink(path.join(root,'src','index.html'),path.join(root,'src','link.html'));
  await assert.rejects(()=>fingerprintBuildInputs(root),/symlink refused/);
});});
test('special output missing blocks the observation',async()=>{await fixture(async root=>{
  await rm(path.join(root,'dist','platform-build-info.json'));
  await assert.rejects(()=>fingerprintBuiltDist(root),/incomplete build/);
});});
test('invalid generated build timestamps are rejected rather than silently masked',async()=>{await fixture(async root=>{
  await writeFile(path.join(root,'dist','build-info.json'),'{"version":"1","builtAt":"malicious"}\n');
  await assert.rejects(()=>fingerprintBuiltDist(root),/invalid build timestamp/);
});});
test('output digest does not change with file timestamps alone',async()=>{await fixture(async root=>{
  const before=await fingerprintBuiltDist(root);
  const b=await readFile(path.join(root,'dist','index.html'));
  await writeFile(path.join(root,'dist','index.html'),b);
  assert.deepEqual(await fingerprintBuiltDist(root),before);
});});
test('source fingerprint ignores dist and evidence changes',async()=>{await fixture(async root=>{
  const a=await fingerprintBuildInputs(root);
  await writeFile(path.join(root,'dist','index.html'),'updated');
  await writeFile(path.join(root,'qa-results','runtime.json'),'updated');
  assert.equal((await fingerprintBuildInputs(root)).sha256,a.sha256);
});});
test('source fingerprint detects changes to source, scripts, and vendor',async()=>{await fixture(async root=>{
  let prev=await fingerprintBuildInputs(root);
  for(const f of ['src/index.html','scripts/build.mjs','vendor/platform.js']){
    await writeFile(path.join(root,f),'changed '+f);
    const cur=await fingerprintBuildInputs(root);
    assert.notEqual(cur.sha256,prev.sha256);
    prev=cur;
  }
});});
test('unchanged build inputs and normalized outputs produce candidate parity, NEVER a skip permit',()=>{
  const r=compareBuildObservations([valid('project-tests'),valid('project-build')],{sourceCommit:SHA});
  assert.equal(r.status,'PARITY_CANDIDATE');
  assert.equal(r.inputParity,true);
  assert.equal(r.approvedToSkipBuild,false);
});
test('input drift is logged even if built outputs match',()=>{
  const v=valid('project-build');v.input.sha256='e'.repeat(64);
  const r=compareBuildObservations([valid('project-tests'),v]);
  assert.equal(r.status,'INPUT_DRIFT');assert.equal(r.inputParity,false);
});
test('output drift is logged even with identical inputs',()=>{
  const v=valid('project-build');v.output.normalized.sha256='e'.repeat(64);
  const r=compareBuildObservations([valid('project-tests'),v]);
  assert.equal(r.status,'OUTPUT_DRIFT');assert.equal(r.normalizedOutputParity,false);
});
test('wrong source SHA is fail closed',()=>{
  assert.throws(()=>compareBuildObservations([valid('project-tests'),valid('project-build',{sourceCommit:'other'})]),/environment or source SHA/);
});
test('missing two phases, malformed digests and incomplete evidence fail closed',()=>{
  assert.throws(()=>compareBuildObservations([valid('project-tests')]),/two complete/);
  assert.throws(()=>compareBuildObservations([valid('project-tests'),valid('project-tests',{id:'second'})]),/required distinct/);
  assert.throws(()=>compareBuildObservations([valid('project-tests'),valid('project-build',{input:{sha256:'bad'}})]),/malformed or incomplete/);
});
test('begin/finish writes distinct immutable trace files and comparison evidence',async()=>{await fixture(async root=>{
  const a=await beginObservedBuild(root,'project-tests');await finishObservedBuild(root,a);
  const b=await beginObservedBuild(root,'project-build');await finishObservedBuild(root,b);
  const comparison=await finalizeBuildObservations(root);
  assert.equal(comparison.status,'PARITY_CANDIDATE');
  assert.equal(comparison.observationCount,2);
  assert.equal(JSON.parse(await readFile(path.join(root,'qa-results/p2b-build-comparison.json'),'utf8')).approvedToSkipBuild,false);
});});
test('missing completed trace makes finalization fail closed',async()=>{await fixture(async root=>{
  const a=await beginObservedBuild(root,'project-tests');await finishObservedBuild(root,a);
  await beginObservedBuild(root,'project-build');
  await assert.rejects(()=>finalizeBuildObservations(root),/incomplete build traces/);
});});
test('mismatched trace completion fails even if data types are plausible',async()=>{await fixture(async root=>{
  const a=await beginObservedBuild(root,'project-tests');await finishObservedBuild(root,a);
  const b=await beginObservedBuild(root,'project-build');await finishObservedBuild(root,b);
  const fp=path.join(root,'qa-results/p2b-build-traces',`${b.id}.completed.json`);
  const data=JSON.parse(await readFile(fp,'utf8'));data.input.sha256='f'.repeat(64);
  await writeFile(fp,JSON.stringify(data));
  await assert.rejects(()=>finalizeBuildObservations(root),/mismatched start\/completion/);
});});
test('build observation rejects unknown phase',async()=>{await fixture(async root=>{
  await assert.rejects(()=>beginObservedBuild(root,'before-tests'),/build phase/);
});});
test('QA release still executes BOTH original build stages and only instruments them',async()=>{
  const qa=await readFile(new URL('./qa-release.mjs',import.meta.url),'utf8');
  const manifest=JSON.parse(await readFile(new URL('../qa/qa-manifest.json',import.meta.url),'utf8'));
  const pkg=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));
  assert.equal(manifest.testCommand,'npm test');
  assert.equal(manifest.buildCommand,'npm run build');
  assert.match(pkg.scripts.test,/npm run build/);
  assert.match(qa,/\["project-tests", manifest\.testCommand\]/);
  assert.match(qa,/\["project-build", manifest\.buildCommand\]/);
  assert.match(qa,/GHRAB_QA_P2B_TRACE: '1'/);
  assert.match(qa,/finalizeBuildObservations\(ROOT\)/);
  assert.match(qa,/await rm\(buildRoot, \{ recursive: true, force: true \}\)/);
});
test('P5 must execute negative evidence tests before GARP and P5 attestations',async()=>{
  const wf=await readFile(new URL('../.github/workflows/p5-release-gate.yml',import.meta.url),'utf8');
  const markers=['Verify P2 reporter build parity and tamper rejection','Verify P2B build evidence integrity and negative cases','Run GARP 2.7 FOUNDATION gate','Run P5 R2 release gate'];
  const offsets=markers.map(x=>wf.indexOf(`- name: ${x}`));
  assert.ok(offsets.every(x=>x>=0));
  assert.ok(offsets.every((x,i)=>i===0||x>offsets[i-1]));
  assert.match(wf,/node --test scripts\/test-qa-p2b-build-observer\.mjs/);
});
