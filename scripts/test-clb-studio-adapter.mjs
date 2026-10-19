import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';
import { verifyClbMasterFiles } from './lib/clb-master-integrity.mjs';
import { expectedClbStudioTree, adaptClbStudioAsset, CLB_STUDIO_CSP, CLB_STUDIO_DOCUMENTS, CLB_STUDIO_TRANSFORMED, CLB_MASTER_FRAGMENTS, CLB_MASTER_RUNTIMES, assertClbPreferenceSource, readClbTree } from './lib/clb-studio-adapter.mjs';
const root = path.resolve('.');
const pkg = JSON.parse(await readFile('package.json'));
const source = await readClbTree(path.join(root, 'src/conversation-lab'));
const expected = await expectedClbStudioTree(root, pkg.version);

test('original signed source is unchanged; only four teacher envelope files and inventory are derived', async () => {
  assert.equal((await verifyClbMasterFiles(root, path.join(root,'src'))).preservedPublicFiles,115);
  assert.equal(expected.size,120);
  const changed = [...expected].filter(([name, bytes])=>!bytes.equals(source.get(name))).map(([name])=>name).sort();
  assert.deepEqual(changed,[...CLB_STUDIO_TRANSFORMED].sort());
  for (const name of [...CLB_MASTER_FRAGMENTS,...CLB_MASTER_RUNTIMES]) assert.ok(source.get(name).equals(expected.get(name)));
});
test('CSP precedes all fetched resources; no inline/eval or cross-origin execution is authorized', () => {
  for (const name of CLB_STUDIO_DOCUMENTS) {
    const text=expected.get(name).toString();
    assert.equal((text.match(/http-equiv="Content-Security-Policy"/g)||[]).length,1);
    assert.ok(text.includes('content="'+CLB_STUDIO_CSP+'"'));
    const head=text.indexOf('<head>'), policy=text.indexOf('http-equiv="Content-Security-Policy"');
    assert.ok(policy>head && !/<(?:script|link)\b/i.test(text.slice(head,policy)));
    assert.ok(!/unsafe-inline|unsafe-eval|frame-ancestors|sandbox|https?:/.test(CLB_STUDIO_CSP));
    assert.ok(CLB_STUDIO_CSP.includes("script-src-attr 'none'"));
    for (const match of text.matchAll(/(?:src|href)=["']([^"']+\.(?:js|css)(?:\?[^"']*)?)["']/g)) assert.ok(match[1].endsWith('?v='+pkg.version));
  }
  const entry=expected.get('teacher-entry.js').toString();
  assert.equal([...entry.matchAll(/from\s*['"][^'"]+\.js\?v=/g)].length,4);
  assert.throws(()=>adaptClbStudioAsset('index.html',source.get('index.html'),'x"><script>'),/VERSION/);
});
test('derived inventory and actual deployment reject missing CSP, altered payloads, extra files and bad revisions', async t => {
  const dir=await mkdtemp(path.join(os.tmpdir(),'clb-derived-'));
  t.after(()=>rm(dir,{recursive:true,force:true}));
  const dest=path.join(dir,'conversation-lab');
  for(const [name,bytes] of expected){await mkdir(path.dirname(path.join(dest,name)),{recursive:true});await writeFile(path.join(dest,name),bytes);}
  assert.equal((await verifyClbMasterFiles(root,dir)).preservedPublicFiles,114);
  for(const name of ['index.html','teacher-entry.js','teacher-integrity.json',CLB_MASTER_FRAGMENTS[0],CLB_MASTER_RUNTIMES[0],'data/catalog.json']) {
    await writeFile(path.join(dest,name),source.get(name).equals(expected.get(name))?Buffer.concat([expected.get(name),Buffer.from('\n')]):source.get(name));
    await assert.rejects(verifyClbMasterFiles(root,dir),/DEPLOYED_ENVELOPE_OR_PAYLOAD/);
    await writeFile(path.join(dest,name),expected.get(name));
  }
  await writeFile(path.join(dest,'unreviewed.js'),'void 0;');
  await assert.rejects(verifyClbMasterFiles(root,dir),/DEPLOYED_FILE_SET/);
});
test('legacy preference IO is restricted to four nonpersonal fields and survives blocked storage', () => {
  for(const name of CLB_MASTER_RUNTIMES) {
    const bytes=source.get(name);assert.equal(assertClbPreferenceSource(name,bytes),true);
    const text=bytes.toString();
    const save=text.match(/^function savePrefs\(\)\{.*$/m)?.[0];
    const load=text.match(/^function loadPrefs\(\)\{.*$/m)?.[0];
    assert.ok(save&&load);
    const writes=[];
    const ctx=vm.createContext({STORAGE:'conversation-lab-qa-v1',lang:'en',level:'B2',theme:'dark',current:2,CONTENT:{en:{}},ORDER:['A1','A2','B1','B2','C1','C2'],clbNotify:()=>{},localStorage:{setItem:(k,v)=>writes.push({k,v}),getItem:()=>'{"lang":"bad","level":"C9","theme":"other","current":9,"token":"SYNTHETIC_IGNORED"}'}});
    vm.runInContext(save+'\n'+load+'\nsavePrefs();loadPrefs();',ctx);
    assert.deepEqual(JSON.parse(writes[0].v),{lang:'en',level:'B2',theme:'dark',current:2});
    assert.equal(ctx.current,2);assert.equal(ctx.lang,'en');assert.equal(ctx.level,'B2');
    ctx.localStorage={setItem(){throw Error('storage blocked');},getItem(){throw Error('storage blocked');}};
    assert.doesNotThrow(()=>vm.runInContext('savePrefs();loadPrefs();',ctx));
    assert.throws(()=>assertClbPreferenceSource(name,Buffer.from(text.replace('{lang,level,theme,current}','{lang,level,theme,current,secret}'))),/PREFERENCE_WRITE_NOT_BOUNDED/);
  }
});
