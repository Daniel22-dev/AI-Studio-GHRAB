export function createRegistryClient({ base, deploymentReady, applyDeploymentToAppRegistry }) {
  async function fetchJson(url) {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`${url}: ${response.status}`);
    return response.json();
  }
  async function loadApps() {
    let registry;
    try { registry = await fetchJson(`${base}config/apps.generated.json`); }
    catch { registry = await fetchJson(`${base}config/apps.fallback.json`); }
    const deployment = await deploymentReady;
    return applyDeploymentToAppRegistry(deployment, registry);
  }
  async function loadSyncReport() { try { return await fetchJson(`${base}config/sync-report.json`); } catch { return null; } }
  const loadPlatformConsumers = () => fetchJson(`${base}config/platform-consumers.json`);
  const loadAiCoreRegistry = () => fetchJson(`${base}config/ai-core.json`);
  async function loadAiReadiness() {
    const [readiness, deployment] = await Promise.all([fetchJson(`${base}config/ai-readiness.generated.json`), deploymentReady]);
    if (!Array.isArray(readiness?.applications)) return readiness;
    return { ...readiness, applications: readiness.applications.map((item) => {
      const appBaseUrl = deployment.appBaseUrls?.[item.appId];
      return !appBaseUrl || !item.operationsManifestUrl ? item : { ...item, operationsManifestUrl: new URL('ai-operations.json', appBaseUrl).href };
    }) };
  }
  const loadAiRuntime = () => fetchJson(`${base}config/ai-runtime.json`);
  async function loadPermissions() { try { return await fetchJson(`${base}config/permissions.json`); } catch { return null; } }
  return Object.freeze({ fetchJson, loadApps, loadSyncReport, loadPlatformConsumers, loadAiCoreRegistry, loadAiReadiness, loadAiRuntime, loadPermissions });
}
