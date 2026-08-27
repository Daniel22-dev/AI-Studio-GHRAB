// Robustní ochranný bootstrap AI Studio GHRAB.
// Upravte APP_ID a cestu k původnímu vstupnímu modulu cílové aplikace.
const APP_ID = "generator";
async function resolveStudioUrl() {
  if (globalThis.__GHRAB_STUDIO_URL__) {
    return new URL(globalThis.__GHRAB_STUDIO_URL__, location.href).href;
  }
  const configUrls = [
    new URL("./config/deployment.json", import.meta.url),
    new URL("./deployment.json", import.meta.url),
  ];
  for (const configUrl of configUrls) {
    try {
      const response = await fetch(configUrl, { cache: "no-store", credentials: "same-origin" });
      if (!response.ok) continue;
      const deployment = await response.json();
      if (deployment?.studioBaseUrl) {
        return new URL(deployment.studioBaseUrl, new URL("/", location.href)).href;
      }
    } catch {
      // Zkusí se další lokální umístění deployment kontraktu.
    }
  }
  throw new Error("Chybí studioBaseUrl v deployment konfiguraci nebo __GHRAB_STUDIO_URL__.");
}

const STUDIO_URL = await resolveStudioUrl();
const GUARD_URL = new URL("access/app-guard.js", STUDIO_URL).href;

function showBootstrapFailure() {
  const main = document.querySelector("main") || document.body;
  const panel = document.createElement("section");
  panel.setAttribute("role", "alert");
  panel.className = "ghrab-bootstrap-failure";
  const title = document.createElement("h1");
  title.textContent = "Aplikaci se nepodařilo bezpečně spustit";
  const text = document.createElement("p");
  text.textContent =
    "Centrální ověření AI Studia je dočasně nedostupné. Zavřete tuto kartu a zkuste aplikaci později otevřít z AI Studia.";
  panel.append(title, text);
  main.replaceChildren(panel);
}

try {
  const { protectApp } = await import(GUARD_URL);
  const allowed = await protectApp(APP_ID, {
    studioUrl: STUDIO_URL,
  });
  if (allowed) await import("./app.js");
} catch (error) {
  console.error("AI Studio access bootstrap failed", error);
  showBootstrapFailure();
}
