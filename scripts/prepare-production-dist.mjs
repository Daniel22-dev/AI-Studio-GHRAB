#!/usr/bin/env node
import { readdir, rm } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(process.argv[2] || "dist");
const removed = [];

await rm(path.join(root, "tests"), { recursive: true, force: true });
removed.push("tests");

const integrationRoot = path.join(root, "integration");
try {
  const entries = await readdir(integrationRoot, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".html")) continue;
    await rm(path.join(integrationRoot, entry.name), { force: true });
    removed.push(`integration/${entry.name}`);
  }
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}

console.log(JSON.stringify({ status: "PASS", root, removed }, null, 2));
