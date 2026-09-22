import { readFile, writeFile } from "node:fs/promises";

function nextPatch(version) {
  const match = String(version || "").match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) throw new Error(`Invalid semver: ${version}`);
  return `${match[1]}.${match[2]}.${Number(match[3]) + 1}`;
}

const pkgPath = "package.json";
const lockPath = "package-lock.json";
const consumerPath = "ghrab-platform.consumer.json";
const indexPath = "src/index.html";

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
if (consumer.serviceWorker?.cache?.name) {
  consumer.serviceWorker.cache.name = consumer.serviceWorker.cache.name.replace(oldVersion, newVersion);
}
await writeFile(consumerPath, `${JSON.stringify(consumer, null, 2)}\n`, "utf8");

let html = await readFile(indexPath, "utf8");
html = html.replaceAll(oldVersion, newVersion);
await writeFile(indexPath, html, "utf8");

console.log(`AI Studio version bumped: ${oldVersion} -> ${newVersion}`);
