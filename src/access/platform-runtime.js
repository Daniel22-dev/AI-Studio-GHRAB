const PLATFORM_SCHEMA = "ghrab-platform-runtime-v1";
const DATA_MANIFEST_SCHEMA = "ghrab-data-manifest-v1";
const SHARED_DEVICE_KEY = "ghrab.platform.shared-device.v1";
const MAX_TELEMETRY_QUEUE = 250;

function safeGet(storage, key) { try { return storage.getItem(key); } catch { return null; } }
function safeSet(storage, key, value) { try { storage.setItem(key, value); return true; } catch { return false; } }
function safeRemove(storage, key) { try { storage.removeItem(key); return true; } catch { return false; } }
function trailingSlash(value, fallback = "/") { const text = String(value || fallback).trim() || fallback; return text.endsWith("/") ? text : `${text}/`; }
function absoluteUrl(value, fallback = "/") {
  const text = String(value || fallback).trim() || fallback;
  try { return new URL(text, globalThis.location?.origin || "http://localhost"); }
  catch { return new URL(fallback, globalThis.location?.origin || "http://localhost"); }
}
function baseUrl(value, fallback = "/") { return trailingSlash(absoluteUrl(value, fallback).href); }
function uuid(prefix = "evt") {
  if (globalThis.crypto?.randomUUID) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
}
function deployment() {
  return globalThis.__GHRAB_DEPLOYMENT_CONFIG__ || {
    profile: "github-pages", authMode: "signed-permit", aiTransport: "direct-provider", telemetryMode: "local",
    apiBaseUrl: "", appBaseUrl: new URL("../", import.meta.url).href,
    features: { allowLocalProviderKeys: true },
  };
}
function isSchoolProfile() {
  const config = deployment();
  return config.profile === "school-server" || config.authMode === "server-session" || config.aiTransport === "school-gateway";
}
function createAiRuntimeConfig({ timeoutMs = 120000, maxRequestBytes = 18 * 1024 * 1024, maxPartBytes = 14 * 1024 * 1024, models = {} } = {}) {
  const school = isSchoolProfile();
  const directModels = {
    economy: models.economy || "gemini-3.5-flash-lite",
    balanced: models.balanced || "gemini-3.6-flash",
    quality: models.quality || "gemini-3.6-flash",
  };
  return Object.freeze({
    schema: "ghrab-runtime-config-v1",
    ai: Object.freeze({
      defaultMode: school ? "school-gateway" : "direct-gemini",
      selectedMode: school ? "school-gateway" : "direct-gemini",
      allowedModes: Object.freeze([school ? "school-gateway" : "direct-gemini"]),
      allowUserModeSelection: false,
      automaticFallback: false,
      gatewayUrl: deployment().apiBaseUrl ? new URL("ai/generate", baseUrl(deployment().apiBaseUrl)).href : "/api/v1/ai/generate",
      healthUrl: deployment().apiBaseUrl ? new URL("ai/health", baseUrl(deployment().apiBaseUrl)).href : "/api/v1/ai/health",
      requestTimeoutMs: Math.max(5000, Math.min(180000, Number(timeoutMs) || 120000)),
      gatewayMaxRetries: school ? 1 : 0,
      maxRequestBytes,
      maxPartBytes,
      directGemini: Object.freeze({
        endpointBase: "https://generativelanguage.googleapis.com/v1beta/models",
        profileModels: Object.freeze(directModels),
        fallbackModels: Object.freeze([directModels.economy]),
        useResponseSchema: false,
        maxOutputTokens: 32768,
      }),
    }),
    telemetry: Object.freeze({ enabled: true }),
  });
}
function apiUrl(name, fallback) {
  const config = deployment();
  const path = config.endpoints?.[name] || fallback;
  return config.apiBaseUrl ? new URL(String(path).replace(/^\/+/, ""), baseUrl(config.apiBaseUrl)) : new URL(path, location.href);
}
function scrubText(value) {
  return String(value || "")
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, "[API key removed]")
    .replace(/(?:Bearer\s+)[A-Za-z0-9._~+\/-]+/gi, "Bearer [token removed]")
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, "[email removed]")
    .replace(/\b(?:\+?420\s*)?(?:\d[\s-]*){9}\b/g, "[phone removed]")
    .slice(0, 500);
}
function privacySafeMetadata(input = {}) {
  const allowed = [
    "type", "appId", "appVersion", "operation", "outcome", "errorCode", "mode", "modelProfile",
    "clientRequestId", "attemptId", "workflowId", "providerRequests", "retryRequests", "inputTokens",
    "outputTokens", "cachedTokens", "latencyMs", "durationMs", "outputCount", "userActions", "status",
    "coreVersion", "contractVersion", "buildId", "release", "connectionState",
  ];
  const result = {};
  for (const key of allowed) {
    if (!(key in input)) continue;
    const value = input[key];
    if (typeof value === "string") result[key] = scrubText(value);
    else if (typeof value === "number" && Number.isFinite(value)) result[key] = value;
    else if (typeof value === "boolean") result[key] = value;
  }
  return result;
}
function storageKeys(storage) {
  const keys = [];
  try { for (let index = 0; index < storage.length; index += 1) { const key = storage.key(index); if (key) keys.push(key); } } catch { /* no-op */ }
  return keys;
}
function patternMatches(pattern, key) {
  const text = String(pattern || "");
  if (text.endsWith("*")) return key.startsWith(text.slice(0, -1));
  return key === text;
}
function manifestUrl(appId) {
  const config = deployment();
  const appBase = config.appBaseUrls?.[appId] || config.appBaseUrl || location.href;
  return new URL("config/data-manifest.json", baseUrl(appBase));
}
async function loadDataManifest(appId) {
  try {
    const response = await fetch(manifestUrl(appId), { cache: "no-store", credentials: "same-origin", headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (data.schema !== DATA_MANIFEST_SCHEMA || data.appId !== appId || !Array.isArray(data.stores)) throw new Error("invalid data manifest");
    return data;
  } catch (error) {
    console.warn(`GHRAB data manifest (${appId}) není dostupný.`, error);
    return { schema: DATA_MANIFEST_SCHEMA, appId, version: "unknown", stores: [], retention: { defaultDays: 0 }, deletion: { supported: false } };
  }
}
async function deleteIndexedDb(name) {
  if (!name || !globalThis.indexedDB) return { name, ok: true, skipped: true };
  return new Promise((resolve) => {
    try {
      const request = indexedDB.deleteDatabase(name);
      request.onsuccess = () => resolve({ name, ok: true });
      request.onerror = () => resolve({ name, ok: false, error: request.error?.message || "delete failed" });
      request.onblocked = () => resolve({ name, ok: false, blocked: true });
    } catch (error) { resolve({ name, ok: false, error: error.message }); }
  });
}
async function clearByManifest(manifest, { sessionOnly = false, credentialsOnly = false } = {}) {
  const result = { removed: [], databases: [], errors: [] };
  for (const store of manifest.stores || []) {
    if (sessionOnly && store.clearOnEndWork !== true) continue;
    if (credentialsOnly && store.category !== "credential") continue;
    if (store.kind === "localStorage" || store.kind === "sessionStorage") {
      const storage = store.kind === "localStorage" ? localStorage : sessionStorage;
      for (const key of storageKeys(storage)) {
        if ((store.patterns || []).some((pattern) => patternMatches(pattern, key))) {
          if (safeRemove(storage, key)) result.removed.push(`${store.kind}:${key}`);
          else result.errors.push(`${store.kind}:${key}`);
        }
      }
    }
    if (!sessionOnly && !credentialsOnly && store.kind === "indexedDB") {
      for (const name of store.names || []) result.databases.push(await deleteIndexedDb(name));
    }
    if (!sessionOnly && !credentialsOnly && store.kind === "cacheStorage" && globalThis.caches) {
      const names = await caches.keys().catch(() => []);
      for (const name of names) {
        if ((store.patterns || []).some((pattern) => patternMatches(pattern, name))) {
          const ok = await caches.delete(name).catch(() => false);
          if (ok) result.removed.push(`cacheStorage:${name}`); else result.errors.push(`cacheStorage:${name}`);
        }
      }
    }
  }
  return result;
}
function serverSession() { return globalThis.__GHRAB_SERVER_SESSION__ || null; }
function requestToken() { return String(serverSession()?.requestToken || serverSession()?.csrfToken || ""); }
async function serverLogout() {
  if (deployment().authMode !== "server-session") return true;
  try {
    const session = serverSession();
    const headers = { Accept: "application/json", "Content-Type": "application/json" };
    const token = requestToken();
    if (token) { headers.Authorization = `Bearer ${token}`; headers["X-GHRAB-CSRF"] = token; }
    const response = await fetch(apiUrl("logout", "session/logout"), {
      method: "POST", credentials: "include", cache: "no-store", headers, body: "{}",
    });
    return response.ok || response.status === 401;
  } catch { return false; }
}
function sharedDeviceEnabled() {
  const stored = safeGet(sessionStorage, SHARED_DEVICE_KEY);
  if (stored === "true" || stored === "false") return stored === "true";
  return deployment().profile === "school-server" || deployment().privacy?.sharedDeviceDefault === true;
}
function setSharedDevice(value) { safeSet(sessionStorage, SHARED_DEVICE_KEY, value ? "true" : "false"); }
function enforceLocalKeyPolicy({ localStorageKeys = [], sessionStorageKeys = [], onRemoved } = {}) {
  if (!isSchoolProfile() && deployment().features?.allowLocalProviderKeys !== false) return { allowed: true, removed: [] };
  const removed = [];
  for (const [storage, keys, label] of [[localStorage, localStorageKeys, "localStorage"], [sessionStorage, sessionStorageKeys, "sessionStorage"]]) {
    for (const key of keys) {
      if (safeGet(storage, key) !== null && safeRemove(storage, key)) removed.push(`${label}:${key}`);
    }
  }
  try { onRemoved?.(removed); } catch { /* best effort */ }
  return { allowed: false, removed };
}

let runtimeState = null;
let telemetryQueue = [];
let telemetryTimer = 0;
async function flushTelemetry() {
  if (!telemetryQueue.length || deployment().telemetryMode !== "server") return;
  const batch = telemetryQueue.splice(0, 50);
  try {
    const response = await fetch(apiUrl("telemetry", "telemetry"), {
      method: "POST", credentials: "include", cache: "no-store",
      headers: { "Content-Type": "application/json", Accept: "application/json", ...(requestToken() ? { Authorization: `Bearer ${requestToken()}` } : {}) },
      body: JSON.stringify({ schema: "ghrab-telemetry-batch-v1", events: batch }),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
  } catch {
    telemetryQueue = [...batch, ...telemetryQueue].slice(-MAX_TELEMETRY_QUEUE);
  }
}
function scheduleTelemetryFlush() {
  if (telemetryTimer) return;
  telemetryTimer = window.setTimeout(async () => { telemetryTimer = 0; await flushTelemetry(); }, 1200);
}
function recordTelemetry(type, payload = {}) {
  const event = {
    schema: "ghrab-telemetry-event-v1",
    id: uuid("telemetry"),
    at: new Date().toISOString(),
    type: scrubText(type),
    appId: runtimeState?.appId || payload.appId || "unknown",
    appVersion: runtimeState?.appVersion || payload.appVersion || "unknown",
    metadata: privacySafeMetadata({ ...payload, type }),
  };
  if (deployment().telemetryMode === "server") {
    telemetryQueue.push(event);
    telemetryQueue = telemetryQueue.slice(-MAX_TELEMETRY_QUEUE);
    scheduleTelemetryFlush();
  }
  document.dispatchEvent(new CustomEvent("ghrab:telemetry", { detail: event }));
  return event.id;
}
async function platformHealth() {
  const base = {
    schema: "ghrab-platform-health-v1", status: "local", checkedAt: new Date().toISOString(),
    appId: runtimeState?.appId || "unknown", appVersion: runtimeState?.appVersion || "unknown",
    profile: deployment().profile, authMode: deployment().authMode, aiTransport: deployment().aiTransport,
    access: runtimeState?.accessSnapshot || null,
  };
  if (!deployment().apiBaseUrl || deployment().profile !== "school-server") return base;
  try {
    const response = await fetch(apiUrl("health", "health"), { cache: "no-store", credentials: "include", headers: { Accept: "application/json" } });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data) throw new Error(`HTTP ${response.status}`);
    return { ...base, status: data.status || "ok", server: data };
  } catch (error) {
    return { ...base, status: "unavailable", errorCode: "SERVER_UNAVAILABLE" };
  }
}
async function deleteMyData({ reload = true } = {}) {
  if (!runtimeState) return { ok: false, reason: "not-initialised" };
  const local = await clearByManifest(runtimeState.dataManifest);
  let server = { ok: true, skipped: true };
  if (deployment().profile === "school-server" && runtimeState.dataManifest.deletion?.serverEndpoint) {
    try {
      const session = serverSession();
      const headers = { Accept: "application/json", "Content-Type": "application/json" };
      const token = requestToken();
      if (token) { headers.Authorization = `Bearer ${token}`; headers["X-GHRAB-CSRF"] = token; }
      const response = await fetch(new URL(runtimeState.dataManifest.deletion.serverEndpoint, baseUrl(deployment().apiBaseUrl)), {
        method: "DELETE", credentials: "include", cache: "no-store", headers,
      });
      server = { ok: response.ok, status: response.status };
    } catch (error) { server = { ok: false, error: error.message }; }
  }
  recordTelemetry("data-deleted", { outcome: local.errors.length || !server.ok ? "partial" : "success" });
  const result = { ok: local.errors.length === 0 && server.ok, local, server };
  if (reload) window.setTimeout(() => location.reload(), 150);
  return result;
}
async function endWork({ clearApplicationData = sharedDeviceEnabled(), reload = true } = {}) {
  if (!runtimeState) return { ok: false, reason: "not-initialised" };
  const local = await clearByManifest(runtimeState.dataManifest, { sessionOnly: !clearApplicationData });
  await serverLogout();
  globalThis.__GHRAB_SERVER_SESSION__ = null;
  safeRemove(sessionStorage, SHARED_DEVICE_KEY);
  recordTelemetry("work-session-ended", { outcome: local.errors.length ? "partial" : "success" });
  if (reload) window.setTimeout(() => location.reload(), 150);
  return { ok: local.errors.length === 0, local };
}
function mountPrivacyControls() {
  if (document.getElementById("ghrab-privacy-controls")) return;
  const root = document.createElement("div");
  root.id = "ghrab-privacy-controls";
  root.style.cssText = "position:fixed;left:12px;bottom:12px;z-index:2147482000;font:13px/1.35 system-ui,sans-serif";
  const shadow = root.attachShadow ? root.attachShadow({ mode: "open" }) : root;
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "Soukromí a ukončení práce";
  button.setAttribute("aria-haspopup", "dialog");
  button.style.cssText = "border:1px solid rgba(120,140,170,.45);border-radius:999px;background:#101a2b;color:#fff;padding:8px 12px;box-shadow:0 6px 24px rgba(0,0,0,.24);cursor:pointer";
  const panel = document.createElement("section");
  panel.hidden = true;
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Soukromí a ukončení práce");
  panel.style.cssText = "width:min(340px,calc(100vw - 24px));margin-top:8px;border:1px solid rgba(120,140,170,.45);border-radius:14px;background:#101a2b;color:#fff;padding:14px;box-shadow:0 12px 38px rgba(0,0,0,.38)";
  const title = document.createElement("strong"); title.textContent = "Práce na sdíleném zařízení";
  const description = document.createElement("p"); description.textContent = "Ukončení práce vymaže dočasné údaje a serverovou relaci. Úplné smazání odstraní data této aplikace podle jejího datového manifestu."; description.style.cssText = "margin:8px 0;color:#cbd5e1";
  const label = document.createElement("label"); label.style.cssText = "display:flex;gap:8px;align-items:center;margin:8px 0 12px";
  const checkbox = document.createElement("input"); checkbox.type = "checkbox"; checkbox.checked = sharedDeviceEnabled();
  checkbox.addEventListener("change", () => setSharedDevice(checkbox.checked));
  label.append(checkbox, document.createTextNode("Sdílený počítač – při ukončení vymazat i lokální data aplikace"));
  const actions = document.createElement("div"); actions.style.cssText = "display:flex;flex-wrap:wrap;gap:8px";
  const end = document.createElement("button"); end.type = "button"; end.textContent = "Ukončit práci";
  const erase = document.createElement("button"); erase.type = "button"; erase.textContent = "Smazat moje data";
  const close = document.createElement("button"); close.type = "button"; close.textContent = "Zavřít";
  for (const control of [end, erase, close]) control.style.cssText = "border:1px solid rgba(255,255,255,.24);border-radius:8px;background:#1e293b;color:#fff;padding:7px 10px;cursor:pointer";
  end.addEventListener("click", async () => { end.disabled = true; end.textContent = "Ukončuji…"; await endWork({ clearApplicationData: checkbox.checked }); });
  erase.addEventListener("click", async () => {
    if (!confirm("Opravdu odstranit lokální data této aplikace a požádat server o smazání serverových dat, pokud je podporováno?")) return;
    erase.disabled = true; erase.textContent = "Mažu…"; await deleteMyData();
  });
  const closePanel = () => { panel.hidden = true; button.setAttribute("aria-expanded", "false"); button.focus(); };
  close.addEventListener("click", closePanel);
  panel.addEventListener("keydown", (event) => {
    if (event.key === "Escape") { event.preventDefault(); closePanel(); return; }
    if (event.key !== "Tab") return;
    const focusable = [...panel.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href],[tabindex]:not([tabindex="-1"])')];
    if (!focusable.length) { event.preventDefault(); return; }
    const first = focusable[0]; const last = focusable[focusable.length - 1];
    if (event.shiftKey && shadow.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && shadow.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  button.setAttribute("aria-expanded", "false");
  button.addEventListener("click", () => {
    panel.hidden = !panel.hidden;
    button.setAttribute("aria-expanded", panel.hidden ? "false" : "true");
    if (!panel.hidden) close.focus();
  });
  actions.append(end, erase, close); panel.append(title, description, label, actions); shadow.append(button, panel); document.body.append(root);
}
function mountConnectionStatus(accessSnapshot) {
  const state = String(accessSnapshot?.connectionState || "unknown");
  document.documentElement.dataset.ghrabPlatformRuntime = "ready";
  document.documentElement.dataset.ghrabConnectionState = state;
  if (!["offline-fresh", "server-unavailable"].includes(state) || document.getElementById("ghrab-connection-status")) return;
  const badge = document.createElement("div");
  badge.id = "ghrab-connection-status";
  badge.setAttribute("role", "status");
  badge.style.cssText = "position:fixed;left:12px;top:12px;z-index:2147482000;max-width:min(420px,calc(100vw - 24px));border:1px solid rgba(245,185,66,.55);border-radius:10px;background:#20190b;color:#fff4cf;padding:8px 11px;font:12px/1.4 system-ui,sans-serif;box-shadow:0 8px 26px rgba(0,0,0,.25)";
  badge.textContent = state === "offline-fresh"
    ? `Offline režim: používá se kryptograficky ověřená poslední známá konfigurace (${Number(accessSnapshot?.offlineAgeHours || 0).toFixed(1)} h).`
    : "Školní server je dočasně nedostupný. Operace vyžadující server nyní nebudou fungovat.";
  (document.body || document.documentElement).append(badge);
}
async function enforceCredentialPolicy(manifest) {
  if (deployment().features?.allowLocalProviderKeys !== false) return { removed: [] };
  return clearByManifest(manifest, { credentialsOnly: true });
}

export async function initialisePlatformRuntime({ appId, appVersion = "unknown", accessSnapshot = null, mountControls = true } = {}) {
  if (!appId) throw new TypeError("initialisePlatformRuntime requires appId");
  const dataManifest = await loadDataManifest(appId);
  runtimeState = Object.freeze({ schema: PLATFORM_SCHEMA, appId, appVersion, accessSnapshot, dataManifest, profile: deployment().profile });
  await enforceCredentialPolicy(dataManifest);
  const existingTelemetry = globalThis.GHRABTelemetry && typeof globalThis.GHRABTelemetry === "object" ? globalThis.GHRABTelemetry : {};
  globalThis.GHRABTelemetry = Object.freeze({
    ...existingTelemetry,
    recordEvent: (type, payload) => recordTelemetry(type, payload),
    recordAiUsage: (payload) => recordTelemetry("ai-usage", payload),
    flush: flushTelemetry,
  });
  globalThis.GHRABServerAuth = Object.freeze({
    getContext: async () => {
      if (deployment().authMode !== "server-session") return null;
      const session = serverSession();
      return session?.authenticated && requestToken() ? { authenticated: true, mode: "cookie+request-token", token: requestToken(), expiresAt: session.expiresAt || null } : null;
    },
    getSession: () => serverSession(),
    authProvider: async () => { const context = await globalThis.GHRABServerAuth.getContext(); return context?.token ? { token: context.token } : null; },
    logout: serverLogout,
  });
  globalThis.GHRABPlatform = Object.freeze({
    schema: PLATFORM_SCHEMA,
    getState: () => runtimeState,
    health: platformHealth,
    endWork,
    deleteMyData,
    isSharedDevice: sharedDeviceEnabled,
    setSharedDevice,
    scrubText,
  });
  const platformKit = globalThis.GHRAB_PLATFORM?.contract === "ghrab-platform-v1"
    ? globalThis.GHRAB_PLATFORM
    : {};
  globalThis.GHRAB_PLATFORM = Object.freeze({
    ...platformKit,
    version: platformKit.version || "1.0.0",
    contract: platformKit.contract || "ghrab-platform-v1",
    getDeployment: deployment,
    getProfile: () => deployment().profile || "github-pages",
    isSchoolProfile,
    allowsLocalProviderKeys: () => deployment().features?.allowLocalProviderKeys !== false && deployment().authMode !== "server-session",
    apiUrl: (relative) => deployment().apiBaseUrl ? new URL(String(relative || "").replace(/^\/+/, ""), baseUrl(deployment().apiBaseUrl)).href : String(relative || ""),
    uuid,
    createAiRuntimeConfig,
    enforceLocalKeyPolicy,
    getSession: () => serverSession(),
    authProvider: async () => globalThis.GHRABServerAuth.authProvider(),
    health: platformHealth,
    recordTelemetry: (event) => recordTelemetry(event?.type || "event", event),
    sanitizeDiagnostic: privacySafeMetadata,
    clearStorage: async (manifest) => clearByManifest(manifest),
  });
  if (mountControls && document.body) mountPrivacyControls();
  else if (mountControls) document.addEventListener("DOMContentLoaded", mountPrivacyControls, { once: true });
  if (document.body) mountConnectionStatus(accessSnapshot);
  else document.addEventListener("DOMContentLoaded", () => mountConnectionStatus(accessSnapshot), { once: true });
  recordTelemetry("platform-runtime-ready", { status: "ok", connectionState: accessSnapshot?.connectionState || "unknown" });
  return runtimeState;
}
