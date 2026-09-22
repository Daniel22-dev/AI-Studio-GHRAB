#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const out = path.resolve(process.argv[2] || "dist/sbom.cdx.json");
const pkg = JSON.parse(fs.readFileSync("package.json","utf8"));
const lock = JSON.parse(fs.readFileSync("package-lock.json","utf8"));
const components = [];
for (const [key, entry] of Object.entries(lock.packages || {})) {
  if (!key || !key.startsWith("node_modules/") || !entry?.version) continue;
  const name = key.slice("node_modules/".length);
  const component = { type:"library", name, version:String(entry.version), "bom-ref":`pkg:npm/${name}@${entry.version}` };
  if (entry.integrity) component.hashes=[{alg:"SHA-512",content:String(entry.integrity).replace(/^sha512-/,"")}];
  components.push(component);
}
components.sort((a,b)=>a.name.localeCompare(b.name,"en"));
const serial = JSON.stringify(components);
const bom = {
  bomFormat:"CycloneDX", specVersion:"1.5", serialNumber:`urn:uuid:${crypto.createHash("sha256").update(pkg.name+"@"+pkg.version+"\n"+serial).digest("hex").slice(0,32)}`,
  version:1,
  metadata:{ timestamp:new Date().toISOString(), component:{type:"application",name:pkg.name,version:pkg.version,"bom-ref":`pkg:npm/${pkg.name}@${pkg.version}`} },
  components
};
fs.mkdirSync(path.dirname(out),{recursive:true});
fs.writeFileSync(out,JSON.stringify(bom,null,2)+"\n");
console.log(JSON.stringify({status:"PASS",output:out,components:components.length,version:pkg.version},null,2));
