const {test}=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const pub=require('../src/conversation-lab-topics/publication.js');
const hash=async text=>crypto.createHash('sha256').update(text,'utf8').digest('hex');
function makeRecord(id='rodina',language='en'){
 const station=()=>({title:'Discuss family',subtitle:'In pairs',main:'What is important?',
  questions:['Why?','How?','What else?'],support:['In my view','For example','However'],
  challenge:'Compare opinions',stretch:'Justify your answer'});
 const record={id,fileName:id+'.html',title:'Family',variantCount:1,questionCount:32,
  content:{[language]:{ui:{title:'Family'},levels:{B2:{warm:'Discuss',stations:Array.from({length:8},station),
   vocab:Array.from({length:12},(_,i)=>['Word '+i,'Translation '+i]),
   toolkit:Array.from({length:4},(_,i)=>['Phrase '+i,'Translation '+i])}}}},glossary:{},
  importedAt:'2026-10-25T00:00:00Z',fingerprint:'abcde1234567890',
  sourceMasterSha256:'a'.repeat(64)};
 return record;
}
const validate=r=>{
 if(!r?.content||!r?.id||!/^[a-z0-9-]+$/.test(r.id))throw Error('INVALID_RECORD');
 const variants=Object.values(r.content).reduce((n,l)=>n+Object.keys(l.levels).length,0);
 return {...r,title:Object.values(r.content)[0].ui.title,variantCount:variants,questionCount:variants*32,glossary:r.glossary||{}};
};
const draft=(items=[makeRecord()])=>pub.makeDraft(items,validate,hash);
test('draft has correct private-only schema and SHA-256 digest',async()=>{
 const data=await draft();assert.equal(data.state,'PRIVATE_AUTHOR_REVIEW_PENDING');
 assert.equal(data.canDeploy,false);assert.equal(data.topicCount,1);
 assert.equal(data.files['topics/rodina.json'].startsWith('{'),true);
 assert.equal(data.topics[0].sha256,await hash(data.files['topics/rodina.json']));
 assert.deepEqual((await pub.inspectDraft(data,validate,hash)).topicCount,1);
});
test('no importedAt, fingerprint, credential or executable source HTML exported',async()=>{
 const data=await draft();const raw=data.files['topics/rodina.json'];
 assert.doesNotMatch(raw,/importedAt|fingerprint|const CONTENT|<script|teacherAccess/);
 assert.equal(Object.keys(JSON.parse(raw)).length,5);
 assert.equal(JSON.parse(raw).sourceMasterSha256,'a'.repeat(64));
});
test('deterministic sort and canonical content irrespective of import order',async()=>{
 const a=await draft([makeRecord('skola'),makeRecord('rodina')]);
 const b=await draft([makeRecord('rodina'),makeRecord('skola')]);
 assert.deepEqual(a,b);assert.deepEqual(a.topics.map(t=>t.id),['rodina','skola']);
});
test('two variant/language records aggregate stats',async()=>{
 const a=makeRecord();a.content.es=structuredClone(a.content.en);
 const x=await draft([a]);const q=await pub.inspectDraft(x,validate,hash);
 assert.equal(q.variantCount,2);assert.equal(q.questionCount,64);
});
test('tampered data is rejected before publication',async()=>{
 const x=await draft();x.files['topics/rodina.json']=x.files['topics/rodina.json'].replace('Discuss','Inject');
 await assert.rejects(pub.inspectDraft(x,validate,hash),/CONTENT_SHA/);
});
test('catalog SHA spoof cannot hide malformed json',async()=>{
 const x=await draft();x.files['topics/rodina.json']='{"id":"rodina"}\n';x.topics[0].sha256=await hash(x.files['topics/rodina.json']);
 await assert.rejects(pub.inspectDraft(x,validate,hash),/CANONICAL_CONTENT/);
});
test('duplicate topic IDs reject',async()=>await assert.rejects(draft([makeRecord(),makeRecord()]),/TOPIC_ID/));
test('forged deployment approval rejects',async()=>{
 for(const [k,v] of [['state','SIGNED'],['canDeploy',true],['approved',true]]){
  const x=await draft();x[k]=v;await assert.rejects(pub.inspectDraft(x,validate,hash),/DRAFT_NOT_PUBLIC_AUTHORITY/);
 }
});
test('path traversal and foreign data paths reject',async()=>{
 for(const path of ['../secret.json','topics/../../secret.json','https://evil.example/topic.json']){
  const x=await draft();x.topics[0].path=path;
  await assert.rejects(pub.inspectDraft(x,validate,hash),/TOPIC_ROW/);
 }
});
test('stray files reject',async()=>{
 const x=await draft();x.files['topics/private.json']='private';
 await assert.rejects(pub.inspectDraft(x,validate,hash),/TOPIC_SET/);
});
test('fake variant count rejects',async()=>{
 const x=await draft();x.topics[0].variantCount=24;
 await assert.rejects(pub.inspectDraft(x,validate,hash),/CONTENT_STATS/);
});
test('dangerous JSON keys reject',()=>{
 const x=Object.create(null);x['__proto__']='x';assert.throws(()=>pub.canonical(x),/DANGEROUS_KEY/);
});
test('invalid digest from caller rejects',async()=>{
 await assert.rejects(pub.makeDraft([makeRecord()],validate,async()=> 'ok'),/TOPIC_DIGEST/);
});
test('missing WebCrypto rejects (no weak crypto fallback)',async()=>{
 await assert.rejects(pub.makeDraft([makeRecord()],validate,async()=>{throw Error('WEBCRYPTO_OFF')}),/WEBCRYPTO_OFF/);
});
test('missing authentic source SHA-256 refuses export',async()=>{
 const x=makeRecord();delete x.sourceMasterSha256;
 await assert.rejects(draft([x]),/SOURCE_SHA_REQUIRED/);
});
test('valid unicode is canonically preserved in json',async()=>{
 const x=makeRecord();x.content.en.levels.B2.warm='¿Qué? Vánoce 🦉';
 const d=await draft([x]);assert.match(d.files['topics/rodina.json'],/Vánoce 🦉/);
 assert.equal((await pub.inspectDraft(d,validate,hash)).canApprove,false);
});
