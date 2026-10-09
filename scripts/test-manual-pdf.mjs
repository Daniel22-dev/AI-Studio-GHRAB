import { createServer } from "node:http";
import { readFile, mkdtemp, rm, mkdir, copyFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tmp = await mkdtemp(path.join(os.tmpdir(), "ghrab-pdf-"));
const webPage = String.raw`<!doctype html><html lang="cs" data-ghrab-access="granted"><meta charset="UTF-8"><title>Test českého manuálu</title>
<body><main class="ghrab-access-bootstrap-fallback"><h1>NEEXPORTOVAT PŘÍSTUPOVOU BRÁNU</h1></main><main id="manualContent">
<h1>Začínáme s AI Studiem</h1>
<h2>První nastavení API klíče</h2>
<div class="stat"><b>Pro koho</b><span>Učitelé</span></div><div class="mini-step"><span>1</span><span>Zvol režim</span></div>
<p>Při používání školy ověřte školní účet, českou diakritiku: ěščřžýáíéúůďťň ĚŠČŘŽÝÁÍÉÚŮĎŤŇ.</p>
<details><summary>Rozbalený postup: Google Forms a START/END</summary><p>Tento text je i v zavřeném detailu.</p></details>
<ul><li>Připravit osobní kód.</li><li>Odevzdat a zkontrolovat výsledky.</li></ul>
<div class="steps"><div><span><b>Importujte třídu</b><small>Vložte skupinu z IS.</small></span></div></div>
<div class="keys"><div><code>Alt + I</code><span>Import z IS</span></div></div>
<div class="grid"><article><b>Losování</b><p>Náhodný výběr studentů.</p></article></div>
<div class="term"><b>Roster</b><p>Bezpečný seznam studentů.</p></div>
<div class="activity"><b>Slovotvorba</b><small>Vysvětlete tvar a význam.</small></div>
<table><thead><tr><th>Úroveň</th><th>Očekávání</th></tr></thead><tbody><tr><td>Standardní</td><td>Vysvětlí význam slov</td></tr></tbody></table>
<section hidden><h2>Skrytá sekce při vyhledávání</h2><p>Výukové kroky nesmí zmizet po filtrování.</p></section>
<div data-ghrab-pdf-exclude><p>NEEXPORTOVAT INTERNÍ ÚDAJE</p></div>
<div class="safety-item"><i>✓</i><div>Neodesílejte citlivá data studentů.</div></div>
<label class="check"><input type="checkbox"><span>Ověřte studentský odkaz.</span></label>
<div class="acc"><button type="button">Jak vrátit výsledek?<span>＋</span></button><div class="ans">Použijte Verifier.</div></div>
<a href="https://example.org/help">Otevřít nápovědu</a>
</main><button id="pdf">Stáhnout PDF</button>
<script type="module">
import { downloadManualPdf } from "/manualy/pdf-export.js";
for (let i=0; i<90; i++) {
  const paragraph=document.createElement("p");
  paragraph.textContent="Krok "+(i+1)+": Pečlivě zkontrolujte zadání, výsledky a odevzdání. Podpora češtiny: ěščřžýáíéúůďťň.";
  document.querySelector("#manualContent").append(paragraph);
}
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
  // Reject access states before extracting content, even when the metadata is absent.
  const deniedStates = await page.evaluate(async () => {
    const { downloadManualPdf } = await import("/manualy/pdf-export.js");
    const results = [];
    for (const state of ["missing", "checking", "denied", "empty"]) {
      const testDoc = document.implementation.createHTMLDocument("Isolated access test");
      testDoc.body.innerHTML = "<main><h1>Private manual</h1><p>Hidden details must not leave this document</p></main>";
      if (state !== "missing") testDoc.documentElement.dataset.ghrabAccess = state === "empty" ? "" : state;
      try {
        await downloadManualPdf(testDoc, { filename: "MUST_NOT_EXPORT.pdf" });
        results.push({ state, refused: false });
      } catch (err) {
        results.push({ state, refused: String(err?.message || err).includes("Přístup k manuálu nebyl ověřen") });
      }
    }
    return results;
  });
  if (deniedStates.some(item => !item.refused))
    throw Error("PDF access gate did not fail closed: " + JSON.stringify(deniedStates));
  const task=page.waitForEvent("download",{timeout:45000});
  await page.click("#pdf");
  const download=await task;
  const error=await page.locator("body").getAttribute("data-error");
  if(error)throw Error("PDF runtime error: "+error);
  const file=await download.path(), buf=await readFile(file);
  if(buf.subarray(0,8).toString("latin1").indexOf("%PDF-1.")!==0)throw Error("Output is not PDF");
  const pdf=buf.toString("latin1");
  if(!pdf.includes("/ToUnicode")||!pdf.includes("/Type3"))throw Error("Unicode PDF font missing");
  const masks=(pdf.match(/\/ImageMask true/g)||[]).length;
  const correctlyDecoded=(pdf.match(/\/Decode \[1 0\]/g)||[]).length;
  if(!masks||correctlyDecoded!==masks)throw Error("PDF glyph bitmap mask is inverted: "+correctlyDecoded+"/"+masks);
  if(!pdf.includes(".07 .19 .30 RG .7 w 45 798 m "))throw Error("PDF header stroke is malformed");
  if(pdf.includes("45 816 50 3 re f"))throw Error("Decorative stripe obscures PDF running header");
  if(!pdf.includes("/Subtype /Link"))throw Error("Clickable link missing");
  const pages=(pdf.match(/\/Type \/Page \/Parent/g)||[]).length;
  if(!pages)throw Error("No pages");
  if(errors.length)throw Error(errors.join("\n"));

  // Strict built-in Unicode extraction from the actual PDF ToUnicode objects.
  // CI is therefore meaningful even when poppler-utils is unavailable.
  const objects=new Map([...pdf.matchAll(/(\d+) 0 obj\n([\s\S]*?)\nendobj/g)].map(m=>[Number(m[1]),m[2]]));
  const fontResources=new Map([...pdf.matchAll(/\/F(\d+) (\d+) 0 R/g)].map(m=>[m[1],Number(m[2])]));
  const fontMaps=new Map();
  for(const [fontId,objectId] of fontResources){
    const fontObj=objects.get(objectId)||"";
    const ref=fontObj.match(/\/ToUnicode (\d+) 0 R/);
    if(!ref)continue;
    const cmap=objects.get(Number(ref[1]))||"";
    const map=new Map();
    for(const entry of cmap.matchAll(/<([0-9A-F]{2})> <([0-9A-F]{4,8})>/gi)){
      const u=entry[2].match(/.{4}/g)||[];
      map.set(entry[1].toUpperCase(),String.fromCharCode(...u.map(k=>parseInt(k,16))));
    }
    fontMaps.set(fontId,map);
  }
  if(!fontMaps.size)throw Error("No registered Unicode maps");
  const glyphRuns=[...pdf.matchAll(/BT \/F(\d+) [\d.]+ Tf 1 0 0 1 [\d.]+ [\d.]+ Tm <([0-9A-F]+)> Tj ET/g)];
  if(glyphRuns.length<100)throw Error("Missing text runs in PDF");
  let unicodeText="";
  for(const run of glyphRuns){
    const map=fontMaps.get(run[1]);
    if(!map)throw Error("Font resource is missing Unicode map");
    const glyphs=run[2].match(/.{2}/g)||[];
    for(const glyph of glyphs){
      const value=map.get(glyph.toUpperCase());
      if(value===undefined)throw Error("Missing ToUnicode entry: "+glyph);
      unicodeText+=value;
    }
  }
  for(const word of ["Začínáme","diakritika","ěščřžýáíéúůďťň","Google Forms","Výukový průvodce","uzavřených","Krok 90","Pro koho Učitelé","1 Zvol režim","Importujte třídu Vložte skupinu z IS.","Alt + I Import z IS","Losování","Roster","✓ Neodesílejte citlivá data studentů.","Ověřte studentský odkaz.","Jak vrátit výsledek?","Slovotvorba Vysvětlete tvar a význam.","Úroveň | Očekávání","Standardní | Vysvětlí význam slov","Skrytá sekce při vyhledávání","Výukové kroky nesmí zmizet po filtrování."]){
    if(!unicodeText.includes(word))throw Error("PDF ToUnicode failed extraction: "+word+" from "+unicodeText.slice(0,300));
  }
  if(unicodeText.includes("Jak vrátit výsledek?＋"))
    throw Error("Decorative accordion button glyph leaked into PDF");
  if(unicodeText.includes("NEEXPORTOVAT PŘÍSTUPOVOU BRÁNU") || unicodeText.includes("NEEXPORTOVAT INTERNÍ ÚDAJE"))
    throw Error("PDF included access gate or excluded internal data");
  if(pages<2)throw Error("Long manual was not paginated");
  let extracted="";let extraction="skipped";
  try {
    extracted=execFileSync("pdftotext",["-layout",file,"-"],{encoding:"utf8",timeout:30000});
    extraction="executed";
    for(const word of ["Začínáme","diakritika","ěščřžýáíéúůďťň","Google Forms","Výukový průvodce","uzavřených"]) {
      if(!extracted.includes(word))throw Error("PDF text extraction missing: "+word+"\nEXTRACTED="+extracted.slice(0,2000));
    }
  }catch(e){if(e.code!=="ENOENT")throw e;}
  const artifactDir = process.env.GHRAB_PDF_QA_ARTIFACT_DIR;
  if (artifactDir) {
    const out = path.resolve(artifactDir);
    await mkdir(out, { recursive: true });
    await copyFile(file, path.join(out, "manual-pdf-fixture.pdf"));
    execFileSync("pdftoppm", [
      "-f","1","-l","1","-r","150","-png","-singlefile",file,
      path.join(out, "manual-pdf-first-page")
    ], { timeout: 60000 });
  }
  console.log(JSON.stringify({ok:true,pages,bytes:buf.length,extraction,
    visualArtifact: Boolean(artifactDir), selected:extracted.slice(0,140)}));
} finally {
  await browser?.close();await new Promise(resolve=>server.close(resolve));await rm(tmp,{recursive:true,force:true});
}
