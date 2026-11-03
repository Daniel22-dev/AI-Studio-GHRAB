import { createGroupsPageAccessGate, createPrincipalGroupsSession } from "./group-service.js";

/* An unauthenticated page must not render a remembered browser-profile roster.
   This guards the UI/service facade, not raw same-origin browser storage. */
function denyGroupsPage() {
  for (const dialog of document.querySelectorAll("dialog")) {
    try { if (dialog.open) dialog.close(); } catch { /* Already closed. */ }
    dialog.remove();
  }
  const main = document.querySelector("main");
  if (!main) return;
  const section = document.createElement("section");
  section.className = "page-hero shell access-denied-page";
  section.setAttribute("role", "alert");
  const title = document.createElement("h1");
  title.textContent = "Moje skupiny jsou uzamčeny";
  const description = document.createElement("p");
  description.textContent = "Pro práci se seznamy žáků je nutné platné oprávnění učitele. Na sdíleném počítači používejte vlastní profil prohlížeče; místní úložiště není odděleno mezi účty.";
  const link = document.createElement("a");
  link.className = "button primary";
  link.href = "../access/";
  link.textContent = "Otevřít Můj přístup";
  section.append(title, description, link);
  main.replaceChildren(section);
}

async function startGroupsPage() {
  const studio = globalThis.GHRAB;
  if (!studio?.accessReady || typeof studio.getAccessSnapshot !== "function") {
    denyGroupsPage();
    return;
  }
  try { await studio.accessReady; } catch { denyGroupsPage(); return; }
  let accessGate;
  try {
    accessGate = createGroupsPageAccessGate({
      getSnapshot: () => studio.getAccessSnapshot(),
      isPreview: () => Boolean(studio.isColleaguePreview?.()),
    });
  } catch {
    denyGroupsPage();
    return;
  }
  const invalidateIfNeeded = () => {
    if (!accessGate.allowed()) denyGroupsPage();
  };
  document.addEventListener("ghrab:access-changed", invalidateIfNeeded);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) invalidateIfNeeded();
  });
  window.addEventListener("focus", invalidateIfNeeded);
  window.addEventListener("pageshow", invalidateIfNeeded);


const $ = (selector, root = document) => root.querySelector(selector);
const diagnostics = [];
let selectedGroupId = null;
let filter = "active";
let rosterPreview = null;
let rosterApproval = null;
let legacyPreviewSequence = 0;
let recoveryMode = false;

