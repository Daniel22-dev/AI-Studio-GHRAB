const G = window.GHRAB;
const frame = document.querySelector("#manual-frame");
const statePanel = document.querySelector("#viewer-state");
const stateTitle = document.querySelector("#viewer-state-title");
const stateCopy = document.querySelector("#viewer-state-copy");
const stateActions = document.querySelector("#viewer-state-actions");
const titleNode = document.querySelector("#viewer-title");
const metaNode = document.querySelector("#viewer-meta");
const iconNode = document.querySelector("#viewer-icon");
const reloadButton = document.querySelector("#viewer-reload");
const externalLink = document.querySelector("#viewer-external");
let currentApp = null;
let currentManualUrl = null;
let loadTimer = null;

function make(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function allowedManualUrl(raw) {
  try {
    const url = new URL(raw, location.href);
    const allowedOrigins = new Set([
      location.origin,
      "https://daniel22-dev.github.io",
    ]);
    if (url.protocol !== "https:" || !allowedOrigins.has(url.origin))
      return null;
    return url;
  } catch {
    return null;
  }
}

function showState(kind, title, copy, actions = []) {
  clearTimeout(loadTimer);
  statePanel.className = `viewer-state ${kind || ""}`.trim();
  statePanel.hidden = false;
  frame.hidden = true;
  stateTitle.textContent = title;
  stateCopy.textContent = copy;
  stateActions.replaceChildren(...actions);
}

function linkButton(text, href, className = "button secondary") {
  const link = make("a", className, text);
  link.href = href;
  return link;
}

function updateHeader() {
  if (!currentApp) return;
  titleNode.textContent = G.localised(currentApp.name);
  metaNode.textContent = `${G.t("interaktivní manuál · verze", "interactive manual · version")} ${currentApp.version || "—"}`;
  iconNode.src = `../${currentApp.icon}`;
  iconNode.alt = "";
  document.title = `${G.localised(currentApp.name)} · ${G.t("manuál", "manual")} · AI Studio GHRAB`;
  reloadButton.textContent = G.t("Obnovit", "Reload");
  externalLink.textContent = G.t("Otevřít zvlášť", "Open separately");
  frame.title = G.t(
    `Interaktivní manuál: ${G.localised(currentApp.name)}`,
    `Interactive manual: ${G.localised(currentApp.name)}`,
  );
}

function renderLocked(access) {
  const training = G.requiredTraining(currentApp.id);
  const detail =
    access.reason === "app-not-permitted" && training
      ? G.t(
          `Tento manuál se odemkne stejným oprávněním jako aplikace po školení ${training.trainingCode} · verze ${training.trainingVersion}.`,
          `This manual unlocks with the same application permit after training ${training.trainingCode} · version ${training.trainingVersion}.`,
        )
      : G.formatReason(access.reason, G.state.language);
  showState(
    "locked",
    G.t("Tento manuál je uzamčen", "This manual is locked"),
    detail,
    [
      linkButton(
        G.t("Otevřít Můj přístup", "Open My access"),
        "../access/",
        "button primary",
      ),
      linkButton(G.t("Zpět na manuály", "Back to manuals"), "./"),
    ],
  );
}

function loadFrame() {
  if (!currentManualUrl) return;
  statePanel.className = "viewer-state";
  statePanel.hidden = false;
  frame.hidden = true;
  stateTitle.textContent = G.t(
    "Načítám aktuální manuál…",
    "Loading the current manual…",
  );
  stateCopy.textContent = G.t(
    "Manuál zůstane otevřený přímo uvnitř nainstalovaného AI Studia.",
    "The manual will stay open directly inside the installed AI Studio.",
  );
  stateActions.replaceChildren();
  frame.src = currentManualUrl.href;
  loadTimer = setTimeout(() => {
    if (frame.hidden) {
      stateCopy.textContent = G.t(
        "Načítání trvá déle. Zkontrolujte připojení; případně použijte volbu Otevřít zvlášť.",
        "Loading is taking longer. Check your connection or use Open separately.",
      );
      externalLink.hidden = false;
    }
  }, 9000);
}

async function initialise() {
  const appId = new URLSearchParams(location.search).get("app") || "";
  try {
    await G.accessReady;
    const apps = await G.loadApps();
    currentApp = apps.find((app) => app.id === appId) || null;
    if (!currentApp) {
      showState(
        "error",
        G.t("Manuál nebyl nalezen", "Manual not found"),
        G.t(
          "Odkaz neodpovídá žádné aplikaci v aktuálním registru.",
          "The link does not match any application in the current registry.",
        ),
        [
          linkButton(
            G.t("Zpět na přehled", "Back to catalogue"),
            "./",
            "button primary",
          ),
        ],
      );
      return;
    }
    updateHeader();
    const access = G.hasAppAccess(currentApp.id);
    if (!access.enabled) {
      renderLocked(access);
      return;
    }
    currentManualUrl = allowedManualUrl(currentApp.manualUrl);
    if (!currentManualUrl) {
      showState(
        "error",
        G.t("Adresa manuálu není bezpečná", "The manual address is not safe"),
        G.t(
          "AI Studio odmítlo neplatnou nebo neočekávanou adresu manuálu.",
          "AI Studio rejected an invalid or unexpected manual address.",
        ),
        [
          linkButton(
            G.t("Zpět na přehled", "Back to catalogue"),
            "./",
            "button primary",
          ),
        ],
      );
      return;
    }
    externalLink.href = currentManualUrl.href;
    externalLink.hidden = false;
    reloadButton.hidden = false;
    loadFrame();
  } catch {
    showState(
      "error",
      G.t("Manuál se nepodařilo připravit", "The manual could not be prepared"),
      G.t(
        "Obnovte stránku nebo se vraťte do katalogu manuálů.",
        "Refresh the page or return to the manual catalogue.",
      ),
      [
        linkButton(
          G.t("Zpět na přehled", "Back to catalogue"),
          "./",
          "button primary",
        ),
      ],
    );
  }
}

frame.addEventListener("load", () => {
  clearTimeout(loadTimer);
  statePanel.hidden = true;
  frame.hidden = false;
});
reloadButton.addEventListener("click", () => loadFrame());
document.addEventListener("ghrab:language", () => {
  updateHeader();
  if (!currentApp) return;
  const access = G.hasAppAccess(currentApp.id);
  if (!access.enabled) renderLocked(access);
});
document.addEventListener("ghrab:access-changed", () => initialise());
initialise();
