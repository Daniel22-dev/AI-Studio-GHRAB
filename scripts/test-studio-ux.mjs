import { readFile, stat } from "node:fs/promises";
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

const packageMeta = JSON.parse(await text("package.json"));
check(packageMeta.scripts?.sync?.includes("sync-doc-app-versions.mjs"), "Live synchronizace registru neaktualizuje dokumentacni verze pred QA.");
check(packageMeta.scripts?.["sync:offline"]?.includes("sync-doc-app-versions.mjs"), "Offline synchronizace registru neudrzuje dokumentacni verze ve shode.");

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
  check(html.includes('data-nav="colleague-preview"') && html.includes('data-colleague-preview-link') && html.includes('data-ops-nav'), `${rel} nema provozni Pohled kolegy v horni navigaci.`);
  check(!html.includes('data-nav="workflow"'), `${rel} stale obsahuje centralni tvorbu materialu v hlavni navigaci.`);
  check(!html.includes('class="footer-links"'), `${rel} stale obsahuje duplicitni patickovou navigaci.`);
  check(html.includes('class="site-footer"'), `${rel} nema sjednocenou Studio paticku.`);
}

const policy = JSON.parse(await text("src/config/access-policy.json"));
check(!policy.administratorPages.includes("changelog"), "Katalog zmen je stale spravcovska stranka.");
check(Array.isArray(policy.operatorRoles) && policy.operatorRoles.includes("operator"), "Access policy nema roli operator.");
check(Array.isArray(policy.operatorPages) && ["automation", "pilot", "report", "tests", "access-registry", "deputy-admin"].every((page) => policy.operatorPages.includes(page)), "Access policy nema bezpecny rozsah stranek zastupce spravce.");
const accessControlJs = await text("src/access/access-control.js");
check(accessControlJs.includes("export function isOperator()") && accessControlJs.includes("export function canAccessAdminPage(pageId)"), "Runtime nema oddelenou roli zastupce spravce a strankova opravneni.");
check(accessControlJs.includes('return "invalid-role"'), "Podepsany permit nepripustne role neodmita.");
const changelogJs = await text("src/changelog/changelog.js");
check(!changelogJs.includes("isAdmin"), "Katalog zmen se stale renderuje jen spravci.");
const polishCss = await text("src/polish.css");
const platformConfig = await text("src/platform/ghrab-platform-config.js");
check(platformConfig.includes('"autoFooter": false'), "Platforma stale muze prepsat sjednocenou paticku vlastnim boxem.");
check(!/not\(\.access-ready\)[\s\S]{0,100}data-page="changelog"/.test(polishCss), "Katalog zmen je stale skryt access-ready gate a muze probliknout paticka.");
check(polishCss.includes('.site-footer') && polishCss.includes('#0d4b78') && polishCss.includes('#0a355d'), "Paticka nema samostatny modry Studio blok bez cerneho pozadi.");