function language() { return document.documentElement.lang === "en" ? "en" : "cs"; }
function tr(cs, en) { return language() === "en" ? en : cs; }
function el(tag, className = "", text = "") {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== "") node.textContent = text;
  return node;
}
function button(text, className, action) {
  const node = el("button", className, text);
  node.type = "button";
  if (action) node.addEventListener("click", action);
  return node;
}
function activeMembers(group) { return group.members.filter((member) => member.status === "active"); }
function displayError(error) {
  const code = String(error?.message || error || "UNKNOWN").split(":")[0];
  if (code.startsWith("ROSTER_IDENTITY_")) return tr("Ověřte identity žáků v importu.", "Verify student identities in this import.");
  if (code === "GROUP_STORAGE_RECOVERY_REQUIRED") enterRecoveryMode();
  const messages = {
    GROUP_STORAGE_RECOVERY_REQUIRED: tr("Poškozené skupiny jsou uzamčeny. Obnovte ověřenou zálohu.", "Damaged groups are locked. Restore a verified backup."),
    GROUP_RECOVERY_SNAPSHOT_EXISTS: tr("Původní záchranná kopie již existuje. Kontaktujte správce.", "Original quarantine copy already exists. Contact an administrator."),
    GROUP_RECOVERY_PRESERVE_FAILED: tr("Původní data nelze uchovat. Obnova zastavena.", "Original bytes could not be preserved. Recovery blocked."),
    GROUP_STORAGE_STALE_WRITE: tr("Data se mezitím změnila jinde.", "Data changed in another tab."),
    GROUP_DISPLAY_NAME_REQUIRED: tr("Zadejte název skupiny.", "Enter a group name."),
    GROUP_SCHOOL_YEAR_INVALID: tr("Školní rok zadejte např. 2026/27.", "Enter the school year, e.g. 2026/27."),
    GROUP_REVISION_CONFLICT: tr("Skupina se mezitím změnila. Načtěte nový náhled a potvrďte jej znovu.", "The group changed in the meantime. Refresh the preview and confirm it again."),
    ROSTER_EMPTY: tr("V seznamu nebyl rozpoznán žádný platný student.", "No valid student was recognized in the roster."),
    ROSTER_IMPORT_TOO_LARGE: tr("Vložený seznam je příliš velký.", "The pasted roster is too large."),
    ROSTER_IMPORT_TRUNCATED: tr("Seznam přesahuje limit 500 studentů; nic nebylo uloženo.", "Roster exceeds 500 students; no changes were saved."),
    GROUP_STORAGE_WRITE_FAILED: tr("Data se nepodařilo bezpečně uložit v tomto prohlížeči.", "The data could not be safely stored in this browser."),
    GROUP_STORAGE_CORRUPT_WRITE_BLOCKED: tr("Úložiště je poškozené. Zápis byl zastaven, původní data zůstala zachována; obraťte se na správce.", "Storage is corrupted. The write was blocked and original bytes retained; contact an administrator."),
    GROUP_WRITE_LOCK_UNAVAILABLE: tr("Bezpečný zámek zápisu není dostupný. Ověřte HTTPS a prohlížeč.", "Safe write lock unavailable. Check HTTPS and browser."),
    GROUP_WRITE_LOCK_REQUIRED: tr("Zápis vyžaduje transakční zámek.", "Transaction lock required to write."),
    GROUP_STORAGE_UNVERIFIED_WRITE_BLOCKED: tr("Čtení skupin není ověřené. Zápis byl zastaven; použijte ověřenou obnovu zálohy.", "Storage unverified; writing blocked. Restore a verified backup."),
    GROUP_BACKUP_SOURCE_UNAVAILABLE: tr("Nelze exportovat zálohu z neověřených nebo poškozených dat.", "Cannot export backup from unverified or corrupted data."),
    GROUP_SCOPE_BACKUP_INVALID: tr("Záloha není ověřený formát v2 pro tento účet. Starší zálohy vyžadují kontrolovaný převod.", "The backup is not the v2 account format. Older backups need a controlled migration."),
    GROUP_SCOPE_BACKUP_OTHER_ACCOUNT: tr("Označení účtu v záloze se neshoduje. Zkontrolujte původ zálohy.", "The account scope label in the backup does not match. Verify its origin."),
    GROUP_RESTORE_SOURCE_CHANGED: tr("Evidence se během obnovy změnila. Nic nebylo přepsáno; zkontrolujte aktuální skupiny a obnovu případně spusťte znovu.", "The groups changed during restore. Nothing was replaced; review current groups before retrying."),
    GROUP_RESTORE_FILE_TOO_LARGE: tr("Soubor zálohy je příliš velký. Obnova byla zastavena.", "The backup file is too large. Restore was blocked."),
    GROUP_BACKUP_CRYPTO_UNAVAILABLE: tr("Šifrování nedostupné. Záloha nevznikla.", "Encryption unavailable. No backup."),
    GROUP_BACKUP_PASSPHRASE_WEAK: tr("Heslo: 16–512 znaků.", "Password: 16–512 characters."),
    GROUP_ENCRYPTED_BACKUP_INVALID: tr("Neplatná šifrovaná záloha.", "Invalid encrypted backup."),
    GROUP_BACKUP_AUTH_FAILED: tr("Chybné heslo či záloha. Nic neobnoveno.", "Wrong password or backup. Nothing restored."),
    GROUP_MIGRATION_TARGET_NOT_EMPTY: tr("Náhled převodu vyžaduje prázdnou cílovou evidenci V2. Stávající skupiny zůstaly nedotčeny.", "Migration preflight requires an empty V2 destination. Existing groups were not changed."),
    GROUP_MIGRATION_SOURCE_INVALID: tr("Soubor není platná záloha skupin V1.", "The file is not a valid V1 groups backup."),
    GROUP_MIGRATION_SOURCE_TOO_LARGE: tr("Záloha přesahuje povolenou velikost.", "The backup exceeds the permitted size."),
    GROUP_MIGRATION_UNSAFE_KEYS: tr("Záloha obsahuje nepovolenou strukturu.", "The backup contains unsafe keys."),
    ROSTER_REVIEW_CHANGED: tr("Seznam nebo nastavení se od náhledu změnily. Nic nebylo uloženo; zkontrolujte nový náhled.", "The roster or options changed after the preview. Nothing was saved; review a fresh preview."),
    GROUP_ACCESS_DENIED: tr("Vaše oprávnění se změnilo. Otevřete Moje skupiny znovu.", "Your access changed. Reopen My Groups."),

  };
  return messages[code] || tr("Operaci se nepodařilo dokončit.", "The operation could not be completed.");
}

