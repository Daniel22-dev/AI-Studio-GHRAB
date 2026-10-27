import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  LocalGroupsProvider,
  createGroupsService,
  createGroupsPageAccessGate,
  createPrincipalGroupsSession,
  principalGroupsStorageKey,
  parseRosterText,
  validateTeachingGroup,
  rosterProjectionToCsv,
  GHRAB_GROUPS_CONSTANTS,
} from "../src/groups/group-service.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

class MemoryStorage {
  constructor() { this.map = new Map(); }
  getItem(key) { return this.map.has(key) ? this.map.get(key) : null; }
  setItem(key, value) { this.map.set(key, String(value)); }
  removeItem(key) { this.map.delete(key); }
}

function idFactory() {
  let n = 0;
  return (prefix) => `${prefix}_${String(++n).padStart(12, "0")}`;
}

function serviceFixture({ diagnostics = [] } = {}) {
  const storage = new MemoryStorage();
  const provider = new LocalGroupsProvider({ storage, onDiagnostic: (item) => diagnostics.push(item) });
  return { storage, provider, service: createGroupsService({ provider, idFactory: idFactory(), eventTarget: null }) };
}

function createSampleGroup(service) {
  return service.createGroup({ displayName: "1A4 · AJ", schoolYear: "2026/27", subject: "Anglický jazyk", grade: "1. ročník" });
}

const parser = parseRosterText([
  "Jméno; E-mail",
  "Alice Novak; alice.novak@example.edu",
  "Boris Svoboda\tboris.svoboda@example.edu",
  "alice.novak@example.edu",
  "invalid@@example",
].join("\n"));
assert.equal(parser.entries.length, 2, "parser recognizes IS-style name/email rows");
assert.equal(parser.duplicates.length, 1, "parser deduplicates repeated email");
assert.equal(parser.invalid.length, 1, "parser reports malformed email-like input");
assert.equal(parser.entries[0].previewId, "row-1", "preview IDs are ordinal, not PII-derived");
assert.ok(!parser.entries[0].previewId.includes("alice"));

const surnameFirst = parseRosterText("Příjmení;Jméno;E-mail\nNovak;Alice;alice.novak@example.edu");
assert.equal(surnameFirst.entries[0].name, "Alice Novak", "header-guided IS import preserves first-name / surname order");

const commaNames = parseRosterText("Novak, Alice\nBoris Svoboda, Carla Vesela");
assert.equal(commaNames.entries[0].name, "Novak Alice");
assert.equal(commaNames.entries.length, 3, "comma/newline name lists are supported");

const hostile = parseRosterText('<img src=x onerror=alert(1)>\n<script>alert(1)</script>');
assert.equal(hostile.entries.length, 0, "hostile HTML-like names are rejected");
assert.equal(hostile.invalid.length, 2);

