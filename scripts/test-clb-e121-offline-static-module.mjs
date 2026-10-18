import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=async p=>readFile(new URL('../'+p,import.meta.url),'utf8');
const app=await read('src/app.js'),build=await read('scripts/build.mjs');
test('E121 portal imports an isolated Conversation Lab router but service worker always precaches it',()=>{
 assert.match(app,/import\s+\{\s*studioPortalDestination\s*\}\s+from\s+["']\.\/integration\/conversation-lab\/portal-route\.js["']/);
 const required=build.split('const requiredCacheFiles = [')[1]?.split('];')[0];
 const optional=build.split('const offlineEssentialAssets = new Set([')[1]?.split(']);')[0];
 assert.ok(required,'missing SW required precache');
 assert.ok(required.includes('"./app.js"'));
 assert.ok(required.includes('"./integration/conversation-lab/portal-route.js"'),'CLB router is a top-level import of app.js, not a lazy optional asset');
 assert.ok(!optional?.includes('"./integration/conversation-lab/portal-route.js"'),'this module must NOT rely on optional lazy cache');
 assert.equal((required.match(/"\.\/integration\/conversation-lab\/portal-route\.js"/g)||[]).length,1);
});
test('E121 only signed external teacher launcher can run protected CLB entry, not direct public portal bypass',async()=>{
 const route=await read('src/integration/conversation-lab/portal-route.js');
 const launcher=await read('src/app/external/launcher.js');
 assert.match(route,/app\/external/);
 assert.match(launcher,/assertClbSignedTrainingPolicy/);
 assert.match(launcher,/checkedConversationLabTarget/);
 assert.match(launcher,/hasAppAccess/);
});
