import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const configDir = path.join(root, "src", "config");
const offline = process.argv.includes("--offline");
const writeOfflineOutputs = process.argv.includes("--write-offline");
let previousReport = null;
let previousApps = [];
try {
  const [loadedReport, loadedApps] = await Promise.all([
    readFile(path.join(configDir, "sync-report.json"), "utf8").then(JSON.parse),
    readFile(path.join(configDir, "apps.generated.json"), "utf8").then(JSON.parse),
  ]);
  previousReport = loadedReport;
  previousApps = Array.isArray(loadedApps) ? loadedApps : [];
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
const previousAppById = new Map(previousApps.map((app) => [app.id, app]));
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

async function fetchUrl(url, { format = "json", timeoutMs = 12000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "user-agent": "AI-Studio-GHRAB-registry-sync" },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return format === "text" ? response.text() : response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchManifest(source) {
  if (offline) throw new Error("offline režim");
  const app = validate(await fetchUrl(source.url), source.id, source);
  let operationsCount = null;
  let operationsError = null;
  if (app.aiCore?.serverReady) {
    try {
      operationsCount = validateOperationsManifest(
        await fetchUrl(app.aiCore.operationsManifestUrl),
        app,
      );
    } catch (error) {
      operationsError = error.message;
    }
  }
  return { app, operationsCount, operationsError };
}

async function fetchRepositoryManifest(source, fallbackApp) {
  if (offline) throw new Error("offline režim");
  const repository = source.repository || fallbackApp?.repository;
  if (!repository || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository))
    throw new Error("chybí veřejný zdrojový repozitář");
  const branch = source.branch || "main";
  const rootUrl = `https://raw.githubusercontent.com/${repository}/${encodeURIComponent(branch)}/`;
  const pkg = await fetchUrl(`${rootUrl}package.json`);
  if (!semver.test(pkg?.version || "")) throw new Error("package.json nemá platnou verzi");
  const candidates = source.templatePaths || [
    "src/studio-manifest.template.json",
    "studio/app-manifest.template.json",
    "studio-manifest.template.json",
  ];
  let lastError = null;
  for (const candidate of candidates) {
    try {
      const encodedPath = candidate.split("/").map(encodeURIComponent).join("/");
      const template = await fetchUrl(`${rootUrl}${encodedPath}`, { format: "text" });
      const parsed = JSON.parse(
        template
          .replaceAll("__APP_VERSION__", pkg.version)
          .replaceAll("__BUILD_TIME__", generatedAt),
      );
      if (fallbackApp?.publishedAt) parsed.publishedAt = fallbackApp.publishedAt;
      return {
        app: validate(parsed, source.id, source),
        verificationUrl: `${rootUrl}${encodedPath}`,
      };
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error(`zdrojový manifest nebyl ověřen: ${lastError?.message || "neznámá chyba"}`);
}

const resolveSource = async (source) => {
  const fallbackApp = fallbackById.get(source.id);
  if (!fallbackApp) throw new Error(`Chybí fallback pro ${source.id}`);
  const previousSource = previousSources.get(source.id);
  let snapshotApp = fallbackApp;
  try {
    const candidate = previousAppById.get(source.id);
    if (candidate) snapshotApp = validate(candidate, source.id, source);
  } catch {
    snapshotApp = fallbackApp;
  }
  try {
    const fetched = await fetchManifest(source);
    const localIcon = fallbackById.get(source.id)?.icon;
    const app = localIcon ? { ...fetched.app, icon: localIcon } : fetched.app;
    return {
      app,
      report: {
        id: source.id,
        url: source.url,
        repository: source.repository || app.repository,
        ok: true,
        verification: "deployment",
        version: app.version,
        sourceVersion: app.version,
        aiOperations: fetched.operationsCount,
        operationsWarning: fetched.operationsError,
        lastSourceVerifiedAt: generatedAt,
        lastLiveVerifiedAt: generatedAt,
      },
    };
  } catch (deploymentError) {
    if (!offline) {
      try {
        const repository = await fetchRepositoryManifest(source, snapshotApp);
        const app = validate(snapshotApp, source.id, source);
        return {
          app,
          report: {
            id: source.id,
            url: source.url,
            repository: source.repository || app.repository,
            ok: true,
            verification: "repository",
            verificationUrl: repository.verificationUrl,
            version: app.version,
            sourceVersion: repository.app.version,
            aiOperations: null,
            deploymentWarning: deploymentError.message,
            lastSourceVerifiedAt: generatedAt,
            lastLiveVerifiedAt: previousSource?.lastLiveVerifiedAt || null,
          },
        };
      } catch (repositoryError) {
        const app = validate(snapshotApp, source.id, source);
        return {
          app,
          report: {
            id: source.id,
            url: source.url,
            repository: source.repository || app.repository,
            ok: false,
            verification: "snapshot",
            version: app.version,
            sourceVersion: null,
            error: `nasazení: ${deploymentError.message}; repozitář: ${repositoryError.message}`,
            lastSourceVerifiedAt: previousSource?.lastSourceVerifiedAt || previousSource?.lastLiveVerifiedAt || null,
            lastLiveVerifiedAt: previousSource?.lastLiveVerifiedAt || null,
          },
        };
      }
    }
    const app = validate(snapshotApp, source.id, source);
    return {
      app,
      report: {
        id: source.id,
        url: source.url,
        repository: source.repository || app.repository,
        ok: false,
        verification: "snapshot",
        version: app.version,
        sourceVersion: null,
        error: deploymentError.message,
        lastSourceVerifiedAt: previousSource?.lastSourceVerifiedAt || previousSource?.lastLiveVerifiedAt || null,
        lastLiveVerifiedAt: previousSource?.lastLiveVerifiedAt || null,
      },
    };
  }
};

const resolvedSources = await Promise.all(sources.map(resolveSource));
const apps = resolvedSources.map((item) => item.app);
const reportSources = resolvedSources.map((item) => item.report);
const verifiedCount = reportSources.filter((item) => item.ok).length;
const deploymentCount = reportSources.filter((item) => item.verification === "deployment").length;
const repositoryCount = reportSources.filter((item) => item.verification === "repository").length;
const snapshotCount = reportSources.length - verifiedCount;
const mode = deploymentCount === reportSources.length ? "live" : verifiedCount === 0 ? "fallback" : "mixed";
const verificationMode =
  deploymentCount === reportSources.length ? "deployment" :
  repositoryCount === reportSources.length ? "repository" :
  snapshotCount === reportSources.length ? "snapshot" : "mixed";
const report = {
  schema: "ai-studio-sync-report-v1",
  generated: true,
  generatedAt,
  mode,
  verificationMode,
  counts: {
    verified: verifiedCount,
    deployment: deploymentCount,
    repository: repositoryCount,
    snapshot: snapshotCount,
    total: reportSources.length,
  },
  lastFullSourceVerifiedAt:
    verifiedCount === reportSources.length
      ? generatedAt
      : previousReport?.lastFullSourceVerifiedAt || null,
  lastFullLiveVerifiedAt:
    deploymentCount === reportSources.length
      ? generatedAt
      : previousReport?.lastFullLiveVerifiedAt || null,
  fallbackSnapshotConfirmed: mode === "fallback",
  sources: reportSources,
};

if (!offline || writeOfflineOutputs) {
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
} else {
  console.log("Offline simulace: apps.generated.json ani sync-report.json se nepřepisují.");
}
console.log(
  `Registr: ${apps.length} aplikací, ověřeno ${verifiedCount}/${reportSources.length} (nasazení ${deploymentCount}, GitHub zdroj ${repositoryCount}, snapshot ${snapshotCount}).`,
);
