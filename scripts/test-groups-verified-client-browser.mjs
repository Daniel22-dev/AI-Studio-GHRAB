#!/usr/bin/env node
/* Synthetic verification + real invalid-signature rejection; NO school account/PII. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const origin = "https://verified-groups.example";
const root = "/AI-Studio-GHRAB/";
const read = path => readFileSync(path, "utf8");
const files = new Map([
  [root + "groups/verified-client.js", read("src/groups/verified-client.js")],
  [root + "groups/group-service.js", read("src/groups/group-service.js")],
  [root + "access/access-control.js", read("src/access/access-control.js")],
  [root + "config/deployment-baked.js", read("src/config/deployment-baked.js")],
]);
const stub = String.raw