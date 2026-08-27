const DEFAULT_TTL_MS = 30 * 60 * 1000;

function normaliseStudioRoot(value) {
  const url = new URL(String(value || ""), globalThis.location?.href || "http://localhost/");
  if (!url.pathname.endsWith("/")) url.pathname += "/";
  url.search = "";
  url.hash = "";
  return url;
}

/**
 * Shared source-app contract for the button "Uložit do AI Studia".
 *
 * This is intentionally transport-only. The source application remains the
 * editor; AI Studio receives a GHRAB Material v1 package and stores it in the
 * user's workspace. In the future school-server profile the transport can be
 * replaced by a one-time server handoff without changing the user-facing flow.
 */
export function saveMaterialToStudio({
  material,
  studioUrl,
  sourceAppId,
  sourceAppVersion,
  navigate = true,
  ttlMs = DEFAULT_TTL_MS,
} = {}) {
  const bridge = globalThis.GHRAB_PLATFORM?.bridge;
  if (typeof bridge?.create !== "function") {
    throw new Error("GHRAB Platform Bridge v2 is not available.");
  }
  if (!material || material.schema !== "ghrab-material-v1") {
    throw new Error("A valid GHRAB Material v1 package is required.");
  }
  const configuredStudioUrl =
    studioUrl || globalThis.__GHRAB_DEPLOYMENT_CONFIG__?.studioBaseUrl;
  if (!configuredStudioUrl) {
    throw new Error("AI Studio URL is not configured.");
  }
  const root = normaliseStudioRoot(configuredStudioUrl);
  const packet = bridge.create({
    target: "ai-studio",
    targetVersionRange: ">=0.21.6 <1.0.0",
    sourceAppId: String(sourceAppId || document.documentElement.dataset.ghrabAppId || "unknown-app"),
    sourceAppVersion: String(sourceAppVersion || document.documentElement.dataset.ghrabAppVersion || "0.0.0"),
    studioUrl: root.href,
    ttlMs,
    material,
    writeLegacy: true,
  });
  const targetUrl = new URL("library/?studioHandoff=1", root).href;
  if (navigate) globalThis.location.assign(targetUrl);
  return { packet, targetUrl };
}
