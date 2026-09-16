#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const reportPath = path.resolve(root, process.argv[2] || "qa-results/release-promotion-report.json");
const wavePath = path.resolve(root, process.argv[3] || "src/config/release-wave.json");

const readJson = (file) => readFile(file, "utf8").then(JSON.parse);
const [report, wave] = await Promise.all([readJson(reportPath), readJson(wavePath)]);

const fail = (message) => {
  console.error(`AUTO-PROMOTION APPLY: FAIL - ${message}`);
  process.exit(1);
};

if (report?.schema !== "ghrab-release-promotion-report-v1") fail("neplatne schema promotion reportu");
if (report?.autoPromotionEnabled !== true) fail("promotion report nema povolene auto-promotion");
if (report?.sourceVerificationRequired !== true) fail("promotion report nevychazi z povinneho overeni zdroju");
if (!Array.isArray(report?.gateErrors)) fail("promotion report nema gateErrors pole");
if (report.gateErrors.length) fail(`promotion gate obsahuje ${report.gateErrors.length} chybu/chyb`);
if (wave?.schema !== "ghrab-platform-release-wave-v1") fail("neplatne schema release wave");
if (wave?.wave !== report?.releaseWave) fail("promotion report patri k jine release wave");
if (wave?.platformVersion !== report?.platformVersion) fail("promotion report patri k jine platformni verzi");
if (!Array.isArray(wave?.applications)) fail("release wave nema applications pole");
if (!Array.isArray(report?.decisions)) fail("promotion report nema decisions pole");

const eligible = report.decisions.filter((decision) => decision?.status === "ELIGIBLE");
if (!eligible.length) {
  console.log("AUTO-PROMOTION APPLY: no eligible patch promotions; release wave unchanged.");
  process.exit(0);
}

const waveById = new Map(wave.applications.map((entry) => [entry?.id, entry]));
const seen = new Set();
for (const decision of eligible) {
  if (!decision?.appId || seen.has(decision.appId)) fail(`chybi nebo je duplicitni appId ${decision?.appId || "?"}`);
  seen.add(decision.appId);
  if (decision.change !== "patch") fail(`${decision.appId}: povolena je pouze patch promotion`);
  if (decision.reasonCode !== "SAFE_PATCH_DEPLOYMENT") fail(`${decision.appId}: neocekavany reasonCode ${decision.reasonCode || "?"}`);
  if (decision.verification !== "deployment") fail(`${decision.appId}: chybi live deployment verification`);
  const entry = waveById.get(decision.appId);
  if (!entry) fail(`${decision.appId}: chybi v release wave`);
  if (entry.version !== decision.fromVersion) {
    fail(`${decision.appId}: release wave drift (${entry.version || "?"} != ${decision.fromVersion || "?"})`);
  }
  if (!/^\d+\.\d+\.\d+$/.test(String(decision.toVersion || ""))) fail(`${decision.appId}: cilova verze neni stabilni SemVer`);
}

const promoted = new Map(eligible.map((decision) => [decision.appId, decision.toVersion]));
const nextWave = {
  ...wave,
  applications: wave.applications.map((entry) =>
    promoted.has(entry.id) ? { ...entry, version: promoted.get(entry.id) } : entry,
  ),
};

await writeFile(wavePath, `${JSON.stringify(nextWave, null, 2)}\n`, "utf8");
for (const decision of eligible) {
  console.log(`AUTO-PROMOTION APPLY ${decision.appId}: ${decision.fromVersion} -> ${decision.toVersion}`);
}
console.log(`AUTO-PROMOTION APPLY: PASS (${eligible.length} patch promotion${eligible.length === 1 ? "" : "s"}).`);
