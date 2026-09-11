/* AI Studio GHRAB — Studio Bridge 2.0 compatibility facade. */
(function (global) {
  "use strict";
  const WORKSPACE_KEY = "ghrab.ai-studio.workspace.v1";
  const LEGACY_WORKSPACE_KEY = "ghrab.workspace.v1";
  const parse = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch { return fallback; }
  };
  const validMaterial = (material) => Boolean(
    material && material.schema === "ghrab-material-v1" && material.id &&
    material.content && typeof material.content === "object"
  );
  const bridge = () => global.GHRAB_PLATFORM?.bridge || null;
  function peek(target) { return bridge()?.peek?.({ target, maxBytes: 500000 }) || null; }
  function consume(target) { return bridge()?.take?.({ target, maxBytes: 500000 }) || null; }
  function create(target, material, ttlMinutes = 30) {
    if (!validMaterial(material)) throw new Error("Invalid GHRAB Material v1");
    if (!bridge()?.create) return null;
    return bridge().create({
      target,
      sourceAppId: global.GHRAB_PLATFORM?.appId || "ai-studio",
      sourceAppVersion: global.GHRAB_PLATFORM?.appVersion || "unknown",
      ttlMs: Math.max(1, Number(ttlMinutes || 30)) * 60000,
      studioUrl: new URL("./", location.href).href,
      material,
      writeLegacy: true,
    });
  }
  function workspace() {
    const current = parse(WORKSPACE_KEY, null);
    const legacy = current === null ? parse(LEGACY_WORKSPACE_KEY, []) : current;
    return Array.isArray(legacy) ? legacy : [];
  }
  function save(material) {
    if (!validMaterial(material)) throw new Error("Invalid GHRAB Material v1");
    const list = workspace();
    const index = list.findIndex((item) => item.id === material.id);
    if (index >= 0) list[index] = material; else list.unshift(material);
    try { localStorage.setItem(WORKSPACE_KEY, JSON.stringify(list.slice(0, 20))); return material; }
    catch (error) { console.warn("Studio Bridge: workspace write failed", error); return null; }
  }
  function studioUrl(payload) {
    try { return new URL(payload?.studioUrl || global.__GHRAB_DEPLOYMENT_CONFIG__?.studioBaseUrl || "./", location.href).href; }
    catch { return new URL("./", location.href).href; }
  }
  global.GHRABStudioBridge = Object.freeze({
    version: "2.0.0", contract: "ghrab-studio-handoff-v2", peek, consume, create,
    workspace, save, studioUrl, validMaterial,
  });
})(window);
