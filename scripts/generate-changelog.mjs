import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import prettier from "prettier";
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
const markdown = await prettier.format(`${lines.join("\n").trim()}\n`, {
  parser: "markdown",
});
await writeFile(path.join(root, "CHANGELOG.md"), markdown, "utf8");
