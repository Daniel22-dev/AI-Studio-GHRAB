/**
 * PREPRODUCTION ONLY — legacy v1 backup -> authenticated v2 account namespace.
 *
 * v1 has NO owner identity. Staff must verify ownership OUTSIDE this module.
 * An approval reference/checkbox is not a signature or authorization system.
 * This module never reads/moves/deletes the v1 browser localStorage key.
 */
import { validateGroupsStore } from "./group-service.js";

const SOURCE_SCHEMA = "ghrab-teaching-groups-backup-v1";
const TARGET_SCHEMA = "ghrab-teaching-groups-account-backup-v2";
const MAX_BACKUP_BYTES = 12 * 1024 * 1024;
const APPROVAL_PHRASE = "POTVRZUJI PREVOD SKUPIN";

function migrationError(code) {
  return new Error(code);
}
function jsonCopy(input) {
  try {
    const json = JSON.stringify(input);
    if (!json || json.length > MAX_BACKUP_BYTES) throw migrationError("GROUP_MIGRATION_SOURCE_TOO_LARGE");
    return JSON.parse(json);
  } catch (error) {
    if (error?.message === "GROUP_MIGRATION_SOURCE_TOO_LARGE") throw error;
    throw migrationError("GROUP_MIGRATION_SOURCE_INVALID");
  }
}
function rejectUnsafeKeys(root) {
  const pending = [root];
  while (pending.length) {
    const node = pending.pop();
    if (!node || typeof node !== "object") continue;
    for (const [key, value] of Object.entries(node)) {
      if (key === "__proto__" || key === "constructor" || key === "prototype") {
        throw migrationError("GROUP_MIGRATION_UNSAFE_KEYS");
      }
      if (value && typeof value === "object") pending.push(value);
    }
  }
}
function validateSource(backup) {
  if (!backup || typeof backup !== "object" || Array.isArray(backup) ||
      backup.schema !== SOURCE_SCHEMA || backup.version !== 1 ||
      typeof backup.exportedAt !== "string" || !Number.isFinite(Date.parse(backup.exportedAt)) ||
      Object.keys(backup).some(key => !["schema", "version", "exportedAt", "store"].includes(key))) {
    throw migrationError("GROUP_MIGRATION_SOURCE_INVALID");
  }
  rejectUnsafeKeys(backup);
  const result = validateGroupsStore(backup.store);
  if (!result.ok || !backup.store.groups.length) {
    throw migrationError("GROUP_MIGRATION_SOURCE_INVALID");
  }
  return backup;
}
async function sha256Hex(text, cryptoApi) {
  if (!cryptoApi?.subtle || typeof cryptoApi.subtle.digest !== "function") {
    throw migrationError("GROUP_MIGRATION_CRYPTO_UNAVAILABLE");
  }
  const bytes = new Uint8Array(await cryptoApi.subtle.digest("SHA-256",new TextEncoder().encode(text)));
  if (bytes.length !== 32) throw migrationError("GROUP_MIGRATION_CRYPTO_UNAVAILABLE");
  return [...bytes].map(b=>b.toString(16).padStart(2,"0")).join("");
}
function requireTarget(session) {
  if (session?.schema !== "ghrab-groups-principal-session-v2" ||
      !session.service || typeof session.service.exportBackup !== "function" ||
      typeof session.service.importBackup !== "function") {
    throw migrationError("GROUP_MIGRATION_TARGET_UNVERIFIED");
  }
  const existing = session.service.exportBackup(); // Also checks pinned access.
  if (existing.schema !== TARGET_SCHEMA || existing.version !== 2 ||
      !/^[a-f0-9]{64}$/.test(String(existing.scopeId || "")) ||
      !Array.isArray(existing.store?.groups) ||
      !validateGroupsStore(existing.store).ok) {
    throw migrationError("GROUP_MIGRATION_TARGET_UNVERIFIED");
  }
  if (existing.store.groups.length) throw migrationError("GROUP_MIGRATION_TARGET_NOT_EMPTY");
  return existing;
}
function assertApproval(approval, summary) {
  // All four checks are a documented MANUAL acceptance gate, not an authority proof.
  if (!approval || approval.schoolOwnershipReviewed !== true ||
      approval.originalTeacherConfirmed !== true ||
      typeof approval.schoolApprovalReference !== "string" ||
      !/^[A-Za-z0-9][A-Za-z0-9/_-]{7,79}$/.test(approval.schoolApprovalReference) ||
      approval.typedPhrase !== APPROVAL_PHRASE ||
      approval.reviewedSourceDigest !== summary.sourceDigest ||
      approval.reviewedTargetScope !== summary.targetScope) {
    throw migrationError("GROUP_MIGRATION_APPROVAL_REQUIRED");
  }
}

/**
 * Prepares a one-use, in-memory, reviewed local transfer. No network or
 * storage mutation occurs until commit() and only if target is still empty.
 */
export async function prepareLegacyGroupsMigration({
  sourceBackup,
  targetSession,
  cryptoApi = globalThis.crypto,
} = {}) {
  const immutableSource = validateSource(jsonCopy(sourceBackup));
  const targetBefore = requireTarget(targetSession);
  const sourceDigest = await sha256Hex(JSON.stringify(immutableSource.store), cryptoApi);
  const targetScope = targetBefore.scopeId;
  const groups = immutableSource.store.groups.map(group=>({
    groupId: group.groupId,
    displayName: group.displayName,
    revision: group.revision,
    status: group.status,
    activeMembers: group.members.filter(m=>m.status==="active").length,
    archivedMembers: group.members.filter(m=>m.status==="archived").length,
  }));
  const summary = Object.freeze({
    schema:"ghrab-groups-legacy-migration-preview-v1",
    sourceDigest,
    targetScope,
    groups:Object.freeze(groups.map(item=>Object.freeze(item))),
    groupCount:groups.length,
    memberCount:groups.reduce((n,g)=>n+g.activeMembers+g.archivedMembers,0),
    sourceExportedAt:immutableSource.exportedAt,
    legacyWillBeDeleted:false,
  });
  let consumed = false;
  const commit = async (approval) => {
    if (consumed) throw migrationError("GROUP_MIGRATION_ALREADY_USED");
    assertApproval(approval,summary);
    const targetNow = requireTarget(targetSession);
    if (targetNow.scopeId !== targetScope) throw migrationError("GROUP_MIGRATION_TARGET_CHANGED");
    const currentSourceDigest = await sha256Hex(JSON.stringify(immutableSource.store), cryptoApi);
    if (currentSourceDigest !== sourceDigest) throw migrationError("GROUP_MIGRATION_SOURCE_CHANGED");
    // Once attempted, retry only after explicit review; storage writes are not assumed atomic across failures.
    consumed = true;
    targetSession.service.importBackup({
      schema: TARGET_SCHEMA,
      version:2,
      scopeId:targetScope,
      exportedAt:immutableSource.exportedAt,
      store:immutableSource.store,
    });
    const imported = targetSession.service.exportBackup();
    if (imported.scopeId !== targetScope ||
        JSON.stringify(imported.store.groups) !== JSON.stringify(immutableSource.store.groups)) {
      throw migrationError("GROUP_MIGRATION_VERIFY_FAILED");
    }
    // Never include pupil names/e-mails or approval reference in this report.
    return Object.freeze({
      schema:"ghrab-groups-legacy-migration-result-v1",
      sourceDigest,targetScope,groupCount:summary.groupCount,
      memberCount:summary.memberCount,verified:true,
      legacyWillBeDeleted:false,
      schoolOwnershipProofCryptographic:false,
    });
  };
  return Object.freeze({summary,commit});
}
