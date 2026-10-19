import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import profile from '../src/conversation-lab/release-profile.js';
import {checkedConversationLabMasterTarget} from '../src/integration/conversation-lab/teacher-launch.js';

const root=new URL('../',import.meta.url);
const teacherRoot=new URL('src/conversation-lab/',root);
const controlUrl=new URL('src/integration/conversation-lab/launch-control.v0.11.0.json',root);
const readJson=async url=>JSON.parse(await readFile(url,'utf8'));
const control=await readJson(controlUrl);
const apps=await readJson(new URL('src/config/apps.generated.json',root));
const stagedFiles=[
  'assets/apps/conversation-lab.svg','assets/catalog.css','assets/integration.css',
  'index.html','release-profile.js','teacher-entry.js'
];
async function fileInventory(directory,prefix=''){
  const entries=await readdir(directory,{withFileTypes:true});
  const nested=await Promise.all(entries.map(entry=>entry.isDirectory()?
    fileInventory(new URL(entry.name+'/',directory),prefix+entry.name+'/'):
    entry.isFile()?[prefix+entry.name]:[]));
  return nested.flat().sort();
}

test('The public staged teacher tree contains only the bootstrap shell, with no unapproved MASTER runtime or lesson data',async()=>{
  assert.deepEqual(await fileInventory(teacherRoot),stagedFiles);
  const html=await readFile(new URL('index.html',teacherRoot),'utf8');
  for(const match of html.matchAll(/(?:src|href)="(\.\/[^\"]+)"/g)){
    const target=new URL(match[1],teacherRoot);
    assert.ok(stagedFiles.includes(target.pathname.slice(teacherRoot.pathname.length)),`Bootstrap dependency must exist in staged tree: ${match[1]}`);
  }
});

test('Staged candidate metadata and launch control make no new owner or production authorization claim',()=>{
  assert.equal(profile.appVersion,'0.11.0');
  assert.equal(profile.releaseId,'cl-master-72-20261019-r1');
  assert.equal(profile.signedReleaseStatementSha256,null);
  assert.equal(profile.approvedLessonCount,72);
  assert.equal(profile.approvedLessonIds.length,72);
  assert.equal(control.stage,'PRELIVE_HOLD');
  assert.equal(control.launchEnabled,false);
  assert.equal(control.appVersion,profile.appVersion);
  assert.equal(control.releaseId,profile.releaseId);
  assert.equal(control.approvedLessons,0);
  assert.equal(control.signedReleaseStatementSha256,null);
  assert.equal(control.approvedDistributionManifestSha256,null);
  assert.equal(control.publicStudioManifestSha256,null);
  assert.equal(control.ownerReleaseAuthorization,'NOT_GRANTED');
  assert.equal(control.publicRelease,'NO_GO');
  assert.equal(control.publicClientLive,'NOT_TESTED');
  assert.equal(control.studioCredentialBridge,'FORBIDDEN');
  assert.equal(control.autoPromotion,'DISABLED');
  assert.equal(control.crossRepositoryDispatch,'DISABLED');
});

test('Actual staged HOLD stops after its own control request, including when a syntactically valid digest is injected for the test',async()=>{
  for(const signedDigest of [null,'f'.repeat(64)]){
    // Syntax-only test metadata; no receipt or owner signature is generated.
    const testProfile={...profile,signedReleaseStatementSha256:signedDigest};
    const legacy=apps.find(app=>app.id==='conversation-lab');
    const app={...legacy,version:'0.11.0',integration:{...legacy.integration,
      launchMode:'studio-teacher',releaseId:profile.releaseId,
      manifestSha256:profile.publicCatalogSha256,signedStatementSha256:signedDigest
    }};
    const seen=[];
    await assert.rejects(()=>checkedConversationLabMasterTarget(app,{
      studioOrigin:'https://daniel22-dev.github.io',releaseProfile:testProfile,
      fetchImpl:async(url,options)=>{
        seen.push(url);
        assert.equal(url,controlUrl.href,'HOLD must not request a missing owner receipt or any content');
        assert.deepEqual(options,{method:'GET',credentials:'same-origin',cache:'no-store',redirect:'error'});
        return {ok:true,redirected:false,json:async()=>control};
      },
      cryptoImpl:{subtle:{verify(){assert.fail('HOLD must exit before cryptographic verification');}}}
    }),signedDigest===null?/CLB_E9_MASTER_RELEASE_PROFILE_NOT_SIGNED_READY/:/CLB_E9_MASTER_RELEASE_NOT_AUTHORIZED/);
    assert.deepEqual(seen,[controlUrl.href]);
  }
});

test('Both staged stylesheets match the integrity hashes in the exact teacher shell',async()=>{
  const html=await readFile(new URL('index.html',teacherRoot),'utf8');
  const links=[...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*integrity="sha256-([^"]+)"[^>]*>/g)];
  assert.equal(links.length,2);
  for(const [,relative,expected] of links){
    const bytes=await readFile(new URL(relative,teacherRoot));
    assert.equal(createHash('sha256').update(bytes).digest('base64'),expected,relative);
  }
});
