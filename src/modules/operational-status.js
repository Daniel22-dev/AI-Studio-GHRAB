const SNAPSHOT_SCHEMA = "ghrab-operational-status-v1";
const UPDATE_SCHEMA = "ghrab-operational-status-update-v1";
const VALID_STATUSES = new Set(["operational", "maintenance", "outage"]);

function cleanStatus(value) {
  return VALID_STATUSES.has(value) ? value : "operational";
}

function endpointFor(config) {
  const endpoint = String(config?.endpoints?.operationalStatus || "").trim();
  if (!endpoint || !config?.apiBaseUrl) return "";
  return new URL(endpoint, config.apiBaseUrl).href;
}

function enabledFor(config) {
  return Boolean(
    config?.features?.schoolServerConnected === true &&
      config?.features?.centralOperationalStatus === true &&
      endpointFor(config),
  );
}

function normaliseSnapshot(raw, { enabled = true, connected = true } = {}) {
  const apps = {};
  if (raw?.apps && typeof raw.apps === "object" && !Array.isArray(raw.apps)) {
    for (const [appId, record] of Object.entries(raw.apps)) {
      if (!appId) continue;
      apps[appId] = Object.freeze({
        status: cleanStatus(record?.status),
        updatedAt: record?.updatedAt || null,
      });
    }
  }
  return Object.freeze({
    schema: SNAPSHOT_SCHEMA,
    enabled,
    connected,
    studio: Object.freeze({
      status: cleanStatus(raw?.studio?.status),
      updatedAt: raw?.studio?.updatedAt || null,
    }),
    apps: Object.freeze(apps),
    updatedAt: raw?.updatedAt || null,
  });
}

export function disconnectedOperationalStatus() {
  return normaliseSnapshot(null, { enabled: false, connected: false });
}

export function statusFor(snapshot, appId) {
  if (appId === "ai-studio") return cleanStatus(snapshot?.studio?.status);
  return cleanStatus(snapshot?.apps?.[appId]?.status);
}

export function statusLabel(status, language = "cs") {
  const labels = {
    operational: { cs: "Funkční", en: "Operational" },
    maintenance: { cs: "Probíhá údržba", en: "Maintenance" },
    outage: { cs: "Mimo provoz", en: "Out of service" },
  };
  const item = labels[cleanStatus(status)];
  return item[language] || item.cs;
}

export function nextOperationalStatus(status) {
  if (status === "operational") return "maintenance";
  if (status === "maintenance") return "outage";
  return "operational";
}

export async function loadOperationalStatus(deploymentReady, fetchImpl = fetch) {
  const config = await deploymentReady;
  if (!enabledFor(config)) return disconnectedOperationalStatus();
  const endpoint = endpointFor(config);
  try {
    const response = await fetchImpl(endpoint, {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error(`Operational status: ${response.status}`);
    const raw = await response.json();
    if (raw?.schema !== SNAPSHOT_SCHEMA)
      throw new TypeError("Neplatné schéma provozního stavu.");
    return normaliseSnapshot(raw);
  } catch (error) {
    console.warn("AI Studio: centrální provozní stav se nepodařilo načíst.", error);
    return normaliseSnapshot(null, { enabled: true, connected: false });
  }
}

export async function setOperationalStatus(
  deploymentReady,
  targetId,
  status,
  fetchImpl = fetch,
) {
  const config = await deploymentReady;
  if (!enabledFor(config))
    throw new Error("Centrální řízení provozu není na tomto profilu aktivní.");
  if (!targetId || !VALID_STATUSES.has(status))
    throw new TypeError("Neplatný cíl nebo provozní stav.");

  const response = await fetchImpl(endpointFor(config), {
    method: "PUT",
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      schema: UPDATE_SCHEMA,
      targetId,
      status,
    }),
  });
  if (!response.ok) throw new Error(`Operational status update: ${response.status}`);
  const raw = await response.json();
  if (raw?.schema !== SNAPSHOT_SCHEMA)
    throw new TypeError("Server vrátil neplatné schéma provozního stavu.");
  return normaliseSnapshot(raw);
}

export const OPERATIONAL_STATUS_SCHEMA = SNAPSHOT_SCHEMA;
