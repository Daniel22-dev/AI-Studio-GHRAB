import {
  initialiseAccess,
  hasAppAccess,
  formatReason,
} from "../access/access-control.js";

const language = (() => {
  try {
    return localStorage.getItem("ghrab.language") || "cs";
  } catch {
    return "cs";
  }
})();
const t = (cs, en) => (language === "en" ? en : cs);
const localised = (value) => {
  if (typeof value === "string") return value;
  return value?.[language] || value?.cs || value?.en || "";
};

document.documentElement.lang = language;
document.querySelectorAll("[data-cs][data-en]").forEach((node) => {
  node.textContent = node.dataset[language];
});
document.querySelectorAll("[data-cs-aria][data-en-aria]").forEach((node) => {
  node.setAttribute("aria-label", node.dataset[`${language}Aria`]);
});

const frame = document.querySelector("#embedded-app-frame");
const loading = document.querySelector("#embedded-loading");
const errorPanel = document.querySelector("#embedded-error");
const errorTitle = document.querySelector("#embedded-error-title");
const errorCopy = document.querySelector("#embedded-error-copy");
const nameNode = document.querySelector("#embedded-app-name");
const iconNode = document.querySelector("#embedded-app-icon");
const reloadButton = document.querySelector("#embedded-reload");
const fullscreenButton = document.querySelector("#embedded-fullscreen");
const externalButton = document.querySelector("#embedded-external");
const errorExternalButton = document.querySelector("#embedded-error-external");

let currentApp = null;
let loadTimeout = 0;

let embeddedObserver = null;
const embeddedOverridesUrl = new URL("./embed-overrides.css", import.meta.url)
  .href;

function stopEmbeddedPolishObserver() {
  embeddedObserver?.disconnect();
  embeddedObserver = null;
}

function applyEvaluatorEmbeddedPolish() {
  stopEmbeddedPolishObserver();
  if (currentApp?.id !== "essay-evaluator") return;
  let doc;
  try {
    doc = frame.contentDocument;
  } catch {
    return;
  }
  if (!doc?.documentElement || !doc.head || !doc.body) return;

  doc.documentElement.classList.add("ghrab-studio-embedded-app");
  doc.documentElement.dataset.ghrabEmbeddedApp = currentApp.id;

  if (!doc.querySelector('link[data-ghrab-embed-overrides="true"]')) {
    const link = doc.createElement("link");
    link.rel = "stylesheet";
    link.href = embeddedOverridesUrl;
    link.dataset.ghrabEmbedOverrides = "true";
    doc.head.append(link);
  }

  const compactLargeFooterBrand = () => {
    const documentHeight = Math.max(
      doc.documentElement.scrollHeight,
      doc.body.scrollHeight,
      doc.documentElement.clientHeight,
    );
    const candidates = [...doc.images]
      .map((image) => {
        const rect = image.getBoundingClientRect();
        const absoluteTop = rect.top + doc.defaultView.scrollY;
        const context =
          `${image.alt || ""} ${image.currentSrc || image.src || ""} ${image.className || ""}`.toLowerCase();
        const inFooter = Boolean(
          image.closest(
            "footer, [class*='footer' i], [class*='credit' i], [class*='about' i], [class*='owner' i]",
          ),
        );
        const logoLike = /logo|brand|ghrab|gymn|school|heart|owner/.test(
          context,
        );
        const nearBottom = absoluteTop > documentHeight * 0.52;
        const oversized = rect.width >= 230 || rect.height >= 210;
        return {
          image,
          rect,
          score:
            rect.width * rect.height +
            (inFooter ? 500000 : 0) +
            (logoLike ? 250000 : 0) +
            (nearBottom ? 120000 : 0),
          eligible: oversized && (inFooter || logoLike || nearBottom),
        };
      })
      .filter((item) => item.eligible)
      .sort((a, b) => b.score - a.score);

    const target = candidates[0]?.image;
    if (!target) return;
    target.classList.add("ghrab-studio-compact-footer-logo");

    const wrapper = target.closest("picture") || target.parentElement;
    wrapper?.classList.add("ghrab-studio-compact-footer-logo-wrap");

    const cell = wrapper?.parentElement;
    if (cell) {
      const rect = cell.getBoundingClientRect();
      if (rect.height >= 220 || rect.width >= 260) {
        cell.classList.add("ghrab-studio-compact-footer-logo-cell");
      }
    }
  };

  compactLargeFooterBrand();
  doc.querySelectorAll("img").forEach((image) => {
    if (!image.complete)
      image.addEventListener("load", compactLargeFooterBrand, { once: true });
  });
  [250, 900, 1800].forEach((delay) =>
    window.setTimeout(compactLargeFooterBrand, delay),
  );

  embeddedObserver = new MutationObserver(compactLargeFooterBrand);
  embeddedObserver.observe(doc.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["src", "class"],
  });
}

