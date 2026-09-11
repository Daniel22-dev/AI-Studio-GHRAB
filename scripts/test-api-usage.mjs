import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { clearApiUsageCache, loadApiUsage, GHRAB_API_USAGE_SCHEMA } from "../src/modules/api-usage.js";

const disconnectedConfig = {
  authMode: "signed-permit",
  apiBaseUrl: "",
  endpoints: { apiUsage: "admin/api-usage" },
  features: { schoolServerConnected: false, apiUsageReady: true, apiUsage: false },
};
let called = false;
const disconnected = await loadApiUsage(Promise.resolve(disconnectedConfig), {}, async () => {
  called = true;
  throw new Error("fetch must not run");
});
assert.equal(called, false);
assert.equal(disconnected.status, "not-connected");
assert.equal(disconnected.prepared, true);

const preparedConfig = {
  authMode: "server-session",
  apiBaseUrl: "https://school.example/api/v1/",
  endpoints: { apiUsage: "admin/api-usage" },
  features: { schoolServerConnected: false, apiUsageReady: true, apiUsage: false },
};
const prepared = await loadApiUsage(Promise.resolve(preparedConfig));
assert.equal(prepared.prepared, true);
assert.equal(prepared.connected, false);

const originalLocation = globalThis.location;
Object.defineProperty(globalThis, "location", {
  configurable: true,
  value: { href: "https://school.example/ai-studio/api-usage/" },
});
const relativePrepared = await loadApiUsage(Promise.resolve({
  ...preparedConfig,
  apiBaseUrl: "/api/v1/",
}));
assert.equal(relativePrepared.prepared, true);
if (originalLocation === undefined) delete globalThis.location;
else Object.defineProperty(globalThis, "location", { configurable: true, value: originalLocation });

const liveConfig = {
  ...preparedConfig,
  features: { schoolServerConnected: true, apiUsageReady: true, apiUsage: true },
};
let request = null;
clearApiUsageCache();
const live = await loadApiUsage(
  Promise.resolve(liveConfig),
  { from: "2026-09-01", to: "2026-09-11" },
  async (url, init) => {
    request = { url, init };
    return {
      ok: true,
      headers: { get: () => "512" },
      json: async () => ({
        schema: GHRAB_API_USAGE_SCHEMA,
        generatedAt: "2026-09-11T12:30:00.000Z",
        period: { from: "2026-09-01", to: "2026-09-11" },
        currency: "usd",
        budget: { amount: 100, period: "month" },
        totals: { cost: 18.42, requests: 612, inputTokens: 742100, outputTokens: 188400, cachedInputTokens: 205300 },
        projects: [{ projectId: "forge", label: "Forge", cost: 4.65, requests: 64 }],
        applications: [{ appId: "generator", label: "Generátor testů", cost: 5.24, requests: 238 }],
        models: [{ model: "example-model", label: "Příklad modelu", cost: 11.12, requests: 390 }],
      }),
    };
  },
  { force: true },
);
assert.equal(live.connected, true);
assert.equal(live.totals.cost, 18.42);
assert.equal(live.budget.amount, 100);
assert.equal(live.projects[0].id, "forge");
assert.match(request.url, /\/api\/v1\/admin\/api-usage\?/);
assert.match(request.url, /from=2026-09-01/);
assert.match(request.url, /to=2026-09-11/);
assert.equal(request.init.credentials, "same-origin");
assert.equal(request.init.cache, "no-store");

clearApiUsageCache();
const originalWarn = console.warn;
console.warn = () => {};
let invalid;
try {
  invalid = await loadApiUsage(
    Promise.resolve(liveConfig),
    {},
    async () => ({ ok: true, headers: { get: () => "0" }, json: async () => ({ schema: "wrong" }) }),
    { force: true },
  );
} finally {
  console.warn = originalWarn;
}
assert.equal(invalid.status, "error");
assert.equal(invalid.connected, false);

const moduleSource = await readFile(new URL("../src/modules/api-usage.js", import.meta.url), "utf8");
assert.equal(moduleSource.includes("localStorage"), false);
assert.equal(moduleSource.includes("sessionStorage"), false);
assert.equal(moduleSource.includes("OPENAI_ADMIN_KEY"), false);

console.log("API usage contract: PASS");
