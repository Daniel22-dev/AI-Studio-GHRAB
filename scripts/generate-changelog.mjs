import { readFile, writeFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const source = JSON.parse(
  await readFile(path.join(root, "src/config/changelog.json"), "utf8"),
);

if (
  source.schema !== "ai-studio-changelog-v1" ||
  !Array.isArray(source.items)
) {
  throw new Error("src/config/changelog.json has an unsupported structure.");
}

const changelogVersions = new Set(source.items.map((item) => String(item.version || "")));
const releaseNoteVersions = new Set(
  (await readdir(root))
    .map((name) => name.match(/^RELEASE-NOTES-(\d+\.\d+\.\d+)(?:-|\.md$)/)?.[1])
    .filter(Boolean),
);
const missingReleaseNotes = [...releaseNoteVersions].filter((version) => !changelogVersions.has(version)).sort();
if (missingReleaseNotes.length) {
  throw new Error(`Changelog neobsahuje položky pro release notes: ${missingReleaseNotes.join(", ")}.`);
}

const lines = [
  "# Changelog",
  "",
  "> Tento soubor se generuje ze `src/config/changelog.json`. Neupravujte jej ručně.",
  "",
];
for (const item of source.items) {
  lines.push(`## ${item.version}${item.date ? ` — ${item.date}` : ""}`);
  if (item.title?.cs) lines.push(`**${item.title.cs}**`, "");
  for (const change of item.changes || []) lines.push(`- ${change.cs}`);
  lines.push("");
}

const rawMarkdown = `${lines.join("\n").trim()}\n`;
let markdown = rawMarkdown;
try {
  const { default: prettier } = await import("prettier");
  markdown = await prettier.format(rawMarkdown, { parser: "markdown" });
} catch (error) {
  if (error?.code !== "ERR_MODULE_NOT_FOUND") throw error;
  console.warn(
    "Prettier není v tomto archivu nainstalován; CHANGELOG.md byl vytvořen deterministicky bez kosmetického přeformátování.",
  );
}
await writeFile(path.join(root, "CHANGELOG.md"), markdown, "utf8");
