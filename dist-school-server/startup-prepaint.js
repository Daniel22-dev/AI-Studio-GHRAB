(() => {
  const root = document.documentElement;
  const version = root.dataset.appVersion || "0.21.55";
  const WATCHDOG_MS = 6000;
  let showIntro = true;
  let watchdog = 0;

  const clearWatchdog = () => {
    if (!watchdog) return;
    clearTimeout(watchdog);
    watchdog = 0;
  };

  const releaseStartupGate = () => {
    clearWatchdog();
    try {
      globalThis.__GHRAB_STARTUP_RELEASE_ISOLATION__?.();
    } catch {
    }
    globalThis.__GHRAB_STARTUP_RELEASE_ISOLATION__ = null;
    root.classList.remove(
      "startup-prepaint",
      "startup-intro-pending",
      "startup-intro-revealing",
    );
    root.classList.add("startup-intro-skip");
    const intro = document.querySelector("#studio-startup-intro");
    if (!intro) return;
    intro.hidden = true;
    intro.inert = true;
    intro.setAttribute("aria-hidden", "true");
    intro.classList.remove("is-active", "is-leaving");
  };

  globalThis.__GHRAB_CLEAR_STARTUP_WATCHDOG__ = clearWatchdog;
  globalThis.__GHRAB_RELEASE_STARTUP_GATE__ = releaseStartupGate;
  watchdog = setTimeout(releaseStartupGate, WATCHDOG_MS);

  try {
    const motion =
      localStorage.getItem("ghrab.ai-studio.motion.v1") ||
      localStorage.getItem("ghrab.motion") ||
      "auto";
    const alreadySeen =
      sessionStorage.getItem(`ghrab.startup-intro.${version}`) === "seen";
    showIntro = motion !== "off" && !alreadySeen;
  } catch {
  }

  if (
    matchMedia("(max-width: 899px)").matches ||
    matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    showIntro = false;
  }

  root.classList.remove("startup-prepaint");
  root.classList.add(
    showIntro ? "startup-intro-pending" : "startup-intro-skip",
  );
  if (!showIntro) releaseStartupGate();
})();
