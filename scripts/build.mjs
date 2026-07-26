import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const src = path.join(root, "src");
const dist = path.join(root, "dist");
const pkg = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(full)));
    else files.push(full);
  }
  return files;
}

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await cp(src, dist, { recursive: true });

for (const file of await walk(dist)) {
  if (!/\.(?:html|js|json|webmanifest|css|md)$/.test(file)) continue;
  const content = await readFile(file, "utf8");
  if (content.includes("__APP_VERSION__")) {
    await writeFile(
      file,
      content.replaceAll("__APP_VERSION__", pkg.version),
      "utf8",
    );
  }
}

const syncReport = JSON.parse(
  await readFile(path.join(src, "config", "sync-report.json"), "utf8"),
);
const apps = JSON.parse(
  await readFile(path.join(src, "config", "apps.generated.json"), "utf8"),
);
await writeFile(
  path.join(dist, "build-info.json"),
  JSON.stringify(
    {
      version: pkg.version,
      builtAt: new Date().toISOString(),
      syncMode: syncReport.mode,
      apps: apps.map((app) => ({ id: app.id, version: app.version })),
    },
    null,
    2,
  ) + "\n",
  "utf8",
);

const allCacheFiles = (await walk(dist))
  .filter((file) => file !== path.join(dist, "sw.js"))
  .map((file) => `./${path.relative(dist, file).split(path.sep).join("/")}`)
  .sort();
const requiredCacheFiles = [
  "./",
  "./index.html",
  "./app.js",
  "./styles.css",
  "./polish.css",
  "./startup-prepaint.js",
  "./manifest.webmanifest",
  "./app/index.html",
  "./app/viewer.js",
  "./app/viewer.css",
  "./app/embed-overrides.css",
  "./access/access-control.js",
  "./shared/material-validator.js",
  "./shared/safe-export.js",
  "./config/apps.generated.json",
  "./config/apps.fallback.json",
  "./config/access-policy.json",
  "./config/revoked-access.json",
  "./config/access-public-key.json",
  "./config/sync-report.json",
  "./assets/brand/brand-mark.svg",
  "./assets/brand/portal-gateway.webp",
  "./assets/brand/icon-32.png",
];
const missingRequired = requiredCacheFiles.filter(
  (file) => file !== "./" && !allCacheFiles.includes(file),
);
if (missingRequired.length)
  throw new Error(
    `Missing required precache assets: ${missingRequired.join(", ")}`,
  );
const excludedOptionalPrefixes = [
  "./tools/",
  "./tests/",
  "./integration/",
  "./schemas/",
];
const optionalCacheFiles = allCacheFiles.filter(
  (file) =>
    !requiredCacheFiles.includes(file) &&
    !excludedOptionalPrefixes.some((prefix) => file.startsWith(prefix)),
);
const swPath = path.join(dist, "sw.js");
const sw = await readFile(swPath, "utf8");
const serialise = (files) =>
  files.map((file) => `  ${JSON.stringify(file)}`).join(",\n");
if (
  !sw.includes("/*__CORE_REQUIRED__*/") ||
  !sw.includes("/*__CORE_OPTIONAL__*/")
)
  throw new Error("Service worker does not contain precache placeholders.");
await writeFile(
  swPath,
  sw
    .replace(
      "/*__CORE_REQUIRED__*/",
      `\n${serialise(requiredCacheFiles)}\n`,
    )
    .replace(
      "/*__CORE_OPTIONAL__*/",
      `\n${serialise(optionalCacheFiles)}\n`,
    ),
  "utf8",
);

console.log(`AI Studio GHRAB ${pkg.version} built to dist/`);
