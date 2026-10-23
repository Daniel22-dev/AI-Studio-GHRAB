/* AI Studio Stage 05: declarative material router and workspace convergence.
 * A local-first implementation with a deliberately narrow server transport seam.
 * NEVER treat localStorage or the FNV checksum as authentication.
 */
export const CURRENT_WORKSPACE_KEY = 'ghrab.ai-studio.workspace.v1';
export const LEGACY_WORKSPACE_KEY = 'ghrab.workspace.v1';
export const MATERIAL_SCHEMA = 'ghrab-material-v1';
export const MATERIAL_LIMIT_BYTES = 2 * 1024 * 1024;
export const HANDOFF_LIMIT_BYTES = 480000; // leave room for the v2 packet envelope
export const DEFAULT_HANDOFF_TTL_MS = 30 * 60 * 1000;
export const REGISTRY_SCHEMA = 'ghrab-material-flow-registry-v1';
const VALID_ID = /^[a-z][a-z0-9-]{0,79}$/;
const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const ROSTER_KEY = /(?:student|pupil|learner|roster|classlist|attendance|dateofbirth|birthdate|personaldata|rodnecislo|firstname|lastname|fullname|studentid|emailaddress|resultsbyname)/i;
const DANGEROUS_MARKUP = /<\s*(?:script|iframe|object|embed)\b|\bon\w+\s*=|javascript\s*:/i;
const UTF8 = new TextEncoder();

