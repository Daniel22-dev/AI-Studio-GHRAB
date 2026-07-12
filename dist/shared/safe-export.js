const SAFE_EVENT_FIELDS = ['at', 'type', 'appId', 'result', 'outcome', 'reportedMinutes', 'estimatedMinutes', 'rating'];

export function normaliseMinutes(event = {}) {
  const legacy = Number(event.minutesSaved || 0);
  const reported = Number(event.reportedMinutes ?? (event.type === 'session' ? legacy : 0));
  const estimated = Number(event.estimatedMinutes ?? (event.type === 'session' ? 0 : legacy));
  return {
    reportedMinutes: Number.isFinite(reported) && reported > 0 ? reported : 0,
    estimatedMinutes: Number.isFinite(estimated) && estimated > 0 ? estimated : 0
  };
}

export function safeEvent(event = {}) {
  const minutes = normaliseMinutes(event);
  const source = {
    ...event,
    reportedMinutes: minutes.reportedMinutes || undefined,
    estimatedMinutes: minutes.estimatedMinutes || undefined,
    outcome: event.outcome ?? event.result
  };
  const output = {};
  for (const key of SAFE_EVENT_FIELDS) {
    if (source[key] !== undefined && source[key] !== null && source[key] !== '') output[key] = source[key];
  }
  delete output.result;
  return output;
}

export function safeLaunches(launches = {}) {
  const output = {};
  for (const [id, item] of Object.entries(launches || {})) {
    output[id] = {
      count: Number(item?.count || 0),
      lastOpened: item?.lastOpened || null
    };
  }
  return output;
}

export function aggregateEvents(events = []) {
  const eventCounts = {};
  const appEventCounts = {};
  let reportedMinutes = 0;
  let estimatedMinutes = 0;
  let ratingSum = 0;
  let ratingCount = 0;

  for (const event of events) {
    const type = event?.type || 'unknown';
    eventCounts[type] = (eventCounts[type] || 0) + 1;
    if (event?.appId) appEventCounts[event.appId] = (appEventCounts[event.appId] || 0) + 1;
    const minutes = normaliseMinutes(event);
    reportedMinutes += minutes.reportedMinutes;
    estimatedMinutes += minutes.estimatedMinutes;
    const rating = Number(event?.rating || 0);
    if (rating > 0) {
      ratingSum += rating;
      ratingCount += 1;
    }
  }

  return {
    eventCounts,
    appEventCounts,
    reportedMinutes,
    estimatedMinutes,
    averageRating: ratingCount ? ratingSum / ratingCount : 0
  };
}

export function safeStatistics({ launches = {}, events = [], workspace = [] } = {}) {
  const launchCounts = safeLaunches(launches);
  const launchCount = Object.values(launchCounts).reduce((sum, item) => sum + Number(item.count || 0), 0);
  const aggregates = aggregateEvents(events);
  const qualityCounts = (workspace || []).reduce((acc, material) => {
    const key = material?.quality?.status || 'ai-draft';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return {
    launchCount,
    handoffs: Number(aggregates.eventCounts.handoff || 0),
    materialCount: Array.isArray(workspace) ? workspace.length : 0,
    reportedMinutes: aggregates.reportedMinutes,
    estimatedMinutes: aggregates.estimatedMinutes,
    averageRating: aggregates.averageRating,
    qualityCounts,
    launchCounts,
    eventCounts: aggregates.eventCounts,
    appEventCounts: aggregates.appEventCounts,
    events: (events || []).map(safeEvent)
  };
}

export function buildPilotSummary({ portalVersion, currentWeek, launches = {}, events = [], workspace = [] } = {}) {
  const statistics = safeStatistics({ launches, events, workspace });
  return {
    schema: 'ghrab-pilot-summary-v4-safe',
    exportedAt: new Date().toISOString(),
    portalVersion,
    currentWeek: Number(currentWeek || 1),
    launches: statistics.launchCounts,
    events: statistics.events,
    totals: {
      launches: statistics.launchCount,
      materials: statistics.materialCount,
      handoffs: statistics.handoffs,
      reportedMinutes: statistics.reportedMinutes,
      estimatedMinutes: statistics.estimatedMinutes,
      averageRating: statistics.averageRating
    },
    privacy: 'Bez jmen, studentských dat, promptů, názvů materiálů, obsahu materiálů a volných poznámek.'
  };
}

export function buildImpactReport({ portalVersion, settings = {}, launches = {}, events = [], workspace = [], caseCount = 0 } = {}) {
  return {
    schema: 'ghrab-impact-report-v3-safe',
    exportedAt: new Date().toISOString(),
    portalVersion,
    settings: {
      title: String(settings.title || ''),
      from: String(settings.from || ''),
      to: String(settings.to || ''),
      teachers: Number(settings.teachers || 0),
      subjects: Number(settings.subjects || 0)
    },
    statistics: safeStatistics({ launches, events, workspace }),
    cases: { count: Number(caseCount || 0) },
    privacy: 'Bez jmen, studentských dat, promptů, názvů materiálů, obsahu materiálů a volných poznámek.'
  };
}

export function safeExportSelfTest() {
  const poisoned = {
    at: new Date().toISOString(),
    type: 'session',
    appId: 'generator',
    minutesSaved: 9,
    rating: 4,
    result: 'success',
    note: 'TAJNA_POZNAMKA',
    title: 'TAJNY_NAZEV',
    prompt: 'TAJNY_PROMPT',
    material: { content: 'TAJNY_OBSAH' }
  };
  const report = buildPilotSummary({
    portalVersion: 'self-test',
    currentWeek: 1,
    launches: { generator: { count: 1, lastOpened: null } },
    events: [poisoned],
    workspace: [{ title: 'TAJNY_MATERIAL', content: { sourceText: 'TAJNY_TEXT' } }]
  });
  const output = JSON.stringify(report);
  const leakedPoison = /TAJNY|TAJNA/i.test(output);
  const allowedEventKeys = new Set(['at', 'type', 'appId', 'outcome', 'reportedMinutes', 'estimatedMinutes', 'rating']);
  const unsafeEventKey = (report.events || []).some(event => Object.keys(event).some(key => !allowedEventKeys.has(key)));
  return !leakedPoison && !unsafeEventKey;
}
