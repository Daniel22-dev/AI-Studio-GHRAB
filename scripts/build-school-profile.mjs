import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const sourceDist = path.join(root, "dist");
const targetDist = path.join(root, "dist-school-server");
if (!fs.existsSync(sourceDist)) throw new Error("Chybí dist/. Nejprve spusťte standardní build.");
fs.rmSync(targetDist, { recursive: true, force: true });
fs.cpSync(sourceDist, targetDist, { recursive: true });

function walk(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full)); else files.push(full);
  }
  return files;
}
function readJson(file) { return JSON.parse(fs.readFileSync(file, "utf8")); }
function writeJson(file, value) { fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`); }
function trailingSlash(value) { return String(value || "/").replace(/\/+$/, "") + "/"; }
function rewriteApp(manifest, deployment) {
  const base = trailingSlash(deployment.appBaseUrls?.[manifest.id]);
  if (!base.startsWith("/")) throw new Error(`Chybí same-origin school cesta pro aplikaci ${manifest.id}.`);
  const next = { ...manifest, launchUrl: base, manualUrl: `${base}manual/` };
  if (next.aiCore && typeof next.aiCore === "object") {
    next.aiCore = { ...next.aiCore };
    if (next.aiCore.status === "integrated-p1" || next.aiCore.coreVersion) next.aiCore.operationsManifestUrl = `${base}ai-operations.json`;
    else delete next.aiCore.operationsManifestUrl;
  }
  return next;
}

let files = walk(targetDist);
const schoolProfiles = files.filter((file) => file.endsWith(`${path.sep}config${path.sep}deployment.school-server.json`));
if (!schoolProfiles.length) throw new Error("Build neobsahuje config/deployment.school-server.json.");
for (const profile of schoolProfiles) fs.copyFileSync(profile, path.join(path.dirname(profile), "deployment.json"));
const configDir = path.dirname(schoolProfiles[0]);
const deployment = readJson(path.join(configDir, "deployment.json"));
if (deployment.appId !== "ai-studio" || deployment.profile !== "school-server" || deployment.authMode !== "server-session") {
  throw new Error("Aktivní school-server deployment kontrakt Studia není úplný.");
}

files = walk(targetDist);
for (const runtimeProfile of files.filter((file) => file.endsWith(`${path.sep}runtime-config.school-server.js`))) {
  fs.copyFileSync(runtimeProfile, path.join(path.dirname(runtimeProfile), "runtime-config.js"));
}
for (const manifestPath of files.filter((file) => file.endsWith(`${path.sep}manifest.webmanifest`))) {
  const manifest = readJson(manifestPath);
  manifest.id = "./"; manifest.start_url = "./"; manifest.scope = "./";
  writeJson(manifestPath, manifest);
}

for (const name of ["apps.generated.json", "apps.fallback.json"]) {
  const file = path.join(configDir, name);
  const apps = readJson(file).map((app) => rewriteApp(app, deployment));
  writeJson(file, apps);
}
const sourcesFile = path.join(configDir, "sources.json");
if (fs.existsSync(sourcesFile)) {
  const sources = readJson(sourcesFile).map((item) => ({
    ...item,
    url: `${trailingSlash(deployment.appBaseUrls?.[item.id])}studio-manifest.json`,
  }));
  writeJson(sourcesFile, sources);
}
const readinessFile = path.join(configDir, "ai-readiness.generated.json");
if (fs.existsSync(readinessFile)) {
  const readiness = readJson(readinessFile);
  readiness.applications = (readiness.applications || []).map((item) => ({
    ...item,
    operationsManifestUrl: item.operationsManifestUrl
      ? `${trailingSlash(deployment.appBaseUrls?.[item.appId])}ai-operations.json`
      : null,
  }));
  writeJson(readinessFile, readiness);
}
const syncReportFile = path.join(configDir, "sync-report.json");
if (fs.existsSync(syncReportFile)) {
  const report = readJson(syncReportFile);
  if (Array.isArray(report.sources)) report.sources = report.sources.map((item) => ({
    ...item,
    url: `${trailingSlash(deployment.appBaseUrls?.[item.id])}studio-manifest.json`,
  }));
  writeJson(syncReportFile, report);
}
const aiCoreFile = path.join(configDir, "ai-core.json");
if (fs.existsSync(aiCoreFile)) {
  const aiCore = readJson(aiCoreFile);
  aiCore.publicBaseUrl = trailingSlash(deployment.studioBaseUrl);
  aiCore.migrationKitUrl = "ai-core/migration/ghrab-ai-migration-kit-1.0.3.zip";
  writeJson(aiCoreFile, aiCore);
}
for (const stale of files.filter((file) => file.endsWith(`${path.sep}deployment.school-server-p0.json`))) fs.rmSync(stale, { force: true });

const pkg = readJson(path.join(root, "package.json"));
writeJson(path.join(targetDist, "server-ready-build-info.json"), {
  schema: "ghrab-server-ready-build-v1",
  app: pkg.name,
  appId: deployment.appId,
  version: pkg.version,
  phase: "P3",
  profile: "school-server",
  builtAt: new Date().toISOString(),
  activeAuthMode: deployment.authMode,
  activeAiTransport: deployment.aiTransport,
  telemetryMode: deployment.telemetryMode,
  appBaseUrl: trailingSlash(deployment.appBaseUrl),
  apiBaseUrl: deployment.apiBaseUrl,
  containsSecrets: false,
  localProviderKeysAllowed: false,
  serverSessionReady: deployment.features?.serverSessionReady === true,
  schoolGatewayReady: false,
  aiCoreVersion: "1.0.0",
  contractVersion: "1",
  localRegistryUrls: true,
});
console.log(`${pkg.name} ${pkg.version}: dist-school-server/ sestaven s lokálním registrem P3.`);
