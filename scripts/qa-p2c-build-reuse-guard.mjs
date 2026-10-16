#!/usr/bin/env node
// P2C: skip ONLY the redundant internal test.mjs rebuild after a live,
// successful reporter browser regression against the same byte-identical dist.
// Independent QA project-build, GARP and P5 builds are never bypassed.
import { createHash, randomUUID } from 'node:crypto';
import { lstat, readdir, readFile, mkdir, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { fingerprintBuildInputs, fingerprintBuiltDist } from './qa-p2b-build-observer.mjs';

export const P2C_SCHEMA = 'ghrab-qa-p2c-built-artifact-reuse-v1';
const HEX = /^[a-f0-9]{64}$/;
const observationDir = (root) => path.join(root, 'qa-results', 'p2b-build-traces');
const reportPath = (root) => path.join(root, 'qa-results', 'p2c-built-artifact-reuse.json');
const reporterPath = (root) => path.join(root, 'test-results', 'error-reporter.json');
const reporterArchivePath = (root) => path.join(root, 'qa-results', 'p2c-original-reporter.json');

async function requirePlainFile(file) {
  const stat = await lstat(file);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`P2C refuses non-regular file: ${path.basename(file)}`);
  return readFile(file);
}

function ensure(valid, message) {
  if (!valid) throw new Error(`P2C fail-closed: ${message}`);
}

function verifyTreeProof(tree, description) {
  ensure(HEX.test(tree?.sha256 || '') && Number.isInteger(tree?.fileCount) &&
    tree.fileCount > 0 && Array.isArray(tree?.files) && tree.files.length === tree.fileCount,
    `${description} is missing complete per-file SHA-256 evidence`);
  const h = createHash('sha256');
  const seen = new Set();
  for (const f of [...tree.files].sort((a,b)=>a.path < b.path ? -1 : a.path > b.path ? 1 : 0)) {
    ensure(typeof f.path === 'string' && f.path && !f.path.includes('\\') &&
      !f.path.startsWith('/') && !f.path.split('/').some(part=>!part||part==='.'||part==='..') &&
      HEX.test(f.sha256 || '') && Number.isInteger(f.sizeBytes) && f.sizeBytes >= 0 &&
      !seen.has(f.path), `${description} has invalid or duplicated file evidence`);
    seen.add(f.path);
    h.update(`${f.path}\0${f.sha256}\0`, 'utf8');
  }
  ensure(h.digest('hex') === tree.sha256, `${description} tree SHA-256 is internally inconsistent`);
}

async function observedBuilds(root, expectedCommit) {
  const folder = observationDir(root);
  const dirStat = await lstat(folder);
  ensure(dirStat.isDirectory() && !dirStat.isSymbolicLink(), 'invalid P2B observation directory');
  const names = (await readdir(folder)).sort();
  const starts = names.filter((name) => name.endsWith('.started.json'));
  const completes = names.filter((name) => name.endsWith('.completed.json'));
  ensure(starts.length === 2 && completes.length === 2 && names.length === 4,
    'expected precisely two complete project-tests build traces before the internal rebuild');
  const observations = [];
  for (const name of completes) {
    const id = name.slice(0, -'.completed.json'.length);
    ensure(/^[a-f0-9-]{36}$/.test(id) && starts.includes(`${id}.started.json`), 'unpaired or invalid observation ID');
    const start = JSON.parse((await requirePlainFile(path.join(folder, `${id}.started.json`))).toString('utf8'));
    const done = JSON.parse((await requirePlainFile(path.join(folder, name))).toString('utf8'));
    ensure(start.schema === 'ghrab-qa-p2b-build-observation-v1' && done.schema === start.schema,
      'observation schema mismatch');
    ensure(start.id === id && done.id === id && start.phase === 'project-tests' && done.phase === start.phase,
      'unexpected build phase or identity');
    ensure(start.startedAt === done.startedAt && Number.isFinite(Date.parse(start.startedAt)) &&
      Number.isFinite(Date.parse(done.finishedAt)) && Date.parse(done.finishedAt) >= Date.parse(start.startedAt),
      'invalid observation timestamps');
    ensure(start.nodeVersion === process.version && done.nodeVersion === process.version &&
      start.platform === process.platform && done.platform === process.platform &&
      start.arch === process.arch && done.arch === process.arch,
      'build environment differs from current test process');
    ensure(start.sourceCommit === expectedCommit && done.sourceCommit === expectedCommit,
      'build source commit differs from current test process');
    ensure(HEX.test(start.input?.sha256 || '') && done.input?.sha256 === start.input.sha256 &&
      Number.isInteger(start.input?.fileCount) && start.input.fileCount > 0 &&
      start.input.fileCount === done.input.fileCount,
      'input hash or input count mismatch');
    verifyTreeProof(start.input, 'P2B initial input');
    verifyTreeProof(done.input, 'P2B completed input');
    verifyTreeProof(done.output?.raw, 'P2B raw output');
    verifyTreeProof(done.output?.normalized, 'P2B normalized output');
    ensure(done.output.raw.fileCount === done.output.normalized.fileCount, 'output evidence is incomplete');
    observations.push(done);
  }
  observations.sort((a, b) => a.startedAt.localeCompare(b.startedAt) || a.id.localeCompare(b.id));
  ensure(Date.parse(observations[0].finishedAt) <= Date.parse(observations[1].startedAt),
    'recorded builds overlap or run out of sequence');
  return observations;
}

