export const MOTION_MODES = Object.freeze(["auto", "full", "lite", "off"]);
export const MOTION_STORAGE_KEY = "ghrab.ai-studio.motion.v1";
const LEGACY_KEY = "ghrab.motion";
const AUTO_PROFILE_KEY = "ghrab.ai-studio.motion-auto-profile.v1";

export function normaliseMotionPreference(value) {
  const mode = String(value || "").toLowerCase();
  return MOTION_MODES.includes(mode) ? mode : "auto";
}

export function readMotionPreference(storage = globalThis.localStorage) {
  try {
    return normaliseMotionPreference(
      storage?.getItem?.(MOTION_STORAGE_KEY) || storage?.getItem?.(LEGACY_KEY),
    );
  } catch {
    return "auto";
  }
}

export function writeMotionPreference(value, storage = globalThis.localStorage) {
  try {
    storage?.setItem?.(MOTION_STORAGE_KEY, normaliseMotionPreference(value));
    return true;
  } catch {
    return false;
  }
}

const positive = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
};
const matches = (windowRef, query) => {
  try {
    return Boolean(windowRef?.matchMedia?.(query)?.matches);
  } catch {
    return false;
  }
};

export function collectMotionSignals({
  windowRef = globalThis.window,
  navigatorRef = globalThis.navigator,
} = {}) {
  return {
    reducedMotion: matches(windowRef, "(prefers-reduced-motion: reduce)"),
    compactViewport: matches(windowRef, "(max-width: 700px)"),
    coarsePointer: matches(windowRef, "(pointer: coarse)"),
    saveData: Boolean(navigatorRef?.connection?.saveData),
    hardwareConcurrency: positive(navigatorRef?.hardwareConcurrency),
    deviceMemory: positive(navigatorRef?.deviceMemory),
  };
}

export function resolveAutomaticMotion(signals = {}) {
  if (signals.reducedMotion)
    return { mode: "off", reason: "reduced-motion", calibrate: false };
  if (signals.saveData)
    return { mode: "lite", reason: "save-data", calibrate: false };
  if (signals.compactViewport || signals.coarsePointer)
    return { mode: "lite", reason: "compact-device", calibrate: false };
  const cores = positive(signals.hardwareConcurrency);
  const memory = positive(signals.deviceMemory);
  if ((cores && cores <= 4) || (memory && memory <= 4))
    return { mode: "lite", reason: "hardware-class", calibrate: false };
  return cores >= 8 && (!memory || memory >= 8)
    ? { mode: "full", reason: "strong-device-candidate", calibrate: true }
    : { mode: "lite", reason: "conservative-default", calibrate: false };
}

export function readRuntimeAutoProfile(storage = globalThis.sessionStorage) {
  try {
    const value = JSON.parse(storage?.getItem?.(AUTO_PROFILE_KEY) || "null");
    return value?.schema === "ghrab-motion-auto-profile-v1" && value.mode === "lite"
      ? value
      : null;
  } catch {
    return null;
  }
}

export function writeRuntimeAutoProfile(profile, storage = globalThis.sessionStorage) {
  if (profile?.mode !== "lite") return false;
  try {
    storage?.setItem?.(
      AUTO_PROFILE_KEY,
      JSON.stringify({
        schema: "ghrab-motion-auto-profile-v1",
        mode: "lite",
        reason: String(profile.reason || "runtime-calibration"),
      }),
    );
    return true;
  } catch {
    return false;
  }
}

export function resolveMotionPreference({
  preference = "auto",
  signals = {},
  runtimeProfile = null,
} = {}) {
  const selected = normaliseMotionPreference(preference);
  if (signals.reducedMotion)
    return { mode: "off", reason: "reduced-motion", calibrate: false };
  if (selected !== "auto")
    return { mode: selected, reason: "manual", calibrate: false };
  const automatic = resolveAutomaticMotion(signals);
  return automatic.mode === "full" && runtimeProfile?.mode === "lite"
    ? {
        mode: "lite",
        reason: runtimeProfile.reason || "runtime-calibration",
        calibrate: false,
      }
    : automatic;
}
