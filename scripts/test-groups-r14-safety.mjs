// Synthetic-only R14 admission: persistent storage and student identity must fail closed.
import assert from "node:assert/strict";
import { LocalGroupsProvider, createGroupsService, parseRosterText } from "../src/groups/group-service.js";

function setup() {
  const raw = new Map();
  let writes = 0, serial = 0;
  const storage = {
    getItem(key) { return raw.get(key) ?? null; },
    setItem(key, value) { writes++; raw.set(key, String(value)); },
    removeItem(key) { raw.delete(key); },
  };
  const service = createGroupsService({
    provider: new LocalGroupsProvider({ storage, storageKey: "synthetic-r14" }),
    eventTarget: null,
    idFactory: (prefix) => prefix + "_" + String(++serial).padStart(12, "0"),
  });
  const created = service.createGroup({ displayName: "Synthetic class", schoolYear: "2026/27" });
  const roster = (text, replace = true) => service.importRoster({
    groupId: created.groupId, rawText: text, replace,
    expectedRevision: service.getGroup(created.groupId).revision,
  });
  return { service, storage, raw, writes: () => writes, roster, id: created.groupId };
}
let assertions = 0;
const test = (label, body) => { try { body(); assertions++; } catch(error) { console.error("FAIL", label, error); process.exitCode = 1; } };
test("changed school email must not hijack member identity", () => {
  const s = setup(); s.roster("Jan Novak; jan1@example.invalid");
  const old = s.service.exportBackup().store;
  const n = s.writes();
  assert.throws(() => s.roster("Jan Novak; jan2@example.invalid"), /ROSTER_IDENTITY_EMAIL_CONFLICT/);
  assert.deepEqual(s.service.exportBackup().store, old);
  assert.equal(s.writes(), n);
});
test("name-only update preserves verified email and revision", () => {
  const s = setup(); const first = s.roster("Jan Novak; jan1@example.invalid").group;
  const after = s.roster("Jan Novak").group;
  assert.equal(after.members[0].schoolEmail, "jan1@example.invalid");
  assert.equal(after.revision, first.revision);
  assert.equal(after.members[0].memberId, first.members[0].memberId);
});
test("same-name student must not steal identity", () => {
  const s = setup(); s.roster("Jan Novak; jan1@example.invalid\nJan Novak; jan2@example.invalid");
  assert.throws(() => s.roster("Jan Novak"), /ROSTER_IDENTITY_AMBIGUOUS_NAME/);
  assert.equal(s.service.getGroup(s.id).members.length, 2);
});
test("same-name students with known emails retain separate IDs", () => {
  const s = setup(); s.roster("Jan Novak; jan1@example.invalid\nJan Novak; jan2@example.invalid");
  const before = s.service.getGroup(s.id).members.map(m => m.memberId);
  s.roster("Jan Novak; jan2@example.invalid\nJan Novak; jan1@example.invalid");
  assert.deepEqual(new Set(s.service.getGroup(s.id).members.map(m => m.memberId)), new Set(before));
});
test("duplicate match cannot import partial data", () => {
  const s = setup(); s.roster("Jan Novak; jan1@example.invalid");
  const n = s.writes();
  assert.throws(() => s.roster("Jan Novak; jan1@example.invalid\nJan Novak"), /ROSTER_IDENTITY_DUPLICATE_MATCH/);
  assert.equal(s.writes(), n);
});
test("invalid import never archives an existing pupil", () => {
  const s = setup(); s.roster("Jan Novak; jan1@example.invalid");
  const n = s.writes();
  assert.throws(() => s.roster("Jana Mala; jana@example.invalid\nInvalid; @@@example.invalid"), /ROSTER_IMPORT_INVALID/);
  assert.equal(s.writes(), n);
  assert.equal(s.service.getGroup(s.id).members[0].status, "active");
});
test("overlong email must not be silently truncated", () => {
  const s = setup(); s.roster("Jan Novak; jan1@example.invalid");
  const n = s.writes();
  const enormous = "x".repeat(260) + "@example.invalid";
  assert.equal(parseRosterText("Jan Novak; " + enormous).invalid.length > 0, true);
  assert.throws(() => s.roster("Jan Novak; " + enormous), /ROSTER_IMPORT_INVALID/);
  assert.equal(s.writes(), n);
});
test("corrupted JSON cannot masquerade as empty roster", () => {
  const s = setup(); const backup = s.service.exportBackup();
  s.raw.set("synthetic-r14", "{damaged json");
  assert.throws(() => s.service.listGroups(), /GROUP_STORAGE_RECOVERY_REQUIRED/);
  assert.throws(() => s.service.exportBackup(), /GROUP_STORAGE_RECOVERY_REQUIRED/);
  assert.throws(() => s.service.importBackup(backup), /GROUP_STORAGE_RECOVERY_REQUIRED/);
  assert.equal(s.raw.get("synthetic-r14"), "{damaged json");
});
test("explicit restore preserves original bytes before writing", () => {
  const s = setup(); const backup = s.service.exportBackup();
  s.raw.set("synthetic-r14", "{damaged json");
  assert.throws(() => s.service.listGroups(), /GROUP_STORAGE_RECOVERY_REQUIRED/);
  s.service.importBackup(backup, { confirmRecovery: true });
  assert.equal(s.raw.get("synthetic-r14.original-corrupt.v1"), "{damaged json");
  assert.equal(s.service.listGroups().length, 1);
});
test("second failure must not replace first quarantined copy", () => {
  const s = setup(); const backup = s.service.exportBackup();
  s.raw.set("synthetic-r14", "{first");
  assert.throws(() => s.service.listGroups(), /GROUP_STORAGE_RECOVERY_REQUIRED/);
  s.service.importBackup(backup, { confirmRecovery: true });
  s.raw.set("synthetic-r14", "{second");
  assert.throws(() => s.service.listGroups(), /GROUP_STORAGE_RECOVERY_REQUIRED/);
  assert.throws(() => s.service.importBackup(backup, { confirmRecovery: true }), /GROUP_RECOVERY_SNAPSHOT_EXISTS/);
  assert.equal(s.raw.get("synthetic-r14.original-corrupt.v1"), "{first");
});
test("missing observed data cannot be replaced", () => {
  const s = setup(); const backup = s.service.exportBackup();
  s.storage.removeItem("synthetic-r14");
  assert.throws(() => s.service.listGroups(), /GROUP_STORAGE_RECOVERY_REQUIRED/);
  assert.throws(() => s.service.importBackup(backup, { confirmRecovery: true }), /GROUP_STORAGE_RECOVERY_REQUIRED/);
});
test("excess 501st record blocks all writes", () => {
  const s = setup(); const over = Array.from({length: 501}, (_, i) => "Student " + (i + 1) + "; student" + i + "@example.invalid").join("\n");
  const n = s.writes();
  assert.throws(() => s.roster(over), /ROSTER_IMPORT_TRUNCATED/);
  assert.equal(s.writes(), n);
});
console.log("R14 safety admission", assertions + "/12", process.exitCode ? "FAIL" : "PASS");
if(assertions !== 12) process.exitCode = 1;
