import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const failures = [];
const check = (condition, message) => {
  if (!condition) failures.push(message);
};
const text = (rel) => readFile(path.join(root, rel), "utf8");

const presence = await import(
  pathToFileURL(path.join(root, "src/modules/live-presence.js")).href
);

const githubConfig = {
  profile: "github-pages",
  authMode: "signed-permit",
  apiBaseUrl: "",
  endpoints: { presence: "presence" },
  features: {
    schoolServerConnected: false,
    livePresenceReady: true,
    livePresence: false,
  },
};

let serverlessFetches = 0;
const disconnected = await presence.loadLivePresence(
  Promise.resolve(githubConfig),
  async () => {
    serverlessFetches += 1;
    throw new Error("unexpected fetch");
  },
);
check(serverlessFetches === 0, "Bezserverovy profil se pokusil kontaktovat presence endpoint.");
check(disconnected.prepared === true && disconnected.enabled === false, "Bezserverovy snapshot nerozlisuje pripravenost od aktivace.");

const serverConfig = {
  profile: "school-server",
  authMode: "server-session",
  apiBaseUrl: "https://school.example/api/v1/",
  endpoints: { presence: "presence" },
  features: {
    schoolServerConnected: true,
    livePresenceReady: true,
    livePresence: true,
  },
};

const previousSession = globalThis.__GHRAB_SERVER_SESSION__;
globalThis.__GHRAB_SERVER_SESSION__ = {
  authenticated: true,
  requestToken: "test-request-token",
  csrfToken: "test-request-token",
};

let heartbeatRequest = null;
await presence.sendLivePresenceHeartbeat(serverConfig, {
  appId: "generator",
  fetchImpl: async (url, init) => {
    heartbeatRequest = { url: String(url), init };
    return { ok: true, status: 204 };
  },
});
check(heartbeatRequest?.url === "https://school.example/api/v1/presence", "Heartbeat pouziva chybnou serverovou URL.");
check(heartbeatRequest?.init?.method === "POST", "Heartbeat neni POST.");
check(heartbeatRequest?.init?.credentials === "include", "Heartbeat neposila serverovou session cookie.");
check(heartbeatRequest?.init?.headers?.Authorization === "Bearer test-request-token", "Heartbeat nema request-token autorizaci.");
check(heartbeatRequest?.init?.headers?.["X-GHRAB-CSRF"] === "test-request-token", "Heartbeat nema CSRF header.");
const heartbeatBody = JSON.parse(heartbeatRequest?.init?.body || "{}");
check(heartbeatBody.schema === "ghrab-live-presence-heartbeat-v1", "Heartbeat ma chybne schema.");
check(heartbeatBody.appId === "generator", "Heartbeat neprenasi identitu aplikace.");
check(Object.keys(heartbeatBody).sort().join(",") === "appId,schema", "Heartbeat prenasi vic nez minimalni appId + schema.");
for (const forbidden of ["displayName", "name", "email", "userId", "appVersion", "activeAt", "prompt", "content", "materialId"]) {
  check(!(forbidden in heartbeatBody), `Heartbeat nepripustne obsahuje ${forbidden}.`);
}
let relativeEndpointUrl = "";
await presence.sendLivePresenceHeartbeat({ ...serverConfig, apiBaseUrl: "/api/v1/" }, {
  appId: "generator",
  fetchImpl: async (url) => { relativeEndpointUrl = String(url); return { ok: true, status: 204 }; },
});
check(relativeEndpointUrl === "http://localhost/api/v1/presence", "Relativni school-server apiBaseUrl se nesklada proti originu.");

const documentListeners = new Map();
const windowListeners = new Map();
const fakeDocument = {
  visibilityState: "hidden",
  hasFocus: () => true,
  addEventListener: (type, handler) => documentListeners.set(type, handler),
  removeEventListener: (type, handler) => {
    if (documentListeners.get(type) === handler) documentListeners.delete(type);
  },
};
const fakeWindow = {
  addEventListener: (type, handler) => windowListeners.set(type, handler),
  removeEventListener: (type, handler) => {
    if (windowListeners.get(type) === handler) windowListeners.delete(type);
  },
  setInterval: () => 77,
  clearInterval: () => {},
};
let lifecycleFetches = 0;
const stopLifecycle = await presence.startLivePresenceHeartbeat(Promise.resolve(serverConfig), {
  appId: "lifecycle-test-app",
  documentRef: fakeDocument,
  windowRef: fakeWindow,
  fetchImpl: async () => {
    lifecycleFetches += 1;
    return { ok: true, status: 204 };
  },
});
await new Promise((resolve) => setTimeout(resolve, 0));
check(lifecycleFetches === 0, "Skryta karta odeslala presence heartbeat.");
fakeDocument.visibilityState = "visible";
documentListeners.get("visibilitychange")?.();
await new Promise((resolve) => setTimeout(resolve, 0));
check(lifecycleFetches === 1, "Viditelna zamerena karta neodeslala presence heartbeat.");
stopLifecycle();
check(documentListeners.size === 0, "Stop live presence ponechal document listener.");

