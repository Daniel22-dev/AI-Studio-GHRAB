#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const configDir = path.join(root, "src", "config");
const checkOnly = process.argv.includes("--check");
const readJson = (name) => readFile(path.join(configDir, name), "utf8").then(JSON.parse);

const [generated, fallback, wave, report] = await Promise.all([
  readJson("apps.generated.json"),
  readJson("apps.fallback.json"),
  readJson("release-wave.json"),
  readJson("sync-report.json"),
]);

const fail = (message) => {
  console.error(`RUNTIME FALLBACK: FAIL — ${message}`);
  process.exit(1);
};

const mapUnique = (rows, key, label) => {
  if (!Array.isArray(rows)) fail(`${label} must be an array`);
  const map = new Map();
  for (const row of rows) {
    const value = row?.[key];
    if (!value || map.has(value)) fail(`${label}: missing or duplicate ${key} ${value || "?"}`);
    map.set(value, row);
  }
  return map;
};

const sameIds = (left, right) =>
  JSON.stringify([...left.keys()].sort()) === JSON.stringify([...right.keys()].sort());

if (wave?.schema !== "ghrab-platform-release-wave-v1") fail("release-wave schema is invalid");
if (report?.schema !== "ai-studio-sync-report-v1" || report?.generated !== true)
  fail("sync-report is not a generated verification report");

const generatedById = mapUnique(generated, "id", "apps.generated");
const fallbackById = mapUnique(fallback, "id", "apps.fallback");
const waveById = mapUnique(wave?.applications, "id", "release-wave");
const reportById = mapUnique(report?.sources, "id", "sync-report");

if (!sameIds(generatedById, waveById) || !sameIds(generatedById, reportById))
  fail("generated registry, release-wave and sync-report appId sets differ");
if (!sameIds(generatedById, fallbackById))
  fail("fallback appId set differs from generated registry");
if (report?.counts?.snapshot !== 0)
  fail(`sync-report contains ${report?.counts?.snapshot ?? "?"} snapshot source(s)`);
if (report?.counts?.verified !== generated.length)
  fail(`sync-report verified count ${report?.counts?.verified ?? "?"} does not equal registry size ${generated.length}`);

for (const app of generated) {
  const waveApp = waveById.get(app.id);
  const source = reportById.get(app.id);
  if (waveApp?.version !== app.version)
    fail(`${app.id}: generated version ${app.version} does not match release-wave ${waveApp?.version || "?"}`);
  if (app.platform?.platformVersion !== wave.platformVersion)
    fail(`${app.id}: Platform version does not match release-wave`);
  if (app.platform?.requiredPlatformRange !== wave.requiredPlatformRange)
    fail(`${app.id}: required Platform range does not match release-wave`);
  if (source?.ok !== true || !["deployment", "repository"].includes(source?.verification))
    fail(`${app.id}: source is not deployment/repository verified`);
  if (source?.version !== app.version)
    fail(`${app.id}: accepted sync-report version ${source?.version || "?"} does not match generated ${app.version}`);
  if (
    source.verification === "repository" &&
    source.sourceVersion !== app.version &&
    source.pendingReleaseCandidate !== true
  ) {
    fail(`${app.id}: repository verification drift is not an explicit pending candidate`);
  }
}

if (checkOnly) {
  if (JSON.stringify(fallback) !== JSON.stringify(generated)) {
    const drift = generated
      .filter((app) => {
        const current = fallbackById.get(app.id);
        return (
          current?.version !== app.version ||
          current?.platform?.platformVersion !== app.platform?.platformVersion ||
          current?.platform?.cacheName !== app.platform?.cacheName
        );
      })
      .map((app) => `${app.id}:${fallbackById.get(app.id)?.version || "missing"}->${app.version}`);
    fail(`fallback snapshot drift: ${drift.join(", ") || "metadata differs"}`);
  }
  console.log(`RUNTIME FALLBACK: PASS — ${generated.length} approved snapshots match apps.generated.json.`);
  process.exit(0);
}

const nonDeployment = report.sources.filter((source) => source.verification !== "deployment");
if (nonDeployment.length)
  fail(`refusing refresh without live deployment evidence for: ${nonDeployment.map((source) => source.id).join(", ")}`);
if (report?.counts?.deployment !== generated.length)
  fail("refusing refresh unless every source is deployment verified");

await writeFile(
  path.join(configDir, "apps.fallback.json"),
  JSON.stringify(generated, null, 2) + "\n",
  "utf8",
);
console.log(`RUNTIME FALLBACK: UPDATED — ${generated.length} live-verified snapshots persisted.`);
