// Robustní ochranný bootstrap AI Studio GHRAB.
// Upravte APP_ID a cestu k původnímu vstupnímu modulu cílové aplikace.
const APP_ID = "correspondence";
const GUARD_URL =
  "https://daniel22-dev.github.io/AI-Studio-GHRAB/access/app-guard.js";

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
    studioUrl: "https://daniel22-dev.github.io/AI-Studio-GHRAB/",
  });
  if (allowed) await import("./app.js");
} catch (error) {
  console.error("AI Studio access bootstrap failed", error);
  showBootstrapFailure();
}