{
  const { service } = serviceFixture();
  const created = createSampleGroup(service);
  assert.equal(created.revision, 1);
  assert.match(created.groupId, /^grp_[a-z0-9-]{12,}$/i);
  assert.ok(!created.groupId.toLowerCase().includes("alice"), "group ID is random/opaque, not PII-derived");
  assert.equal(service.listGroups().length, 1);
  assert.equal(service.getRevision(created.groupId), 1);

  const noOp = service.updateGroup(created.groupId, { displayName: created.displayName }, { expectedRevision: 1 });
  assert.equal(noOp.revision, 1, "metadata no-op does not increment revision");
  const updated = service.updateGroup(created.groupId, { subject: "English" }, { expectedRevision: 1 });
  assert.equal(updated.revision, 2, "metadata update increments revision");
  assert.throws(() => service.updateGroup(created.groupId, { grade: "I" }, { expectedRevision: 1 }), /GROUP_REVISION_CONFLICT/);

  const firstImport = service.importRoster({
    groupId: created.groupId,
    rawText: "Alice Novak; alice.novak@example.edu\nBoris Svoboda; boris.svoboda@example.edu",
    replace: true,
    expectedRevision: 2,
  });
  assert.equal(firstImport.group.revision, 3);
  assert.equal(firstImport.diff.added.length, 2);
  const aliceId = firstImport.group.members.find((m) => m.name === "Alice Novak").memberId;
  const borisId = firstImport.group.members.find((m) => m.name === "Boris Svoboda").memberId;
  assert.match(aliceId, /^mem_[a-z0-9-]{12,}$/i);
  assert.ok(!aliceId.toLowerCase().includes("alice"), "member ID is not PII-derived");

  const secondPreview = service.previewRosterImport(created.groupId,
    "Alice Novotna; alice.novak@example.edu\nCarla Vesela; carla.vesela@example.edu",
    { replace: true });
  assert.equal(secondPreview.currentRevision, 3);
  assert.equal(secondPreview.diff.changed.length, 1, "same email preserves identity while allowing name correction");
  assert.equal(secondPreview.diff.added.length, 1);
  assert.equal(secondPreview.diff.removed.length, 1, "missing active member is planned for archival");

  const secondImport = service.importRoster({
    groupId: created.groupId,
    rawText: "Alice Novotna; alice.novak@example.edu\nCarla Vesela; carla.vesela@example.edu",
    replace: true,
    expectedRevision: secondPreview.currentRevision,
  });
  assert.equal(secondImport.group.revision, 4);
  const alice = secondImport.group.members.find((m) => m.schoolEmail === "alice.novak@example.edu");
  const boris = secondImport.group.members.find((m) => m.memberId === borisId);
  assert.equal(alice.memberId, aliceId, "identity remains stable across member update");
  assert.equal(boris.status, "archived", "removed member is archived, not deleted");
  const generatorFiltered = service.getRosterProjection(created.groupId, "generator-forms");
  assert.equal(generatorFiltered.members.length, 2, "GIT code distribution includes exactly the two active members");
  assert.ok(generatorFiltered.members.every(member => member.memberId !== borisId),
    "GIT code-distribution view excludes archived members");
  assert.ok(generatorFiltered.members.every(member => !Object.hasOwn(member, "status")),
    "GIT does not need archival status in the active-only code roster");
  const sortioWithArchived = service.getRosterProjection(created.groupId, "sortio");
  const projectedBoris = sortioWithArchived.members.find((m) => m.memberId === borisId);
  assert.equal(projectedBoris?.status, "archived", "SORTIO projection includes archived members for non-destructive sync");
  assert.ok(!Object.hasOwn(projectedBoris, "schoolEmail"), "archived SORTIO member still contains no email");

  const restorePreview = service.previewRosterImport(created.groupId,
    "Alice Novotna; alice.novak@example.edu\nBoris Svoboda; boris.svoboda@example.edu\nCarla Vesela; carla.vesela@example.edu",
    { replace: true });
  assert.equal(restorePreview.diff.restored.length, 1);
  const restored = service.importRoster({ groupId: created.groupId, rawText: "Alice Novotna; alice.novak@example.edu\nBoris Svoboda; boris.svoboda@example.edu\nCarla Vesela; carla.vesela@example.edu", replace: true, expectedRevision: restorePreview.currentRevision });
  assert.equal(restored.group.members.find((m) => m.memberId === borisId).status, "active");

  const groupMetadata = service.listGroupMetadata("sortio");
  assert.equal(groupMetadata.length, 1, "SORTIO can enumerate central groups through metadata-only projection");
  assert.ok(groupMetadata.every((group) => !Object.hasOwn(group, "members")), "group chooser metadata never contains roster members");
  assert.ok(!JSON.stringify(groupMetadata).includes("example.edu"), "group chooser metadata contains no school email");
  assert.throws(() => service.listGroupMetadata("unknown-app"), /GROUP_CONSUMER_NOT_ALLOWED/);

  const sortio = service.getRosterProjection(created.groupId, "sortio");
  assert.equal(sortio.members.length, 3);
  assert.ok(sortio.members.every((m) => !Object.hasOwn(m, "schoolEmail")), "SORTIO projection has no email");
  assert.ok(sortio.members.every((m) => m.status === "active"), "SORTIO projection exposes member status");
  const evaluator = service.getRosterProjection(created.groupId, "essay-evaluator");
  assert.ok(evaluator.members.every((m) => Object.hasOwn(m, "schoolEmail")), "evaluator projection contains school email");
  const lessonHub = service.getRosterProjection(created.groupId, "lesson-hub");
  assert.ok(!Object.hasOwn(lessonHub, "members"), "Lesson Hub projection contains metadata only");
  const generator = service.getRosterProjection(created.groupId, "generator");
  assert.ok(!Object.hasOwn(generator, "members"), "generator seam exists without roster exposure");
  const generatorForms = service.getRosterProjection(created.groupId, "generator-forms");
  assert.equal(generatorForms.consumerAppId, "generator-forms");
  assert.equal(generatorForms.contract, "ghrab-roster-projection-v1");
  assert.equal(generatorForms.group.groupId, created.groupId);
  assert.ok(generatorForms.members.every(member =>
    Object.keys(member).every(key => ["memberId", "name", "schoolEmail"].includes(key))));
  assert.ok(generatorForms.members.every(member => Object.hasOwn(member, "schoolEmail")));
  assert.ok(generatorForms.members.every(member => !Object.hasOwn(member, "code")));
  assert.throws(() => service.getRosterProjection(created.groupId, "unknown-app"), /GROUP_CONSUMER_NOT_ALLOWED/);

  const events = [];
  const unsubscribe = service.subscribe((event) => events.push(event));
  service.updateGroup(created.groupId, { grade: "1" }, { expectedRevision: restored.group.revision });
  unsubscribe();
  const eventDump = JSON.stringify(events);
  assert.ok(!/Alice|Boris|Carla|example\.edu/i.test(eventDump), "change notifications contain no PII");

  const validation = validateTeachingGroup(service.getGroup(created.groupId));
  assert.equal(validation.ok, true, validation.errors.join(","));
  const bad = service.getGroup(created.groupId);
  bad.revision = 0;
  assert.ok(validateTeachingGroup(bad).errors.includes("REVISION_INVALID"));

  const backup = service.exportBackup();
  const targetStorage = new MemoryStorage();
  const targetProvider = new LocalGroupsProvider({ storage: targetStorage });
  const targetService = createGroupsService({ provider: targetProvider, idFactory: idFactory(), eventTarget: null });
  targetService.importBackup(backup);
  assert.deepEqual(targetService.getGroup(created.groupId).members, service.getGroup(created.groupId).members, "backup restore preserves stable IDs");
}

