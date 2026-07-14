import { execFileSync } from 'node:child_process';
import { readdir, readFile, stat } from 'node:fs/promises';
import { generateKeyPairSync, sign, webcrypto } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { safeExportSelfTest } from '../src/shared/safe-export.js';
import { validateMaterialPackage } from '../src/shared/material-validator.js';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');const src=path.join(root,'src');const dist=path.join(root,'dist');
const errors=[];const fail=m=>errors.push(m);
const loadJson=async file=>{try{return JSON.parse(await readFile(file,'utf8'))}catch(e){fail(`Neplatný JSON ${path.relative(root,file)}: ${e.message}`);return null}};
const walk=async dir=>{const out=[];for(const entry of await readdir(dir,{withFileTypes:true})){const full=path.join(dir,entry.name);out.push(...(entry.isDirectory()?await walk(full):[full]))}return out};
const exists=async file=>{try{await stat(file);return true}catch{return false}};
const base64url=value=>Buffer.from(value).toString('base64url');

const pkg=await loadJson(path.join(root,'package.json'));
const apps=await loadJson(path.join(src,'config/apps.generated.json'));
const fallback=await loadJson(path.join(src,'config/apps.fallback.json'));
const sources=await loadJson(path.join(src,'config/sources.json'));
const syncReport=await loadJson(path.join(src,'config/sync-report.json'));
const catalog=await loadJson(path.join(src,'library/catalog.json'));
const manifest=await loadJson(path.join(src,'manifest.webmanifest'));
const permissions=await loadJson(path.join(src,'config/permissions.json'));
const changes=await loadJson(path.join(src,'config/changelog.json'));
const policy=await loadJson(path.join(src,'config/access-policy.json'));
const publicKeyInfo=await loadJson(path.join(src,'config/access-public-key.json'));
const revocations=await loadJson(path.join(src,'config/revoked-access.json'));
const syncScript=await readFile(path.join(root,'scripts/sync-registry.mjs'),'utf8');
const deployWorkflow=await readFile(path.join(root,'.github/workflows/deploy.yml'),'utf8');

