import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const shared = await readFile(path.join(root, "src/manualy/manual-navigation.js"), "utf8");
const appHtml = access => '<!doctype html><html lang="cs" data-ghrab-access="' + access +
  '"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
  '<style>:root{--panel:#132638;--text:#eef6ff;--muted:#adc0cf;--line:#526e84}' +
  'body{margin:0;background:#091626;color:var(--text);font-family:system-ui}.topbar{display:flex;gap:12px;align-items:center;padding:10px}' +
  '.brand{min-width:120px}.top-actions{display:flex;align-items:center;gap:8px;margin-left:auto}' +
  'main{padding:16px}</style><body><header class="topbar"><div class="brand">Testovací manuál</div>' +
  '<div class="top-actions"><a class="manual-back" href="../">Zpět do aplikace</a>' +
  '<button onclick="window.print()">⎙</button></div></header><main><h1>Manuál</h1>' +
  '<button id="manual-pdf">↓ Stáhnout PDF</button><span id="manual-pdf-status" role="status"></span></main>' +
  '<script type="module" src="/AI-Studio-GHRAB/manualy/manual-navigation.js"></script></body></html>';
const viewer = '<!doctype html><meta charset="utf-8"><button id="viewer-pdf" hidden>Stáhnout PDF</button>' +
  '<iframe id="manual-frame" title="Manuál" src="/app/manual/?ghrabFrom=studio" style="width:100%;height:700px"></iframe>';
const server = createServer((req,res)=>{
  const url = new URL(req.url, "http://localhost");
  res.setHeader("Content-Type", url.pathname.endsWith(".js") ? "text/javascript; charset=utf-8" : "text/html; charset=utf-8");
  if(url.pathname === "/AI-Studio-GHRAB/manualy/manual-navigation.js") res.end(shared);
  else if(url.pathname === "/app/manual/") res.end(appHtml(url.searchParams.get("access") || "granted"));
  else if(url.pathname === "/AI-Studio-GHRAB/manualy/test-viewer") res.end(viewer);
  else { res.writeHead(404);res.end("Not found"); }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const origin = "http://127.0.0.1:" + server.address().port;
let browser;
try {
  browser = await chromium.launch({headless:true});
  const errors = [];
  async function open(pathname,width=1366) {
    const page = await browser.newPage({viewport:{width,height:844}});
    page.on("pageerror",e=>errors.push(String(e)));
    await page.goto(origin+pathname);
    return page;
  }
  for(const [mode,expected,missing] of [
    ["manuals", ["Zpět na manuály", "AI Studio"], ["Zpět do aplikace"]],
    ["app", ["Zpět do aplikace", "AI Studio"], ["Zpět na manuály"]]
  ]) {
    const page=await open("/app/manual/?ghrabFrom="+mode);
    await page.waitForSelector("#ghrab-manual-toolbar");
    const links=(await page.locator("#ghrab-manual-return a").allTextContents()).join(" | ");
    for(const label of expected) assert(links.includes(label), "Missing "+label+" in "+mode+": "+links);
    for(const label of missing) assert(!links.includes(label), "Unexpected "+label+" in "+mode+": "+links);
    assert.equal(await page.locator("header button[onclick]").count(),0,"Print icon not removed");
    assert.equal(await page.locator("header .manual-back:visible").count(),0,"Legacy back button visible");
    assert.equal(await page.locator("#manual-pdf:visible").count(),1,"Local PDF button missing");
    await page.close();
  }
  const direct=await open("/app/manual/");
  await direct.waitForSelector("#ghrab-manual-toolbar");
  assert.deepEqual(await direct.locator("#ghrab-manual-return a").allTextContents(),["AI Studio"]);
  await direct.close();

  const denied=await open("/app/manual/?access=denied");
  assert.equal(await denied.locator("#ghrab-manual-toolbar").count(),0,"Denied page exposed manual controls");
  await denied.close();

  const mobile=await open("/app/manual/?ghrabFrom=app",390);
  await mobile.waitForSelector("#ghrab-manual-toolbar");
  const overflow=await mobile.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  assert(overflow<=2,"Manual toolbar causes horizontal overflow on 390px viewport: "+overflow);
  await mobile.close();

  const parent=await open("/AI-Studio-GHRAB/manualy/test-viewer");
  const frame=parent.frameLocator("#manual-frame");
  await frame.locator("#ghrab-manual-toolbar").waitFor();
  assert.equal(await frame.locator("#ghrab-manual-return:visible").count(),0,"Embedded manual duplicated return navigation");
  assert.equal(await frame.locator("#manual-pdf:visible").count(),1,"Local PDF fallback unavailable");
  await parent.locator("#viewer-pdf").evaluate(node=>{node.hidden=false;});
  await frame.locator("#manual-pdf").waitFor({state:"hidden"});
  assert.equal(await parent.locator("#viewer-pdf:visible").count(),1,"Central PDF not shown");
  await parent.close();
  if(errors.length) throw new Error("Browser errors: "+errors.join(" | "));
  console.log("[MANUAL NAVIGATION] PASS: app, catalog, direct, denied, mobile, embedded and PDF de-duplication");
} finally {
  await browser?.close();
  await new Promise(resolve=>server.close(resolve));
}
