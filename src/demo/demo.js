await window.GHRAB.accessReady;

const G = window.GHRAB;
if (G.isAdmin() && !G.isColleaguePreview?.()) {
const kiosk = document.querySelector("#presentation-kiosk");
const appsHost = document.querySelector("#presentation-apps");
const headline = document.querySelector("#presentation-headline");
const copy = document.querySelector("#presentation-copy");
const kicker = document.querySelector("#presentation-kicker");
const progress = document.querySelector("#presentation-progress");
const loopButton = document.querySelector("#presentation-loop");
const nextButton = document.querySelector("#presentation-next");
const fullscreenButton = document.querySelector("#presentation-fullscreen");
const videosHost = document.querySelector("#presentation-videos");

let apps = [];
let config = { videos: [], sceneSeconds: 5, loopPlaylist: true };
let sceneIndex = 0;
let loopActive = false;
let sceneTimer = null;

const conceptScenes = [
  {
    cs: ["JEDEN EKOSYSTÉM", "AI, která zapadá do práce učitele.", "Osm specializovaných aplikací spojuje společný vstup, bezpečnostní pravidla a jednotný školní standard."],
    en: ["ONE ECOSYSTEM", "AI that fits a teacher's work.", "Eight specialised applications share one entry point, safety rules and a common school standard."],
  },
  {
    cs: ["OD NÁPADU K VÝUCE", "Každý nástroj řeší konkrétní pedagogickou práci.", "Testy, diferenciace, hry, materiály i další workflow zůstávají v aplikacích, které jsou pro daný úkol navržené."],
    en: ["FROM IDEA TO LESSON", "Every tool solves a specific teaching task.", "Tests, differentiation, games, resources and other workflows stay in applications designed for the job."],
  },
  {
    cs: ["BEZPEČNOST OD ZAČÁTKU", "Nejdřív data. Potom AI.", "Společné zásady připomínají anonymizaci, práci na sdílených zařízeních a hranice pro citlivé školní informace."],
    en: ["SAFETY FROM THE START", "Data first. AI second.", "Shared rules reinforce anonymisation, shared-device hygiene and boundaries for sensitive school information."],
  },
  {
    cs: ["DALŠÍ KROK", "Materiály, které nemusí zůstat jen jednomu učiteli.", "Se školním serverem může Studio vyrůst v katalog ověřených materiálů předmětových komisí s verzemi a bezpečným sdílením."],
    en: ["THE NEXT STEP", "Resources do not have to stay with one teacher.", "With a school server, Studio can grow into a versioned catalogue of classroom-tested department resources with safe sharing."],
  },
];

function language() {
  return G.state.language === "en" ? "en" : "cs";
}

function sceneList() {
  const appScenes = apps.map((app) => ({
    appId: app.id,
    cs: ["SPECIALIZOVANÁ APLIKACE", G.localised(app.name), app.description?.cs || ""],
    en: ["SPECIALISED APPLICATION", app.name?.en || app.name?.cs || app.id, app.description?.en || app.description?.cs || ""],
  }));
  return [...conceptScenes, ...appScenes];
}

function renderOrbit() {
  appsHost.replaceChildren(...apps.map((app, index) => {
    const item = document.createElement("article");
    item.className = "presentation-orbit-app";
    item.dataset.appId = app.id;
    item.style.setProperty("--orbit-index", String(index));
    item.style.setProperty("--app-accent", app.accent || "#50e8ff");
    const icon = document.createElement("img");
    icon.src = app.icon?.startsWith("http") ? app.icon : `../${app.icon}`;
    icon.alt = "";
    const label = document.createElement("strong");
    label.textContent = G.localised(app.name);
    item.append(icon, label);
    return item;
  }));
}

function renderProgress(scenes) {
  progress.replaceChildren(...scenes.map((_, index) => {
    const dot = document.createElement("span");
    dot.className = index === sceneIndex ? "active" : "";
    return dot;
  }));
}

function showScene(index = sceneIndex) {
  const scenes = sceneList();
  if (!scenes.length) return;
  sceneIndex = ((index % scenes.length) + scenes.length) % scenes.length;
  const scene = scenes[sceneIndex];
  const text = scene[language()] || scene.cs;
  kicker.textContent = text[0];
  headline.textContent = text[1];
  copy.textContent = text[2];
  document.querySelectorAll(".presentation-orbit-app").forEach((item) => {
    item.classList.toggle("is-active", Boolean(scene.appId && item.dataset.appId === scene.appId));
  });
  kiosk.dataset.sceneApp = scene.appId || "concept";
  renderProgress(scenes);
}

function scheduleSceneLoop() {
  clearTimeout(sceneTimer);
  if (!loopActive) return;
  sceneTimer = setTimeout(() => {
    showScene(sceneIndex + 1);
    scheduleSceneLoop();
  }, Math.max(3, Number(config.sceneSeconds || 5)) * 1000);
}

function resolveMediaUrl(value) {
  if (!value) return "";
  return /^https?:/i.test(value)
    ? value
    : new URL(`../${String(value).replace(/^\.?\//, "")}`, location.href).href;
}

function setLoop(active) {
  loopActive = Boolean(active);
  loopButton.setAttribute("aria-pressed", String(loopActive));
  loopButton.textContent = loopActive
    ? G.t("■ Zastavit smyčku prezentace", "■ Stop presentation loop")
    : G.t("▶ Pustit nekonečnou smyčku prezentace", "▶ Start endless presentation loop");
  kiosk.classList.toggle("is-looping", loopActive);
  clearTimeout(sceneTimer);
  if (!loopActive) return;
  scheduleSceneLoop();
}

function renderVideos() {
  const videos = config.videos || [];
  if (!videos.length) {
    const empty = document.createElement("article");
    empty.className = "panel presentation-video-empty";
    const mark = document.createElement("span");
    mark.textContent = "▶";
    const title = document.createElement("h3");
    title.textContent = G.t("Video slot je připravený", "Video slot is ready");
    const text = document.createElement("p");
    text.textContent = G.t(
      "Až budou hotová demonstrační videa, stačí je vložit do repozitáře a zapsat do config/presentation.json. Stránka je automaticky nabídne a nekonečná smyčka z nich vytvoří playlist.",
      "When the demonstration videos are ready, add them to the repository and list them in config/presentation.json. The page will expose them automatically and the endless loop will turn them into a playlist.",
    );
    empty.append(mark, title, text);
    videosHost.replaceChildren(empty);
    return;
  }
  videosHost.replaceChildren(...videos.map((item) => {
    const article = document.createElement("article");
    article.className = "panel presentation-video-card";
    const video = document.createElement("video");
    video.controls = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.src = resolveMediaUrl(item.src);
    if (item.poster) video.poster = resolveMediaUrl(item.poster);
    const title = document.createElement("h3");
    title.textContent = item.title?.[language()] || item.title?.cs || item.title || "AI Studio GHRAB";
    const text = document.createElement("p");
    text.textContent = item.subtitle?.[language()] || item.subtitle?.cs || item.subtitle || "";
    const actions = document.createElement("div");
    actions.className = "app-actions presentation-video-actions";
    const play = document.createElement("button");
    play.type = "button";
    play.className = "button secondary presentation-video-play";
    play.textContent = G.t("▶ Přehrát film se zvukem", "▶ Play film with sound");
    const loopPlay = document.createElement("button");
    loopPlay.type = "button";
    loopPlay.className = "button primary presentation-video-loop";
    loopPlay.setAttribute("aria-pressed", "false");
    const syncVideoLoopLabel = () => {
      loopPlay.setAttribute("aria-pressed", String(video.loop));
      loopPlay.textContent = video.loop
        ? G.t("■ Zastavit smyčku filmu", "■ Stop film loop")
        : G.t("↻ Pustit film jako smyčku", "↻ Loop film endlessly");
    };
    syncVideoLoopLabel();
    play.addEventListener("click", async () => {
      video.loop = false;
      syncVideoLoopLabel();
      video.muted = false;
      try {
        await video.play();
      } catch {
        G.showToast(G.t("Film se nepodařilo spustit. Zkontrolujte připojení a zkuste stránku obnovit.", "The film could not be started. Check the connection and reload the page."));
      }
    });
    loopPlay.addEventListener("click", async () => {
      if (video.loop) {
        video.loop = false;
        video.pause();
        syncVideoLoopLabel();
        return;
      }
      video.loop = true;
      video.muted = false;
      syncVideoLoopLabel();
      try {
        await video.play();
      } catch {
        video.loop = false;
        syncVideoLoopLabel();
        G.showToast(G.t("Film se nepodařilo spustit. Zkontrolujte připojení a zkuste stránku obnovit.", "The film could not be started. Check the connection and reload the page."));
      }
    });
    actions.append(play, loopPlay);
    article.append(video, title, text, actions);
    return article;
  }));
}

async function toggleFullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await kiosk.requestFullscreen({ navigationUI: "hide" });
  } catch {
    G.showToast(G.t("Celou obrazovku se nepodařilo aktivovat.", "Full screen could not be activated."));
  }
}

function updateFullscreenLabel() {
  fullscreenButton.textContent = document.fullscreenElement
    ? G.t("⤢ Ukončit celou obrazovku", "⤢ Exit full screen")
    : G.t("⛶ Celá obrazovka", "⛶ Full screen");
}

loopButton.addEventListener("click", () => setLoop(!loopActive));
nextButton.addEventListener("click", () => {
  showScene(sceneIndex + 1);
  if (loopActive) scheduleSceneLoop();
});
fullscreenButton.addEventListener("click", toggleFullscreen);
document.addEventListener("fullscreenchange", updateFullscreenLabel);
document.addEventListener("ghrab:language", () => {
  renderOrbit();
  showScene(sceneIndex);
  renderVideos();
  setLoop(loopActive);
  updateFullscreenLabel();
});

try {
  [apps, config] = await Promise.all([
    G.loadApps(),
    fetch("../config/presentation.json", { cache: "no-store" }).then((response) => response.ok ? response.json() : { videos: [] }),
  ]);
} catch (error) {
  console.warn("Presentation configuration could not be loaded.", error);
  apps = await G.loadApps();
}
renderOrbit();
renderVideos();
showScene(0);
updateFullscreenLabel();
}