let legacyStorePresent = false;
let scoped;
try {
  scoped = await createPrincipalGroupsSession({
    getSnapshot: () => studio.getAccessSnapshot(),
    isPreview: () => Boolean(studio.isColleaguePreview?.()),
    onDiagnostic(detail) {
      diagnostics.push(detail?.code || "GROUP_STORAGE_DIAGNOSTIC");
      renderDiagnostic();
    },
  });
  accessGate.requireAllowed(); // Reject an account switch while SHA-256 is computed.
} catch {
  denyGroupsPage();
  return;
}
legacyStorePresent = scoped.legacyStorePresent;
const groups = scoped.service;
if (Object.prototype.hasOwnProperty.call(globalThis, "GHRAB_GROUPS")) {
  denyGroupsPage();
  return;
}
Object.defineProperty(globalThis, "GHRAB_GROUPS", {
  value: groups,
  configurable: false,
  enumerable: true,
  writable: false,
});

// Cross-tab writes can invalidate the list and any open import preview.
// Always close and scrub the old editor before rendering current storage.
groups.subscribe(detail => {
  if (detail.kind !== "external-storage-change") return;
  if (!accessGate.allowed()) { denyGroupsPage(); return; }
  rosterPreview = null;
  rosterApproval = null;
  legacyPreviewSequence += 1;
  $("#groups-legacy-preview")?.replaceChildren();
  for (const dialog of document.querySelectorAll("dialog")) {
    try { if (dialog.open) closeDialog(dialog); } catch { /* Continue scrubbing. */ }
    for (const field of dialog.querySelectorAll("input, textarea")) field.value = "";
    if (dialog.dataset) {
      dialog.dataset.groupId = "";
      dialog.dataset.expectedRevision = "";
    }
  }
  $("#roster-preview")?.replaceChildren();
  const confirm = $("#roster-confirm-button");
  if (confirm) confirm.disabled = true;
  render();
});

function renderDiagnostic() {
  const box = $("#groups-diagnostic");
  if (!box) return;
  if (recoveryMode) {
    box.hidden = false;
    box.textContent = tr("Poškozená evidence je uzamčená. Obnovte ověřenou zálohu.", "Roster locked. Restore a verified backup.");
    return;
  }
  if (!diagnostics.length && !legacyStorePresent) {
    box.hidden = true; box.textContent = ""; return;
  }
  box.hidden = false;
  box.textContent = diagnostics.length
    ? tr("Úložiště skupin hlásí problém. Zkontrolujte, zda prohlížeč neblokuje místní úložiště; osobní údaje nejsou součástí diagnostiky.", "Group storage reports a problem. Check whether the browser blocks local storage; personal data is not included in diagnostics.")
    : tr("V tomto prohlížeči jsou i starší společné skupiny. Nejsou automaticky přiřazeny vašemu účtu; jejich převod musí být výslovně ověřen.", "This browser also contains older shared groups. They are not assigned to your account; migration requires explicit ownership review.");
}

function renderList() {
  const root = $("#groups-list");
  root.replaceChildren();
  const items = groups.listGroups({ status: filter });
  if (!items.some((group) => group.groupId === selectedGroupId)) selectedGroupId = items[0]?.groupId || null;
  if (!items.length) {
    const wrap = el("div", "groups-empty");
    const inner = el("div");
    inner.append(el("div", "groups-empty-mark", filter === "active" ? "+" : "↺"));
    inner.append(el("h3", "", filter === "active" ? tr("Zatím bez skupin", "No groups yet") : tr("Archiv je prázdný", "Archive is empty")));
    inner.append(el("p", "", filter === "active" ? tr("Vytvořte první skupinu a vložte do ní seznam z IS.", "Create the first group and paste a roster from the school IS.") : tr("Archivované skupiny se zobrazí zde.", "Archived groups will appear here.")));
    wrap.append(inner); root.append(wrap); renderDetail(); return;
  }
  for (const group of items) {
    const card = button("", `group-card${group.groupId === selectedGroupId ? " is-selected" : ""}`, () => { selectedGroupId = group.groupId; render(); });
    card.dataset.groupId = group.groupId;
    card.setAttribute("aria-pressed", String(group.groupId === selectedGroupId));
    const top = el("div", "group-card-top");
    top.append(el("strong", "", group.displayName), el("span", "group-card-count", String(activeMembers(group).length)));
    const meta = el("div", "group-card-meta");
    meta.append(el("span", "", group.schoolYear));
    if (group.subject) meta.append(el("span", "", `· ${group.subject}`));
    if (group.grade) meta.append(el("span", "", `· ${group.grade}`));
    card.append(top, meta);
    root.append(card);
  }
  renderDetail();
}

function statusChip(status) {
  return el("span", `group-status${status === "archived" ? " is-archived" : ""}`, status === "active" ? tr("aktivní", "active") : tr("archiv", "archived"));
}

function renderDetailEmpty(root) {
  const wrap = el("div", "groups-empty");
  const inner = el("div");
  inner.append(el("div", "groups-empty-mark", "◎"));
  inner.append(el("h3", "", tr("Vyberte skupinu", "Select a group")));
  inner.append(el("p", "", tr("Vlevo vyberte skupinu nebo vytvořte novou.", "Select a group on the left or create a new one.")));
  wrap.append(inner); root.append(wrap);
}

