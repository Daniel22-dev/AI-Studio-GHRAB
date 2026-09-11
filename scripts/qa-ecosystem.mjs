#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  evaluateAutoPromotion,
  promotionEntryById,
  validatePromotionPolicy,
} from "./release-promotion.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cfg = path.join(root, "src", "config");
const read = (file) => readFile(file, "utf8").then(JSON.parse);
const argValue = (name) => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] || null : null;
};

const [
  pkg,
  studioConsumer,
  apps,
  consumers,
  readiness,
  sources,
  deployment,
  schoolDeployment,
  bundle,
  wave,
  localApps,
  syncReport,
  promotionPolicy,
] = await Promise.all([
  read(path.join(root, "package.json")),
  read(path.join(root, "ghrab-platform.consumer.json")),
  read(path.join(cfg, "apps.generated.json")),
  read(path.join(cfg, "platform-consumers.json")),
  read(path.join(cfg, "ai-readiness.generated.json")),
  read(path.join(cfg, "sources.json")),
  read(path.join(cfg, "deployment.json")),
  read(path.join(cfg, "deployment.school-server.json")),
  read(path.join(cfg, "access-config-bundle.json")),
  read(path.join(cfg, "release-wave.json")),
  read(path.join(cfg, "apps.local.json")),
  read(path.join(cfg, "sync-report.json")),
  read(path.join(cfg, "release-promotion-policy.json")),
]);

const errors = [];
const fail = (message) => errors.push(message);
const semver = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;
const requireSourceVerification = process.argv.includes("--require-source-verification");
const allowAutoPromotion = process.argv.includes("--allow-auto-promotion");
const promotionReportPath = argValue("--promotion-report");

