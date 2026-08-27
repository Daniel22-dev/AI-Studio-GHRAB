#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { webcrypto } from "node:crypto";
import { pathToFileURL } from "node:url";
import { checkAccessBundleFreshness } from "./lib/access-bundle-freshness.mjs";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const checks = [];
const check = (condition, message) => {
  checks.push({ condition: Boolean(condition), message });
  if (!condition) throw new Error(message);
};

function verifyServiceWorkerBypass() {
  const listeners = new Map();
  const source = fs.readFileSync(path.join(root, "src/sw.js"), "utf8");
  const context = vm.createContext({
    URL,
    console,
    Promise,
    Object,
    Error,
    fetch: async () => {
      throw new Error("network must not be called for bypassed requests");
    },
    caches: {
      open: async () => {
        throw new Error("cache must not be opened for bypassed requests");
      },
      keys: async () => [],
      delete: async () => true,
    },
    self: {
      location: { href: "https://example.test/AI-Studio-GHRAB/sw.js" },
      clients: { claim: async () => {} },
      skipWaiting: () => {},
      addEventListener(type, listener) {
        listeners.set(type, listener);
      },
    },
  });
  vm.runInContext(source, context, { filename: "src/sw.js" });
  const fetchListener = listeners.get("fetch");
  check(typeof fetchListener === "function", "Service worker registruje fetch listener.");

  for (const name of ["access-config-bundle.json", "access-config-bundle.sig.json"]) {
    let responded = false;
    fetchListener({
      request: {
        method: "GET",
        url: `https://example.test/AI-Studio-GHRAB/config/${name}`,
        mode: "cors",
        cache: "no-store",
        headers: { has: () => false },
      },
      respondWith() {
        responded = true;
      },
    });
    check(!responded, `Service worker obchází ${name}.`);
  }
}

