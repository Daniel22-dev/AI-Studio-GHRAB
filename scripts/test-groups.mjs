import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  LocalGroupsProvider,
  createGroupsService,
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

console.log("Moje skupiny v1: all contract, parser, privacy, recovery, projection and UI sanity tests PASS");
