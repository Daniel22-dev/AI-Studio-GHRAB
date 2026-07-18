import { validateMaterialPackage } from "./shared/material-validator.js";
import { buildPilotSummary } from "./shared/safe-export.js";
import {
  initialiseAccess,
  setPermitToken,
  clearPermit,
  readPermitFile,
  getAccessSnapshot,
  getPermitToken,
  isAdmin,
  hasAppAccess,
  requiredTraining,
  formatReason,
  inspectPermitToken,
} from "./access/access-control.js";
const VERSION = "__APP_VERSION__";
const root = document.documentElement;
const page = document.body.dataset.page || "home";
const base = document.body.dataset.base || (page === "home" ? "./" : "../");
const state = {
  language: safeGetItem("ghrab.language") || "cs",
  theme: "dark",
  motion: safeGetItem("ghrab.motion") || "auto",
};
const MOTION_MODES = ["auto", "full", "lite", "off"];

const WORKSPACE_KEY = "ghrab.workspace.v1";
const HANDOFF_KEY = "ghrab.handoff.v1";
const PILOT_EVENTS_KEY = "ghrab.pilot.events.v2";
const TEST_LAUNCHES_KEY = "ghrab.pilot.test.launches";
const TEST_EVENTS_KEY = "ghrab.pilot.test.events.v2";
const TELEMETRY_MODE_KEY = "ghrab.pilot.telemetry.mode";
const FAVORITE_APPS_KEY = "ghrab.favoriteApps.v1";
const ISSUED_ACCESS_KEY = "ghrab.access.issued-registry.v1";
const ISSUED_ACCESS_SCHEMA = "ghrab-issued-access-registry-v1";
const HANDOFF_TTL_MS = 30 * 60 * 1000;
const WORKSPACE_SOFT_LIMIT_CHARS = 120000;
const t = (cs, en) => (state.language === "cs" ? cs : en);
const localised = (value) => {
  if (value == null) return "";
  if (typeof value === "string") return value;
  return value[state.language] || value.cs || value.en || "";
};

function applyLanguage() {
  root.lang = state.language;
  document.querySelectorAll("[data-cs][data-en]").forEach((el) => {
    el.textContent = el.dataset[state.language];
  });
  document.querySelectorAll("[data-cs-aria][data-en-aria]").forEach((el) => {
    el.setAttribute("aria-label", el.dataset[`${state.language}Aria`]);
  });
  document
    .querySelectorAll("[data-cs-placeholder][data-en-placeholder]")
    .forEach((el) => {
      el.setAttribute(
        "placeholder",
        el.dataset[`${state.language}Placeholder`],
      );
    });
  document
    .querySelectorAll("[data-lang]")
    .forEach((btn) =>
      btn.setAttribute(
        "aria-pressed",
        String(btn.dataset.lang === state.language),
      ),
    );
  document.title =
    document.body.dataset.titleEn && state.language === "en"
      ? document.body.dataset.titleEn
      : document.body.dataset.titleCs || "AI Studio GHRAB";
  document.dispatchEvent(
    new CustomEvent("ghrab:language", { detail: { language: state.language } }),
  );
}

function applyTheme() {
  state.theme = "dark";
  root.dataset.theme = "dark";
  safeRemoveItem("ghrab.theme");
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = "#030915";
}

function detectedMotionMode() {
  if (state.motion !== "auto") return state.motion;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const compact =
    matchMedia("(max-width: 700px)").matches ||
    matchMedia("(pointer: coarse)").matches;
  const saveData = Boolean(navigator.connection?.saveData);
  if (reduced) return "off";
  // On desktop the gateway animation remains fully visible even on ordinary school PCs.
  // The economy mode is reserved for mobile/coarse-pointer devices or explicit data saving.
  if (compact || saveData) return "lite";
  return "full";
}

function motionLabel() {
  const resolved = detectedMotionMode();
  const selected = state.motion;
  const names = {
    auto: t("automatické", "automatic"),
    full: t("plné", "full"),
    lite: t("úsporné", "economy"),
    off: t("vypnuté", "off"),
  };
  return selected === "auto"
    ? `${t("Animace", "Motion")}: ${names.auto} (${names[resolved]})`
    : `${t("Animace", "Motion")}: ${names[selected]}`;
}

function updateMotionButton() {
  const button = document.querySelector("[data-motion-toggle]");
  if (!button) return;
  const resolved = detectedMotionMode();
  const icons = { full: "✦", lite: "◌", off: "⏸" };
  button.textContent = state.motion === "auto" ? "A" : icons[resolved];
  button.dataset.mode = state.motion;
  button.setAttribute(
    "aria-label",
    `${motionLabel()}. ${t("Kliknutím změnit režim.", "Click to change mode.")}`,
  );
  button.title = `${motionLabel()} · ${t("kliknutím změnit", "click to change")}`;
}

function applyMotion() {
  root.dataset.motion = detectedMotionMode();
  root.dataset.motionPreference = state.motion;
  updateMotionButton();
  document.dispatchEvent(
    new CustomEvent("ghrab:motion", {
      detail: { selected: state.motion, resolved: root.dataset.motion },
    }),
  );
}

function showToast(message) {
  let toast = document.querySelector(".toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    document.body.append(toast);
  }
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 3600);
}

function safeGetItem(key, fallback = null) {
  try {
    const value = localStorage.getItem(key);
    return value == null ? fallback : value;
  } catch (error) {
    console.warn(`AI Studio: čtení localStorage selhalo pro ${key}`, error);
    return fallback;
  }
}

function storageErrorMessage(error) {
  const quota =
    error?.name === "QuotaExceededError" ||
    error?.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    error?.code === 22 ||
    error?.code === 1014;
  return quota
    ? t(
        "Místní úložiště je plné. Exportujte důležité materiály a smažte starší položky.",
        "Local storage is full. Export important resources and delete older items.",
      )
    : t(
        "Prohlížeč nepovolil uložení dat. Zkontrolujte soukromý režim nebo nastavení úložiště.",
        "The browser did not allow data to be saved. Check private mode or storage settings.",
      );
}
function safeSetItem(key, value, options = {}) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.warn(`AI Studio: zápis do localStorage selhal pro ${key}`, error);
    if (!options.silent) showToast(storageErrorMessage(error));
    return false;
  }
}
function safeSetJson(key, value, options = {}) {
  try {
    return safeSetItem(key, JSON.stringify(value), options);
  } catch (error) {
    console.warn(`AI Studio: serializace dat selhala pro ${key}`, error);
    if (!options.silent)
      showToast(
        t(
          "Data se nepodařilo připravit k uložení.",
          "The data could not be prepared for storage.",
        ),
      );
    return false;
  }
}
function safeRemoveItem(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.warn(
      `AI Studio: odstranění localStorage selhalo pro ${key}`,
      error,
    );
    return false;
  }
}
function storageUsage() {
  let bytes = 0;
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      const value = key ? localStorage.getItem(key) || "" : "";
      bytes += new Blob([key || "", value]).size;
    }
  } catch {
    /* best effort */
  }
  return {
    bytes,
    kilobytes: Math.round(bytes / 1024),
    megabytes: Math.round((bytes / 1024 / 1024) * 100) / 100,
  };
}
function validMaterial(material) {
  return validateMaterialPackage(material).valid;
}

