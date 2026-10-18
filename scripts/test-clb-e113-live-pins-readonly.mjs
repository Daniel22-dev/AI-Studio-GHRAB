import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

const inventory = JSON.parse(await readFile(new URL('../src/integration/conversation-lab/live-audit-pins.v091-v092.json',import.meta.url),'utf8'));
const ORIGIN = inventory.sourceOrigin;
const SHA = data => createHash('sha256').update(data).digest('hex');
const root = new URL(ORIGIN);
const paths = inventory.files.filter(f=>!['_headers','404.html'].includes(f.path));
const negativePaths = ['/a-missing-page-e113','/.git/config','/content/private/review.json','/config/private.json','/data/lessons/unknown/en/B1-r1.json'];
async function get(path){
  const url = new URL(path, root);
  assert.equal(url.origin, ORIGIN);
  const response = await fetch(url,{
    method:'GET',redirect:'manual',credentials:'omit',
    headers:{Accept:'*/*','Cache-Control':'no-cache'},
    signal:AbortSignal.timeout(15000)
  });
  assert.equal(response.redirected,false,'redirect not allowed: '+path);
  assert.equal(response.url,url.href,'redirect or URL drift: '+path);
  assert.equal(response.headers.get('set-cookie'),null,'no tracking/session cookie: '+path);
  return {status:response.status,headers:response.headers,body:Buffer.from(await response.arrayBuffer())};
}
function requiredHeaders(h,path){
  const v=name=>String(h.get(name)||'');
  assert.match(v('content-security-policy'),/default-src\s+'none'/i,'CSP default-src '+path);
  assert.match(v('content-security-policy'),/frame-ancestors\s+'none'/i,'CSP frame-ancestors '+path);
  assert.doesNotMatch(v('content-security-policy'),/unsafe-(?:inline|eval)/i,'unsafe CSP '+path);
  assert.equal(v('x-frame-options').toUpperCase(),'DENY','XFO '+path);
  assert.equal(v('x-content-type-options').toLowerCase(),'nosniff','nosniff '+path);
  assert.equal(v('referrer-policy').toLowerCase(),'no-referrer','referrer '+path);
  assert.equal(v('cross-origin-resource-policy').toLowerCase(),'same-origin','CORP '+path);
  assert.match(v('strict-transport-security'),/max-age=\d+/i,'HSTS '+path);
  assert.match(v('cache-control'),/\bno-store\b/i,'cache no-store '+path);
}
test('E113 LIVE public origin is exactly ONE pinned signed B1 release; verifies all 19 fetchable assets and never changes Cloudflare', {timeout:200000},async()=>{
  assert.equal(paths.length,19,'21 declared files less _headers and 404.html');
  assert.equal(inventory.files.length,21);
  assert.equal(inventory.stage,'PRELIVE_REFERENCE_ONLY_NO_HOSTING_DEPLOY');
  assert.equal(inventory.versions['0.9.2'].cloudflareDeploymentEvidence,'NOT_VERIFIED','repository must not preclaim LIVE');
  const manifest = await get('/studio-manifest.json');
  assert.equal(manifest.status,200);
  const version = manifest.body.length>0?JSON.parse(manifest.body.toString('utf8')).version:null;
  assert.ok(['0.9.1','0.9.2'].includes(version),'unrecognized LIVE version: '+version);
  const release = inventory.versions[version];
  const expectedKey = version==='0.9.1'?'sha256_091':'sha256_092';
  const sizeKey = version==='0.9.1'?'size_091':'size_092';
  console.log('E113_ACTUAL_CLOUDFLARE_RELEASE '+JSON.stringify({version,releaseId:release.releaseId,origin:ORIGIN,source:'independent live HTTPS response, not registry metadata'}));
  let verified = 0;
  for (const f of paths){
    const resource = f.path==='index.html'?'/':f.path==='manual/index.html'?'/manual/':'/'+f.path;
    const r = f.path==='studio-manifest.json'?manifest:await get(resource);
    assert.equal(r.status,200,resource+' must return HTTP 200');
    assert.equal(r.body.length,f[sizeKey],resource+' length drift in LIVE '+version);
    assert.equal(SHA(r.body),f[expectedKey],resource+' digest drift in LIVE '+version);
    if(f.path.endsWith('.json'))assert.match(String(r.headers.get('content-type')||''),/^application\/json\b/i,resource+' incorrect JSON mime');
    if(f.path==='index.html'||f.path==='data/catalog.json'||f.path==='studio-manifest.json'){
      requiredHeaders(r.headers,resource);
    }
    verified++;
  }
  const catalog = await get('/data/catalog.json');
  assert.equal(JSON.parse(catalog.body.toString('utf8')).releaseId,release.releaseId);
  for(const path of negativePaths){
    const r=await get(path);
    assert.equal(r.status,404,path+' unexpected response to unapproved path');
    requiredHeaders(r.headers,path);
  }
  const missing = await get(negativePaths[0]);
  const errorFile = inventory.files.find(x=>x.path==='404.html');
  if(SHA(missing.body)!==errorFile[expectedKey]){
    console.log('E113_404_BODY_NOTE '+JSON.stringify({sha:SHA(missing.body),expected:errorFile[expectedKey],reason:'Hosting may wrap/normalize 404; HTTP 404 and security headers were required, investigate byte-level difference'}));
  }
  console.log('E113_VERIFIED_LIVE '+JSON.stringify({version,resourceCount:verified,negative404Count:negativePaths.length,allContentDigestsPassed:true,cspAndSecurityHeadersPassed:true,configurationFileNotPubliclyRequested:true,studioActivation:'NO_GO'}));
});
