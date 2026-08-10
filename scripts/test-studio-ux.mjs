import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import vm from "node:vm";
import { webcrypto } from "node:crypto";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const src = path.join(root, "src");
const failures = [];
const check = (condition, message) => {
  if (!condition) failures.push(message);
};
const text = (rel) => readFile(path.join(root, rel), "utf8");

const home = await text("src/index.html");
for (const oldBlock of ["mission-strip", "workflow-home", "communication-lane", "admin-home"]) {
  check(!home.includes(oldBlock), `Domovska stranka stale obsahuje ${oldBlock}.`);
}
check(home.includes('data-nav="changelog"'), "Domovska navigace nema Katalog zmen.");
check(home.includes('data-nav="library"'), "Domovska navigace nema server-ready Materialy.");
check(!home.includes('data-nav="workflow"'), "Domovska navigace znovu propaguje centralni tvorbu materialu.");
check(home.includes('class="first-run-guide"') && home.includes('ai-studio-teacher.html') && home.includes('ai-studio-admin.html'), "Domovska stranka nema nenapadny role-aware prvni pruvodce AI Studia.");

const standardHtml = [
  "src/index.html", "src/access/index.html", "src/automation/index.html", "src/demo/index.html",
  "src/pilot/index.html", "src/report/index.html", "src/safety/index.html", "src/manualy/index.html",
  "src/changelog/index.html", "src/tests/index.html", "src/tools/access-issuer/index.html",
  "src/tools/access-registry/index.html", "src/workflow/index.html", "src/library/index.html",
];
for (const rel of standardHtml) {
  const html = await text(rel);
  check(html.includes('data-nav="changelog"'), `${rel} nema Katalog zmen v horni navigaci.`);
  check(html.includes('data-nav="library"'), `${rel} nema server-ready Materialy v horni navigaci.`);
  check(!html.includes('data-nav="workflow"'), `${rel} stale obsahuje centralni tvorbu materialu v hlavni navigaci.`);
  check(!html.includes('class="footer-links"'), `${rel} stale obsahuje duplicitni patickovou navigaci.`);
}

const policy = JSON.parse(await text("src/config/access-policy.json"));
check(!policy.administratorPages.includes("changelog"), "Katalog zmen je stale spravcovska stranka.");
const changelogJs = await text("src/changelog/changelog.js");
check(!changelogJs.includes("isAdmin"), "Katalog zmen se stale renderuje jen spravci.");

const appJs = await text("src/app.js");
check(appJs.includes('if (page === "changelog") return;'), "Katalog zmen nema runtime kompatibilitu pro starsi podepsany policy bundle.");
check(appJs.includes('[data-teacher-only]'), "Chybi role teacher-only.");
check(appJs.includes('snapshot.valid && snapshot.permit?.role !== "admin"'), "Teacher-only prvky nejsou vazany na platny nespravcovsky pristup.");
check(/function renderExtraApps\(apps\)[\s\S]{0,1400}const anchor = document\.querySelector\("\.value-section"\)[\s\S]{0,220}anchor\.before\(section\)[\s\S]{0,120}main\?\.append\(section\)/.test(appJs), "Dalsi aplikace se po odstraneni mission-strip nemaji kam vlozit.");
check(!appJs.includes('document.querySelector(".mission-strip")?.before(section)'), "Render dalsich aplikaci stale zavisi na odstranene mission-strip.");
const accessHtml = await text("src/access/index.html");
check(/data-teacher-only[^>]*hidden[\s\S]*?ANONYMN[IÍ]/.test(accessHtml), "Mesicni souhrn v Muj pristup neni teacher-only.");
const manualsHtml = await text("src/manualy/index.html");
check(/data-teacher-only[^>]*hidden[\s\S]*?Jak odevzdat m/.test(manualsHtml), "Navod k mesicnimu souhrnu neni teacher-only.");
check(/data-admin-only[^>]*hidden[\s\S]*?Automatick/.test(manualsHtml), "Navod evidence pristupu neni admin-only.");
check(/data-teacher-only[^>]*hidden[\s\S]*?ai-studio-teacher\.html/.test(manualsHtml), "Centrum manualu nema roli ucitele pro manual AI Studia.");
check(/data-admin-only[^>]*hidden[\s\S]*?ai-studio-admin\.html/.test(manualsHtml), "Centrum manualu nema roli administratora pro manual AI Studia.");
const teacherStudioGuide = await text("src/manualy/ai-studio-teacher.html");
const adminStudioGuide = await text("src/manualy/ai-studio-admin.html");
check(teacherStudioGuide.includes("Co běžný učitel nemusí řešit") && !teacherStudioGuide.includes("Pilotní dashboard / Souhrnném reportu"), "Manual ucitele neni zjednoduseny pro bezny provoz.");
check(adminStudioGuide.includes("Co vidím navíc oproti učiteli") && adminStudioGuide.includes("pilotnímu dashboardu") && adminStudioGuide.includes("Souhrnném reportu") && adminStudioGuide.includes('data-page="manual-admin"'), "Manual administratora nema rozsirene spravcovske workflow.");
const adminStudioGuideGuard = await text("src/manualy/ai-studio-admin.js");
check(adminStudioGuideGuard.includes("G.isAdmin()") && adminStudioGuideGuard.includes("ai-studio-teacher.html"), "Administratorsky manual nema runtime roli guard pro aktualni permit.");