async function fetchApps() {
  for (const path of [
    "../config/apps.generated.json",
    "../config/apps.fallback.json",
  ]) {
    try {
      const response = await fetch(path, { cache: "no-store" });
      if (response.ok) return await response.json();
    } catch {
      /* try fallback */
    }
  }
  throw new Error(
    t(
      "Registr aplikací se nepodařilo načíst.",
      "The application registry could not be loaded.",
    ),
  );
}

function showError(title, copy) {
  window.clearTimeout(loadTimeout);
  loading.hidden = true;
  frame.hidden = true;
  errorPanel.hidden = false;
  errorTitle.textContent = title;
  errorCopy.textContent = copy;
}

function openSeparately() {
  if (!currentApp?.launchUrl) return;
  window.open(currentApp.launchUrl, "_blank", "noopener,noreferrer");
}

function setApp(app) {
  currentApp = app;
  const appName = localised(app.name);
  const appUrl = new URL(app.launchUrl, location.href);
  if (appUrl.origin !== location.origin) {
    showError(
      t(
        "Tuto aplikaci nelze bezpečně vložit.",
        "This application cannot be embedded safely.",
      ),
      t(
        "Je umístěna na jiné internetové doméně. Použijte volbu Otevřít aplikaci samostatně.",
        "It is hosted on another internet domain. Use Open application separately.",
      ),
    );
    return;
  }
  nameNode.textContent = appName;
  document.title = `${appName} · AI Studio GHRAB`;
  iconNode.src = app.icon?.startsWith("http") ? app.icon : `../${app.icon}`;
  iconNode.alt = "";
  frame.title = appName;
  frame.src = appUrl.href;
  loadTimeout = window.setTimeout(() => {
    if (!frame.classList.contains("is-ready")) {
      loading.querySelector("small").textContent = t(
        "Načítání trvá déle. Můžete ještě chvíli počkat, znovu načíst nebo aplikaci otevřít samostatně.",
        "Loading is taking longer. You can wait, reload, or open the application separately.",
      );
    }
  }, 9000);
}

frame.addEventListener("load", () => {
  window.clearTimeout(loadTimeout);
  applyEvaluatorEmbeddedPolish();
  loading.hidden = true;
  frame.hidden = false;
  frame.classList.add("is-ready");
});

reloadButton.addEventListener("click", () => {
  if (!currentApp) return;
  loading.hidden = false;
  frame.classList.remove("is-ready");
  try {
    frame.contentWindow.location.reload();
  } catch {
    frame.src = currentApp.launchUrl;
  }
});
fullscreenButton.addEventListener("click", async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch {
    /* browser may deny */
  }
});
externalButton.addEventListener("click", openSeparately);
errorExternalButton.addEventListener("click", openSeparately);

(async () => {
  try {
    const appId = new URLSearchParams(location.search).get("app");
    if (!appId)
      throw new Error(
        t(
          "V adrese chybí identifikátor aplikace.",
          "The application identifier is missing from the URL.",
        ),
      );
    await initialiseAccess();
    const apps = await fetchApps();
    const app = apps.find((item) => item.id === appId);
    if (!app)
      throw new Error(
        t(
          "Vybraná aplikace není v registru Studia.",
          "The selected application is not in the Studio registry.",
        ),
      );
    currentApp = app;
    const access = hasAppAccess(app.id);
    if (!access.enabled) {
      showError(
        t("Aplikace je uzamčena.", "The application is locked."),
        formatReason(access.reason, language),
      );
      return;
    }
    setApp(app);
  } catch (error) {
    showError(
      t(
        "Aplikaci se nepodařilo připravit.",
        "The application could not be prepared.",
      ),
      error instanceof Error ? error.message : String(error),
    );
  }
})();
