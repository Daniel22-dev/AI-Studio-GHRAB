#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checkAccessBundleFreshness } from "./lib/access-bundle-freshness.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const required = process.argv.includes("--required");
const result = await checkAccessBundleFreshness({ root, required });
if (required && !result.ok) process.exitCode = 1;
