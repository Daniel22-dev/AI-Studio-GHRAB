#!/usr/bin/env node
import { rm } from "node:fs/promises";
import path from "node:path";
const root=path.resolve(process.argv[2]||"dist");
for(const rel of ["tests"]){await rm(path.join(root,rel),{recursive:true,force:true});}
console.log(JSON.stringify({status:"PASS",root,removed:["tests"]},null,2));