function renderRosterTable(group, root) {
  const all = [...group.members].sort((a, b) => (a.status === b.status ? a.name.localeCompare(b.name, "cs") : a.status === "active" ? -1 : 1));
  if (!all.length) {
    const empty = el("div", "groups-empty");
    const inner = el("div");
    inner.append(el("div", "groups-empty-mark", "⇩"), el("h3", "", tr("Seznam je zatím prázdný", "Roster is empty")), el("p", "", tr("Použijte „Import / aktualizace z IS“ a nejdříve zkontrolujte náhled změn.", "Use “Import / update from IS” and review the change preview first.")));
    empty.append(inner); root.append(empty); return;
  }
  const wrap = el("div", "groups-roster-table-wrap");
  const table = el("table", "groups-roster-table");
  const thead = document.createElement("thead");
  const hr = document.createElement("tr");
  [tr("Student", "Student"), tr("Školní e-mail", "School email"), tr("Stav", "Status")].forEach((label) => { const th = el("th", "", label); th.scope = "col"; hr.append(th); });
  thead.append(hr);
  const tbody = document.createElement("tbody");
  for (const member of all) {
    const row = document.createElement("tr");
    row.append(el("td", "", member.name), el("td", "", member.schoolEmail || "—"));
    const status = document.createElement("td"); status.append(statusChip(member.status)); row.append(status); tbody.append(row);
  }
  table.append(thead, tbody); wrap.append(table); root.append(wrap);
}

function renderDetail() {
  const root = $("#groups-detail"); root.replaceChildren();
  if (!selectedGroupId) { renderDetailEmpty(root); return; }
  const group = groups.getGroup(selectedGroupId);
  if (!group) { selectedGroupId = null; renderDetailEmpty(root); return; }
  const container = el("div", "groups-detail");
  const head = el("div", "groups-detail-head");
  const title = el("div");
  const eyebrow = el("p", "eyebrow", group.status === "active" ? tr("AKTIVNÍ SKUPINA", "ACTIVE GROUP") : tr("ARCHIVOVANÁ SKUPINA", "ARCHIVED GROUP"));
  const h2 = el("h2", "", group.displayName);
  const meta = [group.schoolYear, group.subject, group.grade].filter(Boolean).join(" · ");
  title.append(eyebrow, h2, el("p", "", meta));
  const actions = el("div", "groups-detail-actions");
  actions.append(button(tr("Upravit", "Edit"), "groups-button groups-button-secondary", () => openGroupDialog(group)));
  if (group.status === "active") {
    actions.append(button(tr("Archivovat", "Archive"), "groups-button groups-button-danger", () => archiveGroup(group)));
  } else {
    actions.append(button(tr("Znovu aktivovat", "Reactivate"), "groups-button groups-button-secondary", () => reactivateGroup(group)));
  }
  head.append(title, actions); container.append(head);
  const kpis = el("div", "groups-kpis");
  const values = [[tr("Aktivní studenti", "Active students"), activeMembers(group).length], [tr("Archivovaní", "Archived"), group.members.length - activeMembers(group).length], [tr("Revize", "Revision"), group.revision]];
  for (const [label, value] of values) { const card = el("div", "groups-kpi"); card.append(el("span", "", label), el("strong", "", String(value))); kpis.append(card); }
  container.append(kpis);
  const rosterHead = el("div", "groups-roster-head");
  const rosterText = el("div"); rosterText.append(el("h3", "", tr("Seznam studentů", "Student roster")), el("p", "", tr("Odebraný student se archivuje; jeho stabilní identita se nemaže.", "A removed student is archived; their stable identity is preserved.")));
  rosterHead.append(rosterText, button(tr("Import / aktualizace z IS", "Import / update from IS"), "groups-button groups-button-primary", () => openRosterDialog(group)));
  container.append(rosterHead); renderRosterTable(group, container); root.append(container);
}