function normaliseIssuedAccessRecord(input) {
  if (!input || typeof input !== "object") return null;
  const jti = String(input.jti || input.permitId || "").trim();
  if (!jti) return null;
  const numberOrNull = (value) =>
    value == null || value === "" ? null : Number(value);
  const rawIat = numberOrNull(input.iat);
  const rawNbf = numberOrNull(input.nbf);
  const rawExp = numberOrNull(input.exp);
  const iat = Number.isFinite(rawIat) ? rawIat : null;
  const nbf = Number.isFinite(rawNbf) ? rawNbf : null;
  const exp = Number.isFinite(rawExp) ? rawExp : null;
  const issuedAt =
    input.issuedAt ||
    input.createdAt ||
    (iat != null
      ? new Date(iat * 1000).toISOString()
      : new Date().toISOString());
  const expiresAt =
    input.expiresAt ||
    (exp != null ? new Date(exp * 1000).toISOString() : null);
  return {
    schema: "ghrab-issued-access-record-v1",
    jti,
    subject: String(input.subject || input.sub || "").trim(),
    displayName: String(
      input.displayName ||
        input.label ||
        input.subject ||
        input.sub ||
        "Neoznačený uživatel",
    ).trim(),
    role: String(input.role || "teacher").trim(),
    apps: [
      ...new Set(
        Array.isArray(input.apps) ? input.apps.map(String).filter(Boolean) : [],
      ),
    ],
    training:
      input.training && typeof input.training === "object"
        ? structuredClone(input.training)
        : {},
    iat,
    nbf,
    exp,
    issuedAt,
    expiresAt,
    source: ["issued", "imported", "backup"].includes(input.source)
      ? input.source
      : "imported",
    note: String(input.note || "").slice(0, 500),
    pendingRevocation: Boolean(input.pendingRevocation),
    supersededBy: input.supersededBy ? String(input.supersededBy) : null,
    supersededAt: input.supersededAt || null,
    createdAt: input.createdAt || issuedAt,
    importedAt: input.importedAt || null,
    updatedAt: input.updatedAt || new Date().toISOString(),
  };
}
function getIssuedAccessRecords() {
  try {
    const parsed = JSON.parse(safeGetItem(ISSUED_ACCESS_KEY, "null"));
    const source = Array.isArray(parsed) ? parsed : parsed?.records;
    if (!Array.isArray(source)) return [];
    return source
      .map(normaliseIssuedAccessRecord)
      .filter(Boolean)
      .sort(
        (a, b) => Date.parse(b.issuedAt || 0) - Date.parse(a.issuedAt || 0),
      );
  } catch (error) {
    console.warn(
      "AI Studio: evidenci vydaných přístupů se nepodařilo načíst.",
      error,
    );
    return [];
  }
}
function persistIssuedAccessRecords(records) {
  const clean = records
    .map(normaliseIssuedAccessRecord)
    .filter(Boolean)
    .sort((a, b) => Date.parse(b.issuedAt || 0) - Date.parse(a.issuedAt || 0));
  const ok = safeSetJson(ISSUED_ACCESS_KEY, {
    schema: ISSUED_ACCESS_SCHEMA,
    updatedAt: new Date().toISOString(),
    records: clean,
  });
  if (ok)
    document.dispatchEvent(
      new CustomEvent("ghrab:issued-access-changed", {
        detail: { count: clean.length },
      }),
    );
  return ok;
}
function recordIssuedAccess(permit, options = {}) {
  const incoming = normaliseIssuedAccessRecord({
    ...permit,
    subject: permit?.sub,
    source: options.source || "issued",
    createdAt: options.createdAt,
    issuedAt:
      options.createdAt ||
      (Number.isFinite(Number(permit?.iat))
        ? new Date(Number(permit.iat) * 1000).toISOString()
        : new Date().toISOString()),
    importedAt: options.source === "imported" ? new Date().toISOString() : null,
  });
  if (!incoming) return { ok: false, reason: "invalid-record" };
  const now = new Date().toISOString();
  const records = getIssuedAccessRecords().map((item) => {
    if (item.jti === incoming.jti) return item;
    if (
      incoming.subject &&
      item.subject === incoming.subject &&
      !item.supersededBy
    )
      return {
        ...item,
        supersededBy: incoming.jti,
        supersededAt: now,
        updatedAt: now,
      };
    return item;
  });
  const existing = records.find((item) => item.jti === incoming.jti);
  const merged = existing
    ? {
        ...existing,
        ...incoming,
        note: existing.note || incoming.note,
        pendingRevocation: existing.pendingRevocation,
        updatedAt: now,
      }
    : incoming;
  const next = [merged, ...records.filter((item) => item.jti !== incoming.jti)];
  return persistIssuedAccessRecords(next)
    ? { ok: true, record: merged }
    : { ok: false, reason: "storage-error" };
}
function updateIssuedAccessRecord(jti, patch = {}) {
  const target = String(jti || "").trim();
  if (!target) return false;
  let changed = false;
  const next = getIssuedAccessRecords().map((item) => {
    if (item.jti !== target) return item;
    changed = true;
    return normaliseIssuedAccessRecord({
      ...item,
      ...patch,
      jti: item.jti,
      updatedAt: new Date().toISOString(),
    });
  });
  return changed && persistIssuedAccessRecords(next);
}
function removeIssuedAccessRecord(jti) {
  const target = String(jti || "").trim();
  const records = getIssuedAccessRecords();
  const next = records.filter((item) => item.jti !== target);
  return next.length !== records.length && persistIssuedAccessRecords(next);
}
function importIssuedAccessRecords(records, options = {}) {
  if (!Array.isArray(records))
    return { ok: false, imported: 0, reason: "invalid-data" };
  const incoming = records
    .map((item) =>
      normaliseIssuedAccessRecord({
        ...item,
        source: item?.source || "backup",
        importedAt: item?.importedAt || new Date().toISOString(),
      }),
    )
    .filter(Boolean);
  if (!incoming.length) return { ok: false, imported: 0, reason: "empty" };
  const current = options.replace ? [] : getIssuedAccessRecords();
  const map = new Map(current.map((item) => [item.jti, item]));
  for (const item of incoming)
    map.set(item.jti, {
      ...map.get(item.jti),
      ...item,
      note: item.note || map.get(item.jti)?.note || "",
      updatedAt: new Date().toISOString(),
    });
  return persistIssuedAccessRecords([...map.values()])
    ? { ok: true, imported: incoming.length }
    : { ok: false, imported: 0, reason: "storage-error" };
}
function issuedAccessBackup() {
  return {
    schema: ISSUED_ACCESS_SCHEMA,
    exportedAt: new Date().toISOString(),
    records: getIssuedAccessRecords(),
  };
}

function createSettingsMenu() {
  const actions = document.querySelector(".header-actions");
  if (!actions) return null;
  const languageControl = actions.querySelector(".segmented");
  actions.querySelector("[data-theme-toggle]")?.remove();
  const wrapper = document.createElement("div");
  wrapper.className = "settings-menu";
  const button = document.createElement("button");
  button.className = "icon-button settings-toggle";
  button.type = "button";
  button.textContent = "⚙";
  button.setAttribute("aria-expanded", "false");
  button.setAttribute("aria-haspopup", "true");
  button.setAttribute(
    "aria-label",
    t("Nastavení rozhraní", "Interface settings"),
  );
  const panel = document.createElement("div");
  panel.className = "settings-panel";
  panel.hidden = true;
  const heading = document.createElement("strong");
  heading.textContent = t("Nastavení", "Settings");
  const languageLabel = document.createElement("span");
  languageLabel.className = "settings-label";
  languageLabel.textContent = t("Jazyk", "Language");
  if (languageControl) panel.append(heading, languageLabel, languageControl);
  else panel.append(heading);
  const motionButton = document.createElement("button");
  motionButton.className = "settings-action";
  motionButton.type = "button";
  motionButton.dataset.motionToggle = "";
  const fullscreenButton = document.createElement("button");
  fullscreenButton.className = "settings-action";
  fullscreenButton.type = "button";
  fullscreenButton.dataset.fullscreenToggle = "";
  panel.append(motionButton, fullscreenButton);
  wrapper.append(button, panel);
  actions.replaceChildren(wrapper);
  const close = () => {
    panel.hidden = true;
    button.setAttribute("aria-expanded", "false");
  };
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    const open = panel.hidden;
    panel.hidden = !open;
    button.setAttribute("aria-expanded", String(open));
  });
  document.addEventListener("click", (event) => {
    if (!wrapper.contains(event.target)) close();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close();
  });
  document.addEventListener("ghrab:language", () => {
    button.setAttribute(
      "aria-label",
      t("Nastavení rozhraní", "Interface settings"),
    );
    heading.textContent = t("Nastavení", "Settings");
    languageLabel.textContent = t("Jazyk", "Language");
    updateMotionButton();
    updateFullscreenButton();
  });
  return { motionButton, fullscreenButton };
}

function setupMotionControl(button) {
  if (!button) return;
  button.addEventListener("click", () => {
    const index = MOTION_MODES.indexOf(state.motion);
    state.motion = MOTION_MODES[(index + 1) % MOTION_MODES.length];
    safeSetItem("ghrab.motion", state.motion);
    applyMotion();
    showToast(motionLabel());
  });
  const media = matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener?.("change", () => {
    if (state.motion === "auto") applyMotion();
  });
}

function fullscreenElement() {
  return document.fullscreenElement || document.webkitFullscreenElement || null;
}

function updateFullscreenButton() {
  const button = document.querySelector("[data-fullscreen-toggle]");
  if (!button) return;
  const active = Boolean(fullscreenElement());
  button.textContent = active
    ? `⤢ ${t("Ukončit celou obrazovku", "Exit full screen")}`
    : `⛶ ${t("Celá obrazovka", "Full screen")}`;
  button.setAttribute("aria-pressed", String(active));
  button.setAttribute(
    "aria-label",
    active
      ? t("Ukončit celou obrazovku", "Exit full screen")
      : t("Zobrazit na celou obrazovku", "Enter full screen"),
  );
  root.classList.toggle("is-fullscreen", active);
}