{
  const diagnostics = [];
  const { storage, provider, service } = serviceFixture({ diagnostics });
  const group = createSampleGroup(service);
  storage.setItem(GHRAB_GROUPS_CONSTANTS.STORAGE_KEY, '{"broken":');
  const recovered = provider.read();
  assert.equal(recovered.groups[0].groupId, group.groupId, "provider falls back to last known-good copy after corruption");
  assert.ok(diagnostics.some((item) => item.code === "GROUP_STORAGE_CORRUPT"));
  const diagDump = JSON.stringify(diagnostics);
  assert.ok(!/1A4|Anglick|example\.edu/.test(diagDump), "storage diagnostics contain no PII");

  const freshDiagnostics = [];
  const freshStorage = new MemoryStorage();
  freshStorage.setItem(GHRAB_GROUPS_CONSTANTS.STORAGE_KEY, "not-json");
  const fresh = new LocalGroupsProvider({ storage: freshStorage, onDiagnostic: (item) => freshDiagnostics.push(item) });
  assert.equal(fresh.read().groups.length, 0, "fresh corrupt store fails closed to empty canonical store");
}

{
  const csv = rosterProjectionToCsv({ members: [{ memberId: "mem_000000000001", name: "=2+2", schoolEmail: "+cmd@example.edu" }] });
  assert.match(csv, /"'=2\+2"/);
  assert.match(csv, /"'\+cmd@example\.edu"/);
}

{
  const large = Array.from({ length: 600 }, (_, i) => `Student ${i + 1}; student${i + 1}@example.edu`).join("\n");
  const started = performance.now();
  const parsed = parseRosterText(large);
  const elapsed = performance.now() - started;
  assert.equal(parsed.entries.length, 500, "large roster is bounded to 500 entries");
  assert.equal(parsed.truncated, true);
  assert.ok(elapsed < 1000, `large roster parser should remain responsive (${elapsed.toFixed(1)} ms)`);
}

