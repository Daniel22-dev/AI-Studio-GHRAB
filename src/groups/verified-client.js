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
/**
 * Least-privilege public API for cooperating consumers.
 * This limits accidental cross-app disclosure; same-origin JavaScript can
 * still import underlying localStorage modules or lie about its appId.
 * Genuine malicious-code isolation requires server-side app identity checks.
 */
function bindConsumerService(service, appId) {
  if (service?.schema !== "ghrab-groups-service-v1" ||
      service.contractVersion !== 1) {
    throw new Error("GROUP_CONSUMER_SERVICE_INVALID");
  }
  const projection = Object.freeze({
    "ai-studio": null,
    "sortio": "sortio",
    "essay-evaluator": "essay-evaluator",
    "lesson-hub": null,
    "generator": "generator-forms",
  });
  if (!Object.hasOwn(projection, appId)) throw new Error("GROUP_CONSUMER_NOT_ALLOWED");
  const expectedProjection = projection[appId];
  const reader = Object.create(null);
  Object.assign(reader, {
    schema: "ghrab-groups-service-v1",
    contractVersion: 1,
    listGroupMetadata(requestedAppId, options) {
      if (requestedAppId !== appId) throw new Error("GROUP_CONSUMER_BINDING_DENIED");
      return service.listGroupMetadata(appId, options);
    },
  });
  if (expectedProjection) {
    reader.getRosterProjection = (groupId, requestedProjectionId) => {
      if (requestedProjectionId !== expectedProjection) {
        throw new Error("GROUP_CONSUMER_PROJECTION_DENIED");
      }
      return service.getRosterProjection(groupId, expectedProjection);
    };
  }
  // SORTIO owns an explicit teacher-confirmed operation creating central
  // groups from a local IS roster. Other readers must remain read-only.
  if (appId === "sortio") {
    for (const method of ["parseRoster","createGroup","importRoster","getRevision","subscribe"]) {
      if (typeof service[method] !== "function") throw new Error("GROUP_CONSUMER_SERVICE_INVALID");
      reader[method] = (...args) => service[method](...args);
    }
  }
  return Object.freeze(reader);
}

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
    service: bindConsumerService(session.service, appId),
  });
}