async function toggleFullscreen() {
  const target = document.documentElement;
  try {
    if (fullscreenElement()) {
      if (document.exitFullscreen) await document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      return;
    }
    if (target.requestFullscreen) {
      await target.requestFullscreen({ navigationUI: "hide" });
      return;
    }
    if (target.webkitRequestFullscreen) {
      target.webkitRequestFullscreen();
      return;
    }
    showToast(
      t(
        "Tento prohlížeč nepodporuje celou obrazovku. Na telefonu nainstalujte AI Studio na plochu.",
        "This browser does not support full screen. Install AI Studio to the home screen on mobile.",
      ),
    );
  } catch {
    showToast(
      t(
        "Celou obrazovku se nepodařilo aktivovat. Zkuste F11 nebo nainstalovanou PWA.",
        "Full screen could not be activated. Try F11 or the installed PWA.",
      ),
    );
  }
}

function setupFullscreenControl(button) {
  button?.addEventListener("click", toggleFullscreen);
  document.addEventListener("fullscreenchange", updateFullscreenButton);
  document.addEventListener("webkitfullscreenchange", updateFullscreenButton);
  updateFullscreenButton();
}

function setupNavigation() {
  const navToggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".main-nav");
  navToggle?.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", String(open));
  });
  document.querySelectorAll(".main-nav a").forEach((a) =>
    a.addEventListener("click", () => {
      nav?.classList.remove("open");
      navToggle?.setAttribute("aria-expanded", "false");
    }),
  );
  const activeNavPage = ["issuer", "access-registry"].includes(page)
    ? "automation"
    : page;
  document
    .querySelector(`.main-nav a[data-nav="${activeNavPage}"]`)
    ?.setAttribute("aria-current", "page");
}

function updateAdminVisibility() {
  const admin = isAdmin();
  root.classList.toggle("access-admin", admin);
  document
    .querySelectorAll("[data-admin-nav],[data-admin-link],[data-admin-only]")
    .forEach((node) => {
      node.hidden = !admin;
    });
}

function setupChrome() {
  const controls = createSettingsMenu();
  setupMotionControl(controls?.motionButton);
  setupFullscreenControl(controls?.fullscreenButton);
  setupNavigation();
  document.querySelectorAll("[data-lang]").forEach((btn) =>
    btn.addEventListener("click", () => {
      state.language = btn.dataset.lang;
      safeSetItem("ghrab.language", state.language);
      applyLanguage();
    }),
  );
  document.addEventListener("ghrab:access-changed", updateAdminVisibility);
  updateAdminVisibility();
}

function getLaunches() {
  try {
    return JSON.parse(safeGetItem("ghrab.pilot.launches", "{}"));
  } catch {
    return {};
  }
}
function getTestLaunches() {
  try {
    return JSON.parse(safeGetItem(TEST_LAUNCHES_KEY, "{}"));
  } catch {
    return {};
  }
}
function getTelemetryMode() {
  return safeGetItem(TELEMETRY_MODE_KEY) === "test" ? "test" : "live";
}
function setTelemetryMode(mode) {
  const next = mode === "test" ? "test" : "live";
  safeSetItem(TELEMETRY_MODE_KEY, next, { silent: true });
  document.dispatchEvent(
    new CustomEvent("ghrab:telemetry-mode", { detail: { mode: next } }),
  );
  updateTelemetryModeBanner();
  return next;
}
function clearTestTelemetry() {
  safeRemoveItem(TEST_LAUNCHES_KEY);
  safeRemoveItem(TEST_EVENTS_KEY);
  document.dispatchEvent(new CustomEvent("ghrab:test-telemetry-cleared"));
}
function telemetryEventKey() {
  return isAdmin() && getTelemetryMode() === "test"
    ? TEST_EVENTS_KEY
    : PILOT_EVENTS_KEY;
}
function updateTelemetryModeBanner() {
  document.querySelector(".telemetry-test-banner")?.remove();
  if (!isAdmin() || getTelemetryMode() !== "test") return;
  const banner = document.createElement("div");
  banner.className = "telemetry-test-banner";
  banner.innerHTML = `<strong>${t("TESTOVACÍ REŽIM MĚŘENÍ", "TELEMETRY TEST MODE")}</strong><span>${t("Spuštění, aktivní čas a výstupy správce se ukládají odděleně a nevstupují do pilotního reportu.", "Administrator launches, active time and outputs are stored separately and excluded from the pilot report.")}</span>`;
  document.body.prepend(banner);
}
function recordLaunch(id) {
  const launches = getLaunches();
  const item = launches[id] || { count: 0, lastOpened: null };
  const now = new Date();
  const timestamp = now.toISOString();
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  item.count = Math.max(0, Number(item.count || 0)) + 1;
  item.lastOpened = timestamp;
  item.monthly =
    item.monthly &&
    typeof item.monthly === "object" &&
    !Array.isArray(item.monthly)
      ? item.monthly
      : {};
  const bucket =
    item.monthly[period] && typeof item.monthly[period] === "object"
      ? item.monthly[period]
      : {};
  bucket.count = Math.max(0, Number(bucket.count || 0)) + 1;
  bucket.lastOpened = timestamp;
  bucket.activeSeconds = Math.max(0, Number(bucket.activeSeconds || 0));
  bucket.activeSessions = Math.max(0, Number(bucket.activeSessions || 0));
  bucket.lastActiveAt = bucket.lastActiveAt || null;
  item.monthly[period] = bucket;
  launches[id] = item;
  return safeSetJson("ghrab.pilot.launches", launches);
}

