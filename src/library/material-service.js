const RECORD_SCHEMA = "ghrab-shared-material-record-v1";
const PUBLISH_SCHEMA = "ghrab-shared-material-write-v1";
const QUALITY_EVENT_SCHEMA = "ghrab-material-quality-event-v1";

export class MaterialServerUnavailableError extends Error {
  constructor(message = "Shared material server is not connected.") {
    super(message);
    this.name = "MaterialServerUnavailableError";
  }
}

function trimSlash(value) {
  return String(value || "").replace(/^\/+|\/+$/g, "");
}

function endpoint(config, key, fallback) {
  return trimSlash(config?.endpoints?.[key] || fallback);
}

function serverConnected(config) {
  return Boolean(
    config?.profile === "school-server" &&
      config?.features?.schoolServerConnected === true &&
      config?.features?.sharedMaterialLibrary === true &&
      config?.apiBaseUrl,
  );
}

function serverPrepared(config) {
  return Boolean(
    config?.features?.sharedMaterialLibraryReady === true &&
      config?.features?.commissionSharingReady === true,
  );
}

function clone(value) {
  return typeof structuredClone === "function"
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));
}

function assertSafeMaterial(G, material) {
  const validation = G.validateMaterialPackage(material);
  if (!validation.valid) {
    throw new TypeError("Invalid GHRAB Material v1 package.");
  }
  if (material?.provenance?.containsPersonalData === true) {
    throw new TypeError(
      G.t(
        "Materiál označený jako obsahující osobní údaje nelze sdílet na školní server.",
        "A resource marked as containing personal data cannot be shared to the school server.",
      ),
    );
  }
}

export function createMaterialRepository(G) {
  if (!G?.deploymentReady) {
    throw new TypeError("Material repository requires GHRAB deploymentReady.");
  }

  async function configuration() {
    return G.deploymentReady;
  }

  async function capabilities() {
    const config = await configuration();
    return Object.freeze({
      profile: config.profile,
      prepared: serverPrepared(config),
      connected: serverConnected(config),
      commissionSharing: Boolean(config?.features?.commissionSharingReady),
      versioning: Boolean(config?.features?.materialVersioningReady),
      classroomValidation: Boolean(
        config?.features?.classroomValidationReady,
      ),
      commissionReview: Boolean(config?.features?.commissionReviewReady),
    });
  }

  async function request(path, { method = "GET", body } = {}) {
    const config = await configuration();
    if (!serverConnected(config)) throw new MaterialServerUnavailableError();
    const url = new URL(trimSlash(path), config.apiBaseUrl);
    const response = await fetch(url, {
      method,
      cache: "no-store",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        "X-GHRAB-Client": "ai-studio-materials-v1",
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(
        `Material server request failed (${response.status})${detail ? `: ${detail.slice(0, 180)}` : ""}`,
      );
    }
    if (response.status === 204) return null;
    return response.json();
  }

  async function listCommissions() {
    const config = await configuration();
    const data = await request(endpoint(config, "commissions", "commissions"));
    const items = Array.isArray(data?.items) ? data.items : [];
    return items.filter(
      (item) => item && typeof item.id === "string" && item.id.trim(),
    );
  }

  async function listSharedMaterials({ commissionId = "" } = {}) {
    const config = await configuration();
    const base = endpoint(config, "materials", "materials");
    const params = new URLSearchParams({ scope: "commission" });
    if (commissionId) params.set("commissionId", commissionId);
    const data = await request(`${base}?${params.toString()}`);
    const items = Array.isArray(data?.items) ? data.items : [];
    return items.filter((item) => item?.schema === RECORD_SCHEMA);
  }

  async function publishToCommission(material, commissionId) {
    if (!String(commissionId || "").trim()) {
      throw new TypeError("commissionId is required.");
    }
    assertSafeMaterial(G, material);
    const config = await configuration();
    const base = endpoint(config, "materials", "materials");
    return request(base, {
      method: "POST",
      body: {
        schema: PUBLISH_SCHEMA,
        visibility: {
          scope: "commission",
          commissionId: String(commissionId),
        },
        material: clone(material),
        client: {
          appId: "ai-studio",
          appVersion: G.VERSION,
        },
      },
    });
  }

  async function forkToWorkspace(recordId) {
    const config = await configuration();
    const base = endpoint(config, "materials", "materials");
    const data = await request(
      `${base}/${encodeURIComponent(recordId)}/fork`,
      { method: "POST", body: { target: "workspace" } },
    );
    const material = data?.material;
    assertSafeMaterial(G, material);
    return material;
  }

  async function recordQuality(recordId, event) {
    if (!["classroom-tested", "commission-reviewed"].includes(event)) {
      throw new TypeError("Unsupported material quality event.");
    }
    const config = await configuration();
    const base = endpoint(config, "materials", "materials");
    return request(
      `${base}/${encodeURIComponent(recordId)}/quality-events`,
      {
        method: "POST",
        body: {
          schema: QUALITY_EVENT_SCHEMA,
          event,
          occurredAt: new Date().toISOString(),
        },
      },
    );
  }

  return Object.freeze({
    capabilities,
    listCommissions,
    listSharedMaterials,
    publishToCommission,
    forkToWorkspace,
    recordQuality,
  });
}

export const SHARED_MATERIAL_RECORD_SCHEMA = RECORD_SCHEMA;
