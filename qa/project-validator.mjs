import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

function sameBytes(left, right) {
  return left.length === right.length && left.equals(right);
}

function parsePrecache(sw, name) {
  const match = sw.match(new RegExp(`const ${name} = \\[((?:.|\\n)*?)\\];`));
  if (!match) return null;
  return JSON.parse(`[${match[1]}]`);
}

function detectedFormat(buffer) {
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return "png";
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8)
    return "jpg";
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  )
    return "webp";
  if (buffer.subarray(0, 200).toString("utf8").includes("<svg")) return "svg";
  return null;
}

async function walkFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walkFiles(absolute)));
    else files.push(absolute);
  }
  return files;
}

export async function validateSecurity({ root, finding }) {
  const findings = [];
  const add = (severity, code, message, evidence = "") =>
    findings.push(finding("security", severity, code, message, evidence));
  const src = path.join(root, "src");
  const config = path.join(src, "config");
  const [apps, fallback, policy, sources, syncReport, pkg] = await Promise.all([
    readJson(path.join(config, "apps.generated.json")),
    readJson(path.join(config, "apps.fallback.json")),
    readJson(path.join(config, "access-policy.json")),
    readJson(path.join(config, "sources.json")),
    readJson(path.join(config, "sync-report.json")),
    readJson(path.join(root, "package.json")),
  ]);

  const guardModule = await import(
    pathToFileURL(path.join(src, "access", "app-guard.js")).href +
      `?validator=${Date.now()}`
  );
  const outputIds = new Set(Object.keys(guardModule.OUTPUT_KINDS || {}));
  const registryIds = new Set(apps.map((app) => app.id));
  const fallbackIds = new Set(fallback.map((app) => app.id));
  const policyIds = new Set(Object.keys(policy.applications || {}));
  const sourceIds = new Set(sources.map((source) => source.id));

  for (const app of apps) {
    for (const [label, set] of [
      ["OUTPUT_KINDS", outputIds],
      ["apps.fallback.json", fallbackIds],
      ["access-policy.json", policyIds],
      ["sources.json", sourceIds],
    ]) {
      if (!set.has(app.id))
        add(
          "MAJOR",
          "APP_REGISTRY_INCONSISTENT",
          `Aplikace ${app.id} chybí v ${label}.`,
        );
    }
    const iconPath = path.join(src, app.icon || "");
    try {
      await stat(iconPath);
    } catch {
      add(
        "MAJOR",
        "APP_ICON_MISSING",
        `Aplikace ${app.id} odkazuje na chybějící ikonu ${app.icon}.`,
      );
    }
  }
  for (const [label, set] of [
    ["OUTPUT_KINDS", outputIds],
    ["apps.fallback.json", fallbackIds],
    ["access-policy.json", policyIds],
    ["sources.json", sourceIds],
  ]) {
    for (const id of set)
      if (!registryIds.has(id))
        add(
          "MAJOR",
          "APP_REGISTRY_EXTRA_ID",
          `${label} obsahuje neznámé ID aplikace ${id}.`,
        );
  }

  const appScript = await readFile(path.join(src, "app.js"), "utf8");
  if (/const\s+ADMIN_PAGES\b/.test(appScript))
    add(
      "MAJOR",
      "ADMIN_PAGES_DUPLICATED",
      "app.js znovu zavádí lokální seznam ADMIN_PAGES místo politiky.",
    );
  if (!/policy\?\.administratorPages/.test(appScript))
    add(
      "MAJOR",
      "ADMIN_POLICY_NOT_USED",
      "Stránková přístupová brána nečte administratorPages z přístupové politiky.",
    );

  const reportScript = await readFile(
    path.join(src, "report", "report.js"),
    "utf8",
  );
  for (const id of registryIds)
    if (!reportScript.includes(`"${id}"`))
      add(
        "MAJOR",
        "REPORT_APP_MISSING",
        `Pilotní report neobsahuje aplikaci ${id}.`,
      );

  const polishCss = await readFile(path.join(src, "polish.css"), "utf8");
  if (
    !polishCss.includes("--portal-optical-center-x: -4px") ||
    !/\.portal-core-zone\s*\{[\s\S]*?left:\s*var\(--portal-optical-center-x\)/.test(polishCss)
  )
    add(
      "MAJOR",
      "PORTAL_GATEWAY_CENTERING_MISSING",
      "Hlavní brána nemá zachovanou desktopovou optickou korekci vycentrování.",
    );

  const readme = await readFile(path.join(root, "README.md"), "utf8");
  const readmeVersion = readme.match(/Aktuální verze:\s*([0-9.]+)/)?.[1];
  if (readmeVersion !== pkg.version)
    add(
      "MAJOR",
      "README_VERSION_MISMATCH",
      `README uvádí ${readmeVersion || "žádnou verzi"}, package.json ${pkg.version}.`,
    );

  const generatedBytes = await readFile(path.join(config, "apps.generated.json"));
  const fallbackBytes = await readFile(path.join(config, "apps.fallback.json"));
  if (
    sameBytes(generatedBytes, fallbackBytes) &&
    !(
      syncReport.mode === "fallback" &&
      syncReport.fallbackSnapshotConfirmed === true
    )
  )
    add(
      "MAJOR",
      "REGISTRY_FALLBACK_UNCONFIRMED",
      "Generovaný a fallback registr jsou identické bez výslovného potvrzení offline snímku.",
    );

  const distSw = path.join(root, "dist", "sw.js");
  try {
    const sw = await readFile(distSw, "utf8");
    const required = parsePrecache(sw, "CORE_REQUIRED");
    const optional = parsePrecache(sw, "CORE_OPTIONAL");
    if (!required || !optional) {
      add(
        "MAJOR",
        "PRECACHE_LIST_UNREADABLE",
        "Z distribučního service workeru nelze načíst seznamy precache.",
      );
    } else {
      let total = 0;
      for (const asset of [...new Set([...required, ...optional])]) {
        if (asset === "./") continue;
        const file = path.join(root, "dist", asset.replace(/^\.\//, ""));
        const size = (await stat(file)).size;
        total += size;
        if (size > 300 * 1024)
          add(
            "MINOR",
            "PRECACHE_FILE_BUDGET",
            `Položka precache ${asset} má ${Math.round(size / 1024)} KB; limit je 300 KB.`,
          );
      }
      if (total > 1.5 * 1024 * 1024)
        add(
          "MINOR",
          "PRECACHE_TOTAL_BUDGET",
          `Precache má ${Math.round(total / 1024)} KB; doporučený limit je 1536 KB.`,
        );
    }
  } catch (error) {
    add(
      "MAJOR",
      "PRECACHE_NOT_BUILT",
      `Precache nelze zkontrolovat: ${error.message}`,
    );
  }

  for (const absolute of await walkFiles(path.join(src, "assets"))) {
    const extension = path
      .extname(absolute)
      .toLowerCase()
      .replace(".jpeg", ".jpg")
      .slice(1);
    if (!["png", "jpg", "webp", "svg"].includes(extension)) continue;
    const actual = detectedFormat(await readFile(absolute));
    if (actual && actual !== extension)
      add(
        "MAJOR",
        "ASSET_EXTENSION_MISMATCH",
        `${path.relative(root, absolute)} má příponu .${extension}, ale obsah ${actual}.`,
      );
  }

  return {
    findings,
    details: {
      applicationsChecked: apps.length,
      outputKinds: [...outputIds].sort(),
      fallbackSnapshotConfirmed: Boolean(syncReport.fallbackSnapshotConfirmed),
    },
  };
}