function parseLocal(key, fallback) {
  try {
    return JSON.parse(safeGetItem(key, JSON.stringify(fallback)));
  } catch {
    return fallback;
  }
}
function getWorkspace() {
  const list = parseLocal(WORKSPACE_KEY, []);
  return Array.isArray(list) ? list : [];
}
function saveWorkspaceMaterial(material) {
  const list = getWorkspace();
  const copy =
    typeof structuredClone === "function"
      ? structuredClone(material)
      : JSON.parse(JSON.stringify(material));
  copy.provenance = copy.provenance || {};
  copy.provenance.updatedAt = new Date().toISOString();
  const index = list.findIndex((item) => item.id === copy.id);
  if (index >= 0) list[index] = copy;
  else list.unshift(copy);
  const sourceLength = String(copy.content?.sourceText || "").length;
  if (sourceLength > WORKSPACE_SOFT_LIMIT_CHARS) {
    showToast(
      t(
        `Zdrojový text má ${sourceLength.toLocaleString("cs-CZ")} znaků. Uložení může zabrat výraznou část místního úložiště.`,
        `The source text has ${sourceLength.toLocaleString("en-GB")} characters. Saving it may use a significant part of local storage.`,
      ),
    );
  }
  return safeSetJson(WORKSPACE_KEY, list.slice(0, 20)) ? copy : null;
}
function deleteWorkspaceMaterial(id) {
  return safeSetJson(
    WORKSPACE_KEY,
    getWorkspace().filter((item) => item.id !== id),
  );
}
function createHandoff(target, material) {
  if (!validMaterial(material)) throw new Error("Invalid GHRAB Material v1");
  const payload = {
    schema: "ghrab-handoff-v1",
    target,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + HANDOFF_TTL_MS).toISOString(),
    source: "ai-studio-ghrab",
    portalVersion: VERSION,
    studioUrl: new URL(base, location.href).href,
    material,
  };
  return safeSetJson(HANDOFF_KEY, payload) ? payload : null;
}
function readHandoff() {
  const payload = parseLocal(HANDOFF_KEY, null);
  if (!payload || payload.schema !== "ghrab-handoff-v1") return null;
  if (Date.parse(payload.expiresAt || "") < Date.now()) {
    safeRemoveItem(HANDOFF_KEY);
    return null;
  }
  return payload;
}
function clearHandoff() {
  return safeRemoveItem(HANDOFF_KEY);
}
function getPilotEvents() {
  const list = parseLocal(PILOT_EVENTS_KEY, []);
  return Array.isArray(list) ? list : [];
}
function getTestPilotEvents() {
  const list = parseLocal(TEST_EVENTS_KEY, []);
  return Array.isArray(list) ? list : [];
}
function recordPilotEvent(event) {
  const key = telemetryEventKey();
  const item = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    at: new Date().toISOString(),
    ...event,
  };
  const list = parseLocal(key, []);
  const safeList = Array.isArray(list) ? list : [];
  safeList.push(item);
  return safeSetJson(key, safeList.slice(-2000)) ? item : null;
}
function clearPilotEvents() {
  return safeRemoveItem(PILOT_EVENTS_KEY);
}
function downloadJson(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2) + "\n"], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function anonymousSourceId(period = currentPilotPeriod()) {
  const key = `ghrab.pilot.anonymous-source-id.${period}`;
  const existing = safeGetItem(key);
  if (existing) return existing;
  const value =
    globalThis.crypto?.randomUUID?.() ||
    `device-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  safeSetItem(key, value, { silent: true });
  return value;
}
function currentPilotPeriod(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
function pilotSummaryPayload(period = currentPilotPeriod()) {
  return buildPilotSummary({
    portalVersion: VERSION,
    currentPhase: Number(safeGetItem("ghrab.pilot.phase") || 1),
    sourceId: anonymousSourceId(period),
    period,
    launches: getLaunches(),
    events: getPilotEvents(),
    workspace: getWorkspace(),
  });
}
function reportReminderKeys(date = new Date()) {
  const month = monthlyReminderId(date);
  return {
    sent: `ghrab.pilot.report-reminder.sent.${month}`,
    downloaded: `ghrab.pilot.report-reminder.downloaded.${month}`,
    snooze: `ghrab.pilot.report-reminder.snooze.${month}`,
    shown: `ghrab.pilot.report-reminder.shown.${month}`,
  };
}
function downloadPilotSummary() {
  const date = new Date();
  const filenameDate = date.toISOString().slice(0, 10);
  downloadJson(
    pilotSummaryPayload(),
    `ghrab-pilot-anonymni-souhrn-${filenameDate}.json`,
  );
  safeSetItem(reportReminderKeys(date).downloaded, date.toISOString(), {
    silent: true,
  });
}
function isMonthlyReminderWindow(date = new Date()) {
  const lastDay = new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0,
  ).getDate();
  return date.getDate() >= Math.max(1, lastDay - 6);
}
function monthlyReminderId(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
function localDateId(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function tomorrowMorning(date = new Date()) {
  const next = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + 1,
    8,
    0,
    0,
    0,
  );
  return next.getTime();
}
function setupMonthlyReportReminder(options = {}) {
  const force = Boolean(options.force);
  const snapshot = getAccessSnapshot();
  if (
    !snapshot.valid ||
    (!force &&
      (snapshot.permit?.role === "admin" || !isMonthlyReminderWindow()))
  )
    return;
  const keys = reportReminderKeys();
  const sentKey = keys.sent;
  const downloadedKey = keys.downloaded;
  const snoozeKey = keys.snooze;
  const shownKey = keys.shown;
  if (!force && safeGetItem(sentKey)) return;
  const snoozeUntil = Number(safeGetItem(snoozeKey) || 0);
  if (!force && snoozeUntil > Date.now()) return;
  if (!force && safeGetItem(shownKey) === localDateId()) return;
  if (document.querySelector(".monthly-report-dialog")) return;
  if (!force) safeSetItem(shownKey, localDateId(), { silent: true });

  const backdrop = document.createElement("div");
  backdrop.className = "monthly-report-backdrop";
  const dialog = document.createElement("section");
  dialog.className = "monthly-report-dialog";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-labelledby", "monthly-report-title");
  const mark = document.createElement("div");
  mark.className = "monthly-report-mark";
  mark.textContent = "▤";
  const eyebrow = document.createElement("p");
  eyebrow.className = "eyebrow";
  eyebrow.textContent = t("MĚSÍČNÍ SOUHRN PILOTU", "MONTHLY PILOT SUMMARY");
  const title = document.createElement("h2");
  title.id = "monthly-report-title";
  title.textContent = t(
    "Mohu vás poprosit o anonymní souhrn?",
    "May I ask you for an anonymous summary?",
  );
  const description = document.createElement("p");
  description.textContent = t(
    "Není to vaše povinnost, ale je to má osobní prosba. Vedení bude chtít vidět, které nástroje se skutečně používají, kolik času v nich trávíme a kolik anonymních výstupů vzniká. Soubor neobsahuje jména, prompty ani obsah vytvořených materiálů.",
    "This is not an obligation, but a personal request. School leadership will want to see which tools are used, how much active time is spent in them and how many anonymous outputs are created. The file contains no names, prompts or generated content.",
  );
  const status = document.createElement("p");
  status.className = "monthly-report-note";
  status.textContent = safeGetItem(downloadedKey)
    ? t(
        "Souhrn už byl na tomto zařízení stažen. Po jeho přiložení ke školnímu e-mailu prosím potvrďte odeslání.",
        "The summary has already been downloaded on this device. After attaching it to the school email, please confirm that it was sent.",
      )
    : t(
        "Prosba se zobrazuje během posledních sedmi dnů měsíce, dokud nepotvrdíte odeslání. Používáte-li Studio na dvou zařízeních, odešlete jeden soubor z každého.",
        "This request appears during the final seven days of the month until you confirm sending it. If you use the Studio on two devices, send one file from each.",
      );
  const actions = document.createElement("div");
  actions.className = "monthly-report-actions";
  const download = document.createElement("button");
  download.type = "button";
  download.className = "button primary";
  download.textContent = t(
    "Stáhnout anonymní souhrn",
    "Download anonymous summary",
  );
  const guide = document.createElement("a");
  guide.className = "button secondary";
  guide.href = new URL(
    "manualy/pilot-report.html",
    new URL(base, location.href),
  ).href;
  guide.textContent = t("Otevřít krátký návod", "Open the short guide");
  const later = document.createElement("button");
  later.type = "button";
  later.className = "button ghost";
  later.textContent = t("Připomenout zítra", "Remind me tomorrow");
  const sent = document.createElement("button");
  sent.type = "button";
  sent.className = "button success";
  sent.textContent = t(
    "Souhrn jsem již odeslal(a)",
    "I have already sent the summary",
  );
  sent.disabled = !safeGetItem(downloadedKey);
  sent.title = sent.disabled
    ? t(
        "Nejprve stáhněte souhrn z tohoto zařízení.",
        "Download the summary from this device first.",
      )
    : "";
  const close = () => {
    backdrop.remove();
  };
  download.addEventListener("click", () => {
    downloadPilotSummary();
    safeSetItem(snoozeKey, String(tomorrowMorning()), { silent: true });
    close();
    showToast(
      t(
        "Děkuji. Souhrn je stažený; nyní jej prosím přiložte ke školnímu e-mailu. Připomenutí skončí po potvrzení odeslání.",
        "Thank you. The summary is downloaded; please attach it to the school email. Reminders stop after you confirm sending it.",
      ),
    );
  });
  guide.addEventListener("click", () => close());
  later.addEventListener("click", () => {
    safeSetItem(snoozeKey, String(tomorrowMorning()), { silent: true });
    close();
  });
  sent.addEventListener("click", () => {
    safeSetItem(sentKey, new Date().toISOString(), { silent: true });
    safeRemoveItem(snoozeKey);
    close();
    showToast(
      t(
        "Děkuji za odeslání anonymního souhrnu.",
        "Thank you for sending the anonymous summary.",
      ),
    );
  });
  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop) close();
  });
  dialog.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close();
  });
  actions.append(download, guide, later, sent);
  dialog.append(mark, eyebrow, title, description, status, actions);
  backdrop.append(dialog);
  document.body.append(backdrop);
  setTimeout(() => download.focus(), 20);
}

async function fetchJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  return response.json();
}
async function loadApps() {
  try {
    return await fetchJson(`${base}config/apps.generated.json`);
  } catch {
    return fetchJson(`${base}config/apps.fallback.json`);
  }
}
async function loadSyncReport() {
  try {
    return await fetchJson(`${base}config/sync-report.json`);
  } catch {
    return null;
  }
}
async function loadPermissions() {
  try {
    return await fetchJson(`${base}config/permissions.json`);
  } catch {
    return null;
  }
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function accessExplanation(access, appId) {
  if (access.enabled)
    return access.reason === "administrator"
      ? t("Správcovský přístup je aktivní.", "Administrator access is active.")
      : t(
          "Aplikace je odemčena vaším platným oprávněním.",
          "The application is unlocked by your valid permit.",
        );
  const training = requiredTraining(appId);
  if (access.reason === "app-not-permitted" && training) {
    return t(
      `Vyžaduje školení ${training.trainingCode} · verze ${training.trainingVersion}.`,
      `Requires training ${training.trainingCode} · version ${training.trainingVersion}.`,
    );
  }
  return formatReason(access.reason, state.language);
}
function accessChip(access, appId) {
  const chip = el(
    "span",
    `chip access-chip ${access.enabled ? "access-ok" : "access-locked"}`,
    access.enabled ? t("Odemčeno", "Unlocked") : t("Uzamčeno", "Locked"),
  );
  chip.title = accessExplanation(access, appId);
  return chip;
}
function permissionInfoFor(app) {
  return requiredTraining(app.id);
}
function permissionChip(info) {
  if (!info?.trainingRequired) return null;
  const label = t(
    `Školení ${info.trainingCode}`,
    `Training ${info.trainingCode}`,
  );
  const chip = el("span", "chip training-chip", label);
  chip.title = t(
    `Aktuální verze školení: ${info.trainingVersion || "—"}.`,
    `Current training version: ${info.trainingVersion || "—"}.`,
  );
  return chip;
}

function getFavoriteApps() {
  const list = parseLocal(FAVORITE_APPS_KEY, []);
  return Array.isArray(list) ? list.filter(Boolean).slice(0, 4) : [];
}
function setFavoriteApps(list) {
  safeSetJson(FAVORITE_APPS_KEY, [...new Set(list)].slice(0, 4));
  document.dispatchEvent(
    new CustomEvent("ghrab:favorites", {
      detail: { favorites: getFavoriteApps() },
    }),
  );
}
function toggleFavoriteApp(appId) {
  const current = getFavoriteApps().filter((id) => id !== appId);
  if (!getFavoriteApps().includes(appId)) current.unshift(appId);
  setFavoriteApps(current.slice(0, 4));
}
function selectCoreApps(apps) {
  if (apps.length <= 4) return { core: apps, extra: [] };
  const fav = getFavoriteApps();
  const byId = new Map(apps.map((app) => [app.id, app]));
  const core = fav.map((id) => byId.get(id)).filter(Boolean);
  for (const app of apps)
    if (core.length < 4 && !core.some((x) => x.id === app.id)) core.push(app);
  const coreIds = new Set(core.map((app) => app.id));
  return { core, extra: apps.filter((app) => !coreIds.has(app.id)) };
}

let portalLaunchInProgress = false;
function portalRingPreludeDelay() {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return 320;
  if (root.dataset.motion === "off") return 240;
  return 2000;
}
function portalAppCinematicDelay() {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return 380;
  if (root.dataset.motion === "off") return 260;
  return root.dataset.motion === "full" ? 2800 : 1350;
}
function portalLaunchOverlay(app, delay) {
  const overlay = document.querySelector("#portal-launch-overlay");
  if (!overlay) return { setPhase: () => {}, finish: () => {}, skip: null };
  const icon = overlay.querySelector("#portal-launch-icon");
  const kicker = overlay.querySelector("#portal-launch-kicker");
  const name = overlay.querySelector("#portal-launch-name");
  const phase = overlay.querySelector("#portal-launch-phase");
  const progress = overlay.querySelector("#portal-launch-progress");
  const skip = overlay.querySelector("#portal-launch-skip");
  const previousFocus =
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
  const escapeHandler = (event) => {
    if (event.key === "Escape" && skip?.onclick) skip.click();
  };
  const phaseCopy = {
    prepare: {
      kicker: t("APLIKACE ZAMĚŘENA", "APPLICATION TARGETED"),
      phase: t(
        "Brána dokončila dvousekundové navolení. Připravuji samostatnou animaci aplikace.",
        "The gateway has completed its two-second dialling sequence. Preparing the dedicated application animation.",
      ),
      progress: "16%",
    },
    align: {
      kicker: t("PŘESNÉ ZAROVNÁNÍ", "PRECISE ALIGNMENT"),
      phase: t(
        "Světelné vrstvy a prstence vybrané aplikace se synchronizují.",
        "The selected application's light layers and rings are synchronising.",
      ),
      progress: "44%",
    },
    verify: {
      kicker: t("OVĚŘENÍ CÍLE", "TARGET VERIFICATION"),
      phase: t(
        "Ověřuji přístup a stabilizuji koridor pro vybranou aplikaci.",
        "Verifying access and stabilising the corridor for the selected application.",
      ),
      progress: "72%",
    },
    open: {
      kicker: t("KORIDOR OTEVŘEN", "CORRIDOR OPEN"),
      phase: t(
        "Energetický horizont se plynule otevírá.",
        "The energy horizon is opening smoothly.",
      ),
      progress: "92%",
    },
    transit: {
      kicker: t("PŘECHOD AKTIVNÍ", "TRANSIT ACTIVE"),
      phase: t(
        "Předávám aplikaci do pracovního prostoru AI Studia.",
        "Handing the application over to the AI Studio workspace.",
      ),
      progress: "100%",
    },
    complete: {
      kicker: t("PŘECHOD DOKONČEN", "TRANSITION COMPLETE"),
      phase: t("Aplikace je připravena.", "The application is ready."),
      progress: "100%",
    },
  };
  const applyPhase = (key) => {
    const active = phaseCopy[key] || phaseCopy.prepare;
    overlay.dataset.phase = key;
    if (kicker) kicker.textContent = active.kicker;
    if (phase) phase.textContent = active.phase;
    if (progress) progress.style.width = active.progress;
  };
  overlay.style.setProperty("--launch-accent", app.accent || "#50e8ff");
  overlay.style.setProperty("--launch-duration", `${delay}ms`);
  if (icon) {
    icon.src = app.icon?.startsWith("http") ? app.icon : `${base}${app.icon}`;
    icon.alt = "";
  }
  if (name) name.textContent = localised(app.name);
  if (progress) {
    progress.style.transitionDuration = `${Math.max(200, delay - 160)}ms`;
    progress.style.width = "0%";
  }
  overlay.hidden = false;
  overlay.setAttribute("aria-hidden", "false");
  document.addEventListener("keydown", escapeHandler);
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      overlay.classList.add("is-active");
      applyPhase("prepare");
      if (delay > 600) skip?.focus({ preventScroll: true });
    }),
  );
  const finish = () => {
    overlay.classList.remove("is-active");
    overlay.setAttribute("aria-hidden", "true");
    document.removeEventListener("keydown", escapeHandler);
    if (skip) skip.onclick = null;
    previousFocus?.focus?.({ preventScroll: true });
    window.setTimeout(() => {
      overlay.hidden = true;
      overlay.dataset.phase = "complete";
    }, 520);
  };
  return { skip, setPhase: applyPhase, finish };
}
function embeddedApplicationUrl(app) {
  const params = new URLSearchParams({ app: app.id });
  return `${base}app/?${params.toString()}`;
}
function portalGatewayScrollTarget(zone) {
  const rect = zone.getBoundingClientRect();
  const headerHeight =
    document.querySelector(".site-header")?.getBoundingClientRect().height || 0;
  const visibleCenter = headerHeight + (window.innerHeight - headerHeight) / 2;
  const unclamped = window.scrollY + rect.top + rect.height / 2 - visibleCenter;
  const maximum = Math.max(
    0,
    document.documentElement.scrollHeight - window.innerHeight,
  );
  return Math.min(maximum, Math.max(0, unclamped));
}
function focusPortalGateway(zone) {
  if (!zone) return Promise.resolve();
  const target = portalGatewayScrollTarget(zone);
  const distance = Math.abs(window.scrollY - target);
  if (distance < 18) return Promise.resolve();

  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const instant = reducedMotion || root.dataset.motion === "off";
  window.scrollTo({ top: target, behavior: instant ? "auto" : "smooth" });

  if (instant) {
    return new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    );
  }

  return new Promise((resolve) => {
    const startedAt = performance.now();
    let previousPosition = window.scrollY;
    let stableFrames = 0;
    const settle = () => {
      const currentPosition = window.scrollY;
      const nearTarget = Math.abs(currentPosition - target) < 3;
      const barelyMoving = Math.abs(currentPosition - previousPosition) < 0.5;
      stableFrames = barelyMoving ? stableFrames + 1 : 0;
      previousPosition = currentPosition;
      if (
        (nearTarget && stableFrames >= 2) ||
        performance.now() - startedAt > 1200
      ) {
        resolve();
        return;
      }
      requestAnimationFrame(settle);
    };
    requestAnimationFrame(settle);
  });
}
function launchApp(app, article) {
  const access = hasAppAccess(app.id);
  if (!access.enabled) {
    showToast(accessExplanation(access, app.id));
    article.classList.add("lock-pulse");
    setTimeout(() => article.classList.remove("lock-pulse"), 700);
    return false;
  }
  if (portalLaunchInProgress) return false;
  portalLaunchInProgress = true;

  const stage = document.querySelector(".portal-stage");
  const zone = document.querySelector(".portal-core-zone");
  const stateLabel = zone?.querySelector(".portal-state strong");
  const originalLabel = stateLabel?.textContent || "";
  const launchButtons = [...document.querySelectorAll(".portal-launch-button")];
  const ringDelay = portalRingPreludeDelay();
  const cinematicDelay = portalAppCinematicDelay();
  const appName = localised(app.name).toUpperCase();
  const timers = [];
  let completed = false;
  let cinematic = { setPhase: () => {}, finish: () => {}, skip: null };

  launchButtons.forEach((button) => {
    button.disabled = true;
  });
  article.classList.add("is-launch-selected");
  zone?.classList.add("is-targeting");
  if (stateLabel)
    stateLabel.textContent = t(
      `ZAMĚŘUJI BRÁNU: ${appName}`,
      `TARGETING GATEWAY: ${appName}`,
    );

  const schedule = (after, callback) => {
    timers.push(window.setTimeout(callback, after));
  };
  const cleanup = () => {
    timers.forEach((timer) => window.clearTimeout(timer));
    cinematic.finish();
    stage?.classList.remove("is-launching");
    zone?.classList.remove("is-targeting", "is-launching");
    article.classList.remove("is-launch-selected");
    launchButtons.forEach((button) => {
      button.disabled = false;
    });
    if (stateLabel) stateLabel.textContent = originalLabel;
    document.body.classList.remove("portal-launch-active");
    portalLaunchInProgress = false;
  };

  const navigate = () => {
    if (completed) return;
    completed = true;
    cinematic.setPhase("complete");
    const destination = embeddedApplicationUrl(app);
    cleanup();
    window.location.assign(destination);
  };

  const startGatewaySequence = () => {
    zone?.classList.remove("is-targeting");
    stage?.classList.add("is-launching");
    zone?.classList.add("is-launching");
    if (stateLabel)
      stateLabel.textContent = t(`NAVOLUJI: ${appName}`, `DIALING: ${appName}`);

    if (ringDelay > 500) {
      schedule(Math.round(ringDelay * 0.28), () => {
        if (stateLabel)
          stateLabel.textContent = t(
            "PRSTENCE SE OTÁČEJÍ",
            "RINGS ARE ROTATING",
          );
      });
      schedule(Math.round(ringDelay * 0.68), () => {
        if (stateLabel)
          stateLabel.textContent = t(
            "PRSTENCE SE UZAMYKAJÍ",
            "RINGS ARE LOCKING",
          );
      });
    }

    schedule(ringDelay, () => {
      zone?.classList.remove("is-launching");
      if (stateLabel)
        stateLabel.textContent = t(
          "BRÁNA OTEVŘENA — SPOUŠTÍM APLIKACI",
          "GATEWAY OPEN — LAUNCHING APPLICATION",
        );
      document.body.classList.add("portal-launch-active");
      cinematic = portalLaunchOverlay(app, cinematicDelay);
      if (cinematic.skip) cinematic.skip.onclick = navigate;

      const phase = (ratio, key) => {
        schedule(Math.round(cinematicDelay * ratio), () =>
          cinematic.setPhase(key),
        );
      };
      phase(0.24, "align");
      phase(0.5, "verify");
      phase(0.76, "open");
      phase(0.91, "transit");
      schedule(cinematicDelay, navigate);
    });
  };

  focusPortalGateway(zone).then(startGatewaySequence, startGatewaySequence);
  return true;
}

function portalAppCard(app, index, permissions) {
  const info = permissionInfoFor(app);
  const access = hasAppAccess(app.id);
  const favorites = getFavoriteApps();
  const article = el("article", "portal-app-card");
  article.dataset.position = String(index);
  article.dataset.appId = app.id;
  article.classList.add(`accent-${app.id}`);
  if (!access.enabled) article.classList.add("is-locked");
  if (favorites.includes(app.id)) article.classList.add("is-favorite");

  const head = el("div", "portal-card-head");
  const identity = el("div", "portal-app-identity");
  const icon = el("img", "portal-app-icon");
  icon.src = app.icon?.startsWith("http") ? app.icon : `${base}${app.icon}`;
  icon.alt = "";
  const identityText = el("div");
  identityText.append(el("span", "status", localised(app.status)));
  identity.append(icon, identityText);
  const headActions = el("div", "portal-card-actions");
  const pin = el(
    "button",
    `icon-button pin-button ${favorites.includes(app.id) ? "is-pinned" : ""}`,
    "★",
  );
  pin.type = "button";
  pin.setAttribute(
    "aria-label",
    favorites.includes(app.id)
      ? t("Odebrat z Top 4", "Remove from Top 4")
      : t("Přidat do Top 4", "Add to Top 4"),
  );
  pin.title = pin.getAttribute("aria-label");
  pin.addEventListener("click", (event) => {
    event.preventDefault();
    toggleFavoriteApp(app.id);
  });
  headActions.append(pin, el("span", "chip version-chip", `v${app.version}`));
  head.append(identity, headActions);

  const title = el("h2", "", localised(app.name));
  const description = el("p", "", localised(app.description));
  const meta = el("div", "portal-card-meta");
  (app.tags || [])
    .slice(0, 3)
    .forEach((tag) => meta.append(el("span", "chip", localised(tag))));
  const pchip = permissionChip(info);
  if (pchip) meta.append(pchip);
  meta.append(accessChip(access, app.id));

  const accessNote = el(
    "p",
    `portal-access-note ${access.enabled ? "ok" : "locked"}`,
    accessExplanation(access, app.id),
  );
  const actions = el("div", "portal-card-bottom");
  if (access.enabled) {
    const launch = el(
      "button",
      "portal-launch-button",
      t("Spustit aplikaci", "Launch application"),
    );
    launch.type = "button";
    launch.addEventListener("click", () => launchApp(app, article));
    actions.append(launch);
    article.tabIndex = 0;
    article.setAttribute("role", "link");
    article.setAttribute(
      "aria-label",
      `${t("Spustit", "Launch")} ${localised(app.name)}`,
    );
    article.addEventListener("click", (event) => {
      if (!event.target.closest("button,a,input,select,textarea,label"))
        launchApp(app, article);
    });
    article.addEventListener("keydown", (event) => {
      if (["Enter", " "].includes(event.key)) {
        event.preventDefault();
        launchApp(app, article);
      }
    });
  } else {
    const details = el(
      "a",
      "portal-unlock-button",
      t("Aktivovat přístup", "Activate access"),
    );
    details.href = `${base}access/`;
    actions.append(details);
  }
  article.append(head, title, description, meta, accessNote, actions);
  return article;
}

function renderExtraApps(apps) {
  document.querySelector(".extra-destinations")?.remove();
  if (!apps.length) return;
  const section = el("section", "section shell extra-destinations");
  const heading = el("div", "section-heading compact");
  const wrap = el("div");
  wrap.append(
    el("p", "eyebrow", t("DALŠÍ DESTINACE", "MORE DESTINATIONS")),
    el("h2", "", t("Nově připojené aplikace", "Newly connected applications")),
  );
  heading.append(wrap);
  const grid = el("div", "app-grid");
  apps.forEach((app, i) => {
    const card = portalAppCard(app, i + 4, window.__GHRAB_PERMISSIONS__);
    card.removeAttribute("data-position");
    card.classList.add("extra-app-card");
    grid.append(card);
  });
  section.append(heading, grid);
  document.querySelector(".mission-strip")?.before(section);
}

let homeContext = null;
function renderHomeCards() {
  if (!homeContext) return;
  const { grid, apps, permissions } = homeContext;
  const selection = selectCoreApps(apps);
  grid.replaceChildren(
    ...selection.core.map((app, index) =>
      portalAppCard(app, index, permissions),
    ),
  );
  renderExtraApps(selection.extra);
  renderHomeAccessSummary();
}
function renderHomeAccessSummary() {
  const host = document.querySelector("#access-summary");
  if (!host) return;
  const snapshot = getAccessSnapshot();
  const valid = snapshot.valid;
  host.className = `access-summary ${valid ? "active" : "inactive"}`;
  host.replaceChildren();
  const icon = el(
    "span",
    "access-summary-icon",
    valid ? (isAdmin() ? "◆" : "✓") : "🔒",
  );
  const body = el("div");
  body.append(
    el(
      "strong",
      "",
      valid
        ? isAdmin()
          ? t("Správcovský přístup aktivní", "Administrator access active")
          : t("Přístup aktivní", "Access active")
        : t(
            "Aplikace jsou zatím uzamčené",
            "Applications are currently locked",
          ),
    ),
  );
  body.append(
    el(
      "small",
      "",
      valid
        ? `${snapshot.permit.displayName || snapshot.permit.sub} · ${t("platnost do", "valid until")} ${new Date(snapshot.permit.exp * 1000).toLocaleDateString(state.language === "cs" ? "cs-CZ" : "en-GB")}`
        : t(
            "Po školení načtěte přístupový soubor od správce.",
            "After training, load the access file from the administrator.",
          ),
    ),
  );
  const link = el(
    "a",
    "button compact secondary",
    valid
      ? t("Spravovat přístup", "Manage access")
      : t("Aktivovat přístup", "Activate access"),
  );
  link.href = `${base}access/`;
  host.append(icon, body, link);
}
async function renderHome() {
  const grid = document.querySelector("#portal-apps");
  if (!grid) return;
  try {
    await accessReady;
    const [apps, permissions] = await Promise.all([
      loadApps(),
      loadPermissions(),
    ]);
    window.__GHRAB_PERMISSIONS__ = permissions;
    homeContext = { grid, apps, permissions };
    renderHomeCards();
  } catch {
    grid.innerHTML = `<div class="portal-empty">${t("Registr aplikací se nepodařilo načíst. Obnovte stránku.", "The application registry could not be loaded. Refresh the page.")}</div>`;
  }
  const report = await loadSyncReport();
  const status = document.querySelector("#studio-status");
  const title = status?.querySelector("[data-status-title]");
  const summary = document.querySelector("#sync-summary");
  if (summary && report) {
    const ok = report.sources?.filter((item) => item.ok).length || 0;
    const total = report.sources?.length || 0;
    const allLive = total > 0 && ok === total;
    const available =
      report.sources?.filter((item) => item.version).length || 0;
    status?.classList.toggle("status-live", allLive);
    status?.classList.toggle(
      "status-fallback",
      !allLive && available === total,
    );
    status?.classList.toggle("status-error", available < total);
    const update = () => {
      if (allLive) {
        if (title)
          title.textContent = t(
            "Všechny nástroje jsou aktuální",
            "All tools are up to date",
          );
        summary.textContent = t(
          `${total}/${total} manifestů ověřeno přímo u aplikací.`,
          `${total}/${total} manifests verified directly from the applications.`,
        );
      } else if (available === total) {
        if (title)
          title.textContent = t(
            "Všechny nástroje jsou dostupné",
            "All tools are available",
          );
        summary.textContent = t(
          `Studio používá ověřenou záložní konfiguraci · poslední sestavení ${new Date(report.generatedAt).toLocaleString("cs-CZ")}.`,
          `The Studio is using its verified fallback configuration · last build ${new Date(report.generatedAt).toLocaleString("en-GB")}.`,
        );
      } else {
        if (title)
          title.textContent = t(
            "Některé nástroje vyžadují kontrolu",
            "Some tools require attention",
          );
        summary.textContent = t(
          `${available}/${total} nástrojů má dostupnou konfiguraci.`,
          `${available}/${total} tools have an available configuration.`,
        );
      }
    };
    update();
    document.addEventListener("ghrab:language", update, { once: true });
  }
}

function setupPortalMotion() {
  const stage = document.querySelector(".portal-stage");
  if (!stage || stage.dataset.portalMotionReady === "true") return;
  stage.dataset.portalMotionReady = "true";
  const reset = () => {
    stage.style.setProperty("--portal-tilt-x", "0deg");
    stage.style.setProperty("--portal-tilt-y", "0deg");
    stage.style.setProperty("--portal-shift-x", "0px");
    stage.style.setProperty("--portal-shift-y", "0px");
  };
  reset();
  document.addEventListener("ghrab:motion", reset);
}

function setupStarfield() {
  const canvas = document.querySelector("#starfield");
  if (!canvas) return;
  const ctx = canvas.getContext("2d", { alpha: true });
  let stars = [];
  let raf = 0;
  let running = false;
  let lastFrame = 0;
  const frameInterval = 1000 / 30;

  const resize = () => {
    if (!running) return;
    const dpr = Math.min(devicePixelRatio || 1, 1.35);
    canvas.width = Math.floor(innerWidth * dpr);
    canvas.height = Math.floor(innerHeight * dpr);
    canvas.style.width = `${innerWidth}px`;
    canvas.style.height = `${innerHeight}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.min(95, Math.max(38, Math.floor(innerWidth / 15)));
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * innerWidth,
      y: Math.random() * innerHeight,
      r: Math.random() * 0.9 + 0.12,
      a: Math.random() * 0.52 + 0.18,
      s: Math.random() * 0.055 + 0.012,
    }));
  };

  const draw = (timestamp) => {
    if (!running) return;
    raf = requestAnimationFrame(draw);
    if (document.hidden || timestamp - lastFrame < frameInterval) return;
    lastFrame = timestamp;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const star of stars) {
      star.y += star.s;
      if (star.y > innerHeight + 2) star.y = -2;
      ctx.beginPath();
      ctx.fillStyle = `rgba(166,235,255,${star.a})`;
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const stop = () => {
    running = false;
    cancelAnimationFrame(raf);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvas.hidden = true;
  };

  const start = () => {
    if (root.dataset.motion !== "full") {
      stop();
      return;
    }
    if (running) return;
    running = true;
    canvas.hidden = false;
    resize();
    raf = requestAnimationFrame(draw);
  };

  addEventListener("resize", resize, { passive: true });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && running) lastFrame = 0;
  });
  document.addEventListener("ghrab:motion", start);
  addEventListener("pagehide", stop, { once: true });
  start();
}

