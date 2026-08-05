#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
for (const file of ["src/config/apps.generated.json", "src/config/sync-report.json"]) {
  const parsed = JSON.parse(await readFile(file, "utf8"));
  await writeFile(file, JSON.stringify(parsed, null, 2) + "\n", "utf8");
}
console.log("Vygenerované registry byly deterministicky naformátovány bez externí závislosti.");
