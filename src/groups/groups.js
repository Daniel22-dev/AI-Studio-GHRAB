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
