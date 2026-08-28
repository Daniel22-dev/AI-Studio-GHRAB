#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),".."),cfg=path.join(root,"src","config"),checkOnly=process.argv.includes("--check");
const read=f=>readFile(f,"utf8").then(JSON.parse);
const [pkg,studioConsumer,apps,existing]=await Promise.all([read(path.join(root,"package.json")),read(path.join(root,"ghrab-platform.consumer.json")),read(path.join(cfg,"apps.generated.json")),read(path.join(cfg,"platform-consumers.json"))]);
if(!Array.isArray(apps)||!Array.isArray(existing)) throw new Error("Registry aplikaci a platform-consumers musi byt pole.");
if(studioConsumer.appId!=="ai-studio"||studioConsumer.appVersion!==pkg.version) throw new Error("AI Studio consumer neodpovida package.json.");
const existingById=new Map(existing.map(x=>[x.id,x])),appById=new Map(apps.map(x=>[x.id,x]));
if(appById.size!==apps.length) throw new Error("apps.generated.json obsahuje duplicitni appId.");
const normBridge=v=>v===2||v==="ghrab-studio-handoff-v2"?2:v;
const normArtifact=v=>v===1||v==="ghrab-artifact-envelope-v1"?1:v;
function studioEntry(prev){if(!prev)throw new Error("platform-consumers.json nema zaznam ai-studio.");return {...prev,version:pkg.version,platform:{...prev.platform,contract:studioConsumer.platform.contract,requiredPlatformRange:studioConsumer.platform.requiredRange,brandVersion:studioConsumer.brand.version,platformVersion:studioConsumer.platform.version,storagePrefix:"ghrab.ai-studio.",studioBridge:normBridge(studioConsumer.bridge.contract),artifactEnvelope:normArtifact(studioConsumer.artifact.schema)},cacheName:studioConsumer.cache.name,theme:studioConsumer.theme};}
function appEntry(app,prev){if(!prev)throw new Error(`platform-consumers.json nema sablonu pro ${app.id}.`);const p=app.platform||{};return {...prev,name:app.name?.cs||prev.name,version:app.version,slug:app.slug||prev.slug,paths:{...prev.paths,app:app.launchUrl||app.paths?.app||prev.paths?.app,manual:app.manualUrl||app.paths?.manual||prev.paths?.manual},platform:{...prev.platform,contract:p.contract,requiredPlatformRange:p.requiredPlatformRange||app.compatibility?.platformRange||prev.platform?.requiredPlatformRange,brandVersion:p.brandVersion,themeContract:p.themeContract,swContract:p.swContract,studioBridge:normBridge(p.studioBridge),artifactEnvelope:normArtifact(p.artifactEnvelope),storagePrefix:p.storagePrefix,platformVersion:p.platformVersion},cacheName:p.cacheName};}
const out=[studioEntry(existingById.get("ai-studio"))];
for(const prev of existing.filter(x=>x.id!=="ai-studio")){const app=appById.get(prev.id);if(!app)throw new Error(`platform-consumers obsahuje neznamou aplikaci ${prev.id}.`);out.push(appEntry(app,prev));}
for(const app of apps) if(!existingById.has(app.id)) throw new Error(`apps.generated obsahuje ${app.id}, ale platform-consumers ne.`);
const text=JSON.stringify(out,null,2)+"\n",file=path.join(cfg,"platform-consumers.json"),current=await readFile(file,"utf8");
if(checkOnly){if(current!==text){console.error("platform-consumers.json je mimo synchronizaci s apps.generated.json.");process.exit(1);}console.log(`Platform consumers: PASS (${out.length} zaznamu, bez driftu).`);}else{await writeFile(file,text,"utf8");console.log(`Platform consumers: synchronizovano ${out.length} zaznamu z apps.generated.json.`);}
