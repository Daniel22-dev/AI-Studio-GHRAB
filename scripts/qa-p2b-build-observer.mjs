#!/usr/bin/env node
// P2B, evidence only. Never reuses or skips a build, never rewrites dist.
// All files are measured by bytes and stable relative pathname, not mtime.
import { createHash, randomUUID } from 'node:crypto';
import { lstat, readdir, readFile, rename, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const P2B_SCHEMA = 'ghrab-qa-p2b-build-comparison-v1';
const INPUT_ROOTS = ['src', 'scripts', 'vendor', 'qa', 'config', 'security', 'ci'];
const INPUT_FILES = ['package.json', 'package-lock.json', 'ghrab-platform.consumer.json'];
const DYNAMIC_BUILD_FILES = new Set(['build-info.json', 'platform-build-info.json']);
const HEX64 = /^[a-f0-9]{64}$/;
const ph = (bytes) => createHash('sha256').update(bytes).digest('hex');
const posix = (value) => value.split(path.sep).join('/');

function requireInside(root, location) {
  const resolved = path.resolve(location);
  const parent = path.resolve(root);
  if (resolved !== parent && !resolved.startsWith(`${parent}${path.sep}`)) {
    throw new Error(`P2B path escapes trusted root: ${location}`);
  }
  return resolved;
}

async function walkStrict(root, relative, { required = true } = {}) {
  const full = requireInside(root, path.join(root, relative));
  let stat;
  try { stat = await lstat(full); }
  catch (error) {
    if (!required && error?.code === 'ENOENT') return [];
    throw error;
  }
  if (stat.isSymbolicLink()) throw new Error(`P2B symlink refused: ${relative}`);
  if (stat.isFile()) return [posix(relative)];
  if (!stat.isDirectory()) throw new Error(`P2B special file refused: ${relative}`);
  const children = (await readdir(full)).sort();
  const found = [];
  for (const child of children) found.push(...await walkStrict(root, path.join(relative, child)));
  return found;
}

async function fingerprint(root, files, { normalizeBuildTimestamps = false } = {}) {
  const h = createHash('sha256');
  const entries = [];
  let byteCount = 0;
  for (const rel of [...new Set(files)].sort()) {
    const file = requireInside(root, path.join(root, rel));
    if (!(await lstat(file)).isFile()) throw new Error(`P2B nonregular input: ${rel}`);
    let bytes = await readFile(file);
    byteCount += bytes.length;
    if (normalizeBuildTimestamps && DYNAMIC_BUILD_FILES.has(rel)) {
      const decoded = JSON.parse(bytes.toString('utf8'));
      if (typeof decoded?.builtAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(decoded.builtAt)) {
        throw new Error(`P2B invalid build timestamp: ${rel}`);
      }
      decoded.builtAt = '<P2B-TIMESTAMP-NORMALIZED>';
      bytes = Buffer.from(JSON.stringify(decoded));
    }
    const fileHash = ph(bytes);
    entries.push({ path: posix(rel), sha256: fileHash, sizeBytes: bytes.length });
    h.update(`${posix(rel)}\0${fileHash}\0`, 'utf8');
  }
  return { sha256: h.digest('hex'), fileCount: entries.length, totalBytes: byteCount, files: entries };
}

export async function fingerprintBuildInputs(root) {
  const files = [];
  for (const part of INPUT_ROOTS) files.push(...await walkStrict(root, part, { required: ['src', 'scripts', 'vendor'].includes(part) }));
  for (const name of INPUT_FILES) files.push(...await walkStrict(root, name));
  return fingerprint(root, files);
}

export async function fingerprintBuiltDist(root) {
  const dir = path.join(root, 'dist');
  const files = await walkStrict(dir, '.');
  const cleaned = files.map(x=>x.replace(/^\.\//, ''));
  if (!cleaned.includes('build-info.json') || !cleaned.includes('platform-build-info.json') || !cleaned.includes('index.html')) {
    throw new Error('P2B incomplete build: mandatory output missing');
  }
  return {
    raw: await fingerprint(dir, cleaned),
    normalized: await fingerprint(dir, cleaned, { normalizeBuildTimestamps: true }),
    normalizedFields: [...DYNAMIC_BUILD_FILES].map(file => `${file}:builtAt`),
  };
}

async function saveAtomic(file, content) {
  await mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.${randomUUID()}.tmp`;
  await writeFile(temp, `${JSON.stringify(content, null, 2)}\n`, { flag: 'wx' });
  await rename(temp, file);
}

const traceFolder = root => path.join(root, 'qa-results', 'p2b-build-traces');

export async function beginObservedBuild(root, phase) {
  if (!['project-tests', 'project-build'].includes(phase)) {
    throw new Error('P2B build phase must be project-tests or project-build');
  }
  const started = {
    schema: 'ghrab-qa-p2b-build-observation-v1',
    id: randomUUID(), phase,
    startedAt: new Date().toISOString(),
    sourceCommit: process.env.GITHUB_SHA || null,
    nodeVersion: process.version,
    platform: process.platform, arch: process.arch,
    input: await fingerprintBuildInputs(root),
  };
  await saveAtomic(path.join(traceFolder(root), `${started.id}.started.json`), started);
  return started;
}

export async function finishObservedBuild(root, started) {
  if (!started?.id || !['project-tests', 'project-build'].includes(started.phase)) {
    throw new Error('P2B missing observation start');
  }
  const completed = {
    ...started,
    finishedAt: new Date().toISOString(),
    output: await fingerprintBuiltDist(root),
  };
  await saveAtomic(path.join(traceFolder(root), `${started.id}.completed.json`), completed);
  return completed;
}

function diffEntries(a, b, limit=25) {
  const ma = new Map((a?.files || []).map(x=>[x.path, x.sha256]));
  const mb = new Map((b?.files || []).map(x=>[x.path, x.sha256]));
  return [...new Set([...ma.keys(), ...mb.keys()])].sort().filter(k=>ma.get(k)!==mb.get(k)).slice(0,limit);
}

export function compareBuildObservations(observations, { sourceCommit=null } = {}) {
  if (!Array.isArray(observations) || observations.length < 2) throw new Error('P2B missing two complete build observations');
  for (const obs of observations) {
    if (obs?.schema !== 'ghrab-qa-p2b-build-observation-v1' || !obs.id || !HEX64.test(obs.input?.sha256||'') ||
        !HEX64.test(obs.output?.raw?.sha256||'') || !HEX64.test(obs.output?.normalized?.sha256||'')) {
      throw new Error('P2B malformed or incomplete build observation');
    }
    if (sourceCommit && obs.sourceCommit !== sourceCommit) throw new Error('P2B observed build from unexpected commit');
  }
  const first = observations.find(x=>x.phase==='project-tests');
  const second = observations.findLast(x=>x.phase==='project-build');
  if (!first || !second || first.id === second.id) throw new Error('P2B required distinct project-tests and project-build observations');
  const sameEnvironment = first.nodeVersion === second.nodeVersion && first.platform === second.platform && first.arch === second.arch && first.sourceCommit === second.sourceCommit;
  if (!sameEnvironment) throw new Error('P2B build environment or source SHA changed within QA release');
  const sameInput = first.input.sha256 === second.input.sha256;
  const sameNormalizedOutput = first.output.normalized.sha256 === second.output.normalized.sha256;
  const status = sameInput && sameNormalizedOutput ? 'PARITY_CANDIDATE' : !sameInput ? 'INPUT_DRIFT' : 'OUTPUT_DRIFT';
  return {
    schema: P2B_SCHEMA,
    recordedAt: new Date().toISOString(),
    observationCount: observations.length,
    sourceCommit: first.sourceCommit,
    nodeVersion: first.nodeVersion,
    phases: observations.map(x=>({id:x.id,phase:x.phase,inputSha256:x.input.sha256,rawDistSha256:x.output.raw.sha256,normalizedDistSha256:x.output.normalized.sha256,fileCount:x.output.raw.fileCount})),
    status,
    inputParity: sameInput,
    normalizedOutputParity: sameNormalizedOutput,
    rawOutputParity: first.output.raw.sha256 === second.output.raw.sha256,
    inputChangedFiles: diffEntries(first.input, second.input),
    normalizedOutputChangedFiles: diffEntries(first.output.normalized, second.output.normalized),
    outputChangedFiles: diffEntries(first.output.raw, second.output.raw),
    normalizedFields: first.output.normalizedFields,
    // NEVER a permission to skip any build, even if the observed hashes match.
    approvedToSkipBuild: false,
    explanation: 'P2B is evidence only. Project tests, project build, GARP, P5 and release attestations still execute independently.',
  };
}

export async function finalizeBuildObservations(root) {
  const folder = traceFolder(root);
  const names = (await readdir(folder)).filter(x=>x.endsWith('.json')).sort();
  const startedNames = names.filter(x=>x.endsWith('.started.json'));
  const completedNames = names.filter(x=>x.endsWith('.completed.json'));
  if (!startedNames.length || completedNames.length !== startedNames.length) {
    throw new Error('P2B incomplete build traces: every start must have a completion');
  }
  const complete = [];
  for (const file of completedNames) {
    const id = file.slice(0,-'.completed.json'.length);
    if (!startedNames.includes(`${id}.started.json`)) throw new Error('P2B completion missing start');
    const [start,done] = await Promise.all([
      readFile(path.join(folder, `${id}.started.json`),'utf8').then(JSON.parse),
      readFile(path.join(folder, file),'utf8').then(JSON.parse),
    ]);
    if (start.id!==id || done.id!==id || start.phase!==done.phase || start.input.sha256!==done.input.sha256) {
      throw new Error('P2B mismatched start/completion evidence');
    }
    complete.push(done);
  }
  complete.sort((a,b)=>a.startedAt.localeCompare(b.startedAt)||a.id.localeCompare(b.id));
  const result = compareBuildObservations(complete, {sourceCommit:process.env.GITHUB_SHA||null});
  await saveAtomic(path.join(root,'qa-results','p2b-build-comparison.json'), result);
  console.log(`P2B build evidence: ${result.status} input=${result.inputParity} normalized-output=${result.normalizedOutputParity} observations=${result.observationCount}; NO BUILD REMOVED`);
  if (result.inputChangedFiles.length) console.log(`P2B changed inputs: ${result.inputChangedFiles.join(', ')}`);
  if (result.normalizedOutputChangedFiles.length) console.log(`P2B changed output: ${result.normalizedOutputChangedFiles.join(', ')}`);
  return result;
}
