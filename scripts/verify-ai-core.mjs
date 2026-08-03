import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const registry=JSON.parse(await readFile(path.join(root,"src/config/ai-core.json"),"utf8"));
if(registry.schema!=="ghrab-ai-studio-core-registry-v1")throw new Error("Neplatný AI Core registry");
const r=registry.activeRelease,dir=path.join(root,"src",r.releasePath),manifest=JSON.parse(await readFile(path.join(root,"src",r.manifestUrl),"utf8"));
if(manifest.schema!=="ghrab-ai-core-release-v1"||manifest.coreVersion!==r.coreVersion||String(manifest.contractVersion)!==String(r.contractVersion))throw new Error("Core release manifest nesouhlasí s registry");
for(const [file,meta] of Object.entries(r.artifacts)){const actual=createHash("sha256").update(await readFile(path.join(dir,file))).digest("hex");const expected=meta.sha256||manifest.artifacts?.[file]?.sha256;if(!expected||actual!==expected)throw new Error(`SHA-256 nesouhlasí pro ${file}`);}
const core=await readFile(path.join(root,"src",r.coreUrl),"utf8");if(!core.includes(`const CORE_VERSION = "${r.coreVersion}"`)&&!core.includes(`const CORE_VERSION="${r.coreVersion}"`)&&!core.includes(`coreVersion:"${r.coreVersion}"`)&&!core.includes(`coreVersion: "${r.coreVersion}"`))throw new Error("Core soubor neuvádí očekávanou verzi");
console.log(`GHRAB AI Core ${r.coreVersion} ověřen: verze, manifest a SHA-256 souhlasí.`);