{
  const html = await readFile(path.join(root, "src/groups/index.html"), "utf8");
  const js = await readFile(path.join(root, "src/groups/groups.js"), "utf8");
  const css = await readFile(path.join(root, "src/groups/groups.css"), "utf8");
  const serviceSource = await readFile(path.join(root, "src/groups/group-service.js"), "utf8");
  const appSource = await readFile(path.join(root, "src/app.js"), "utf8");
  assert.match(html, /name="viewport"/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /<dialog[^>]+group-dialog/);
  assert.match(css, /@media \(max-width: 680px\)/);
  assert.match(css, /prefers-reduced-motion/);
  assert.ok(!js.includes("innerHTML"), "roster UI must not render user data through innerHTML");
  assert.ok(!serviceSource.includes("ghrab-material-v1"), "group service is separated from material handoff");
  assert.ok(!serviceSource.includes("providerSnapshot"), "public API exposes no raw provider snapshot escape hatch");
  assert.ok(!/recordEvent|telemetry|errorReporter|queryString/i.test(serviceSource), "group service has no telemetry/reporting transport");
  assert.ok(appSource.includes('link.dataset.groupsAccess = ""'), "My Groups navigation uses a dedicated capability marker");
  assert.ok(appSource.includes("const teachingGroups = Boolean(teacher || admin || operator);"), "My Groups is available to teacher, admin and operator roles without broadening generic teacher-only UI");
}

{
  // My Groups may mount only after the real Studio permit/session is validated.
  const now = 1800000000;
  const teacher = (sub = "teacher-A", role = "teacher") => ({
    ready: true,
    valid: true,
    permit: { sub, role, exp: now + 3600 },
  });
  let active = teacher();
  let preview = false;
  const makeGate = () => createGroupsPageAccessGate({
    getSnapshot: () => active,
    isPreview: () => preview,
    nowSeconds: () => now,
  });
  const gate = makeGate();
  const { service } = serviceFixture();
  const protectedService = gate.protect(service);
  assert.equal(protectedService.schema, service.schema);
  assert.equal(protectedService.listGroups().length, 0);
  const created = protectedService.createGroup({
    displayName: "Synthetic group",
    schoolYear: "2026/27",
  });
  assert.equal(protectedService.getGroup(created.groupId).groupId, created.groupId);
  assert.ok(Object.isFrozen(protectedService));

  active = teacher("teacher-B");
  assert.equal(gate.allowed(), false, "different teacher must invalidate the open page");
  assert.throws(() => protectedService.listGroups(), /GROUP_ACCESS_DENIED/);
  active = teacher("teacher-A");
  assert.throws(() => protectedService.getGroup(created.groupId), /GROUP_ACCESS_DENIED/,
    "a revoked view cannot be reactivated by returning to its old principal");

  active = teacher();
  preview = true;
  assert.throws(makeGate, /GROUP_ACCESS_DENIED/, "colleague preview is never an authenticated teacher");
  preview = false;
  for (const invalid of [
    { ready: false, valid: true, permit: teacher().permit },
    { ready: true, valid: false, permit: teacher().permit },
    { ready: true, valid: true, permit: { ...teacher().permit, sub: "" } },
    teacher("synthetic", "student"),
    { ready: true, valid: true, permit: { ...teacher().permit, exp: now } },
  ]) {
    active = invalid;
    assert.throws(makeGate, /GROUP_ACCESS_DENIED/);
  }
  active = teacher("teacher-C", "operator");
  assert.equal(makeGate().allowed(), true, "authorized deputy/operator role is supported");
  active = teacher("teacher-D", "admin");
  assert.equal(makeGate().allowed(), true, "authorized administrator role is supported");
  active = {
    ...teacher("teacher-E", "school-administrator"),
    policy: { administratorRoles: ["school-administrator"], operatorRoles: ["operator"] },
  };
  assert.equal(makeGate().allowed(), true, "signed policy-defined administrator role is supported");
  active = { ready: true, valid: true, permit: { sub: "server-teacher", role: "teacher" } };
  assert.equal(makeGate().allowed(), true, "verified server session need not carry an explicit expiry");
  assert.throws(() => createGroupsPageAccessGate(), /GROUP_ACCESS_CONFIG_INVALID/);
}

