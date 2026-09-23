import { readFile, writeFile } from "node:fs/promises";

function nextPatch(version) {
  const match = String(version || "").match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) throw new Error(`Invalid semver: ${version}`);
  return `${match[1]}.${match[2]}.${Number(match[3]) + 1}`;
}

const autoPatch = process.argv.includes("--auto-patch");

const pkgPath = "package.json";
const lockPath = "package-lock.json";
const consumerPath = "ghrab-platform.consumer.json";
const indexPath = "src/index.html";
const acceptancePath = "src/config/release-acceptance.json";
const reporterConfigPath = "reporter-test.config.json";
const reporterAdapterPath = "src/tests/error-reporter-adapter.js";
const manifestPath = "src/manifest.webmanifest";
const qaManifestPath = "qa/qa-manifest.json";
const changelogPath = "src/config/changelog.json";
const releaseDocPaths = [
  "BEZPECNOST.md",
  "AUTOMATIZACE-GITHUB.md",
  "RELEASE-CHECKLIST.md",
  "ARCHITEKTURA.md",
  "POSTUP-NAHRANI.md",
  "NAHRANI-NA-GITHUB.md",
];

const pkg = JSON.parse(await readFile(pkgPath, "utf8"));
const oldVersion = pkg.version;
const newVersion = nextPatch(oldVersion);

pkg.version = newVersion;
await writeFile(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");

const lock = JSON.parse(await readFile(lockPath, "utf8"));
lock.version = newVersion;
if (lock.packages?.[""]) lock.packages[""].version = newVersion;
await writeFile(lockPath, `${JSON.stringify(lock, null, 2)}\n`, "utf8");

const consumer = JSON.parse(await readFile(consumerPath, "utf8"));
consumer.appVersion = newVersion;
if (consumer.cache?.name) {
  consumer.cache.name = consumer.cache.name.replace(oldVersion, newVersion);
}
await writeFile(consumerPath, `${JSON.stringify(consumer, null, 2)}\n`, "utf8");

let html = await readFile(indexPath, "utf8");
html = html.replaceAll(oldVersion, newVersion);
await writeFile(indexPath, html, "utf8");

const acceptance = JSON.parse(await readFile(acceptancePath, "utf8"));
acceptance.appVersion = newVersion;
await writeFile(acceptancePath, `${JSON.stringify(acceptance, null, 2)}\n`, "utf8");

const reporterConfig = JSON.parse(await readFile(reporterConfigPath, "utf8"));
reporterConfig.version = newVersion;
await writeFile(reporterConfigPath, `${JSON.stringify(reporterConfig, null, 2)}\n`, "utf8");

let reporterAdapter = await readFile(reporterAdapterPath, "utf8");
reporterAdapter = reporterAdapter.replace(/appVersion:\s*[\'\"]\d+\.\d+\.\d+[\'\"]/, `appVersion: \'${newVersion}\'`);
await writeFile(reporterAdapterPath, reporterAdapter, "utf8");

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
manifest.version = newVersion;
if (manifest.ghrab_platform?.cache_name) manifest.ghrab_platform.cache_name = manifest.ghrab_platform.cache_name.replace(oldVersion, newVersion);
if (manifest.cache_name) manifest.cache_name = manifest.cache_name.replace(oldVersion, newVersion);
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

const qaManifest = JSON.parse(await readFile(qaManifestPath, "utf8"));
qaManifest.appVersion = newVersion;
for (const check of qaManifest.versionChecks || []) {
  if (check.expected === oldVersion) check.expected = newVersion;
}
await writeFile(qaManifestPath, `${JSON.stringify(qaManifest, null, 2)}\n`, "utf8");

const changelog = JSON.parse(await readFile(changelogPath, "utf8"));
changelog.current = newVersion;
if (autoPatch && !changelog.items?.some((item) => item?.version === newVersion)) {
  changelog.items = [
    {
      version: newVersion,
      date: new Date().toISOString().slice(0, 10),
      title: {
        cs: "Bezpečné automatické PATCH povýšení",
        en: "Safe automatic PATCH promotion"
      },
      changes: [
        {
          cs: "Ověřená PATCH změna aplikace aktualizovala release-wave a současně zvýšila patch verzi AI Studia právě jednou; duplicitní nebo bezezměnový běh verzi Studia nezvyšuje.",
          en: "A verified application PATCH update changed the release wave and bumped the AI Studio patch version exactly once; duplicate or no-change runs do not bump the Studio version."
        }
      ]
    },
    ...(changelog.items || [])
  ];
}
await writeFile(changelogPath, `${JSON.stringify(changelog, null, 2)}\n`, "utf8");

for (const releaseDocPath of releaseDocPaths) {
  let releaseDoc = await readFile(releaseDocPath, "utf8");
  const lines = releaseDoc.split(/\r?\n/);
  if (lines[0]) lines[0] = lines[0].replace(/\d+\.\d+\.\d+/, newVersion);
  const currentVersionLine = lines.findIndex((line) => line.includes("Aktuální verze:"));
  if (currentVersionLine >= 0) {
    lines[currentVersionLine] = lines[currentVersionLine].replace(/\d+\.\d+\.\d+/, newVersion);
  }
  releaseDoc = lines.join("\n");
  if (!releaseDoc.endsWith("\n")) releaseDoc += "\n";
  await writeFile(releaseDocPath, releaseDoc, "utf8");
}

console.log(`AI Studio version bumped: ${oldVersion} -> ${newVersion}${autoPatch ? " (verified auto-patch)" : ""}`);
