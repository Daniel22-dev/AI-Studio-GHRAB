#!/usr/bin/env node
/* PREPRODUCTION: static fail-closed consumer security checks.
   Not a browser signature verification or school UAT. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const src = readFileSync("src/groups/verified-client.js", "utf8");
const required = [
  /from "\.\.\/access\/access-control\.js"/,
  /initialiseAccess\(\)/,
  /getAccessSnapshot\(\)/,
  /hasAppAccess\(appId\)/,
  /createPrincipalGroupsSession\(/,
  /GROUP_CONSUMER_NOT_ALLOWED/,
  /GROUP_ORIGIN_DENIED/,
  /GROUP_PREVIEW_DENIED/,
  /GROUP_ACCESS_VERIFICATION_FAILED/,
  /GROUP_ACCESS_DENIED/,
  /isColleaguePreview\(\)/,
  /accessPromise = null/,
];
for (const pattern of required) assert.match(src,pattern);
assert.ok(!src.includes("createGroupsService("),"no unscoped v1 fallback");
assert.ok(!src.includes("localStorage.getItem("),"no direct legacy storage reads");
assert.ok(!src.includes("document.documentElement.dataset.ghrabAccess"),
  "visual access flag must not replace signature verification");
console.log("PASS verified-client source contract; live signature verification NOT TESTED");
