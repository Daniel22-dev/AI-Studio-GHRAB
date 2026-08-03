(() => {
  const root = document.documentElement;
  const version = root.dataset.appVersion || "0.20.1";
  let showIntro = true;

  try {
    const motion = localStorage.getItem("ghrab.motion") || "auto";
    const alreadySeen =
      sessionStorage.getItem(`ghrab.startup-intro.${version}`) === "seen";
    showIntro = motion !== "off" && !alreadySeen;
  } catch {
    // Storage may be unavailable; the intro remains the safe visual default.
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
})();
