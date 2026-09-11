const API_USAGE_SCHEMA = "ghrab-api-usage-v1";
const MAX_BREAKDOWN_ROWS = 200;
const DEFAULT_CACHE_MS = 30_000;
const cache = new Map();

function cleanDate(value) {
  const text = String(value || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
}

function number(value, max = Number.MAX_SAFE_INTEGER) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(max, Math.max(0, parsed));
}

function optionalNumber(value, max = Number.MAX_SAFE_INTEGER) {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.min(max, Math.max(0, parsed));
}

function cleanText(value, maxLength = 120) {
  return String(value || "").trim().slice(0, maxLength);
}

function normaliseRange(range = {}) {
  return Object.freeze({
    from: cleanDate(range.from),
    to: cleanDate(range.to),
  });
}

function endpointFor(config) {
  const endpoint = String(config?.endpoints?.apiUsage || "").trim();
  const apiBaseUrl = String(config?.apiBaseUrl || "").trim();
  if (!endpoint || !apiBaseUrl) return "";
  try {
    const documentBase = globalThis.location?.href || "http://localhost/";
    return new URL(endpoint, new URL(apiBaseUrl, documentBase)).href;
  } catch {
    return "";
  }
}

function enabledFor(config) {
  return Boolean(
    config?.authMode === "server-session" &&
      config?.features?.schoolServerConnected === true &&
      config?.features?.apiUsage === true &&
      endpointFor(config),
  );
}

function preparedFor(config) {
  return Boolean(
    config?.features?.apiUsageReady === true &&
      String(config?.endpoints?.apiUsage || "").trim(),
  );
}

function normaliseTotals(raw = {}) {
  return Object.freeze({
    cost: number(raw.cost, 10_000_000),
    requests: number(raw.requests, 1_000_000_000),
    inputTokens: number(raw.inputTokens, 1_000_000_000_000),
    outputTokens: number(raw.outputTokens, 1_000_000_000_000),
    cachedInputTokens: number(raw.cachedInputTokens, 1_000_000_000_000),
  });
}

function normaliseBreakdown(rows, idField, labelField) {
  if (!Array.isArray(rows)) return Object.freeze([]);
  return Object.freeze(
    rows.slice(0, MAX_BREAKDOWN_ROWS).map((raw, index) =>
      Object.freeze({
        id: cleanText(raw?.[idField] || raw?.id || `row-${index}`, 100),
        label: cleanText(raw?.[labelField] || raw?.label || raw?.name || raw?.[idField], 160),
        ...normaliseTotals(raw),
      }),
    ),
  );
}

function disconnectedSnapshot(config, range) {
  return Object.freeze({
    schema: API_USAGE_SCHEMA,
    status: "not-connected",
    prepared: preparedFor(config),
    enabled: false,
    connected: false,
    generatedAt: null,
    period: range,
    currency: "usd",
    budget: Object.freeze({ amount: null, period: "month" }),
    totals: normaliseTotals(),
    projects: Object.freeze([]),
    applications: Object.freeze([]),
    models: Object.freeze([]),
    error: null,
  });
}

function errorSnapshot(config, range, error) {
  return Object.freeze({
    ...disconnectedSnapshot(config, range),
    status: "error",
    enabled: true,
    connected: false,
    error: cleanText(error?.message || "API usage endpoint unavailable.", 240),
  });
}

function normaliseSnapshot(raw, range) {
  if (!raw || typeof raw !== "object" || raw.schema !== API_USAGE_SCHEMA) {
    throw new TypeError("Neplatné schéma přehledu API spotřeby.");
  }
  const currency = /^[a-z]{3}$/i.test(String(raw.currency || ""))
    ? String(raw.currency).toLowerCase()
    : "usd";
  const period = Object.freeze({
    from: cleanDate(raw.period?.from) || range.from,
    to: cleanDate(raw.period?.to) || range.to,
  });
  return Object.freeze({
    schema: API_USAGE_SCHEMA,
    status: "connected",
    prepared: true,
    enabled: true,
    connected: true,
    generatedAt: raw.generatedAt || null,
    period,
    currency,
    budget: Object.freeze({
      amount: optionalNumber(raw.budget?.amount, 10_000_000),
      period: cleanText(raw.budget?.period || "month", 24) || "month",
    }),
    totals: normaliseTotals(raw.totals),
    projects: normaliseBreakdown(raw.projects, "projectId", "label"),
    applications: normaliseBreakdown(raw.applications, "appId", "label"),
    models: normaliseBreakdown(raw.models, "model", "label"),
    error: null,
  });
}

function cacheKey(endpoint, range) {
  return `${endpoint}|${range.from}|${range.to}`;
}

export function clearApiUsageCache() {
  cache.clear();
}

export async function loadApiUsage(
  deploymentReady,
  range = {},
  fetchImpl = fetch,
  { force = false, cacheMs = DEFAULT_CACHE_MS } = {},
) {
  const config = await deploymentReady;
  const safeRange = normaliseRange(range);
  if (!enabledFor(config)) return disconnectedSnapshot(config, safeRange);

  const endpoint = endpointFor(config);
  const key = cacheKey(endpoint, safeRange);
  const cached = cache.get(key);
  if (!force && cached && Date.now() - cached.at < Math.max(0, Number(cacheMs || 0))) {
    return cached.value;
  }

  const url = new URL(endpoint);
  if (safeRange.from) url.searchParams.set("from", safeRange.from);
  if (safeRange.to) url.searchParams.set("to", safeRange.to);
  try {
    const response = await fetchImpl(url.href, {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error(`API usage: ${response.status}`);
    const length = Number(response.headers?.get?.("content-length") || 0);
    if (Number.isFinite(length) && length > 1024 * 1024) {
      throw new Error("API usage odpověď překročila bezpečný limit 1 MB.");
    }
    const value = normaliseSnapshot(await response.json(), safeRange);
    cache.set(key, { at: Date.now(), value });
    return value;
  } catch (error) {
    console.warn("AI Studio: přehled API spotřeby se nepodařilo načíst.", error);
    return errorSnapshot(config, safeRange, error);
  }
}

export const GHRAB_API_USAGE_SCHEMA = API_USAGE_SCHEMA;
