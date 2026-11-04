/**
 * Stage08 / Groups v2: independently verified same-origin consumer.
 * PREPRODUCTION ONLY. Import from Studio after app access is granted.
 *
 * This is a browser-profile partition, NOT encrypted tenant isolation.
 * This module must never fall back to shared legacy v1 localStorage.
 */
import {
  initialiseAccess,
  getAccessSnapshot,
  hasAppAccess,
} from "../access/access-control.js";
import { createPrincipalGroupsSession } from "./group-service.js";

const CONSUMERS = new Set([
  "ai-studio", "sortio", "essay-evaluator", "lesson-hub", "generator",
]);
const PREVIEW_KEY = "ghrab.ai-studio.role-preview.v1";
let accessPromise = null;

function inAuthorizedOrigin() {
  try {
    const studioOrigin = new URL("../", import.meta.url).origin;
    return globalThis.location?.origin === studioOrigin &&
      ["https:", "http:"].includes(globalThis.location?.protocol);
  } catch {
    return false;
  }
}

function isColleaguePreview() {
  try {
    // Preview cannot impersonate a trained teacher's private storage.
    return Boolean(globalThis.sessionStorage.getItem(PREVIEW_KEY));
  } catch {
    return true; // storage not inspectable -> fail closed
  }
}

function verifiedSnapshot(appId) {
  const snapshot = getAccessSnapshot();
  if (!snapshot.ready || !snapshot.valid ||
      (appId !== "ai-studio" && hasAppAccess(appId).enabled !== true)) {
    return { ready: true, valid: false, permit: null };
  }
  return snapshot;
}

/**
 * Open only after Studio verifies the signed permit or server session
 * itself, including signature, expiration and policy/revocations.
 * Never trust a caller-supplied permit/sub, token or access=true flag.
 */
export async function openVerifiedGroupsV2(appId) {
  if (!CONSUMERS.has(appId)) throw new Error("GROUP_CONSUMER_NOT_ALLOWED");
  if (!inAuthorizedOrigin()) throw new Error("GROUP_ORIGIN_DENIED");
  if (isColleaguePreview()) throw new Error("GROUP_PREVIEW_DENIED");

  if (!accessPromise) {
    accessPromise = initialiseAccess().catch((error) => {
      accessPromise = null;
      throw error;
    });
  }
  try {
    await accessPromise;
  } catch {
    throw new Error("GROUP_ACCESS_VERIFICATION_FAILED");
  }
  if (isColleaguePreview() || !verifiedSnapshot(appId).valid) {
    throw new Error("GROUP_ACCESS_DENIED");
  }

  const session = await createPrincipalGroupsSession({
    getSnapshot: () => verifiedSnapshot(appId),
    isPreview: isColleaguePreview,
  });
  return Object.freeze({
    schema: "ghrab-groups-verified-consumer-v2",
    consumerAppId: appId,
    legacyStorePresent: session.legacyStorePresent,
    service: session.service,
  });
}
