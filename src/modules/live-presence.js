const SNAPSHOT_SCHEMA = "ghrab-live-presence-v1";
const HEARTBEAT_SCHEMA = "ghrab-live-presence-heartbeat-v1";
const HEARTBEAT_MS = 45000;
const STALE_SECONDS = 120;

function endpoint(config) {
  const name=String(config?.endpoints?.presence||"").trim();
  if(!name||!config?.apiBaseUrl)return "";
  const base=new URL(String(config.apiBaseUrl).replace(/\/*$/,"/"),globalThis.location?.origin||"http://localhost").href;
  return new URL(name.replace(/^\/+/,""),base).href;
}
function capabilities(config) {
  const prepared =
    config?.features?.livePresenceReady === true &&
    Boolean(String(config?.endpoints?.presence || "").trim());
  return {
    prepared,
    enabled: Boolean(
      prepared &&
        endpoint(config) &&
        config?.features?.schoolServerConnected === true &&
        config?.features?.livePresence === true &&
        config?.authMode === "server-session",
    ),
    endpoint: endpoint(config),
  };
}
function headers(json = false) {
  const session = globalThis.__GHRAB_SERVER_SESSION__;
  const token = String(session?.requestToken || session?.csrfToken || "");
  return {
    Accept: "application/json",
    ...(json ? { "Content-Type": "application/json" } : {}),
    ...(token
      ? { Authorization: `Bearer ${token}`, "X-GHRAB-CSRF": token }
      : {}),
  };
}
function iso(value) {
  const parsed = Date.parse(String(value || "").trim().slice(0, 64));
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}
function user(record) {
  if (!record || typeof record !== "object") return null;
  const displayName = String(record.displayName || record.name || "")
    .trim()
    .slice(0, 120);
  const appId = String(record.appId || "").trim().slice(0, 64);
  const lastSeenAt = iso(record.lastSeenAt);
  return displayName && appId && lastSeenAt
    ? Object.freeze({ displayName, appId, lastSeenAt })
    : null;
}
function snapshot(raw, state = {}) {
  const users = Array.isArray(raw?.users)
    ? raw.users.map(user).filter(Boolean)
    : [];
  users.sort((a, b) => Date.parse(b.lastSeenAt) - Date.parse(a.lastSeenAt));
  return Object.freeze({
    schema: SNAPSHOT_SCHEMA,
    prepared: state.prepared ?? true,
    enabled: state.enabled ?? true,
    connected: state.connected ?? true,
    users: Object.freeze(users),
    staleAfterSeconds: Math.max(
      30,
      Math.min(600, Number(raw?.staleAfterSeconds || STALE_SECONDS)),
    ),
  });
}

export async function sendLivePresenceHeartbeat(
  config,
  { appId, fetchImpl = fetch } = {},
) {
  const caps = capabilities(config);
  if (!caps.enabled)
    return { ok: false, skipped: true };
  const id = String(appId || "").trim().slice(0, 64);
  if (!id) throw new TypeError("Presence requires appId.");
  const response = await fetchImpl(caps.endpoint, {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    keepalive: true,
    headers: headers(true),
    body: JSON.stringify({ schema: HEARTBEAT_SCHEMA, appId: id }),
  });
  if (!response.ok) throw new Error(`Live presence heartbeat: ${response.status}`);
  return { ok: true };
}

export async function loadLivePresence(deploymentReady, fetchImpl = fetch) {
  const config = await deploymentReady;
  const caps = capabilities(config);
  if (!caps.enabled)
    return snapshot(null, {
      prepared: caps.prepared,
      enabled: false,
      connected: false,
    });
  try {
    const response = await fetchImpl(caps.endpoint, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      headers: headers(),
    });
    if (!response.ok) throw new Error(`Live presence: ${response.status}`);
    const raw = await response.json();
    if (raw?.schema !== SNAPSHOT_SCHEMA)
      throw new TypeError("Invalid presence schema.");
    return snapshot(raw);
  } catch (error) {
    console.warn("AI Studio: live presence could not be loaded.", error);
    return snapshot(null, { prepared: true, enabled: true, connected: false });
  }
}

export async function startLivePresenceHeartbeat(
  deploymentReady,
  {
    appId,
    fetchImpl = fetch,
    intervalMs = HEARTBEAT_MS,
    documentRef = document,
    windowRef = window,
  } = {},
) {
  if (!appId) throw new TypeError("Presence requires appId.");
  const config = await deploymentReady;
  if (!capabilities(config).enabled) return () => {};

  const key = `__GHRAB_LIVE_PRESENCE_${String(appId).replace(/[^a-z0-9]/gi, "_")}__`;
  if (globalThis[key]) return globalThis[key];
  let stopped = false;
  let inFlight = false;
  const active = () =>
    !stopped &&
    documentRef?.visibilityState !== "hidden" &&
    (typeof documentRef?.hasFocus !== "function" || documentRef.hasFocus());
  const beat = async () => {
    if (!active() || inFlight) return;
    inFlight = true;
    try {
      await sendLivePresenceHeartbeat(config, { appId, fetchImpl });
    } catch (error) {
      console.warn(`GHRAB live presence (${appId}) heartbeat failed.`, error);
    } finally {
      inFlight = false;
    }
  };
  const onActive = () => {
    if (active()) void beat();
  };
  documentRef?.addEventListener?.("visibilitychange", onActive, { passive: true });
  windowRef?.addEventListener?.("focus", onActive, { passive: true });
  windowRef?.addEventListener?.("pageshow", onActive, { passive: true });
  const timer = windowRef?.setInterval?.(
    () => void beat(),
    Math.max(15000, Number(intervalMs) || HEARTBEAT_MS),
  );
  void beat();

  const stop = () => {
    if (stopped) return;
    stopped = true;
    if (timer) windowRef?.clearInterval?.(timer);
    documentRef?.removeEventListener?.("visibilitychange", onActive);
    windowRef?.removeEventListener?.("focus", onActive);
    windowRef?.removeEventListener?.("pageshow", onActive);
    if (globalThis[key] === stop) delete globalThis[key];
  };
  windowRef?.addEventListener?.("pagehide", stop, { once: true });
  globalThis[key] = stop;
  return stop;
}