{
  const js = await readFile(path.join(root, "src/groups/groups.js"), "utf8");
  assert.ok(js.indexOf("await studio.accessReady") >= 0);
  assert.ok(js.indexOf("await studio.accessReady") < js.indexOf("await createPrincipalGroupsSession("),
    "account-scoped group service must not mount before signed Studio authorization");
  assert.match(js, /await createPrincipalGroupsSession\(/,
    "My Groups writer must use account-scoped verified v2 session");
  assert.match(js, /const groups = scoped\.service;/,
    "global group API must expose only the verified v2 facade");
  assert.ok(!js.includes("new LocalGroupsProvider("), "v1 shared browser provider must not mount");
  assert.ok(!js.includes("createGroupsService({ provider })"), "v1 consumer fallback forbidden");
  assert.match(js, /legacyStorePresent = scoped\.legacyStorePresent/,
    "old v1 groups must signal review without automatic migration");
  assert.match(js, /ai-studio-moje-skupiny-ucet-v2-/,
    "account-scoped v2 backup file must be distinguished from v1");
  assert.match(js, /ghrab:access-changed/, "revocation must invalidate the visible group page");
  assert.match(js, /function render\(\) \{\s*if \(!accessGate\.allowed\(\)\)/,
    "late queued UI rendering must fail closed after access revocation");
  assert.ok(js.includes("denyGroupsPage()"), "denied page must wipe personal data from the DOM");
  assert.ok(!js.includes("installGlobalGroupsApi"), "page must not export an unguarded service");
}


{
  // Stage08 privacy migration path: new per-principal namespace is opt-in,
  // preserves v1 data without silently transferring it to the next teacher.
  const { webcrypto } = await import("node:crypto");
  const sharedBrowser = new MemoryStorage();
  const legacy = createGroupsService({
    provider: new LocalGroupsProvider({ storage: sharedBrowser }),
    idFactory: idFactory(),
    eventTarget: null,
  });
  const original = legacy.createGroup({
    displayName: "Legacy synthetic class", schoolYear: "2026/27",
  });
  const now = Math.floor(Date.now() / 1000);
  const principal = (sub, mode = "signed-permit") => ({
    ready: true,
    valid: true,
    mode,
    permit: { sub, role: "teacher", exp: now + 3600 },
  });
  let access = principal("account-A");
  const globalSyntheticIds = idFactory();
  const open = async () => createPrincipalGroupsSession({
    getSnapshot: () => access,
    storage: sharedBrowser,
    cryptoApi: webcrypto,
    idFactory: globalSyntheticIds,
    eventTarget: null,
  });
  const a1 = await open();
  assert.equal(a1.schema, "ghrab-groups-principal-session-v2");
  assert.equal(a1.legacyStorePresent, true, "legacy v1 data should be flagged but not exposed");
  assert.deepEqual(a1.service.listGroups(), [], "v2 must not auto-import shared v1 data");
  const classA = a1.service.createGroup({ displayName: "Account A", schoolYear: "2026/27" });
  assert.equal(a1.service.getGroup(classA.groupId).displayName, "Account A");
  const updatedRoster = a1.service.importRoster({
    groupId: classA.groupId,
    rawText: "Synthetic Student; synthetic@example.invalid",
    expectedRevision: 1,
  });
  assert.equal(updatedRoster.group.members.length, 1);
  const studentId = updatedRoster.group.members[0].memberId;
  const linked = a1.service.listGroupMetadata("sortio");
  assert.equal(linked[0].groupId, classA.groupId);
  const essayProjection = a1.service.getRosterProjection(classA.groupId, "essay-evaluator");
  assert.equal(essayProjection.members[0].memberId, studentId);
  assert.equal(essayProjection.members[0].schoolEmail, "synthetic@example.invalid");
  assert.equal(a1.service.getRosterProjection(classA.groupId, "generator-forms").members[0].memberId, studentId);
  assert.ok(!Object.hasOwn(a1.service.getRosterProjection(classA.groupId, "lesson-hub"), "members"));

  access = principal("account-B");
  assert.throws(() => a1.service.listGroups(), /GROUP_ACCESS_DENIED/,
    "a user switch permanently revokes old principal's v2 service");
  const b = await open();
  assert.deepEqual(b.service.listGroups(), [], "second principal cannot read first principal's groups");
  const classB = b.service.createGroup({ displayName: "Account B", schoolYear: "2026/27" });
  assert.notEqual(classA.groupId, classB.groupId, "test fixtures must use unique canonical IDs");
  assert.equal(b.service.listGroups()[0].groupId, classB.groupId);
  assert.throws(() => b.service.getRosterProjection(classA.groupId, "essay-evaluator"), /GROUP_NOT_FOUND/,
    "principal B cannot read principal A's canonical roster");
  assert.throws(() => a1.service.exportBackup(), /GROUP_ACCESS_DENIED/);
  const bBackup = b.service.exportBackup();
  assert.equal(bBackup.schema, "ghrab-teaching-groups-account-backup-v2");
  assert.equal(bBackup.version, 2);
  assert.equal(typeof bBackup.scopeId, "string");
  assert.throws(() => b.service.importBackup(legacy.exportBackup()), /GROUP_SCOPE_BACKUP_INVALID/,
    "unbound legacy backups must never auto-migrate to a principal");


  access = principal("account-A");
  assert.throws(() => b.service.getGroup(classB.groupId), /GROUP_ACCESS_DENIED/);
  assert.throws(() => a1.service.getGroup(classA.groupId), /GROUP_ACCESS_DENIED/,
    "revoked session must not re-open after switching back");
  const a2 = await open();
  assert.equal(a2.service.listGroups()[0].groupId, classA.groupId,
    "new session for same identity preserves stable group ID");
  assert.equal(a2.service.getRosterProjection(classA.groupId, "essay-evaluator").members[0].memberId, studentId,
    "member IDs and consumer projection are preserved across sessions");
  const backup = a2.service.exportBackup();
  assert.equal(backup.store.groups[0].groupId, classA.groupId);
  assert.equal(backup.schema, "ghrab-teaching-groups-account-backup-v2");
  assert.notEqual(backup.scopeId, bBackup.scopeId);
  assert.throws(() => a2.service.importBackup(bBackup), /GROUP_SCOPE_BACKUP_OTHER_ACCOUNT/,
    "signed-in teacher must reject a backup bound to another account");
  assert.throws(() => a2.service.importBackup(legacy.exportBackup()), /GROUP_SCOPE_BACKUP_INVALID/,
    "legacy v1 archive is not silently adopted");
  assert.equal(a2.service.importBackup(backup).groups?.length ?? a2.service.listGroups().length, 1);

  assert.equal(legacy.listGroups()[0].groupId, original.groupId,
    "v1 store must survive scoped operations without mutation");
  const scopedAKey = await principalGroupsStorageKey({
    subject: "account-A", cryptoApi: webcrypto,
  });
  const scopedBKey = await principalGroupsStorageKey({
    subject: "account-B", cryptoApi: webcrypto,
  });
  const serverKey = await principalGroupsStorageKey({
    subject: "account-A", mode: "server-session", cryptoApi: webcrypto,
  });
  assert.match(scopedAKey, /^ghrab\.ai-studio\.groups\.account\.v2\.[a-f0-9]{64}$/);
  assert.notEqual(scopedAKey, scopedBKey);
  assert.notEqual(scopedAKey, serverKey, "server-session migration is explicit");
  assert.equal(scopedAKey.includes("account-A"), false, "identity must not appear in storage key");
  assert.deepEqual(Object.keys(Object.fromEntries(sharedBrowser.map)).filter(k => k.startsWith("ghrab.ai-studio.groups.account.v2.")).length, 2);
  await assert.rejects(principalGroupsStorageKey({ subject: " " }), /GROUP_SCOPE_IDENTITY_INVALID/);
  await assert.rejects(principalGroupsStorageKey({ subject: " account-A ", cryptoApi: webcrypto }), /GROUP_SCOPE_IDENTITY_INVALID/);
  await assert.rejects(principalGroupsStorageKey({ subject: "account-A", cryptoApi: {} }), /GROUP_SCOPE_CRYPTO_UNAVAILABLE/);
  access = principal("account-C");
  const brokenCryptoSession = createPrincipalGroupsSession({
    getSnapshot: () => access, storage: sharedBrowser, cryptoApi: {},
  });
  await assert.rejects(brokenCryptoSession, /GROUP_SCOPE_CRYPTO_UNAVAILABLE/);
}

console.log("Moje skupiny v1: all contract, parser, privacy, recovery, projection and UI sanity tests PASS");
