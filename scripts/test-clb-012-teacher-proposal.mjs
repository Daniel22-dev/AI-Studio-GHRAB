import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,mkdtemp,rm,copyFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const SOURCE=new URL('../src/conversation-lab/teacher-entry-012-proposal.js',import.meta.url);
const PAGE='https://daniel22-dev.github.io/AI-Studio-GHRAB/conversation-lab/';
const MODULE=PAGE+'teacher-entry.js';
const profile012={appId:'conversation-lab',appVersion:'0.12.0'};
function context(patch={}){
 return {pageHref:PAGE,moduleHref:MODULE,documentBase:PAGE,topLevel:true,...patch};
}
function access(events,patch={}){
 return {async initialiseAccess(){events.push('init');},
   requiredTraining(id){events.push('training '+id);return {trainingRequired:true,trainingCode:'CLB-01'};},
   assertClbSignedTrainingPolicy(p){events.push('assert signed CLB-01');
     assert.equal(p.trainingCode,'CLB-01');},
   hasAppAccess(id){events.push('permit '+id);return {enabled:true};},...patch};
}
async function importProposed(){
 const base=await mkdtemp(join(tmpdir(),'clb-r4c10-studio-'));
 const loc=join(base,'src','conversation-lab');
 await mkdir(loc,{recursive:true});
 await mkdir(join(base,'src','access'),{recursive:true});
 await mkdir(join(base,'src','integration','conversation-lab'),{recursive:true});
 await writeFile(join(base,'package.json'),'{"type":"module"}\n');
 await copyFile(SOURCE,join(loc,'teacher-entry.js'));
 await writeFile(join(base,'src','access','access-control.js'),
   'export const initialiseAccess=async()=>{}; export const hasAppAccess=()=>({enabled:true}); export const requiredTraining=()=>({trainingCode:"CLB-01"});\n');
 await writeFile(join(base,'src','integration','conversation-lab','teacher-launch.js'),
   'export function assertClbSignedTrainingPolicy(x){if(x.trainingCode!=="CLB-01")throw Error("INVALID");}\n');
 await writeFile(join(loc,'release-profile.js'),'export default {appId:"conversation-lab",appVersion:"0.11.0"};\n');
 const api=await import(pathToFileURL(join(loc,'teacher-entry.js')).href);
 return {api,base,clean:()=>rm(base,{recursive:true,force:true})};
}
test('proposal imports native Studio access, never a Cloudflare launcher',async()=>{
 const source=await readFile(SOURCE,'utf8');
 assert.match(source,/import \{initialiseAccess,hasAppAccess,requiredTraining\}/);
 assert.match(source,/assertClbSignedTrainingPolicy/);
 assert.ok(!source.includes('fetch('));
 assert.ok(!source.includes('localStorage'));
 assert.ok(!source.includes('innerHTML'));
 assert.ok(!source.includes('postMessage('));
 assert.ok(!source.includes('__clbStartPlayer'));
});
test('Studio teacher native module can be parsed/imported from proposed Studio path',async()=>{
 const f=await importProposed();try{
   assert.equal(typeof f.api.inspectTeacher012Proposal,'function');
   assert.equal(typeof f.api.inspectNativeTeacher012,'function');
 }finally{await f.clean();}
});
test('signed training always executes before signed teacher permit',async()=>{
 const f=await importProposed(),events=[];
 try{
   await assert.rejects(f.api.inspectTeacher012Proposal(context(),access(events),profile012),
     /OWNER_V3_P5_E9_RELEASE_REQUIRED/);
   assert.deepEqual(events,['init','training conversation-lab',
     'assert signed CLB-01','permit conversation-lab']);
 }finally{await f.clean();}
});
test('present Studio 0.11 profile cannot impersonate a 0.12 signed release',async()=>{
 const f=await importProposed(),events=[];
 try{
   await assert.rejects(f.api.inspectTeacher012Proposal(context(),access(events),
     {appId:'conversation-lab',appVersion:'0.11.0'}),/OWNER_012_PROFILE_NOT_INSTALLED/);
   assert.equal(events.at(-1),'permit conversation-lab');
 }finally{await f.clean();}
});
test('invalid signed training blocks access before permit evaluation',async()=>{
 const f=await importProposed(),events=[];
 try{
   await assert.rejects(f.api.inspectTeacher012Proposal(context(),access(events,{
     assertClbSignedTrainingPolicy(){events.push('signed denied');throw Error('CLB-01_MISSING');}
   }),profile012),/CLB-01_MISSING/);
   assert.deepEqual(events,['init','training conversation-lab','signed denied']);
 }finally{await f.clean();}
});
test('Studio teacher permission disabled prevents future 0.12 inspection',async()=>{
 const f=await importProposed(),events=[];
 try{
   await assert.rejects(f.api.inspectTeacher012Proposal(context(),access(events,{
     hasAppAccess(id){events.push('permit '+id);return {enabled:false};}
   }),profile012),/SIGNED_TEACHER_PERMIT_REQUIRED/);
 }finally{await f.clean();}
});
test('all origin, iframe, token, path and module tampering fail before access',async()=>{
 const f=await importProposed();try{
   for(const patched of [{topLevel:false},{pageHref:'https://evil.example/'},
     {pageHref:PAGE+'?token=secret'},{pageHref:PAGE+'#/forged'},
     {pageHref:PAGE+'#/l/artificial-intelligence/de/A2/s/s09'},
     {pageHref:'http://daniel22-dev.github.io/AI-Studio-GHRAB/conversation-lab/'},
     {moduleHref:PAGE+'evil.js'},
     {moduleHref:MODULE+'?token=secret'},
     {documentBase:'https://evil.example/'},
     {documentBase:PAGE+'?code=private'}]){
     const events=[];
     await assert.rejects(f.api.inspectTeacher012Proposal(context(patched),
       access(events),profile012),/CLB_R4C10_TEACHER_/);
     assert.deepEqual(events,[]);
   }
 }finally{await f.clean();}
});
test('all possible caller-supplied approval flags cannot unlock teacher 0.12',async()=>{
 const f=await importProposed();try{
   for(const flags of [{canDeploy:true,ownerV3Signed:true,independentP5Approved:true},
                       {enableNewLessons:true,override:true},
                       {studioRelease:'GO',signedTraining:true}]){
     const events=[];
     await assert.rejects(f.api.inspectTeacher012Proposal(context(flags),
       access(events),{...profile012,...flags}),/OWNER_V3_P5_E9_RELEASE_REQUIRED/);
   }
 }finally{await f.clean();}
});
test('proper existing Studio entry path supports canonical route fragments only',async()=>{
 const f=await importProposed();try{
   const events=[];
   await assert.rejects(f.api.inspectTeacher012Proposal(context({
     pageHref:PAGE+'#/l/summer-holidays/es/C2/s/s08'}),access(events),profile012),
     /OWNER_V3_P5_E9_RELEASE_REQUIRED/);
   assert.equal(events.length,4);
 }finally{await f.clean();}
});
test('native wrapper will NOT run as detached CLB module or with absent browser',async()=>{
 const f=await importProposed();try{
   await assert.rejects(f.api.inspectNativeTeacher012(),/CLB_R4C10_TEACHER_/);
 }finally{await f.clean();}
});
