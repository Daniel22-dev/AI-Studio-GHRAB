/* AI Studio GHRAB: legacy-compatible facade. Workspace authority is GHRAB core. */
(function (global) {
  "use strict";
  const CURRENT = "ghrab.ai-studio.workspace.v1";
  const LEGACY = "ghrab.workspace.v1";
  const parse = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch { return fallback; }
  };
  const validMaterial = (m) => Boolean(m && m.schema === "ghrab-material-v1" && typeof m.id === "string" && m.id && m.content && typeof m.content === "object");
  const bridge = () => global.GHRAB_PLATFORM?.bridge || null;
  function pending() { return bridge()?.peek?.({ allowAnyTarget: true, maxBytes: 500000 }) || null; }
  function peek(target) {
    const packet = pending();
    return packet && packet.target === target ? packet : null;
  }
  function consume(target) {
    if (!peek(target)) return null;
    return bridge()?.take?.({ target, maxBytes: 500000 }) || null;
  }
  function create(target, material, ttlMinutes = 30) {
    if (!validMaterial(material)) throw new TypeError("Invalid GHRAB Material v1");
    const admission = global.GHRAB?.checkOutboundMaterial?.(material);
    if (!admission?.ok) throw new Error("Material admission unavailable or unsafe");
    if (pending()) return null;
    if (!bridge()?.create) return null;
    return bridge().create({
      target,
      sourceAppId: global.GHRAB_PLATFORM?.appId || "ai-studio",
      sourceAppVersion: global.GHRAB_PLATFORM?.appVersion || "unknown",
      ttlMs: Math.min(1440, Math.max(1, Number(ttlMinutes) || 30)) * 60000,
      studioUrl: new URL("./", location.href).href,
      material,
      writeLegacy: true,
    });
  }
  function workspace() {
    if (typeof global.GHRAB?.getWorkspace === "function") return global.GHRAB.getWorkspace();
    const modern = parse(CURRENT, []), older = parse(LEGACY, []);
    const map = new Map();
    for (const item of [...(Array.isArray(older) ? older : []), ...(Array.isArray(modern) ? modern : [])]) {
      if (validMaterial(item)) map.set(item.id, item);
    }
    return [...map.values()].slice(0, 20);
  }
  function save(material) {
    if (typeof global.GHRAB?.saveWorkspaceMaterial === "function") return global.GHRAB.saveWorkspaceMaterial(material);
    if (!validMaterial(material)) throw new TypeError("Invalid GHRAB Material v1");
    const list = workspace().filter((item) => item.id !== material.id);
    list.unshift(material);
    const value = JSON.stringify(list.slice(0, 20));
    const previous = [localStorage.getItem(CURRENT), localStorage.getItem(LEGACY)];
    try { localStorage.setItem(CURRENT, value); localStorage.setItem(LEGACY, value); return material; }
    catch (error) {
      [CURRENT, LEGACY].forEach((key, i) => { try { if (previous[i] === null) localStorage.removeItem(key); else localStorage.setItem(key, previous[i]); } catch {} });
      console.warn("Studio Bridge: workspace write failed", error);
      return null;
    }
  }
  function studioUrl(payload) {
    try {
      const candidate = new URL(payload?.studioUrl || global.__GHRAB_DEPLOYMENT_CONFIG__?.studioBaseUrl || "./", location.href);
      if (candidate.origin === location.origin && /^(https:|http:)$/.test(candidate.protocol)) return candidate.href;
    } catch {}
    return new URL("./", location.href).href;
  }
  global.GHRABStudioBridge = Object.freeze({
    version: "2.1.0", contract: "ghrab-studio-handoff-v2", peek, consume, create,
    workspace, save, studioUrl, validMaterial,
  });
})(window);