class MemoryStorage {
  #items = new Map();
  get length() { return this.#items.size; }
  key(index) { return [...this.#items.keys()][index] ?? null; }
  getItem(key) { return this.#items.has(String(key)) ? this.#items.get(String(key)) : null; }
  setItem(key, value) { this.#items.set(String(key), String(value)); }
  removeItem(key) { this.#items.delete(String(key)); }
  clear() { this.#items.clear(); }
}

async function verifySchoolProfileFailClosed() {
  const schoolProfile = JSON.parse(
    fs.readFileSync(path.join(root, "src/config/deployment.school-server.json"), "utf8"),
  );
  const runtimeSource = fs.readFileSync(
    path.join(root, "src/access/platform-runtime.js"),
    "utf8",
  ).replace(
    /^import \{ BAKED_DEPLOYMENT_CONFIG \} from "\.\.\/config\/deployment-baked\.js";$/m,
    `const BAKED_DEPLOYMENT_CONFIG = Object.freeze(${JSON.stringify(schoolProfile)});`,
  );
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(runtimeSource).toString("base64")}`;
  const storage = new MemoryStorage();
  const session = new MemoryStorage();
  storage.setItem("teacher-gemini-key", "secret-local-key");
  session.setItem("temporary-gemini-key", "secret-session-key");
  Object.defineProperties(globalThis, {
    localStorage: { value: storage, configurable: true },
    sessionStorage: { value: session, configurable: true },
    location: { value: new URL("https://school.example/ai-studio/"), configurable: true },
  });
  delete globalThis.__GHRAB_DEPLOYMENT_CONFIG__;
  globalThis.fetch = async () => {
    throw new Error("deployment.json není dostupný");
  };

  const runtime = await import(moduleUrl);
  const aiConfig = runtime.createAiRuntimeConfig();
  check(
    aiConfig.ai.selectedMode !== "direct-gemini",
    "Zapečený školní profil nikdy nepřepne AI do direct-gemini.",
  );
  check(
    !aiConfig.ai.allowedModes.includes("direct-gemini"),
    "Zapečený školní profil direct-gemini ani nenabízí.",
  );
  const policy = runtime.enforceLocalKeyPolicy({
    localStorageKeys: ["teacher-gemini-key"],
    sessionStorageKeys: ["temporary-gemini-key"],
  });
  check(policy.allowed === false, "Školní profil behaviorálně zakazuje lokální API klíče.");
  check(
    storage.getItem("teacher-gemini-key") === null && session.getItem("temporary-gemini-key") === null,
    "Školní profil odstraní nalezené lokální API klíče.",
  );
}

async function verifySignedOfflineAge() {
  const bundle = JSON.parse(fs.readFileSync(path.join(root, "src/config/access-config-bundle.json"), "utf8"));
  const signature = JSON.parse(fs.readFileSync(path.join(root, "src/config/access-config-bundle.sig.json"), "utf8"));
  const issuedMs = Date.parse(bundle.issuedAt || bundle.generatedAt || "");
  check(Number.isFinite(issuedMs), "Podepsaný access bundle má platný čas vydání.");
  const expiredRelease = await checkAccessBundleFreshness({
    root,
    now: issuedMs + 31 * 24 * 60 * 60 * 1000,
    required: true,
    log: { log() {}, warn() {}, error() {} },
  });
  check(!expiredRelease.ok, "Release kontrola se skutečným časem odmítne bundle starší než 30 dní.");

  const storage = new MemoryStorage();
  const classList = { toggle: () => {} };
  Object.defineProperties(globalThis, {
    crypto: { value: webcrypto, configurable: true },
    localStorage: { value: storage, configurable: true },
    location: { value: new URL("https://example.test/AI-Studio-GHRAB/"), configurable: true },
    navigator: { value: { onLine: true }, configurable: true },
    document: {
      value: {
        documentElement: { classList, dataset: {} },
        dispatchEvent: () => {},
      },
      configurable: true,
    },
    CustomEvent: {
      value: class CustomEvent {
        constructor(type, options = {}) { this.type = type; this.detail = options.detail; }
      },
      configurable: true,
    },
  });
  globalThis.__GHRAB_DEPLOYMENT_CONFIG__ = {
    profile: "github-pages",
    authMode: "signed-permit",
    apiBaseUrl: "",
    sharedAccessVersion: bundle.version,
    access: { maxOfflineAgeHours: 24, maxSignedBundleAgeDays: 30, failClosedWhenStale: true },
    features: { allowLocalProviderKeys: true },
  };

  let online = true;
  globalThis.fetch = async (input) => {
    if (!online) throw new TypeError("offline");
    const href = String(input);
    if (href.endsWith("access-config-bundle.json")) {
      return new Response(JSON.stringify(bundle), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    if (href.endsWith("access-config-bundle.sig.json")) {
      return new Response(JSON.stringify(signature), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    throw new Error(`Neočekávaný fetch ${href}`);
  };

  const originalDateNow = Date.now;
  try {
    Date.now = () => issuedMs + 48 * 60 * 60 * 1000;
    const moduleUrl = `${pathToFileURL(path.join(root, "src/access/access-control.js")).href}?security-test=${Date.now()}`;
    const access = await import(moduleUrl);
    let snapshot = await access.initialiseAccess({ timeoutMs: 500, maxOfflineAgeHours: 24, maxSignedBundleAgeDays: 30 });
    check(snapshot.connectionState === "online", "První ověření podepsaného bundle je online.");

    online = false;
    snapshot = await access.initialiseAccess({ timeoutMs: 500, maxOfflineAgeHours: 24, maxSignedBundleAgeDays: 30 });
    check(snapshot.connectionState === "offline-fresh", "Bundle podepsaný před 48 hodinami funguje bezprostředně po online ověření offline.");
    check(snapshot.revocationCheckMode === "offline-signed-last-known-good", "Offline režim používá podepsaný LKG mód.");

    const lkgKey = "ghrab.access.last-known-good.v1";
    Date.now = () => issuedMs + 73 * 60 * 60 * 1000;
    const originalWarn = console.warn;
    console.warn = () => {};
    try {
      snapshot = await access.initialiseAccess({ timeoutMs: 500, maxOfflineAgeHours: 24, maxSignedBundleAgeDays: 30 });
    } finally {
      console.warn = originalWarn;
    }
    check(snapshot.connectionState === "offline-stale", "Po 25 hodinách bez online ověření LKG selže fail-closed.");
    check(snapshot.reason === "offline-stale", "Limit posledního online ověření se vynucuje samostatně.");

    const tampered = JSON.parse(storage.getItem(lkgKey));
    Date.now = () => issuedMs + 31 * 24 * 60 * 60 * 1000;
    tampered.fetchedAt = new Date(Date.now()).toISOString();
    storage.setItem(lkgKey, JSON.stringify(tampered));
    console.warn = () => {};
    try {
      snapshot = await access.initialiseAccess({ timeoutMs: 500, maxOfflineAgeHours: 24, maxSignedBundleAgeDays: 30 });
    } finally {
      console.warn = originalWarn;
    }
    check(snapshot.connectionState === "configuration-stale", "Podvržený fetchedAt neobnoví bundle starší než 30 dní.");
    check(snapshot.reason === "configuration-stale", "Stáří podepsaného bundle se vynucuje nezávisle na fetchedAt.");
  } finally {
    Date.now = originalDateNow;
  }
}

verifyServiceWorkerBypass();
await verifySchoolProfileFailClosed();
await verifySignedOfflineAge();

for (const item of checks) console.log(`PASS ${item.message}`);
console.log(`security regressions: ${checks.length}/${checks.length} PASS`);