async function refreshSharedAccessModuleCache() {
  if (!("caches" in globalThis)) return;
  const refreshKey = `ghrab.shared-access-cache-refreshed.${VERSION}`;
  if (safeGetItem(refreshKey)) return;
  const sharedPaths = [
    "/AI-Studio-GHRAB/access/app-guard.js",
    "/AI-Studio-GHRAB/access/access-control.js",
    "/AI-Studio-GHRAB/access/error-reporter.js",
    "/AI-Studio-GHRAB/access/error-reporter.css",
  ];
  try {
    for (const cacheName of await caches.keys()) {
      const cache = await caches.open(cacheName);
      for (const request of await cache.keys()) {
        const pathname = new URL(request.url).pathname;
        if (sharedPaths.some((path) => pathname.endsWith(path)))
          await cache.delete(request);
      }
    }
    safeSetItem(refreshKey, new Date().toISOString(), { silent: true });
  } catch (error) {
    console.warn(
      "AI Studio: obnovení sdíleného měřicího modulu se nezdařilo.",
      error,
    );
  }
}

const PWA_INSTALL_DISMISSED_KEY = "ghrab.pwa.install-dismissed-until";
let deferredInstallPrompt = null;

function isStandalonePwa() {
  return (
    matchMedia("(display-mode: standalone)").matches ||
    navigator.standalone === true
  );
}
function isDesktopInstallSurface() {
  return (
    matchMedia("(min-width: 760px)").matches &&
    matchMedia("(pointer: fine)").matches
  );
}
function installPromptDismissed() {
  const until = Date.parse(safeGetItem(PWA_INSTALL_DISMISSED_KEY) || "");
  return Number.isFinite(until) && until > Date.now();
}
function dismissPwaInstallCard(days = 30) {
  const until = new Date(Date.now() + days * 86400000).toISOString();
  safeSetItem(PWA_INSTALL_DISMISSED_KEY, until, { silent: true });
  document.querySelector(".pwa-install-card")?.remove();
}
function updatePwaInstallCard() {
  const card = document.querySelector(".pwa-install-card");
  if (!card) return;
  const button = card.querySelector(".pwa-install-primary");
  const hint = card.querySelector(".pwa-install-copy p");
  if (button)
    button.textContent = deferredInstallPrompt
      ? t("Nainstalovat", "Install")
      : t("Jak nainstalovat", "How to install");
  if (hint)
    hint.textContent = deferredInstallPrompt
      ? t(
          "Otevře se jako samostatná aplikace na počítači a bude vždy po ruce.",
          "Open it as a standalone desktop app and keep it close at hand.",
        )
      : t(
          "V Chrome nebo Edge lze Studio nainstalovat přes ikonu v adresním řádku.",
          "In Chrome or Edge, install the Studio using the icon in the address bar.",
        );
}
function renderPwaInstallCard() {
  if (
    page !== "home" ||
    isStandalonePwa() ||
    !isDesktopInstallSurface() ||
    installPromptDismissed() ||
    document.querySelector(".pwa-install-card")
  )
    return;

  const card = el("aside", "pwa-install-card");
  card.setAttribute("role", "region");
  card.setAttribute(
    "aria-label",
    t("Instalace AI Studia", "Install AI Studio"),
  );
  const icon = el("img", "pwa-install-icon");
  icon.src = `${base}assets/brand/icon-96.png`;
  icon.alt = "";
  const copy = el("div", "pwa-install-copy");
  copy.append(
    el("strong", "", t("Nainstalovat AI Studio", "Install AI Studio")),
    el("p", "", ""),
  );
  const actions = el("div", "pwa-install-actions");
  const install = el("button", "pwa-install-primary", "");
  install.type = "button";
  install.addEventListener("click", async () => {
    if (!deferredInstallPrompt) {
      showToast(
        t(
          "V Chrome nebo Edge klikněte na ikonu instalace vpravo v adresním řádku, případně otevřete nabídku prohlížeče a zvolte Nainstalovat AI Studio.",
          "In Chrome or Edge, click the install icon on the right side of the address bar, or open the browser menu and choose Install AI Studio.",
        ),
      );
      return;
    }
    install.disabled = true;
    try {
      deferredInstallPrompt.prompt();
      const choice = await deferredInstallPrompt.userChoice;
      if (choice?.outcome === "accepted") {
        safeRemoveItem(PWA_INSTALL_DISMISSED_KEY);
        card.remove();
      } else {
        install.disabled = false;
      }
    } catch {
      install.disabled = false;
      showToast(
        t(
          "Instalační nabídku se nepodařilo otevřít. Použijte ikonu instalace v adresním řádku prohlížeče.",
          "The install prompt could not be opened. Use the install icon in the browser address bar.",
        ),
      );
    }
  });
  const close = el("button", "pwa-install-close", "×");
  close.type = "button";
  close.setAttribute("aria-label", t("Skrýt nabídku", "Hide prompt"));
  close.addEventListener("click", () => dismissPwaInstallCard(30));
  actions.append(install);
  card.append(icon, copy, actions, close);
  document.body.append(card);
  updatePwaInstallCard();
}
function setupPwaInstallPrompt() {
  if (page !== "home" || isStandalonePwa()) return;
  window.setTimeout(renderPwaInstallCard, 900);
  addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    renderPwaInstallCard();
    updatePwaInstallCard();
  });
  addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    safeRemoveItem(PWA_INSTALL_DISMISSED_KEY);
    document.querySelector(".pwa-install-card")?.remove();
    showToast(t("AI Studio bylo nainstalováno.", "AI Studio was installed."));
  });
  addEventListener("resize", () => {
    if (!isDesktopInstallSurface())
      document.querySelector(".pwa-install-card")?.remove();
    else renderPwaInstallCard();
  });
}

