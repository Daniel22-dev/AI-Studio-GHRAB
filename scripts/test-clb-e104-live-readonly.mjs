import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const ORIGIN = 'https://conversation-lab-ghrab.pages.dev';
const FILES = Object.freeze([
  ['/', '00b2d48186d65d5c548d354d03bf94e8d85a5eaaa1f6fb9bc242d6050863d142', 13910],
  ['/assets/app.js', 'dabcaced97ca6ec21890a43eb43cf5da3600d106d0164fd5de570ebc7855c03a', 25174],
  ['/assets/styles.css', 'f6d2cdd4af7f3a37f0405d44c543ca0d33f9cce75cd45a8c31e4491b5e7b029c', 31191],
  ['/data/catalog.json', '93813482fabf53fe3ff5c0657b4f6b9c362f912aa496dd44c5b2c38de5ee7b4f', 522],
  ['/data/lessons/artificial-intelligence/en/B1-r1.json', '4a163857dc2b90e3b9a3a60e8e4440f7c45c2a1f2530f970a99543925fe390b9', 29040],
  ['/studio-manifest.json', 'e139a829fadc59e1563632aae9995334c87e0b23f991dcf5e6b41dc9c1b51464', 3075],
  ['/manual/', '65eeb72470869359f9f22652e7c976441bf4331fd040a4b5eb06b040bd19900b', 2188]
]);
const NO_PUBLIC = ['/content/private/e7-drafts/','/admin/','/api/','/.env','/data/lessons/artificial-intelligence/en/C1.json'];
const digest = bytes => createHash('sha256').update(bytes).digest('hex');

async function fetchReadOnly(path) {
  const url = new URL(path, ORIGIN);
  assert.equal(url.origin, ORIGIN);
  const result = await fetch(url, {
    method: 'GET', redirect: 'manual', credentials: 'omit',
    headers: { 'Accept': '*/*' },
    signal: AbortSignal.timeout(12000)
  });
  assert.equal(result.url, url.href, 'unexpected location or redirected response');
  assert.equal(result.redirected, false);
  return result;
}

test('E104 live Cloudflare origin still serves the exact seven pinned public assets, no missing or swapped B1', async () => {
  for (const [path, hash, length] of FILES) {
    const response = await fetchReadOnly(path);
    assert.equal(response.status, 200, path + ': unexpected HTTP status');
    assert.equal(response.headers.get('set-cookie'), null, path + ': must not set session cookies');
    const bytes = Buffer.from(await response.arrayBuffer());
    assert.equal(bytes.length, length, path + ': byte length changed');
    assert.equal(digest(bytes), hash, path + ': released asset digest changed');
  }
});
test('E104 live public origin rejects unsafe framed session and unpublished paths', async () => {
  const root = await fetchReadOnly('/');
  assert.equal(root.status, 200);
  const csp = root.headers.get('content-security-policy') || '';
  assert.match(csp, /frame-ancestors\\s+'none'/i, 'public player must reject framing');
  assert.equal(root.headers.get('set-cookie'), null, 'public player must stay anonymous');
  assert.match(root.headers.get('x-content-type-options') || '', /nosniff/i);
  await root.arrayBuffer();
  for (const path of NO_PUBLIC) {
    const response = await fetchReadOnly(path);
    assert.equal(response.status, 404, path + ': unauthorized route must remain 404');
    await response.arrayBuffer();
  }
});
