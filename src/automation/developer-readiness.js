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
  const detailDialog = document.querySelector("#standard-detail-dialog");
  const detailTitle = document.querySelector("#standard-detail-title");
  const detailVersion = document.querySelector("#standard-detail-version");
  const detailSummary = document.querySelector("#standard-detail-summary");
  const detailSections = document.querySelector("#standard-detail-sections");
  const detailSources = document.querySelector("#standard-detail-sources");
  const detailPdf = document.querySelector("#standard-detail-pdf");
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
  const metric = (value, cs, en, detailKey) => {
    const card = document.createElement("article");
    card.className = "automation-kpi ecosystem-metric-card";
    card.dataset.detailKey = detailKey;

    const title = document.createElement("strong");
    title.className = "ecosystem-metric-title";
    title.textContent = G.t(cs, en);

    const metricValue = document.createElement("span");
    metricValue.className = "ecosystem-metric-value";
    metricValue.textContent = value;

    const actions = document.createElement("div");
    actions.className = "ecosystem-metric-actions";

    const detail = document.createElement("button");
    detail.type = "button";
    detail.className = "button compact ghost";
    detail.textContent = G.t("Detail", "Details");
    detail.addEventListener("click", () => openDetail(detailKey));

    const pdf = document.createElement("button");
    pdf.type = "button";
    pdf.className = "button compact secondary ecosystem-pdf-button";
    pdf.textContent = "PDF";
    pdf.setAttribute("aria-label", G.t("Stáhnout kartu jako PDF", "Download card as PDF"));
    pdf.addEventListener("click", () => downloadDetailPdf(detailKey));

    actions.append(detail, pdf);
    card.append(title, metricValue, actions);
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
      return G.t(
        "GitHub · čeká na release",
        "GitHub · awaiting release",
      );
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

    const active = ctx.coreRegistry?.activeRelease;
    const runtime = ctx.runtime?.ai || ctx.readinessRoot?.runtime || {};
    summary.replaceChildren(
      metric(
        `${healthy}/${ctx.apps.length}`,
        "Stav ekosystému",
        "Ecosystem status",
        "ecosystem",
      ),
      metric(
        `${garpPass}/${ctx.apps.length}`,
        "GARP baseline",
        "GARP baseline",
        "garp",
      ),
      metric(
        `${promotionPass}/${ctx.apps.length}`,
        "Safe Promotion",
        "Safe Promotion",
        "safePromotion",
      ),
      metric(
        `${platformPass}/${ctx.apps.length}`,
        "GHRAB Platform",
        "GHRAB Platform",
        "platform",
      ),
      metric(
        `${corePass}/${coreScope}`,
        "AI Core",
        "AI Core",
        "aiCore",
      ),
      metric(
        `${sourcePass}/${ctx.apps.length}`,
        "Ověření zdrojů",
        "Source verification",
        "sources",
      ),
      metric(
        `${manualPass}/${ctx.apps.length}`,
        "Manuály",
        "Manuals",
        "manuals",
      ),
    );
    ctx.liveDetail = {
      ecosystem: `Studio v${document.documentElement.dataset.ghrabAppVersion || "—"} · ${healthy}/${ctx.apps.length}`,
      garp: garpLabel(expectedGarp(ctx.policy)),
      safePromotion: `${promotionPass}/${ctx.apps.length} · auto-patch + deployment verification`,
      platform: `GHRAB Platform ${ctx.apps[0]?.platform?.platformVersion || "—"}`,
      aiCore: active
        ? `AI Core ${active.coreVersion} · ${corePass}/${coreScope} · ${runtime.defaultMode || "—"}`
        : `${corePass}/${coreScope}`,
      sources:
        `${sourcePass}/${ctx.apps.length} · ` +
        G.t("poslední plná kontrola", "last full check") +
        ` ${formatTime(ctx.report?.lastFullSourceVerifiedAt || ctx.report?.generatedAt)}`,
      manuals: G.t(
        `${manualPass}/${ctx.apps.length} dostupných`,
        `${manualPass}/${ctx.apps.length} available`,
      ),
    };

    note.textContent = G.t(
      `GARP baseline: ${garpLabel(expectedGarp(ctx.policy))}. Tato tabulka je jediný provozní přehled ve Správě; repozitářové GARP/P5/N5 testy zůstávají autoritativní release bránou.`,
      `GARP baseline: ${garpLabel(expectedGarp(ctx.policy))}. This table is the single operational status overview in Administration; repository GARP/P5/N5 suites remain the authoritative release gate.`,
    );
  }

  function localised(value) {
    if (typeof value === "string") return value;
    return document.documentElement.lang === "en"
      ? value?.en || value?.cs || ""
      : value?.cs || value?.en || "";
  }

  function detailItem(key) {
    return ctx?.catalog?.items?.[key] || null;
  }

  function openDetail(key) {
    const item = detailItem(key);
    if (!item || !detailDialog) return;
    ctx.activeDetailKey = key;
    detailTitle.textContent = localised(item.title);
    detailVersion.textContent = ctx.liveDetail?.[key] || localised(item.version);
    detailSummary.textContent = localised(item.summary);
    detailSections.replaceChildren(
      ...(item.sections || []).map((section) => {
        const article = document.createElement("article");
        article.className = "standard-detail-section";
        const h3 = document.createElement("h3");
        h3.textContent = localised(section.title);
        const ul = document.createElement("ul");
        for (const point of section.points || []) {
          const li = document.createElement("li");
          li.textContent = localised(point);
          ul.append(li);
        }
        article.append(h3, ul);
        return article;
      }),
    );
    detailSources.replaceChildren(
      ...(item.sources || []).map((source) => {
        const li = document.createElement("li");
        li.textContent = source;
        return li;
      }),
    );
    detailDialog.showModal();
  }

  function printDetail() {
    const key = ctx?.activeDetailKey;
    const item = detailItem(key);
    if (!item) return;
    const printWindow = window.open("", "_blank", "noopener,noreferrer");
    if (!printWindow) {
      G.showToast(
        G.t(
          "Pro tisk PDF povolte dočasné okno pro tento web.",
          "Allow the temporary print window for this site.",
        ),
      );
      return;
    }

    const doc = printWindow.document;
    const title = localised(item.title);
    const version = ctx.liveDetail?.[key] || localised(item.version);

    doc.documentElement.lang = document.documentElement.lang || "cs";
    doc.title = `${title} - AI Studio GHRAB`;
    doc.head.replaceChildren();
    doc.body.replaceChildren();

    const meta = doc.createElement("meta");
    meta.charset = "utf-8";
    const style = doc.createElement("style");
    style.textContent =
      "body{font-family:Arial,sans-serif;max-width:820px;margin:40px auto;color:#111;line-height:1.5}" +
      "h1{margin-bottom:4px}h2{margin-top:28px;font-size:18px}" +
      ".version{font-weight:700;color:#245}.summary{font-size:17px}" +
      ".sources{margin-top:32px;border-top:1px solid #bbb;padding-top:18px}" +
      "@media print{body{margin:0;max-width:none}}";
    doc.head.append(meta, style);

    const heading = doc.createElement("h1");
    heading.textContent = title;
    const versionNode = doc.createElement("p");
    versionNode.className = "version";
    versionNode.textContent = version;
    const summaryNode = doc.createElement("p");
    summaryNode.className = "summary";
    summaryNode.textContent = localised(item.summary);
    doc.body.append(heading, versionNode, summaryNode);

    for (const section of item.sections || []) {
      const sectionNode = doc.createElement("section");
      const sectionTitle = doc.createElement("h2");
      sectionTitle.textContent = localised(section.title);
      const list = doc.createElement("ul");
      for (const point of section.points || []) {
        const li = doc.createElement("li");
        li.textContent = localised(point);
        list.append(li);
      }
      sectionNode.append(sectionTitle, list);
      doc.body.append(sectionNode);
    }

    const sourcesSection = doc.createElement("section");
    sourcesSection.className = "sources";
    const sourcesTitle = doc.createElement("h2");
    sourcesTitle.textContent = G.t(
      "Autoritativní zdroje",
      "Authoritative sources",
    );
    const sourcesList = doc.createElement("ul");
    for (const source of item.sources || []) {
      const li = doc.createElement("li");
      li.textContent = source;
      sourcesList.append(li);
    }
    const footer = doc.createElement("p");
    footer.textContent =
      `AI Studio GHRAB · technický přehled · ${new Date().toLocaleDateString(
        document.documentElement.lang === "en" ? "en-GB" : "cs-CZ",
      )}`;
    sourcesSection.append(sourcesTitle, sourcesList, footer);
    doc.body.append(sourcesSection);

    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
  }

  detailPdf?.addEventListener("click", printDetail);

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
    const [apps, policy, readiness, report, coreRegistry, runtime, catalog] =
      await Promise.all([
        G.loadApps(),
        loadJson("../config/developer-readiness.json"),
        G.loadAiReadiness(),
        G.loadSyncReport(),
        G.loadAiCoreRegistry(),
        G.loadAiRuntime(),
        loadJson("../config/standards-catalog.json"),
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
      catalog,
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
