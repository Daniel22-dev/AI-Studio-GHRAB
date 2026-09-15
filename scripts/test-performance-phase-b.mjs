#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const app = await readFile(path.join(root, "src/app.js"), "utf8");
const styles = await readFile(path.join(root, "src/styles.css"), "utf8");

function block(from, to) {
  const start = app.indexOf(from);
  const end = app.indexOf(to, start + from.length);
  assert.ok(start >= 0 && end > start, `Missing source block: ${from}`);
  return app.slice(start, end);
}

const fingerprintSource = block(
  "function operationalStatusFingerprint(snapshot) {",
  "async function updateOperationalStatus(targetId, status) {",
);
const fingerprint = new Function(
  `${fingerprintSource}\nreturn operationalStatusFingerprint;`,
)();
const baseSnapshot = {
  connected: true,
  studio: { status: "operational", updatedAt: "2026-09-15T08:00:00Z" },
  apps: {
    generator: { status: "operational", updatedAt: "2026-09-15T08:00:00Z" },
    ludus: { status: "maintenance", updatedAt: "2026-09-15T08:00:00Z" },
  },
  updatedAt: "2026-09-15T08:00:00Z",
};
const timestampOnly = structuredClone(baseSnapshot);
timestampOnly.updatedAt = "2026-09-15T08:01:00Z";
timestampOnly.apps.ludus.updatedAt = "2026-09-15T08:01:00Z";
assert.equal(fingerprint(baseSnapshot), fingerprint(timestampOnly));
const statusChanged = structuredClone(baseSnapshot);
statusChanged.apps.ludus.status = "outage";
assert.notEqual(fingerprint(baseSnapshot), fingerprint(statusChanged));
const disconnected = structuredClone(baseSnapshot);
disconnected.connected = false;
assert.notEqual(fingerprint(baseSnapshot), fingerprint(disconnected));

const refresh = block(
  "function startOperationalStatusRefresh() {",
  "function currentCoreAppIds() {",
);
assert.ok(refresh.includes("operationalStatusFingerprint(operationalStatusSnapshot)"));
assert.ok(refresh.includes("if (refreshing) return"));
assert.ok(refresh.includes("finally"));
assert.equal((refresh.match(/renderHomeCards\(\)/g) || []).length, 1);
assert.ok(
  refresh.indexOf("operationalStatusFingerprint(operationalStatusSnapshot) === previous") <
    refresh.indexOf("renderHomeCards()"),
);

const card = block("function portalAppCard(", "function renderExtraApps(apps) {");
assert.ok(card.includes('if (index >= 4) icon.loading = "lazy"'));
assert.ok(
  card.indexOf('icon.loading = "lazy"') < card.indexOf("icon.src ="),
  "lazy-loading hint must be set before src",
);
assert.match(
  styles,
  /\.extra-app-card\s*\{[^}]*content-visibility:\s*auto;[^}]*contain-intrinsic-size:\s*auto\s+238px;/s,
);

const selectorSource = block(
  "function selectCoreApps(apps) {",
  "let portalLaunchInProgress = false;",
);
function selectFor(apps, favorites) {
  const factory = new Function(
    "getFavoriteApps",
    `${selectorSource}\nreturn selectCoreApps;`,
  );
  return factory(() => favorites)(apps);
}

for (const count of [20, 30, 50]) {
  const apps = Array.from({ length: count }, (_, index) => ({ id: `app-${index + 1}` }));
  const favorites = [apps[count - 1].id, apps[Math.floor(count / 2)].id, apps[5].id, apps[0].id];
  const { core, extra } = selectFor(apps, favorites);
  assert.equal(core.length, 4, `${count}: core size`);
  assert.equal(extra.length, count - 4, `${count}: extra size`);
  assert.deepEqual(core.map((item) => item.id), favorites, `${count}: favorite order`);
  const ids = [...core, ...extra].map((item) => item.id);
  assert.equal(new Set(ids).size, count, `${count}: unique registry entries`);
  assert.deepEqual(new Set(ids), new Set(apps.map((item) => item.id)), `${count}: registry preserved`);
}

console.log(
  "Performance Phase B tests: PASS (no-op refresh suppression, lazy/off-screen extra cards, 20/30/50 registry scaling).",
);
