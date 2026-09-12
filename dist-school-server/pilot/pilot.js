import { safeStatistics } from "../shared/safe-export.js?v=0.21.60";

await window.GHRAB.accessReady;
if (window.GHRAB.canAccessAdminPage?.("pilot") && !window.GHRAB.isColleaguePreview?.()) {
  const G = window.GHRAB;
  const $ = (s) => document.querySelector(s);
  let apps = [];
  function eventLabel(e) {
    const types = {
      handoff: ["Předání materiálu", "Material handoff"],
      "handoff-consumed": ["Převzetí materiálu", "Material received"],
      "material-saved": ["Uložení materiálu", "Resource saved"],
      "material-exported": ["Export materiálu", "Resource export"],
      "ludus-export": ["Export LUDUS", "LUDUS export"],
    };
    if (e.type === "generation") {
      const outcomes = {
        success: ["Test úspěšně vygenerován", "Test generated successfully"],
        error: ["Generování skončilo chybou", "Generation ended with an error"],
        cancelled: ["Generování zrušeno", "Generation cancelled"],
      };
      return G.t(
        ...(outcomes[e.outcome] || ["Generování testu", "Test generation"]),
      );
    }
    return G.t(...(types[e.type] || [e.type, e.type]));
  }
  function appName(id) {
    return (
      G.localised(apps.find((a) => a.id === id)?.name) ||
      G.t("AI Studio", "AI Studio")
    );
  }
  function metrics() {
    const events = G.getPilotEvents(),
      launches = G.getLaunches(),
      workspace = G.getWorkspace();
    return {
      events,
      launches,
      workspace,
      ...safeStatistics({ events, launches, workspace }),
    };
  }
  function duration(seconds) {
    const total = Math.max(0, Math.round(Number(seconds || 0)));
    const h = Math.floor(total / 3600),
      m = Math.floor((total % 3600) / 60);
    if (h) return `${h} h ${m} min`;
    if (m) return `${m} min`;
    return `${total} s`;
  }
  function renderKpis() {
    const m = metrics(),
      host = $("#pilot-kpis");
    const vals = [
      [
        m.launchCount,
        G.t(
          "spuštění ze Studia v tomto prohlížeči",
          "launches from the Studio in this browser",
        ),
      ],
      [
        duration(m.activeSeconds),
        G.t("aktivního času v aplikacích", "active time in applications"),
      ],
      [
        m.generationSuccess,
        G.t("úspěšně vygenerovaných testů", "tests generated successfully"),
      ],
      [
        m.generationErrors,
        G.t("generování ukončených chybou", "generations ending with an error"),
      ],
      [m.materialCount, G.t("místních materiálů", "local resources")],
      [m.handoffs, G.t("předání mezi aplikacemi", "application handoffs")],
    ];
    host.replaceChildren(
      ...vals.map(([v, l]) => {
        const a = document.createElement("article");
        a.className = "pilot-kpi";
        const strong = document.createElement("strong");
        strong.textContent = String(v);
        const span = document.createElement("span");
        span.textContent = l;
        a.append(strong, span);
        return a;
      }),
    );
  }
  function renderEvents() {
    const list = G.getPilotEvents().slice().reverse().slice(0, 20),
      host = $("#pilot-events");
    if (!list.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = G.t(
        "Zatím nejsou žádné automatické provozní záznamy.",
        "There are no automatic operational records yet.",
      );
      host.replaceChildren(empty);
      return;
    }
    host.replaceChildren(
      ...list.map((e) => {
        const row = document.createElement("article");
        row.className = `pilot-event result-${e.outcome || e.result || "auto"}`;
        const top = document.createElement("div");
        const strong = document.createElement("strong");
        strong.textContent = eventLabel(e);
        const time = document.createElement("time");
        time.textContent = new Date(e.at).toLocaleString(
          G.state.language === "cs" ? "cs-CZ" : "en-GB",
        );
        top.append(strong, time);
        const p = document.createElement("p");
        p.textContent = appName(e.appId);
        row.append(top, p);
        return row;
      }),
    );
  }
  function render() {
    renderKpis();
    renderEvents();
  }
  $("#reset-pilot").addEventListener("click", () => {
    if (
      confirm(
        G.t(
          "Opravdu vymazat místní počty spuštění, aktivní čas a technické události? Materiály v pracovním prostoru zůstanou zachovány.",
          "Clear local launches, active time and technical events? Workspace resources will remain.",
        ),
      )
    ) {
      G.safeRemoveItem("ghrab.pilot.launches");
      G.clearPilotEvents();
      render();
    }
  });
  document.addEventListener("ghrab:language", render);
  G.loadApps().then((x) => {
    apps = x;
    render();
  });
  render();
}
