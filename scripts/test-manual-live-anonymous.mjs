import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
// PUBLIC, unauthenticated production smoke only. No school credentials,
// forged tokens, permit fixtures or student data are used in this script.
const origin="https://daniel22-dev.github.io";
const apps=[
["generator","generator-testu","7.1.99"],
["differentiator","diferenciator","1.3.51"],
["essay-evaluator","Hodnotitel-maturitnich-slohu","1.5.30"],
["correspondence","korespondencni-asistent","5.10.34"],
["ludus","Ludus","1.16.31"],
["activity-builder","ACTIVA","0.5.30"],
["sortio","SORTIO","1.1.23"],
["lesson-hub","lesson-hub","1.2.26"],
["maturita-desk","maturita-desk","1.0.6"]
];
const out=path.resolve("qa-results/manual-live-acceptance");
await mkdir(out,{recursive:true});
const results=[];
function add(row,status,detail){row.checks.push({status,detail});}
async function go(page,url){
 try{const resp=await page.goto(url,{waitUntil:"domcontentloaded",timeout:28000});await page.waitForTimeout(4200);return{status:resp?.status()||0,finalUrl:page.url()};}
 catch(e){return{status:0,finalUrl:page.url(),error:String(e?.message||e).slice(0,240)};}
}
async function shot(page,name){
 try{await page.screenshot({path:path.join(out,name),fullPage:false,timeout:10000});return name;}
 catch(e){return String(e?.message||e).slice(0,100);}
}
const browser=await chromium.launch({headless:true});
try{
 const context=await browser.newContext({viewport:{width:1380,height:880},serviceWorkers:"block"});
 for(const [id,repo,version] of apps){
   const rec={kind:"standalone",id,repo,expectedVersion:version,url:origin+"/"+repo+"/manual/",checks:[]};
   const page=await context.newPage(),jsErrors=[];
   page.on("pageerror",e=>{if(jsErrors.length<5)jsErrors.push(String(e).slice(0,120))});
   Object.assign(rec,await go(page,rec.url));
   if(rec.status!==200)add(rec,"FAIL","HTTP status is "+rec.status);
   const dom=await page.evaluate(()=>{
     const html=document.documentElement;
     const pdf=[...document.querySelectorAll("#viewer-pdf,#downloadPdf,[data-ghrab-pdf-action]")].some(x=>!x.hidden&&getComputedStyle(x).visibility!=="hidden"&&x.getBoundingClientRect().width>0);
     return{appId:html.dataset.ghrabAppId||"",version:html.dataset.ghrabAppVersion||"",access:html.dataset.ghrabAccess||"",visiblePdf:pdf,title:document.title,mainVisible:[...document.querySelectorAll("main")].some(el=>getComputedStyle(el).visibility!=="hidden"&&getComputedStyle(el).display!=="none"&&el.getBoundingClientRect().height>0)};
   });
   Object.assign(rec,dom,{jsErrors});
   if(dom.appId!==id)add(rec,"FAIL","Incorrect app ID "+dom.appId);
   if(dom.version!==version)add(rec,"FAIL","Incorrect deployed version "+dom.version);
   if(dom.access==="granted")add(rec,"FAIL","Anonymous user unexpectedly has access");
   else if(dom.access==="denied")add(rec,"PASS","Anonymous access denied");
   else add(rec,"INCONCLUSIVE","Guard status "+dom.access+" after 4.2s");
   if(dom.visiblePdf)add(rec,"FAIL","PDF action visible without access");
   rec.desktop=await shot(page,id+"-desktop.png");
   await page.setViewportSize({width:390,height:844});await page.waitForTimeout(250);
   rec.mobile=await page.evaluate(()=>({overflow:Math.max(0,document.documentElement.scrollWidth-innerWidth)}));
   if(rec.mobile.overflow>8)add(rec,"INCONCLUSIVE","Mobile horizontal overflow "+rec.mobile.overflow+"px");
   rec.mobileScreenshot=await shot(page,id+"-mobile.png");
   await page.close();results.push(rec);
 }
 const catalogue={kind:"catalogue",url:origin+"/AI-Studio-GHRAB/manualy/",checks:[]};
 {const page=await context.newPage();Object.assign(catalogue,await go(page,catalogue.url));if(catalogue.status!==200)add(catalogue,"FAIL","Catalogue HTTP "+catalogue.status);
  catalogue.dom=await page.evaluate(()=>({cards:document.querySelectorAll(".manual-card").length,unlocked:document.querySelectorAll(".manual-card.open").length,links:document.querySelectorAll("a.manual-open").length}));
  if(catalogue.dom.cards!==9)add(catalogue,"FAIL","Expected 9 manual cards; got "+catalogue.dom.cards);
  if(catalogue.dom.unlocked||catalogue.dom.links)add(catalogue,"FAIL","Manual open in unauthenticated catalogue");
  catalogue.screenshot=await shot(page,"studio-catalogue-anonymous.png");await page.close();results.push(catalogue);
 }
 for(const [id] of apps){
  const v={kind:"viewer",id,url:origin+"/AI-Studio-GHRAB/manualy/viewer.html?app="+id,checks:[]};
  const page=await context.newPage();Object.assign(v,await go(page,v.url));
  if(v.status!==200)add(v,"FAIL","Viewer HTTP "+v.status);
  v.dom=await page.evaluate(()=>({state:document.querySelector("#viewer-state-title")?.textContent?.trim()||"",pdfHidden:document.querySelector("#viewer-pdf")?.hidden??null,frameHidden:document.querySelector("#manual-frame")?.hidden??null,returnCatalogue:document.querySelector(".viewer-back")?.getAttribute("href")||"",returnStudio:document.querySelector(".viewer-back-studio")?.getAttribute("href")||""}));
  if(v.dom.pdfHidden!==true)add(v,"FAIL","Viewer PDF not hidden without permit");
  if(v.dom.frameHidden!==true)add(v,"FAIL","Viewer frame not hidden without permit");
  if(!/uzamčen|locked/i.test(v.dom.state))add(v,"INCONCLUSIVE","Viewer state "+v.dom.state);
  if(v.dom.returnCatalogue!=="./"||v.dom.returnStudio!=="../")add(v,"FAIL","Unsafe return route");
  v.screenshot=await shot(page,id+"-viewer.png");
  await page.close();results.push(v);
 }
}finally{await browser.close()}
const checks=results.flatMap(r=>r.checks);
const report={schema:"GHRAB-LIVE-MANUAL-ANONYMOUS-QA-1",at:new Date().toISOString(),scope:"PUBLIC ANONYMOUS ONLY. No school teacher has been authenticated or approved.",total:results.length,pass:checks.filter(c=>c.status==="PASS").length,fail:checks.filter(c=>c.status==="FAIL").length,inconclusive:checks.filter(c=>c.status==="INCONCLUSIVE").length,results};
await writeFile(path.join(out,"result.json"),JSON.stringify(report,null,2));
console.log(JSON.stringify({at:report.at,total:report.total,pass:report.pass,fail:report.fail,inconclusive:report.inconclusive,issues:results.filter(r=>r.checks.some(c=>c.status!=="PASS")).map(r=>({kind:r.kind,id:r.id||"",http:r.status,access:r.access,issues:r.checks.filter(c=>c.status!=="PASS")}))},null,2));
if(report.fail||report.inconclusive)process.exitCode=1;
