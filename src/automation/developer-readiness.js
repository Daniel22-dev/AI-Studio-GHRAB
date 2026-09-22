import { createTaskProgress } from "../modules/task-progress.js";

const G = window.GHRAB;
await G.accessReady;

const section = document.querySelector("#developer-readiness-section");
if (!section || !G.isAdmin() || G.isColleaguePreview?.()) {
  if (section) section.hidden = true;
} else {
  section.hidden = false;
  const body = document.querySelector("#developer-readiness-table-body");
  const summary = document.querySelector("#developer-readiness-summary");
  const note = document.querySelector("#developer-readiness-note");
  const testAll = document.querySelector("#developer-verify-all");
  const STORE = "ghrab.ai-studio.developer-readiness.v1";
  let ctx;

  const loadJson = async (url) => {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`${url}: ${response.status}`);
    return response.json();
  };
  const mapBy = (items = [], key = "id") => new Map(items.map((item) => [item[key], item]));
  const stored = () => {
    try { return JSON.parse(localStorage.getItem(STORE) || "{}"); }
    catch { return {}; }
  };
  const save = (value) => {
    try { localStorage.setItem(STORE, JSON.stringify(value)); }
    catch {}
  };
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
  const garpLabel = (value) => String(value || "—")
    .replace(/^GARP-/i, "GARP ")
    .replace(/-SHIELD-PREP$/i, " · SHIELD-PREP");

  function expectedGarp(policy) {
    const counts = new Map();
    for (const item of policy?.applications || []) {
      if (!item.assuranceBaseline) continue;
      counts.set(item.assuranceBaseline, (counts.get(item.assuranceBaseline) || 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
  }

  function evaluate(app) {
    const promotion = ctx.promotions.get(app.id);
    const ready = ctx.readiness.get(app.id);
    const source = ctx.sources.get(app.id);
    const targetGarp = expectedGarp(ctx.policy);
    const garpOk = promotion?.assuranceBaseline === targetGarp;
    const promotionOk = promotion?.mode === "auto-patch" && promotion?.requiredVerification === "deployment";
    const platformOk =
      app.platform?.contract === "ghrab-platform-v1" &&
      app.platform?.platformVersion === "1.1.2" &&
      String(app.platform?.requiredPlatformRange || "").includes("1.1.2");
    const coreNA = app.aiCore?.status === "not-applicable" || !app.aiCore;
    const coreOk = coreNA || (
      Boolean(app.aiCore?.coreVersion) &&
      app.aiCore?.conformancePassed === true &&
      (!ready || ready.status === "ready" || ready.conformancePassed === true)
    );
    const sourceOk = source == null || source.ok === true || ["deployment", "repository"].includes(source.verification);
    const manualOk = Boolean(app.manualUrl);
    const checks = [garpOk, promotionOk, platformOk, coreOk, sourceOk, manualOk];
    return {
      promotion, ready, source, targetGarp, garpOk, promotionOk, platformOk,
      coreNA, coreOk, sourceOk, manualOk,
      passed: checks.filter(Boolean).length,
      total: checks.length,
      ok: checks.every(Boolean),
    };
  }

  function render() {
    const prior = stored();
    let garpPass = 0, promotionPass = 0, platformPass = 0, corePass = 0, coreScope = 0;
    body.replaceChildren();

    for (const app of ctx.apps) {
      const e = evaluate(app);
      garpPass += e.garpOk ? 1 : 0;
      promotionPass += e.promotionOk ? 1 : 0;
      platformPass += e.platformOk ? 1 : 0;
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
      garp.append(chip(garpLabel(e.promotion?.assuranceBaseline), e.garpOk ? "ok" : "error"));

      const promotion = document.createElement("td");
      promotion.append(chip(
        e.promotion?.mode === "auto-patch" ? "Auto Patch" : G.t("Ruční", "Manual"),
        e.promotionOk ? "ok" : "warn",
      ));

      const platform = document.createElement("td");
      platform.append(chip(app.platform?.platformVersion ? `v${app.platform.platformVersion}` : "—", e.platformOk ? "ok" : "error"));

      const core = document.createElement("td");
      core.append(chip(
        e.coreNA ? G.t("Nevyužívá", "N/A") : app.aiCore?.coreVersion ? `Core ${app.aiCore.coreVersion}` : G.t("Chybí", "Missing"),
        e.coreOk ? (e.coreNA ? "neutral" : "ok") : "error",
      ));

      const sourceManual = document.createElement("td");
      const sourceText = e.source?.verification === "deployment"
        ? G.t("živý manifest", "live manifest")
        : e.source?.verification === "repository"
          ? G.t("GitHub zdroj", "GitHub source")
          : e.source?.verification === "snapshot"
            ? G.t("jen snapshot", "snapshot only")
            : G.t("ověří build", "build verifies");
      sourceManual.append(
        chip(sourceText, e.sourceOk ? "ok" : "warn"),
        document.createTextNode(" "),
        chip(e.manualOk ? G.t("manuál ano", "manual yes") : G.t("manuál chybí", "manual missing"), e.manualOk ? "ok" : "error"),
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
        stamp.className = `developer-last-test ${prior[app.id].ok ? "ok" : "error"}`;
        stamp.textContent = `${prior[app.id].ok ? "✓" : "!"} ${prior[app.id].passed}/${prior[app.id].total} · ${new Date(prior[app.id].at).toLocaleString(document.documentElement.lang === "en" ? "en-GB" : "cs-CZ")}`;
        test.append(stamp);
      }

      tr.append(name, garp, promotion, platform, core, sourceManual, test);
      body.append(tr);
    }

    summary.replaceChildren(
      metric(`${garpPass}/${ctx.apps.length}`, "GARP aktuální", "GARP current"),
      metric(`${promotionPass}/${ctx.apps.length}`, "Safe Promotion", "Safe Promotion"),
      metric(`${platformPass}/${ctx.apps.length}`, "Platform 1.1.2", "Platform 1.1.2"),
      metric(`${corePass}/${coreScope}`, "AI Core v rozsahu", "AI Core in scope"),
    );
    note.textContent = G.t(
      `Aktuální baseline podle release politiky: ${garpLabel(expectedGarp(ctx.policy))}. Ruční kontrola ověřuje integrační kontrakty Studia; repozitářové GARP/P5/N5 testy zůstávají autoritativní release bránou.`,
      `Current baseline from the release policy: ${garpLabel(expectedGarp(ctx.policy))}. The manual check validates Studio integration contracts; repository GARP/P5/N5 suites remain the authoritative release gate.`,
    );
  }

  function persist(appId, e) {
    const data = stored();
    data[appId] = { ok: e.ok, passed: e.passed, total: e.total, at: new Date().toISOString() };
    save(data);
  }

  function runOne(appId) {
    const app = ctx.apps.find((item) => item.id === appId);
    if (!app) return;
    const e = evaluate(app);
    persist(app.id, e);
    render();
    G.showToast(e.ok
      ? G.t("Integrační kontrola prošla.", "Integration check passed.")
      : G.t(`Kontrola našla ${e.total - e.passed} problémů.`, `The check found ${e.total - e.passed} issues.`));
  }

  async function runAll() {
    testAll.disabled = true;
    const progress = createTaskProgress({
      title: G.t("Vývojářská kontrola ekosystému", "Ecosystem developer check"),
      description: G.t(
        "Procento roste pouze po skutečně vyhodnocené aplikaci.",
        "The percentage grows only after an application has actually been evaluated.",
      ),
      total: ctx.apps.length,
    });
    let failed = 0;
    for (let index = 0; index < ctx.apps.length; index += 1) {
      const app = ctx.apps[index];
      progress.update(index, G.localised(app.name), G.t("Ověřuji integrační kontrakty…", "Checking integration contracts…"));
      const e = evaluate(app);
      persist(app.id, e);
      failed += e.ok ? 0 : 1;
      progress.update(index + 1, G.localised(app.name), e.ok ? G.t("Kontrola prošla.", "Check passed.") : G.t("Vyžaduje pozornost.", "Requires attention."));
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    render();
    progress.finish({
      failed,
      message: failed
        ? G.t(`${failed} aplikací vyžaduje pozornost.`, `${failed} applications require attention.`)
        : G.t("Všechny aplikace prošly integrační kontrolou Studia.", "All applications passed the Studio integration check."),
    });
    testAll.disabled = false;
  }

  async function init() {
    const [apps, policy, readiness, report] = await Promise.all([
      G.loadApps(),
      loadJson("../config/release-promotion-policy.json"),
      G.loadAiReadiness(),
      G.loadSyncReport(),
    ]);
    ctx = {
      apps,
      policy,
      promotions: mapBy(policy.applications),
      readiness: mapBy(readiness?.applications, "appId"),
      sources: mapBy(report?.sources),
    };
    render();
  }

  testAll.addEventListener("click", runAll);
  document.addEventListener("ghrab:language", render);
  init().catch((error) => {
    note.className = "notice sync-error";
    note.textContent = G.t(
      `Vývojářský přehled se nepodařilo načíst: ${error.message}`,
      `Developer overview could not be loaded: ${error.message}`,
    );
  });
}
