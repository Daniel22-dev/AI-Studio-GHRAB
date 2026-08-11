import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const configDir = path.join(root, "src", "config");
const offline = process.argv.includes("--offline");
let previousFallbackConfirmed = false;
let previousReport = null;
try {
  const [loadedReport, previousGenerated, currentFallback] = await Promise.all([
    readFile(path.join(configDir, "sync-report.json"), "utf8").then(JSON.parse),
    readFile(path.join(configDir, "apps.generated.json"), "utf8"),
    readFile(path.join(configDir, "apps.fallback.json"), "utf8"),
  ]);
  previousReport = loadedReport;
  previousFallbackConfirmed =
    previousReport?.fallbackSnapshotConfirmed === true &&
    previousGenerated === currentFallback;
} catch {}
const generatedAt = new Date().toISOString();
const previousSources = new Map(
  (previousReport?.sources || []).map((source) => [source.id, source]),
);
const sources = JSON.parse(
  await readFile(path.join(configDir, "sources.json"), "utf8"),
);
const fallback = JSON.parse(
  await readFile(path.join(configDir, "apps.fallback.json"), "utf8"),
);
const fallbackById = new Map(fallback.map((app) => [app.id, app]));
const required = [
  "schema",
  "id",
  "name",
  "version",
  "status",
  "description",
  "launchUrl",
  "manualUrl",
  "repository",
  "icon",
  "accent",
];
const semver = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;

function validate(app, expectedId, source) {
  if (!app || typeof app !== "object") throw new Error("manifest není objekt");
  for (const key of required) if (!app[key]) throw new Error(`chybí ${key}`);
  if (app.schema !== "ai-studio-app-manifest-v1")
    throw new Error("neznámé schema");
  if (app.id !== expectedId)
    throw new Error(`id ${app.id} neodpovídá ${expectedId}`);
  if (!semver.test(app.version))
    throw new Error(`neplatná verze ${app.version}`);
  const allowedPrefix = new URL(".", source.url);
  for (const [label, value] of [
    ["launchUrl", app.launchUrl],
    ["manualUrl", app.manualUrl],
  ]) {
    let url;
    try {
      url = new URL(value);
    } catch {
      throw new Error(`${label} není platná URL`);
    }
    if (url.protocol !== "https:") throw new Error(`${label} není HTTPS`);
    if (!url.href.startsWith(allowedPrefix.href))
      throw new Error(
        `${label} musí zůstat pod povoleným prefixem ${allowedPrefix.href}`,
      );
  }
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(app.repository))
    throw new Error("repository musí mít tvar vlastník/repozitář");
  const platform = app.platform;
  if (!platform || typeof platform !== "object")
    throw new Error("chybí platformní metadata P2");
  if (platform.schema !== "ghrab-platform-app-integration-v1" || platform.contract !== "ghrab-platform-v1")
    throw new Error("nepodporovaný platformní kontrakt");
  if (!semver.test(platform.platformVersion || "") || platform.brandVersion !== "1.0.0")
    throw new Error("neplatná verze platformy nebo brandu");
  const themeContractOk = ["ghrab-theme-v1", 1].includes(platform.themeContract);
  const artifactEnvelopeOk = ["ghrab-artifact-envelope-v1", 1].includes(platform.artifactEnvelope);
  if (!themeContractOk || platform.swContract !== 1 || !artifactEnvelopeOk)
    throw new Error("nekompatibilní společné kontrakty P2");
  if (!["ghrab-studio-handoff-v2", 2, "not-applicable"].includes(platform.studioBridge))
    throw new Error("neplatná verze Studio Bridge");
  if (platform.storagePrefix !== `ghrab.${app.id}.`)
    throw new Error("neplatný namespace úložiště");
  if (platform.cacheName !== `ghrab-${app.id}-v${app.version}`)
    throw new Error("neplatný název PWA cache");
  if (app.aiCore != null) {
    const aiCore = app.aiCore;
    if (!aiCore || typeof aiCore !== "object")
      throw new Error("aiCore není objekt");
    if (aiCore.schema !== "ghrab-ai-app-integration-v1")
      throw new Error("aiCore má neznámé schema");
    if (aiCore.status === "not-applicable") {
      if (typeof aiCore.reason !== "string" || !aiCore.reason.trim())
        throw new Error("aiCore.reason chybí pro not-applicable aplikaci");
      for (const forbidden of [
        "coreVersion",
        "contractVersion",
        "serverReady",
        "conformancePassed",
        "operationsManifestUrl",
      ]) {
        if (aiCore[forbidden] != null)
          throw new Error(`aiCore.${forbidden} nesmí být u not-applicable aplikace`);
      }
    } else {
      if (!semver.test(aiCore.coreVersion || ""))
        throw new Error("aiCore.coreVersion není SemVer");
      if (String(aiCore.contractVersion || "") !== "1")
        throw new Error("aiCore.contractVersion není podporována");
      if (typeof aiCore.serverReady !== "boolean")
        throw new Error("aiCore.serverReady není boolean");
      if (typeof aiCore.conformancePassed !== "boolean")
        throw new Error("aiCore.conformancePassed není boolean");
      let operationsUrl;
      try { operationsUrl = new URL(aiCore.operationsManifestUrl); }
      catch { throw new Error("aiCore.operationsManifestUrl není platná URL"); }
      if (operationsUrl.protocol !== "https:")
        throw new Error("aiCore.operationsManifestUrl není HTTPS");
      if (!operationsUrl.href.startsWith(allowedPrefix.href))
        throw new Error("aiCore.operationsManifestUrl musí zůstat pod povoleným prefixem aplikace");
    }
  }
  if (
    !app.name.cs ||
    !app.name.en ||
    !app.description.cs ||
    !app.description.en
  )
    throw new Error("chybí překlad");
  const statusText =
    `${app.status?.cs || ""} ${app.status?.en || ""}`.toLowerCase();
  if (/produk|production/.test(statusText))
    throw new Error(
      "status před schválením školy nesmí deklarovat produkční provoz",
    );
  return app;
}

