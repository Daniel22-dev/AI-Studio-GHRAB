import { execFileSync } from "node:child_process";
import { readdir, readFile, stat } from "node:fs/promises";
import { createHash, generateKeyPairSync, sign, webcrypto } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { safeExportSelfTest } from "../src/shared/safe-export.js";
import { validateMaterialPackage } from "../src/shared/material-validator.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const src = path.join(root, "src");
const dist = path.join(root, "dist");
const errors = [];
const fail = (m) => errors.push(m);
const loadJson = async (file) => {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch (e) {
    fail(`Neplatný JSON ${path.relative(root, file)}: ${e.message}`);
    return null;
  }
};
const walk = async (dir) => {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    out.push(...(entry.isDirectory() ? await walk(full) : [full]));
  }
  return out;
};
const exists = async (file) => {
  try {
    await stat(file);
    return true;
  } catch {
    return false;
  }
};
const base64url = (value) => Buffer.from(value).toString("base64url");
const isVersionAtLeast = (version, minimum) => {
  const parse = (value) =>
    String(value)
      .split(/[+-]/, 1)[0]
      .split(".")
      .map((part) => Number(part));
  const current = parse(version);
  const required = parse(minimum);
  if (
    current.length !== 3 ||
    required.length !== 3 ||
    [...current, ...required].some((part) => !Number.isInteger(part))
  ) {
    return false;
  }
  for (let index = 0; index < 3; index += 1) {
    if (current[index] > required[index]) return true;
    if (current[index] < required[index]) return false;
  }
  return true;
};

const pkg = await loadJson(path.join(root, "package.json"));
const apps = await loadJson(path.join(src, "config/apps.generated.json"));
const fallback = await loadJson(path.join(src, "config/apps.fallback.json"));
const sources = await loadJson(path.join(src, "config/sources.json"));
const syncReport = await loadJson(path.join(src, "config/sync-report.json"));
const catalog = await loadJson(path.join(src, "library/catalog.json"));
const manifest = await loadJson(path.join(src, "manifest.webmanifest"));
const permissions = await loadJson(path.join(src, "config/permissions.json"));
const changes = await loadJson(path.join(src, "config/changelog.json"));
const policy = await loadJson(path.join(src, "config/access-policy.json"));
const publicKeyInfo = await loadJson(
  path.join(src, "config/access-public-key.json"),
);
const revocations = await loadJson(
  path.join(src, "config/revoked-access.json"),
);
const syncScript = await readFile(
  path.join(root, "scripts/sync-registry.mjs"),
  "utf8",
);
const deployWorkflow = await readFile(
  path.join(root, ".github/workflows/deploy.yml"),
  "utf8",
);
const prettierIgnore = await readFile(
  path.join(root, ".prettierignore"),
  "utf8",
);
const aiCoreRegistry = await loadJson(path.join(src, "config/ai-core.json"));
const aiRuntime = await loadJson(path.join(src, "config/ai-runtime.json"));
const aiReadinessBaseline = await loadJson(
  path.join(src, "config/ai-readiness-baseline.json"),
);
const aiReadiness = await loadJson(
  path.join(src, "config/ai-readiness.generated.json"),
);
const aiCoreConsumers = await loadJson(
  path.join(src, "config/ai-core-consumers.json"),
);
const aiCoreWorkflow = await readFile(
  path.join(root, ".github/workflows/distribute-ai-core.yml"),
  "utf8",
);
const verifyAiCoreScript = await readFile(
  path.join(root, "scripts/verify-ai-core.mjs"),
  "utf8",
);
const readinessScript = await readFile(
  path.join(root, "scripts/generate-ai-readiness.mjs"),
  "utf8",
);

