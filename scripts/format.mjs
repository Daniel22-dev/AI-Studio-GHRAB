#!/usr/bin/env node
import { readFile, writeFile, readdir } from "node:fs/promises";
import path from "node:path";
const root=path.resolve(".");
let prettier=null;try{prettier=(await import("prettier")).default}catch(error){if(error?.code!=="ERR_MODULE_NOT_FOUND")throw error}
if(!prettier){console.warn("Prettier není dostupný; P4 source používá hermetickou syntaktickou kontrolu přes npm run format:check.");process.exit(0)}
const exts=new Set([".js",".mjs",".css",".html",".json",".webmanifest",".md",".yml",".yaml"]);const files=[];async function walk(dir){for(const e of await readdir(dir,{withFileTypes:true})){const f=path.join(dir,e.name);if(e.isDirectory()){if(["dist","node_modules",".git","qa-results","test-results"].includes(e.name))continue;await walk(f)}else if(exts.has(path.extname(e.name)))files.push(f)}}for(const dir of ["src","scripts",".github"])await walk(path.join(root,dir));for(const f of files){const info=await prettier.getFileInfo(f,{ignorePath:path.join(root,".prettierignore")});if(info.ignored||!info.inferredParser)continue;const source=await readFile(f,"utf8");await writeFile(f,await prettier.format(source,{filepath:f}),"utf8")}console.log(`Prettier upravil ${files.length} kandidátních souborů.`);
