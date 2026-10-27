#!/usr/bin/env node
/* Real Studio writer + real v2 verified consumer + real roster projections.
   Only the signed-permit verifier is mocked; this is not real-school UAT. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const origin = "https://groups-crossapp.example";
const prefix = "/AI-Studio-GHRAB/";
const src = path => readFileSync(path, "utf8");
const resources = new Map([
  [prefix+"groups/", ["text/html", src("src/groups/index.html")]],
  [prefix+"groups/groups.js", ["text/javascript", src("src/groups/groups.js")]],
  [prefix+"groups/group-service.js", ["text/javascript", src("src/groups/group-service.js")]],
  [prefix+"groups/verified-client.js", ["text/javascript", src("src/groups/verified-client.js")]],
  [prefix+"access/access-control.js", ["text/javascript", String.raw