const parse = (value) => String(value || "").split(/[+-]/, 1)[0].split(".").map(Number);
const cmp = (a, b) => {
  const left = parse(a);
  const right = parse(b);
  if (left.length !== 3 || right.length !== 3 || [...left, ...right].some((number) => !Number.isInteger(number))) return null;
  for (let index = 0; index < 3; index += 1) {
    if (left[index] !== right[index]) return left[index] > right[index] ? 1 : -1;
  }
  return 0;
};
const sat = (version, range) =>
  semver.test(version || "") &&
  String(range || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .every((part) => {
      const match = part.match(/^(>=|>|<=|<|=)?(\d+\.\d+\.\d+)$/);
      if (!match) return true;
      const comparison = cmp(version, match[2]);
      if (comparison == null) return false;
      const operator = match[1] || "=";
      if (operator === ">=") return comparison >= 0;
      if (operator === ">") return comparison > 0;
      if (operator === "<=") return comparison <= 0;
      if (operator === "<") return comparison < 0;
      return comparison === 0;
    });
const uniq = (rows, key, label) => {
  const map = new Map();
  for (const row of rows || []) {
    const value = row?.[key];
    if (!value || map.has(value)) fail(`${label}: chybi nebo je duplicitni ${key} ${value || "?"}.`);
    else map.set(value, row);
  }
  return map;
};
const normalizeBridge = (value) => (value === "ghrab-studio-handoff-v2" ? 2 : value);
const normalizeArtifact = (value) => (value === "ghrab-artifact-envelope-v1" ? 1 : value);

if (!Array.isArray(apps)) fail("apps.generated musi byt pole.");
if (!Array.isArray(sources)) fail("sources musi byt pole.");
if (Array.isArray(apps) && Array.isArray(sources) && apps.length !== sources.length)
  fail(`apps.generated musi odpovidat poctu zdroju (${sources.length}), ma ${apps.length}.`);
if (!Array.isArray(consumers)) fail("platform-consumers musi byt pole.");
if (Array.isArray(consumers) && Array.isArray(apps) && consumers.length !== apps.length + 1)
  fail(`platform-consumers musi obsahovat AI Studio + ${apps.length} aplikaci, ma ${consumers.length}.`);

const appBy = uniq(apps, "id", "apps.generated");
const consumerBy = uniq(consumers, "id", "platform-consumers");
const sourceBy = uniq(sources, "id", "sources");
const readinessBy = uniq(readiness?.applications, "appId", "ai-readiness");
const reportBy = uniq(syncReport?.sources, "id", "sync-report");
const ids = [...appBy.keys()].sort();

for (const [label, set] of [
  ["sources", [...sourceBy.keys()].sort()],
  ["readiness", [...readinessBy.keys()].sort()],
  ["platform-consumers", [...consumerBy.keys()].filter((id) => id !== "ai-studio").sort()],
]) {
  if (JSON.stringify(set) !== JSON.stringify(ids)) fail(`${label}: sada appId neodpovida apps.generated.`);
}

for (const policyError of validatePromotionPolicy(promotionPolicy, ids)) fail(policyError);
if (allowAutoPromotion && !requireSourceVerification)
  fail("Auto-promotion je povoleno pouze spolu s --require-source-verification.");
const promotionBy = promotionEntryById(promotionPolicy);

const caches = new Set();
const stores = new Set();
for (const app of apps || []) {
  const consumer = consumerBy.get(app.id);
  const ready = readinessBy.get(app.id);
  const source = sourceBy.get(app.id);
  if (!consumer || !ready || !source) continue;
  const platform = app.platform || {};
  const consumerPlatform = consumer.platform || {};
  const range = platform.requiredPlatformRange || app.compatibility?.platformRange;
  for (const [actual, expected, name] of [
    [consumer.version, app.version, "version"],
    [ready.appVersion, app.version, "readiness appVersion"],
    [consumer.paths?.app, app.launchUrl, "launch URL"],
    [consumer.paths?.manual, app.manualUrl, "manual URL"],
    [consumerPlatform.contract, platform.contract, "platform contract"],
    [consumerPlatform.requiredPlatformRange, range, "required platform range"],
    [consumerPlatform.platformVersion, platform.platformVersion, "platform version"],
    [consumerPlatform.brandVersion, platform.brandVersion, "brand version"],
    [consumerPlatform.storagePrefix, platform.storagePrefix, "storage prefix"],
    [normalizeBridge(consumerPlatform.studioBridge), normalizeBridge(platform.studioBridge), "Studio Bridge"],
    [normalizeArtifact(consumerPlatform.artifactEnvelope), normalizeArtifact(platform.artifactEnvelope), "artifact envelope"],
    [consumer.cacheName, platform.cacheName, "cache name"],
  ]) {
    if (actual !== expected) fail(`${app.id}: ${name} drift (${actual ?? "?"} != ${expected ?? "?"}).`);
  }
  if (!semver.test(app.version || "")) fail(`${app.id}: neplatna verze aplikace.`);
  if (!sat(platform.platformVersion, range)) fail(`${app.id}: platform ${platform.platformVersion || "?"} nesplnuje ${range || "?"}.`);
  if (platform.cacheName !== `ghrab-${app.id}-v${app.version}`) fail(`${app.id}: cacheName neodpovida appId/verzi.`);
  if (platform.storagePrefix !== `ghrab.${app.id}.`) fail(`${app.id}: storagePrefix neodpovida appId.`);
  if (caches.has(platform.cacheName)) fail(`${app.id}: duplicitni cacheName ${platform.cacheName}.`);
  if (stores.has(platform.storagePrefix)) fail(`${app.id}: duplicitni storagePrefix ${platform.storagePrefix}.`);
  caches.add(platform.cacheName);
  stores.add(platform.storagePrefix);
  if (String(source.repository || "").toLowerCase() !== String(app.repository || "").toLowerCase())
    fail(`${app.id}: source repository neodpovida manifestu.`);
}

const studio = consumerBy.get("ai-studio");
if (!studio) fail("platform-consumers nema ai-studio.");
else {
  if (studio.version !== pkg.version || studioConsumer.appVersion !== pkg.version)
    fail("AI Studio version drift package/consumer/registry.");
  if (studio.platform?.platformVersion !== studioConsumer.platform?.version)
    fail("AI Studio platform version drift.");
  if (studio.platform?.requiredPlatformRange !== studioConsumer.platform?.requiredRange)
    fail("AI Studio required platform range drift.");
  if (studio.cacheName !== studioConsumer.cache?.name) fail("AI Studio cacheName drift.");
}

if (deployment.sharedAccessVersion !== bundle.version || schoolDeployment.sharedAccessVersion !== bundle.version)
  fail("sharedAccessVersion neni shodna s podepsanym access bundle v obou aktivnich profilech.");
if (readiness?.summary?.totalApps !== apps.length) fail("AI readiness summary nema stejny pocet aplikaci jako registry.");

if (wave?.schema !== "ghrab-platform-release-wave-v1") fail("release-wave.json ma neplatne schema.");
if (wave?.status !== "candidate") fail("Platform 1.1.2 wave musi zustat candidate do spolecneho overeni.");
if (wave?.platformVersion !== "1.1.2" || wave?.requiredPlatformRange !== ">=1.1.2 <2.0.0")
  fail("release-wave.json nezamyka Platform 1.1.2 a required range.");
const waveBy = uniq(wave?.applications, "id", "release-wave");
if (JSON.stringify([...waveBy.keys()].sort()) !== JSON.stringify(ids))
  fail("release-wave: sada appId neodpovida apps.generated.");

const promotionDecisions = [];
for (const app of apps || []) {
  const expected = waveBy.get(app.id);
  if (!expected) continue;
  const platform = app.platform || {};
  const decision = evaluateAutoPromotion({
    app,
    waveApp: expected,
    source: sourceBy.get(app.id),
    sourceReport: reportBy.get(app.id),
    policyEntry: promotionBy.get(app.id),
    wave,
    enabled: allowAutoPromotion,
  });
  promotionDecisions.push(decision);

  if (app.version !== expected.version && decision.status !== "ELIGIBLE") {
    fail(
      `${app.id}: wave version drift (${app.version} != ${expected.version}); auto-promotion BLOCKED [${decision.reasonCode}]: ${decision.reason}`,
    );
  }
  if (platform.platformVersion !== wave.platformVersion)
    fail(`${app.id}: wave platform drift (${platform.platformVersion || "?"} != ${wave.platformVersion}).`);
  if (platform.requiredPlatformRange !== wave.requiredPlatformRange)
    fail(`${app.id}: wave required range drift.`);
  if (app.compatibility?.platformRange !== wave.requiredPlatformRange)
    fail(`${app.id}: compatibility platform range drift.`);
}

if (!Array.isArray(localApps)) fail("apps.local.json musi byt pole.");
else {
  for (const local of localApps) {
    const generated = appBy.get(local.id);
    if (!generated) {
      fail(`apps.local: nezname appId ${local.id}.`);
      continue;
    }
    for (const [actual, expected, name] of [
      [local.version, generated.version, "version"],
      [String(local.repository || "").toLowerCase(), String(generated.repository || "").toLowerCase(), "repository"],
      [local.platform?.contract, generated.platform?.contract, "platform contract"],
      [local.platform?.requiredPlatformRange, generated.platform?.requiredPlatformRange, "required platform range"],
      [local.platform?.platformVersion, generated.platform?.platformVersion, "platform version"],
      [local.platform?.storagePrefix, generated.platform?.storagePrefix, "storage prefix"],
      [local.platform?.cacheName, generated.platform?.cacheName, "cache name"],
      [local.compatibility?.platformRange, generated.compatibility?.platformRange, "compatibility range"],
    ]) {
      if (actual !== expected) fail(`${local.id}: apps.local ${name} drift (${actual ?? "?"} != ${expected ?? "?"}).`);
    }
  }
}

if (requireSourceVerification) {
  if (syncReport?.schema !== "ai-studio-sync-report-v1" || syncReport?.generated !== true)
    fail("Deploy source gate vyzaduje skutecne vygenerovany sync-report.");
  if (syncReport?.counts?.verified !== apps.length || syncReport?.counts?.snapshot !== 0)
    fail(`Deploy source gate vyzaduje ${apps.length}/${apps.length} overenych zdroju a 0 snapshotu.`);
  for (const app of apps || []) {
    const item = reportBy.get(app.id);
    if (!item) continue;
    if (item.ok !== true || !["deployment", "repository"].includes(item.verification))
      fail(`${app.id}: zdroj neni overen z deploymentu/repozitare.`);
    if (item.version !== app.version || item.sourceVersion !== app.version)
      fail(`${app.id}: sync-report source version drift (${item.version || "?"}/${item.sourceVersion || "?"} != ${app.version}).`);
  }
}

const eligiblePromotions = promotionDecisions.filter((decision) => decision.status === "ELIGIBLE");
if (promotionReportPath) {
  const absoluteReportPath = path.resolve(root, promotionReportPath);
  await mkdir(path.dirname(absoluteReportPath), { recursive: true });
  await writeFile(
    absoluteReportPath,
    `${JSON.stringify(
      {
        schema: "ghrab-release-promotion-report-v1",
        generatedAt: new Date().toISOString(),
        mode: promotionPolicy.mode,
        atomic: promotionPolicy.atomic,
        releaseWave: wave.wave,
        platformVersion: wave.platformVersion,
        sourceVerificationRequired: requireSourceVerification,
        autoPromotionEnabled: allowAutoPromotion,
        decisions: promotionDecisions,
        gateErrors: errors,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
}

for (const decision of eligiblePromotions) {
  console.log(
    `AUTO-PROMOTION ${decision.appId}: ${decision.fromVersion} -> ${decision.toVersion} ELIGIBLE (${decision.assuranceBaseline}, live deployment verified).`,
  );
}

if (errors.length) {
  console.error("GHRAB ecosystem gate: FAIL");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `GHRAB ecosystem gate: PASS (${apps.length} aplikaci + AI Studio, Platform ${wave.platformVersion}; ` +
    `${eligiblePromotions.length} auto-patch promotion${requireSourceVerification ? `, zdroje ${apps.length}/${apps.length} overeny` : ""}).`,
);
