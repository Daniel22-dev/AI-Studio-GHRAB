(() => {
  try { performance.mark("ghrab-studio-start"); } catch {}
  const root = document.documentElement;
  const INTRO_SEEN_KEY = "ghrab.startup-intro.seen.v1";
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
    const alreadySeen = localStorage.getItem(INTRO_SEEN_KEY) === "seen";
    showIntro = motion !== "off" && !alreadySeen;
  } catch {
  }

  const hardwareConcurrency = Number(navigator.hardwareConcurrency) || 0;
  const deviceMemory = Number(navigator.deviceMemory) || 0;
  if (
    matchMedia("(max-width: 899px)").matches ||
    matchMedia("(prefers-reduced-motion: reduce)").matches ||
    navigator.connection?.saveData ||
    (hardwareConcurrency > 0 && hardwareConcurrency <= 4) ||
    (deviceMemory > 0 && deviceMemory <= 4)
  ) {
    showIntro = false;
  }

  root.classList.remove("startup-prepaint");
  root.classList.add(
    showIntro ? "startup-intro-pending" : "startup-intro-skip",
  );
  if (!showIntro) releaseStartupGate();
})();
