import {
  buildImpactReport,
  periodOfDate,
  safeEvent,
  safeStatistics,
} from "../shared/safe-export.js";

await window.GHRAB.accessReady;
if (window.GHRAB.isAdmin()) {
  const G = window.GHRAB;
  const $ = (selector) => document.querySelector(selector);
  const SETTINGS_KEY = "ghrab.report.settings.v2";
  const IMPORTS_KEY = "ghrab.report.imports.v1";
  const APP_ORDER = [
    "generator",
    "differentiator",
    "ludus",
    "correspondence",
    "essay-evaluator",
  ];
  const APP_NAMES = {
    generator: "Generátor testů",
    differentiator: "Diferenciátor",
    ludus: "LUDUS",
    correspondence: "Korespondenční asistent",
    "essay-evaluator": "Hodnotitel slohů",
  };
  const OUTPUT_LABELS = {
    "test-package": "testové balíčky",
    game: "hry",
    "content-pack": "obsahové balíčky",
    "class-quiz": "třídní soutěže",
    "lesson-pack": "lesson packy",
    "worksheet-variant": "varianty materiálů",
    "incoming-analysis": "zpracované příchozí e-maily",
    "reply-draft": "návrhy odpovědí",
    "outgoing-email": "nové e-maily",
    "essay-evaluation": "vyhodnocené slohy",
  };
  const REPORT_W = 1240;
  const REPORT_H = 1754;
  let apps = [];
  let currentView = null;
  let renderToken = 0;
  const images = {};

  function parse(key, fallback) {
    try {
      return JSON.parse(G.safeGetItem(key) || JSON.stringify(fallback));
    } catch {
      return fallback;
    }
  }
  function getSettings() {
    return parse(SETTINGS_KEY, {});
  }
  function saveSettings() {
    const data = {
      title: $("#report-title").value.trim(),
      from: $("#report-from").value,
      to: $("#report-to").value,
      includeLocal: $("#report-include-local").checked,
    };
    G.safeSetJson(SETTINGS_KEY, data, { silent: true });
    return data;
  }
  function getImports() {
    const value = parse(IMPORTS_KEY, []);
    return Array.isArray(value) ? value : [];
  }
  function saveImports(value) {
    return G.safeSetJson(IMPORTS_KEY, value.slice(-240));
  }
  function duration(seconds) {
    const total = Math.max(0, Math.round(Number(seconds || 0)));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    if (hours) return `${hours} h ${String(minutes).padStart(2, "0")} min`;
    if (minutes) return `${minutes} min`;
    return `${total} s`;
  }
  function percent(value, digits = 1) {
    return `${(Math.max(0, Number(value || 0)) * 100).toFixed(digits).replace(".", ",")} %`;
  }
  function formatDate(value) {
    const date = new Date(`${value}T12:00:00`);
    return Number.isNaN(date.getTime())
      ? String(value || "")
      : date.toLocaleDateString("cs-CZ");
  }
  function mergeLaunches(target, source = {}) {
    for (const [id, item] of Object.entries(source || {})) {
      const current = target[id] || {
        count: 0,
        lastOpened: null,
        activeSeconds: 0,
        activeSessions: 0,
        lastActiveAt: null,
      };
      current.count += Math.max(0, Number(item?.count || 0));
      current.activeSeconds += Math.max(0, Number(item?.activeSeconds || 0));
      current.activeSessions += Math.max(0, Number(item?.activeSessions || 0));
      if (
        item?.lastOpened &&
        (!current.lastOpened ||
          Date.parse(item.lastOpened) > Date.parse(current.lastOpened))
      )
        current.lastOpened = item.lastOpened;
      if (
        item?.lastActiveAt &&
        (!current.lastActiveAt ||
          Date.parse(item.lastActiveAt) > Date.parse(current.lastActiveAt))
      )
        current.lastActiveAt = item.lastActiveAt;
      target[id] = current;
    }
  }
  function periodInRange(period, settings) {
    if (!period) return true;
    const from = String(settings.from || "").slice(0, 7);
    const to = String(settings.to || "").slice(0, 7);
    return (!from || period >= from) && (!to || period <= to);
  }
  function dateInRange(value, settings) {
    const time = Date.parse(value || "");
    if (!Number.isFinite(time)) return false;
    const from = settings.from
      ? new Date(`${settings.from}T00:00:00`).getTime()
      : -Infinity;
    const to = settings.to
      ? new Date(`${settings.to}T23:59:59.999`).getTime()
      : Infinity;
    return time >= from && time <= to;
  }
  function localLaunchesForRange(rawLaunches, settings) {
    const output = {};
    for (const [id, item] of Object.entries(rawLaunches || {})) {
      if (
        item?.monthly &&
        typeof item.monthly === "object" &&
        Object.keys(item.monthly).length
      ) {
        for (const [period, bucket] of Object.entries(item.monthly))
          if (periodInRange(period, settings))
            mergeLaunches(output, { [id]: bucket });
      } else if (dateInRange(item?.lastOpened || item?.lastActiveAt, settings))
        mergeLaunches(output, { [id]: item });
    }
    return output;
  }
  function normaliseSummary(payload) {
    if (!payload || typeof payload !== "object")
      throw new Error("Neplatný JSON soubor.");
    const summarySchemas = [
      "ghrab-pilot-summary-v8-safe",
      "ghrab-pilot-summary-v7-safe",
      "ghrab-pilot-summary-v6-safe",
      "ghrab-pilot-summary-v5-safe",
      "ghrab-pilot-summary-v4-safe",
    ];
    const impactSchemas = [
      "ghrab-impact-report-v6-safe",
      "ghrab-impact-report-v5-safe",
      "ghrab-impact-report-v4-safe",
      "ghrab-impact-report-v3-safe",
    ];
    if (summarySchemas.includes(payload.schema)) {
      return {
        schema: payload.schema,
        exportedAt: payload.exportedAt || new Date().toISOString(),
        portalVersion: payload.portalVersion || "",
        sourceId: String(payload.sourceId || ""),
        period: String(payload.period || periodOfDate(payload.exportedAt)),
        launches: payload.launches || {},
        events: Array.isArray(payload.events)
          ? payload.events.map(safeEvent)
          : [],
        totals: payload.totals || {},
      };
    }
    if (impactSchemas.includes(payload.schema) && payload.statistics) {
      return {
        schema: payload.schema,
        exportedAt: payload.exportedAt || new Date().toISOString(),
        portalVersion: payload.portalVersion || "",
        sourceId: String(payload.sourceId || ""),
        period: String(payload.period || periodOfDate(payload.exportedAt)),
        launches: payload.statistics.launchCounts || {},
        events: Array.isArray(payload.statistics.events)
          ? payload.statistics.events.map(safeEvent)
          : [],
        totals: { materials: payload.statistics.materialCount || 0 },
      };
    }
    throw new Error("Soubor není anonymní souhrn AI Studia.");
  }
  function importIdentity(summary) {
    if (summary.sourceId && summary.period)
      return `source:${summary.sourceId}|period:${summary.period}`;
    return `legacy:${JSON.stringify({ schema: summary.schema, exportedAt: summary.exportedAt, portalVersion: summary.portalVersion, totals: summary.totals, launches: summary.launches }).slice(0, 5000)}`;
  }
  function dataset(launches, events, workspace = []) {
    const result = safeStatistics({ launches, events, workspace });
    const rows = APP_ORDER.map((id) => {
      const launch = result.launchCounts[id] || {};
      const output = result.appOutputs[id] || {
        attempted: 0,
        successful: 0,
        failed: 0,
        cancelled: 0,
        events: 0,
        kinds: {},
      };
      const completed = output.successful + output.failed;
      return {
        id,
        name: apps.find((app) => app.id === id)?.name?.cs || APP_NAMES[id],
        activeSeconds: Number(launch.activeSeconds || 0),
        launches: Number(launch.count || 0),
        attempted: Number(output.attempted || 0),
        successful: Number(output.successful || 0),
        failed: Number(output.failed || 0),
        cancelled: Number(output.cancelled || 0),
        outputs: completed,
        successRate: completed ? output.successful / completed : 0,
        kinds: output.kinds || {},
      };
    });
    return {
      ...result,
      rows,
      outputs: result.outputSuccess + result.outputErrors,
    };
  }
  function buildView(settings = saveSettings()) {
    const localLaunches = localLaunchesForRange(G.getLaunches(), settings);
    const localEvents = G.getPilotEvents().filter((event) =>
      dateInRange(event.at, settings),
    );
    const localWorkspace = G.getWorkspace().filter((material) =>
      dateInRange(
        material?.provenance?.updatedAt ||
          material?.provenance?.createdAt ||
          material?.updatedAt ||
          material?.createdAt,
        settings,
      ),
    );
    const selectedImports = getImports().filter((item) =>
      periodInRange(item.period || periodOfDate(item.exportedAt), settings),
    );
    const importedLaunches = {};
    const importedEvents = [];
    let importedMaterials = 0;
    for (const item of selectedImports) {
      mergeLaunches(importedLaunches, item.launches);
      importedEvents.push(...(item.events || []));
      importedMaterials += Math.max(0, Number(item.totals?.materials || 0));
    }
    const local = dataset(localLaunches, localEvents, localWorkspace);
    const imported = dataset(importedLaunches, importedEvents, []);
    imported.materialCount = importedMaterials;
    const totalLaunches = {};
    const totalEvents = [...importedEvents];
    let totalWorkspace = [];
    mergeLaunches(totalLaunches, importedLaunches);
    if (settings.includeLocal) {
      mergeLaunches(totalLaunches, localLaunches);
      totalEvents.push(...localEvents);
      totalWorkspace = localWorkspace;
    }
    const total = dataset(totalLaunches, totalEvents, totalWorkspace);
    total.materialCount += importedMaterials;
    const test = dataset(
      localLaunchesForRange(G.getTestLaunches(), settings),
      G.getTestPilotEvents().filter((event) => dateInRange(event.at, settings)),
      [],
    );
    return {
      settings,
      local,
      imported,
      total,
      test,
      importCount: selectedImports.length,
      selectedImports,
      totalImports: getImports().length,
      totalLaunches,
      totalEvents,
      totalWorkspace,
      importedMaterials,
    };
  }
  function textEl(tag, text, className) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    element.textContent = text;
    return element;
  }
  function sourceCard(title, data, subtitle) {
    const card = document.createElement("article");
    card.className = "source-summary-card";
    card.append(
      textEl("strong", title),
      textEl("b", duration(data.activeSeconds)),
      textEl("span", `${data.launchCount} spuštění · ${data.outputs} výstupů`),
      textEl("small", subtitle),
    );
    return card;
  }
  function renderSources(view) {
    $("#report-source-summary").replaceChildren(
      sourceCard(
        "Moje místní data",
        view.local,
        view.settings.includeLocal
          ? "zahrnuta do celku"
          : "nezahrnuta do celku",
      ),
      sourceCard(
        "Kolegové",
        view.imported,
        `${view.importCount} anonymních souhrnů`,
      ),
      sourceCard(
        "Celkem",
        view.total,
        view.settings.includeLocal
          ? "místní + importovaná data"
          : "pouze importovaná data",
      ),
    );
    $("#report-test-status").textContent =
      view.test.launchCount || view.test.outputs || view.test.activeSeconds
        ? `Testovací data správce: ${view.test.launchCount} spuštění, ${duration(view.test.activeSeconds)}, ${view.test.outputs} dokončených výstupů. Do reportu nejsou zahrnuta.`
        : "Testovací data správce jsou oddělená a do reportu se nezapočítávají.";
  }
  function renderImports(view) {
    const host = $("#report-import-list");
    if (!getImports().length) {
      host.innerHTML =
        '<div class="empty-state">Zatím nejsou načtené žádné souhrny od kolegů.</div>';
      return;
    }
    host.replaceChildren(
      ...getImports()
        .slice()
        .sort((a, b) => String(b.period).localeCompare(String(a.period)))
        .map((item) => {
          const active = Object.values(item.launches || {}).reduce(
            (sum, launch) => sum + Number(launch?.activeSeconds || 0),
            0,
          );
          const data = safeStatistics({
            launches: item.launches || {},
            events: item.events || [],
          });
          const row = document.createElement("div");
          row.className = "report-event-row";
          row.append(
            textEl(
              "span",
              `${item.period || "bez období"} · v${item.portalVersion || "—"}`,
            ),
            textEl(
              "strong",
              `${duration(active)} · ${data.outputSuccess + data.outputErrors} výstupů`,
            ),
          );
          return row;
        }),
    );
  }
  function renderOutputDetails(view) {
    const host = $("#report-output-details");
    const rows = view.total.rows.filter(
      (row) => row.attempted || row.launches || row.activeSeconds,
    );
    if (!rows.length) {
      host.innerHTML =
        '<div class="empty-state">Ve zvoleném období zatím nejsou technická data.</div>';
      return;
    }
    host.replaceChildren(
      ...rows.map((row) => {
        const card = document.createElement("article");
        card.className = "output-detail-card";
        const heading = document.createElement("div");
        heading.append(
          textEl("strong", row.name),
          textEl(
            "span",
            `${duration(row.activeSeconds)} · ${row.launches} spuštění`,
          ),
        );
        card.append(heading);
        const kinds = Object.entries(row.kinds || {});
        if (!kinds.length)
          card.append(textEl("small", "Zatím bez zaznamenaných výstupů."));
        else
          for (const [kind, value] of kinds) {
            const line = document.createElement("p");
            line.append(
              textEl("span", OUTPUT_LABELS[kind] || kind),
              textEl(
                "b",
                `${value.successful} úspěšně · ${value.failed} chybně${value.cancelled ? ` · ${value.cancelled} zrušeno` : ""}`,
              ),
            );
            card.append(line);
          }
        return card;
      }),
    );
  }
  function findings(data) {
    const activeRows = data.rows.filter((row) => row.activeSeconds > 0);
    const outputRows = data.rows.filter((row) => row.outputs > 0);
    const notes = [];
    if (activeRows.length) {
      const top = activeRows
        .slice()
        .sort((a, b) => b.activeSeconds - a.activeSeconds)[0];
      const share = data.activeSeconds
        ? Math.round((top.activeSeconds / data.activeSeconds) * 100)
        : 0;
      notes.push(
        `${top.name} má nejvyšší aktivní využití: ${duration(top.activeSeconds)} (${share} % celkového aktivního času).`,
      );
    }
    if (outputRows.length) {
      const top = outputRows.slice().sort((a, b) => b.outputs - a.outputs)[0];
      notes.push(
        `Nejvíce dokončených výstupů zaznamenal ${top.name}: ${top.outputs} (${top.successful} úspěšně, ${top.failed} chybně).`,
      );
    }
    if (data.outputSuccess + data.outputErrors > 0)
      notes.push(
        `Celková technická úspěšnost dokončených výstupů je ${percent(data.outputSuccessRate)}; zrušené pokusy se do procenta nezapočítávají.`,
      );
    if (!notes.length)
      notes.push(
        "Ve zvoleném období zatím nejsou dostatečná data pro vyhodnocení využití aplikací.",
      );
    return notes.slice(0, 3);
  }

  function loadImage(src) {
    if (images[src]) return images[src];
    images[src] = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
    return images[src];
  }
  function roundRect(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }
  function fitFont(
    ctx,
    text,
    maxWidth,
    start,
    min = 18,
    weight = 700,
    family = "Arial",
  ) {
    let size = start;
    while (size > min) {
      ctx.font = `${weight} ${size}px ${family}`;
      if (ctx.measureText(text).width <= maxWidth) break;
      size -= 1;
    }
    return size;
  }
  function wrapLines(ctx, text, maxWidth, maxLines = 4) {
    const words = String(text).split(/\s+/);
    const lines = [];
    let line = "";
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = word;
        if (lines.length >= maxLines - 1) break;
      } else line = test;
    }
    if (line && lines.length < maxLines) lines.push(line);
    const consumed = lines.join(" ").split(/\s+/).length;
    if (consumed < words.length && lines.length) {
      let last = lines[lines.length - 1];
      while (ctx.measureText(`${last}…`).width > maxWidth && last.length)
        last = last.slice(0, -1);
      lines[lines.length - 1] = `${last.trim()}…`;
    }
    return lines;
  }
  function drawWrapped(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
    const lines = wrapLines(ctx, text, maxWidth, maxLines);
    lines.forEach((line, index) =>
      ctx.fillText(line, x, y + index * lineHeight),
    );
    return lines.length;
  }
  function cropBounds(img) {
    if (img.__crop) return img.__crop;
    const c = document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const cx = c.getContext("2d", { willReadFrequently: true });
    cx.drawImage(img, 0, 0);
    const data = cx.getImageData(0, 0, c.width, c.height).data;
    let minX = c.width,
      minY = c.height,
      maxX = 0,
      maxY = 0;
    for (let y = 0; y < c.height; y += 2)
      for (let x = 0; x < c.width; x += 2) {
        const i = (y * c.width + x) * 4;
        if (
          data[i + 3] > 15 &&
          (data[i] < 240 || data[i + 1] < 240 || data[i + 2] < 240)
        ) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    img.__crop =
      minX <= maxX
        ? { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 }
        : { x: 0, y: 0, w: c.width, h: c.height };
    return img.__crop;
  }
  function drawContain(
    ctx,
    img,
    x,
    y,
    w,
    h,
    { crop = false, mono = false } = {},
  ) {
    const source = crop
      ? cropBounds(img)
      : { x: 0, y: 0, w: img.naturalWidth, h: img.naturalHeight };
    const ratio = Math.min(w / source.w, h / source.h);
    const dw = source.w * ratio,
      dh = source.h * ratio;
    ctx.save();
    if (mono) ctx.filter = "grayscale(1) contrast(1.15)";
    ctx.drawImage(
      img,
      source.x,
      source.y,
      source.w,
      source.h,
      x + (w - dw) / 2,
      y + (h - dh) / 2,
      dw,
      dh,
    );
    ctx.restore();
  }
  function drawMetricCard(ctx, x, y, w, h, label, value, code, palette) {
    ctx.fillStyle = palette.card;
    ctx.strokeStyle = palette.line;
    ctx.lineWidth = 2;
    roundRect(ctx, x, y, w, h, 20);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = palette.blue;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x + w / 2, y + 47, 28, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = palette.blue;
    ctx.font = "700 17px Arial";
    ctx.textAlign = "center";
    ctx.fillText(code, x + w / 2, y + 53);
    ctx.fillStyle = palette.ink;
    ctx.font = "700 21px Arial";
    drawWrapped(ctx, label, x + w / 2, y + 102, w - 34, 25, 2);
    const size = fitFont(ctx, value, w - 28, 43, 27, 800);
    ctx.font = `800 ${size}px Arial`;
    ctx.fillStyle = palette.navy;
    ctx.fillText(value, x + w / 2, y + 160);
    ctx.textAlign = "left";
  }
  async function renderReportCanvas(canvas, view, mode = "color") {
    const token = ++renderToken;
    const ctx = canvas.getContext("2d");
    canvas.width = REPORT_W;
    canvas.height = REPORT_H;
    const mono = mode === "mono";
    const palette = mono
      ? {
          bg: "#ffffff",
          ink: "#111111",
          muted: "#555555",
          navy: "#111111",
          blue: "#333333",
          line: "#b5b5b5",
          card: "#f7f7f7",
          header: "#1f1f1f",
          headerText: "#ffffff",
          soft: "#eeeeee",
        }
      : {
          bg: "#ffffff",
          ink: "#112541",
          muted: "#5b6c83",
          navy: "#092e68",
          blue: "#0b63c9",
          line: "#bad3ee",
          card: "#f6faff",
          header: "#07458e",
          headerText: "#ffffff",
          soft: "#eaf3ff",
        };
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, REPORT_W, REPORT_H);
    const [schoolLogo, gateway] = await Promise.all([
      loadImage("../assets/brand/school-logo.png"),
      loadImage("../assets/brand/portal-gateway.png"),
    ]);
    if (token !== renderToken) return;
    const m = 56;
    drawContain(ctx, schoolLogo, m, 38, 150, 150, { crop: true, mono });
    drawContain(ctx, gateway, REPORT_W - m - 156, 34, 156, 156, { mono });
    ctx.fillStyle = palette.navy;
    ctx.textAlign = "left";
    let titleSize = fitFont(
      ctx,
      "Gymnázium Ostrava-Hrabůvka",
      REPORT_W - 420,
      43,
      31,
      800,
      "Arial",
    );
    ctx.font = `800 ${titleSize}px Arial`;
    ctx.fillText("Gymnázium Ostrava-Hrabůvka", 220, 82);
    ctx.fillStyle = palette.blue;
    ctx.font = "700 27px Arial";
    ctx.fillText("AI Studio GHRAB - souhrn pilotního provozu", 220, 125);
    ctx.fillStyle = palette.muted;
    ctx.font = "400 20px Arial";
    const periodLabel =
      view.settings.from && view.settings.to
        ? `${formatDate(view.settings.from)} - ${formatDate(view.settings.to)}`
        : view.settings.title || "Zvolené období";
    ctx.fillText(`Období: ${periodLabel}`, 220, 163);
    ctx.strokeStyle = palette.blue;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(m, 205);
    ctx.lineTo(REPORT_W - m, 205);
    ctx.stroke();

    const kY = 238,
      gap = 16,
      kw = (REPORT_W - 2 * m - 3 * gap) / 4,
      kh = 190;
    drawMetricCard(
      ctx,
      m,
      kY,
      kw,
      kh,
      "Celkový aktivní čas",
      duration(view.total.activeSeconds),
      "ČAS",
      palette,
    );
    drawMetricCard(
      ctx,
      m + kw + gap,
      kY,
      kw,
      kh,
      "Počet spuštění",
      String(view.total.launchCount),
      "▶",
      palette,
    );
    drawMetricCard(
      ctx,
      m + 2 * (kw + gap),
      kY,
      kw,
      kh,
      "Počet výstupů",
      String(view.total.outputs),
      "VÝ",
      palette,
    );
    drawMetricCard(
      ctx,
      m + 3 * (kw + gap),
      kY,
      kw,
      kh,
      "Technická úspěšnost",
      percent(view.total.outputSuccessRate),
      "%",
      palette,
    );

    ctx.fillStyle = palette.navy;
    ctx.font = "800 29px Arial";
    ctx.fillText("Přehled podle aplikací", m, 478);
    ctx.strokeStyle = palette.blue;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(m, 493);
    ctx.lineTo(m + 260, 493);
    ctx.stroke();
    const tx = m,
      ty = 520,
      tw = REPORT_W - 2 * m;
    const cols = [0, 315, 505, 650, 835, 985, tw];
    const rowH = 70;
    ctx.fillStyle = palette.header;
    roundRect(ctx, tx, ty, tw, 60, 12);
    ctx.fill();
    const headers = [
      "Aplikace",
      "Aktivní čas",
      "Spuštění",
      "Výstupy",
      "Úspěšně",
      "Neúspěšně",
    ];
    ctx.fillStyle = palette.headerText;
    ctx.font = "700 18px Arial";
    ctx.textAlign = "center";
    for (let i = 0; i < headers.length; i++)
      ctx.fillText(headers[i], tx + (cols[i] + cols[i + 1]) / 2, ty + 38);
    ctx.textAlign = "left";
    const rows = [
      ...view.total.rows,
      {
        name: "Celkem",
        activeSeconds: view.total.activeSeconds,
        launches: view.total.launchCount,
        outputs: view.total.outputs,
        successful: view.total.outputSuccess,
        failed: view.total.outputErrors,
        total: true,
      },
    ];
    rows.forEach((row, index) => {
      const y = ty + 60 + index * rowH;
      ctx.fillStyle = row.total
        ? palette.soft
        : index % 2
          ? palette.card
          : "#ffffff";
      ctx.fillRect(tx, y, tw, rowH);
      ctx.strokeStyle = palette.line;
      ctx.lineWidth = 1;
      ctx.strokeRect(tx, y, tw, rowH);
      for (let i = 1; i < cols.length - 1; i++) {
        ctx.beginPath();
        ctx.moveTo(tx + cols[i], y);
        ctx.lineTo(tx + cols[i], y + rowH);
        ctx.stroke();
      }
      ctx.fillStyle = palette.ink;
      ctx.font = `${row.total ? "800" : "600"} 19px Arial`;
      ctx.textAlign = "left";
      ctx.fillText(row.name, tx + 20, y + 43);
      const vals = [
        duration(row.activeSeconds),
        String(row.launches),
        String(row.outputs),
        String(row.successful),
        String(row.failed),
      ];
      ctx.textAlign = "center";
      ctx.font = `${row.total ? "800" : "500"} 18px Arial`;
      vals.forEach((v, i) =>
        ctx.fillText(v, tx + (cols[i + 1] + cols[i + 2]) / 2, y + 43),
      );
    });
    ctx.textAlign = "left";

    const lowerY = ty + 60 + rows.length * rowH + 32;
    const boxGap = 24;
    const boxW = (tw - boxGap) / 2;
    const boxH = 350;
    for (const [bx, title] of [
      [tx, "Klíčové poznatky"],
      [tx + boxW + boxGap, "Metodická poznámka"],
    ]) {
      ctx.fillStyle = palette.card;
      ctx.strokeStyle = palette.line;
      ctx.lineWidth = 2;
      roundRect(ctx, bx, lowerY, boxW, boxH, 18);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = palette.navy;
      ctx.font = "800 25px Arial";
      ctx.fillText(title, bx + 28, lowerY + 47);
      ctx.strokeStyle = palette.blue;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(bx + 28, lowerY + 61);
      ctx.lineTo(bx + 230, lowerY + 61);
      ctx.stroke();
    }
    ctx.fillStyle = palette.ink;
    ctx.font = "400 19px Arial";
    let fy = lowerY + 102;
    for (const note of findings(view.total)) {
      ctx.fillStyle = palette.blue;
      ctx.beginPath();
      ctx.arc(tx + 34, fy - 6, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = palette.ink;
      const lines = drawWrapped(ctx, note, tx + 54, fy, boxW - 82, 27, 3);
      fy += lines * 27 + 20;
    }
    const method = `Data jsou anonymizovaná a agregovaná. Aktivní čas zahrnuje pouze viditelnou a aktivní kartu; po 5 minutách bez interakce se měření zastaví. Report sleduje počty technických výstupů, nikoli jejich obsah. ${view.settings.includeLocal ? "Celkový souhrn zahrnuje místní data správce i importované souhrny kolegů." : "Celkový souhrn obsahuje pouze importované souhrny kolegů."} Testovací režim správce je vždy vyloučen.`;
    ctx.fillStyle = palette.ink;
    ctx.font = "400 19px Arial";
    drawWrapped(
      ctx,
      method,
      tx + boxW + boxGap + 28,
      lowerY + 102,
      boxW - 56,
      28,
      8,
    );

    const footY = REPORT_H - 70;
    ctx.strokeStyle = palette.blue;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(m, footY - 28);
    ctx.lineTo(REPORT_W - m, footY - 28);
    ctx.stroke();
    ctx.fillStyle = palette.muted;
    ctx.font = "400 17px Arial";
    ctx.fillText("Autor reportu:", m, footY);
    ctx.fillStyle = palette.navy;
    ctx.font = "700 17px Arial";
    ctx.fillText("Daniel Baláž", m + 118, footY);
    ctx.textAlign = "right";
    ctx.fillText("AI Studio GHRAB", REPORT_W - m, footY);
    ctx.textAlign = "left";
  }
  function bytesFromDataUrl(dataUrl) {
    const binary = atob(dataUrl.split(",")[1]);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }
  function encode(text) {
    return new TextEncoder().encode(text);
  }
  function concat(...parts) {
    const length = parts.reduce((sum, p) => sum + p.length, 0);
    const out = new Uint8Array(length);
    let offset = 0;
    for (const p of parts) {
      out.set(p, offset);
      offset += p.length;
    }
    return out;
  }
  function canvasPdf(canvas) {
    const jpeg = bytesFromDataUrl(canvas.toDataURL("image/jpeg", 0.95));
    const objects = [];
    objects[1] = encode("<< /Type /Catalog /Pages 2 0 R >>");
    objects[2] = encode("<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
    objects[3] = encode(
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.276 841.89] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>",
    );
    objects[4] = concat(
      encode(
        `<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`,
      ),
      jpeg,
      encode("\nendstream"),
    );
    const content = encode("q\n595.276 0 0 841.89 0 0 cm\n/Im0 Do\nQ\n");
    objects[5] = concat(
      encode(`<< /Length ${content.length} >>\nstream\n`),
      content,
      encode("endstream"),
    );
    const header = encode("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
    const parts = [header];
    const offsets = [0];
    let offset = header.length;
    for (let i = 1; i <= 5; i++) {
      offsets[i] = offset;
      const obj = concat(
        encode(`${i} 0 obj\n`),
        objects[i],
        encode("\nendobj\n"),
      );
      parts.push(obj);
      offset += obj.length;
    }
    const xrefOffset = offset;
    let xref = `xref\n0 6\n0000000000 65535 f \n`;
    for (let i = 1; i <= 5; i++)
      xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
    xref += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
    parts.push(encode(xref));
    return new Blob([concat(...parts)], { type: "application/pdf" });
  }
  function downloadBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }
  async function downloadPdf(mode) {
    const canvas = document.createElement("canvas");
    await renderReportCanvas(canvas, currentView, mode);
    downloadBlob(
      canvasPdf(canvas),
      `AI-Studio-GHRAB-report-${mode === "mono" ? "cernobily" : "barevny"}-${new Date().toISOString().slice(0, 10)}.pdf`,
    );
  }
  async function render() {
    const settings = saveSettings();
    currentView = buildView(settings);
    renderSources(currentView);
    renderImports(currentView);
    renderOutputDetails(currentView);
    await renderReportCanvas($("#report-preview"), currentView, "color");
  }
  function setupDefaults() {
    const settings = getSettings();
    const today = new Date();
    const from = new Date(today.getFullYear(), today.getMonth(), 1);
    $("#report-title").value =
      settings.title || "Měsíční souhrn pilotního provozu";
    $("#report-from").value = settings.from || from.toISOString().slice(0, 10);
    $("#report-to").value = settings.to || today.toISOString().slice(0, 10);
    $("#report-include-local").checked = settings.includeLocal !== false;
  }
  function csvCell(value) {
    return `"${String(value ?? "").replaceAll('"', '""')}"`;
  }
  function downloadText(text, name, type = "text/plain") {
    downloadBlob(new Blob([text], { type }), name);
  }

  [
    "#report-title",
    "#report-from",
    "#report-to",
    "#report-include-local",
  ].forEach((selector) =>
    $(selector).addEventListener("input", () => render()),
  );
  $("#report-pdf-color").addEventListener("click", () => downloadPdf("color"));
  $("#report-pdf-mono").addEventListener("click", () => downloadPdf("mono"));
  $("#report-import-files").addEventListener("change", async (event) => {
    const files = [...(event.target.files || [])];
    const imports = getImports();
    let added = 0,
      replaced = 0,
      skipped = 0,
      own = 0;
    for (const file of files) {
      try {
        const summary = normaliseSummary(JSON.parse(await file.text()));
        if (
          summary.sourceId &&
          summary.period &&
          summary.sourceId === G.anonymousSourceId(summary.period)
        ) {
          own++;
          continue;
        }
        const identity = importIdentity(summary);
        const index = imports.findIndex(
          (item) => importIdentity(item) === identity,
        );
        if (index >= 0) {
          if (
            Date.parse(summary.exportedAt) >=
            Date.parse(imports[index].exportedAt || "")
          ) {
            imports[index] = summary;
            replaced++;
          } else skipped++;
        } else {
          imports.push(summary);
          added++;
        }
      } catch {
        skipped++;
      }
    }
    saveImports(imports);
    event.target.value = "";
    $("#report-import-status").textContent =
      `Přidáno: ${added}; aktualizováno: ${replaced}; vlastní souhrny odmítnuty: ${own}; přeskočeno: ${skipped}.`;
    $("#report-import-status").className =
      `form-feedback ${added || replaced ? "success" : "error"}`;
    render();
  });
  $("#report-import-clear").addEventListener("click", () => {
    if (
      confirm(
        "Vymazat všechny importované souhrny od kolegů z tohoto prohlížeče?",
      )
    ) {
      saveImports([]);
      $("#report-import-status").textContent =
        "Importované souhrny byly vymazány.";
      render();
    }
  });
  $("#report-json").addEventListener("click", () => {
    const view = currentView;
    const payload = buildImpactReport({
      portalVersion: G.VERSION,
      settings: view.settings,
      launches: view.totalLaunches,
      events: view.totalEvents,
      workspace: view.totalWorkspace,
      externalMaterialCount: view.importedMaterials,
    });
    G.downloadJson(
      payload,
      `ai-studio-anonymni-report-${new Date().toISOString().slice(0, 10)}.json`,
    );
  });
  $("#report-csv").addEventListener("click", () => {
    const rows = [
      [
        "at",
        "appId",
        "outputKind",
        "attemptedQuantity",
        "successfulQuantity",
        "failedQuantity",
        "cancelledQuantity",
        "outcome",
      ],
      ...currentView.totalEvents
        .filter((event) => safeEvent(event).type === "output")
        .map((event) => {
          const safe = safeEvent(event);
          return [
            safe.at,
            safe.appId || "",
            safe.outputKind || "",
            safe.attemptedQuantity || 0,
            safe.successfulQuantity || 0,
            safe.failedQuantity || 0,
            safe.cancelledQuantity || 0,
            safe.outcome || "",
          ];
        }),
    ];
    downloadText(
      rows.map((row) => row.map(csvCell).join(",")).join("\n"),
      `ai-studio-technicka-data-${new Date().toISOString().slice(0, 10)}.csv`,
      "text/csv;charset=utf-8",
    );
  });
  document.addEventListener("ghrab:language", render);
  setupDefaults();
  apps = await G.loadApps();
  await render();
}
