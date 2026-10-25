#!/usr/bin/env node
/**
 * GARP 2.7 diagnostic-only summary for a failed CI run.
 * Never prints raw QA logs, request bodies, URLs, content, keys, or user data.
 * The original GARP exit status and all release gates remain untouched.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ALLOWED = Object.freeze([
  'contracts', 'policy-mutations', 'app-mutations', 'auto-patch-contract',
  'legacy-tooling', 'legacy-secret-scan', 'application-regressions',
  'prepare-deployment', 'architecture', 'deployment-leak-scan',
]);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const FOLDER = path.join(ROOT, 'audit-evidence', 'garp27-current');

export function failureSignals(raw) {
  if (typeof raw !== 'string') return Object.freeze({exit: null, lastScript: null, failedTestNumbers: [], errorClasses: []});
  const lines = raw.split(/\r?\n/);
  const firstExit = lines.find(line => /^EXIT=(?:\d+|null)$/.test(line));
  const exit = firstExit && firstExit !== 'EXIT=null' ? Number(firstExit.slice(5)) : null;
  const scripts = lines.flatMap(line => {
    const m = /^>\s+ai-studio-ghrab@\d+\.\d+\.\d+\s+([a-z][a-z0-9:_-]{0,63})\s*$/.exec(line.trim());
    return m ? [m[1]] : [];
  });
  const tests = new Set();
  const errors = new Set();
  for (const line of lines) {
    const m = /^not ok\s+(\d+)\s+-/.exec(line.trim());
    if (m && tests.size < 20) tests.add(Number(m[1]));
    for (const match of line.matchAll(/\b(?:ERR_[A-Z0-9_]{2,48}|[A-Z][A-Za-z]*Error)\b/g)) {
      if (errors.size < 12) errors.add(match[0]);
    }
  }
  return Object.freeze({
    exit,
    lastScript: scripts.at(-1) || null,
    failedTestNumbers: Object.freeze([...tests]),
    errorClasses: Object.freeze([...errors]),
  });
}
export function inspectGarpEvidence(directory = FOLDER) {
  const results = [];
  for (const id of ALLOWED) {
    const file = path.join(directory, id + '.log');
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) continue;
    const signals = failureSignals(fs.readFileSync(file, 'utf8'));
    if (signals.exit === 0) continue;
    results.push(Object.freeze({step: id, ...signals}));
  }
  return results;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  // Explicitly do not print raw contents or full test names; only fixed step IDs,
  // script names, test numbers and predefined error-class patterns.
  console.log(JSON.stringify({
    schema: 'ghrab-garp27-safe-failure-diagnostics-v1',
    status: 'DIAGNOSTIC_ONLY_NO_RELEASE_AUTHORITY',
    failedSteps: inspectGarpEvidence(),
  }, null, 2));
}
