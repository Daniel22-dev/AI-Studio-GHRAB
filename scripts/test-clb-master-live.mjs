/** Current anonymous public release, not historical pilot 0.9.2. GET only. */
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const origin='https://conversation-lab-ghrab.pages.dev';
const sha=b=>createHash('sha256').update(b).digest('hex');
const raw=await readFile('config/clb-master-public-inventory.json');
assert.equal(sha(raw),'8d1468774044361a8217af2237eb44804bf07d440c6aac459970289cdfc9e6c8');
const inv=JSON.parse(raw);
const records={...inv.files,'release-integrity.json':{sha256:sha(raw),size:raw.length}};
const headers=Object.fromEntries((await readFile('scripts/fixtures/clb-original-headers.txt','utf8')).split('\n').flatMap(line=>{const m=line.match(/^  ([^:]+): (.*)$/);return m?[[m[1].toLowerCase(),m[2]]]:[];}));
const out={schema:'ghrab-clb-master-live-studio-audit-v1',origin,checkedAt:new Date().toISOString(),status:'RUNNING',files:[],negative:[],hostingWrites:false};
async function check(name,record,status){
 const suffix=name==='index.html'?'':name==='manual/index.html'?'manual/':name;
 const r=await fetch(origin+'/'+suffix,{redirect:'error',credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(30000)});
 const b=Buffer.from(await r.arrayBuffer());assert.equal(r.status,status,name);assert.equal(b.length,record.size,name);assert.equal(sha(b),record.sha256,name);
 for(const [key,value] of Object.entries(headers))assert.equal(r.headers.get(key),value,name+':'+key);
 for(const key of ['set-cookie','access-control-allow-origin','access-control-allow-credentials'])assert.equal(r.headers.get(key),null,name+':'+key);
 return {path:name,status,sha256:sha(b),size:b.length,headersVerified:true};
}
try{
 const names=Object.keys(records).filter(n=>!['_headers','404.html'].includes(n));let cursor=0;
 await Promise.all(Array.from({length:6},async()=>{while(cursor<names.length){const n=names[cursor++];out.files.push(await check(n,records[n],200));}}));
 for(const n of ['__clb_0_11_0_missing__','.git/config','access/access-bundle.json','integration/conversation-lab/owner-content-release.v0.11.0.signed.json','data/lessons/artificial-intelligence/en/C3-r1.json','data/lessons/unapproved-topic/en/B1-r1.json'])out.negative.push(await check(n,records['404.html'],404));
 assert.equal(out.files.length,119);assert.equal(out.negative.length,6);out.status='PASS';
} catch(e){out.status='FAIL';out.error=e.stack;process.exitCode=1;}
await mkdir('qa-results/clb-master-live',{recursive:true});await writeFile('qa-results/clb-master-live/report.json',JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({status:out.status,files:out.files.length,negative:out.negative.length,error:out.error}));