for (const [label, list] of [
  ["generated registry", apps],
  ["fallback registry", fallback],
]) {
  if (!Array.isArray(list) || list.length < 8) {
    fail(`${label} musí obsahovat alespoň osm aplikací.`);
    continue;
  }
  const ids = new Set();
  for (const app of list) {
    if (app.schema !== "ai-studio-app-manifest-v1")
      fail(`${label}: ${app.id || "?"} má neplatné schema.`);
    if (!app.id || ids.has(app.id))
      fail(`${label}: neplatné nebo duplicitní id ${app.id}`);
    ids.add(app.id);
    if (!/^https:\/\//.test(app.launchUrl || ""))
      fail(`${app.id} nemá HTTPS launchUrl.`);
    if (!/^https:\/\//.test(app.manualUrl || ""))
      fail(`${app.id} nemá HTTPS manualUrl.`);
    if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(app.version || ""))
      fail(`${app.id} nemá SemVer verzi.`);
    if (
      !app.name?.cs ||
      !app.name?.en ||
      !app.description?.cs ||
      !app.description?.en
    )
      fail(`${app.id} nemá úplný překlad.`);
    if (!/^#[0-9a-f]{6}$/i.test(app.accent || ""))
      fail(`${app.id} nemá platný accent.`);
    if (!(await exists(path.join(src, app.icon))))
      fail(`Chybí ikona ${app.id}: ${app.icon}`);
  }
}
if (!Array.isArray(sources) || sources.length < 8)
  fail("sources.json musí obsahovat alespoň osm zdrojů.");
if (!apps?.some((app) => app.id === "essay-evaluator"))
  fail("Generovaný registr neobsahuje essay-evaluator.");
if (!fallback?.some((app) => app.id === "essay-evaluator"))
  fail("Fallback registr neobsahuje essay-evaluator.");
const activityBuilder = apps?.find((app) => app.id === "activity-builder");
const activityBuilderFallback = fallback?.find(
  (app) => app.id === "activity-builder",
);
if (!activityBuilder || !isVersionAtLeast(activityBuilder.version, "0.5.0"))
  fail("Generovaný registr neobsahuje ACTIVA 0.5.0 nebo novější.");
if (
  !activityBuilderFallback ||
  !isVersionAtLeast(activityBuilderFallback.version, "0.5.0")
)
  fail("Fallback registr neobsahuje ACTIVA 0.5.0 nebo novější.");
if (!sources?.some((source) => source.id === "activity-builder"))
  fail("sources.json neobsahuje zdroj ACTIVA.");
if (
  !syncScript.includes("validateOperationsManifest") ||
  !syncScript.includes("ghrab-ai-operations-v1") ||
  !syncScript.includes("aiOperations: fetched.operationsCount")
)
  fail("Synchronizace neověřuje veřejný registr AI operací server-ready aplikací.");
const sortio = apps?.find((app) => app.id === "sortio");
const sortioFallback = fallback?.find((app) => app.id === "sortio");
if (!sortio || !isVersionAtLeast(sortio.version, "1.0.2"))
  fail("Generovaný registr neobsahuje SORTIO 1.0.2 nebo novější.");
if (!sortioFallback || !isVersionAtLeast(sortioFallback.version, "1.0.2"))
  fail("Fallback registr neobsahuje SORTIO 1.0.2 nebo novější.");
if (!sources?.some((source) => source.id === "sortio"))
  fail("sources.json neobsahuje zdroj SORTIO.");
const lessonHub = apps?.find((app) => app.id === "lesson-hub");
const lessonHubFallback = fallback?.find((app) => app.id === "lesson-hub");
if (!lessonHub || !isVersionAtLeast(lessonHub.version, "1.2.0"))
  fail("Generovaný registr neobsahuje Lesson Hub 1.2.0 nebo novější.");
if (
  !lessonHubFallback ||
  !isVersionAtLeast(lessonHubFallback.version, "1.2.0")
)
  fail("Fallback registr neobsahuje Lesson Hub 1.2.0 nebo novější.");
if (!sources?.some((source) => source.id === "lesson-hub"))
  fail("sources.json neobsahuje zdroj Lesson Hubu.");
if (
  lessonHub?.manualUrl !==
  "https://daniel22-dev.github.io/lesson-hub/manual/"
)
  fail("Lesson Hub nemá aktuální adresu interaktivního manuálu.");
if (apps?.slice(0, 4).every((app) => app.id !== "essay-evaluator"))
  fail("Hodnotitel musí být ve výchozím Top 4.");
if (apps?.slice(4).every((app) => app.id !== "ludus"))
  fail("LUDUS má zůstat ve výchozím katalogu mimo Top 4.");
if (!syncScript.includes("const localIcon = fallbackById.get(source.id)?.icon"))
  fail("Synchronizace nezachovává lokální ikonu portálu.");
if (!deployWorkflow.includes("app-updated"))
  fail("Workflow nepřijímá událost app-updated.");
if (!deployWorkflow.includes("run: npm ci"))
  fail("Workflow neinstaluje uzamčené vývojové závislosti přes npm ci.");
if (
  !/cron:\s*["']?17 3 \* \* \*["']?/.test(deployWorkflow) ||
  /17 \* \* \* \*/.test(deployWorkflow)
)
  fail("Pojistná synchronizace nemá denní frekvenci.");
if (!deployWorkflow.includes("cancel-in-progress: false"))
  fail("Naplánovaný běh může rušit právě probíhající nasazení.");
if (!prettierIgnore.includes("src/ai-core/releases/**"))
  fail(".prettierignore nechrání neměnné release artefakty GHRAB AI Core.");
const formatScript = pkg?.scripts?.format || "";
const formatCheckScript = pkg?.scripts?.["format:check"] || "";
if (
  !formatScript.includes("verify-ai-core.mjs") ||
  !formatCheckScript.includes("verify-ai-core.mjs") ||
  !formatScript.includes("--ignore-path .prettierignore") ||
  !formatCheckScript.includes("--ignore-path .prettierignore")
)
  fail("Lokální formátování neověřuje integritu GHRAB AI Core před spuštěním Prettieru.");
const verifyBeforeIndex = deployWorkflow.indexOf(
  "Verify immutable Core before formatting",
);
const formatIndex = deployWorkflow.indexOf("Normalize source formatting");
const verifyAfterIndex = deployWorkflow.indexOf(
  "Verify immutable Core after formatting",
);
if (
  verifyBeforeIndex < 0 ||
  formatIndex < 0 ||
  verifyAfterIndex < 0 ||
  !(verifyBeforeIndex < formatIndex && formatIndex < verifyAfterIndex)
)
  fail("Deploy workflow neověřuje Core před i po formátování ve správném pořadí.");
if (permissions?.applicationPolicySource !== "access-policy.json")
  fail("permissions.json neodkazuje na jediný zdroj aplikační politiky.");
if (Object.hasOwn(permissions || {}, "apps"))
  fail(
    "permissions.json znovu duplikuje aplikační školení z access-policy.json.",
  );
if (policy?.applications?.["essay-evaluator"]?.trainingCode !== "HOD-01")
  fail("Hodnotitel nemá školení HOD-01.");
if (policy?.applications?.["activity-builder"]?.trainingCode !== "ACT-01")
  fail("ACTIVA nemá školení ACT-01.");
if (policy?.applications?.sortio?.trainingCode !== "SOR-01")
  fail("SORTIO nemá školení SOR-01.");
if (policy?.applications?.["lesson-hub"]?.trainingCode !== "LHB-01")
  fail("Lesson Hub nemá školení LHB-01.");
if (syncReport?.schema !== "ai-studio-sync-report-v1")
  fail("sync-report.json má neplatné schema.");
if (
  !Array.isArray(syncReport?.sources) ||
  syncReport.sources.length !== sources?.length
)
  fail("Sync report neodpovídá seznamu zdrojů.");
if (syncReport?.generated === false) {
  if (syncReport.mode !== "unverified" || syncReport.generatedAt !== null)
    fail("Nevygenerovaný sync report nesmí předstírat síťové ověření.");
  if (syncReport.sources.some((item) => item.ok !== null))
    fail("Nevygenerovaný sync report musí mít stav zdrojů null.");
} else if (
  !syncReport?.generatedAt ||
  !["live", "mixed", "fallback"].includes(syncReport?.mode)
) {
  fail("Vygenerovaný sync report nemá platný čas nebo režim.");
}

if (
  permissions?.schema !== "ai-studio-permissions-v1" ||
  permissions?.mode !== "signed-serverless-permits"
)
  fail("permissions.json nemá nový podepsaný bezserverový model.");
if (
  policy?.schema !== "ghrab-access-policy-v1" ||
  policy.defaultState !== "locked"
)
  fail("Přístupová politika musí mít výchozí stav locked.");
const publicKeys = publicKeyInfo?.keys || [];
if (
  publicKeyInfo?.schema !== "ghrab-access-public-key-v1" ||
  !publicKeyInfo.keyId ||
  !publicKeyInfo.publicKey ||
  !publicKeyInfo.activeKeyId ||
  !Array.isArray(publicKeys) ||
  !publicKeys.length
)
  fail("Kompatibilní sada veřejných ověřovacích klíčů chybí.");
if (!publicKeys.some((item) => item.keyId === publicKeyInfo?.activeKeyId))
  fail("Aktivní veřejný klíč není v sadě klíčů.");
for (const item of publicKeys) {
  if (item?.publicKey?.d)
    fail("Veřejný klíč nesmí obsahovat soukromou část d.");
}
if (
  revocations?.schema !== "ghrab-access-revocation-list-v1" ||
  !Array.isArray(revocations.revokedJti)
)
  fail("Revokační seznam má neplatnou strukturu.");
for (const app of apps || []) {
  const rule = policy?.applications?.[app.id];
  if (!rule) fail(`access-policy.json neobsahuje ${app.id}.`);
  if (rule?.trainingRequired && (!rule.trainingCode || !rule.trainingVersion))
    fail(`${app.id}: povinné školení nemá kód nebo verzi.`);
}
if (
  Number(policy?.maximumPermitDays) !== 400 ||
  Number(policy?.legacyMaximumPermitDays) !== 1095 ||
  !Number.isFinite(Date.parse(policy?.maximumPermitDaysEnforcedAfter))
)
  fail(
    "Politika platnosti oprávnění nemá bezpečný limit 400 dní a migrační ochranu starých oprávnění.",
  );
for (const item of publicKeys) {
  try {
    await webcrypto.subtle.importKey(
      "jwk",
      item.publicKey,
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["verify"],
    );
  } catch (e) {
    fail(`Veřejný klíč ${item?.keyId || "?"} nelze importovat: ${e.message}`);
  }
}
try {
  const { privateKey, publicKey } = generateKeyPairSync("ec", {
    namedCurve: "prime256v1",
  });
  const payload = base64url(
    JSON.stringify({
      schema: "ghrab-access-permit-v1",
      iss: policy.issuer,
      aud: policy.audience,
      sub: "qa",
      jti: "qa",
      kid: "qa",
      role: "teacher",
      apps: ["generator"],
      iat: 1,
      exp: 2,
    }),
  );
  const signature = sign("sha256", Buffer.from(payload), {
    key: privateKey,
    dsaEncoding: "ieee-p1363",
  });
  const jwk = publicKey.export({ format: "jwk" });
  const key = await webcrypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["verify"],
  );
  if (
    !(await webcrypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      key,
      signature,
      Buffer.from(payload),
    ))
  )
    fail("WebCrypto neověřilo P-256 podpis ve formátu používaném vydavatelem.");
} catch (e) {
  fail(`Test podpisového algoritmu selhal: ${e.message}`);
}

if (
  aiCoreRegistry?.schema !== "ghrab-ai-studio-core-registry-v1" ||
  aiCoreRegistry?.activeRelease?.coreVersion !== "1.0.0" ||
  String(aiCoreRegistry?.activeRelease?.contractVersion) !== "1" ||
  !/^https:\/\//.test(aiCoreRegistry?.publicBaseUrl || "")
)
  fail("Centrální registr GHRAB AI Core je neplatný.");
if (
  aiRuntime?.schema !== "ghrab-runtime-config-v1" ||
  aiRuntime?.ai?.defaultMode !== "direct-gemini" ||
  JSON.stringify(aiRuntime?.ai?.allowedModes) !==
    JSON.stringify(["direct-gemini"]) ||
  aiRuntime?.ai?.automaticFallback !== false ||
  aiRuntime?.telemetry?.recordContent !== false
)
  fail("Centrální runtime není bezpečný direct-gemini režim.");
const runtimeText = JSON.stringify(aiRuntime || {});
if (/sk-|AIza|apiKey|secret/i.test(runtimeText))
  fail("Centrální runtime může obsahovat tajný klíč.");
const readinessApps = Array.isArray(apps) ? apps : [];
const readinessBaselineRows = Array.isArray(
  aiReadinessBaseline?.applications,
)
  ? aiReadinessBaseline.applications
  : [];
const readinessRows = Array.isArray(aiReadiness?.applications)
  ? aiReadiness.applications
  : [];
const readinessAppsById = new Map(
  readinessApps.map((item) => [item.id, item]),
);
const readinessBaselineById = new Map(
  readinessBaselineRows.map((item) => [item.appId, item]),
);
const readinessRowsById = new Map(
  readinessRows.map((item) => [item.appId, item]),
);
const activeCoreVersion = aiCoreRegistry?.activeRelease?.coreVersion;
if (
  aiReadinessBaseline?.activeCoreVersion !== activeCoreVersion ||
  readinessBaselineRows.length !== readinessApps.length ||
  readinessBaselineById.size !== readinessBaselineRows.length ||
  readinessAppsById.size !== readinessApps.length ||
  readinessRows.length !== readinessApps.length ||
  readinessRowsById.size !== readinessRows.length ||
  readinessApps.some((app) => !readinessBaselineById.has(app.id)) ||
  readinessRows.some((row) => !readinessAppsById.has(row.appId))
)
  fail(
    "Readiness baseline a report nepokrývají přesně všechny aplikace.",
  );
const readinessCount = (status) =>
  readinessRows.filter((item) => item.status === status).length;
const expectedReadinessFor = (app, baselineItem) => {
  const live = app?.aiCore;
  const certification = baselineItem?.certification;
  if (live) {
    const conformancePassed = live.conformancePassed === true;
    return {
      status:
        live.serverReady === true &&
        conformancePassed &&
        live.coreVersion === activeCoreVersion
          ? "ready"
          : "incompatible",
      coreVersion: live.coreVersion || null,
      contractVersion: String(live.contractVersion),
      conformancePassed,
      operationsManifestUrl: live.operationsManifestUrl || null,
    };
  }
  if (certification) {
    return {
      status:
        app?.version === certification.appVersion
          ? "certified-pending-manifest"
          : "certified-pending-deployment",
      coreVersion: certification.coreVersion || null,
      contractVersion: String(certification.contractVersion),
      conformancePassed: certification.conformancePassed === true,
      operationsManifestUrl: null,
    };
  }
  return {
    status: "not-migrated",
    coreVersion: null,
    contractVersion: null,
    conformancePassed: false,
    operationsManifestUrl: null,
  };
};
if (
  aiReadiness?.schema !== "ghrab-ai-readiness-report-v1" ||
  aiReadiness?.activeCoreVersion !== activeCoreVersion ||
  aiReadiness?.summary?.totalApps !== readinessRows.length ||
  aiReadiness?.summary?.readyApps !== readinessCount("ready") ||
  aiReadiness?.summary?.certifiedPendingApps !==
    readinessRows.filter((item) => item.status?.startsWith("certified-")).length ||
  aiReadiness?.summary?.notMigratedApps !== readinessCount("not-migrated") ||
  aiReadiness?.summary?.incompatibleApps !== readinessCount("incompatible")
)
  fail("Souhrn readiness neodpovídá skutečným stavům aplikací.");
for (const app of readinessApps) {
  const baselineItem = readinessBaselineById.get(app.id);
  const row = readinessRowsById.get(app.id);
  if (!baselineItem || !row) {
    fail(`${app.id}: chybí baseline nebo řádek readiness reportu.`);
    continue;
  }
  const certification = baselineItem.certification;
  const expected = expectedReadinessFor(app, baselineItem);
  if (
    row.appVersion !== (app.version || null) ||
    row.status !== expected.status ||
    row.coreVersion !== expected.coreVersion ||
    row.contractVersion !== expected.contractVersion ||
    row.conformancePassed !== expected.conformancePassed ||
    row.operationsManifestUrl !== expected.operationsManifestUrl ||
    row.certifiedAppVersion !== (certification?.appVersion || null) ||
    row.operationsCount !== (certification?.operationsCount || null) ||
    row.evidence !== (certification?.evidence || null)
  )
    fail(`${app.id}: readiness report neodpovídá manifestu a baseline.`);
  if (
    expected.status === "ready" &&
    !/^https:\/\//.test(expected.operationsManifestUrl || "")
  )
    fail(`${app.id}: živá server-ready integrace nemá HTTPS registr operací.`);
  if (certification) {
    const evidencePath = path.resolve(root, certification.evidence || "");
    if (
      !/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(
        certification.appVersion || "",
      ) ||
      certification.coreVersion !== activeCoreVersion ||
      String(certification.contractVersion) !== "1" ||
      certification.conformancePassed !== true ||
      !Number.isInteger(certification.operationsCount) ||
      certification.operationsCount < 1 ||
      Number.isNaN(Date.parse(certification.certifiedAt || "")) ||
      !certification.evidence ||
      !evidencePath.startsWith(`${root}${path.sep}`) ||
      !(await exists(evidencePath))
    )
      fail(`${app.id}: certifikační baseline je neúplná nebo bez důkazu.`);
  }
}
const correspondenceCertification = readinessBaselineById.get(
  "correspondence",
)?.certification;
if (
  !correspondenceCertification ||
  correspondenceCertification.operationsCount !== 8 ||
  correspondenceCertification.coreVersion !== activeCoreVersion
)
  fail("KS nemá úplnou certifikaci osmi AI operací pro aktivní Core.");
const livePatchUpgradeProbe = expectedReadinessFor(
  {
    version: "99.99.99",
    aiCore: {
      serverReady: true,
      conformancePassed: true,
      coreVersion: activeCoreVersion,
      contractVersion: "1",
      operationsManifestUrl: "https://example.invalid/ai-operations.json",
    },
  },
  {
    certification: {
      ...correspondenceCertification,
      appVersion: "1.0.0",
    },
  },
);
if (livePatchUpgradeProbe.status !== "ready")
  fail("Readiness znovu váže živý stav na přesnou certifikovanou verzi aplikace.");
const consumerRows = Array.isArray(aiCoreConsumers?.consumers)
  ? aiCoreConsumers.consumers
  : [];
const consumersById = new Map(
  consumerRows.map((item) => [item.appId, item]),
);
const certifiedConsumerIds = new Set(
  readinessBaselineRows
    .filter((item) => item.certification)
    .map((item) => item.appId),
);
if (
  aiCoreConsumers?.schema !== "ghrab-ai-core-consumers-v1" ||
  aiCoreConsumers?.eventType !== "ghrab-ai-core-released" ||
  consumerRows.length !== readinessApps.length ||
  consumersById.size !== consumerRows.length
)
  fail("Registr spotřebitelů GHRAB AI Core nemá úplné nebo jedinečné záznamy.");
for (const app of readinessApps) {
  const consumer = consumersById.get(app.id);
  if (
    !consumer ||
    consumer.repository !== app.repository ||
    consumer.enabled !== certifiedConsumerIds.has(app.id)
  )
    fail(`${app.id}: registr spotřebitelů neodpovídá certifikační baseline.`);
}
if (
  !aiCoreWorkflow.includes("workflow_dispatch") ||
  !aiCoreWorkflow.includes("default: true") ||
  !aiCoreWorkflow.includes("GHRAB_CORE_SYNC_TOKEN") ||
  !aiCoreWorkflow.includes("verify-ai-core.mjs")
)
  fail("Distribuční workflow Core není ve výchozím stavu bezpečný dry-run.");
if (
  !verifyAiCoreScript.includes("createHash") ||
  !verifyAiCoreScript.includes("sha256") ||
  !readinessScript.includes("certified-pending-deployment") ||
  !readinessScript.includes("ready")
)
  fail("Core ověření nebo readiness generátor nemají povinné kontroly.");
for (const [file, metadata] of Object.entries(
  aiCoreRegistry?.activeRelease?.artifacts || {},
)) {
  const artifact = path.join(
    src,
    aiCoreRegistry.activeRelease.releasePath,
    file,
  );
  if (!(await exists(artifact))) {
    fail(`Chybí vydaný Core artefakt ${file}.`);
    continue;
  }
  const actual = createHash("sha256")
    .update(await readFile(artifact))
    .digest("hex");
  if (actual !== metadata.sha256)
    fail(`SHA-256 nesouhlasí pro Core artefakt ${file}.`);
}

if (
  changes?.schema !== "ai-studio-changelog-v1" ||
  changes.current !== pkg?.version ||
  !changes.items?.some((x) => x.version === pkg?.version)
)
  fail("Changelog neobsahuje aktuální verzi.");
const changelogMarkdown = await readFile(
  path.join(root, "CHANGELOG.md"),
  "utf8",
);
const markdownVersions = [
  ...changelogMarkdown.matchAll(/^## (\d+\.\d+\.\d+)/gm),
].map((match) => match[1]);
const jsonVersions = (changes?.items || []).map((item) => item.version);
if (JSON.stringify(markdownVersions) !== JSON.stringify(jsonVersions))
  fail("CHANGELOG.md není přesně vygenerovaný z changelog.json.");
const activeDocs = [
  "README.md",
  "BEZPECNOST.md",
  "AUTOMATIZACE-GITHUB.md",
  "RELEASE-CHECKLIST.md",
  "ARCHITEKTURA.md",
  "POSTUP-NAHRANI.md",
  "NAHRANI-NA-GITHUB.md",
];
for (const doc of activeDocs) {
  const text = await readFile(path.join(root, doc), "utf8");
  if (!text.slice(0, 500).includes(pkg.version))
    fail(`${doc} neuvádí aktuální verzi ${pkg.version} v úvodu.`);
}
const rootEntries = await readdir(root);
for (const name of rootEntries) {
  if (/^(?:KOMENTAR-ZMEN-|QA_REPORT_|NAHRANI-NA-GITHUB-v)/.test(name))
    fail(`Efemérní release dokument zůstal v kořeni: ${name}`);
}
if (await exists(path.join(src, "config/apps.json")))
  fail("Mrtvý duplicitní soubor src/config/apps.json stále existuje.");
if (!Array.isArray(catalog?.items) || catalog.items.length < 4)
  fail("Katalog musí obsahovat alespoň čtyři ukázky.");
for (const item of catalog?.items || []) {
  const sample = await loadJson(path.join(src, item.download));
  const result = validateMaterialPackage(sample);
  if (!result.valid)
    fail(`${item.id}: neplatná ukázka: ${result.errors.join("; ")}`);
}
if (!safeExportSelfTest())
  fail("Bezpečný export propustil testovací citlivá data.");
if (manifest?.id !== "/AI-Studio-GHRAB/")
  fail("PWA manifest nemá stabilní id /AI-Studio-GHRAB/.");
const manualsHtml = await readFile(path.join(src, "manualy/index.html"), "utf8");
const manualsJs = await readFile(path.join(src, "manualy/manualy.js"), "utf8");
if (!manualsHtml.includes('id="ecosystem-support"')) fail("Centrum manuálů nemá společnou podporu ekosystému.");
if (
  !manualsJs.includes("activity-builder") ||
  !manualsJs.includes("sortio") ||
  !manualsJs.includes("lesson-hub") ||
  !manualsJs.includes("MANUAL_TOPICS")
)
  fail(
    "Centrum manuálů nepopisuje ACTIVA, SORTIO, Lesson Hub a obsah jednotlivých průvodců.",
  );
if (!(await exists(path.join(src, "manualy/ecosystem-guide.html"))))
  fail("Chybí společná provozní příručka ekosystému.");
if (!manualsHtml.includes("všech osm aplikací"))
  fail("Centrum manuálů neuvádí osm aplikací.");
if (!(await exists(path.join(src, "assets/apps/lesson-hub.png"))))
  fail("Chybí lokální ikona Lesson Hubu.");

if (Object.hasOwn(manifest || {}, "version"))
  fail("PWA manifest obsahuje nestandardní pole version.");

const sourceFiles = await walk(src);
const secretPatterns = [
  /AIza[0-9A-Za-z_-]{20,}/g,
  /sk-[0-9A-Za-z_-]{20,}/g,
  /github_pat_[0-9A-Za-z_]{20,}/g,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
  /"d"\s*:\s*"[A-Za-z0-9_-]{20,}"/g,
];
for (const file of sourceFiles.filter((f) =>
  /\.(html|js|json|md|css|yml|yaml)$/.test(f),
)) {
  const text = await readFile(file, "utf8");
  for (const pattern of secretPatterns) {
    pattern.lastIndex = 0;
    if (pattern.test(text))
      fail(`Možné tajemství v ${path.relative(root, file)}`);
  }
  if (file.endsWith(".ghrab-access.json"))
    fail(
      `Ve veřejném zdroji je přístupový soubor: ${path.relative(root, file)}`,
    );
  if (/\sstyle=["']/i.test(text) && file.endsWith(".html"))
    fail(`Inline style není povolen CSP: ${path.relative(root, file)}`);
}
const scriptFiles = await walk(path.join(root, "scripts"));
const referenceFiles = [
  ...sourceFiles,
  ...scriptFiles,
  ...activeDocs.map((doc) => path.join(root, doc)),
].filter((file) =>
  /\.(?:html|js|mjs|json|md|css|webmanifest|yml|yaml)$/.test(file),
);
const referenceTexts = new Map();
for (const file of referenceFiles)
  referenceTexts.set(file, await readFile(file, "utf8"));
for (const configFile of sourceFiles.filter(
  (file) => file.startsWith(path.join(src, "config")) && file.endsWith(".json"),
)) {
  const name = path.basename(configFile);
  const referenced = [...referenceTexts.entries()].some(
    ([file, text]) => file !== configFile && text.includes(name),
  );
  if (!referenced)
    fail(`Konfigurační soubor bez spotřebitele: src/config/${name}`);
}

for (const file of sourceFiles.filter((file) =>
  /\.(?:html|js|json|md|css|webmanifest)$/.test(file),
)) {
  const lines = (await readFile(file, "utf8")).split(/\r?\n/);
  const tooLong = lines.findIndex((line) => line.length > 500);
  if (tooLong !== -1)
    fail(`Příliš dlouhý řádek v ${path.relative(root, file)}:${tooLong + 1}`);
}

for (const file of sourceFiles.filter((f) => f.endsWith(".js"))) {
  try {
    execFileSync(process.execPath, ["--check", file], { stdio: "pipe" });
  } catch (e) {
    fail(
      `Chyba syntaxe JS v ${path.relative(root, file)}: ${e.stderr?.toString() || e.message}`,
    );
  }
}

const standardPages = new Set([
  "index.html",
  "access/index.html",
  "automation/index.html",
  "workflow/index.html",
  "report/index.html",
  "demo/index.html",
  "library/index.html",
  "manualy/index.html",
  "manualy/pilot-report.html",
  "manualy/error-report.html",
  "safety/index.html",
  "pilot/index.html",
  "changelog/index.html",
  "tests/index.html",
  "tools/access-issuer/index.html",
  "tools/access-registry/index.html",
]);
for (const file of sourceFiles.filter((f) => f.endsWith(".html"))) {
  const html = await readFile(file, "utf8");
  const rel = path.relative(src, file).replaceAll("\\", "/");
  const ids = [...html.matchAll(/\sid=["']([^"']+)["']/g)].map((m) => m[1]);
  const seen = new Set();
  for (const id of ids) {
    if (seen.has(id)) fail(`Duplicitní id ${id} v ${rel}`);
    seen.add(id);
  }
  const isFragment = rel.startsWith("integration/");
  if (!isFragment && !html.includes("Content-Security-Policy"))
    fail(`Chybí CSP v ${rel}`);
  if (
    !isFragment &&
    !html.includes('name="viewport"') &&
    !html.includes("name='viewport'")
  )
    fail(`Chybí viewport v ${rel}`);
  if (standardPages.has(rel)) {
    if (!html.includes("Autor a vývojový garant: Daniel Baláž"))
      fail(`Chybí sjednocené zápatí v ${rel}`);
    if (!html.includes("polish.css")) fail(`Chybí polish.css v ${rel}`);
    if (!html.includes('data-nav="manualy"'))
      fail(`Chybí záložka Manuály v ${rel}`);
    if (!html.includes('data-nav="safety"'))
      fail(`Chybí platná záložka Bezpečnost v ${rel}`);
    if (/<\/a>\.{1,2}\/\s+data-/i.test(html))
      fail(`Poškozená HTML navigace v ${rel}`);
  }
  if (isFragment) continue;
  for (const match of html.matchAll(/(?:href|src)=["']([^"'#]+)["']/g)) {
    const url = match[1];
    if (/^(?:https?:|data:|mailto:|tel:)/.test(url) || url.startsWith("__"))
      continue;
    const clean = url.split("?")[0];
    let target = path.resolve(path.dirname(file), clean);
    if (clean.endsWith("/")) target = path.join(target, "index.html");
    if (!(await exists(target)))
      fail(`Neplatný lokální odkaz v ${rel}: ${url}`);
  }
}
for (const file of [
  "automation/automation.js",
  "pilot/pilot.js",
  "report/report.js",
  "demo/demo.js",
  "changelog/changelog.js",
  "tests/tests.js",
]) {
  const text = await readFile(path.join(src, file), "utf8");
  if (!text.includes("accessReady") || !text.includes("isAdmin"))
    fail(`${file} nemá správcovskou bránu.`);
}
for (const file of [
  "integration/generator-access-bootstrap.example.js",
  "integration/differentiator-access-bootstrap.example.js",
  "integration/essay-evaluator-access-bootstrap.example.js",
  "integration/ludus-access-bootstrap.example.js",
  "integration/correspondence-access-bootstrap.example.js",
]) {
  const full = path.join(src, file);
  if (!(await exists(full))) {
    fail(`Chybí integrační šablona ${file}.`);
    continue;
  }
  const text = await readFile(full, "utf8");
  if (
    !text.includes("try {") ||
    !text.includes("await import(GUARD_URL)") ||
    !text.includes("showBootstrapFailure") ||
    !text.includes("catch (error)")
  )
    fail(
      `${file} neumí zobrazit srozumitelnou chybu při nedostupnosti Studia.`,
    );
}
const manualPageText = await readFile(
  path.join(src, "manualy/manualy.js"),
  "utf8",
);
if (
  !manualPageText.includes("G.hasAppAccess(app.id)") ||
  !manualPageText.includes("manual-locked-button")
)
  fail("Katalog manuálů nedědí oprávnění aplikací nebo neumí uzamčený stav.");
if (
  !manualPageText.includes("./viewer.html?app=") ||
  manualPageText.includes("open.target = '_blank'")
)
  fail("Katalog manuálů neotevírá průvodce interně v AI Studiu.");
const manualViewerText = await readFile(
  path.join(src, "manualy/viewer.js"),
  "utf8",
);
const manualViewerHtml = await readFile(
  path.join(src, "manualy/viewer.html"),
  "utf8",
);
if (
  !manualViewerText.includes("G.hasAppAccess(currentApp.id)") ||
  !manualViewerText.includes("allowedManualUrl")
)
  fail(
    "Interní prohlížeč manuálu nekontroluje oprávnění nebo bezpečnou adresu.",
  );
if (
  !manualViewerHtml.includes('id="manual-frame"') ||
  !manualViewerHtml.includes("allowfullscreen") ||
  !manualViewerHtml.includes("frame-src 'self'")
)
  fail(
    "Interní prohlížeč manuálu nemá bezpečný rámec s podporou celé obrazovky.",
  );
const portalStylesText = await readFile(path.join(src, "styles.css"), "utf8");
if (
  !portalStylesText.includes("v0.7.3 — mobile") ||
  !/\.portal-card-head\s*\{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)/.test(
    portalStylesText,
  ) ||
  !/\.version-chip\s*\{[\s\S]*white-space:\s*nowrap/.test(portalStylesText)
)
  fail("Chybí mobilní ochrana proti oříznutí čísla verze.");
const appGuardText = await readFile(
  path.join(src, "access/app-guard.js"),
  "utf8",
);
const accessControlText = await readFile(
  path.join(src, "access/access-control.js"),
  "utf8",
);
if (
  !accessControlText.includes("training-missing") ||
  !accessControlText.includes("training-outdated") ||
  !accessControlText.includes("held.version !== required.trainingVersion")
)
  fail("Kontrola přístupu technicky nevynucuje aktuální verzi školení.");
if (
  !accessControlText.includes("verificationKeys(publicKeyInfo)") ||
  !accessControlText.includes("verificationKeyFor(payload.kid)") ||
  !accessControlText.includes("legacyMaximumPermitDays")
)
  fail("Ověřování přístupu nepodporuje rotaci více veřejných klíčů.");
if (
  !/new URL\(options\.studioUrl \|\| ["\']\.\.\/["\'], location\.href\)/.test(
    appGuardText,
  )
)
  fail("app-guard nepřevádí relativní adresu Studia na úplnou URL.");
if (
  !appGuardText.includes("ACTIVE_IDLE_MS = 5 * 60 * 1000") ||
  !appGuardText.includes("document.visibilityState") ||
  !appGuardText.includes("document.hasFocus()")
)
  fail("app-guard nemá konzervativní měření aktivního času.");
if (
  !appGuardText.includes("recordApplicationOpen(appId, keys)") ||
  !appGuardText.includes("ghrabLaunchRecorded")
)
  fail(
    "app-guard nezapočítává skutečně otevřenou aplikaci po ověření přístupu.",
  );
if (
  !appGuardText.includes("recordOutput(appId, keys") ||
  !appGuardText.includes("OUTPUT_KINDS") ||
  !appGuardText.includes("worksheet-variant") ||
  !appGuardText.includes("essay-evaluation") ||
  !appGuardText.includes('"activity-builder"') ||
  !appGuardText.includes('"activity-pack"') ||
  !appGuardText.includes("sortio") ||
  !appGuardText.includes('"seating-plan"') ||
  !appGuardText.includes('"lesson-hub"') ||
  !appGuardText.includes('"lesson-record"') ||
  !appGuardText.includes('"backup-export"')
)
  fail("app-guard nemá jednotné anonymní metriky výstupů všech aplikací.");
if (!appGuardText.includes("options.telemetry !== false"))
  fail("app-guard neumí vyloučit interaktivní manuály z měření používání.");
if (
  !/import \{ setupErrorReporter \} from ["\']\.\/error-reporter\.js["\']/.test(
    appGuardText,
  ) ||
  !/setupErrorReporter\(\{\s*appId/.test(appGuardText) ||
  !/\}\s*if \(options\.errorReporter !== false\)\s*setupErrorReporter/.test(
    appGuardText,
  )
)
  fail("app-guard neaktivuje jednotné hlášení chyb v chráněných aplikacích.");
const mainAppText = await readFile(path.join(src, "app.js"), "utf8");
if (
  !/\[["\']issuer["\'], ["\']access-registry["\']\]\.includes\(page\)/.test(
    mainAppText,
  )
)
  fail("Správcovské nástroje nezvýrazňují záložku Správa.");
const issuerScriptText = await readFile(
  path.join(src, "tools/access-issuer/issuer.js"),
  "utf8",
);
const registryPageText = await readFile(
  path.join(src, "tools/access-registry/index.html"),
  "utf8",
);
const registryScriptText = await readFile(
  path.join(src, "tools/access-registry/registry.js"),
  "utf8",
);
if (
  !mainAppText.includes("ghrab.access.issued-registry.v1") ||
  !mainAppText.includes("recordIssuedAccess") ||
  !mainAppText.includes("issuedAccessBackup")
)
  fail("Chybí místní datový model evidence vydaných přístupů.");
if (
  !issuerScriptText.includes("G.recordIssuedAccess(payload") ||
  !issuerScriptText.includes("automaticky uložen do evidence")
)
  fail("Vydání přístupu se automaticky nezapisuje do evidence.");
if (
  !issuerScriptText.includes("PRIVATE_KEY_TTL_MS = 10 * 60 * 1000") ||
  !issuerScriptText.includes("clearPrivateKey") ||
  !issuerScriptText.includes("pagehide") ||
  !issuerScriptText.includes("const trainingIds = apps.includes")
)
  fail(
    "Vydavatel nema automaticke zapomenuti soukromeho klice nebo skoleni pro wildcard pristup.",
  );
if (
  !registryPageText.includes("Evidence přístupů") ||
  !registryPageText.includes("export-revocations") ||
  !registryPageText.includes("import-files") ||
  !registryPageText.includes("registry-drop-zone") ||
  !registryScriptText.includes("inspectPermitToken") ||
  !registryScriptText.includes("revoked-access.json") ||
  !registryScriptText.includes("#registryImport=") ||
  !registryScriptText.includes("importSelectedFiles")
)
  fail(
    "Správcovská evidence nemá spolehlivý import, přehled, soukromý odkaz nebo export zneplatnění.",
  );
if (
  registryScriptText.indexOf(
    "const token = typeof parsed === 'string' ? parsed : parsed?.token",
  ) > registryScriptText.indexOf("const recordsPayload = Array.isArray(parsed)")
)
  fail(
    "Import přístupového souboru musí ověřit podepsaný token dříve než pomocný permitId.",
  );
if (!policy?.administratorPages?.includes("access-registry"))
  fail("Evidence přístupů není označena jako správcovská stránka.");
if (/recordLaunch\(app\.id\)/.test(mainAppText))
  fail(
    "Studio stále počítá kliknutí před otevřením aplikace a mohlo by spuštění zdvojit.",
  );
if (
  !mainAppText.includes("portalLaunchInProgress") ||
  !/zone\?\.classList\.add\(["\']is-launching["\']\)/.test(mainAppText) ||
  !mainAppText.includes("portalRingPreludeDelay") ||
  !mainAppText.includes("portalAppCinematicDelay") ||
  !mainAppText.includes("portalLaunchOverlay")
)
  fail("Spuštění aplikace nemá dvoufázovou sekvenci brány a cílové aplikace.");
if (
  !mainAppText.includes("focusPortalGateway(zone).then") ||
  !mainAppText.includes("portalGatewayScrollTarget") ||
  !mainAppText.includes("ZAMĚŘUJI BRÁNU") ||
  mainAppText.indexOf("focusPortalGateway(zone).then") >
    mainAppText.indexOf("const startGatewaySequence") + 5000
)
  fail("Katalogové aplikace před animací nevracejí pohled k centrální bráně.");
const portalHomeHtml = await readFile(path.join(src, "index.html"), "utf8");
const portalPolishText = await readFile(path.join(src, "polish.css"), "utf8");
const accessSummaryRule =
  portalPolishText.match(/\.access-summary\s*\{([\s\S]*?)\}/)?.[1] || "";
if (!accessSummaryRule || /margin(?:-top)?\s*:\s*-/.test(accessSummaryRule))
  fail("Panel stavu přístupu se znovu překrývá se spodními kartami brány.");
if (
  !portalHomeHtml.includes("portal-ring-assembly") ||
  !portalHomeHtml.includes("portal-mechanical-ring ring-outer") ||
  !portalHomeHtml.includes("portal-lock-sequence")
)
  fail("Brána nemá samostatné obrazové vrstvy mechanických prstenců a zámků.");
if (
  !portalPolishText.includes("@keyframes gateway-ring-outer-dial") ||
  !portalPolishText.includes("@keyframes gateway-ring-middle-dial") ||
  !portalPolishText.includes("@keyframes gateway-ring-inner-dial") ||
  !portalPolishText.includes("@keyframes gateway-lock-node")
)
  fail("Chybí mechanické navolování prstenců nebo sekvenční zámky brány.");
if (
  !mainAppText.includes('return 2000;') ||
  !mainAppText.includes(
    'return root.dataset.motion === "full" ? 2800 : 1350;',
  ) ||
  !portalHomeHtml.includes("portal-launch-overlay") ||
  !mainAppText.includes("PRSTENCE SE OTÁČEJÍ") ||
  !mainAppText.includes("BRÁNA OTEVŘENA — SPOUŠTÍM APLIKACI") ||
  !mainAppText.includes("activateModalIsolation") ||
  !mainAppText.includes("cancelLaunchOnEscape") ||
  !mainAppText.includes('event.key !== "Escape"')
)
  fail(
    "Plné dvoufázové časování, přístupný modal nebo zrušení spuštění není zapojeno.",
  );
const embeddedViewerHtml = await readFile(
  path.join(src, "app/index.html"),
  "utf8",
);
const embeddedViewerScript = await readFile(
  path.join(src, "app/viewer.js"),
  "utf8",
);
const embeddedOverrideCss = await readFile(
  path.join(src, "app/embed-overrides.css"),
  "utf8",
);
if (
  mainAppText.includes('window.open("about:blank"') ||
  mainAppText.includes("window.open('about:blank'") ||
  !mainAppText.includes("embeddedApplicationUrl(app)") ||
  !mainAppText.includes("window.location.assign(destination)") ||
  !embeddedViewerHtml.includes("embedded-app-frame") ||
  !embeddedViewerScript.includes("frame.src = appUrl.href") ||
  !embeddedViewerScript.includes("appUrl.origin !== location.origin") ||
  !embeddedViewerScript.includes("applyEvaluatorEmbeddedPolish") ||
  !embeddedViewerScript.includes("keepManualsInsideWorkspace") ||
  !embeddedViewerScript.includes("setWorkspaceMode") ||
  !embeddedViewerScript.includes("returnToApplication") ||
  !embeddedViewerScript.includes(
    'backLink.dataset.destination = manualOpen ? "application" : "studio"',
  ) ||
  !embeddedViewerScript.includes(
    't("Zpět do aplikace", "Back to application")',
  ) ||
  !embeddedViewerHtml.includes('id="embedded-back-label"') ||
  !embeddedViewerHtml.includes('id="embedded-app-context"') ||
  !embeddedViewerScript.includes("ghrab-studio-compact-footer-logo") ||
  !embeddedOverrideCss.includes("essay-evaluator") ||
  !embeddedOverrideCss.includes("max-width: clamp(104px, 11vw, 152px)")
)
  fail(
    "Aplikace se neotevírají uvnitř pracovního prostoru Studia nebo se stále vytváří prázdné popup okno.",
  );
if (
  !mainAppText.includes("beforeinstallprompt") ||
  !mainAppText.includes("pwa-install-card") ||
  !mainAppText.includes("Nainstalovat AI Studio")
)
  fail("Domovská stránka nemá instalační nabídku PWA pro počítač.");
if (
  !deployWorkflow.includes("Format generated registry files") ||
  !deployWorkflow.includes("registry.npmjs.org")
)
  fail(
    "GitHub workflow neformátuje generovaný registr nebo nepoužívá veřejný npm registr.",
  );
if (
  !mainAppText.includes("refreshSharedAccessModuleCache") ||
  !mainAppText.includes("/AI-Studio-GHRAB/access/app-guard.js") ||
  !mainAppText.includes("/AI-Studio-GHRAB/access/error-reporter.js") ||
  !mainAppText.includes("cache.delete(request)")
)
  fail(
    "Studio nema jednorazove odstraneni starych kopii sdilenych modulu z PWA cache.",
  );
const errorReporterText = await readFile(
  path.join(src, "access/error-reporter.js"),
  "utf8",
);
const errorReporterCss = await readFile(
  path.join(src, "access/error-reporter.css"),
  "utf8",
);
const errorGuideHtml = await readFile(
  path.join(src, "manualy/error-report.html"),
  "utf8",
);
if (
  !errorReporterText.includes("getDisplayMedia") ||
  !errorReporterText.includes("MAX_SCREENSHOTS = 5") ||
  !errorReporterText.includes("makeZip(entries)") ||
  !errorReporterText.includes("Začernit údaje") ||
  !errorReporterText.includes("loadSupportEmail") ||
  !errorReporterText.includes("config/support.json") ||
  !errorReporterText.includes("ghrab-capture-bar") ||
  !errorReporterText.includes("Přejít do aplikace") ||
  !errorReporterText.includes("Smazat hlášení a zavřít") ||
  !errorReporterText.includes("Ponechat rozepsané a zavřít") ||
  !errorReporterText.includes("gmailUrl") ||
  !errorReporterText.includes('document.createElement("a")') ||
  !errorReporterText.includes('prepareLink.target = "_blank"') ||
  /\bwindow\.open\s*\(/.test(errorReporterText) ||
  errorReporterText.includes("supportsFileShare") ||
  errorReporterText.includes("navigator.share")
)
  fail(
    "Jednotné hlášení chyb nemá nativní Gmail odkaz, snímání, ZIP, redakci nebo bezpečné záložní akce.",
  );
if (
  !errorReporterText.includes("safePageUrl") ||
  !errorReporterText.includes("location.pathname") ||
  errorReporterText.includes("location.href, language")
)
  fail("Technické údaje hlášení mohou obsahovat citlivé query parametry URL.");
if (
  !errorReporterCss.includes(".ghrab-report-button.launcher") ||
  !errorReporterCss.includes(".ghrab-capture-bar") ||
  !errorReporterCss.includes(".ghrab-discard-dialog") ||
  !errorGuideHtml.includes("Jak poslat správci srozumitelné hlášení") ||
  !errorGuideHtml.includes("Stáhnout ZIP a otevřít Gmail") ||
  !errorGuideHtml.includes("Smazat hlášení a zavřít") ||
  errorGuideHtml.includes("Sdílet ZIP přes nabídku zařízení") ||
  !errorGuideHtml.includes("běžný odkaz prohlížeče") ||
  !errorGuideHtml.includes("Začerněte citlivé údaje")
)
  fail("Chybí vzhled reporteru nebo úplný interaktivní návod k hlášení chyby.");
try {
  execFileSync(process.execPath, [path.join(root, "scripts", "test-reporter-mail.mjs")], {
    cwd: root,
    stdio: "pipe",
  });
} catch (error) {
  fail(`Skutečné kliknutí v Chromiu neotevřelo Gmail: ${error.stderr?.toString() || error.message}`);
}
const pilotPageText = await readFile(
  path.join(src, "pilot/index.html"),
  "utf8",
);
const pilotScriptText = await readFile(
  path.join(src, "pilot/pilot.js"),
  "utf8",
);
if (
  /reportedMinutes|rating|učitelem vykázan/i.test(
    pilotPageText + pilotScriptText,
  )
)
  fail("Pilot stále obsahuje ruční vykazování času nebo užitečnosti.");
const reportGuideHtml = await readFile(
  path.join(src, "manualy/pilot-report.html"),
  "utf8",
);
if (
  !reportGuideHtml.includes("guide-download") ||
  !reportGuideHtml.includes("data-support-email-link") ||
  !reportGuideHtml.includes("support-link.js") ||
  !reportGuideHtml.includes("Používáte dvě zařízení")
)
  fail("Chybí úplný interaktivní návod k měsíčnímu souhrnu.");
if (
  !mainAppText.includes("isMonthlyReminderWindow") ||
  !mainAppText.includes("lastDay - 6") ||
  !mainAppText.includes("Mohu vás poprosit o anonymní souhrn?") ||
  !mainAppText.includes("Připomenout zítra") ||
  !mainAppText.includes("Souhrn jsem již odeslal(a)")
)
  fail(
    "Chybí zdvořilé připomenutí během posledních sedmi dnů měsíce až do potvrzení odeslání.",
  );
if (
  !mainAppText.includes("ghrab.pilot.anonymous-source-id") ||
  !mainAppText.includes("currentPilotPeriod")
)
  fail(
    "Anonymní měsíční souhrn nemá stabilní náhodný identifikátor zařízení nebo období.",
  );
const safeExportText = await readFile(
  path.join(src, "shared/safe-export.js"),
  "utf8",
);
if (
  !safeExportText.includes("ghrab-pilot-summary-v8-safe") ||
  !safeExportText.includes("safeLaunchesForPeriod") ||
  !safeExportText.includes("filterEventsByPeriod")
)
  fail("Bezpečný export není omezen na kalendářní měsíc.");
const reportScriptText = await readFile(
  path.join(src, "report/report.js"),
  "utf8",
);
if (
  !reportScriptText.includes("importIdentity") ||
  !reportScriptText.includes("sourceId") ||
  !reportScriptText.includes("periodInRange")
)
  fail(
    "Report neumí nahradit opakovaný souhrn ze stejného zařízení a měsíce nebo filtrovat období.",
  );
if (
  !reportScriptText.includes("canvasPdf") ||
  !reportScriptText.includes("school-logo.jpg") ||
  !reportScriptText.includes("portal-gateway.webp") ||
  !/downloadPdf\(["\']mono["\']\)/.test(reportScriptText)
)
  fail(
    "Report nemá přímý barevný a černobílý jednostránkový A4 PDF export se školní identitou.",
  );
if (
  new URL(
    "/AI-Studio-GHRAB/",
    "https://daniel22-dev.github.io/generator-testu/",
  ).href !== "https://daniel22-dev.github.io/AI-Studio-GHRAB/"
)
  fail("Regresní test adresy Studia selhal.");

const sourceSwText = await readFile(path.join(src, "sw.js"), "utf8");
if (
  !sourceSwText.includes("/*__CORE_REQUIRED__*/") ||
  !sourceSwText.includes("/*__CORE_OPTIONAL__*/") ||
  !sourceSwText.includes("cacheFirst") ||
  !sourceSwText.includes("networkFirst") ||
  !sourceSwText.includes('fetch(request, { cache: "no-store" })') ||
  !sourceSwText.includes("cachedNavigation") ||
  !sourceSwText.includes("Promise.allSettled")
)
  fail(
    "Service worker nemá generovaný precache a oddělené strategie pro statiku a konfiguraci.",
  );
if (
  sourceSwText.includes("skipWaiting") ||
  sourceSwText.includes("clients.claim")
)
  fail("Service worker stále násilně přebírá otevřené karty.");

const directStorageWriters = sourceFiles.filter(
  (file) =>
    file.endsWith(".js") &&
    ![
      "app.js",
      "bridge/studio-bridge.js",
      "tests/tests.js",
      "access/access-control.js",
      "access/app-guard.js",
      "tools/access-issuer/issuer.js",
    ].some((s) => file.endsWith(path.join("src", s))),
);
for (const file of directStorageWriters) {
  const text = await readFile(file, "utf8");
  if (text.includes("localStorage.setItem("))
    fail(
      `Přímý zápis do localStorage mimo bezpečný modul: ${path.relative(root, file)}`,
    );
}

try {
  execFileSync(process.execPath, [path.join(root, "scripts/build.mjs")], {
    stdio: "inherit",
  });
} catch {
  fail("Build selhal.");
}
const distFiles = await walk(dist);
const required = [
  "index.html",
  "styles.css",
  "polish.css",
  "app.js",
  "manifest.webmanifest",
  "sw.js",
  "build-info.json",
  "access/index.html",
  "access/access-control.js",
  "access/app-guard.js",
  "access/error-reporter.js",
  "access/error-reporter.css",
  "tools/access-issuer/index.html",
  "tools/access-registry/index.html",
  "tools/access-registry/registry.js",
  "tools/access-registry/registry.css",
  "automation/index.html",
  "app/index.html",
  "app/viewer.js",
  "app/viewer.css",
  "app/embed-overrides.css",
  "workflow/index.html",
  "report/index.html",
  "demo/index.html",
  "library/index.html",
  "manualy/index.html",
  "manualy/manualy.js",
  "manualy/manualy.css",
  "manualy/access-management.html",
  "manualy/viewer.html",
  "manualy/viewer.js",
  "manualy/viewer.css",
  "manualy/pilot-report.html",
  "manualy/pilot-report.js",
  "manualy/pilot-report.css",
  "manualy/error-report.html",
  "manualy/error-report.css",
  "safety/index.html",
  "pilot/index.html",
  "changelog/index.html",
  "tests/index.html",
  "config/access-policy.json",
  "config/access-public-key.json",
  "config/revoked-access.json",
  "config/ai-core.json",
  "config/ai-runtime.json",
  "config/ai-readiness.generated.json",
  "ai-core/releases/1.0.0/ghrab-ai-core-manifest-1.0.0.json",
  "ai-core/releases/1.0.0/ghrab-ai-core-1.0.0.js",
  "ai-core/migration/ghrab-ai-migration-kit-1.0.2.zip",
  "shared/material-validator.js",
  "integration/README.md",
  "integration/generator-access-bootstrap.example.js",
  "integration/essay-evaluator-access-bootstrap.example.js",
  "assets/apps/essay-evaluator-v2.png",
  "assets/brand/school-logo.jpg",
  "assets/brand/portal-gateway.webp",
  "assets/brand/portal-ring-outer.svg",
  "assets/brand/portal-ring-middle.svg",
  "assets/brand/portal-ring-inner.svg",
];
for (const rel of required)
  if (!distFiles.includes(path.join(dist, rel)))
    fail(`Build neobsahuje ${rel}`);
const builtSw = await readFile(path.join(dist, "sw.js"), "utf8");
const requiredBlock =
  builtSw.match(/const CORE_REQUIRED = \[([\s\S]*?)\];/)?.[1] || "";
const optionalBlock =
  builtSw.match(/const CORE_OPTIONAL = \[([\s\S]*?)\];/)?.[1] || "";
const parsePrecacheBlock = (block) =>
  [...block.matchAll(/['"](\.\/[^'"]+)['"]/g)].map((match) =>
    match[1].replace(/^\.\//, "").replace(/\/$/, "index.html"),
  );
const requiredPrecache = parsePrecacheBlock(requiredBlock);
const optionalPrecache = parsePrecacheBlock(optionalBlock);
const precache = [...new Set([...requiredPrecache, ...optionalPrecache])];
if (!requiredPrecache.length)
  fail("Service worker nemá čitelný seznam kritického shellu.");
for (const rel of precache)
  if (!distFiles.includes(path.join(dist, rel)))
    fail(`PWA precache odkazuje na chybějící ${rel}`);
for (const rel of [
  "index.html",
  "styles.css",
  "app.js",
  "app/index.html",
  "access/access-control.js",
  "config/access-policy.json",
  "config/ai-core.json",
  "config/ai-runtime.json",
  "config/ai-readiness.generated.json",
  "ai-core/releases/1.0.0/ghrab-ai-core-manifest-1.0.0.json",
  "ai-core/releases/1.0.0/ghrab-ai-core-1.0.0.js",
  "assets/brand/portal-gateway.webp",
]) {
  if (!requiredPrecache.includes(rel))
    fail(`Kritický PWA shell neobsahuje ${rel}`);
}
for (const prefix of ["tools/", "tests/", "integration/", "schemas/", "ai-core/"]) {
  if (optionalPrecache.some((rel) => rel.startsWith(prefix)))
    fail(`Volitelný precache nemá obsahovat ${prefix}`);
}
for (const file of distFiles.filter((f) =>
  /\.(html|js|json|webmanifest|css|md)$/.test(f),
)) {
  const text = await readFile(file, "utf8");
  if (text.includes("__APP_VERSION__"))
    fail(`V buildu zůstal token verze: ${path.relative(dist, file)}`);
  if (file.endsWith(".ghrab-access.json"))
    fail(
      `Ve veřejném buildu je přístupový soubor: ${path.relative(dist, file)}`,
    );
}

if (errors.length) {
  console.error("\nVALIDACE SELHALA:");
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}
console.log("\nVšechny kontroly AI Studio GHRAB prošly.");
