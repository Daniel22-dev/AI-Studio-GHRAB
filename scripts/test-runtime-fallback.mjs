#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRegistryClient } from "../src/modules/registry-client.js";

const generated = JSON.parse(await readFile("src/config/apps.generated.json", "utf8"));
const fallback = JSON.parse(await readFile("src/config/apps.fallback.json", "utf8"));
assert.deepEqual(fallback, generated, "Committed fallback must equal the approved generated registry");

const originalFetch = globalThis.fetch;
const base = "https://studio.invalid/";
const deploymentReady = Promise.resolve({});
const applyDeploymentToAppRegistry = (_deployment, registry) => registry;

const jsonResponse = (value) => ({ ok: true, status: 200, json: async () => value });
const errorResponse = (status) => ({ ok: false, status, json: async () => { throw new Error("unreachable"); } });

try {
  const preferredCalls = [];
  globalThis.fetch = async (url) => {
    preferredCalls.push(String(url));
    if (String(url).endsWith("config/apps.generated.json")) return jsonResponse(generated);
    throw new Error(`Unexpected fallback request: ${url}`);
  };
  const preferred = createRegistryClient({ base, deploymentReady, applyDeploymentToAppRegistry });
  assert.deepEqual(await preferred.loadApps(), generated);
  assert.equal(preferredCalls.length, 1);
  assert.match(preferredCalls[0], /apps\.generated\.json$/);

  const fallbackCalls = [];
  globalThis.fetch = async (url) => {
    fallbackCalls.push(String(url));
    if (String(url).endsWith("config/apps.generated.json")) return errorResponse(503);
    if (String(url).endsWith("config/apps.fallback.json")) return jsonResponse(fallback);
    throw new Error(`Unexpected request: ${url}`);
  };
  const degraded = createRegistryClient({ base, deploymentReady, applyDeploymentToAppRegistry });
  assert.deepEqual(await degraded.loadApps(), fallback);
  assert.equal(fallbackCalls.length, 2);
  assert.match(fallbackCalls[0], /apps\.generated\.json$/);
  assert.match(fallbackCalls[1], /apps\.fallback\.json$/);
} finally {
  globalThis.fetch = originalFetch;
}

console.log(`RUNTIME FALLBACK REGRESSION: PASS — generated preferred; verified fallback used after generated fetch failure (${fallback.length} apps).`);