function isRecord(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
export function byteLength(value) { return UTF8.encode(JSON.stringify(value)).byteLength; }
function copy(value) { return JSON.parse(JSON.stringify(value)); }
function safeItems(storage, key) {
  try {
    const items = JSON.parse(storage.getItem(key) || 'null');
    return Array.isArray(items) ? items : [];
  } catch { return []; }
}
// Listing can ignore malformed records, but no write may silently discard them.
// This is intentionally strict: a future repair/export UI must handle corrupt
// records without pretending they never existed.
function assertWorkspaceWritable(storage, validator) {
  for (const key of [CURRENT_WORKSPACE_KEY, LEGACY_WORKSPACE_KEY]) {
    const raw = storage.getItem(key);
    if (raw === null) continue;
    let items;
    try { items = JSON.parse(raw); }
    catch { throw new Error(`workspace-integrity-error:${key}`); }
    if (!Array.isArray(items) || items.some((item) => !validWorkspaceEntry(item, validator))) {
      throw new Error(`workspace-integrity-error:${key}`);
    }
  }
}
function validWorkspaceEntry(item, validator) {
  if (!isRecord(item) || item.schema !== MATERIAL_SCHEMA || typeof item.id !== 'string' || !item.id.trim()) return false;
  if (typeof validator === 'function' && validator(item)?.valid !== true) return false;
  try { return byteLength(item) <= MATERIAL_LIMIT_BYTES; } catch { return false; }
}
function score(item) {
  const version = Number.isSafeInteger(item.version) ? item.version : 0;
  const date = Date.parse(item.provenance?.updatedAt || '');
  return [version, Number.isFinite(date) ? date : 0];
}
function newer(a, b) {
  const aa = score(a), bb = score(b);
  return aa[0] > bb[0] || (aa[0] === bb[0] && aa[1] > bb[1]);
}
export function mergeWorkspace(current, legacy, validator) {
  // Current wins equal-version/equal-date ties, but higher versions win overall.
  const byId = new Map();
  for (const item of [...current, ...legacy]) {
    if (!validWorkspaceEntry(item, validator)) continue;
    const previous = byId.get(item.id);
    if (!previous || newer(item, previous)) byId.set(item.id, item);
  }
  return [...byId.values()]
    .sort((a, b) => (score(b)[1] - score(a)[1]) || a.id.localeCompare(b.id));
}
export function createWorkspaceAdapter(storage, { validator } = {}) {
  if (!storage) throw new TypeError('storage-required');
  const list = () => mergeWorkspace(safeItems(storage, CURRENT_WORKSPACE_KEY), safeItems(storage, LEGACY_WORKSPACE_KEY), validator);
  function persist(items) {
    // Never repair damaged legacy stores by quietly replacing them with a filtered list.
    assertWorkspaceWritable(storage, validator);
    const next = JSON.stringify(items);
    const before = [storage.getItem(CURRENT_WORKSPACE_KEY), storage.getItem(LEGACY_WORKSPACE_KEY)];
    try {
      // Detect most stale writes from another open Studio tab. Browser storage
      // has no atomic compare-and-swap; this is collision detection, not a lock.
      if (storage.getItem(CURRENT_WORKSPACE_KEY) !== before[0] ||
          storage.getItem(LEGACY_WORKSPACE_KEY) !== before[1]) throw new Error('workspace-concurrent-change');
      storage.setItem(CURRENT_WORKSPACE_KEY, next);
      storage.setItem(LEGACY_WORKSPACE_KEY, next);
      return true;
    } catch (error) {
      if (error?.message === 'workspace-concurrent-change') throw error;
      for (const [index, key] of [CURRENT_WORKSPACE_KEY, LEGACY_WORKSPACE_KEY].entries()) {
        try { if (before[index] === null) storage.removeItem(key); else storage.setItem(key, before[index]); } catch { /* best-effort rollback */ }
      }
      throw error;
    }
  }
  function save(material) {
    if (!validWorkspaceEntry(material, validator)) throw new TypeError('invalid-workspace-material');
    const items = list();
    const existing = items.find((row) => row.id === material.id);
    if (existing && Number(existing.version) > Number(material.version)) throw new Error('stale-workspace-version');
    const updated = copy(material);
    const provenance = isRecord(updated.provenance) ? updated.provenance : {};
    updated.provenance = { ...provenance, createdAt: existing?.provenance?.createdAt || provenance.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() };
    const next = mergeWorkspace([updated, ...items.filter((row) => row.id !== updated.id)], [], validator);
    persist(next);
    return updated;
  }
  function remove(id) { return persist(list().filter((item) => item.id !== id)); }
  function migrate() { const items = list(); persist(items); return items; }
  return Object.freeze({ list, save, remove, migrate });
}

export function inspectOutboundMaterial(material, { validator } = {}) {
  const reasons = [];
  if (!isRecord(material) || material.schema !== MATERIAL_SCHEMA) return { ok: false, reasons: ['invalid-schema'] };
  if (typeof validator === 'function' && validator(material)?.valid !== true) reasons.push('invalid-schema');
  if (material.provenance?.containsPersonalData !== false) reasons.push('privacy-not-confirmed');
  try { if (byteLength(material) > HANDOFF_LIMIT_BYTES) reasons.push('material-too-large'); }
  catch { reasons.push('malformed-material'); }
  const visited = new WeakSet();
  function visit(value, depth = 0) {
    if (depth > 32) { reasons.push('material-too-deep'); return; }
    if (typeof value === 'string') {
      if (EMAIL.test(value)) reasons.push('personal-information');
      if (DANGEROUS_MARKUP.test(value)) reasons.push('unsafe-markup');
    } else if (value && typeof value === 'object') {
      if (visited.has(value)) { reasons.push('recursive-material'); return; }
      visited.add(value);
      for (const [key, child] of Object.entries(value)) {
        if (key !== 'containsPersonalData' && ROSTER_KEY.test(key.replace(/[^a-zA-Z0-9]/g, ''))) reasons.push('student-record-field');
        visit(child, depth + 1);
      }
    }
  }
  visit(material);
  return { ok: reasons.length === 0, reasons: [...new Set(reasons)] };
}

export function validateRegistry(registry) {
  if (!isRecord(registry) || registry.schema !== REGISTRY_SCHEMA || !Array.isArray(registry.targets)) throw new TypeError('material-flow-registry-schema');
  const seen = new Set();
  for (const entry of registry.targets) {
    if (!isRecord(entry) || !VALID_ID.test(entry.id) || seen.has(entry.id)) throw new TypeError('material-flow-registry-id');
    seen.add(entry.id);
    if (entry.bridgeVersion !== 2 || !Array.isArray(entry.importSchemas) || !entry.importSchemas.includes(MATERIAL_SCHEMA)) throw new TypeError('material-flow-registry-bridge');
    if (!['source-reviewed', 'browser-verified', 'disabled'].includes(entry.verification)) throw new TypeError('material-flow-registry-verification');
    if (!Array.isArray(entry.contentTypes) || !entry.contentTypes.every((v) => ['source-text', 'structured-tasks'].includes(v))) throw new TypeError('material-flow-registry-content');
    if (entry.maxBytes != null && (!Number.isInteger(entry.maxBytes) || entry.maxBytes < 1024 || entry.maxBytes > 500000)) throw new TypeError('material-flow-registry-size');
    if (!Array.isArray(entry.allowedLaunchPaths) || !entry.allowedLaunchPaths.length ||
        !entry.allowedLaunchPaths.every((path) => typeof path === 'string' && /^\/[a-zA-Z0-9_\/-]+\/$/.test(path) && !path.includes('//'))) {
      throw new TypeError('material-flow-registry-target-paths');
    }
    if (entry.requirements != null && !isRecord(entry.requirements)) throw new TypeError('material-flow-registry-requirements');
    const req = entry.requirements || {};
    for (const field of ['minObjectives','minSourceChars','minTasks']) if (req[field] != null && (!Number.isSafeInteger(req[field]) || req[field] < 0 || req[field] > 100000)) throw new TypeError('material-flow-registry-requirements');
    if (req.taskTypes != null && (!Array.isArray(req.taskTypes) || !req.taskTypes.every((s) => ['select','truefalse','short','open','order'].includes(s)))) throw new TypeError('material-flow-registry-task-types');
    if (req.oneOf != null && (!Array.isArray(req.oneOf) || !req.oneOf.every((s) => ['source-text','structured-tasks'].includes(s)))) throw new TypeError('material-flow-registry-oneof');
  }
  return registry;
}
export function assessContent(material, entry) {
  const content = isRecord(material?.content) ? material.content : {};
  const tasks = Array.isArray(content.tasks) ? content.tasks.filter((t) => isRecord(t) && typeof t.prompt === 'string' && t.prompt.trim()) : [];
  const sourceLength = typeof content.sourceText === 'string' ? content.sourceText.trim().length : 0;
  const objectives = Array.isArray(material?.objectives) ? material.objectives.filter((x) => typeof x === 'string' && x.trim()) : [];
  const req = entry.requirements || {};
  if (req.minSourceChars && sourceLength < req.minSourceChars) return 'needs-source';
  if (req.minObjectives && objectives.length < req.minObjectives) return 'needs-objectives';
  const accepted = req.taskTypes ? tasks.filter((task) => req.taskTypes.includes(task.type)) : tasks;
  if (req.minTasks && accepted.length < req.minTasks) return 'needs-tasks';
  if (req.oneOf?.length && !req.oneOf.some((type) => type === 'source-text' ? sourceLength > 0 : tasks.length > 0)) return 'needs-content';
  if (entry.contentTypes.length && !entry.contentTypes.some((type) => type === 'source-text' ? sourceLength > 0 : tasks.length > 0)) return 'unsupported-content';
  return 'compatible';
}
export function resolveTargets(material, apps, registry, { validator, studioUrl } = {}) {
  validateRegistry(registry);
  const declarations = new Map(registry.targets.map((entry) => [entry.id, entry]));
  const outbound = inspectOutboundMaterial(material, { validator });
  const origin = studioUrl ? new URL(studioUrl).origin : undefined;
  return (Array.isArray(apps) ? apps : []).filter((app) => app && VALID_ID.test(app.id) && app.id !== 'ai-studio').map((app) => {
    // Only Studio-reviewed target declarations are executable; unsigned app metadata cannot opt itself in.
    const entry = declarations.get(app.id) || null;
    let reason = 'compatible';
    let launchUrl = '';
    if (!entry || entry.bridgeVersion !== 2 || !Array.isArray(entry.importSchemas) || !entry.importSchemas.includes(MATERIAL_SCHEMA)) reason = 'no-import-contract';
    else if (entry.verification === 'disabled') reason = 'inbound-disabled';
    else if (entry.verification !== 'browser-verified' && entry.verification !== 'source-reviewed') reason = 'unverified-inbound';
    else {
      try {
        const targetUrl = new URL(app.launchUrl);
        const registered = new URL(app.paths?.app || app.launchUrl);
        if (targetUrl.protocol !== 'https:' && !(targetUrl.hostname === 'localhost' && targetUrl.protocol === 'http:')) throw new Error('insecure');
        if (origin && targetUrl.origin !== origin) reason = 'different-origin';
        else if (targetUrl.origin !== registered.origin || targetUrl.pathname !== registered.pathname ||
                 !entry.allowedLaunchPaths.includes(targetUrl.pathname) || targetUrl.search || targetUrl.hash) reason = 'launch-url-mismatch';
        else launchUrl = targetUrl.href;
      } catch { reason = 'invalid-launch-url'; }
    }
    if (reason === 'compatible' && !outbound.ok) reason = outbound.reasons[0];
    if (reason === 'compatible' && entry.maxBytes && byteLength(material) > entry.maxBytes - 8192) reason = 'material-too-large';
    if (reason === 'compatible') reason = assessContent(material, entry);
    return { id: app.id, app, declaration: entry || null, compatible: reason === 'compatible', reason, launchUrl };
  });
}
export function createHandoffTransport({ bridge, validator, studioUrl, registry, apps, writeLegacy = true, storage = globalThis.localStorage }) {
  if (!bridge || typeof bridge.create !== 'function' || typeof bridge.peek !== 'function') throw new TypeError('platform-bridge-required');
  function pending() { return bridge.peek({ allowAnyTarget: true, maxBytes: 500000 }); }
  function prepare({ targetId, material, ttlMs = DEFAULT_HANDOFF_TTL_MS, sourceAppVersion = 'unknown' }) {
    if (!Number.isSafeInteger(ttlMs) || ttlMs < 60000 || ttlMs > 86400000) throw new RangeError('handoff-ttl');
    const target = resolveTargets(material, apps, registry, { validator, studioUrl }).find((row) => row.id === targetId);
    if (!target?.compatible) throw new TypeError(`handoff-incompatible:${target?.reason || 'unknown-target'}`);
    if (pending()) throw new Error('handoff-already-pending');
    const packet = bridge.create({ target: targetId, sourceAppId: 'ai-studio', sourceAppVersion, studioUrl, ttlMs, material, writeLegacy, maxBytes: 500000 });
    if (!packet) throw new Error('handoff-already-pending');
    return { packet, launchUrl: new URL(target.launchUrl), target };
  }
  function cancelOwn() {
    const old = pending();
    if (!old || old.sourceAppId !== 'ai-studio' || !storage) return false;
    // Bridge v2 exposes no atomic cancel. Only the creating Studio owner
    // may cancel, and only while the exact same packet is still pending.
    try {
      const current = bridge.peek({ allowAnyTarget: true, maxBytes: 500000 });
      if (!current || current.sourceAppId !== 'ai-studio' || current.packet?.id !== old.packet?.id) return false;
      const raw = storage.getItem('ghrab.platform.handoff.v2');
      if (!raw || JSON.parse(raw).id !== old.packet?.id) return false;
      storage.removeItem('ghrab.platform.handoff.v2');
      storage.removeItem('ghrab.handoff.v1');
      return true;
    } catch { return false; }
  }
  return Object.freeze({ kind: 'local-first', prepare, pending, cancelOwn });
}
