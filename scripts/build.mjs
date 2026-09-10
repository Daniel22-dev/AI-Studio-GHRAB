import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checkAccessBundleFreshness } from "./lib/access-bundle-freshness.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const src = path.join(root, "src");
const dist = path.join(root, "dist");
const pkg = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
const consumer = JSON.parse(await readFile(path.join(root, "ghrab-platform.consumer.json"), "utf8"));
if (consumer.appVersion !== pkg.version) throw new Error(`Consumer appVersion ${consumer.appVersion} neodpovídá package ${pkg.version}.`);

await checkAccessBundleFreshness({ root, required: false });

function appendRevision(ref, version) {
  if (!ref || /^(?:[a-z]+:|\/\/|#|data:|blob:)/i.test(ref)) return ref;
  if (/(?:[?&])v=/.test(ref)) return ref;
  const hashIndex = ref.indexOf("#");
  const hash = hashIndex >= 0 ? ref.slice(hashIndex) : "";
  const baseRef = hashIndex >= 0 ? ref.slice(0, hashIndex) : ref;
  return `${baseRef}${baseRef.includes("?") ? "&" : "?"}v=${version}${hash}`;
}

function revisionHtmlAssets(content, version) {
  return content
    .replace(
      /(<script\b[^>]*\bsrc=["'])([^"']+\.js(?:\?[^"']*)?)(["'])/gi,
      (whole, prefix, ref, suffix) => `${prefix}${appendRevision(ref, version)}${suffix}`,
    )
    .replace(
      /(<link\b(?=[^>]*\brel=["']stylesheet["'])[^>]*\bhref=["'])([^"']+\.css(?:\?[^"']*)?)(["'])/gi,
      (whole, prefix, ref, suffix) => `${prefix}${appendRevision(ref, version)}${suffix}`,
    );
}

function revisionModuleImports(content, version) {
  const revise = (whole, prefix, ref, suffix) =>
    `${prefix}${appendRevision(ref, version)}${suffix}`;
  return content
    .replace(
      /(\bfrom\s*["'])(\.{1,2}\/[^"']+?\.js(?:\?[^"']*)?)(["'])/g,
      revise,
    )
    .replace(
      /(\bimport\s*["'])(\.{1,2}\/[^"']+?\.js(?:\?[^"']*)?)(["'])/g,
      revise,
    )
    .replace(
      /(\bimport\s*\(\s*["'])(\.{1,2}\/[^"']+?\.js(?:\?[^"']*)?)(["']\s*\))/g,
      revise,
    );
}

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
const deploymentProfile = JSON.parse(
  await readFile(path.join(src, "config", "deployment.json"), "utf8"),
);
await writeFile(
  path.join(dist, "config", "deployment-baked.js"),
  `// Generated at build time; do not edit in dist.\nexport const BAKED_DEPLOYMENT_CONFIG = Object.freeze(${JSON.stringify(deploymentProfile, null, 2)});\n`,
  "utf8",
);
// The root consumer is the single source of truth; copy it before precache validation instead of relying on a stale src/ duplicate.
await cp(path.join(root, 'ghrab-platform.consumer.json'), path.join(dist, 'ghrab-platform.consumer.json'));
// Historical platform sources remain in src/ for rollback/audit, but the live build uses the canonical dist/ghrab platform bundle.
await rm(path.join(dist, 'platform'), { recursive: true, force: true });

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
let localApps = [];
try {
  localApps = JSON.parse(
    await readFile(path.join(src, "config", "apps.local.json"), "utf8"),
  );
  if (!Array.isArray(localApps)) throw new Error("apps.local.json is not an array");
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}
const runtimeApps = [...apps];
for (const localApp of localApps) {
  if (!localApp?.id) throw new Error("Local runtime app is missing id");
  const existingIndex = runtimeApps.findIndex((app) => app.id === localApp.id);
  if (existingIndex >= 0) runtimeApps[existingIndex] = localApp;
  else runtimeApps.push(localApp);
}
await writeFile(
  path.join(dist, "config", "apps.generated.json"),
  JSON.stringify(runtimeApps, null, 2) + "\n",
  "utf8",
);
const aiCoreRegistry = JSON.parse(
  await readFile(path.join(src, "config", "ai-core.json"), "utf8"),
);
const aiReadiness = JSON.parse(
  await readFile(path.join(src, "config", "ai-readiness.generated.json"), "utf8"),
);
await writeFile(
  path.join(dist, "build-info.json"),
  JSON.stringify(
    {
      version: pkg.version,
      builtAt: new Date().toISOString(),
      syncMode: syncReport.mode,
      platform: {
        contract: consumer.platform.contract,
        version: consumer.platform.version,
        brandVersion: consumer.brand.version,
        registrySchema: "ghrab-app-registry-v2",
      },
      aiCore: {
        coreVersion: aiCoreRegistry.activeRelease.coreVersion,
        contractVersion: aiCoreRegistry.activeRelease.contractVersion,
        buildId: aiCoreRegistry.activeRelease.buildId,
        readyApps: aiReadiness.summary.readyApps,
        certifiedPendingApps: aiReadiness.summary.certifiedPendingApps,
      },
      apps: runtimeApps.map((app) => ({ id: app.id, version: app.version })),
    },
    null,
    2,
  ) + "\n",
  "utf8",
);

// Build-time registry inputs are consumed above and are not browser runtime assets.
// Keeping them out of dist avoids shipping internal synchronization metadata and
// preserves the PWA performance budget as the application registry grows.
for (const buildOnlyConfig of [
  "apps.local.json",
  "sources.json",
  "release-wave.json",
  "ai-readiness-baseline.json",
  "ai-core-consumers.json",
  // Historical P0 compatibility profile is source-only. It enables direct-provider
  // semantics for migration tests and must not be published as a runtime asset.
  "deployment.school-server-p0.json",
]) {
  await rm(path.join(dist, "config", buildOnlyConfig), { force: true });
}

// Developer-only contracts remain in src/ and in the repository, but are not
// runtime assets and therefore must not consume the production payload budget.
for (const sourceOnlyDoc of [
  "library/SERVER-MATERIALS-CONTRACT.md",
  "integration/VERIFY-INTEGRATION.md",
]) {
  await rm(path.join(dist, sourceOnlyDoc), { force: true });
}

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
  "./access/app-guard.js",
  "./access/access-control.js",
  "./access/deployment-config.js",
  "./access/platform-runtime.js",
  "./access/access-gate.css",
  "./config/deployment-baked.js",
  "./shared/material-validator.js",
  "./shared/safe-export.js",
  "./config/apps.generated.json",
  "./config/apps.fallback.json",
  "./config/access-policy.json",
  "./config/revoked-access.json",
  "./config/access-public-key.json",
  "./config/sync-report.json",
  "./config/ai-core.json",
  "./config/ai-runtime.json",
  "./config/ai-readiness.generated.json",
  "./ai-core/releases/1.0.0/ghrab-ai-core-manifest-1.0.0.json",
  "./ai-core/releases/1.0.0/ghrab-ai-core-1.0.0.js",
  "./assets/brand/brand-mark.svg",
  "./assets/brand/portal-gateway.webp",
  "./assets/brand/icon-32.png",
  "./assets/brand/school-logo.png",
  "./config/brand-manifest.json",
  "./config/platform-manifest.json",
  "./ghrab-platform.consumer.json",
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
  "./ai-core/",
  // Build-time and developer-only sources are not needed for first offline boot.
  "./docs/",
  // The protected external launcher is a network transition to another HTTPS origin.
  // Maturita Desk owns its independent offline PWA cache, so duplicating this bridge
  // in the Studio precache would waste the core offline budget without adding content availability.
  "./app/external/",
  // P2 platform assets are added only after the canonical postprocessor runs.
  // Excluding src/platform prevents stale compatibility copies from entering SW precache.
  "./platform/",
  // Large presentation media stays network-loaded and must not inflate the offline PWA cache.
  "./assets/presentation/",
  // The aggregate pilot report is an administrator-only online diagnostic surface.
  // It is not required for the teacher portal's first offline boot.
  "./report/",
];
const optionalCacheFiles = allCacheFiles.filter(
  (file) =>
    !requiredCacheFiles.includes(file) &&
    file !== "./config/changelog.json" &&
    file !== "./config/apps.local.json" &&
    file !== "./library/SERVER-MATERIALS-CONTRACT.md" &&
    ![
      "./config/access-config-bundle.json",
      "./config/access-config-bundle.sig.json",
    ].includes(file) &&
    !file.startsWith("./config/deployment") &&
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

// P2: canonical cross-application platform post-processing.
await import("./apply-ghrab-platform.mjs");

// Revision every executable/style entry after all postprocessors have injected assets.
// This prevents a waiting/old service worker from combining new HTML with stale JS.
for (const file of await walk(dist)) {
  if (!/\.(?:html|js)$/.test(file)) continue;
  const content = await readFile(file, "utf8");
  const revised = file.endsWith(".html")
    ? revisionHtmlAssets(content, pkg.version)
    : revisionModuleImports(content, pkg.version);
  if (revised !== content) await writeFile(file, revised, "utf8");
}

// P5 performance hygiene: compact machine-readable JSON only in dist. Source files
// remain human-readable. Service-worker URLs are content-agnostic, so this does not
// alter cache semantics; it only reduces transfer/storage size.
for (const relative of [
  "config/changelog.json",
  "config/apps.generated.json",
  "config/apps.fallback.json",
  "config/platform-consumers.json",
  "config/data-manifest.json",
  "config/permissions.json",
  "config/presentation.json",
  "config/release-acceptance.json",
  "config/security-headers.json",
  "config/brand-manifest.json",
  "config/ai-core.json",
  "config/ai-runtime.json",
  "config/platform-manifest.json",
  "manifest.webmanifest",
]) {
  const file = path.join(dist, relative);
  try {
    const parsed = JSON.parse(await readFile(file, "utf8"));
    await writeFile(file, `${JSON.stringify(parsed)}\n`, "utf8");
  } catch (error) {
    if (error?.code !== "ENOENT") throw new Error(`Nelze zkompaktovat ${relative}: ${error.message}`);
  }
}

// Keep at least one whitespace separator between HTML lines while removing only
// indentation before tags. This is deliberately not a general HTML minifier.
const rootIndex = path.join(dist, "index.html");
const rootIndexText = await readFile(rootIndex, "utf8");
const rootIndexCompacted = rootIndexText
  .split("\n")
  .map((line) => line.replace(/^[ \\t]+(?=<)/u, ""))
  .join("\n");
if (rootIndexCompacted !== rootIndexText) await writeFile(rootIndex, rootIndexCompacted, "utf8");

