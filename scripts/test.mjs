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

const standardPages=new Set(['index.html','access/index.html','automation/index.html','workflow/index.html','report/index.html','demo/index.html','library/index.html','safety/index.html','pilot/index.html','changelog/index.html','tests/index.html']);
for(const file of sourceFiles.filter(f=>f.endsWith('.html'))){
 const html=await readFile(file,'utf8');const rel=path.relative(src,file).replaceAll('\\','/');
 const ids=[...html.matchAll(/\sid=["']([^"']+)["']/g)].map(m=>m[1]);const seen=new Set();for(const id of ids){if(seen.has(id))fail(`Duplicitní id ${id} v ${rel}`);seen.add(id)}
 const isFragment=rel.startsWith('integration/');
 if(!isFragment&&!html.includes('Content-Security-Policy'))fail(`Chybí CSP v ${rel}`);if(!isFragment&&!html.includes('name="viewport"')&&!html.includes("name='viewport'"))fail(`Chybí viewport v ${rel}`);
 if(standardPages.has(rel)){if(!html.includes('Autor a vývojový garant: Daniel Baláž'))fail(`Chybí sjednocené zápatí v ${rel}`);if(!html.includes('polish.css'))fail(`Chybí polish.css v ${rel}`)}
 if(isFragment)continue;
 for(const match of html.matchAll(/(?:href|src)=["']([^"'#]+)["']/g)){
  const url=match[1];if(/^(?:https?:|data:|mailto:|tel:)/.test(url)||url.startsWith('__'))continue;
  const clean=url.split('?')[0];let target=path.resolve(path.dirname(file),clean);if(clean.endsWith('/'))target=path.join(target,'index.html');
  if(!(await exists(target)))fail(`Neplatný lokální odkaz v ${rel}: ${url}`);
 }
}
for(const file of ['automation/automation.js','pilot/pilot.js','report/report.js','demo/demo.js','changelog/changelog.js','tests/tests.js']){const text=await readFile(path.join(src,file),'utf8');if(!text.includes('accessReady')||!text.includes('isAdmin'))fail(`${file} nemá správcovskou bránu.`)}
for(const file of ['integration/generator-access-bootstrap.example.js','integration/differentiator-access-bootstrap.example.js','integration/essay-evaluator-access-bootstrap.example.js','integration/ludus-access-bootstrap.example.js','integration/correspondence-access-bootstrap.example.js'])if(!(await exists(path.join(src,file))))fail(`Chybí integrační šablona ${file}.`);
const appGuardText=await readFile(path.join(src,'access/app-guard.js'),'utf8');
if(!appGuardText.includes("new URL(options.studioUrl || '../', location.href)"))fail('app-guard nepřevádí relativní adresu Studia na úplnou URL.');
if(new URL('/AI-Studio-GHRAB/','https://daniel22-dev.github.io/generator-testu/').href!=='https://daniel22-dev.github.io/AI-Studio-GHRAB/')fail('Regresní test adresy Studia selhal.');

const directStorageWriters=sourceFiles.filter(file=>file.endsWith('.js')&&!['app.js','bridge/studio-bridge.js','tests/tests.js','access/access-control.js','tools/access-issuer/issuer.js'].some(s=>file.endsWith(path.join('src',s))));
for(const file of directStorageWriters){const text=await readFile(file,'utf8');if(text.includes('localStorage.setItem('))fail(`Přímý zápis do localStorage mimo bezpečný modul: ${path.relative(root,file)}`)}

try{execFileSync(process.execPath,[path.join(root,'scripts/build.mjs')],{stdio:'inherit'})}catch{fail('Build selhal.');}
const distFiles=await walk(dist);const required=['index.html','styles.css','polish.css','app.js','manifest.webmanifest','sw.js','build-info.json','access/index.html','access/access-control.js','access/app-guard.js','tools/access-issuer/index.html','automation/index.html','workflow/index.html','report/index.html','demo/index.html','library/index.html','safety/index.html','pilot/index.html','changelog/index.html','tests/index.html','config/access-policy.json','config/access-public-key.json','config/revoked-access.json','shared/material-validator.js','integration/README.md','integration/generator-access-bootstrap.example.js','integration/essay-evaluator-access-bootstrap.example.js','assets/apps/essay-evaluator.png'];
for(const rel of required)if(!distFiles.includes(path.join(dist,rel)))fail(`Build neobsahuje ${rel}`);
const builtSw=await readFile(path.join(dist,'sw.js'),'utf8');const block=builtSw.match(/const CORE = \[([\s\S]*?)\];/)?.[1]||'';const precache=[...block.matchAll(/['"](\.\/[^'"]+)['"]/g)].map(m=>m[1].replace(/^\.\//,'').replace(/\/$/,'index.html'));if(!precache.length)fail('Service worker nemá čitelný CORE seznam.');for(const rel of precache)if(!distFiles.includes(path.join(dist,rel)))fail(`PWA precache odkazuje na chybějící ${rel}`);
for(const file of distFiles.filter(f=>/\.(html|js|json|webmanifest|css|md)$/.test(f))){const text=await readFile(file,'utf8');if(text.includes('__APP_VERSION__'))fail(`V buildu zůstal token verze: ${path.relative(dist,file)}`);if(file.endsWith('.ghrab-access.json'))fail(`Ve veřejném buildu je přístupový soubor: ${path.relative(dist,file)}`)}

if(errors.length){console.error('\nVALIDACE SELHALA:');for(const e of errors)console.error(`- ${e}`);process.exit(1)}
console.log('\nVšechny kontroly AI Studio GHRAB prošly.');