function enterRecoveryMode() {
  if (!accessGate.allowed()) return denyGroupsPage();
  recoveryMode = true;
  selectedGroupId = null;
  rosterPreview = null;
  rosterApproval = null;
  for (const dialog of document.querySelectorAll("dialog")) {
    try { if (dialog.open) dialog.close(); } catch { /* Best-effort close before scrubbing. */ }
    for (const field of dialog.querySelectorAll("input, textarea")) field.value = "";
    for (const node of dialog.querySelectorAll("#roster-preview, .groups-form-error")) node.replaceChildren();
    if (dialog.dataset) {
      dialog.dataset.groupId = "";
      dialog.dataset.expectedRevision = "";
    }
  }
  const list = $("#groups-list");
  const detail = $("#groups-detail");
  list?.replaceChildren();
  detail?.replaceChildren();
  const message = el("p", "groups-help", tr("Skupiny jsou uzamčeny. Data nemažte; pro obnovu použijte ověřenou zálohu.", "Groups locked. Do not erase data; restore from a verified backup."));
  message.setAttribute("role", "alert");
  list?.append(message);
  for (const node of document.querySelectorAll("[data-group-filter], #group-create, #groups-backup-export, #groups-legacy-open")) node.disabled = true;
  $("#groups-backup-import").disabled = false;
  renderDiagnostic();
}

function render() {
  if (!accessGate.allowed()) { denyGroupsPage(); return; }
  try {
    document.querySelectorAll("[data-group-filter]").forEach((node) => node.classList.toggle("is-active", node.dataset.groupFilter === filter));
    renderList();
    recoveryMode = false;
    for (const node of document.querySelectorAll("[data-group-filter], #group-create, #groups-backup-export, #groups-legacy-open")) node.disabled = false;
    renderDiagnostic();
  } catch (error) {
    if (error?.message !== "GROUP_STORAGE_RECOVERY_REQUIRED") throw error;
    enterRecoveryMode();
  }
}

function setFormError(selector, message = "") { const box = $(selector); box.textContent = message; box.hidden = !message; }
function showDialog(dialog) { if (typeof dialog.showModal === "function") dialog.showModal(); else dialog.setAttribute("open", ""); }
function closeDialog(dialog) { if (typeof dialog.close === "function") dialog.close(); else dialog.removeAttribute("open"); }

function openGroupDialog(group = null) {
  $("#group-edit-id").value = group?.groupId || "";
  $("#group-dialog").dataset.expectedRevision = group ? String(group.revision) : "";
  $("#group-name").value = group?.displayName || "";
  $("#group-year").value = group?.schoolYear || currentSchoolYear();
  $("#group-subject").value = group?.subject || "";
  $("#group-grade").value = group?.grade || "";
  $("#group-dialog-title").textContent = group ? tr("Upravit skupinu", "Edit group") : tr("Nová skupina", "New group");
  setFormError("#group-form-error"); showDialog($("#group-dialog")); $("#group-name").focus();
}

function currentSchoolYear() {
  const now = new Date();
  const year = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
  return `${year}/${String((year + 1) % 100).padStart(2, "0")}`;
}

async function archiveGroup(group) {
  if (!globalThis.confirm(tr(`Archivovat skupinu „${group.displayName}“? Seznam ani stabilní identity studentů se nesmažou.`, `Archive “${group.displayName}”? The roster and stable student identities will not be deleted.`))) return;
  try { await groups.withWriteLock(tx => tx.archiveGroup(group.groupId, { expectedRevision: group.revision })); selectedGroupId = groups.listGroups({ status: filter })[0]?.groupId || null; render(); } catch (error) { globalThis.alert(displayError(error)); }
}
async function reactivateGroup(group) {
  try { const next = await groups.withWriteLock(tx => tx.updateGroup(group.groupId, { status: "active" }, { expectedRevision: group.revision })); filter = "active"; selectedGroupId = next.groupId; render(); } catch (error) { globalThis.alert(displayError(error)); }
}

function diffRows(preview) {
  const rows = [];
  preview.diff.added.forEach((member) => rows.push([tr("Přidat", "Add"), member.name]));
  preview.diff.restored.forEach((item) => rows.push([tr("Obnovit", "Restore"), item.after.name]));
  preview.diff.changed.forEach((item) => rows.push([tr("Změnit", "Change"), `${item.before.name} → ${item.after.name}`]));
  preview.diff.removed.forEach((item) => rows.push([tr("Archivovat", "Archive"), item.before.name]));
  preview.parsed.invalid.forEach((item) => rows.push([tr("Neplatné", "Invalid"), item.value]));
  preview.parsed.duplicates.forEach((item) => rows.push([tr("Duplicita", "Duplicate"), item.name]));
  return rows;
}
function renderRosterPreview(preview) {
  const root = $("#roster-preview"); root.replaceChildren();
  const summary = el("div", "groups-preview-summary");
  const stats = [[tr("Přidat", "Add"), preview.diff.added.length], [tr("Změnit", "Change"), preview.diff.changed.length], [tr("Obnovit", "Restore"), preview.diff.restored.length], [tr("Archivovat", "Archive"), preview.diff.removed.length], [tr("Beze změny", "Unchanged"), preview.diff.unchangedCount]];
  for (const [label, value] of stats) { const card = el("div", "groups-preview-stat"); card.append(el("strong", "", String(value)), el("span", "", label)); summary.append(card); }
  root.append(summary);
  const rows = diffRows(preview);
  if (rows.length) {
    const box = el("div", "groups-preview-list"); box.append(el("h3", "", tr("Kontrola změn před uložením", "Review changes before saving")));
    rows.slice(0, 120).forEach(([kind, value]) => { const row = el("div", "groups-preview-row"); row.append(el("span", "groups-preview-kind", kind), el("span", "", value)); box.append(row); });
    if (rows.length > 120) box.append(el("p", "", tr(`… a dalších ${rows.length - 120} položek.`, `… and ${rows.length - 120} more items.`)));
    root.append(box);
  } else root.append(el("p", "groups-help", tr("Vložený seznam nevyvolá žádnou změnu.", "The pasted roster produces no changes.")));
  if (preview.parsed.truncated) root.append(el("p", "groups-form-error", tr("Seznam dosáhl bezpečnostního limitu 500 studentů.", "The roster reached the safety limit of 500 students.")));
  if (preview.parsed.invalid.length || preview.parsed.duplicates.length) root.append(el("p", "groups-form-error", tr("Opravte neplatné a duplicitní řádky. Import je pozastaven.", "Correct invalid and duplicate rows before importing.")));
}