function validateOperationsManifest(operations, app) {
  if (!operations || typeof operations !== "object")
    throw new Error("ai-operations manifest není objekt");
  if (operations.schema !== "ghrab-ai-operations-v1")
    throw new Error("ai-operations manifest má neznámé schema");
  if (operations.appId !== app.id || operations.appVersion !== app.version)
    throw new Error("ai-operations manifest neodpovídá aplikaci nebo verzi");
  if (
    operations.coreVersion !== app.aiCore.coreVersion ||
    String(operations.contractVersion) !== String(app.aiCore.contractVersion)
  )
    throw new Error("ai-operations manifest neodpovídá Core kontraktu");
  if (!Array.isArray(operations.operations) || !operations.operations.length)
    throw new Error("ai-operations manifest neobsahuje operace");
  const names = new Set();
  for (const operation of operations.operations) {
    if (
      !operation ||
      typeof operation.operation !== "string" ||
      !operation.operation ||
      typeof operation.schemaId !== "string" ||
      !operation.schemaId
    )
      throw new Error("ai-operations manifest obsahuje neplatnou operaci");
    if (names.has(operation.operation))
      throw new Error(`duplicitní AI operace ${operation.operation}`);
    names.add(operation.operation);
  }
  return operations.operations.length;
}

async function fetchManifest(source) {
  if (offline) throw new Error("offline režim");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(source.url, {
      signal: controller.signal,
      headers: { "user-agent": "AI-Studio-GHRAB-registry-sync" },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const app = validate(await response.json(), source.id, source);
    let operationsCount = null;
    if (app.aiCore?.serverReady) {
      const operationsResponse = await fetch(app.aiCore.operationsManifestUrl, {
        signal: controller.signal,
        headers: { "user-agent": "AI-Studio-GHRAB-registry-sync" },
      });
      if (!operationsResponse.ok)
        throw new Error(`ai-operations HTTP ${operationsResponse.status}`);
      operationsCount = validateOperationsManifest(
        await operationsResponse.json(),
        app,
      );
    }
    return { app, operationsCount };
  } finally {
    clearTimeout(timer);
  }
}

const apps = [];
const reportSources = [];
for (const source of sources) {
  try {
    const fetched = await fetchManifest(source);
    const localIcon = fallbackById.get(source.id)?.icon;
    const app = localIcon
      ? { ...fetched.app, icon: localIcon }
      : fetched.app;
    apps.push(app);
    reportSources.push({
      id: source.id,
      url: source.url,
      ok: true,
      version: app.version,
      aiOperations: fetched.operationsCount,
      lastLiveVerifiedAt: generatedAt,
    });
  } catch (error) {
    const app = fallbackById.get(source.id);
    if (!app)
      throw new Error(`Chybí fallback pro ${source.id}: ${error.message}`);
    apps.push(validate(app, source.id, source));
    const previousSource = previousSources.get(source.id);
    reportSources.push({
      id: source.id,
      url: source.url,
      ok: false,
      version: app.version,
      error: error.message,
      lastLiveVerifiedAt:
        previousSource?.lastLiveVerifiedAt ||
        (previousSource?.ok ? previousReport?.generatedAt || null : null),
    });
  }
}

const okCount = reportSources.filter((item) => item.ok).length;
const mode =
  okCount === reportSources.length
    ? "live"
    : okCount === 0
      ? "fallback"
      : "mixed";
const report = {
  schema: "ai-studio-sync-report-v1",
  generated: true,
  generatedAt,
  mode,
  lastFullLiveVerifiedAt:
    mode === "live"
      ? generatedAt
      : previousReport?.lastFullLiveVerifiedAt ||
        (previousReport?.mode === "live" ? previousReport.generatedAt || null : null),
  fallbackSnapshotConfirmed: mode === "fallback" && (offline || previousFallbackConfirmed),
  sources: reportSources,
};
await writeFile(
  path.join(configDir, "apps.generated.json"),
  JSON.stringify(apps, null, 2) + "\n",
  "utf8",
);
await writeFile(
  path.join(configDir, "sync-report.json"),
  JSON.stringify(report, null, 2) + "\n",
  "utf8",
);
console.log(
  `Registr: ${apps.length} aplikací, režim ${mode}, ověřeno ${okCount}/${reportSources.length}.`,
);
