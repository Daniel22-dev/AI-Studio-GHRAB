import {
  initialiseAccess,
  hasAppAccess,
  formatReason,
} from "../../access/access-control.js?v=0.21.40";
import {
  applyDeploymentToAppRegistry,
  loadDeploymentConfig,
} from "../../access/deployment-config.js?v=0.21.40";

const deploymentReady = loadDeploymentConfig({ appId: "ai-studio" });
const language = (() => {
  try {
    return localStorage.getItem("ghrab.language") || "cs";
  } catch {
    return "cs";
  }
})();
const t = (cs, en) => (language === "en" ? en : cs);

document.documentElement.lang = language;
const title = document.querySelector("#title");
const copy = document.querySelector("#copy");
const errorNode = document.querySelector("#error");
const back = document.querySelector("#back");

function fail(message) {
  title.textContent = t("Aplikaci nelze bezpečně spustit.", "The application cannot be launched safely.");
  copy.textContent = t(
    "Přesměrování bylo zastaveno bezpečnostní kontrolou AI Studia.",
    "The redirect was stopped by the AI Studio security check.",
  );
  errorNode.textContent = message;
  errorNode.hidden = false;
  back.hidden = false;
}

async function fetchApps() {
  for (const path of [
    "../../config/apps.generated.json",
    "../../config/apps.fallback.json",
  ]) {
    try {
      const response = await fetch(path, { cache: "no-store" });
      if (!response.ok) continue;
      const deployment = await deploymentReady;
      return applyDeploymentToAppRegistry(deployment, await response.json());
    } catch {
      // Try the next registry source.
    }
  }
  throw new Error(t("Registr aplikací není dostupný.", "The application registry is unavailable."));
}

function validatedExternalTarget(app) {
  if (app?.integration?.launchMode !== "external-protected") {
    throw new Error(t("Aplikace nemá povolený externí chráněný režim.", "The application is not approved for protected external launch."));
  }
  const raw = String(app?.integration?.externalTargetUrl || "").trim();
  if (!raw) {
    throw new Error(t("Cílová produkční adresa zatím není nastavena.", "The production target address is not configured yet."));
  }
  const target = new URL(raw);
  if (target.protocol !== "https:") {
    throw new Error(t("Cílová aplikace musí používat HTTPS.", "The target application must use HTTPS."));
  }
  if (target.username || target.password) {
    throw new Error(t("Cílová adresa nesmí obsahovat přihlašovací údaje.", "The target URL must not contain credentials."));
  }
  return target;
}

(async () => {
  try {
    const appId = new URLSearchParams(location.search).get("app") || "";
    if (!appId) throw new Error(t("Chybí identifikátor aplikace.", "The application identifier is missing."));

    await initialiseAccess();
    const apps = await fetchApps();
    const app = apps.find((item) => item.id === appId);
    if (!app) throw new Error(t("Aplikace není v registru AI Studia.", "The application is not in the AI Studio registry."));

    const access = hasAppAccess(app.id);
    if (!access.enabled) {
      throw new Error(formatReason(access.reason, language));
    }

    const target = validatedExternalTarget(app);
    title.textContent = t("Oprávnění ověřeno.", "Access verified.");
    copy.textContent = t("Otevírám chráněnou aplikaci…", "Opening the protected application…");

    // The launcher may be loaded inside the Studio viewer. Navigation must replace
    // the top-level workspace so the sensitive app remains on its isolated origin.
    const destination = target.href;
    if (window.top && window.top !== window.self) window.top.location.replace(destination);
    else window.location.replace(destination);
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
})();
