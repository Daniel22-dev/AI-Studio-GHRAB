import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const configDir = path.join(root, "src", "config");
const offline = process.argv.includes("--offline");
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
    return validate(await response.json(), source.id, source);
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
    const app = localIcon ? { ...fetched, icon: localIcon } : fetched;
    apps.push(app);
    reportSources.push({
      id: source.id,
      url: source.url,
      ok: true,
      version: app.version,
    });
  } catch (error) {
    const app = fallbackById.get(source.id);
    if (!app)
      throw new Error(`Chybí fallback pro ${source.id}: ${error.message}`);
    apps.push(validate(app, source.id, source));
    reportSources.push({
      id: source.id,
      url: source.url,
      ok: false,
      version: app.version,
      error: error.message,
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
  generatedAt: new Date().toISOString(),
  mode,
  fallbackSnapshotConfirmed: mode === "fallback" && offline,
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
