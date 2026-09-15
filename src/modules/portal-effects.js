function setupPortalLifecycle(root) {
  const stage = document.querySelector(".portal-stage");
  if (!stage) return;
  const rect = stage.getBoundingClientRect();
  let visible = rect.bottom >= -120 && rect.top <= (innerHeight || 1) + 120;
  let last = null;
  const update = () => {
    const active = visible && !document.hidden;
    if (active === last) return;
    last = active;
    root.dataset.portalActive = active ? "true" : "false";
    document.dispatchEvent(
      new CustomEvent("ghrab:portal-activity", { detail: { active } }),
    );
  };
  const observer =
    "IntersectionObserver" in globalThis
      ? new IntersectionObserver(
          ([entry]) => {
            visible = Boolean(entry?.isIntersecting);
            update();
          },
          { rootMargin: "120px 0px", threshold: 0.01 },
        )
      : null;
  observer?.observe(stage);
  document.addEventListener("visibilitychange", update, { passive: true });
  addEventListener("pagehide", () => observer?.disconnect(), { once: true });
  update();
}

export function evaluateFrameSample(points) {
  const values = Array.isArray(points)
    ? points.map(Number).filter(Number.isFinite)
    : [];
  const intervals = values
    .slice(1)
    .map((value, index) => value - values[index])
    .filter((value) => value > 0 && value < 120);
  if (intervals.length < 18)
    return {
      recommendedMode: "lite",
      averageFrameMs: 0,
      p90FrameMs: 0,
      slowFrameRatio: 1,
    };
  const sorted = [...intervals].sort((a, b) => a - b);
  const average = intervals.reduce((sum, value) => sum + value, 0) / intervals.length;
  const p90 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.9))];
  const slow = intervals.filter((value) => value > 28).length / intervals.length;
  const severe = intervals.filter((value) => value > 45).length / intervals.length;
  return {
    recommendedMode:
      average > 23 || p90 > 30 || slow > 0.18 || severe > 0.06
        ? "lite"
        : "full",
    averageFrameMs: Math.round(average * 10) / 10,
    p90FrameMs: Math.round(p90 * 10) / 10,
    slowFrameRatio: Math.round(slow * 1000) / 1000,
  };
}

function sampleFrames(duration = 1100) {
  return new Promise((resolve) => {
    const points = [];
    let raf = 0;
    let done = false;
    const started = performance.now();
    const finish = () => {
      if (done) return;
      done = true;
      cancelAnimationFrame(raf);
      clearTimeout(watchdog);
      resolve(points);
    };
    const frame = (timestamp) => {
      points.push(timestamp);
      if (timestamp - started >= duration || points.length >= 90) return finish();
      raf = requestAnimationFrame(frame);
    };
    const watchdog = setTimeout(finish, duration + 900);
    raf = requestAnimationFrame(frame);
  });
}

function setupRuntimeCalibration(root) {
  let complete = false;
  let running = false;
  let timer = 0;
  const eligible = () =>
    !complete &&
    !running &&
    !document.hidden &&
    root.dataset.portalActive !== "false" &&
    root.dataset.motionPreference === "auto" &&
    root.dataset.motion === "full" &&
    root.dataset.motionCalibration === "eligible";
  const schedule = () => {
    clearTimeout(timer);
    if (!eligible()) return;
    timer = setTimeout(async () => {
      if (!eligible()) return;
      running = true;
      root.dataset.motionCalibration = "sampling";
      const sample = await sampleFrames();
      running = false;
      if (!eligible() && root.dataset.motionCalibration !== "sampling") return;
      if (
        document.hidden ||
        root.dataset.portalActive === "false" ||
        root.dataset.motionPreference !== "auto" ||
        root.dataset.motion !== "full"
      ) {
        root.dataset.motionCalibration = "eligible";
        schedule();
        return;
      }
      const result = evaluateFrameSample(sample);
      complete = true;
      root.dataset.motionCalibration =
        result.recommendedMode === "full" ? "passed" : "downgrade";
      document.dispatchEvent(
        new CustomEvent("ghrab:motion-calibration", { detail: result }),
      );
    }, 650);
  };
  document.addEventListener("ghrab:portal-activity", schedule);
  document.addEventListener("ghrab:motion", schedule);
  addEventListener("pagehide", () => clearTimeout(timer), { once: true });
  schedule();
}

function setupStarfield(root) {
  const canvas = document.querySelector("#starfield");
  const ctx = canvas?.getContext("2d", { alpha: true });
  if (!canvas || !ctx) return;
  let stars = [];
  let raf = 0;
  let running = false;
  let lastFrame = 0;
  const frameInterval = 1000 / 30;
  const resize = () => {
    if (!running) return;
    const dpr = Math.min(devicePixelRatio || 1, 1.35);
    canvas.width = Math.floor(innerWidth * dpr);
    canvas.height = Math.floor(innerHeight * dpr);
    canvas.style.width = `${innerWidth}px`;
    canvas.style.height = `${innerHeight}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.min(95, Math.max(38, Math.floor(innerWidth / 15)));
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * innerWidth,
      y: Math.random() * innerHeight,
      r: Math.random() * 0.9 + 0.12,
      a: Math.random() * 0.52 + 0.18,
      s: Math.random() * 0.055 + 0.012,
    }));
  };
  const draw = (timestamp) => {
    if (!running) return;
    raf = requestAnimationFrame(draw);
    if (timestamp - lastFrame < frameInterval) return;
    lastFrame = timestamp;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const star of stars) {
      star.y = star.y > innerHeight + 2 ? -2 : star.y + star.s;
      ctx.beginPath();
      ctx.fillStyle = `rgba(166,235,255,${star.a})`;
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fill();
    }
  };
  const pause = () => {
    running = false;
    cancelAnimationFrame(raf);
    raf = 0;
  };
  const sync = () => {
    if (root.dataset.motion !== "full") {
      pause();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      canvas.hidden = true;
      return;
    }
    canvas.hidden = false;
    if (document.hidden || root.dataset.portalActive === "false") return pause();
    if (running) return;
    running = true;
    lastFrame = 0;
    resize();
    raf = requestAnimationFrame(draw);
  };
  addEventListener("resize", resize, { passive: true });
  document.addEventListener("ghrab:motion", sync);
  document.addEventListener("ghrab:portal-activity", sync);
  addEventListener("pagehide", pause, { once: true });
  sync();
}

export function setupPortalEffects({ root = document.documentElement } = {}) {
  setupPortalLifecycle(root);
  setupStarfield(root);
  setupRuntimeCalibration(root);
  window.GHRAB_PLATFORM?.performance?.mark?.("studio:portal-effects-ready");
}
