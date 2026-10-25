// Stage05 UAT guardrail: no network or teacher access required.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const uat=await readFile(new URL('./consumer-browser-uat.mjs',import.meta.url),'utf8');

test('teacher-enabled Chrome keeps its OS sandbox',()=>{
  assert.match(uat,/chromium\.launchPersistentContext\(manualProfile,\{[^\n]*chromiumSandbox:true/);
  const interactive=uat.match(/chromium\.launchPersistentContext\(manualProfile,\{[^\n]*/)?.[0]||'';
  assert.doesNotMatch(interactive,/--no-sandbox/);
  assert.match(uat,/MANUAL_AUTHORIZED\s*&&\s*\(process\.env\.CI\s*\|\|\s*!process\.stdin\.isTTY\)/);
});

test('synthetic source tests real Bridge v2 rather than legacy fallback',()=>{
  assert.match(uat,/createHandoffTransport\(\{bridge,validator,studioUrl:studio,apps,registry,writeLegacy:false\}\)/);
  assert.match(uat,/v2\?\.schema!=='ghrab-studio-handoff-v2'/);
  assert.match(uat,/localStorage\.getItem\('ghrab\.handoff\.v1'\)!==null/);
  assert.match(uat,/v2ConsumedAfter,v2ConsumedBefore\+1/);
  assert.match(uat,/e\.contractVersion===2&&e\.sourceAppId==='ai-studio'/);
});

test('test reports remain synthetic and do not export authenticated visuals',()=>{
  assert.match(uat,/syntheticOnly:true,results/);
  assert.doesNotMatch(uat,/page\.screenshot\s*\(/);
  assert.doesNotMatch(uat,/storageState\s*\(/);
  assert.doesNotMatch(uat,/entry\.error\s*=\s*String\(e\?\.stack/);
  assert.match(uat,/await rm\(manualProfile,\{recursive:true,force:true\}\)/);
});

test('six real consumer cases and one-time replay checks remain mandatory',()=>{
  assert.match(uat,/\['generator','differentiator','ludus'\]/);
  assert.match(uat,/\['desktop',\{width:1366,height:768\}\]/);
  assert.match(uat,/\['mobile',\{width:390,height:844\}\]/);
  assert.match(uat,/eventsAfter<=eventsBefore/);
  assert.match(uat,/results\.length!==6/);
  assert.match(uat,/AUTHORIZATION_REQUIRED/);
});
