await window.GHRAB.accessReady;

if (window.GHRAB.canAccessAdminPage?.("automation") && !window.GHRAB.isColleaguePreview?.()) {

  const {
loadApps,loadSyncReport,loadAiCoreRegistry,loadAiReadiness,loadAiRuntime,localised,t,base}
=window.GHRAB;

  const appHost=document.querySelector("#automation-apps"),summaryHost=document.querySelector("#automation-summary"),tableBody=document.querySelector("#sync-table-body"),aiCoreSummaryHost=document.querySelector("#ai-core-summary"),aiReadinessTableBody=document.querySelector("#ai-readiness-table-body");

  document.querySelector("#preview-monthly-reminder")?.addEventListener("click",()=>window.GHRAB.setupMonthlyReportReminder({
force:true}
));

  const liveModeButton=document.querySelector("#telemetry-live"),testModeButton=document.querySelector("#telemetry-test"),telemetryStatus=document.querySelector("#telemetry-mode-status"),clearTestButton=document.querySelector("#telemetry-test-clear");

  function renderTelemetryMode(){
const mode=window.GHRAB.getTelemetryMode();
liveModeButton?.setAttribute("aria-pressed",String(mode==="live"));
testModeButton?.setAttribute("aria-pressed",String(mode==="test"));
if(telemetryStatus)telemetryStatus.textContent=mode==="test"?t("Testovací data jsou oddělená a nejsou v pilotním reportu.","Test data are separated and excluded from the pilot report."):t("Vaše běžné používání vstupuje do místních dat reportu.","Your normal use is included in local report data.");
}

  liveModeButton?.addEventListener("click",()=>{
window.GHRAB.setTelemetryMode("live");
renderTelemetryMode()}
);
testModeButton?.addEventListener("click",()=>{
window.GHRAB.setTelemetryMode("test");
renderTelemetryMode()}
);
clearTestButton?.addEventListener("click",()=>{
if(confirm(t("Vymazat všechna oddělená testovací spuštění, časy a výstupy?","Clear all separated test launches, time and outputs?"))){
window.GHRAB.clearTestTelemetry();
window.GHRAB.showToast(t("Testovací data byla vymazána.","Test data were cleared."))}
}
);
renderTelemetryMode();
document.addEventListener("ghrab:telemetry-mode",renderTelemetryMode);

  function appRow(app){
const row=document.createElement("article");
row.className="automation-app";
row.classList.add(`accent-${app.id}`);
const icon=document.createElement("img");
icon.src=app.icon?.startsWith("http")?app.icon:`${base}${app.icon}`;
icon.alt="";
const text=document.createElement("div"),h=document.createElement("h3"),p=document.createElement("p"),v=document.createElement("span");
h.textContent=localised(app.name);
p.textContent=app.repository||app.launchUrl;
text.append(h,p);
v.className="automation-version";
v.textContent=`v${app.version}`;
row.append(icon,text,v);
return row}

  function kpi(value,labelCs,labelEn){
const card=document.createElement("article"),strong=document.createElement("strong"),span=document.createElement("span");
card.className="automation-kpi";
strong.textContent=value;
span.textContent=t(labelCs,labelEn);
card.append(strong,span);
return card}

  function formatSyncTime(value){
if(!value)return "—";
const date=new Date(value);
if(Number.isNaN(date.getTime()))return "—";
return date.toLocaleString(document.documentElement.lang==="en"?"en-GB":"cs-CZ")}

  function verificationLabel(source){
if(source?.verification==="deployment")return t("Nasazený manifest ověřen živě","Deployed manifest verified live");
if(source?.verification==="repository"){
  const versionNote=source.sourceVersion&&source.sourceVersion!==source.version?` · ${t("zdroj","source")} v${source.sourceVersion}`:"";
  return `${t("Zdrojový repozitář ověřen","Source repository verified")}${versionNote}`;
}
if(source?.verification==="unverified"||source?.ok==null)return t("Čeká na synchronizaci při buildu","Waiting for build synchronisation");
return t("Záložní snapshot · zdroj neověřen","Fallback snapshot · source not verified")}

  function renderTable(report,apps){
tableBody.replaceChildren();
const byId=new Map(apps.map(a=>[a.id,a]));
for(const source of report?.sources||[]){
const tr=document.createElement("tr"),app=byId.get(source.id),values=[localised(app?.name)||source.id,source.url,verificationLabel(source),source.version||app?.version||"—",formatSyncTime(source.lastSourceVerifiedAt||source.lastLiveVerifiedAt)];
values.forEach((value,index)=>{
const td=document.createElement("td");
td.textContent=value;
if(index===2)td.className=source.ok===true?"sync-ok":source.ok===false?"sync-warn":"sync-neutral";
tr.append(td)}
);
tableBody.append(tr)}
}

  function readinessLabel(status){
return ({
ready:t("Nasazeno","Deployed"),"certified-pending-deployment":t("Certifikováno · čeká na nasazení","Certified · awaiting deployment"),"certified-pending-manifest":t("Nasazeno · chybí Core manifest","Deployed · Core manifest missing"),"integration-in-progress":t("Integrace probíhá","Integration in progress"),incompatible:t("Nekompatibilní","Incompatible"),"not-migrated":t("Nezahájeno","Not started"),"not-applicable":t("Nevyužívá AI Core","AI Core not applicable")}
)[status]||status||"—"}

  function readinessClass(status){
if(status==="ready")return "sync-ok";
if(status==="incompatible")return "sync-error";
if(status?.startsWith("certified-")||status==="integration-in-progress")return "sync-warn";
return "sync-neutral"}

  function renderAiReadiness(apps,registry,readiness,runtime){
if(!aiCoreSummaryHost||!aiReadinessTableBody)return;
const summary=readiness?.summary||{
}
;
aiCoreSummaryHost.replaceChildren(kpi(summary.totalApps??apps.length,"aplikací","applications"),kpi(summary.readyApps??0,"nasazeno na Core","deployed on Core"),kpi(summary.certifiedPendingApps??0,"certifikováno před nasazením","certified before deployment"),kpi(summary.notMigratedApps??0,"čeká na migraci","awaiting migration"),kpi(summary.notApplicableApps??0,"mimo rozsah AI Core","outside AI Core scope"));
const active=registry?.activeRelease,effectiveRuntime=runtime?.ai||readiness?.runtime||{
}
;
const release=document.querySelector("#ai-core-release"),build=document.querySelector("#ai-core-build"),mode=document.querySelector("#ai-runtime-mode"),policy=document.querySelector("#ai-runtime-policy");
if(release)release.textContent=active?`Core ${active.coreVersion} · kontrakt ${active.contractVersion}`:"—";
if(build)build.textContent=active?.buildId||"—";
if(mode)mode.textContent=effectiveRuntime.defaultMode||"—";
if(policy)policy.textContent=effectiveRuntime.automaticFallback?t("Automatický fallback je aktivní","Automatic fallback is active"):t(`Povolené režimy: ${(effectiveRuntime.allowedModes||[]).join(", ")||"—"} · bez automatického fallbacku`,`Allowed modes: ${(effectiveRuntime.allowedModes||[]).join(", ")||"—"} · no automatic fallback`);
const manifestLink=document.querySelector("#ai-core-manifest-link"),kitLink=document.querySelector("#ai-core-kit-link");
if(manifestLink&&active?.manifestUrl)manifestLink.href=`${base}${active.manifestUrl}`;
if(kitLink&&registry?.migrationKitUrl)kitLink.href=`${base}${registry.migrationKitUrl}`;
const appById=new Map(apps.map(app=>[app.id,app]));
aiReadinessTableBody.replaceChildren();
for(const item of readiness?.applications||[]){
const app=appById.get(item.appId),tr=document.createElement("tr"),cells=[localised(app?.name)||item.appId,item.appVersion||app?.version||"—",readinessLabel(item.status),item.coreVersion||"—",item.conformancePassed?t("Prošla","Passed"):"—"];
cells.forEach((value,index)=>{
const td=document.createElement("td");
td.textContent=value;
if(index===2)td.className=readinessClass(item.status);
if(index===4&&item.conformancePassed)td.className="sync-ok";
tr.append(td)}
);
aiReadinessTableBody.append(tr)}
}

  async function render(){
const [apps,report,coreRegistry,readiness,runtime]=await Promise.all([loadApps(),loadSyncReport(),loadAiCoreRegistry(),loadAiReadiness(),loadAiRuntime()]);
appHost.replaceChildren(...apps.map(appRow));
const total=report?.sources?.length||apps.length;
const verified=report?.sources?.filter(s=>s.ok===true).length||0;
const deploymentCount=report?.sources?.filter(s=>s.verification==="deployment").length||0;
const repositoryCount=report?.sources?.filter(s=>s.verification==="repository").length||0;
const snapshotCount=report?.sources?.filter(s=>s.verification==="snapshot").length||0;
const unverifiedCount=report?.sources?.filter(s=>s.verification==="unverified"||s.ok==null).length||0;
const time=formatSyncTime(report?.generatedAt),lastFullSource=formatSyncTime(report?.lastFullSourceVerifiedAt),lastFullLive=formatSyncTime(report?.lastFullLiveVerifiedAt);
summaryHost.replaceChildren(
  kpi(apps.length,"aplikací","applications"),
  kpi(`${verified}/${total}`,"zdrojů ověřeno","sources verified"),
  kpi(`${deploymentCount}/${total}`,"manifest nasazení","deployment manifests"),
  kpi(`${repositoryCount}/${total}`,"ověřeno z GitHubu","verified from GitHub"),
  kpi(`${snapshotCount}/${total}`,"jen snapshot","snapshot only"),
  kpi(lastFullSource,"naposledy zdroje 8/8","last sources 8/8"),
  kpi(lastFullLive,"naposledy nasazení 8/8","last deployment 8/8"),
  kpi(time,"poslední synchronizace","latest synchronisation"),
);
const healthNote=document.querySelector("#sync-health-note");
if(healthNote){
  if(report?.generated===false||unverifiedCount===total){
    healthNote.className="notice sync-neutral";
    healthNote.textContent=t("Tento zdrojový balík ještě neobsahuje výsledek síťové synchronizace. Při GitHub Actions deployi se zdroje ověří a stav se zapíše do buildu.","This source package does not yet contain a network synchronisation result. GitHub Actions verifies the sources during deployment and writes the status into the build.");
  }else{
    healthNote.className=`notice ${verified===total?"sync-health-ok":verified?"sync-health-warn":"sync-health-fallback"}`;
    healthNote.textContent=verified===total
      ? t(
          `Všech ${total} zdrojů je aktuálně ověřeno. Přímo z nasazeného manifestu ${deploymentCount}/${total}, z veřejného zdrojového repozitáře GitHub ${repositoryCount}/${total}. ` +
            `U repozitářově ověřených položek Studio z bezpečnostních důvodů ponechává poslední známá metadata nasazení, dokud není dostupný manifest GitHub Pages.`,
          `All ${total} sources are currently verified. Directly from deployed manifests ${deploymentCount}/${total}, from public GitHub source repositories ${repositoryCount}/${total}. ` +
            `For repository-verified items Studio safely keeps the last known deployment metadata until the GitHub Pages manifest is reachable.`,
        )
      : t(
          `Studio ověřilo ${verified}/${total} zdrojů. ${snapshotCount}/${total} zatím používá pouze poslední známý snapshot; podrobnost je v tabulce.`,
          `Studio verified ${verified}/${total} sources. ${snapshotCount}/${total} currently use only the last known snapshot; see the table for details.`,
        );
  }
}
renderTable(report||{
sources:[]}
,apps);
renderAiReadiness(apps,coreRegistry,readiness,runtime)}

  render().catch(()=>{
if(appHost)appHost.textContent=t("Data automatizace se nepodařilo načíst.","Automation data could not be loaded.")}
);
document.addEventListener("ghrab:language",render);

}

