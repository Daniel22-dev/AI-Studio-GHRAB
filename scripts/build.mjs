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

function compactCssWhitespace(content) {
  let output = "";
  let quote = "";
  let pendingSpace = false;
  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    if (quote) {
      output += char;
      if (char === "\\" && index + 1 < content.length) output += content[++index];
      else if (char === quote) quote = "";
      continue;
    }
    if (char === '"' || char === "'") {
      if (pendingSpace && output && !/\s$/.test(output)) output += " ";
      pendingSpace = false;
      quote = char;
      output += char;
      continue;
    }
    if (/\s/.test(char)) {
      pendingSpace = true;
      continue;
    }
    if (pendingSpace && output && !/\s$/.test(output)) output += " ";
    pendingSpace = false;
    output += char;
  }
  return `${output.trim()}\n`;
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
  "release-promotion-policy.json",
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
  "integration/SAVE-TO-STUDIO.md",
  "ai-core/releases/1.0.0/README.md",
]) {
  await rm(path.join(dist, sourceOnlyDoc), { force: true });
}

// Production CSS keeps source readability in git while removing indentation/newline
// transfer overhead. The compactor is deliberately conservative: it preserves every
// token and comment and only collapses CSS whitespace outside quoted strings.
for (const file of await walk(dist)) {
  if (!file.endsWith(".css")) continue;
  const content = await readFile(file, "utf8");
  const compacted = compactCssWhitespace(content);
  if (compacted.length < content.length) await writeFile(file, compacted, "utf8");
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
  "./portal-card-hotfix.css",
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
  "./privacy/pilot-event.js",
  "./modules/registry-client.js",
  "./modules/motion-policy.js",
  "./config/apps.generated.json",
  "./config/apps.fallback.json",
  "./config/platform-consumers.json",
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
// CORE_OPTIONAL is now intentionally small: it means "offline essential", not
// "cache the rest of Studio during install". Every other same-origin static asset
// remains available through the service worker's cache-first runtime path and is
// stored only after the user actually opens that surface.
const offlineEssentialAssets = new Set([
  "./config/permissions.json",
  "./modules/app-test-status.js",
  "./modules/operational-status.js",
  "./modules/portal-effects.js",
  "./access/error-reporter.js",
  "./access/error-reporter.css",
  "./assets/brand/portal-ring-inner.svg",
  "./assets/brand/portal-ring-middle.svg",
  "./assets/brand/portal-ring-outer.svg",
]);
for (const app of runtimeApps) {
  const icon = String(app?.icon || "").replace(/^\.\//, "");
  if (icon && !/^(?:[a-z]+:|\/\/)/i.test(icon)) offlineEssentialAssets.add(`./${icon}`);
}
const optionalCacheFiles = allCacheFiles.filter(
  (file) => !requiredCacheFiles.includes(file) && offlineEssentialAssets.has(file),
);
const missingOfflineEssential = [...offlineEssentialAssets].filter(
  (file) => !allCacheFiles.includes(file),
);
if (missingOfflineEssential.length) {
  throw new Error(`Missing offline-essential assets: ${missingOfflineEssential.join(", ")}`);
}
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

// P5 performance hygiene: keep the complete source changelog in one canonical
// human-readable file, but split the runtime representation into bounded chunks.
// The archive files are created only after the service-worker precache list has been
// assembled above, so changelog history remains on-demand content. This prevents the
// monotonically growing history from eventually breaking the generic single-file
// performance budget while preserving every historical entry.
{
  const changelogPath = path.join(dist, "config", "changelog.json");
  const changelog = JSON.parse(await readFile(changelogPath, "utf8"));
  const maxChunkBytes = 120000;
  const chunks = [];
  let currentItems = [];
  const compact = (items, archives = undefined) => {
    const payload = { schema: changelog.schema, current: changelog.current, items };
    if (archives?.length) payload.archives = archives;
    return `${JSON.stringify(payload)}\n`;
  };
  for (const item of changelog.items || []) {
    const candidate = [...currentItems, item];
    if (currentItems.length && Buffer.byteLength(compact(candidate), "utf8") > maxChunkBytes) {
      chunks.push(currentItems);
      currentItems = [item];
    } else {
      currentItems = candidate;
    }
  }
  if (currentItems.length || !chunks.length) chunks.push(currentItems);
  const archiveNames = chunks.slice(1).map((_, index) => `changelog.archive-${index + 1}.json`);
  await writeFile(changelogPath, compact(chunks[0] || [], archiveNames), "utf8");
  for (let index = 1; index < chunks.length; index += 1) {
    await writeFile(
      path.join(dist, "config", archiveNames[index - 1]),
      compact(chunks[index]),
      "utf8",
    );
  }
}

// P5 performance hygiene: compact machine-readable JSON only in dist. Source files
// remain human-readable. Service-worker URLs are content-agnostic, so this does not
// alter cache semantics; it only reduces transfer/storage size.
for (const relative of [
  "config/changelog.json",
  "config/apps.generated.json",
  "config/apps.fallback.json",
  "config/ai-readiness.generated.json",
  "config/sync-report.json",
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
  "ghrab-platform.consumer.json",
  "build-info.json",
  "platform-build-info.json",
  // App-owned JSON schemas and material catalog are semantic JSON; formatting is
  // irrelevant at runtime, so compact them in dist to keep the P5 payload budget
  // resilient to small registry/changelog growth during CI synchronization.
  "schemas/ai-studio-app-manifest-v1.schema.json",
  "schemas/ghrab-app-registry-v2.schema.json",
  "schemas/ghrab-material-v1.schema.json",
  "schemas/ghrab-shared-material-record-v1.schema.json",
  "schemas/ghrab-artifact-envelope-v1.schema.json",
  "schemas/ghrab-handoff-v1.schema.json",
  "schemas/ludus-content-v2.schema.json",
  "library/catalog.json",
  "library/materials/czech-syntax.ghrab.json",
  "library/materials/school-email.ghrab.json",
  "library/materials/spanish-travel.ghrab.json",
  "library/materials/past-simple.ghrab.json",
]) {
  const file = path.join(dist, relative);
  try {
    const parsed = JSON.parse(await readFile(file, "utf8"));
    await writeFile(file, `${JSON.stringify(parsed)}\n`, "utf8");
  } catch (error) {
    if (error?.code !== "ENOENT") throw new Error(`Nelze zkompaktovat ${relative}: ${error.message}`);
  }
}

// P5 performance hygiene for the portal shell. Keep source CSS/HTML readable, but
// remove indentation and blank lines from application-owned CSS files and the root
// entry document in dist. Platform CSS is deliberately excluded
// because its byte identity is verified against the canonical vendor bundle.
for (const relative of [
  "styles.css",
  "polish.css",
  "access/error-reporter.css",
  "manualy/manualy.css",
  "manualy/viewer.css",
  "manualy/error-report.css",
  "manualy/pilot-report.css",
  "tools/access-registry/registry.css",
  "app/viewer.css",
  "access/access-gate.css",
  "tools/security-center/security-center.css",
  "api-usage/api-usage.css",
  "report/report.css",
  "app/embed-overrides.css",
  "app/external/launcher.css",
]) {
  const file = path.join(dist, relative);
  const text = await readFile(file, "utf8");
  const compacted = `${text
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n")}\n`;
  if (compacted !== text) await writeFile(file, compacted, "utf8");
}

// The root entry has no whitespace-sensitive <pre>/<textarea> content. Line-level
// trimming preserves HTML text separation while reducing the measured critical shell.
const rootIndex = path.join(dist, "index.html");
const rootIndexText = await readFile(rootIndex, "utf8");
const rootIndexCompacted = `${rootIndexText
  .split(/\r?\n/u)
  .map((line) => line.trim())
  .filter(Boolean)
  .join("\n")}\n`;
if (rootIndexCompacted !== rootIndexText) await writeFile(rootIndex, rootIndexCompacted, "utf8");