function updatePresentationFit() {
  if (page !== "home") return;
  const compactPresentation = innerWidth >= 1024 && innerHeight <= 980;
  root.classList.toggle("presentation-fit", compactPresentation);
}

function releaseStartupPrepaint(intro) {
  root.classList.remove(
    "startup-prepaint",
    "startup-intro-pending",
    "startup-intro-revealing",
  );
  root.classList.add("startup-intro-skip");
  if (!intro) return;
  intro.hidden = true;
  intro.setAttribute("aria-hidden", "true");
  intro.classList.remove("is-active", "is-leaving");
}

function setupStartupIntro() {
  if (page !== "home") {
    releaseStartupPrepaint();
    return;
  }
  const intro = document.querySelector("#studio-startup-intro");
  const skip = document.querySelector("#studio-startup-skip");
  const key = `ghrab.startup-intro.${VERSION}`;
  let alreadySeen = false;
  try {
    alreadySeen = sessionStorage.getItem(key) === "seen";
  } catch {
    /* continue */
  }
  const shouldSkip =
    !intro ||
    !skip ||
    alreadySeen ||
    matchMedia("(max-width: 899px)").matches ||
    detectedMotionMode() === "off";
  if (shouldSkip) {
    releaseStartupPrepaint(intro);
    return;
  }

  root.classList.remove("startup-prepaint", "startup-intro-skip");
  root.classList.add("startup-intro-pending");
  intro.hidden = false;
  intro.setAttribute("aria-hidden", "false");
  intro.classList.add("is-active");

  let closed = false;
  let timer = 0;
  const close = () => {
    if (closed) return;
    closed = true;
    clearTimeout(timer);
    try {
      sessionStorage.setItem(key, "seen");
    } catch {
      /* optional */
    }
    root.classList.remove("startup-intro-pending");
    root.classList.add("startup-intro-revealing");
    intro.classList.add("is-leaving");
    setTimeout(() => {
      intro.hidden = true;
      intro.setAttribute("aria-hidden", "true");
      intro.classList.remove("is-active", "is-leaving");
      root.classList.remove("startup-intro-revealing");
      root.classList.add("startup-intro-skip");
    }, 520);
  };

  skip.addEventListener("click", close, { once: true });
  timer = setTimeout(close, 3300);
}

