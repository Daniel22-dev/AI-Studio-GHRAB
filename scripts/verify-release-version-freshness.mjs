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
const runtimeChanged = changed.filter((path) => runtimePatterns.some((pattern) => pattern.test(path)));

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
