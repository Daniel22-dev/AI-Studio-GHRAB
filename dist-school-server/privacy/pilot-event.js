const IDENTIFIER = /^[a-z0-9][a-z0-9._:-]{0,95}$/iu;
const SAFE_STRING_FIELDS = new Set([
  "id", "type", "appId", "appVersion", "outputKind", "outcome", "result",
  "targetAppId", "sourceAppId", "connectionState", "mode", "contractVersion",
]);
const SAFE_NUMBER_FIELDS = new Set([
  "estimatedMinutes", "attemptedQuantity", "successfulQuantity", "failedQuantity",
  "cancelledQuantity", "activeSeconds", "durationMs", "latencyMs", "outputCount",
]);

function safeIdentifier(value) {
  const text = String(value ?? "").trim();
  return IDENTIFIER.test(text) ? text : "";
}

function safeNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.max(0, Math.min(10_000_000, number));
}

export function sanitizePilotEvent(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const result = {};
  if (input.at) {
    const timestamp = Date.parse(String(input.at));
    if (Number.isFinite(timestamp)) result.at = new Date(timestamp).toISOString();
  }
  for (const key of SAFE_STRING_FIELDS) {
    if (!(key in input)) continue;
    const value = safeIdentifier(input[key]);
    if (value) result[key] = value;
  }
  for (const key of SAFE_NUMBER_FIELDS) {
    if (!(key in input)) continue;
    const value = safeNumber(input[key]);
    if (value !== null) result[key] = value;
  }
  return result.type ? result : null;
}

export function sanitizePilotEventList(input) {
  if (!Array.isArray(input)) return [];
  return input.map((item) => sanitizePilotEvent(item)).filter(Boolean).slice(-2000);
}