const appJs = await text("src/app.js");
check(appJs.includes('if (page === "changelog") return;'), "Katalog zmen nema runtime kompatibilitu pro starsi podepsany policy bundle.");
check(appJs.includes('[data-teacher-only]'), "Chybi role teacher-only.");
check(appJs.includes('COLLEAGUE_PREVIEW_KEY') && appJs.includes('function isColleaguePreview()') && appJs.includes('function mountColleaguePreviewBanner()'), "Chybi session Pohled kolegy.");
check(appJs.includes('const operator = isOperator() && !preview') && appJs.includes('const operations = admin || operator') && appJs.includes('snapshot.permit?.role === "teacher"'), "Role admin/operator/teacher se v UI nerozdeluji bezpecne.");
check(appJs.includes('function swapCoreAppPositions') && appJs.includes('portal-drag-handle') && appJs.includes('dataTransfer'), "Top 4 nema drag-and-drop prehazovani pozic.");
check(appJs.includes('APP_TEST_STATUS_KEY') && appJs.includes('function getAppTestStatus(appId)') && appJs.includes('function setAppTestStatus(appId, status)'), "Karty aplikaci nemaji trvale ulozeny stav testovani podle ID aplikace.");
check(appJs.includes('["untested", "light", "tested"]') && ["○", "◐", "✓"].every((symbol) => appJs.includes(`symbol: "${symbol}"`)), "Stav testovani nema tri odlisne symboly netestovano/lehce/otestovano.");
check(appJs.includes('if (isAdmin() && !isColleaguePreview())') && appJs.includes('appTestStatusButton(app, article)'), "Stav testovani neni dostupny na kazde karte jen ve skutecnem spravcovskem pohledu.");
check(home.includes('class="app-test-status-legend"') && home.includes('○ netestováno') && home.includes('◐ lehce') && home.includes('✓ otestováno'), "Domovska stranka nema spravcovskou legendu stavu testovani.");
check(appJs.includes('Kontrola zneplatněných přístupů aktuální k'), "Souhrn pristupu stale pouziva nejasne oznaceni seznamu odvolani.");
check(appJs.includes('snapshot.valid && snapshot.permit?.role === "teacher"'), "Teacher-only prvky nejsou vazany pouze na roli teacher.");
check(/function renderExtraApps\(apps\)[\s\S]{0,1400}const anchor = document\.querySelector\("\.value-section"\)[\s\S]{0,220}anchor\.before\(section\)[\s\S]{0,120}main\?\.append\(section\)/.test(appJs), "Dalsi aplikace se po odstraneni mission-strip nemaji kam vlozit.");
check(!appJs.includes('document.querySelector(".mission-strip")?.before(section)'), "Render dalsich aplikaci stale zavisi na odstranene mission-strip.");
const accessHtml = await text("src/access/index.html");
check(/data-teacher-only[^>]*hidden[\s\S]*?ANONYMN[IÍ]/.test(accessHtml), "Mesicni souhrn v Muj pristup neni teacher-only.");
const manualsHtml = await text("src/manualy/index.html");
check(/data-teacher-only[^>]*hidden[\s\S]*?Jak odevzdat m/.test(manualsHtml), "Navod k mesicnimu souhrnu neni teacher-only.");
check(/data-admin-only[^>]*hidden[\s\S]*?Automatick/.test(manualsHtml), "Navod evidence pristupu neni admin-only.");
check(/data-teacher-only[^>]*hidden[\s\S]*?ai-studio-teacher\.html/.test(manualsHtml), "Centrum manualu nema roli ucitele pro manual AI Studia.");
check(/data-admin-only[^>]*hidden[\s\S]*?ai-studio-admin\.html/.test(manualsHtml), "Centrum manualu nema roli administratora pro manual AI Studia.");
const deputyGuide = await text("src/manualy/deputy-admin.html");
check(/data-ops-only[^>]*hidden[\s\S]*?deputy-admin\.html/.test(manualsHtml), "Centrum manualu nema krizovy manual zastupce spravce.");
check(deputyGuide.includes('data-page="deputy-admin"') && deputyGuide.includes("GitHub Actions") && deputyGuide.includes("DOČASNÝ PLNÝ SPRÁVCE"), "Manual zastupce nema incidentni triaz a nouzove zastoupeni.");
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
check(adminHtml.includes('data-full-admin-only') && adminHtml.includes('../tools/access-issuer/'), "Vydavatel opravneni neni ve Sprave omezen jen na plneho admina.");
check(adminHtml.includes('data-operator-only') && adminHtml.includes('deputy-admin.html'), "Sprava nema provozni informaci pro zastupce spravce.");
check(automationJs.includes('canAccessAdminPage?.("automation")'), "Sprava neuznava strankove opravneni zastupce.");
check(/preview-monthly-reminder[\s\S]{0,180}setupMonthlyReportReminder\(\{[\s\S]{0,40}force:\s*true/.test(automationJs), "Nahled mesicni prosby nespousti vynuceny nahled.");
check(/function setupMonthlyReportReminder\(options = \{\}\)[\s\S]{0,500}const force = Boolean\(options\.force\)[\s\S]{0,500}!force/.test(appJs), "Mesicni reminder nema otestovanou force vetev mimo datum/roli.");
const syncScript = await text("scripts/sync-registry.mjs");
check(adminHtml.includes('id="sync-health-note"') && adminHtml.includes('Naposledy ověřeno'), "Sprava nema srozumitelne vysvetleni a datum overeni zdroju.");
check(automationJs.includes('Zdrojový repozitář ověřen') && automationJs.includes('Záložní snapshot · zdroj neověřen') && automationJs.includes('lastFullSourceVerifiedAt') && automationJs.includes('lastFullLiveVerifiedAt'), "Sprava nerozlisuje nasazeny manifest, GitHub zdroj a zalozni snapshot.");
check(syncScript.includes('verification: "repository"') && syncScript.includes('raw.githubusercontent.com') && syncScript.includes('lastFullSourceVerifiedAt') && syncScript.includes('lastFullLiveVerifiedAt'), "Synchronizace nema dvoustupnove overeni nasazeni/GitHub zdroje.");
check(syncScript.includes('Promise.all(sources.map(resolveSource))'), "Synchronizace zdroju nebezi soubezne a muze zbytecne blokovat release.");
check(syncScript.includes('if (!offline || writeOfflineOutputs)') && syncScript.includes('se nepřepisují'), "Offline QA muze prepsat publikovany stav Kontroly zdroju.");

const issuerHtml = await text("src/tools/access-issuer/index.html");
const issuerJs = await text("src/tools/access-issuer/issuer.js");
check(issuerHtml.includes('<option value="operator">Zástupce správce</option>'), "Vydavatel neumoznuje vydat roli zastupce spravce.");
check(["7", "14", "30"].every((days) => issuerHtml.includes(`data-admin-days="${days}"`)), "Vydavatel nema rychle expirace 7/14/30 dni pro docasneho admina.");
check(issuerHtml.includes('id="primary-admin-expiry"') && issuerHtml.includes('Hlavní správce · maximum'), "Vydavatel nema samostatnou maximalni platnost pro hlavniho spravce.");
check(issuerJs.includes('temporary.hidden = role !== "admin"') && issuerJs.includes('role !== "operator"'), "Vydavatel nerozlisuje operatora a docasneho plneho admina.");
check(issuerJs.includes('function setMaximumExpiry()') && issuerJs.includes('policy?.maximumPermitDays || 400) - 1') && issuerJs.includes('addEventListener("click", setMaximumExpiry)'), "Hlavni spravce nema funkcni a validovatelnou volbu maximalni bezpecne platnosti.");
check(!/syncRoleUi\(\)[\s\S]{0,700}setExpiryDays\(14\)/.test(issuerJs), "Volba role admin stale automaticky zkracuje hlavniho spravce na 14 dni.");
check(issuerJs.includes('if (role === "admin") {') && issuerJs.includes('$("#permit-all").checked = true;') && !issuerJs.includes('["admin", "operator"].includes(role)'), "Zastupce spravce se stale automaticky rozsiri na vsechny aplikace.");
check(issuerJs.includes('function selectAllCurrentApps()') && /permit-all[\s\S]{0,180}addEventListener\("change"[\s\S]{0,180}selectAllCurrentApps\(\)/.test(issuerJs), "Volba vsech soucasnych i budoucich aplikaci neoznaci aktualni aplikace ve Studiu.");
check(issuerJs.includes('input.checked = grantsAllApps || record.apps.includes(input.value);'), "Nacteni wildcard pristupu nezobrazi vsechny soucasne aplikace jako oznacene.");
check(issuerHtml.includes('← Zpět do evidence přístupů') && issuerHtml.includes('Hotovo → zpět do evidence'), "Vydavatel nema zretelny navrat do evidence pristupu.");
check(issuerJs.includes('supersededBy: payload.jti') && issuerJs.includes('připravte původní JTI ke zneplatnění'), "Vydani nahradniho pristupu neoznaci puvodni zaznam jako nahrazeny nebo nevysvetli dalsi krok.");
check(deputyGuide.includes('Vydat nový přístup') && deputyGuide.includes('starý učitelský JTI zneplatnit') && deputyGuide.includes('Dosavadní výběr aplikací zůstane zachován'), "Manual zastupce nepopisuje bezpecne povyseni existujiciho trained teacher.");
const registryJs = await text("src/tools/access-registry/registry.js");
check(registryJs.includes('canAccessAdminPage?.("access-registry")') && registryJs.includes('renew.hidden = !G.isAdmin()'), "Evidence pristupu nedodrzuje hranici zastupce proti Vydavateli.");

const reportHtml = await text("src/report/index.html");
check(reportHtml.includes('tomto prohlížeči a profilu') && reportHtml.includes('Není třeba nahrávat vlastní soubor'), "Souhrnny report nevysvetluje automaticke pridani mistnich dat aktualniho prohlizece/profilu.");
check(appJs.includes('function portalStatusLabel(app)') && appJs.includes('Připraveno k řízenému pilotu'), "Portal nesjednocuje historicke pilotni statusy aplikaci.");

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
const safetyJs = await text("src/safety/safety.js");
check(safetyHtml.includes('id="risk-traffic-light"') && safetyHtml.includes('risk-lamp-red') && safetyHtml.includes('risk-lamp-orange') && safetyHtml.includes('risk-lamp-green'), "Rychla kontrola nema viditelny tricolor semafor.");
check(safetyJs.includes('setTraffic(level)') && safetyJs.includes('traffic.dataset.level'), "Semafor se neprepina podle vysledku rychle kontroly.");
check((safetyHtml.match(/data-risk=/g) || []).length >= 10, "Rychla kontrola nema alespon deset praktickych skolnich kategorii.");
check(safetyHtml.includes('data-exclusive="true"') && safetyHtml.includes('nejrizikovější zaškrtnutá položka'), "Rychla kontrola nevysvetluje pravidlo nejvyssiho rizika nebo nema vyhradni bezpecnou volbu.");
check(safetyJs.includes('function highestRisk') && safetyJs.includes('changed === safe') && safetyJs.includes('safe.checked = false'), "Logika semaforu nepouziva nejvyssi riziko nebo neoddeli bezpecnou volbu od rizikovych.");

const libraryHtml = await text("src/library/index.html");
const materialService = await text("src/library/material-service.js");
check(libraryHtml.includes("Materiály dnes lokálně, později společně v předmětových komisích."), "Materialy nevysvetluji serverovy cil.");
check(libraryHtml.includes('id="material-server-state"'), "Materialy nemaji pravdivy stav serveroveho sdileni.");
check(libraryHtml.includes('id="server-shared-section"') && libraryHtml.includes("Ověřeno ve výuce") && libraryHtml.includes("Doporučeno komisí"), "Materialy nemaji pripraveny budouci komisni katalog a stavy kvality.");
check(materialService.includes('config?.features?.schoolServerConnected === true') && materialService.includes('config?.features?.sharedMaterialLibrary === true'), "Material server adapter se muze aktivovat bez skutecneho serveroveho profilu.");
check(materialService.includes("containsPersonalData === true"), "Serverove sdileni nema ochranu proti publikaci materialu s osobnimi udaji.");
check(materialService.includes("publishToCommission") && materialService.includes("forkToWorkspace") && materialService.includes("recordQuality"), "Material server adapter nema pripraveny zakladni operace sdileni/verzovani/overeni.");
const libraryJs = await text("src/library/library.js");
const saveToStudio = await text("src/integration/save-to-studio.js");
check(libraryJs.includes('takeHandoff?.("ai-studio")') && libraryJs.includes('studioHandoff'), "Materialy neumi prevzit handoff smerovany z aplikace do Studia.");
check(appJs.includes('function takeHandoff(target)') && appJs.includes('takeHandoff,'), "Studio runtime neexportuje consume stranu handoffu.");
check(saveToStudio.includes('target: "ai-studio"') && saveToStudio.includes('library/?studioHandoff=1'), "Jednotny kontrakt Ulozit do AI Studia nema spravny cil nebo URL.");

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
    VERSION: "0.21.28",
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

const demoHtml = await text("src/demo/index.html");
const demoJs = await text("src/demo/demo.js");
const presentationConfig = JSON.parse(await text("src/config/presentation.json"));
check(demoHtml.includes('id="presentation-loop"') && demoHtml.includes('id="presentation-fullscreen"') && demoHtml.includes('id="presentation-kiosk"'), "Prezentace nema PR smycku/fullscreen showcase.");
check(demoJs.includes('presentation.json') && demoJs.includes('scheduleSceneLoop'), "Prezentace nema video-ready konfiguraci a zivy showcase reel.");
check(!demoJs.includes('playVideoAt(videoIndex)') && demoJs.includes('scheduleSceneLoop();'), "Horni nekonecna smycka stale spousti video misto zive prezentace aplikaci.");
check(demoJs.includes('presentation-video-play') && demoJs.includes('presentation-video-loop') && demoJs.includes('video.loop = true') && demoJs.includes('video.play()'), "Hlavni showcase film nema samostatne prehrani a vlastni nekonecnou smycku s user gesture.");
const serviceWorker = await text("src/sw.js");
check(serviceWorker.includes("request.headers.has('range')"), "Service worker nepropousti Range/206 pozadavky velkeho showcase videa.");
check(polishCss.includes('translateX(min(36vw, 34vh, 430px))'), "Fullscreen prezentace neomezuje orbit aplikaci i podle vysky viewportu.");
check(polishCss.includes('.presentation-kiosk:fullscreen .presentation-core') && polishCss.includes('translate: 0 -2.5vh') && polishCss.includes('width: min(580px, 44vw)'), "Fullscreen prezentace nema bezpecnou stredovou zonu proti kolizi textu s ikonami.");
check(Array.isArray(presentationConfig.videos), "Presentation config nema video playlist.");
check(presentationConfig.videos.length >= 1 && presentationConfig.videos[0]?.muted === false, "PR prezentace nema hlavni showcase video se zvukem.");
if (presentationConfig.videos[0]?.src) {
  const mediaPath = path.join(src, presentationConfig.videos[0].src);
  const mediaStat = await stat(mediaPath).catch(() => null);
  check(Boolean(mediaStat?.isFile() && mediaStat.size > 1_000_000), "Hlavni showcase video chybi nebo je podezrele male.");
}
const buildScript = await text("scripts/build.mjs");
check(buildScript.includes('"./assets/presentation/"'), "Velke PR video neni vylouceno z offline precache PWA.");
check(!demoHtml.includes("Jeden materiál. Tři výukové nástroje"), "Prezentace stale obsahuje stary technicky petikrokovy koncept.");

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
    documentElement: { dataset: { ghrabAppId: "ai-studio", ghrabAppVersion: "0.21.28" } },
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
  target: "generator", sourceAppId: "ai-studio", sourceAppVersion: "0.21.28",
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
console.log("Studio UX/regression test passed: navigation, colleague preview, Top 4 drag, per-app testing status, footer/changelog, reporting, safety traffic light, PR presentation, materials inbound handoff and Bridge v2 contract.");
