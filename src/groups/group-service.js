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
      throw new Error("GROUP_BACKUP_INVALID");
    }
    const validation = validateGroupsStore(backup.store);
    if (!validation.ok) throw new Error("GROUP_BACKUP_STORE_INVALID");
    return this.write({ ...clone(backup.store), updatedAt: nowIso() });
  }
}

function titleCaseNamePart(value) {
  const text = safeText(value);
  return text
    .split(/([ '\u2019-])/)
    .map((part) => (/^[ '\u2019-]$/.test(part) ? part : part ? `${part.charAt(0).toLocaleUpperCase("cs-CZ")}${part.slice(1).toLocaleLowerCase("cs-CZ")}` : part))
    .join("");
}

function inferNameFromEmail(email) {
  const local = normalizeEmail(email).split("@")[0] || "";
  return local
    .replace(/\+.*$/, "")
    .split(/[._-]+/)
    .map((part) => part.replace(/\d+$/g, ""))
    .filter(Boolean)
    .map(titleCaseNamePart)
    .join(" ");
}

const EMAIL_SOURCE = "[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}";
function emailsIn(value) {
  return String(value ?? "").match(new RegExp(EMAIL_SOURCE, "ig")) || [];
}


function normaliseHeaderToken(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("cs-CZ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function detectRosterHeader(line) {
  const cells = String(line ?? "")
    .split(/[\t;|,]+/)
    .map((item) => normaliseHeaderToken(item));
  if (cells.length < 2) return null;
  const find = (...patterns) => cells.findIndex((cell) => patterns.some((pattern) => pattern.test(cell)));
  const emailIndex = find(/^e ?mail$/, /^email$/, /^mail$/);
  const lastNameIndex = find(/^prijmeni$/, /^surname$/, /^last name$/, /^family name$/);
  const firstNameIndex = find(/^jmeno$/, /^first name$/, /^given name$/);
  const fullNameIndex = find(/^cele jmeno$/, /^full name$/, /^student$/, /^zak$/);
  if (emailIndex < 0 && firstNameIndex < 0 && lastNameIndex < 0 && fullNameIndex < 0) return null;
  return { cells: cells.length, emailIndex, firstNameIndex, lastNameIndex, fullNameIndex };
}

function parseHeaderGuidedLine(acc, line, header) {
  if (!header) return false;
  const cells = String(line ?? "").split(/[\t;|,]+/).map((item) => safeText(item, 360));
  if (cells.length < 2) return false;
  const email = header.emailIndex >= 0 ? cells[header.emailIndex] || "" : "";
  let name = "";
  if (header.fullNameIndex >= 0) name = cells[header.fullNameIndex] || "";
  else {
    const first = header.firstNameIndex >= 0 ? cells[header.firstNameIndex] || "" : "";
    const last = header.lastNameIndex >= 0 ? cells[header.lastNameIndex] || "" : "";
    name = [first, last].filter(Boolean).join(" ");
  }
  if (!name && !email) return false;
  addRosterEntry(acc, { name, email, source: "header-columns", raw: line });
  return true;
}

function looksLikeHeader(line) {
  const low = String(line ?? "").toLocaleLowerCase("cs-CZ");
  const hasHeader = /\b(jméno|jmeno|příjmení|prijmeni|name|surname|student|žák|zak|e-?mail|třída|trida|skupina|class|login|uživatel|uzivatel)\b/.test(low);
  return hasHeader && emailsIn(line).length === 0;
}

function isNoiseCell(cell) {
  const value = safeText(cell, 180);
  if (!value) return true;
  if (/^\d+$/.test(value)) return true;
  if (/^\d+\.?[A-Za-z]?$/.test(value)) return true;
  if (/^(student|žák|zak|aktivní|active|neaktivní|inactive|uživatel|uzivatel)$/i.test(value)) return true;
  if (/^\d+\.[A-Za-z0-9-]+$/.test(value)) return true;
  return false;
}

function cleanNameAroundEmail(line, email) {
  const without = String(line ?? "").replace(email, " ");
  return without
    .split(/[\t;|,]+/)
    .map((item) => safeText(item))
    .filter((item) => item && !isNoiseCell(item) && !isValidEmail(item))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function validName(value) {
  const name = safeText(value);
  if (!name || name.length > MAX_NAME_LENGTH) return false;
  if (!/[\p{L}]/u.test(name)) return false;
  return !/[<>]/.test(name);
}

function createRosterAccumulator() {
  return { entries: [], invalid: [], duplicates: [], seen: new Set(), segments: 0 };
}

function addRosterEntry(acc, { name = "", email = "", source = "pasted", raw = "" } = {}) {
  acc.segments += 1;
  const cleanEmail = normalizeEmail(email);
  let cleanName = safeText(name);
  if (!cleanName && cleanEmail) cleanName = inferNameFromEmail(cleanEmail);
  if (cleanEmail && !isValidEmail(cleanEmail)) {
    acc.invalid.push({ reason: "invalid-email", value: safeText(raw || email, 180) });
    return;
  }
  if (!validName(cleanName)) {
    acc.invalid.push({ reason: "invalid-name", value: safeText(raw || name || email, 180) });
    return;
  }
  const key = cleanEmail ? `email:${cleanEmail}` : `name:${normalizeName(cleanName)}`;
  if (acc.seen.has(key)) {
    acc.duplicates.push({ name: cleanName, schoolEmail: cleanEmail || null });
    return;
  }
  acc.seen.add(key);
  acc.entries.push({
    previewId: `row-${acc.entries.length + 1}`,
    name: cleanName,
    schoolEmail: cleanEmail || null,
    source,
  });
}

function parseEmailLine(acc, line) {
  const lineEmails = emailsIn(line);
  if (!lineEmails.length) return false;
  const cells = String(line)
    .split(/[\t;|,]+/)
    .map((item) => safeText(item, 360))
    .filter(Boolean);
  if (lineEmails.length === 1) {
    const email = lineEmails[0];
    addRosterEntry(acc, { name: cleanNameAroundEmail(line, email), email, source: "email", raw: line });
    return true;
  }
  if (cells.length <= 1) {
    for (const email of lineEmails) addRosterEntry(acc, { email, source: "email-inferred", raw: email });
    return true;
  }
  let pending = [];
  for (const cell of cells) {
    const cellEmails = emailsIn(cell);
    if (!cellEmails.length) {
      if (!isNoiseCell(cell)) pending.push(cell);
      continue;
    }
    if (cellEmails.length === 1) {
      const email = cellEmails[0];
      const inlineName = cleanNameAroundEmail(cell, email);
      addRosterEntry(acc, { name: inlineName || pending.join(" "), email, source: inlineName ? "email-inline" : pending.length ? "is-columns" : "email-inferred", raw: cell });
    } else {
      for (const email of cellEmails) addRosterEntry(acc, { email, source: "email-inferred", raw: email });
    }
    pending = [];
  }
  return true;
}

function parseNameOnlyLine(acc, line) {
  const value = safeText(line, 1000);
  if (!value || looksLikeHeader(value)) return;
  const invalidEmailLike = value.includes("@") && emailsIn(value).length === 0;
  if (invalidEmailLike) {
    acc.invalid.push({ reason: "invalid-email", value: value.slice(0, 180) });
    return;
  }
  if (/[\t;|]/.test(value)) {
    const cells = value.split(/[\t;|]+/).map((item) => safeText(item)).filter(Boolean);
    if (cells.length === 2 && cells.every((item) => /^\p{L}+[\p{L}'\u2019-]*$/u.test(item))) {
      addRosterEntry(acc, { name: `${cells[0]} ${cells[1]}`, source: "name-columns", raw: value });
      return;
    }
    cells.forEach((name) => addRosterEntry(acc, { name, source: "name-list", raw: name }));
    return;
  }
  if (value.includes(",")) {
    const cells = value.split(/,+/).map((item) => safeText(item)).filter(Boolean);
    if (cells.length === 2 && cells.every((item) => /^\p{L}+[\p{L}'\u2019-]*$/u.test(item))) {
      addRosterEntry(acc, { name: `${cells[0]} ${cells[1]}`, source: "surname-firstname", raw: value });
      return;
    }
    cells.forEach((name) => addRosterEntry(acc, { name, source: "name-list", raw: name }));
    return;
  }
  addRosterEntry(acc, { name: value, source: "name-line", raw: value });
}

export function parseRosterText(raw) {
  const text = String(raw ?? "").replace(/\u00a0/g, " ").replace(/[\u200b-\u200d\ufeff]/g, "");
  if (text.length > MAX_IMPORT_CHARS) throw new Error("ROSTER_IMPORT_TOO_LARGE");
  const acc = createRosterAccumulator();
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  let header = null;
  for (const line of lines) {
    if (acc.entries.length >= MAX_MEMBERS_PER_GROUP) break;
    if (looksLikeHeader(line)) {
      header = detectRosterHeader(line);
      continue;
    }
    if (parseHeaderGuidedLine(acc, line, header)) continue;
    if (!parseEmailLine(acc, line)) parseNameOnlyLine(acc, line);
  }
  if (acc.entries.length > MAX_MEMBERS_PER_GROUP) throw new Error("ROSTER_MEMBER_LIMIT_EXCEEDED");
  return {
    entries: acc.entries.slice(0, MAX_MEMBERS_PER_GROUP),
    invalid: acc.invalid,
    duplicates: acc.duplicates,
    totalSegments: acc.segments,
    truncated: acc.entries.length >= MAX_MEMBERS_PER_GROUP && lines.length > MAX_MEMBERS_PER_GROUP,
    limits: { maxEntries: MAX_MEMBERS_PER_GROUP, maxChars: MAX_IMPORT_CHARS },
  };
}

function uniqueMap(items, keyFn) {
  const map = new Map();
  const duplicateKeys = new Set();
  for (const item of items) {
    const key = keyFn(item);
    if (!key) continue;
    if (map.has(key)) duplicateKeys.add(key);
    else map.set(key, item);
  }
  for (const key of duplicateKeys) map.delete(key);
  return map;
}

function comparableMember(member) {
  return {
    name: safeText(member.name),
    schoolEmail: member.schoolEmail ? normalizeEmail(member.schoolEmail) : null,
    status: member.status,
  };
}

function buildRosterPlan(group, parsed, { replace = true, idFactory = secureId } = {}) {
  const existing = group.members || [];
  const byEmail = uniqueMap(existing, (member) => member.schoolEmail ? normalizeEmail(member.schoolEmail) : "");
  const byName = uniqueMap(existing, (member) => normalizeName(member.name));
  const matched = new Set();
  const added = [];
  const changed = [];
  const restored = [];
  const unchanged = [];
  const nextIncoming = [];
  const timestamp = nowIso();

  for (const row of parsed.entries) {
    const emailKey = row.schoolEmail ? normalizeEmail(row.schoolEmail) : "";
    const nameKey = normalizeName(row.name);
    let match = emailKey ? byEmail.get(emailKey) : null;
    if (!match && nameKey) match = byName.get(nameKey) || null;
    if (match && matched.has(match.memberId)) match = null;
    if (!match) {
      const member = {
        memberId: idFactory("mem"),
        name: safeText(row.name),
        schoolEmail: row.schoolEmail ? normalizeEmail(row.schoolEmail) : null,
        status: "active",
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      added.push(member);
      nextIncoming.push(member);
      continue;
    }
    matched.add(match.memberId);
    const previous = comparableMember(match);
    const next = {
      ...match,
      name: safeText(row.name),
      schoolEmail: row.schoolEmail ? normalizeEmail(row.schoolEmail) : null,
      status: "active",
    };
    const after = comparableMember(next);
    const changedFields = [];
    if (previous.name !== after.name) changedFields.push("name");
    if (previous.schoolEmail !== after.schoolEmail) changedFields.push("schoolEmail");
    if (previous.status !== after.status) changedFields.push("status");
    if (changedFields.length) next.updatedAt = timestamp;
    if (previous.status === "archived") restored.push({ before: clone(match), after: clone(next), fields: changedFields });
    else if (changedFields.length) changed.push({ before: clone(match), after: clone(next), fields: changedFields });
    else unchanged.push(clone(next));
    nextIncoming.push(next);
  }

  const removed = [];
  const untouchedArchived = [];
  const incomingIds = new Set(nextIncoming.map((member) => member.memberId));
  for (const member of existing) {
    if (incomingIds.has(member.memberId)) continue;
    if (member.status === "active" && replace) {
      const archived = { ...member, status: "archived", updatedAt: timestamp };
      removed.push({ before: clone(member), after: clone(archived) });
    } else {
      untouchedArchived.push(clone(member));
    }
  }

  const nextMembers = [
    ...nextIncoming,
    ...removed.map((item) => item.after),
    ...untouchedArchived,
  ];
  const hasChanges = added.length > 0 || changed.length > 0 || restored.length > 0 || removed.length > 0;
  return { added, changed, restored, removed, unchanged, nextMembers, hasChanges };
}

function cleanGroupInput(input = {}) {
  const displayName = safeText(input.displayName);
  const schoolYear = String(input.schoolYear ?? "").trim();
  const subject = safeText(input.subject || "", 80) || null;
  const grade = safeText(input.grade || "", 40) || null;
  if (!displayName) throw new Error("GROUP_DISPLAY_NAME_REQUIRED");
  if (!/^\d{4}\/\d{2,4}$/.test(schoolYear)) throw new Error("GROUP_SCHOOL_YEAR_INVALID");
  return { displayName, schoolYear, subject, grade };
}

function findGroupOrThrow(store, groupId) {
  const group = store.groups.find((item) => item.groupId === groupId);
  if (!group) throw new Error("GROUP_NOT_FOUND");
  return group;
}

function changedMetadata(group, next) {
  return ["displayName", "schoolYear", "subject", "grade", "status"].some((key) => (group[key] ?? null) !== (next[key] ?? null));
}

function projectionMetadata(group) {
  return {
    schema: GROUP_SCHEMA,
    groupId: group.groupId,
    revision: group.revision,
    displayName: group.displayName,
    schoolYear: group.schoolYear,
    subject: group.subject || null,
    grade: group.grade || null,
    status: group.status,
    updatedAt: group.updatedAt,
  };
}

function defaultEventTarget() {
  return typeof EventTarget === "function" ? new EventTarget() : null;
}

export function createGroupsService({ provider = new LocalGroupsProvider(), idFactory = secureId, eventTarget = defaultEventTarget() } = {}) {
  const listeners = new Set();
  const emit = (detail) => {
    const safeDetail = {
      schema: "ghrab-groups-change-v1",
      kind: String(detail.kind || "changed"),
      groupId: detail.groupId || null,
      revision: Number.isInteger(detail.revision) ? detail.revision : null,
    };
    for (const listener of listeners) {
      try { listener(clone(safeDetail)); } catch {}
    }
    if (eventTarget && typeof CustomEvent === "function") {
      try { eventTarget.dispatchEvent(new CustomEvent("ghrab:groups-changed", { detail: safeDetail })); } catch {}
    }
  };

  const writeStore = (store, change) => {
    store.updatedAt = nowIso();
    const written = provider.write(store);
    emit(change);
    return written;
  };

  const api = {
    schema: "ghrab-groups-service-v1",
    contractVersion: 1,
    groupSchema: GROUP_SCHEMA,
    providerKind: provider instanceof LocalGroupsProvider ? "local" : "custom",
    consumerRules: CONSUMER_RULES,

    listGroups({ status = "active" } = {}) {
      const groups = provider.read().groups;
      return clone(groups.filter((group) => status === "all" || group.status === status).sort((a, b) => a.displayName.localeCompare(b.displayName, "cs")));
    },

    getGroup(groupId) {
      const group = provider.read().groups.find((item) => item.groupId === groupId);
      return group ? clone(group) : null;
    },

    createGroup(input) {
      const store = provider.read();
      if (store.groups.length >= MAX_GROUPS) throw new Error("GROUP_LIMIT_EXCEEDED");
      const metadata = cleanGroupInput(input);
      const timestamp = nowIso();
      const group = {
        schema: GROUP_SCHEMA,
        groupId: idFactory("grp"),
        revision: 1,
        ...metadata,
        status: "active",
        createdAt: timestamp,
        updatedAt: timestamp,
        members: [],
      };
      const validation = validateTeachingGroup(group);
      if (!validation.ok) throw new Error(`GROUP_VALIDATION_FAILED:${validation.errors.join(",")}`);
      store.groups.push(group);
      writeStore(store, { kind: "created", groupId: group.groupId, revision: group.revision });
      return clone(group);
    },

    updateGroup(groupId, patch = {}, { expectedRevision = null } = {}) {
      const store = provider.read();
      const group = findGroupOrThrow(store, groupId);
      if (expectedRevision != null && group.revision !== expectedRevision) throw new Error("GROUP_REVISION_CONFLICT");