let listRequest = null;
const snapshot = await presence.loadLivePresence(
  Promise.resolve(serverConfig),
  async (url, init) => {
    listRequest = { url: String(url), init };
    return {
      ok: true,
      status: 200,
      json: async () => ({
        schema: "ghrab-live-presence-v1",
        generatedAt: "2026-09-11T10:00:15.000Z",
        staleAfterSeconds: 120,
        users: [
          {
            displayName: "Jana Nováková",
            email: "jana@example.com",
            userId: "secret-id",
            appId: "generator",
            lastSeenAt: "2026-09-11T10:00:02.000Z",
          },
          { displayName: "Neplatný záznam", appId: "generator" },
        ],
      }),
    };
  },
);
check(listRequest?.init?.method === "GET", "Spravcovsky presence snapshot neni GET.");
check(snapshot.connected === true && snapshot.enabled === true, "Platny serverovy snapshot neni oznacen jako pripojeny.");
check(snapshot.users.length === 1, "Presence snapshot neodfiltroval neplatny zaznam.");
check(snapshot.users[0]?.displayName === "Jana Nováková" && snapshot.users[0]?.appId === "generator", "Presence snapshot ztratil povolena pole.");
check(Object.keys(snapshot.users[0] || {}).sort().join(",") === "appId,displayName,lastSeenAt", "Spravcovsky klient propousti nadbytecne identifikacni pole.");

const platformRuntime = await text("src/access/platform-runtime.js");
check(
  platformRuntime.includes('await import("../modules/live-presence.js")') &&
    platformRuntime.includes("function livePresenceEnabled()") &&
    platformRuntime.includes("startConfiguredLivePresence(appId)"),
  "Centralni platform runtime nespousti podminene live presence heartbeat pro chranene aplikace.",
);
check(
  !platformRuntime.includes('import { startLivePresenceHeartbeat } from "../modules/live-presence.js"'),
  "Live presence je statickou zavislosti kritickeho platform runtime i v bezserverovem profilu.",
);
const presenceSource = await text("src/modules/live-presence.js");
check(!presenceSource.includes("localStorage") && !presenceSource.includes("sessionStorage"), "Live presence nesmi ukladat historii do browser storage.");
for (const rel of [
  "src/config/deployment.json",
  "src/config/deployment.school-server.json",
  "src/config/deployment.school-server.example.json",
  "src/config/deployment.school-server-p0.json",
]) {
  const deployment = JSON.parse(await text(rel));
  check(deployment.endpoints?.presence === "presence", `${rel}: chybi presence endpoint.`);
  check(deployment.features?.livePresenceReady === true, `${rel}: live presence neni deklarovana jako pripravena.`);
  check(deployment.features?.livePresence === false, `${rel}: live presence nesmi byt v predavanem baliku aktivni bez backendu.`);
}
const automationHtml = await text("src/automation/index.html");
check(automationHtml.includes('id="live-presence-panel"') && automationHtml.includes('data-full-admin-only'), "Sprava nema live presence panel omezeny na plneho spravce.");
const automationJs = await text("src/automation/automation.js");
check(automationJs.includes('loadLivePresence') && automationJs.includes('window.GHRAB.isAdmin?.()'), "Spravcovsky live presence klient nema admin kontrolu.");
const contract = await text("docs/LIVE-PRESENCE-SERVER-CONTRACT.md");
check(contract.includes('neposílá jméno, e-mail') && contract.includes('TTL je 120 sekund') && contract.includes('neukládat historii'), "Serverovy kontrakt neobsahuje minimalizaci dat, TTL nebo zakaz historie.");

if (previousSession === undefined) delete globalThis.__GHRAB_SERVER_SESSION__;
else globalThis.__GHRAB_SERVER_SESSION__ = previousSession;

if (failures.length) {
  console.error(`Live presence QA: ${failures.length} failure(s)`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("Live presence QA: PASS");
