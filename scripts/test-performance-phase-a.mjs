#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  MOTION_STORAGE_KEY,
  collectMotionSignals,
  normaliseMotionPreference,
  readMotionPreference,
  resolveAutomaticMotion,
  resolveMotionPreference,
  writeMotionPreference,
} from "../src/modules/motion-policy.js";
import { evaluateFrameSample } from "../src/modules/portal-effects.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function storage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, String(value)),
    value: (key) => values.get(key),
  };
}

assert.equal(normaliseMotionPreference("FULL"), "full");
assert.equal(normaliseMotionPreference("invalid"), "auto");

const legacyStore = storage({ "ghrab.motion": "lite" });
assert.equal(readMotionPreference(legacyStore), "lite");
assert.equal(writeMotionPreference("full", legacyStore), true);
assert.equal(legacyStore.value(MOTION_STORAGE_KEY), "full");

assert.deepEqual(
  resolveAutomaticMotion({ reducedMotion: true }),
  { mode: "off", reason: "reduced-motion", calibrate: false },
);
assert.equal(resolveAutomaticMotion({ saveData: true }).mode, "lite");
assert.equal(
  resolveAutomaticMotion({ hardwareConcurrency: 4, deviceMemory: 16 }).mode,
  "lite",
);
assert.equal(
  resolveAutomaticMotion({ hardwareConcurrency: 16, deviceMemory: 16 }).mode,
  "full",
);
assert.equal(
  resolveAutomaticMotion({ hardwareConcurrency: 0, deviceMemory: 0 }).mode,
  "lite",
);
assert.equal(
  resolveMotionPreference({
    preference: "full",
    signals: { reducedMotion: true },
  }).mode,
  "off",
);
assert.equal(
  resolveMotionPreference({
    preference: "auto",
    signals: { hardwareConcurrency: 12, deviceMemory: 8 },
    runtimeProfile: { mode: "lite", reason: "runtime-calibration" },
  }).mode,
  "lite",
);

const fakeWindow = {
  matchMedia(query) {
    return { matches: query.includes("max-width") };
  },
};
const signals = collectMotionSignals({
  windowRef: fakeWindow,
  navigatorRef: { hardwareConcurrency: 8, deviceMemory: 8 },
});
assert.equal(signals.compactViewport, true);
assert.equal(signals.hardwareConcurrency, 8);

const smooth = Array.from({ length: 70 }, (_, index) => index * 16.7);
const pressured = Array.from({ length: 40 }, (_, index) => index * 34);
assert.equal(evaluateFrameSample(smooth).recommendedMode, "full");
assert.equal(evaluateFrameSample(pressured).recommendedMode, "lite");
assert.equal(evaluateFrameSample([0, 16, 32]).recommendedMode, "lite");

const app = await readFile(path.join(root, "src/app.js"), "utf8");
const effects = await readFile(
  path.join(root, "src/modules/portal-effects.js"),
  "utf8",
);
const styles = await readFile(path.join(root, "src/styles.css"), "utf8");
const prepaint = await readFile(
  path.join(root, "src/startup-prepaint.js"),
  "utf8",
);

assert.ok(app.includes('document.addEventListener("ghrab:motion-calibration"'));
assert.ok(app.includes("writeMotionPreference(state.motion)"));
assert.ok(effects.includes("IntersectionObserver"));
assert.ok(effects.includes('document.addEventListener("visibilitychange", update'));
assert.ok(effects.includes('root.dataset.portalActive = active ? "true" : "false"'));
assert.ok(styles.includes('html[data-portal-active="false"] .portal-stage *'));
assert.ok(prepaint.includes("navigator.hardwareConcurrency"));
assert.ok(prepaint.includes("navigator.connection?.saveData"));

console.log(
  "Performance Phase A tests: PASS (adaptive AUTO, canonical preference, lifecycle pause, runtime downgrade).",
);
