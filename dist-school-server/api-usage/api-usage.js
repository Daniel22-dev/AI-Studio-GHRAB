import { clearApiUsageCache, loadApiUsage } from "../modules/api-usage.js?v=0.21.54";

await window.GHRAB.accessReady;
if (window.GHRAB.canAccessAdminPage?.("api-usage") && !window.GHRAB.isColleaguePreview?.()) {
  const G = window.GHRAB;
  const $ = (selector) => document.querySelector(selector);
  let snapshot = null;

  function lang() {
    return document.documentElement.lang === "en" ? "en" : "cs";
  }

  function t(cs, en) {
    return lang() === "en" ? en : cs;
  }

  function money(value, currency = "usd") {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) return "—";
    return new Intl.NumberFormat(lang() === "en" ? "en-US" : "cs-CZ", {
      style: "currency",
      currency: String(currency || "usd").toUpperCase(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value));
  }

  function integer(value) {
    return Math.max(0, Math.round(Number(value || 0))).toLocaleString(lang() === "en" ? "en-US" : "cs-CZ");
  }

  function formatTime(value) {
    const date = new Date(value || "");
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleString(lang() === "en" ? "en-GB" : "cs-CZ");
  }

  function setText(selector, value) {
    const node = $(selector);
    if (node) node.textContent = value;
  }

  function emptyRow(message) {
    const tr = document.createElement("tr");
    tr.className = "api-usage-empty";
    const td = document.createElement("td");
    td.colSpan = 4;
    td.textContent = message;
    tr.append(td);
    return tr;
  }

  function renderRows(host, rows, currency) {
    if (!host) return;
    host.replaceChildren();
    if (!rows?.length) {
      host.append(emptyRow(t("Data zatím nejsou k dispozici.", "Data are not available yet.")));
      return;
    }
    for (const row of rows) {
      const tr = document.createElement("tr");
      const tokens = Number(row.inputTokens || 0) + Number(row.outputTokens || 0);
      [row.label || row.id, money(row.cost, currency), integer(row.requests), integer(tokens)].forEach((value) => {
        const td = document.createElement("td");
        td.textContent = value;
        tr.append(td);
      });
      host.append(tr);
    }
  }

  function renderStatus(value) {
    const status = $("#api-usage-status");
    if (!status) return;
    if (value?.connected) {
      status.className = "notice api-usage-status success";
      status.textContent = t(
        `Data načtena ze školního serveru. Poslední serverový souhrn: ${formatTime(value.generatedAt)}.`,
        `Data loaded from the school server. Latest server summary: ${formatTime(value.generatedAt)}.`,
      );
      return;
    }
    if (value?.status === "error") {
      status.className = "notice api-usage-status error";
      status.textContent = t(
        "Školní server je pro tuto funkci zapnutý, ale údaje se nepodařilo načíst. Zkuste Obnovit data; API klíč zůstává na serveru.",
        "The school server has this feature enabled, but the data could not be loaded. Try Refresh data; the API key remains on the server.",
      );
      return;
    }
    status.className = "notice api-usage-status";
    status.textContent = value?.prepared
      ? t(
          "Přehled je připravený. Skutečná čísla se zobrazí až po zapnutí serverového endpointu API spotřeby.",
          "The overview is ready. Actual figures will appear once the school-server API usage endpoint is enabled.",
        )
      : t(
          "Tento deployment zatím nemá připravený serverový endpoint API spotřeby.",
          "This deployment does not yet have the API usage server endpoint prepared.",
        );
  }

  function render(value) {
    snapshot = value;
    const currency = value?.currency || "usd";
    const spend = value?.connected ? value.totals.cost : null;
    const budget = value?.connected ? value.budget.amount : null;
    const utilisation = budget && budget > 0 ? (Number(spend || 0) / budget) * 100 : null;
    setText("#api-usage-spend", money(spend, currency));
    setText("#api-usage-budget", money(budget, currency));
    setText(
      "#api-usage-budget-note",
      budget === null
        ? t("Rozpočet zatím není serverem uveden.", "The server has not provided a budget yet.")
        : t("Nastavený měsíční limit", "Configured monthly limit"),
    );
    setText(
      "#api-usage-utilisation",
      utilisation === null
        ? "—"
        : `${utilisation.toLocaleString(lang() === "en" ? "en-US" : "cs-CZ", { maximumFractionDigits: 1 })} %`,
    );
    const progress = $("#api-usage-progress");
    if (progress) {
      progress.value = utilisation === null ? 0 : Math.min(100, utilisation);
      progress.textContent = utilisation === null ? "0 %" : `${utilisation.toFixed(1)} %`;
    }
    setText("#api-usage-requests", value?.connected ? integer(value.totals.requests) : "—");
    setText("#api-usage-generated", value?.connected ? formatTime(value.generatedAt) : "—");
    setText("#api-usage-input-tokens", value?.connected ? integer(value.totals.inputTokens) : "—");
    setText("#api-usage-output-tokens", value?.connected ? integer(value.totals.outputTokens) : "—");
    setText("#api-usage-cached-tokens", value?.connected ? integer(value.totals.cachedInputTokens) : "—");
    renderRows($("#api-usage-projects"), value?.projects, currency);
    renderRows($("#api-usage-applications"), value?.applications, currency);
    renderRows($("#api-usage-models"), value?.models, currency);
    renderStatus(value);
  }

  async function refresh({ force = false } = {}) {
    const button = $("#api-usage-refresh");
    if (button) button.disabled = true;
    try {
      const value = await loadApiUsage(
        G.deploymentReady,
        { from: $("#api-usage-from")?.value, to: $("#api-usage-to")?.value },
        fetch,
        { force },
      );
      render(value);
    } finally {
      if (button) button.disabled = false;
    }
  }

  function setupDates() {
    const today = new Date();
    const first = new Date(today.getFullYear(), today.getMonth(), 1);
    $("#api-usage-from").value = first.toISOString().slice(0, 10);
    $("#api-usage-to").value = today.toISOString().slice(0, 10);
  }

  setupDates();
  $("#api-usage-refresh")?.addEventListener("click", () => {
    clearApiUsageCache();
    refresh({ force: true });
  });
  $("#api-usage-from")?.addEventListener("change", () => refresh());
  $("#api-usage-to")?.addEventListener("change", () => refresh());
  document.addEventListener("ghrab:language", () => snapshot && render(snapshot));
  refresh();
}
