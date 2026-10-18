import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';

const pins=JSON.parse(await readFile(new URL('../src/integration/conversation-lab/live-audit-pins.v091-v092.json',import.meta.url),'utf8'));
const origin='https://conversation-lab-ghrab.pages.dev';
const sha=b=>createHash('sha256').update(b).digest('hex');

async function get(path){
  const url=new URL(path,origin);
  assert.equal(url.origin,origin);
  const response=await fetch(url,{method:'GET',redirect:'manual',headers:{Accept:'*/*', 'Cache-Control':'no-cache'},signal:AbortSignal.timeout(15000)});
  assert.equal(response.url,url.href,'no HTTP redirect / wrong host');
  assert.equal(response.redirected,false);
  assert.equal(response.headers.get('set-cookie'),null,'no tracking cookies');
  return {status:response.status,headers:response.headers,body:Buffer.from(await response.arrayBuffer())};
}

test('E114 FRESH independent HTTPS exact v0.9.2 is deployed to PUBLIC Cloudflare, all hashes strict', {timeout:200000},async()=>{
  assert.equal(pins.files.length,21);
  const res=await get('/studio-manifest.json');
  assert.equal(res.status,200);
  const manifest=JSON.parse(res.body.toString('utf8'));
  assert.equal(manifest.version,'0.9.2','STOP: Cloudflare still serving 0.9.1 or unexpected version');
  assert.equal(manifest.integration.releaseId,'cl-ai-b1-pilot-20261018-r2');
  assert.equal(manifest.integration.signedStatementSha256,null,'owner receipt belongs only on Studio origin');
  assert.equal(sha(res.body),'c071bc4af56367458fb4e391019d3476790111f31495718e737bc339ee5cd134');
  const allServed=pins.files.filter(f=>!['_headers','404.html'].includes(f.path));
  assert.equal(allServed.length,19);
  const all=[];
  for(const f of allServed){
    const path=f.path==='index.html'?'/':f.path==='manual/index.html'?'/manual/':'/'+f.path;
    const r=f.path==='studio-manifest.json'?res:await get(path);
    assert.equal(r.status,200,path);
    assert.equal(r.body.length,f.size_092,path+' unexpected size');
    assert.equal(sha(r.body),f.sha256_092,path+' SHA256 mismatch');
    all.push(path);
    if(['/', '/data/catalog.json', '/studio-manifest.json'].includes(path)){
      const h=name=>String(r.headers.get(name)||'');
      assert.match(h('content-security-policy'),/default-src\s+'none'/);
      assert.match(h('content-security-policy'),/frame-ancestors\s+'none'/);
      assert.doesNotMatch(h('content-security-policy'),/unsafe-(?:eval|inline)/);
      assert.equal(h('x-frame-options'),'DENY');
      assert.equal(h('x-content-type-options'),'nosniff');
      assert.equal(h('referrer-policy'),'no-referrer');
      assert.equal(h('cross-origin-resource-policy'),'same-origin');
      assert.match(h('strict-transport-security'),/max-age=\d+/);
      assert.match(h('cache-control'),/no-store/);
    }
  }
  const catalog=JSON.parse((await get('/data/catalog.json')).body);
  assert.equal(catalog.releaseId,manifest.integration.releaseId);
  assert.equal(catalog.entries?.length,1,'only one signed B1 published lesson');
  for(const p of ['/.git/config','/content/private/review.json','/config/private.json','/data/lessons/unknown/en/B1-r1.json','/a-missing-page-e114']){
    const r=await get(p);
    assert.equal(r.status,404,'private paths must stay inaccessible: '+p);
  }
  console.log('E114_STRICT_LIVE_V092_PASS '+JSON.stringify({
    version:manifest.version,releaseId:catalog.releaseId,publicOrigin:origin,
    files:allServed.length,negativeRoutes:5,byteDigests:'19_OF_19_VERIFIED',
    zipHashSigned:'eeca610e36ea3f11366297728af39510ee9541f8960de72c444ea6683a8f84c0',
    cannotConclude:'ZIP SHA derived from owner-provided signed artifact; HTTP confirms all served member bytes but does not independently prove unserved Cloudflare _headers configuration file'
  }));
});
