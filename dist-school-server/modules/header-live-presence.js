import { loadLivePresence } from "./live-presence.js?v=0.21.53";

function ensureStyles() {
  if (document.querySelector("link[data-live-presence-style]")) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = new URL("./header-live-presence.css", import.meta.url).href;
  link.dataset.livePresenceStyle = "";
  document.head.append(link);
}

export function mountHeaderLivePresence({
  actions,
  deploymentReady,
  loadApps,
  localised,
  t,
  isAdmin,
  isColleaguePreview,
} = {}) {
  if (!actions || actions.querySelector("[data-live-presence-menu]")) return null;
  ensureStyles();

  const wrapper = document.createElement("div");
  wrapper.className = "live-presence-menu";
  wrapper.dataset.livePresenceMenu = "";
  wrapper.dataset.fullAdminOnly = "";
  wrapper.hidden = true;

  const button = document.createElement("button");
  button.className = "icon-button settings-toggle live-presence-toggle";
  button.type = "button";
  button.setAttribute("aria-expanded", "false");
  button.setAttribute("aria-haspopup", "true");

  const dot = document.createElement("span");
  dot.className = "live-presence-dot";
  dot.setAttribute("aria-hidden", "true");
  dot.textContent = "●";
  const label = document.createElement("span");
  label.className = "live-presence-toggle-label";
  const count = document.createElement("span");
  count.className = "live-presence-count";
  count.hidden = true;
  button.append(dot, label, count);

  const panel = document.createElement("div");
  panel.className = "settings-panel live-presence-popover";
  panel.hidden = true;

  const head = document.createElement("div");
  head.className = "live-presence-popover-head";
  const heading = document.createElement("strong");
  const refresh = document.createElement("button");
  refresh.className = "button compact ghost live-presence-popover-refresh";
  refresh.type = "button";
  head.append(heading, refresh);

  const state = document.createElement("p");
  state.className = "live-presence-popover-state";
  state.setAttribute("aria-live", "polite");

  const list = document.createElement("div");
  list.className = "live-presence-popover-list";
  list.setAttribute("aria-live", "polite");

  const privacy = document.createElement("small");
  privacy.className = "live-presence-popover-privacy";

  panel.append(head, state, list, privacy);
  wrapper.append(button, panel);

  const settingsMenu = actions.querySelector(".settings-menu");
  if (settingsMenu) actions.insertBefore(wrapper, settingsMenu);
  else actions.append(wrapper);

  let apps = null;
  let timer = 0;
  let refreshing = false;

  const appLabel = (appId) => {
    if (appId === "ai-studio") return "AI Studio";
    const app = (apps || []).find((item) => item.id === appId);
    return localised?.(app?.name) || appId || "—";
  };

  const renderMessage = (message) => {
    list.replaceChildren();
    const empty = document.createElement("p");
    empty.className = "live-presence-popover-empty";
    empty.textContent = message;
    list.append(empty);
  };

  const updateText = () => {
    label.textContent = t("Online", "Online");
    button.setAttribute("aria-label", t("Kdo je právě online", "Who is online now"));
    heading.textContent = t("Právě online", "Online now");
    refresh.textContent = t("Obnovit", "Refresh");
    privacy.textContent = t(
      "Pouze aktuální stav. Bez historie a bez obsahu práce.",
      "Current status only. No history and no work content.",
    );
  };

  const refreshSnapshot = async () => {
    if (refreshing || !isAdmin?.() || isColleaguePreview?.()) return;
    refreshing = true;
    refresh.disabled = true;
    try {
      apps ||= await loadApps?.().catch(() => []);
      const snapshot = await loadLivePresence(deploymentReady);
      count.hidden = !snapshot.enabled || !snapshot.connected;
      if (!count.hidden) count.textContent = String(snapshot.users.length);
      dot.classList.toggle("is-connected", snapshot.enabled && snapshot.connected);

      if (!snapshot.prepared) {
        state.textContent = t(
          "Funkce ještě není připravena v tomto profilu.",
          "This feature is not prepared in this profile yet.",
        );
        renderMessage(t("Dostupné po přípravě školního serveru.", "Available after the school server is prepared."));
        return;
      }
      if (!snapshot.enabled) {
        state.textContent = t(
          "Aktivuje se po připojení školního serveru.",
          "Activates once the school server is connected.",
        );
        renderMessage(t("V bezserverovém provozu se žádná jména ani stav aplikace neposílají.", "No names or application state are sent in serverless mode."));
        return;
      }
      if (!snapshot.connected) {
        state.textContent = t("Server přítomnosti nyní neodpovídá.", "The presence server is not responding now.");
        renderMessage(t("Živá data se nepodařilo načíst.", "Live data could not be loaded."));
        return;
      }

      state.textContent = t(
        `${snapshot.users.length} online právě teď`,
        `${snapshot.users.length} online now`,
      );
      list.replaceChildren();
      if (!snapshot.users.length) {
        renderMessage(t("Nikdo další právě není online.", "No one else is online right now."));
        return;
      }
      for (const user of snapshot.users) {
        const row = document.createElement("div");
        row.className = "live-presence-person";
        const person = document.createElement("strong");
        person.textContent = user.displayName;
        const app = document.createElement("span");
        app.textContent = appLabel(user.appId);
        row.append(person, app);
        list.append(row);
      }
    } finally {
      refreshing = false;
      refresh.disabled = false;
    }
  };

  const stopTimer = () => {
    if (!timer) return;
    window.clearInterval(timer);
    timer = 0;
  };
  const close = () => {
    panel.hidden = true;
    button.setAttribute("aria-expanded", "false");
    stopTimer();
  };
  const open = () => {
    panel.hidden = false;
    button.setAttribute("aria-expanded", "true");
    void refreshSnapshot();
    if (!timer) timer = window.setInterval(() => {
      if (!panel.hidden && document.visibilityState !== "hidden") void refreshSnapshot();
    }, 30000);
  };

  button.addEventListener("click", (event) => {
    event.stopPropagation();
    if (panel.hidden) open();
    else close();
  });
  refresh.addEventListener("click", (event) => {
    event.stopPropagation();
    void refreshSnapshot();
  });
  document.addEventListener("click", (event) => {
    if (!wrapper.contains(event.target)) close();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close();
  });
  document.addEventListener("ghrab:language", () => {
    updateText();
    if (!panel.hidden) void refreshSnapshot();
  });
  window.addEventListener("pagehide", stopTimer, { once: true });

  updateText();
  renderMessage(t("Načte se po otevření.", "Loads when opened."));
  return { wrapper, refresh: refreshSnapshot, close };
}
