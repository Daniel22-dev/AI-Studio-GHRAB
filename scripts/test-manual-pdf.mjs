import { createServer } from "node:http";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tmp = await mkdtemp(path.join(os.tmpdir(), "ghrab-pdf-"));
const webPage = String.raw`<!doctype html><html lang="cs" data-ghrab-access="granted"><meta charset="UTF-8"><title>Test českého manuálu</title>
<body><main>
<h1>Začínáme s AI Studiem</h1>
<h2>První nastavení API klíče</h2>
<p>Při používání školy ověřte školní účet, českou diakritiku: ěščřžýáíéúůďťň ĚŠČŘŽÝÁÍÉÚŮĎŤŇ.</p>
<details><summary>Rozbalený postup: Google Forms a START/END</summary><p>Tento text je i v zavřeném detailu.</p></details>
<ul><li>Připravit osobní kód.</li><li>Odevzdat a zkontrolovat výsledky.</li></ul>
<a href="https://example.org/help">Otevřít nápovědu</a>
</main><button id="pdf">Stáhnout PDF</button>
<script type="module">
import { downloadManualPdf } from "/manualy/pdf-export.js";
document.querySelector("#pdf").addEventListener("click", async () => {
try{const result = await downloadManualPdf(document,{
 title:"Příručka učitele – česká diakritika",
 filename:"test-cesky-manual.pdf",
 extras:[{type:"h2",text:"Výukový průvodce – všechny kroky"},
         {type:"body",text:"Tento odstavec ověřuje přenos obsahu uzavřených interaktivních panelů."}]
});document.body.dataset.exportPages=String(result.pages);}
catch(e){document.body.dataset.error=String(e.stack||e);}
});
</script></body></html>`;
const server = createServer(async(req,res)=>{
  try {
    if(req.url === "/manualy/pdf-export.js"){
      res.writeHead(200, {"Content-Type":"text/javascript; charset=utf-8"});
      res.end(await readFile(path.join(root,"src/manualy/pdf-export.js")));
    } else if(req.url === "/") {
      res.writeHead(200, {"Content-Type":"text/html; charset=utf-8"});res.end(webPage);
    } else {res.writeHead(404);res.end();}
  } catch(e) {res.writeHead(500);res.end(String(e));}
});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
let browser;
try {
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage({acceptDownloads:true,viewport:{width:390,height:844}});
  const errors=[];page.on("pageerror",e=>errors.push(String(e)));
  await page.goto("http://127.0.0.1:"+server.address().port+"/");
  const task=page.waitForEvent("download",{timeout:45000});
  await page.click("#pdf");
  const download=await task;
  const error=await page.locator("body").getAttribute("data-error");
  if(error)throw Error("PDF runtime error: "+error);
  const file=await download.path(), buf=await readFile(file);
  if(buf.subarray(0,8).toString("latin1").indexOf("%PDF-1.")!==0)throw Error("Output is not PDF");
  const pdf=buf.toString("latin1");
  if(!pdf.includes("/ToUnicode")||!pdf.includes("/Type3"))throw Error("Unicode PDF font missing");
  if(!pdf.includes("/Subtype /Link"))throw Error("Clickable link missing");
  const pages=(pdf.match(/\/Type \/Page \/Parent/g)||[]).length;
  if(!pages)throw Error("No pages");
  if(errors.length)throw Error(errors.join("\n"));
  let extracted="";let extraction="skipped";
  try {
    extracted=execFileSync("pdftotext",["-layout",file,"-"],{encoding:"utf8",timeout:30000});
    extraction="executed";
    for(const word of ["Začínáme","diakritika","ěščřžýáíéúůďťň","Google Forms","Výukový průvodce","uzavřených"]) {
      if(!extracted.includes(word))throw Error("PDF text extraction missing: "+word+"\nEXTRACTED="+extracted.slice(0,2000));
    }
  }catch(e){if(e.code!=="ENOENT")throw e;}
  console.log(JSON.stringify({ok:true,pages,bytes:buf.length,extraction,selected:extracted.slice(0,140)}));
} finally {
  await browser?.close();await new Promise(resolve=>server.close(resolve));await rm(tmp,{recursive:true,force:true});
}
