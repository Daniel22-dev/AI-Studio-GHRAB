#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const policy = json('security/garp27/architecture-policy.json');
const inventory = json('security/garp27/capability-inventory.json');
const deployment = json('src/config/deployment.json');
const school = json('src/config/deployment.school-server.json');
const aiCore = json('src/config/ai-core.json');
const errors = [];
const notes = [];

for (const rel of policy.requiredFiles || []) if (!fs.existsSync(path.join(ROOT, rel))) errors.push(`missing required file: ${rel}`);

const sourceFiles = [];
for (const scope of policy.sourceScopes || []) {
  const start = path.join(ROOT, scope);
  if (!fs.existsSync(start)) { errors.push(`missing source scope: ${scope}`); continue; }
  walk(start, (full) => sourceFiles.push(posix(path.relative(ROOT, full))));
}
if (sourceFiles.length < Number(policy.minimumCheckedSourceFiles || 1)) errors.push(`source scope too small: ${sourceFiles.length}`);

const codeFiles = sourceFiles.filter((rel) => rel.startsWith('src/') && /\.(?:m?js)$/i.test(rel) && !rel.endsWith('.example.js'));
let importEdges = 0;
let unresolvedImports = 0;
for (const rel of codeFiles) {
  let source = '';
  try { source = fs.readFileSync(path.join(ROOT, rel), 'utf8'); } catch { continue; }
  for (const spec of importSpecifiers(source)) {
    if (!spec.startsWith('.')) continue;
    importEdges += 1;
    const resolved = resolveRelativeImport(path.join(ROOT, rel), spec);
    if (!resolved) { unresolvedImports += 1; errors.push(`${rel}: unresolved relative import ${spec}`); continue; }
    const target = posix(path.relative(ROOT, resolved));
    for (const rule of policy.forbiddenSourceEdges || []) {
      if (rel.startsWith(rule.fromPrefix) && target.startsWith(rule.toPrefix)) errors.push(`${rel}: forbidden dependency edge -> ${target}`);
    }
  }
}

const forbiddenFragments = [
  ...(policy.forbiddenArtifactFragments || []),
  ...(policy.forbiddenArtifactFragmentParts || []).map((parts) => parts.join('')),
];
const artifactStats = [];
for (const out of policy.productionArtifacts || []) {
  const dir = path.join(ROOT, out);
  if (!fs.existsSync(dir)) { errors.push(`production artifact missing: ${out}`); continue; }
  let count = 0;
  walk(dir, (full) => {
    count += 1;
    const rel = posix(path.relative(dir, full));
    if ((policy.forbiddenArtifactPathPrefixes || []).some((x) => rel === x.replace(/\/$/, '') || rel.startsWith(x))) errors.push(`${out}: forbidden artifact path ${rel}`);
    const stat = fs.lstatSync(full);
    if (stat.isSymbolicLink()) errors.push(`${out}: symlink forbidden ${rel}`);
    if (stat.size > 4 * 1024 * 1024 || !/\.(?:m?js|json|html|css|txt|webmanifest|svg|md)$/i.test(rel)) return;
    let text = '';
    try { text = fs.readFileSync(full, 'utf8'); } catch { return; }
    for (const fragment of forbiddenFragments) if (text.includes(fragment)) errors.push(`${out}/${rel}: forbidden private material fragment`);
    if (/AIza[0-9A-Za-z_-]{20,}/.test(text)) errors.push(`${out}/${rel}: literal provider credential pattern`);
  });
  artifactStats.push({ artifact: out, files: count });
}

if (inventory.agentic !== false || (inventory.aiOperations || []).length !== 0 || (inventory.autonomousToolCapabilities || []).length !== 0) errors.push('Studio capability inventory must not claim autonomous/provider AI operations');
if (deployment.appId !== 'ai-studio' || deployment.aiTransport !== 'not-applicable') errors.push('standalone deployment identity/AI transport mismatch');
if (school.appId !== 'ai-studio' || school.aiTransport !== 'not-applicable' || school.features?.allowLocalProviderKeys !== false) errors.push('school deployment AI boundary mismatch');
if (policy.singleAuthority !== 'GARP-2.7' || !(policy.legacyAuthorities || []).includes('GARP-2.5.1')) errors.push('security authority mapping invalid');

const active = aiCore.activeRelease || {};
for (const [name, meta] of Object.entries(active.artifacts || {})) {
  const full = path.join(ROOT, 'src', active.releasePath || '', name);
  if (!fs.existsSync(full)) { errors.push(`AI Core artifact missing: ${name}`); continue; }
  const actual = sha(full);
  if (actual !== String(meta.sha256 || '').toLowerCase()) errors.push(`AI Core artifact digest mismatch: ${name}`);
}
if (aiCore.distribution?.immutableRelease !== true || aiCore.distribution?.consumerCopiesMustMatchSha256 !== true) errors.push('AI Core distribution immutability contract is not enabled');

const access = fs.readFileSync(path.join(ROOT, 'src/access/access-control.js'), 'utf8');
if (!access.includes('crypto.subtle.verify') || !access.includes("reason: \"invalid-signature\"") || !access.includes('revokedJti')) errors.push('signed access fail-closed enforcement markers missing');
const runtime = fs.readFileSync(path.join(ROOT, 'src/access/platform-runtime.js'), 'utf8');
if (!runtime.includes('deleteMyData') || !runtime.includes('endWork') || !runtime.includes('suite-session-generation')) errors.push('data lifecycle enforcement markers missing');

notes.push('AI Core provider adapter code is an explicitly inventoried immutable distribution payload; it is not classified as a direct AI operation of the Studio UI.');
notes.push('GARP 2.5.1 remains a regression baseline and is not treated as a competing active authority.');
const report = {
  classification:'GARP27_ARCHITECTURE_INTEGRITY', status: errors.length ? 'FAIL' : 'PASS', appId:'ai-studio',
  checkedSourceFiles:sourceFiles.length, checkedCodeFiles:codeFiles.length, importEdges, unresolvedImports, artifactStats, errors, notes,
};
console.log(JSON.stringify(report, null, 2));
process.exit(errors.length ? 1 : 0);

function json(rel){ return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8')); }
function sha(file){ return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
function posix(v){ return v.split(path.sep).join('/'); }
function walk(dir,onFile){ for(const entry of fs.readdirSync(dir,{withFileTypes:true})){ const full=path.join(dir,entry.name); if(entry.isDirectory()) walk(full,onFile); else if(entry.isFile()||entry.isSymbolicLink()) onFile(full); } }
function importSpecifiers(source){ const out=[]; for(const re of [/\b(?:import|export)\s+(?:[^'";]*?\s+from\s+)?['"]([^'"]+)['"]/g,/\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g]){ let m; while((m=re.exec(source))) out.push(m[1]); } return out; }
function resolveRelativeImport(fromFile,spec){ const clean=spec.replace(/[?#].*$/,''); const base=path.resolve(path.dirname(fromFile),clean); const candidates=[base,`${base}.js`,`${base}.mjs`,`${base}.json`,path.join(base,'index.js'),path.join(base,'index.mjs')]; return candidates.find((c)=>fs.existsSync(c)&&fs.statSync(c).isFile())||null; }