// The caller must have just completed test-reporter-mail.mjs (which performs
// the second observed build then the browser regression) in the same process.
export async function attestReporterBuildReuse(root, { env = process.env } = {}) {
  ensure(env.GHRAB_QA_P2C_REUSE === '1' && env.GHRAB_QA_P2B_TRACE === '1' &&
    env.GHRAB_QA_P2B_PHASE === 'project-tests', 'not in explicitly enabled QA project-tests scope');
  if (env.GITHUB_ACTIONS === 'true') ensure(/^[a-f0-9]{40}$/.test(env.GITHUB_SHA || ''), 'missing exact CI source commit');
  const expectedCommit = env.GITHUB_SHA || null;
  const [first, reporterBuild] = await observedBuilds(root, expectedCommit);
  ensure(first.id !== reporterBuild.id, 'build observations were deduplicated');
  const reporterBytes = await requirePlainFile(reporterPath(root));
  const reporter = JSON.parse(reporterBytes.toString('utf8'));
  ensure(reporter?.browser?.status === 'passed', 'reporter browser regression did not PASS');
  const [actualInput, actualDist] = await Promise.all([
    fingerprintBuildInputs(root), fingerprintBuiltDist(root),
  ]);
  ensure(actualInput.sha256 === reporterBuild.input.sha256 &&
    actualInput.fileCount === reporterBuild.input.fileCount,
    'build inputs changed after reporter build');
  ensure(actualDist.raw.sha256 === reporterBuild.output.raw.sha256 &&
    actualDist.raw.fileCount === reporterBuild.output.raw.fileCount,
    'dist bytes changed after reporter build');
  ensure(actualDist.normalized.sha256 === reporterBuild.output.normalized.sha256,
    'normalized dist differs from reporter build');
  const evidence = {
    schema: P2C_SCHEMA,
    status: 'VERIFIED_REUSE',
    skipCount: 1,
    recordedAt: new Date().toISOString(),
    sourceCommit: expectedCommit,
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    buildPhase: 'project-tests',
    precedingBuilds: 2,
    reporterBuildId: reporterBuild.id,
    reporterBrowserStatus: reporter.browser.status,
    reporterReportSha256: createHash('sha256').update(reporterBytes).digest('hex'),
    inputSha256: actualInput.sha256,
    rawDistSha256: actualDist.raw.sha256,
    normalizedDistSha256: actualDist.normalized.sha256,
    distFileCount: actualDist.raw.fileCount,
    independentProjectBuildPreserved: true,
    explanation: 'Only the third build inside npm test was skipped after exact input and raw dist SHA-256 verification; project-build, GARP and P5 remain mandatory.',
  };
  // Preserve the exact ORIGINAL browser proof before P2A's later reporter test
  // overwrites test-results/error-reporter.json. This snapshot is part of the
  // QA artifact and must match the SHA recorded in the P2C reuse attestation.
  const original = reporterArchivePath(root);
  await mkdir(path.dirname(original), { recursive: true });
  const archivedReport = await requirePlainFile(reporterPath(root));
  ensure(createHash('sha256').update(archivedReport).digest('hex') === evidence.reporterReportSha256,
    'original reporter bytes changed before archival');
  await writeFile(original, archivedReport, { flag: 'wx' });
  const target = reportPath(root);
  const parent = path.dirname(target);
  await mkdir(parent, { recursive: true });
  const parentStat = await lstat(parent);
  ensure(parentStat.isDirectory() && !parentStat.isSymbolicLink(), 'invalid report directory');
  // Never follow a pre-existing symlink when recording evidence.
  try {
    await lstat(target);
    throw new Error('P2C fail-closed: reuse evidence already exists');
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  const temp = `${target}.${randomUUID()}.tmp`;
  await writeFile(temp, `${JSON.stringify(evidence, null, 2)}\n`, { flag: 'wx' });
  await rename(temp, target);
  return evidence;
}

export async function assertP2CReuseEvidence(root, { env = process.env } = {}) {
  const file = reportPath(root);
  const record = JSON.parse((await requirePlainFile(file)).toString('utf8'));
  ensure(record.schema === P2C_SCHEMA && record.status === 'VERIFIED_REUSE' &&
    record.skipCount === 1 && record.precedingBuilds === 2 &&
    record.buildPhase === 'project-tests' && /^[a-f0-9-]{36}$/.test(record.reporterBuildId || '') &&
    record.reporterBrowserStatus === 'passed' && record.independentProjectBuildPreserved === true,
    'missing required P2C skip evidence');
  ensure(record.sourceCommit === (env.GITHUB_SHA || null) && record.nodeVersion === process.version &&
    record.platform === process.platform && record.arch === process.arch,
    'P2C evidence was created for different source or runner');
  for (const field of ['inputSha256', 'rawDistSha256', 'normalizedDistSha256', 'reporterReportSha256']) {
    ensure(HEX.test(record[field] || ''), `invalid ${field}`);
  }
  ensure(Number.isInteger(record.distFileCount) && record.distFileCount > 0, 'invalid build file count');
  const archivedReporterBytes = await requirePlainFile(reporterArchivePath(root));
  ensure(createHash('sha256').update(archivedReporterBytes).digest('hex') === record.reporterReportSha256 &&
    JSON.parse(archivedReporterBytes.toString('utf8'))?.browser?.status === 'passed',
    'original archived reporter proof missing, modified or not PASS');
  const reporterBytes = await requirePlainFile(reporterPath(root));
  ensure(createHash('sha256').update(reporterBytes).digest('hex') === record.reporterReportSha256 &&
    JSON.parse(reporterBytes.toString('utf8'))?.browser?.status === 'passed',
    'reporter evidence changed since guarded reuse');
  const builds = await observedBuildsAtFinalize(root, env.GITHUB_SHA || null);
  ensure(builds.length === 3 && builds.filter(b => b.phase === 'project-tests').length === 2 &&
    builds.filter(b => b.phase === 'project-build').length === 1,
    'expected two project-tests builds plus an independent project-build');
  const reused = builds.find(b => b.id === record.reporterBuildId);
  ensure(reused?.phase === 'project-tests' && reused.input.sha256 === record.inputSha256 &&
    reused.output.raw.sha256 === record.rawDistSha256 &&
    reused.output.normalized.sha256 === record.normalizedDistSha256,
    'P2C evidence does not match P2B build observations');
  return record;
}

async function observedBuildsAtFinalize(root, expectedCommit) {
  const folder = observationDir(root);
  const names = (await readdir(folder)).sort();
  const starts = names.filter(x=>x.endsWith('.started.json'));
  const completes = names.filter(x=>x.endsWith('.completed.json'));
  ensure(names.length === 6 && starts.length === 3 && completes.length === 3,
    'incomplete or extra P2B build observations at QA finalization');
  const builds = [];
  for (const name of completes) {
    const id = name.slice(0,-'.completed.json'.length);
    ensure(starts.includes(`${id}.started.json`), 'unpaired finalized build');
    const start = JSON.parse((await requirePlainFile(path.join(folder,`${id}.started.json`))).toString('utf8'));
    const done = JSON.parse((await requirePlainFile(path.join(folder,name))).toString('utf8'));
    ensure(start.id === id && done.id === id && start.input?.sha256 === done.input?.sha256 &&
      done.sourceCommit === expectedCommit && start.sourceCommit === expectedCommit,
      'mismatched finalized build start/completion');
    verifyTreeProof(done.input, 'P2B finalized input');
    verifyTreeProof(done.output?.raw, 'P2B finalized raw output');
    verifyTreeProof(done.output?.normalized, 'P2B finalized normalized output');
    builds.push(done);
  }
  return builds;
}