const adminHtml = await text("src/automation/index.html");
for (const duplicate of ['href="../report/"', 'href="../changelog/"', 'href="../demo/"']) {
  const command = new RegExp(`admin-command-card[\\s\\S]{0,300}${duplicate.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}`);
  check(!command.test(adminHtml), `Sprava stale obsahuje duplicitni prikaz ${duplicate}.`);
}
check(adminHtml.includes('id="preview-monthly-reminder"'), "Sprava nema nahled mesicni prosby.");
const automationJs = await text("src/automation/automation.js");
check(/preview-monthly-reminder[\s\S]{0,180}setupMonthlyReportReminder\(\{[\s\S]{0,40}force:\s*true/.test(automationJs), "Nahled mesicni prosby nespousti vynuceny nahled.");
check(/function setupMonthlyReportReminder\(options = \{\}\)[\s\S]{0,500}const force = Boolean\(options\.force\)[\s\S]{0,500}!force/.test(appJs), "Mesicni reminder nema otestovanou force vetev mimo datum/roli.");

const pilotHtml = await text("src/pilot/index.html");
const pilotJs = await text("src/pilot/pilot.js");
check(!pilotHtml.includes('id="export-pilot"') && !pilotJs.includes('#export-pilot'), "Spravce stale exportuje kolegialni anonymni souhrn sam sobe.");
check(pilotHtml.includes('href="../report/"'), "Pilotni dashboard nevede na souhrnny report kolegu.");

const safetyHtml = await text("src/safety/index.html");
check(safetyHtml.includes("Rychl\u00e1 kontrola dat"), "Bezpecnost nema vysvetlenou rychlou kontrolu dat.");
check(safetyHtml.includes("Nejsem si jistý → rychle posoudit"), "Rychla kontrola neni progresivne schovana pod pomoci pro nejistou situaci.");
check(safetyHtml.includes('class="panel safety-check-details"'), "Rychla kontrola nepouziva rozbalovaci detail.");
check(safetyHtml.includes("Nemusíte kontrolu otevírat před každým použitím AI."), "Bezpecnost nevysvetluje, ze kontrola neni povinna pred kazdym pouzitim.");
check(!safetyHtml.includes("quality-centre") && !safetyHtml.includes("VERZOV\u00c1N\u00cd"), "Bezpecnost stale obsahuje kvalitu/verzovani materialu.");

const libraryHtml = await text("src/library/index.html");
const materialService = await text("src/library/material-service.js");
check(libraryHtml.includes("Materiály dnes lokálně, později společně v předmětových komisích."), "Materialy nevysvetluji serverovy cil.");
check(libraryHtml.includes('id="material-server-state"'), "Materialy nemaji pravdivy stav serveroveho sdileni.");
check(libraryHtml.includes('id="server-shared-section"') && libraryHtml.includes("Ověřeno ve výuce") && libraryHtml.includes("Doporučeno komisí"), "Materialy nemaji pripraveny budouci komisni katalog a stavy kvality.");
check(materialService.includes('config?.features?.schoolServerConnected === true') && materialService.includes('config?.features?.sharedMaterialLibrary === true'), "Material server adapter se muze aktivovat bez skutecneho serveroveho profilu.");
check(materialService.includes("containsPersonalData === true"), "Serverove sdileni nema ochranu proti publikaci materialu s osobnimi udaji.");
check(materialService.includes("publishToCommission") && materialService.includes("forkToWorkspace") && materialService.includes("recordQuality"), "Material server adapter nema pripraveny zakladni operace sdileni/verzovani/overeni.");

// Functional guard: the current GitHub profile must never attempt a network publication.
const materialModule = await import(pathToFileURL(path.join(src, "library/material-service.js")).href);
let materialFetchCalled = false;
const originalFetch = globalThis.fetch;
globalThis.fetch = async () => {
  materialFetchCalled = true;
  throw new Error("unexpected material server fetch");
};
try {
  const localRepository = materialModule.createMaterialRepository({
    VERSION: "0.21.3",
    deploymentReady: Promise.resolve({
      profile: "github-pages",
      apiBaseUrl: "",
      endpoints: { materials: "materials", commissions: "commissions" },
      features: {
        schoolServerConnected: false,
        sharedMaterialLibrary: false,
        sharedMaterialLibraryReady: true,
        commissionSharingReady: true,
      },
    }),
    validateMaterialPackage: () => ({ valid: true }),
    t: (cs) => cs,
  });
  const caps = await localRepository.capabilities();
  check(caps.prepared === true && caps.connected === false, "GitHub profil materialu neni pripraveny-nepripojeny.");
  let blocked = false;
  try {
    await localRepository.publishToCommission(
      { schema: "ghrab-material-v1", id: "local-test", provenance: { containsPersonalData: false } },
      "english",
    );
  } catch (error) {
    blocked = error?.name === "MaterialServerUnavailableError";
  }
  check(blocked, "GitHub profil neblokuje serverovou publikaci materialu.");
  check(materialFetchCalled === false, "GitHub profil se pokusil kontaktovat materialovy server.");
} finally {
  globalThis.fetch = originalFetch;
}
const guideHtml = await text("src/manualy/ecosystem-guide.html");
check(guideHtml.includes("OSM APLIKAC"), "Spolecny manual stale neuvadi osm aplikaci.");
check(guideHtml.includes("Soukrom") && guideHtml.includes("ukon"), "Spolecny manual nepopisuje ukonceni prace na sdilenem zarizeni.");
check(guideHtml.includes("server"), "Spolecny manual nerozlisuje planovany serverovy profil.");

const workflowJs = await text("src/workflow/workflow.js");
for (const target of ["differentiator", "generator", "ludus"]) {
  check(workflowJs.includes(`id: "${target}"`), `Workflow nema definovanou kompatibilitu ${target}.`);
}
check(workflowJs.includes("G.createHandoff(app.id, material)"), "Workflow nevytvari platformni handoff.");
check(workflowJs.includes('target.searchParams.set("studioHandoff", "1")'), "Workflow neoznacuje otevreni cilove aplikace handoff parametrem.");

// Functional contract test for the shared handoff v2: create -> validate -> peek -> consume.
const platformCode = await text("vendor/ghrab-platform-1.1.0/ghrab-platform.js");
const makeStorage = () => {
  const data = new Map();
  return {
    getItem: (key) => data.has(String(key)) ? data.get(String(key)) : null,
    setItem: (key, value) => data.set(String(key), String(value)),
    removeItem: (key) => data.delete(String(key)),
    key: (index) => [...data.keys()][index] ?? null,
    get length() { return data.size; },
  };
};
const localStorage = makeStorage();
const sessionStorage = makeStorage();
const context = {
  URL, TextEncoder, TextDecoder, Date, JSON, Math, Object, Array, Set, Map, Promise,
  String, Number, Boolean, RegExp, Error, TypeError, Uint8Array, console,
  crypto: webcrypto, localStorage, sessionStorage,
  performance: { mark() {}, measure() {}, getEntriesByName() { return []; } },
  location: { href: "https://example.test/AI-Studio-GHRAB/" },
  document: {
    currentScript: { src: "https://example.test/AI-Studio-GHRAB/ghrab/ghrab-platform.js" },
    documentElement: { dataset: { ghrabAppId: "ai-studio", ghrabAppVersion: "0.21.3" } },
    getElementById() { return null; },
    readyState: "loading",
    addEventListener() {},
  },
};
context.window = context;
vm.createContext(context);
vm.runInContext(platformCode, context, { filename: "ghrab-platform.js" });
const material = { schema: "ghrab-material-v1", id: "ux-contract-test", content: { sourceText: "test" } };
const created = context.GHRAB_PLATFORM.bridge.create({
  target: "generator", sourceAppId: "ai-studio", sourceAppVersion: "0.21.3",
  targetVersionRange: ">=0.0.0 <100.0.0", ttlMs: 5 * 60 * 1000, material, writeLegacy: true,
});
check(created?.target === "generator", "Bridge v2 create nevratil cil generator.");
check(context.GHRAB_PLATFORM.bridge.validate(created.packet, { target: "generator" }).ok, "Bridge v2 nevytvoril validni paket.");
check(context.GHRAB_PLATFORM.bridge.peek({ target: "generator" })?.material?.id === material.id, "Bridge v2 peek nevratil material.");
check(context.GHRAB_PLATFORM.bridge.take({ target: "generator" })?.material?.id === material.id, "Bridge v2 take nespotreboval material.");
check(context.GHRAB_PLATFORM.bridge.peek({ target: "generator" }) === null, "Bridge v2 po consume ponechal aktivni paket.");

if (failures.length) {
  console.error("Studio UX/regression test failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("Studio UX/regression test passed: navigation, roles, reporting, safety, monthly preview wiring and handoff v2 contract.");
