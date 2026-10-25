import test from 'node:test';
import assert from 'node:assert/strict';
import { BASELINE, ONLY_EXCEPTION, validateWavePlatformPins } from './release-wave-platform-policy.mjs';
const ids = ['generator','differentiator','essay-evaluator','correspondence','ludus',
 'activity-builder','sortio','lesson-hub','maturita-desk','conversation-lab'];
const wave=()=>({schema:'ghrab-platform-release-wave-v1',...BASELINE,status:'candidate',
 applications:ids.map(id=>id===ONLY_EXCEPTION.id?{...ONLY_EXCEPTION}:{id,version:'1.0.0'}),
 policy:{requireSourceVerificationForDeploy:true,allowSnapshotForDeploy:false}});
const fail=(mutator,reason)=>{const w=wave();mutator(w);assert.throws(()=>validateWavePlatformPins(w),reason)};
test('exact source-verified Differentiator exception and nine untouched consumers',()=>{
 const pins=validateWavePlatformPins(wave());assert.equal(pins.size,10);
 assert.deepEqual(pins.get('differentiator'),{
  platformVersion:'1.1.3',requiredPlatformRange:'>=1.1.3 <2.0.0'});
 for(const id of ids.filter(x=>x!=='differentiator'))assert.deepEqual(pins.get(id),{
  platformVersion:'1.1.2',requiredPlatformRange:'>=1.1.2 <2.0.0'});
});
test('no unreviewed 1.1.4',()=>fail(w=>w.applications[1].platformVersion='1.1.4',/UNAUTHORIZED_DIFFERENTIATOR_VERSION/));
test('no downgraded 1.1.2',()=>fail(w=>w.applications[1].platformVersion='1.1.2',/UNAUTHORIZED_DIFFERENTIATOR_VERSION/));
test('no unreviewed source app version',()=>fail(w=>w.applications[1].version='1.3.52',/UNAUTHORIZED_DIFFERENTIATOR_VERSION/));
test('no source range relaxation',()=>fail(w=>w.applications[1].requiredPlatformRange='>=1.1.0 <3.0.0',/UNAUTHORIZED_DIFFERENTIATOR_VERSION/));
test('no app-level override for unrelated apps',()=>fail(w=>w.applications[0].platformVersion='1.1.3',/ENTRY_FIELDS_OR_DUPLICATE/));
test('no hidden deployment override key',()=>fail(w=>w.applications[1].allowUnsigned=true,/ENTRY_FIELDS_OR_DUPLICATE/));
test('no duplicate app ID',()=>fail(w=>w.applications[2].id='generator',/ENTRY_FIELDS_OR_DUPLICATE/));
test('no changed baseline wave',()=>fail(w=>w.platformVersion='1.1.3',/BASELINE_OR_SOURCE_POLICY/));
test('no snapshots accepted',()=>fail(w=>w.policy.allowSnapshotForDeploy=true,/BASELINE_OR_SOURCE_POLICY/));
test('no source verification disabled',()=>fail(w=>w.policy.requireSourceVerificationForDeploy=false,/BASELINE_OR_SOURCE_POLICY/));
test('no missing differentiator',()=>fail(w=>w.applications[1].id='another',/ENTRY_FIELDS_OR_DUPLICATE/));
test('no missing application',()=>fail(w=>w.applications.pop(),/BASELINE_OR_SOURCE_POLICY/));