async function registerPwa() {
  if ("serviceWorker" in navigator) {
    try {
      await navigator.serviceWorker.register(`${base}sw.js`);
    } catch {
      /* optional */
    }
  }
}

const ADMIN_PAGES = new Set([
  "automation",
  "demo",
  "report",
  "tests",
  "changelog",
  "issuer",
  "access-registry",
]);
function renderPageAccessGate() {
  if (!ADMIN_PAGES.has(page) || isAdmin()) return;
  const main = document.querySelector("main");
  if (!main) return;
  main.replaceChildren();
  const section = el("section", "page-hero shell access-denied-page");
  section.append(
    el("p", "eyebrow", t("SPRÁVCOVSKÁ ČÁST", "ADMINISTRATOR AREA")),
    el(
      "h1",
      "",
      t(
        "Tato stránka je dostupná pouze správci AI Studia.",
        "This page is available to the AI Studio administrator only.",
      ),
    ),
    el(
      "p",
      "",
      t(
        "Na stránce Můj přístup načtěte platné správcovské oprávnění.",
        "Load a valid administrator permit on the My access page.",
      ),
    ),
  );
  const link = el(
    "a",
    "button primary",
    t("Otevřít Můj přístup", "Open My access"),
  );
  link.href = `${base}access/`;
  section.append(link);
  main.append(section);
}

