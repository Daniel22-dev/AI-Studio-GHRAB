import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => readFile(path.join(root, relative), "utf8");
const failures = [];
const check = (condition, message) => {
  if (!condition) failures.push(message);
};

const html = await read("src/app/external/index.html");
const launcher = await read("src/app/external/launcher.js");
const policy = JSON.parse(await read("src/config/access-policy.json"));
const permissions = JSON.parse(await read("src/config/permissions.json"));

check(html.includes('script type="module" src="./launcher.js"'), "External launcher shell does not load launcher.js.");
check(launcher.includes("await initialiseAccess()"), "External launcher does not initialise Studio access control.");
check(launcher.includes("hasAppAccess(app.id)"), "External launcher does not verify application access.");
check(launcher.includes('launchMode !== "external-protected"'), "External launcher does not require the protected launch mode.");
check(launcher.includes('target.protocol !== "https:"'), "External launcher does not enforce HTTPS.");
check(launcher.includes("window.top.location.replace(destination)"), "External launcher does not leave the Studio iframe at top level.");
check(policy.applications?.["maturita-desk"]?.trainingRequired === true, "Maturita Desk is missing from the access policy.");
check(permissions.serverlessEnforcement?.requiredLayers?.includes("target_app_bootstrap_or_isolated_app_guard"), "Permissions do not describe the isolated app guard alternative.");

if (failures.length) {
  console.error("Maturita Desk external-launcher regression test failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Maturita Desk external-launcher regression test passed.");
