#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const file=path.resolve(process.argv[2]||"dist/studio-manifest.json");
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));
const consumer=JSON.parse(fs.readFileSync("ghrab-platform.consumer.json","utf8"));
const m=JSON.parse(fs.readFileSync(file,"utf8"));
const errors=[];
const req=(ok,label)=>{if(!ok)errors.push(label)};
req(m.schema==="ai-studio-release-manifest-v1","schema");
req(m.id==="ai-studio","id");
req(m.version===pkg.version,"version");
req(String(m.repository||"").toLowerCase()==="daniel22-dev/ai-studio-ghrab","repository");
req(/^https:\/\//.test(String(m.launchUrl||"")),"launchUrl");
req(m.platform?.contract===consumer.platform.contract,"platform.contract");
req(m.platform?.version===consumer.platform.version,"platform.version");
req(m.platform?.requiredRange===consumer.platform.requiredRange,"platform.requiredRange");
req(m.studioBridge?.contract===consumer.bridge.contract,"studioBridge.contract");
req(m.artifact?.schema===consumer.artifact.schema,"artifact.schema");
req(m.cache?.name===consumer.cache.name,"cache.name");
req(m.releaseIdentity?.contract==="ghrab-release-integrity-v2","releaseIdentity.contract");
req(m.releaseIdentity?.url==="./release-integrity.json","releaseIdentity.url");
if(errors.length){console.error(JSON.stringify({status:"FAIL",errors},null,2));process.exit(1)}
console.log(JSON.stringify({status:"PASS",appId:m.id,version:m.version,platformVersion:m.platform.version},null,2));
