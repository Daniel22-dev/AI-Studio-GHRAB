import { createTaskProgress } from "../modules/task-progress.js";

const G = window.GHRAB;
await G.accessReady;

const section = document.querySelector("#developer-readiness-section");
const canView =
  G.canAccessAdminPage?.("automation") === true &&
  !G.isTeacherPreview?.();

if (!section || !canView) {
  if (section) section.hidden = true;
} else {
  section.hidden = false;
  const body = document.querySelector("#developer-readiness-table-body");
  const summary = document.querySelector("#developer-readiness-summary");
  const note = document.querySelector("#developer-readiness-note");
  const testAll = document.querySelector("#developer-verify-all");
  const coreMeta = document.querySelector("#ecosystem-core-meta");
  const sourceMeta = document.querySelector("#ecosystem-source-meta");
  const manualMeta = document.querySelector("#ecosystem-manual-meta");
  const STORE = "ghrab.ai-studio.ecosystem-check.v2";
  let ctx;

  const loadJson = async (url) => {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`${url}: ${response.status}`);
    return response.json();
  };
  const mapBy = (items = [], key = "id") =>
    new Map(items.map((item) => [item[key], item]));
  const stored = () => {
    try {
      return JSON.parse(G.safeGetItem(STORE, "{}") || "{}");
    } catch {
      return {};
    }
  };
  const save = (value) => G.safeSetJson(STORE, value, { silent: true });
  const chip = (text, state = "neutral") => {
    const span = document.createElement("span");
    span.className = `developer-status ${state}`;
    span.textContent = text;
    return span;
  };
  const metric = (value, cs, en) => {
    const card = document.createElement("article");
    card.className = "automation-kpi";
    const strong = document.createElement("strong");
    strong.textContent = value;
    const span = document.createElement("span");
    span.textContent = G.t(cs, en);
    card.append(strong, span);
    return card;
  };
  const garpLabel = (value) =>
    String(value || "—")
      .replace(/^GARP-/i, "GARP ")
      .replace(/-SHIELD-PREP$/i, " · SHIELD-PREP");

  function expectedGarp(policy) {
    const counts = new Map();
    for (const item of policy?.applications || []) {
      if (!item.assuranceBaseline) continue;
      counts.set(
        item.assuranceBaseline,
        (counts.get(item.assuranceBaseline) || 0) + 1,
      );
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
  }

  function versionAtLeast(actual, minimum) {
    const a = String(actual || "0").split(".").map((value) => Number(value) || 0);
    const b = String(minimum || "0").split(".").map((value) => Number(value) || 0);
    for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
      if ((a[index] || 0) > (b[index] || 0)) return true;
      if ((a[index] || 0) < (b[index] || 0)) return false;
    }
    return true;
  }

  function formatTime(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleString(
      document.documentElement.lang === "en" ? "en-GB" : "cs-CZ",
    );
  }

  function evaluate(app) {
    const promotion = ctx.promotions.get(app.id);
    const ready = ctx.readiness.get(app.id);
    const source = ctx.sources.get(app.id);
    const targetGarp = expectedGarp(ctx.policy);
    const garpOk =
      promotion?.assuranceBaseline === targetGarp &&
      versionAtLeast(app.version, promotion?.minimumVersion);
    const promotionOk =
      promotion?.mode === "auto-patch" &&
      promotion?.requiredVerification === "deployment";
    const platformOk =
      app.platform?.contract === "ghrab-platform-v1" &&
      app.platform?.platformVersion === "1.1.2" &&
      String(app.platform?.requiredPlatformRange || "").includes("1.1.2");
    const coreNA = app.aiCore?.status === "not-applicable" || !app.aiCore;
    const coreOk =
      coreNA ||
      (Boolean(app.aiCore?.coreVersion) &&
        app.aiCore?.conformancePassed === true &&
        (!ready ||
          ready.status === "ready" ||
          ready.conformancePassed === true));
    const sourceOk =
      source?.ok === true ||
      ["deployment", "repository"].includes(source?.verification);
    const manualOk = Boolean(app.manualUrl);
    const checks = [
      garpOk,
      promotionOk,
      platformOk,
      coreOk,
      sourceOk,
      manualOk,
    ];
    return {
      promotion,
      source,
      garpOk,
      promotionOk,
      platformOk,
      coreNA,
      coreOk,
      sourceOk,
      manualOk,
      passed: checks.filter(Boolean).length,
      total: checks.length,
      ok: checks.every(Boolean),
    };
  }

  function sourceLabel(source) {
    if (source?.verification === "deployment")
      return G.t("živý manifest", "live manifest");
    if (source?.verification === "repository")
      return G.t("GitHub zdroj", "GitHub source");
    if (source?.verification === "snapshot")
      return G.t("jen snapshot", "snapshot only");
    return G.t("neověřeno", "unverified");
  }

  function render() {
    const prior = stored();
    let healthy = 0;
    let garpPass = 0;
    let promotionPass = 0;
    let platformPass = 0;
    let corePass = 0;
    let coreScope = 0;
    let sourcePass = 0;
    let manualPass = 0;
    body.replaceChildren();

    for (const app of ctx.apps) {
      const e = evaluate(app);
      healthy += e.ok ? 1 : 0;
      garpPass += e.garpOk ? 1 : 0;
      promotionPass += e.promotionOk ? 1 : 0;
      platformPass += e.platformOk ? 1 : 0;
      sourcePass += e.sourceOk ? 1 : 0;
      manualPass += e.manualOk ? 1 : 0;
      if (!e.coreNA) {
        coreScope += 1;
        corePass += e.coreOk ? 1 : 0;
      }

      const tr = document.createElement("tr");
      const name = document.createElement("td");
      const strong = document.createElement("strong");
      strong.textContent = G.localised(app.name);
      const version = document.createElement("small");
      version.className = "developer-version";
      version.textContent = `v${app.version}`;
      name.append(strong, version);

      const garp = document.createElement("td");
      const garpText =
        e.promotion?.minimumVersion && !e.garpOk
          ? `${garpLabel(e.promotion?.assuranceBaseline)} · min v${e.promotion.minimumVersion}`
          : garpLabel(e.promotion?.assuranceBaseline);
      garp.append(chip(garpText, e.garpOk ? "ok" : "error"));

      const promotion = document.createElement("td");
      promotion.append(
        chip(
          e.promotion?.mode === "auto-patch"
            ? "Auto Patch"
            : G.t("Ruční", "Manual"),
          e.promotionOk ? "ok" : "warn",
        ),
      );

      const platform = document.createElement("td");
      platform.append(
        chip(
          app.platform?.platformVersion
            ? `v${app.platform.platformVersion}`
            : "—",
          e.platformOk ? "ok" : "error",
        ),
      );

      const core = document.createElement("td");
      core.append(
        chip(
          e.coreNA
            ? G.t("Nevyužívá", "N/A")
            : app.aiCore?.coreVersion
              ? `Core ${app.aiCore.coreVersion}`
              : G.t("Chybí", "Missing"),
          e.coreOk ? (e.coreNA ? "neutral" : "ok") : "error",
        ),
      );

      const sourceManual = document.createElement("td");
      sourceManual.append(
        chip(sourceLabel(e.source), e.sourceOk ? "ok" : "warn"),
        document.createTextNode(" "),
        chip(
          e.manualOk
            ? G.t("manuál", "manual")
            : G.t("manuál chybí", "manual missing"),
          e.manualOk ? "ok" : "error",
        ),
      );

      const test = document.createElement("td");
      const button = document.createElement("button");
      button.className = "button compact ghost developer-test-button";
      button.type = "button";
      button.textContent = G.t("Otestovat", "Test");
      button.addEventListener("click", () => runOne(app.id));
      test.append(button);

      if (prior[app.id]) {
        const stamp = document.createElement("small");
        stamp.className =
          `developer-last-test ${prior[app.id].ok ? "ok" : "error"}`;
        stamp.textContent =
          `${prior[app.id].ok ? "✓" : "!"} ${prior[app.id].passed}/${prior[app.id].total} · ` +
          new Date(prior[app.id].at).toLocaleString(
            document.documentElement.lang === "en" ? "en-GB" : "cs-CZ",
          );
        test.append(stamp);
      }

      tr.append(name, garp, promotion, platform, core, sourceManual, test);
      body.append(tr);
    }

    summary.replaceChildren(
      metric(`${healthy}/${ctx.apps.length}`, "bez problému", "healthy"),
      metric(`${garpPass}/${ctx.apps.length}`, "GARP aktuální", "GARP current"),
      metric(`${promotionPass}/${ctx.apps.length}`, "Safe Promotion", "Safe Promotion"),
      metric(`${platformPass}/${ctx.apps.length}`, "Platform 1.1.2", "Platform 1.1.2"),
      metric(`${sourcePass}/${ctx.apps.length}`, "zdrojů ověřeno", "sources verified"),
    );

    const active = ctx.coreRegistry?.activeRelease;
    const runtime = ctx.runtime?.ai || ctx.readinessRoot?.runtime || {};
    if (coreMeta) {
      coreMeta.textContent = active
        ? `Core ${active.coreVersion} · ${corePass}/${coreScope} · ${runtime.defaultMode || "—"}`
        : `${corePass}/${coreScope}`;
    }
    if (sourceMeta) {
      sourceMeta.textContent =
        `${sourcePass}/${ctx.apps.length} · ` +
        G.t("poslední plná kontrola", "last full check") +
        ` ${formatTime(ctx.report?.lastFullSourceVerifiedAt || ctx.report?.generatedAt)}`;
    }
    if (manualMeta) {
      manualMeta.textContent = G.t(
        `${manualPass}/${ctx.apps.length} dostupných`,
        `${manualPass}/${ctx.apps.length} available`,
      );
    }

    note.textContent = G.t(
      `GARP baseline: ${garpLabel(expectedGarp(ctx.policy))}. Tato tabulka je jediný provozní přehled ve Správě; repozitářové GARP/P5/N5 testy zůstávají autoritativní release bránou.`,
      `GARP baseline: ${garpLabel(expectedGarp(ctx.policy))}. This table is the single operational status overview in Administration; repository GARP/P5/N5 suites remain the authoritative release gate.`,
    );
  }

  function persist(appId, evaluation) {
    const data = stored();
    data[appId] = {
      ok: evaluation.ok,
      passed: evaluation.passed,
      total: evaluation.total,
      at: new Date().toISOString(),
    };
    save(data);
  }

  function runOne(appId) {
    const app = ctx.apps.find((item) => item.id === appId);
    if (!app) return;
    const evaluation = evaluate(app);
    persist(app.id, evaluation);
    render();
    G.showToast(
      evaluation.ok
        ? G.t("Integrační kontrola prošla.", "Integration check passed.")
        : G.t(
            `Kontrola našla ${evaluation.total - evaluation.passed} problémů.`,
            `The check found ${evaluation.total - evaluation.passed} issues.`,
          ),
    );
  }

  async function runAll() {
    testAll.disabled = true;
    const progress = createTaskProgress({
      title: G.t("Kontrola stavu ekosystému", "Ecosystem status check"),
      description: G.t(
        "Procento roste pouze po skutečně vyhodnocené aplikaci.",
        "The percentage grows only after an application has actually been evaluated.",
      ),
      total: ctx.apps.length,
    });
    let failed = 0;
    for (let index = 0; index < ctx.apps.length; index += 1) {
      const app = ctx.apps[index];
      progress.update(
        index,
        G.localised(app.name),
        G.t(
          "Ověřuji ochranné vrstvy a zdroje…",
          "Checking protection layers and sources…",
        ),
      );
      const evaluation = evaluate(app);
      persist(app.id, evaluation);
      failed += evaluation.ok ? 0 : 1;
      progress.update(
        index + 1,
        G.localised(app.name),
        evaluation.ok
          ? G.t("Kontrola prošla.", "Check passed.")
          : G.t("Vyžaduje pozornost.", "Requires attention."),
      );
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    render();
    progress.finish({
      failed,
      message: failed
        ? G.t(
            `${failed} aplikací vyžaduje pozornost.`,
            `${failed} applications require attention.`,
          )
        : G.t(
            "Všechny aplikace prošly kontrolou stavu.",
            "All applications passed the status check.",
          ),
    });
    testAll.disabled = false;
  }

  async function init() {
    const [apps, policy, readiness, report, coreRegistry, runtime] =
      await Promise.all([
        G.loadApps(),
        loadJson("../config/developer-readiness.json"),
        G.loadAiReadiness(),
        G.loadSyncReport(),
        G.loadAiCoreRegistry(),
        G.loadAiRuntime(),
      ]);
    ctx = {
      apps,
      policy,
      promotions: mapBy(policy.applications),
      readiness: mapBy(readiness?.applications, "appId"),
      readinessRoot: readiness,
      report,
      sources: mapBy(report?.sources),
      coreRegistry,
      runtime,
    };
    render();
  }

  testAll?.addEventListener("click", runAll);
  document.addEventListener("ghrab:language", render);
  init().catch((error) => {
    note.className = "notice sync-error";
    note.textContent = G.t(
      `Přehled stavu se nepodařilo načíst: ${error.message}`,
      `Status overview could not be loaded: ${error.message}`,
    );
  });
}
