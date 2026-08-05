await window.GHRAB.accessReady;

if (window.GHRAB.isAdmin()) {

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

  function renderTable(report,apps){
tableBody.replaceChildren();
const byId=new Map(apps.map(a=>[a.id,a]));
for(const source of report?.sources||[]){
const tr=document.createElement("tr"),app=byId.get(source.id),values=[localised(app?.name)||source.id,source.url,source.ok?t("Ověřeno","Verified"):t("Použit záložní registr","Fallback registry"),source.version||app?.version||"—"];
values.forEach((value,index)=>{
const td=document.createElement("td");
td.textContent=value;
if(index===2)td.className=source.ok?"sync-ok":"sync-warn";
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
const ok=report?.sources?.filter(s=>s.ok).length||0,total=report?.sources?.length||apps.length,time=report?.generatedAt?new Date(report.generatedAt).toLocaleString(document.documentElement.lang==="en"?"en-GB":"cs-CZ"):"—";
summaryHost.replaceChildren(kpi(apps.length,"aplikací","applications"),kpi(`${ok}/${total}`,"manifestů ověřeno","manifests verified"),kpi(report?.mode||"fallback","režim synchronizace","sync mode"),kpi(time,"poslední build","latest build"));
renderTable(report||{
sources:[]}
,apps);
renderAiReadiness(apps,coreRegistry,readiness,runtime)}

  render().catch(()=>{
if(appHost)appHost.textContent=t("Data automatizace se nepodařilo načíst.","Automation data could not be loaded.")}
);
document.addEventListener("ghrab:language",render);

}

