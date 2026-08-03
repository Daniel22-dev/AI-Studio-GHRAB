const SAFE_EVENT_FIELDS = [
  "at",
  "type",
  "appId",
  "outputKind",
  "outcome",
  "attemptedQuantity",
  "successfulQuantity",
  "failedQuantity",
  "cancelledQuantity",
];

const LEGACY_GENERATION_KIND = "test-package";

function quantity(value) {
  return Math.max(0, Math.min(10000, Math.round(Number(value || 0))));
}

export function periodOfDate(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function safeEvent(event = {}) {
  const source = { ...event, outcome: event.outcome ?? event.result };
  if (source.type === "generation") {
    source.appId = source.appId || "generator";
    source.outputKind = source.outputKind || LEGACY_GENERATION_KIND;
    source.attemptedQuantity = source.attemptedQuantity || 1;
    source.successfulQuantity =
      source.successfulQuantity ?? (source.outcome === "success" ? 1 : 0);
    source.failedQuantity =
      source.failedQuantity ?? (source.outcome === "error" ? 1 : 0);
    source.cancelledQuantity =
      source.cancelledQuantity ?? (source.outcome === "cancelled" ? 1 : 0);
  }
  const output = {};
  for (const key of SAFE_EVENT_FIELDS) {
    if (source[key] !== undefined && source[key] !== null && source[key] !== "")
      output[key] = source[key];
  }
  if (output.type === "output" || output.type === "generation") {
    output.type = "output";
    output.outputKind = String(output.outputKind || LEGACY_GENERATION_KIND);
    output.attemptedQuantity = quantity(output.attemptedQuantity);
    output.successfulQuantity = quantity(output.successfulQuantity);
    output.failedQuantity = quantity(output.failedQuantity);
    output.cancelledQuantity = quantity(output.cancelledQuantity);
    const accounted =
      output.successfulQuantity +
      output.failedQuantity +
      output.cancelledQuantity;
    if (!output.attemptedQuantity) output.attemptedQuantity = accounted || 1;
    if (accounted > output.attemptedQuantity)
      output.attemptedQuantity = accounted;
    if (
      !["success", "error", "partial", "cancelled"].includes(output.outcome)
    ) {
      output.outcome =
        output.failedQuantity && output.successfulQuantity
          ? "partial"
          : output.failedQuantity
            ? "error"
            : output.successfulQuantity
              ? "success"
              : "cancelled";
    }
  }
  return output;
}

function safeLaunchItem(item = {}) {
  return {
    count: Math.max(0, Number(item?.count || 0)),
    lastOpened: item?.lastOpened || null,
    activeSeconds: Math.max(0, Number(item?.activeSeconds || 0)),
    activeSessions: Math.max(0, Number(item?.activeSessions || 0)),
    lastActiveAt: item?.lastActiveAt || null,
  };
}

export function safeLaunches(launches = {}) {
  const output = {};
  for (const [id, item] of Object.entries(launches || {}))
    output[id] = safeLaunchItem(item);
  return output;
}

export function safeLaunchesForPeriod(launches = {}, period = periodOfDate()) {
  const output = {};
  for (const [id, item] of Object.entries(launches || {})) {
    const bucket =
      item?.monthly && typeof item.monthly === "object"
        ? item.monthly[period]
        : null;
    output[id] = safeLaunchItem(bucket || {});
  }
  return output;
}

export function filterEventsByPeriod(events = [], period = periodOfDate()) {
  return (events || [])
    .filter((event) => periodOfDate(event?.at) === period)
    .map(safeEvent);
}

export function filterWorkspaceByPeriod(
  workspace = [],
  period = periodOfDate(),
) {
  return (workspace || []).filter((material) => {
    const timestamp =
      material?.provenance?.updatedAt ||
      material?.provenance?.createdAt ||
      material?.updatedAt ||
      material?.createdAt;
    return periodOfDate(timestamp) === period;
  });
}

function emptyOutputBucket() {
  return {
    attempted: 0,
    successful: 0,
    failed: 0,
    cancelled: 0,
    events: 0,
    kinds: {},
  };
}

export function aggregateEvents(events = []) {
  const eventCounts = {};
  const appEventCounts = {};
  const outputs = {
    attempted: 0,
    successful: 0,
    failed: 0,
    cancelled: 0,
    events: 0,
    byApp: {},
  };

  for (const rawEvent of events || []) {
    const event = safeEvent(rawEvent);
    const type = event?.type || "unknown";
    eventCounts[type] = (eventCounts[type] || 0) + 1;
    if (event?.appId)
      appEventCounts[event.appId] = (appEventCounts[event.appId] || 0) + 1;
    if (type !== "output") continue;
    const attempted = quantity(event.attemptedQuantity);
    const successful = quantity(event.successfulQuantity);
    const failed = quantity(event.failedQuantity);
    const cancelled = quantity(event.cancelledQuantity);
    outputs.attempted += attempted;
    outputs.successful += successful;
    outputs.failed += failed;
    outputs.cancelled += cancelled;
    outputs.events += 1;
    const appId = String(event.appId || "unknown");
    const outputKind = String(event.outputKind || "output");
    const app = outputs.byApp[appId] || emptyOutputBucket();
    app.attempted += attempted;
    app.successful += successful;
    app.failed += failed;
    app.cancelled += cancelled;
    app.events += 1;
    const kind = app.kinds[outputKind] || {
      attempted: 0,
      successful: 0,
      failed: 0,
      cancelled: 0,
      events: 0,
    };
    kind.attempted += attempted;
    kind.successful += successful;
    kind.failed += failed;
    kind.cancelled += cancelled;
    kind.events += 1;
    app.kinds[outputKind] = kind;
    outputs.byApp[appId] = app;
  }

  return { eventCounts, appEventCounts, outputs };
}

export function safeStatistics({
  launches = {},
  events = [],
  workspace = [],
} = {}) {
  const launchCounts = safeLaunches(launches);
  const launchCount = Object.values(launchCounts).reduce(
    (sum, item) => sum + Number(item.count || 0),
    0,
  );
  const activeSeconds = Object.values(launchCounts).reduce(
    (sum, item) => sum + Number(item.activeSeconds || 0),
    0,
  );
  const aggregates = aggregateEvents(events);
  const qualityCounts = (workspace || []).reduce((acc, material) => {
    const key = material?.quality?.status || "ai-draft";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const completedOutputs =
    aggregates.outputs.successful + aggregates.outputs.failed;
  const generator = aggregates.outputs.byApp.generator || emptyOutputBucket();

  return {
    launchCount,
    activeSeconds,
    activeHours: activeSeconds / 3600,
    handoffs: Number(aggregates.eventCounts.handoff || 0),
    materialCount: Array.isArray(workspace) ? workspace.length : 0,
    outputAttempts: aggregates.outputs.attempted,
    outputSuccess: aggregates.outputs.successful,
    outputErrors: aggregates.outputs.failed,
    outputCancelled: aggregates.outputs.cancelled,
    outputEventCount: aggregates.outputs.events,
    outputSuccessRate: completedOutputs
      ? aggregates.outputs.successful / completedOutputs
      : 0,
    appOutputs: aggregates.outputs.byApp,
    // Zpětná kompatibilita pro starší části rozhraní.
    generationAttempts: generator.attempted,
    generationSuccess: generator.successful,
    generationErrors: generator.failed,
    generationCancelled: generator.cancelled,
    generationSuccessRate:
      generator.successful + generator.failed
        ? generator.successful / (generator.successful + generator.failed)
        : 0,
    qualityCounts,
    launchCounts,
    eventCounts: aggregates.eventCounts,
    appEventCounts: aggregates.appEventCounts,
    events: (events || []).map(safeEvent),
  };
}

export function buildPilotSummary({
  portalVersion,
  currentWeek,
  currentPhase,
  sourceId = "",
  period = periodOfDate(),
  launches = {},
  events = [],
  workspace = [],
} = {}) {
  const periodLaunches = safeLaunchesForPeriod(launches, period);
  const periodEvents = filterEventsByPeriod(events, period);
  const periodWorkspace = filterWorkspaceByPeriod(workspace, period);
  const statistics = safeStatistics({
    launches: periodLaunches,
    events: periodEvents,
    workspace: periodWorkspace,
  });
  return {
    schema: "ghrab-pilot-summary-v8-safe",
    exportedAt: new Date().toISOString(),
    portalVersion,
    sourceId: String(sourceId || ""),
    period,
    currentPhase: Number(currentPhase || currentWeek || 1),
    launches: statistics.launchCounts,
    events: statistics.events,
    totals: {
      launches: statistics.launchCount,
      activeSeconds: statistics.activeSeconds,
      materials: statistics.materialCount,
      handoffs: statistics.handoffs,
      outputAttempts: statistics.outputAttempts,
      outputSuccess: statistics.outputSuccess,
      outputErrors: statistics.outputErrors,
      outputCancelled: statistics.outputCancelled,
    },
    methodology: {
      scope: `Souhrn obsahuje pouze místní data za kalendářní měsíc ${period}.`,
      activeTime:
        "Počítá se jen viditelná a aktivní karta se zaměřeným oknem. Po 5 minutách bez interakce se měření zastaví; dlouhé prodlevy systému se nezapočítávají.",
      outputs:
        "Výstupy se zapisují přímo v jednotlivých aplikacích jako anonymní technické součty úspěšných, chybných a zrušených položek. Neobsahují jejich obsah.",
      sourceId:
        "Náhodný měsíční identifikátor prohlížeče slouží pouze k nahrazení opakovaně odeslaného souhrnu ze stejného zařízení a měsíce; neobsahuje identitu uživatele.",
    },
    privacy:
      "Bez jmen, e-mailů, studentských dat, promptů, názvů materiálů, obsahu materiálů, klávesových vstupů a volných poznámek.",
  };
}

export function buildImpactReport({
  portalVersion,
  settings = {},
  launches = {},
  events = [],
  workspace = [],
  caseCount = 0,
  externalMaterialCount = 0,
} = {}) {
  const statistics = safeStatistics({ launches, events, workspace });
  statistics.materialCount += Math.max(0, Number(externalMaterialCount || 0));
  return {
    schema: "ghrab-impact-report-v6-safe",
    exportedAt: new Date().toISOString(),
    portalVersion,
    settings: {
      title: String(settings.title || ""),
      from: String(settings.from || ""),
      to: String(settings.to || ""),
      teachers: Number(settings.teachers || 0),
      subjects: Number(settings.subjects || 0),
      includeLocal: settings.includeLocal !== false,
    },
    statistics,
    cases: { count: Number(caseCount || 0) },
    privacy:
      "Bez jmen, e-mailů, studentských dat, promptů, názvů materiálů, obsahu materiálů, klávesových vstupů a volných poznámek.",
  };
}

export function safeExportSelfTest() {
  const period = periodOfDate();
  const poisoned = {
    at: new Date().toISOString(),
    type: "output",
    appId: "generator",
    outputKind: "test-package",
    attemptedQuantity: 1,
    successfulQuantity: 1,
    failedQuantity: 0,
    cancelledQuantity: 0,
    outcome: "success",
    reportedMinutes: 9,
    rating: 4,
    note: "TAJNA_POZNAMKA",
    title: "TAJNY_NAZEV",
    prompt: "TAJNY_PROMPT",
    material: { content: "TAJNY_OBSAH" },
  };
  const report = buildPilotSummary({
    portalVersion: "self-test",
    currentWeek: 1,
    sourceId: "anonymous-test-device",
    period,
    launches: {
      generator: {
        count: 9,
        activeSeconds: 999,
        monthly: {
          [period]: {
            count: 1,
            lastOpened: null,
            activeSeconds: 45,
            activeSessions: 1,
          },
        },
      },
    },
    events: [poisoned],
    workspace: [
      {
        title: "TAJNY_MATERIAL",
        content: { sourceText: "TAJNY_TEXT" },
        provenance: { updatedAt: new Date().toISOString() },
      },
    ],
  });
  const output = JSON.stringify(report);
  const leakedPoison = /TAJNY|TAJNA/i.test(output);
  const allowedEventKeys = new Set(SAFE_EVENT_FIELDS);
  const unsafeEventKey = (report.events || []).some((event) =>
    Object.keys(event).some((key) => !allowedEventKeys.has(key)),
  );
  return (
    !leakedPoison &&
    !unsafeEventKey &&
    report.schema === "ghrab-pilot-summary-v8-safe" &&
    report.launches.generator.activeSeconds === 45 &&
    report.launches.generator.count === 1 &&
    report.totals.outputSuccess === 1
  );
}
