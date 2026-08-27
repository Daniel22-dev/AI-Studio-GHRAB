#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
execFileSync(process.execPath, [path.join(root, 'scripts', 'build.mjs')], { cwd: root, stdio: 'pipe' });
try {
  execFileSync(process.execPath, [path.join(root, 'scripts', 'test-error-reporter.mjs')], {
    cwd: root,
    stdio: 'pipe',
    env: process.env,
  });
  const report = JSON.parse(readFileSync(path.join(root, 'test-results', 'error-reporter.json'), 'utf8'));
  if (report.browser?.status === 'passed') {
    console.log('PASS: nativní Gmail odkaz, nová karta a ZIP byly ověřeny společnou regresní sadou.');
  } else {
    console.log(`NOT_READY: browserové ověření Gmailu nebylo provedeno — ${report.browser?.reason || 'neznámý důvod'}`);
  }
} catch (error) {
  process.stderr.write(error.stdout?.toString() || '');
  process.stderr.write(error.stderr?.toString() || '');
  process.exit(error.status || 1);
}
