import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";

function git(...args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function semver(value) {
  if (!/^\d+\.\d+\.\d+$/.test(String(value || ""))) {
    throw new Error(`Invalid semver: ${value}`);
  }
  return String(value);
}

const current = JSON.parse(await readFile("package.json", "utf8"));
const currentVersion = semver(current.version);

const lock = JSON.parse(await readFile("package-lock.json", "utf8"));
const consumer = JSON.parse(await readFile("ghrab-platform.consumer.json", "utf8"));
const indexHtml = await readFile("src/index.html", "utf8");
const acceptance = JSON.parse(await readFile("src/config/release-acceptance.json", "utf8"));
const reporterConfig = JSON.parse(await readFile("reporter-test.config.json", "utf8"));
const reporterAdapter = await readFile("src/tests/error-reporter-adapter.js", "utf8");
const reporterAdapterVersion = reporterAdapter.match(/appVersion:\s*[\'\"](\d+\.\d+\.\d+)[\'\"]/i)?.[1] || null;
const htmlVersion = indexHtml.match(/data-ghrab-app-version=["']([^"']+)["']/i)?.[1] || null;
const versionRefs = [
  ["package-lock.version", lock.version],
  ["package-lock.packages[\"\"].version", lock.packages?.[""]?.version],
  ["consumer.appVersion", consumer.appVersion],
  ["src/index.html", htmlVersion],
  ["release-acceptance.appVersion", acceptance.appVersion],
  ["reporter-test.config.version", reporterConfig.version],
  ["reporter-adapter.appVersion", reporterAdapterVersion],
];
const mismatches = versionRefs.filter(([, value]) => value !== currentVersion);
if (mismatches.length) {
  console.error("Release version gate: inconsistent version references.");
  for (const [label, value] of mismatches) console.error(` - ${label}: ${value ?? "missing"} (expected ${currentVersion})`);
  process.exit(1);
}

let baseVersion = null;
try {
  git("fetch", "--no-tags", "origin", "main");
  const basePackage = JSON.parse(git("show", "origin/main:package.json"));
  baseVersion = semver(basePackage.version);
} catch (error) {
  console.error("Unable to resolve origin/main package version.");
  throw error;
}

const changed = git("diff", "--name-only", "origin/main..HEAD")
  .split(/\r?\n/)
  .map((item) => item.trim())
  .filter(Boolean);

const runtimePatterns = [
  /^src\//,
  /^platform\//,
  /^security\//,
  /^ghrab-platform\.consumer\.json$/,
];
const nonRuntimePatterns = [
  /^src\/tests\//,
];
const runtimeChanged = changed.filter(
  (path) =>
    runtimePatterns.some((pattern) => pattern.test(path)) &&
    !nonRuntimePatterns.some((pattern) => pattern.test(path)),
);

if (!runtimeChanged.length) {
  console.log(`Release version gate: no runtime delta against main; ${currentVersion} accepted.`);
  process.exit(0);
}

if (currentVersion === baseVersion) {
  console.error("Release version gate: BLOCKED.");
  console.error(`Runtime files changed but version is still ${currentVersion}.`);
  console.error("Changed runtime files:");
  for (const path of runtimeChanged) console.error(` - ${path}`);
  console.error("Bump the release version before promotion (normally npm run release:patch).");
  process.exit(1);
}

console.log(`Release version gate: PASS ${baseVersion} -> ${currentVersion}; runtime delta=${runtimeChanged.length} file(s).`);
