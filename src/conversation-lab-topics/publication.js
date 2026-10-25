/** Conversation Lab publication handoff. Draft data ONLY; NEVER a signed release. */
(function(global){
 'use strict';
 const SCHEMA='ghrab-clb-publication-draft-v1';
 const MAX_TOTAL=65_000_000;
 const PATH=/^topics\/([a-z0-9]+(?:-[a-z0-9]+)*)\.json$/;
 const SHA=/^[a-f0-9]{64}$/;
 const safe=(v)=>v&&typeof v==='object'&&!Array.isArray(v);
 const fail=c=>{throw new Error('CLB_PUBLICATION_'+c)};
 function requireThat(condition,code){if(!condition)fail(code)}
 function canonical(value){
  if(value===null)return 'null';
  if(typeof value==='string')return JSON.stringify(value);
  if(typeof value==='number'){requireThat(Number.isFinite(value),'NUMBER');return JSON.stringify(value)}
  if(typeof value==='boolean')return value?'true':'false';
  if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
  requireThat(safe(value),'VALUE');
  const keys=Object.keys(value).sort();
  requireThat(keys.every(k=>!['__proto__','prototype','constructor'].includes(k)),'DANGEROUS_KEY');
  return '{'+keys.map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';
 }
 const topicName=id=>'topics/'+id+'.json';
 const digest=async data=>{
  requireThat(global.crypto?.subtle&&typeof global.TextEncoder==='function','WEBCRYPTO_REQUIRED');
  const bytes=new global.TextEncoder().encode(data);
  const raw=await global.crypto.subtle.digest('SHA-256',bytes);
  return Array.from(new Uint8Array(raw),b=>b.toString(16).padStart(2,'0')).join('');
 };
 const fields=(object,names)=>safe(object)&&Object.keys(object).length===names.length&&names.every(k=>Object.hasOwn(object,k));
 const RECORD=['id','fileName','content','glossary'];
 const ROW=['id','path','sha256','title','variantCount','questionCount'];
 const ROOT=['schema','state','canDeploy','topicCount','variantCount','questionCount','topics','files'];
 async function makeDraft(records,validateRecord,hash=digest){
  requireThat(Array.isArray(records)&&records.length>0&&records.length<=250,'SELECTION');
  requireThat(typeof validateRecord==='function'&&typeof hash==='function','FUNCTIONS');
  const files=Object.create(null),topics=[],ids=new Set();let totalSize=0;
  for(const item of [...records].sort((a,b)=>String(a.id).localeCompare(String(b.id),'en'))){
   const rec=validateRecord(item);
   const id=rec.id;
   requireThat(typeof id==='string'&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)&&id.length<=100&&!ids.has(id),'TOPIC_ID');
   ids.add(id);
   // No import timestamp, fingerprint, author identifiers, credentials or executable HTML.
   const publicRecord={id,fileName:rec.fileName,content:rec.content,glossary:rec.glossary};
   const path=topicName(id),body=canonical(publicRecord)+'\n';
   totalSize+=body.length;requireThat(totalSize<=MAX_TOTAL,'TOTAL_SIZE');
   const sha=await hash(body);
   requireThat(SHA.test(sha),'TOPIC_DIGEST');
   files[path]=body;
   topics.push({id,path,sha256:sha,title:rec.title,
     variantCount:rec.variantCount,questionCount:rec.questionCount});
  }
  const total=topics.reduce((a,t)=>a+t.variantCount,0),questions=topics.reduce((a,t)=>a+t.questionCount,0);
  return {schema:SCHEMA,state:'PRIVATE_AUTHOR_REVIEW_PENDING',canDeploy:false,
   topicCount:topics.length,variantCount:total,questionCount:questions,topics,files};
 }
 async function inspectDraft(draft,validateRecord,hash=digest){
  requireThat(fields(draft,ROOT)&&draft.schema===SCHEMA&&
   draft.state==='PRIVATE_AUTHOR_REVIEW_PENDING'&&draft.canDeploy===false&&
   Array.isArray(draft.topics)&&draft.topics.length>=1&&draft.topics.length<=250&&
   safe(draft.files),'DRAFT_NOT_PUBLIC_AUTHORITY');
  requireThat(Object.keys(draft.files).length===draft.topics.length&&
   draft.topicCount===draft.topics.length,'TOPIC_SET');
  let variants=0,questions=0,totalSize=0;const ids=new Set(),paths=new Set();
  for(const row of draft.topics){
   requireThat(fields(row,ROW)&&typeof row.id==='string'&&
    row.path===topicName(row.id)&&PATH.test(row.path)&&
    SHA.test(row.sha256)&&!ids.has(row.id)&&!paths.has(row.path),'TOPIC_ROW');
   ids.add(row.id);paths.add(row.path);
   const raw=draft.files[row.path];
   requireThat(typeof raw==='string'&&raw.length<=4_000_000&&
    (await hash(raw))===row.sha256,'CONTENT_SHA');
   totalSize+=raw.length;requireThat(totalSize<=MAX_TOTAL,'TOTAL_SIZE');
   let parsed;try{parsed=JSON.parse(raw)}catch{fail('CONTENT_JSON')}
   requireThat(fields(parsed,RECORD)&&parsed.id===row.id&&
    canonical(parsed)+'\n'===raw,'CANONICAL_CONTENT');
   const rec=validateRecord(parsed);
   requireThat(rec.title===row.title&&rec.variantCount===row.variantCount&&
    rec.questionCount===row.questionCount,'CONTENT_STATS');
   variants+=rec.variantCount;questions+=rec.questionCount;
  }
  requireThat(Object.keys(draft.files).every(p=>paths.has(p))&&
    draft.variantCount===variants&&draft.questionCount===questions,'TOTALS');
  return Object.freeze({topicCount:ids.size,variantCount:variants,questionCount:questions,
   canDeploy:false,canApprove:false});
 }
 const api=Object.freeze({SCHEMA,canonical,makeDraft,inspectDraft});
 if(typeof module==='object'&&module.exports)module.exports=api;
 global.CLBPublication=api;
})(typeof globalThis!=='undefined'?globalThis:this);