for(const [label,list] of [['generated registry',apps],['fallback registry',fallback]]){
 if(!Array.isArray(list)||list.length<5){fail(`${label} musí obsahovat alespoň pět aplikací.`);continue}
 const ids=new Set();
 for(const app of list){
  if(app.schema!=='ai-studio-app-manifest-v1')fail(`${label}: ${app.id||'?'} má neplatné schema.`);
  if(!app.id||ids.has(app.id))fail(`${label}: neplatné nebo duplicitní id ${app.id}`);ids.add(app.id);
  if(!/^https:\/\//.test(app.launchUrl||''))fail(`${app.id} nemá HTTPS launchUrl.`);
  if(!/^https:\/\//.test(app.manualUrl||''))fail(`${app.id} nemá HTTPS manualUrl.`);
  if(!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(app.version||''))fail(`${app.id} nemá SemVer verzi.`);
  if(!app.name?.cs||!app.name?.en||!app.description?.cs||!app.description?.en)fail(`${app.id} nemá úplný překlad.`);
  if(!/^#[0-9a-f]{6}$/i.test(app.accent||''))fail(`${app.id} nemá platný accent.`);
  if(!(await exists(path.join(src,app.icon))))fail(`Chybí ikona ${app.id}: ${app.icon}`);
 }
}
if(!Array.isArray(sources)||sources.length<5)fail('sources.json musí obsahovat alespoň pět zdrojů.');
if(!apps?.some(app=>app.id==='essay-evaluator'))fail('Generovaný registr neobsahuje essay-evaluator.');
if(!fallback?.some(app=>app.id==='essay-evaluator'))fail('Fallback registr neobsahuje essay-evaluator.');
if(apps?.slice(0,4).every(app=>app.id!=='essay-evaluator'))fail('Hodnotitel musí být ve výchozím Top 4.');
if(apps?.slice(4).every(app=>app.id!=='ludus'))fail('LUDUS má zůstat ve výchozím katalogu mimo Top 4.');
if(!syncScript.includes('const localIcon = fallbackById.get(source.id)?.icon'))fail('Synchronizace nezachovává lokální ikonu portálu.');
if(!deployWorkflow.includes('app-updated'))fail('Workflow nepřijímá událost app-updated.');
if(permissions?.apps?.['essay-evaluator']?.serverClaim!=='app.essay-evaluator.use')fail('Hodnotitel má neplatný server claim.');
if(policy?.applications?.['essay-evaluator']?.trainingCode!=='HOD-01')fail('Hodnotitel nemá školení HOD-01.');
if(syncReport?.schema!=='ai-studio-sync-report-v1')fail('sync-report.json má neplatné schema.');
if(!Array.isArray(syncReport?.sources)||syncReport.sources.length!==sources?.length)fail('Sync report neodpovídá seznamu zdrojů.');

if(permissions?.schema!=='ai-studio-permissions-v1'||permissions?.mode!=='signed-serverless-permits')fail('permissions.json nemá nový podepsaný bezserverový model.');
if(policy?.schema!=='ghrab-access-policy-v1'||policy.defaultState!=='locked')fail('Přístupová politika musí mít výchozí stav locked.');
if(publicKeyInfo?.schema!=='ghrab-access-public-key-v1'||!publicKeyInfo.publicKey)fail('Veřejný ověřovací klíč chybí.');
if(publicKeyInfo?.publicKey?.d)fail('Veřejný klíč nesmí obsahovat soukromou část d.');
if(revocations?.schema!=='ghrab-access-revocation-list-v1'||!Array.isArray(revocations.revokedJti))fail('Revokační seznam má neplatnou strukturu.');
for(const app of apps||[]){
 if(!permissions?.apps?.[app.id])fail(`permissions.json neobsahuje ${app.id}.`);
 if(!policy?.applications?.[app.id])fail(`access-policy.json neobsahuje ${app.id}.`);
 if(permissions?.apps?.[app.id]?.trainingVersion!==policy?.applications?.[app.id]?.trainingVersion)fail(`${app.id}: nesoulad verze školení.`);
}
try{await webcrypto.subtle.importKey('jwk',publicKeyInfo.publicKey,{name:'ECDSA',namedCurve:'P-256'},false,['verify'])}catch(e){fail(`Veřejný klíč nelze importovat: ${e.message}`)}
try{
 const {privateKey,publicKey}=generateKeyPairSync('ec',{namedCurve:'prime256v1'});
 const payload=base64url(JSON.stringify({schema:'ghrab-access-permit-v1',iss:policy.issuer,aud:policy.audience,sub:'qa',jti:'qa',kid:'qa',role:'teacher',apps:['generator'],iat:1,exp:2}));
 const signature=sign('sha256',Buffer.from(payload),{key:privateKey,dsaEncoding:'ieee-p1363'});
 const jwk=publicKey.export({format:'jwk'});
 const key=await webcrypto.subtle.importKey('jwk',jwk,{name:'ECDSA',namedCurve:'P-256'},false,['verify']);
 if(!await webcrypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},key,signature,Buffer.from(payload)))fail('WebCrypto neověřilo P-256 podpis ve formátu používaném vydavatelem.');
}catch(e){fail(`Test podpisového algoritmu selhal: ${e.message}`)}

if(changes?.schema!=='ai-studio-changelog-v1'||changes.current!==pkg?.version||!changes.items?.some(x=>x.version===pkg?.version))fail('Changelog neobsahuje aktuální verzi.');
if(!Array.isArray(catalog?.items)||catalog.items.length<4)fail('Katalog musí obsahovat alespoň čtyři ukázky.');
for(const item of catalog?.items||[]){const sample=await loadJson(path.join(src,item.download));const result=validateMaterialPackage(sample);if(!result.valid)fail(`${item.id}: neplatná ukázka: ${result.errors.join('; ')}`)}
if(!safeExportSelfTest())fail('Bezpečný export propustil testovací citlivá data.');
if(![pkg?.version,'__APP_VERSION__'].includes(manifest?.version))fail('Verze manifestu se neshoduje s package.json.');

const sourceFiles=await walk(src);
const secretPatterns=[/AIza[0-9A-Za-z_-]{20,}/g,/sk-[0-9A-Za-z_-]{20,}/g,/github_pat_[0-9A-Za-z_]{20,}/g,/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,/"d"\s*:\s*"[A-Za-z0-9_-]{20,}"/g];
for(const file of sourceFiles.filter(f=>/\.(html|js|json|md|css|yml|yaml)$/.test(f))){
 const text=await readFile(file,'utf8');
 for(const pattern of secretPatterns){pattern.lastIndex=0;if(pattern.test(text))fail(`Možné tajemství v ${path.relative(root,file)}`)}
 if(file.endsWith('.ghrab-access.json'))fail(`Ve veřejném zdroji je přístupový soubor: ${path.relative(root,file)}`);
 if(/\sstyle=["']/i.test(text)&&file.endsWith('.html'))fail(`Inline style není povolen CSP: ${path.relative(root,file)}`);
}
for(const file of sourceFiles.filter(f=>f.endsWith('.js'))){try{execFileSync(process.execPath,['--check',file],{stdio:'pipe'})}catch(e){fail(`Chyba syntaxe JS v ${path.relative(root,file)}: ${e.stderr?.toString()||e.message}`)}}

const standardPages=new Set(['index.html','access/index.html','automation/index.html','workflow/index.html','report/index.html','demo/index.html','library/index.html','manualy/index.html','manualy/pilot-report.html','manualy/error-report.html','safety/index.html','pilot/index.html','changelog/index.html','tests/index.html','tools/access-issuer/index.html','tools/access-registry/index.html']);
for(const file of sourceFiles.filter(f=>f.endsWith('.html'))){
 const html=await readFile(file,'utf8');const rel=path.relative(src,file).replaceAll('\\','/');
 const ids=[...html.matchAll(/\sid=["']([^"']+)["']/g)].map(m=>m[1]);const seen=new Set();for(const id of ids){if(seen.has(id))fail(`Duplicitní id ${id} v ${rel}`);seen.add(id)}
 const isFragment=rel.startsWith('integration/');
 if(!isFragment&&!html.includes('Content-Security-Policy'))fail(`Chybí CSP v ${rel}`);if(!isFragment&&!html.includes('name="viewport"')&&!html.includes("name='viewport'"))fail(`Chybí viewport v ${rel}`);
 if(standardPages.has(rel)){if(!html.includes('Autor a vývojový garant: Daniel Baláž'))fail(`Chybí sjednocené zápatí v ${rel}`);if(!html.includes('polish.css'))fail(`Chybí polish.css v ${rel}`);if(!html.includes('data-nav="manualy"'))fail(`Chybí záložka Manuály v ${rel}`);if(!html.includes('data-nav="safety"'))fail(`Chybí platná záložka Bezpečnost v ${rel}`);if(/<\/a>\.{1,2}\/\s+data-/i.test(html))fail(`Poškozená HTML navigace v ${rel}`)}
 if(isFragment)continue;
 for(const match of html.matchAll(/(?:href|src)=["']([^"'#]+)["']/g)){
  const url=match[1];if(/^(?:https?:|data:|mailto:|tel:)/.test(url)||url.startsWith('__'))continue;
  const clean=url.split('?')[0];let target=path.resolve(path.dirname(file),clean);if(clean.endsWith('/'))target=path.join(target,'index.html');
  if(!(await exists(target)))fail(`Neplatný lokální odkaz v ${rel}: ${url}`);
 }
}
for(const file of ['automation/automation.js','pilot/pilot.js','report/report.js','demo/demo.js','changelog/changelog.js','tests/tests.js']){const text=await readFile(path.join(src,file),'utf8');if(!text.includes('accessReady')||!text.includes('isAdmin'))fail(`${file} nemá správcovskou bránu.`)}
for(const file of ['integration/generator-access-bootstrap.example.js','integration/differentiator-access-bootstrap.example.js','integration/essay-evaluator-access-bootstrap.example.js','integration/ludus-access-bootstrap.example.js','integration/correspondence-access-bootstrap.example.js'])if(!(await exists(path.join(src,file))))fail(`Chybí integrační šablona ${file}.`);
const manualPageText=await readFile(path.join(src,'manualy/manualy.js'),'utf8');
if(!manualPageText.includes('G.hasAppAccess(app.id)')||!manualPageText.includes('manual-locked-button'))fail('Katalog manuálů nedědí oprávnění aplikací nebo neumí uzamčený stav.');
if(!manualPageText.includes('./viewer.html?app=')||manualPageText.includes("open.target = '_blank'"))fail('Katalog manuálů neotevírá průvodce interně v AI Studiu.');
const manualViewerText=await readFile(path.join(src,'manualy/viewer.js'),'utf8');
const manualViewerHtml=await readFile(path.join(src,'manualy/viewer.html'),'utf8');
if(!manualViewerText.includes('G.hasAppAccess(currentApp.id)')||!manualViewerText.includes('allowedManualUrl'))fail('Interní prohlížeč manuálu nekontroluje oprávnění nebo bezpečnou adresu.');
if(!manualViewerHtml.includes('id="manual-frame"')||!manualViewerHtml.includes('allowfullscreen')||!manualViewerHtml.includes("frame-src 'self' https://daniel22-dev.github.io"))fail('Interní prohlížeč manuálu nemá bezpečný rámec s podporou celé obrazovky.');
const portalStylesText=await readFile(path.join(src,'styles.css'),'utf8');
if(!portalStylesText.includes('/* v0.7.3 — mobile: verze aplikace se nesmí oříznout */')||!portalStylesText.includes('.portal-card-head{display:grid;grid-template-columns:minmax(0,1fr);gap:10px}')||!portalStylesText.includes('.version-chip{white-space:nowrap;flex:0 0 auto}'))fail('Chybí mobilní ochrana proti oříznutí čísla verze.');
const appGuardText=await readFile(path.join(src,'access/app-guard.js'),'utf8');
if(!appGuardText.includes("new URL(options.studioUrl || '../', location.href)"))fail('app-guard nepřevádí relativní adresu Studia na úplnou URL.');
if(!appGuardText.includes('ACTIVE_IDLE_MS = 5 * 60 * 1000')||!appGuardText.includes('document.visibilityState')||!appGuardText.includes('document.hasFocus()'))fail('app-guard nemá konzervativní měření aktivního času.');
if(!appGuardText.includes('recordApplicationOpen(appId, keys)')||!appGuardText.includes('ghrabLaunchRecorded'))fail('app-guard nezapočítává skutečně otevřenou aplikaci po ověření přístupu.');
if(!appGuardText.includes('recordOutput(appId, keys')||!appGuardText.includes('OUTPUT_KINDS')||!appGuardText.includes('worksheet-variant')||!appGuardText.includes('essay-evaluation'))fail('app-guard nemá jednotné anonymní metriky výstupů všech aplikací.');
if(!appGuardText.includes('options.telemetry !== false'))fail('app-guard neumí vyloučit interaktivní manuály z měření používání.');
if(!appGuardText.includes("import { setupErrorReporter } from './error-reporter.js'")||!appGuardText.includes('setupErrorReporter({ appId'))fail('app-guard neaktivuje jednotné hlášení chyb v chráněných aplikacích.');
const mainAppText=await readFile(path.join(src,'app.js'),'utf8');
if(!mainAppText.includes("['issuer', 'access-registry'].includes(page) ? 'automation' : page"))fail('Správcovské nástroje nezvýrazňují záložku Správa.');
const issuerScriptText=await readFile(path.join(src,'tools/access-issuer/issuer.js'),'utf8');
const registryPageText=await readFile(path.join(src,'tools/access-registry/index.html'),'utf8');
const registryScriptText=await readFile(path.join(src,'tools/access-registry/registry.js'),'utf8');
if(!mainAppText.includes('ghrab.access.issued-registry.v1')||!mainAppText.includes('recordIssuedAccess')||!mainAppText.includes('issuedAccessBackup'))fail('Chybí místní datový model evidence vydaných přístupů.');
if(!issuerScriptText.includes('G.recordIssuedAccess(payload')||!issuerScriptText.includes('automaticky uložen do evidence'))fail('Vydání přístupu se automaticky nezapisuje do evidence.');
if(!registryPageText.includes('Evidence přístupů')||!registryPageText.includes('export-revocations')||!registryPageText.includes('import-files')||!registryPageText.includes('registry-drop-zone')||!registryScriptText.includes('inspectPermitToken')||!registryScriptText.includes('revoked-access.json')||!registryScriptText.includes('#registryImport=')||!registryScriptText.includes('importSelectedFiles'))fail('Správcovská evidence nemá spolehlivý import, přehled, soukromý odkaz nebo export zneplatnění.');
if(registryScriptText.indexOf("const token = typeof parsed === 'string' ? parsed : parsed?.token") > registryScriptText.indexOf('const recordsPayload = Array.isArray(parsed)'))fail('Import přístupového souboru musí ověřit podepsaný token dříve než pomocný permitId.');
if(!policy?.administratorPages?.includes('access-registry'))fail('Evidence přístupů není označena jako správcovská stránka.');
if(/recordLaunch\(app\.id\)/.test(mainAppText))fail('Studio stále počítá kliknutí před otevřením aplikace a mohlo by spuštění zdvojit.');
if(!mainAppText.includes('portalLaunchInProgress')||!mainAppText.includes("zone?.classList.add('is-launching')")||!mainAppText.includes('portalLaunchDelay'))fail('Spuštění aplikace nemá krátkou aktivační sekvenci centrální brány.');
const portalHomeHtml=await readFile(path.join(src,'index.html'),'utf8');
const portalPolishText=await readFile(path.join(src,'polish.css'),'utf8');
if(!portalHomeHtml.includes('portal-ring-assembly')||!portalHomeHtml.includes('portal-mechanical-ring ring-outer')||!portalHomeHtml.includes('portal-lock-sequence'))fail('Brána nemá samostatné obrazové vrstvy mechanických prstenců a zámků.');
if(!portalPolishText.includes('@keyframes gateway-ring-outer-dial')||!portalPolishText.includes('@keyframes gateway-ring-middle-dial')||!portalPolishText.includes('@keyframes gateway-ring-inner-dial')||!portalPolishText.includes('@keyframes gateway-lock-node'))fail('Chybí mechanické navolování prstenců nebo sekvenční zámky brány.');
if(!mainAppText.includes("schedulePhase(1550, 'PRSTENCE SE UZAMYKAJÍ'")||!mainAppText.includes("root.dataset.motion === 'full' ? 2850 : 900"))fail('Stavový průběh nebo časování nové brány není zapojeno.');
if(!mainAppText.includes('refreshSharedAccessModuleCache')||!mainAppText.includes('/AI-Studio-GHRAB/access/app-guard.js')||!mainAppText.includes('/AI-Studio-GHRAB/access/error-reporter.js')||!mainAppText.includes('cache.delete(request)'))fail('Studio nema jednorazove odstraneni starych kopii sdilenych modulu z PWA cache.');
const errorReporterText=await readFile(path.join(src,'access/error-reporter.js'),'utf8');
const errorReporterCss=await readFile(path.join(src,'access/error-reporter.css'),'utf8');
const errorGuideHtml=await readFile(path.join(src,'manualy/error-report.html'),'utf8');
if(!errorReporterText.includes('getDisplayMedia')||!errorReporterText.includes('MAX_SCREENSHOTS = 5')||!errorReporterText.includes('makeZip(entries)')||!errorReporterText.includes('Začernit údaje')||!errorReporterText.includes('balaz@ghrabuvka.cz'))fail('Jednotné hlášení chyb nemá snímání, více snímků, ZIP, redakci nebo e-mail správce.');
if(!errorReporterText.includes('safePageUrl')||!errorReporterText.includes('location.pathname')||errorReporterText.includes('location.href, language'))fail('Technické údaje hlášení mohou obsahovat citlivé query parametry URL.');
if(!errorReporterCss.includes('.ghrab-report-button.launcher')||!errorGuideHtml.includes('Jak poslat správci srozumitelné hlášení')||!errorGuideHtml.includes('Začerněte citlivé údaje'))fail('Chybí vzhled reporteru nebo úplný interaktivní návod k hlášení chyby.');
const pilotPageText=await readFile(path.join(src,'pilot/index.html'),'utf8');
const pilotScriptText=await readFile(path.join(src,'pilot/pilot.js'),'utf8');
if(/reportedMinutes|rating|učitelem vykázan/i.test(pilotPageText+pilotScriptText))fail('Pilot stále obsahuje ruční vykazování času nebo užitečnosti.');
const reportGuideHtml=await readFile(path.join(src,'manualy/pilot-report.html'),'utf8');
if(!reportGuideHtml.includes('guide-download')||!reportGuideHtml.includes('balaz@ghrabuvka.cz')||!reportGuideHtml.includes('Používáte dvě zařízení'))fail('Chybí úplný interaktivní návod k měsíčnímu souhrnu.');
if(!mainAppText.includes('isMonthlyReminderWindow')||!mainAppText.includes('lastDay - 6')||!mainAppText.includes('Mohu vás poprosit o anonymní souhrn?')||!mainAppText.includes('Připomenout zítra')||!mainAppText.includes('Souhrn jsem již odeslal(a)'))fail('Chybí zdvořilé připomenutí během posledních sedmi dnů měsíce až do potvrzení odeslání.');
if(!mainAppText.includes('ghrab.pilot.anonymous-source-id')||!mainAppText.includes('currentPilotPeriod'))fail('Anonymní měsíční souhrn nemá stabilní náhodný identifikátor zařízení nebo období.');
const safeExportText=await readFile(path.join(src,'shared/safe-export.js'),'utf8');
if(!safeExportText.includes('ghrab-pilot-summary-v8-safe')||!safeExportText.includes('safeLaunchesForPeriod')||!safeExportText.includes('filterEventsByPeriod'))fail('Bezpečný export není omezen na kalendářní měsíc.');
const reportScriptText=await readFile(path.join(src,'report/report.js'),'utf8');
if(!reportScriptText.includes('importIdentity')||!reportScriptText.includes('sourceId')||!reportScriptText.includes('periodInRange'))fail('Report neumí nahradit opakovaný souhrn ze stejného zařízení a měsíce nebo filtrovat období.');
if(!reportScriptText.includes('canvasPdf')||!reportScriptText.includes('school-logo.png')||!reportScriptText.includes('portal-gateway.png')||!reportScriptText.includes("downloadPdf('mono')"))fail('Report nemá přímý barevný a černobílý jednostránkový A4 PDF export se školní identitou.');
if(new URL('/AI-Studio-GHRAB/','https://daniel22-dev.github.io/generator-testu/').href!=='https://daniel22-dev.github.io/AI-Studio-GHRAB/')fail('Regresní test adresy Studia selhal.');

const directStorageWriters=sourceFiles.filter(file=>file.endsWith('.js')&&!['app.js','bridge/studio-bridge.js','tests/tests.js','access/access-control.js','access/app-guard.js','tools/access-issuer/issuer.js'].some(s=>file.endsWith(path.join('src',s))));
for(const file of directStorageWriters){const text=await readFile(file,'utf8');if(text.includes('localStorage.setItem('))fail(`Přímý zápis do localStorage mimo bezpečný modul: ${path.relative(root,file)}`)}

try{execFileSync(process.execPath,[path.join(root,'scripts/build.mjs')],{stdio:'inherit'})}catch{fail('Build selhal.');}
const distFiles=await walk(dist);const required=['index.html','styles.css','polish.css','app.js','manifest.webmanifest','sw.js','build-info.json','access/index.html','access/access-control.js','access/app-guard.js','access/error-reporter.js','access/error-reporter.css','tools/access-issuer/index.html','tools/access-registry/index.html','tools/access-registry/registry.js','tools/access-registry/registry.css','automation/index.html','workflow/index.html','report/index.html','demo/index.html','library/index.html','manualy/index.html','manualy/manualy.js','manualy/manualy.css','manualy/access-management.html','manualy/viewer.html','manualy/viewer.js','manualy/viewer.css','manualy/pilot-report.html','manualy/pilot-report.js','manualy/pilot-report.css','manualy/error-report.html','manualy/error-report.css','safety/index.html','pilot/index.html','changelog/index.html','tests/index.html','config/access-policy.json','config/access-public-key.json','config/revoked-access.json','shared/material-validator.js','integration/README.md','integration/generator-access-bootstrap.example.js','integration/essay-evaluator-access-bootstrap.example.js','assets/apps/essay-evaluator-v2.png','assets/brand/school-logo.png','assets/brand/portal-gateway.png','assets/brand/portal-ring-outer.svg','assets/brand/portal-ring-middle.svg','assets/brand/portal-ring-inner.svg'];
for(const rel of required)if(!distFiles.includes(path.join(dist,rel)))fail(`Build neobsahuje ${rel}`);
const builtSw=await readFile(path.join(dist,'sw.js'),'utf8');const block=builtSw.match(/const CORE = \[([\s\S]*?)\];/)?.[1]||'';const precache=[...block.matchAll(/['"](\.\/[^'"]+)['"]/g)].map(m=>m[1].replace(/^\.\//,'').replace(/\/$/,'index.html'));if(!precache.length)fail('Service worker nemá čitelný CORE seznam.');for(const rel of precache)if(!distFiles.includes(path.join(dist,rel)))fail(`PWA precache odkazuje na chybějící ${rel}`);
for(const file of distFiles.filter(f=>/\.(html|js|json|webmanifest|css|md)$/.test(f))){const text=await readFile(file,'utf8');if(text.includes('__APP_VERSION__'))fail(`V buildu zůstal token verze: ${path.relative(dist,file)}`);if(file.endsWith('.ghrab-access.json'))fail(`Ve veřejném buildu je přístupový soubor: ${path.relative(dist,file)}`)}

if(errors.length){console.error('\nVALIDACE SELHALA:');for(const e of errors)console.error(`- ${e}`);process.exit(1)}
console.log('\nVšechny kontroly AI Studio GHRAB prošly.');
