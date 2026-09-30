const GROUP_SCHEMA = "ghrab-teaching-group-v1";
const STORE_SCHEMA = "ghrab-teaching-groups-store-v1";
const BACKUP_SCHEMA = "ghrab-teaching-groups-backup-v1";
const STORAGE_KEY = "ghrab.ai-studio.groups.v1";
const MAX_GROUPS = 200;
const MAX_MEMBERS_PER_GROUP = 500;
const MAX_IMPORT_CHARS = 120000;
const MAX_NAME_LENGTH = 120;
const MAX_EMAIL_LENGTH = 254;

const CONSUMER_RULES = Object.freeze({
  sortio: Object.freeze({ members: "name-only" }),
  "essay-evaluator": Object.freeze({ members: "name-email" }),
  "lesson-hub": Object.freeze({ members: "none" }),
  generator: Object.freeze({ members: "none", futureOnly: true }),
});

function nowIso() {
  return new Date().toISOString();
}

function clone(value) {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function safeText(value, max = MAX_NAME_LENGTH) {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function normalizeName(value) {
  return safeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("cs-CZ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizeEmail(value) {
  return String(value ?? "").trim().toLowerCase().slice(0, MAX_EMAIL_LENGTH);
}

function isValidEmail(value) {
  const email = normalizeEmail(value);
  if (!email || email.length > MAX_EMAIL_LENGTH || /\s/.test(email)) return false;
  return /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email);
}

function isIsoTimestamp(value) {
  if (typeof value !== "string" || !value) return false;
  const time = Date.parse(value);
  return Number.isFinite(time);
}

function secureId(prefix) {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.randomUUID) return `${prefix}_${cryptoApi.randomUUID()}`;
  if (cryptoApi?.getRandomValues) {
    const bytes = new Uint8Array(16);
    cryptoApi.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
    return `${prefix}_${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  throw new Error("SECURE_RANDOM_UNAVAILABLE");
}

function emptyStore() {
  return {
    schema: STORE_SCHEMA,
    version: 1,
    updatedAt: nowIso(),
    groups: [],
  };
}

function validationResult(ok, errors = []) {
  return { ok, errors };
}

export function validateTeachingGroup(group) {
  const errors = [];
  if (!group || typeof group !== "object" || Array.isArray(group)) {
    return validationResult(false, ["GROUP_NOT_OBJECT"]);
  }
  if (group.schema !== GROUP_SCHEMA) errors.push("GROUP_SCHEMA_INVALID");
  if (!/^grp_[a-z0-9-]{12,}$/i.test(String(group.groupId || ""))) errors.push("GROUP_ID_INVALID");
  if (!Number.isInteger(group.revision) || group.revision < 1) errors.push("REVISION_INVALID");
  const rawDisplayName = String(group.displayName ?? "").trim();
  if (!safeText(rawDisplayName)) errors.push("DISPLAY_NAME_REQUIRED");
  if (rawDisplayName.length > MAX_NAME_LENGTH) errors.push("DISPLAY_NAME_TOO_LONG");
  if (!/^\d{4}\/\d{2,4}$/.test(String(group.schoolYear || ""))) errors.push("SCHOOL_YEAR_INVALID");
  if (!new Set(["active", "archived"]).has(group.status)) errors.push("GROUP_STATUS_INVALID");
  if (!isIsoTimestamp(group.createdAt) || !isIsoTimestamp(group.updatedAt)) errors.push("GROUP_TIMESTAMP_INVALID");
  if (!Array.isArray(group.members)) errors.push("MEMBERS_INVALID");
  if (Array.isArray(group.members) && group.members.length > MAX_MEMBERS_PER_GROUP) errors.push("MEMBERS_LIMIT_EXCEEDED");
  const ids = new Set();
  for (const member of Array.isArray(group.members) ? group.members : []) {
    if (!member || typeof member !== "object" || Array.isArray(member)) {
      errors.push("MEMBER_NOT_OBJECT");
      continue;
    }
    if (!/^mem_[a-z0-9-]{12,}$/i.test(String(member.memberId || ""))) errors.push("MEMBER_ID_INVALID");
    if (ids.has(member.memberId)) errors.push("MEMBER_ID_DUPLICATE");
    ids.add(member.memberId);
    const rawName = String(member.name ?? "").trim();
    const name = safeText(rawName);
    if (!name) errors.push("MEMBER_NAME_REQUIRED");
    if (rawName.length > MAX_NAME_LENGTH) errors.push("MEMBER_NAME_TOO_LONG");
    if (member.schoolEmail != null && member.schoolEmail !== "" && !isValidEmail(member.schoolEmail)) errors.push("MEMBER_EMAIL_INVALID");
    if (!new Set(["active", "archived"]).has(member.status)) errors.push("MEMBER_STATUS_INVALID");
    if (!isIsoTimestamp(member.createdAt) || !isIsoTimestamp(member.updatedAt)) errors.push("MEMBER_TIMESTAMP_INVALID");
  }
  return validationResult(errors.length === 0, [...new Set(errors)]);
}

export function validateGroupsStore(store) {
  const errors = [];
  if (!store || typeof store !== "object" || Array.isArray(store)) return validationResult(false, ["STORE_NOT_OBJECT"]);
  if (store.schema !== STORE_SCHEMA || store.version !== 1) errors.push("STORE_SCHEMA_INVALID");
  if (!isIsoTimestamp(store.updatedAt)) errors.push("STORE_TIMESTAMP_INVALID");
  if (!Array.isArray(store.groups)) errors.push("STORE_GROUPS_INVALID");
  if (Array.isArray(store.groups) && store.groups.length > MAX_GROUPS) errors.push("GROUP_LIMIT_EXCEEDED");
  const ids = new Set();
  for (const group of Array.isArray(store.groups) ? store.groups : []) {
    const result = validateTeachingGroup(group);
    errors.push(...result.errors);
    if (ids.has(group?.groupId)) errors.push("GROUP_ID_DUPLICATE");
    ids.add(group?.groupId);
  }
  return validationResult(errors.length === 0, [...new Set(errors)]);
}

export class LocalGroupsProvider {
  constructor({ storage = globalThis.localStorage, storageKey = STORAGE_KEY, onDiagnostic = () => {} } = {}) {
    if (!storage || typeof storage.getItem !== "function" || typeof storage.setItem !== "function") {
      throw new Error("GROUP_STORAGE_UNAVAILABLE");
    }
    this.storage = storage;
    this.storageKey = storageKey;
    this.onDiagnostic = typeof onDiagnostic === "function" ? onDiagnostic : () => {};
    this.lastGood = null;
  }

  read() {
    let raw;
    try {
      raw = this.storage.getItem(this.storageKey);
    } catch {
      this.onDiagnostic({ code: "GROUP_STORAGE_READ_FAILED" });
      return clone(this.lastGood || emptyStore());
    }
    if (!raw) {
      const store = emptyStore();
      this.lastGood = clone(store);
      return store;
    }
    try {
      const parsed = JSON.parse(raw);
      const validation = validateGroupsStore(parsed);
      if (!validation.ok) throw new Error("INVALID_GROUP_STORE");
      this.lastGood = clone(parsed);
      return clone(parsed);
    } catch {
      this.onDiagnostic({ code: "GROUP_STORAGE_CORRUPT" });
      return clone(this.lastGood || emptyStore());
    }
  }

  write(store) {
    const validation = validateGroupsStore(store);
    if (!validation.ok) throw new Error(`GROUP_STORE_VALIDATION_FAILED:${validation.errors.join(",")}`);
    const serialised = JSON.stringify(store);
    try {
      this.storage.setItem(this.storageKey, serialised);
      const verifyRaw = this.storage.getItem(this.storageKey);
      const verify = JSON.parse(verifyRaw || "null");
      if (!validateGroupsStore(verify).ok) throw new Error("GROUP_STORAGE_VERIFY_FAILED");
      this.lastGood = clone(verify);
      return clone(verify);
    } catch (error) {
      this.onDiagnostic({ code: error?.message === "GROUP_STORAGE_VERIFY_FAILED" ? "GROUP_STORAGE_VERIFY_FAILED" : "GROUP_STORAGE_WRITE_FAILED" });
      throw new Error("GROUP_STORAGE_WRITE_FAILED");
    }
  }

  exportBackup() {
    return {
      schema: BACKUP_SCHEMA,
      version: 1,
      exportedAt: nowIso(),
      store: this.read(),
    };
  }

  importBackup(backup) {
    if (!backup || backup.schema !== BACKUP_SCHEMA || backup.version !== 1 || !isIsoTimestamp(backup.exportedAt)) {