function openRosterDialog(group) {
  rosterPreview = null;
  rosterApproval = null;
  $("#roster-input").value = "";
  $("#roster-replace").checked = true;
  $("#roster-confirm-button").disabled = true;
  $("#roster-preview").replaceChildren();
  setFormError("#roster-form-error");
  $("#roster-dialog").dataset.groupId = group.groupId;
  showDialog($("#roster-dialog")); $("#roster-input").focus();
}

function previewRoster() {
  setFormError("#roster-form-error");
  try {
    const groupId = $("#roster-dialog").dataset.groupId;
    const rawText = $("#roster-input").value;
    const replace = $("#roster-replace").checked;
    rosterPreview = groups.previewRosterImport(groupId, rawText, { replace });
    rosterApproval = Object.freeze({ groupId, rawText, replace, revision: rosterPreview.currentRevision });
    renderRosterPreview(rosterPreview);
    $("#roster-confirm-button").disabled = rosterPreview.parsed.entries.length === 0 || !rosterPreview.diff.hasChanges || rosterPreview.parsed.truncated || rosterPreview.parsed.invalid.length > 0 || rosterPreview.parsed.duplicates.length > 0;
  } catch (error) {
    rosterPreview = null; rosterApproval = null; $("#roster-confirm-button").disabled = true; setFormError("#roster-form-error", displayError(error));
  }
}

function downloadJson(name, data) {
  const blob = new Blob([`${JSON.stringify(data, null, 2)}\n`], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = name; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 0);
}

// No password persistence.
function backupPhrase(exporting) {
  const d=$("#groups-backup-secret-dialog"),p=$("#groups-secret-input"),
    again=$("#groups-secret-repeat"),err=$("#groups-secret-error");
  $("#groups-backup-secret-title").textContent=exporting
    ? tr("Šifrovat zálohu","Encrypt backup") : tr("Odemknout zálohu","Unlock backup");
  $("#groups-secret-repeat-wrap").hidden=!exporting;
  p.value=again.value=err.textContent="";
  return new Promise(resolve=>{
    let done=false;
    const finish=value=>{
      if(done)return;done=true;
      d.removeEventListener("submit",submit);d.removeEventListener("close",cancel);
      p.value=again.value="";
      if(d.open)closeDialog(d);
      resolve(value);
    };
    const submit=e=>{
      e.preventDefault();const value=p.value;
      if(value.length<16||value.length>512){err.textContent=displayError(new Error("GROUP_BACKUP_PASSPHRASE_WEAK"));return}
      if(exporting&&value!==again.value){err.textContent=tr("Hesla se neshodují.","Passwords do not match.");return}
      finish(value);
    };
    const cancel=()=>finish(null);
    d.addEventListener("submit",submit);d.addEventListener("close",cancel);
    showDialog(d);p.focus();
  });
}
async function exportBackup() {
  let password=await backupPhrase(true);
  if(password===null)return;
  try {
    accessGate.requireAllowed();
    const backup=groups.exportBackup();
    const {encryptGroupsBackup}=await import("./encrypted-backup.js");
    const sealed=await encryptGroupsBackup(backup,password);
    accessGate.requireAllowed();
    downloadJson(`ai-studio-moje-skupiny-sifrovana-v2-${new Date().toISOString().slice(0,10)}.json`,sealed);
  }catch(e){globalThis.alert(displayError(e))}
  finally{password=null}
}