const accessReady = initialiseAccess().then((snapshot) => {
  updateAdminVisibility();
  renderPageAccessGate();
  return snapshot;
});
window.GHRAB = {
  VERSION,
  state,
  t,
  localised,
  base,
  loadApps,
  loadSyncReport,
  loadPermissions,
  getLaunches,
  getTestLaunches,
  getTelemetryMode,
  setTelemetryMode,
  clearTestTelemetry,
  recordLaunch,
  getWorkspace,
  saveWorkspaceMaterial,
  deleteWorkspaceMaterial,
  createHandoff,
  readHandoff,
  clearHandoff,
  getPilotEvents,
  getTestPilotEvents,
  recordPilotEvent,
  clearPilotEvents,
  downloadJson,
  downloadPilotSummary,
  pilotSummaryPayload,
  anonymousSourceId,
  currentPilotPeriod,
  setupMonthlyReportReminder,
  refreshSharedAccessModuleCache,
  showToast,
  applyLanguage,
  applyMotion,
  getFavoriteApps,
  setFavoriteApps,
  toggleFavoriteApp,
  safeGetItem,
  safeSetItem,
  safeSetJson,
  safeRemoveItem,
  storageUsage,
  validMaterial,
  validateMaterialPackage,
  initialiseAccess,
  setPermitToken,
  clearPermit,
  readPermitFile,
  getAccessSnapshot,
  getPermitToken,
  isAdmin,
  hasAppAccess,
  requiredTraining,
  formatReason,
  inspectPermitToken,
  getIssuedAccessRecords,
  recordIssuedAccess,
  updateIssuedAccessRecord,
  removeIssuedAccessRecord,
  importIssuedAccessRecords,
  issuedAccessBackup,
  accessReady,
};
setupChrome();
updatePresentationFit();
addEventListener("resize", updatePresentationFit);
applyTheme();
applyLanguage();
applyMotion();
renderHome();
setupPortalMotion();
setupStarfield();
setupStartupIntro();
refreshSharedAccessModuleCache();
setupPwaInstallPrompt();
registerPwa();
accessReady.then(() => {
  updateTelemetryModeBanner();
  setupMonthlyReportReminder();
});
document.addEventListener("ghrab:language", () => {
  renderHomeCards();
  renderHomeAccessSummary();
});
document.addEventListener("ghrab:access-changed", () => {
  updateAdminVisibility();
  renderPageAccessGate();
  renderHomeCards();
  updateTelemetryModeBanner();
});
document.addEventListener("ghrab:favorites", renderHomeCards);
