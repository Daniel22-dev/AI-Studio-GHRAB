import test from 'node:test';
import assert from 'node:assert/strict';
import { BASELINE, ONLY_EXCEPTION, LUDUS_EXCEPTION, validateWavePlatformPins, isPinnedHistoricalDifferentiatorSnapshot } from './release-wave-platform-policy.mjs';
const ids = ['generator','differentiator','essay-evaluator','correspondence','ludus',
 'activity-builder','sortio','lesson-hub','maturita-desk','conversation-lab'];
const wave=()=>({schema:'ghrab-platform-release-wave-v1',...BASELINE,status:'candidate',
 applications:ids.map(id=>id===ONLY_EXCEPTION.id?{...ONLY_EXCEPTION}:id===LUDUS_EXCEPTION.id?{...LUDUS_EXCEPTION}:{id,version:'1.0.0'}),
 policy:{requireSourceVerificationForDeploy:true,allowSnapshotForDeploy:false}});
const fail=(mutator,reason)=>{const w=wave();mutator(w);assert.throws(()=>validateWavePlatformPins(w),reason)};
test('exact independently reviewed Differentiator and LUDUS exceptions, eight untouched consumers',()=>{
 const pins=validateWavePlatformPins(wave());assert.equal(pins.size,10);
 assert.deepEqual(pins.get('differentiator'),{
  platformVersion:'1.1.3',requiredPlatformRange:'>=1.1.3 <2.0.0'});
 assert.deepEqual(pins.get('ludus'),{
  platformVersion:'1.1.3',requiredPlatformRange:'>=1.1.3 <2.0.0'});
 for(const id of ids.filter(x=>x!=='differentiator'&&x!=='ludus'))assert.deepEqual(pins.get(id),{
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
test('LUDUS E7 platform 1.1.4 rejected',()=>fail(w=>w.applications.find(x=>x.id==='ludus').platformVersion='1.1.4',/UNAUTHORIZED_LUDUS_VERSION/));
test('LUDUS rollback to 1.1.2 rejected',()=>fail(w=>w.applications.find(x=>x.id==='ludus').platformVersion='1.1.2',/UNAUTHORIZED_LUDUS_VERSION/));
test('LUDUS forged or unreviewed application version rejected',()=>fail(w=>w.applications.find(x=>x.id==='ludus').version='1.16.33',/UNAUTHORIZED_LUDUS_VERSION/));
test('LUDUS altered required Platform range rejected',()=>fail(w=>w.applications.find(x=>x.id==='ludus').requiredPlatformRange='>=1.1.2 <3.0.0',/UNAUTHORIZED_LUDUS_VERSION/));
test('LUDUS extra unsigned approval field rejected',()=>fail(w=>w.applications.find(x=>x.id==='ludus').allowUnsigned=true,/ENTRY_FIELDS_OR_DUPLICATE/));
test('LUDUS exception cannot be impersonated by another application',()=>fail(w=>w.applications.find(x=>x.id==='ludus').id='generator',/ENTRY_FIELDS_OR_DUPLICATE/));

const oldDiff=()=>({id:'differentiator',version:'1.3.51',platform:{platformVersion:'1.1.2',requiredPlatformRange:'>=1.1.2 <2.0.0'},compatibility:{platformRange:'>=1.1.2 <2.0.0'}});
test('only exact historical Differentiator pre-sync read-only snapshot may be recognized',()=>assert.equal(isPinnedHistoricalDifferentiatorSnapshot(oldDiff()),true));
test('historical marker rejects another consumer',()=>assert.equal(isPinnedHistoricalDifferentiatorSnapshot({...oldDiff(),id:'generator'}),false));
test('historical marker rejects future app versions',()=>assert.equal(isPinnedHistoricalDifferentiatorSnapshot({...oldDiff(),version:'1.3.52'}),false));
test('historical marker rejects weakened platform ranges',()=>assert.equal(isPinnedHistoricalDifferentiatorSnapshot({...oldDiff(),compatibility:{platformRange:'>=1.1.0 <3.0.0'}}),false));
test('historical marker rejects current new platform to avoid masking later errors',()=>assert.equal(isPinnedHistoricalDifferentiatorSnapshot({...oldDiff(),platform:{platformVersion:'1.1.3',requiredPlatformRange:'>=1.1.3 <2.0.0'}}),false));