// Compare scoped source inside the exclusive restore lock.
function restoreSourceSnapshot() {
  try {
    const store = groups.exportBackup().store;
    return { mode: "healthy", payload: JSON.stringify(store) };
  } catch (error) {
    if (error?.message !== "GROUP_STORAGE_RECOVERY_REQUIRED") throw error;
    return { mode: "corrupt" };
  }
}
function assertRestoreSourceUnchanged(snapshot) {
  accessGate.requireAllowed();
  const current = restoreSourceSnapshot();
  if (current.mode !== snapshot.mode ||
      (snapshot.mode === "healthy" && current.payload !== snapshot.payload)) {
    throw new Error("GROUP_RESTORE_SOURCE_CHANGED");
  }
}

async function importBackupFile(file) {
  if (!file) return;
  try {
    const source = restoreSourceSnapshot();
    if (!globalThis.confirm(tr("Nahradit skupiny ověřenou zálohou?", "Replace groups with a verified backup?"))) return;
    if (file.size > 20 * 1024 * 1024) throw new Error("GROUP_RESTORE_FILE_TOO_LARGE");
    let backup = JSON.parse(await file.text());
    if (backup?.schema === "ghrab-teaching-groups-encrypted-v1") {
      let password=await backupPhrase(false);
      if(password===null)return;
      try{
        const {decryptGroupsBackup}=await import("./encrypted-backup.js");
        backup=await decryptGroupsBackup(backup,password);
      }finally{password=null}
    } else {
      if(file.size>12*1024*1024)throw new Error("GROUP_RESTORE_FILE_TOO_LARGE");
      if(!globalThis.confirm(tr("Starší záloha není šifrovaná. Pokračovat?",
         "Old backup is plaintext. Continue?")))return;
    }
    accessGate.requireAllowed();
    // A previously corrupt store is a separately confirmed recovery event.
    // Never treat an unexpected new corruption as permission to overwrite it.
    if (source.mode === "corrupt" &&
        !globalThis.confirm(tr(
          "Obnova nejprve uchová původní poškozená data a až poté nahraje zálohu. Ověřte její původ a potvrďte obnovu.",
          "Recovery preserves original corrupt bytes before restoring. Verify the backup and confirm."
        ))) return;
    await groups.withWriteLock(tx => {
      assertRestoreSourceUnchanged(source);
      return tx.importBackup(backup, { confirmRecovery: source.mode === "corrupt" });
    });
    selectedGroupId = null;
    filter = "active";
    render();
  } catch (error) {
    globalThis.alert(displayError(error));
  }
}


