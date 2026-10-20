/** Read-only verification of the actual Studio publication, never a deployment. */
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import assert from 'node:assert/strict';
import { verifyClbMasterFiles } from './lib/clb-master-integrity.mjs';
import { expectedClbStudioTree } from './lib/clb-studio-adapter.mjs';

const base = 'https://daniel22-dev.github.io/AI-Studio-GHRAB/';
const root = process.cwd();
const sourceSha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
assert.match(sourceSha, /^[a-f0-9]{40}$/);
assert.equal(sourceSha, process.env.GHRAB_SOURCE_COMMIT);
const pkg = JSON.parse(await readFile('package.json'));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const report = {
  schema: 'ghrab-clb-actual-studio-publication-v1', origin: base,
  sourceSha, studioVersion: pkg.version, checkedAt: new Date().toISOString(),
  mode: 'ACTUAL_HTTPS_READ_ONLY_NO_RESPONSE_MOCKS', status: 'RUNNING',
  ownerPermitUsed: false, privateKeyUsed: false, files: [], errors: []
};
async function request(name) {
  const url = new URL(name, base);
  url.searchParams.set('_clb_release_sha', sourceSha);
  const response = await fetch(url, {
    redirect: 'error', credentials: 'omit', cache: 'no-store',
    headers: { 'Cache-Control': 'no-cache', 'Accept-Encoding': 'identity' },
    signal: AbortSignal.timeout(30000)
  });
  assert.equal(response.url, url.href, name + ': unexpected redirect');
  assert.equal(response.status, 200, name + ': HTTP status');
  const body = Buffer.from(await response.arrayBuffer());
  assert.ok(body.length <= 2000000, name + ': oversized response');
  return { body, contentType: response.headers.get('content-type') || '' };
}
try {
  report.sourceIntegrity = await verifyClbMasterFiles(root, path.join(root, 'src'));
  const teacher = await expectedClbStudioTree(root, pkg.version);
  assert.equal(teacher.size, 120);
  const expected = new Map([...teacher].map(([name, b]) => ['conversation-lab/' + name, b]));
  for (const name of [
    'teacher-launch.js', 'portal-route.js', 'launch-control.v0.11.0.json',
    'owner-content-release.v0.11.0.signed.json', 'governance/project-owner-release.v0.11.0.json'
  ]) {
    const target = 'integration/conversation-lab/' + name;
    expected.set(target, await readFile(path.join(root, 'src', target)));
  }
  const names = [...expected.keys()];
  let cursor = 0;
  await Promise.all(Array.from({ length: 6 }, async () => {
    while (cursor < names.length) {
      const name = names[cursor++];
      const { body, contentType } = await request(name);
      assert.ok(body.equals(expected.get(name)), name + ': deployed bytes differ');
      if (name.endsWith('.html')) assert.match(contentType, /^text\/html\b/);
      if (name.endsWith('.json')) assert.match(contentType, /^application\/json\b/);
      if (name.endsWith('.js')) assert.match(contentType, /^(text|application)\/javascript\b/);
      report.files.push({ path: name, size: body.length, sha256: sha(body), contentType, exact: true });
    }
  }));
  report.files.sort((a, b) => a.path.localeCompare(b.path));
  assert.equal(report.files.length, 125);
  const info = JSON.parse((await request('build-info.json')).body);
  assert.equal(info.version, pkg.version);
  assert.equal(info.apps.find(app => app.id === 'conversation-lab')?.version, '0.11.0');
  const apps = JSON.parse((await request('config/apps.generated.json')).body);
  const clb = apps.find(app => app.id === 'conversation-lab');
  assert.equal(clb.version, '0.11.0');
  report.liveVersion = info.version;
  report.liveApps = info.apps;
  report.status = 'PASS';
} catch (error) {
  report.status = 'FAIL'; report.errors.push(error.stack); process.exitCode = 1;
}
await mkdir('qa-results/clb-publication', { recursive: true });
await writeFile('qa-results/clb-publication/report.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ ...report, files: report.files.length }, null, 2));
