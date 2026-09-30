import { LocalGroupsProvider, installGlobalGroupsApi } from "./group-service.js";

const $ = (selector, root = document) => root.querySelector(selector);
const diagnostics = [];
let selectedGroupId = null;
let filter = "active";
let rosterPreview = null;

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
  const messages = {
    GROUP_DISPLAY_NAME_REQUIRED: tr("Zadejte název skupiny.", "Enter a group name."),
    GROUP_SCHOOL_YEAR_INVALID: tr("Školní rok zadejte např. 2026/27.", "Enter the school year, e.g. 2026/27."),
    GROUP_REVISION_CONFLICT: tr("Skupina se mezitím změnila. Načtěte nový náhled a potvrďte jej znovu.", "The group changed in the meantime. Refresh the preview and confirm it again."),
    ROSTER_EMPTY: tr("V seznamu nebyl rozpoznán žádný platný student.", "No valid student was recognized in the roster."),
    ROSTER_IMPORT_TOO_LARGE: tr("Vložený seznam je příliš velký.", "The pasted roster is too large."),
    GROUP_STORAGE_WRITE_FAILED: tr("Data se nepodařilo bezpečně uložit v tomto prohlížeči.", "The data could not be safely stored in this browser."),
  };
  return messages[code] || tr("Operaci se nepodařilo dokončit.", "The operation could not be completed.");
}

const provider = new LocalGroupsProvider({
  onDiagnostic(detail) {
    diagnostics.push(detail?.code || "GROUP_STORAGE_DIAGNOSTIC");
    renderDiagnostic();
  },
});
const groups = installGlobalGroupsApi({ provider });

function renderDiagnostic() {
  const box = $("#groups-diagnostic");
  if (!box) return;
  if (!diagnostics.length) { box.hidden = true; box.textContent = ""; return; }
  box.hidden = false;
  box.textContent = tr("Úložiště skupin hlásí problém. Zkontrolujte, zda prohlížeč neblokuje místní úložiště; osobní údaje nejsou součástí diagnostiky.", "Group storage reports a problem. Check whether the browser blocks local storage; personal data is not included in diagnostics.");
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

function render() {
  document.querySelectorAll("[data-group-filter]").forEach((node) => node.classList.toggle("is-active", node.dataset.groupFilter === filter));
  renderList(); renderDiagnostic();
}

function setFormError(selector, message = "") { const box = $(selector); box.textContent = message; box.hidden = !message; }
function showDialog(dialog) { if (typeof dialog.showModal === "function") dialog.showModal(); else dialog.setAttribute("open", ""); }
function closeDialog(dialog) { if (typeof dialog.close === "function") dialog.close(); else dialog.removeAttribute("open"); }

function openGroupDialog(group = null) {
  $("#group-edit-id").value = group?.groupId || "";
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
  try { groups.archiveGroup(group.groupId, { expectedRevision: group.revision }); selectedGroupId = groups.listGroups({ status: filter })[0]?.groupId || null; render(); } catch (error) { globalThis.alert(displayError(error)); }
}
async function reactivateGroup(group) {
  try { const next = groups.updateGroup(group.groupId, { status: "active" }, { expectedRevision: group.revision }); filter = "active"; selectedGroupId = next.groupId; render(); } catch (error) { globalThis.alert(displayError(error)); }
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
}

function openRosterDialog(group) {
  rosterPreview = null;
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
    rosterPreview = groups.previewRosterImport(groupId, $("#roster-input").value, { replace: $("#roster-replace").checked });
    renderRosterPreview(rosterPreview);
    $("#roster-confirm-button").disabled = rosterPreview.parsed.entries.length === 0 || !rosterPreview.diff.hasChanges;
  } catch (error) {
    rosterPreview = null; $("#roster-confirm-button").disabled = true; setFormError("#roster-form-error", displayError(error));
  }
}

function downloadJson(name, data) {
  const blob = new Blob([`${JSON.stringify(data, null, 2)}\n`], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = name; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 0);
}

function exportBackup() {
  const backup = groups.exportBackup();
  const date = new Date().toISOString().slice(0, 10);
  downloadJson(`ai-studio-moje-skupiny-${date}.json`, backup);
}

async function importBackupFile(file) {
  if (!file) return;
  if (!globalThis.confirm(tr("Tato operace nahradí současnou centrální evidenci obsahem zálohy. Pokračovat?", "This operation replaces the current central group data with the backup. Continue?"))) return;
  try { const parsed = JSON.parse(await file.text()); groups.importBackup(parsed); selectedGroupId = null; filter = "active"; render(); } catch (error) { globalThis.alert(displayError(error)); }
}

$("#group-create").addEventListener("click", () => openGroupDialog());
document.querySelectorAll("[data-group-filter]").forEach((node) => node.addEventListener("click", () => { filter = node.dataset.groupFilter; selectedGroupId = null; render(); }));
document.querySelectorAll("[data-dialog-close]").forEach((node) => node.addEventListener("click", () => closeDialog(node.closest("dialog"))));
$("#group-form").addEventListener("submit", (event) => {
  event.preventDefault(); setFormError("#group-form-error");
  try {
    const id = $("#group-edit-id").value;
    const input = { displayName: $("#group-name").value, schoolYear: $("#group-year").value, subject: $("#group-subject").value, grade: $("#group-grade").value };
    const result = id ? groups.updateGroup(id, input, { expectedRevision: groups.getRevision(id) }) : groups.createGroup(input);
    filter = result.status; selectedGroupId = result.groupId; closeDialog($("#group-dialog")); render();
  } catch (error) { setFormError("#group-form-error", displayError(error)); }
});
$("#roster-preview-button").addEventListener("click", previewRoster);
$("#roster-input").addEventListener("input", () => { rosterPreview = null; $("#roster-confirm-button").disabled = true; $("#roster-preview").replaceChildren(); });
$("#roster-replace").addEventListener("change", () => { rosterPreview = null; $("#roster-confirm-button").disabled = true; $("#roster-preview").replaceChildren(); });
$("#roster-form").addEventListener("submit", (event) => {
  event.preventDefault(); setFormError("#roster-form-error");
  if (!rosterPreview) { previewRoster(); return; }
  try {
    const result = groups.importRoster({ groupId: rosterPreview.groupId, rawText: $("#roster-input").value, replace: $("#roster-replace").checked, expectedRevision: rosterPreview.currentRevision });
    selectedGroupId = result.group.groupId; closeDialog($("#roster-dialog")); rosterPreview = null; render();
  } catch (error) { setFormError("#roster-form-error", displayError(error)); $("#roster-confirm-button").disabled = true; rosterPreview = null; }
});
$("#groups-backup-export").addEventListener("click", exportBackup);
$("#groups-backup-import").addEventListener("click", () => $("#groups-backup-file").click());
$("#groups-backup-file").addEventListener("change", (event) => { const file = event.target.files?.[0]; event.target.value = ""; void importBackupFile(file); });
document.querySelectorAll("[data-lang]").forEach((node) => node.addEventListener("click", () => setTimeout(render, 0)));

render();