// Read-only V1 backup preflight. No transfer, commit, storage writes, telemetry or upload.
async function previewLegacyBackupFile(file) {
  const ticket = ++legacyPreviewSequence;
  const dialog = $("#groups-legacy-dialog");
  const output = $("#groups-legacy-preview");
  output.replaceChildren();
  if (!file || !dialog.open) return;
  output.textContent = tr("Kontroluji soubor pouze v tomto prohlížeči…", "Checking the file locally…");
  try {
    accessGate.requireAllowed();
    if (file.size > 12 * 1024 * 1024) throw new Error("GROUP_MIGRATION_SOURCE_TOO_LARGE");
    const sourceBackup = JSON.parse(await file.text());
    accessGate.requireAllowed();
    if (ticket !== legacyPreviewSequence || !dialog.open) return;
    const { prepareLegacyGroupsMigration } = await import("./legacy-migration.js");
    const { summary } = await prepareLegacyGroupsMigration({ sourceBackup, targetSession: scoped });
    accessGate.requireAllowed();
    if (ticket !== legacyPreviewSequence || !dialog.open) return;
    // Do not expose student names, addresses, IDs, fingerprints or the original file.
    output.replaceChildren(
      el("strong", "", tr("Kontrola zálohy V1 proběhla", "V1 backup preflight passed")),
      el("p", "groups-help", tr("Skupin: ", "Groups: ") + summary.groupCount +
        tr(" · Studentů: ", " · Students: ") + summary.memberCount),
      el("p", "groups-help", tr(
        "NIC NEBYLO PŘEVEDENO ANI ULOŽENO. Skutečný převod vyžaduje ověření vlastníka, šifrovanou zálohu a schválení školou.",
        "NOTHING WAS MIGRATED OR SAVED. Real migration requires owner verification, an encrypted backup and school approval."))
    );
  } catch (error) {
    if (ticket !== legacyPreviewSequence || !dialog.open) return;
    output.replaceChildren(el("p", "groups-form-error", error instanceof SyntaxError
      ? tr("Neplatný JSON soubor.", "Invalid JSON file.") : displayError(error)));
  }
}
function openLegacyPreview() {
  ++legacyPreviewSequence;
  $("#groups-legacy-preview").replaceChildren();
  $("#groups-legacy-file").value = "";
  showDialog($("#groups-legacy-dialog"));
}
$("#group-create").addEventListener("click", () => openGroupDialog());
document.querySelectorAll("[data-group-filter]").forEach((node) => node.addEventListener("click", () => { filter = node.dataset.groupFilter; selectedGroupId = null; render(); }));
document.querySelectorAll("[data-dialog-close]").forEach((node) => node.addEventListener("click", () => closeDialog(node.closest("dialog"))));
$("#group-form").addEventListener("submit", async (event) => {
  event.preventDefault(); setFormError("#group-form-error");
  try {
    const id = $("#group-edit-id").value;
    const input = { displayName: $("#group-name").value, schoolYear: $("#group-year").value, subject: $("#group-subject").value, grade: $("#group-grade").value };
    const expectedRevision = Number($("#group-dialog").dataset.expectedRevision);
    if (id && (!Number.isSafeInteger(expectedRevision) || expectedRevision < 1)) throw new Error("GROUP_REVISION_CONFLICT");
    const result = await groups.withWriteLock(tx => id ? tx.updateGroup(id, input, { expectedRevision }) : tx.createGroup(input));
    filter = result.status; selectedGroupId = result.groupId; closeDialog($("#group-dialog")); render();
  } catch (error) { setFormError("#group-form-error", displayError(error)); }
});
$("#roster-preview-button").addEventListener("click", previewRoster);
$("#roster-input").addEventListener("input", () => { rosterPreview = null; rosterApproval = null; $("#roster-confirm-button").disabled = true; $("#roster-preview").replaceChildren(); });
$("#roster-replace").addEventListener("change", () => { rosterPreview = null; rosterApproval = null; $("#roster-confirm-button").disabled = true; $("#roster-preview").replaceChildren(); });
$("#roster-form").addEventListener("submit", async (event) => {
  event.preventDefault(); setFormError("#roster-form-error");
  if (!rosterPreview || !rosterApproval) { previewRoster(); return; }
  const approved = rosterApproval;
  const reviewed = rosterPreview;
  // Recheck on click AND after the asynchronous browser write-lock wait.
  // Explicit teacher confirmation is tied to the exact text, options and group.
  const requireUnchangedReview = () => {
    accessGate.requireAllowed();
    if (!$("#roster-dialog")?.open ||
        $("#roster-dialog").dataset.groupId !== approved.groupId ||
        $("#roster-input").value !== approved.rawText ||
        $("#roster-replace").checked !== approved.replace ||
        reviewed.groupId !== approved.groupId ||
        reviewed.replace !== approved.replace ||
        reviewed.currentRevision !== approved.revision ||
        !reviewed.diff.hasChanges || !reviewed.parsed.entries.length ||
        reviewed.parsed.truncated || reviewed.parsed.invalid.length ||
        reviewed.parsed.duplicates.length) {
      throw new Error("ROSTER_REVIEW_CHANGED");
    }
  };
  try {
    requireUnchangedReview();
    $("#roster-confirm-button").disabled = true;
    const result = await groups.withWriteLock(tx => {
      requireUnchangedReview();
      return tx.importRoster({
        groupId: approved.groupId, rawText: approved.rawText,
        replace: approved.replace, expectedRevision: approved.revision,
      });
    });
    selectedGroupId = result.group.groupId;
    closeDialog($("#roster-dialog"));
    rosterPreview = null; rosterApproval = null; render();
  } catch (error) {
    rosterPreview = null; rosterApproval = null;
    const node = $("#roster-form-error");
    if (node) setFormError("#roster-form-error", displayError(error));
    const button = $("#roster-confirm-button");
    if (button) button.disabled = true;
  }
});
$("#roster-dialog").addEventListener("close", () => {
  rosterPreview = null; rosterApproval = null;
  $("#roster-preview").replaceChildren();
  $("#roster-input").value = "";
});
$("#groups-backup-export").addEventListener("click", exportBackup);
$("#groups-backup-import").addEventListener("click", () => $("#groups-backup-file").click());
$("#groups-backup-file").addEventListener("change", (event) => { const file = event.target.files?.[0]; event.target.value = ""; void importBackupFile(file); });
$("#groups-legacy-open").addEventListener("click", openLegacyPreview);
$("#groups-legacy-file").addEventListener("change", (event) => { const file = event.target.files?.[0]; event.target.value = ""; void previewLegacyBackupFile(file); });
$("#groups-legacy-dialog").addEventListener("close", () => { ++legacyPreviewSequence; $("#groups-legacy-preview").replaceChildren(); $("#groups-legacy-file").value = ""; });
document.querySelectorAll("[data-lang]").forEach((node) => node.addEventListener("click", () => setTimeout(render, 0)));

render();

}

void startGroupsPage().catch(() => denyGroupsPage());
