#!/usr/bin/env node
/**
 * Production static QA parity for the standalone CLB authoring UI.
 * Stops P5 before Safe Promotion when strict CSP or readable-source rules break.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const BASE = new URL('../src/conversation-lab-topics/', import.meta.url);
const read = path => readFile(new URL(path, BASE), 'utf8');
const [html, css, app, gate] = await Promise.all([
  read('index.html'), read('styles.css'), read('app.js'), read('gate.js'),
]);

const assertMaxLine = (value, label) => {
  const bad = value.split(/\r?\n/).map((line, i) => ({ line: i + 1, len: line.length }))
    .filter(x => x.len > 500);
  assert.deepEqual(bad, [], label + ': production QA requires lines <= 500 UTF-16 characters');
};

test('CLB HTML and CSS pass the same 500-character production QA limit', () => {
  assertMaxLine(html, 'index.html');
  assertMaxLine(css, 'styles.css');
});

test('teacher HTML declares one strict same-origin CSP before any asset', () => {
  const heads = html.split(/<\/head>/i);
  assert.equal(heads.length, 2);
  const head = heads[0];
  const policies = [...head.matchAll(/<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]+)"/g)];
  assert.equal(policies.length, 1);
  const csp = policies[0][1];
  for (const fragment of [
    "default-src 'none'", "script-src 'self'", "style-src 'self'",
    "connect-src 'self'", "object-src 'none'", "base-uri 'none'",
    "form-action 'none'", "frame-src 'none'",
  ]) assert.ok(csp.split(';').map(v => v.trim()).includes(fragment), 'Missing restrictive CSP: ' + fragment);
  assert.doesNotMatch(csp, /unsafe-inline|unsafe-eval|data:\s*\*|https?:|\*/i);
  assert.ok(head.indexOf('Content-Security-Policy') < head.indexOf('<link rel="stylesheet"'));
  assert.match(html, /<script src="\.\/gate\.js" type="module"><\/script>/);
});

test('portable offline exports explicitly remove the live page CSP before inserting self-contained styles and code', () => {
  assert.match(app, /root\.querySelectorAll\('meta\[http-equiv="Content-Security-Policy"\]'\)\)meta\.remove\(\)/);
  assert.match(app, /root\.querySelectorAll\('script\[src\]'\)\)script\.remove\(\)/);
  assert.match(app, /root\.querySelectorAll\('link\[rel="stylesheet"\]'\)\)link\.remove\(\)/);
  assert.match(app, /root\.querySelector\('head'\)\.append\(style\)/);
  assert.match(app, /need\(root\.querySelectorAll\('script\[src\]'\)\.length===0,'PORTABLE_GATE_LEAK'\)/);
});

test('teacher gate requires signed CLB-01 training plus active school access', () => {
  assert.match(gate, /assertClbSignedTrainingPolicy\(requiredTraining\('conversation-lab'\)\)/);
  assert.match(gate, /hasAppAccess\('conversation-lab'\)\?\.enabled!==true/);
  assert.match(gate, /CLB01_ACCESS_REQUIRED/);
});
