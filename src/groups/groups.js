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
