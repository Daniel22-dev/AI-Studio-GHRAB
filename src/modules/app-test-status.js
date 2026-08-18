const STORAGE_KEY = "ghrab.ai-studio.app-test-status.v1";
const ORDER = ["untested", "light", "tested"];
const META = Object.freeze({
  untested: { symbol: "○", cs: "Netestováno", en: "Not tested" },
  light: { symbol: "◐", cs: "Lehce otestováno", en: "Lightly tested" },
  tested: { symbol: "✓", cs: "Otestováno", en: "Tested" },
});

export function getAppTestStatuses(storage = localStorage) {
  try {
    const parsed = JSON.parse(storage.getItem(STORAGE_KEY) || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(
        ([appId, status]) => Boolean(appId) && ORDER.includes(status),
      ),
    );
  } catch {
    return {};
  }
}

export function getAppTestStatus(appId, storage = localStorage) {
  return getAppTestStatuses(storage)[appId] || "untested";
}

export function setAppTestStatus(appId, status, storage = localStorage) {
  if (!appId || !ORDER.includes(status)) return false;
  const stored = getAppTestStatuses(storage);
  if (status === "untested") delete stored[appId];
  else stored[appId] = status;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(stored));
    return true;
  } catch (error) {
    console.warn("AI Studio: uložení stavu testování selhalo.", error);
    return false;
  }
}

function nextStatus(status) {
  return ORDER[(Math.max(0, ORDER.indexOf(status)) + 1) % ORDER.length];
}

export function createAppTestStatusButton(app, article, language = "cs") {
  const translate = (cs, en) => (language === "cs" ? cs : en);
  const appName =
    typeof app.name === "string"
      ? app.name
      : app.name?.[language] || app.name?.cs || app.name?.en || app.id;
  let status = getAppTestStatus(app.id);
  const button = document.createElement("button");
  button.type = "button";
  button.className = "icon-button app-test-status-button";

  const update = () => {
    const meta = META[status] || META.untested;
    const label = meta[language] || meta.cs;
    article.dataset.testStatus = status;
    button.textContent = meta.symbol;
    button.dataset.testStatus = status;
    button.setAttribute(
      "aria-label",
      `${appName}: ${translate("stav testování", "testing status")} – ${label}. ${translate("Kliknutím změnit.", "Click to change.")}`,
    );
    button.title = `${translate("Stav testování", "Testing status")}: ${meta.symbol} ${label}`;
  };

  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const next = nextStatus(status);
    if (!setAppTestStatus(app.id, next)) {
      button.title = translate(
        "Stav testování se nepodařilo uložit.",
        "The testing status could not be saved.",
      );
      return;
    }
    status = next;
    update();
  });

  update();
  return button;
}
