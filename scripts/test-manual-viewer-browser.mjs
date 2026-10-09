import assert from "node:assert/strict";
import { readFile, mkdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "qa-results/manual-viewer");
const host = "https://daniel22-dev.github.io";
const prefix = "/AI-Studio-GHRAB/";
await mkdir(out, { recursive: true });

const assets = new Map([
  ["manualy/viewer.html", "src/manualy/viewer.html"],
  ["manualy/viewer.js", "src/manualy/viewer.js"],
  ["manualy/viewer.css", "src/manualy/viewer.css"],
  ["manualy/pdf-export.js", "src/manualy/pdf-export.js"],
  ["styles.css", "src/styles.css"],
  ["polish.css", "src/polish.css"]
]);

const appStub = [
  "window.__manualQaAllowed = true;",
  "const q = new URLSearchParams(location.search);",
  "window.GHRAB = {",
  " accessReady: Promise.resolve(),",
  " state: {language:'cs'},",
  " t: (cs) => cs,",
  " localised: (x) => typeof x === 'string' ? x : (x?.cs || x?.en || ''),",
  " requiredTraining: () => null,",
  " formatReason: () => 'Přístup nebyl povolen.',",
  " hasAppAccess: () => ({enabled: window.__manualQaAllowed && q.get('role') !== 'denied',reason:'app-not-permitted'}),",
  " loadApps: async () => [{",
  "  id:'demo-manual',version:'1.0.0',name:{cs:'Zkušební manuál',en:'Test manual'},",
  "  icon:'assets/brand/icon-48.png',",
  "  manualUrl: q.get('external') === 'yes' ? 'https://untrusted.example/manual/' :",
  "    location.origin + '/AI-Studio-GHRAB/demo-manual/index.html?review=' +",
  "    (q.get('review') || 'verified') + '&child=' + (q.get('child') || 'granted')",
  " }]",
  "};"
].join("\n");

function sampleManual(url) {
  const review = url.searchParams.get("review") === "pending" ? "review-required" : "verified";
  const access = url.searchParams.get("child") === "denied" ? "denied" : "granted";
  return [
    '<!doctype html><html lang="cs" data-ghrab-access="' + access + '">',
    '<meta charset="utf-8"><title>Integrační manuál</title><body>',
    '<main id="manualContent"><h1>První nastavení</h1>',
    '<p>Projděte bezpečný postup nastavení pro učitele.</p>',
    '<h2>Ověření</h2><p>Zkontrolujte výsledek po odeslání.</p>',
    '<div class="steps"><div><b>První krok</b><small>Vložte zdroj.</small></div></div>',
    '<section hidden><h2>Skrytý postup</h2><p>Tento krok musí být v PDF.</p></section>',
    '<div class="stat"><b>Veřejné informace</b><span data-ghrab-pdf-exclude>TAJNE_UDAJE_123</span><span>Bezpečný obsah</span></div>',
    '<a href="https://example.org/navod">Podrobnosti</a></main>',
    '<script>window.GHRAB_MANUAL_DOC_INFO = {appId:"demo-manual",appVersion:"1.0.0",reviewStatus:"' + review + '",pdfContentContract:"static-complete-sections-v1"};',
    'window.GHRAB_MANUAL_EXPORT = [{type:"body",text:"Doplňující vysvětlení plného postupu."}];<\/script>',
    '</body></html>'
  ].join("");
}

function mime(file) {
  const ext = path.extname(file);
  if (ext === ".js") return "text/javascript; charset=utf-8";
  if (ext === ".css") return "text/css; charset=utf-8";
  return "text/html; charset=utf-8";
}

async function handle(route) {
  const url = new URL(route.request().url());
  if (url.origin !== host || !url.pathname.startsWith(prefix))
    return route.abort();
  const rel = url.pathname.slice(prefix.length);
  if (rel === "app.js")
    return route.fulfill({status: 200, contentType: mime("app.js"), body: appStub});
  if (rel === "frame-guard.js")
    return route.fulfill({status: 200, contentType: mime("frame-guard.js"), body: "/* fixture: no frame guard mutation */"});
  if (rel === "demo-manual/index.html")
    return route.fulfill({status: 200, contentType: mime(rel), body: sampleManual(url)});
  const source = assets.get(rel);
  if (!source) return route.fulfill({status: 404, body: "Not found"});
  const body = await readFile(path.join(root, source));
  return route.fulfill({status: 200, contentType: mime(rel), body});
}

let browser;
try {
  browser = await chromium.launch({headless: true});
  const context = await browser.newContext({viewport: {width: 1366, height: 820}, acceptDownloads: true});
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(String(error)));
  await page.route(host + "/**", handle);
  const base = host + prefix + "manualy/viewer.html?app=demo-manual";

  await page.goto(base + "&review=verified", {waitUntil: "load"});
  await page.locator("#viewer-pdf").waitFor({state: "visible"});
  assert.equal(await page.locator("#viewer-external").isVisible(), true);
  const separate = await page.locator("#viewer-external").getAttribute("href");
  assert.match(separate || "", /[?&]from=studio/);
  assert.equal(await page.locator(".viewer-back-studio").count(), 1);
  assert.equal(await page.locator("#viewer-pdf").count(), 1);

  const downloadEvent = page.waitForEvent("download", {timeout: 120000});
  await page.locator("#viewer-pdf").click();
  const download = await downloadEvent;
  const pdfPath = await download.path();
  const pdf = await readFile(pdfPath);
  assert.match(pdf.toString("latin1", 0, 8), /^%PDF-1[.]/);
  const copied = path.join(out, "viewer-real-export.pdf");
  await import("node:fs/promises").then(fs => fs.copyFile(pdfPath, copied));
  const extracted = execFileSync("pdftotext", ["-layout", copied, "-"], {encoding: "utf8", timeout: 40000});
  for (const fragment of ["První nastavení", "První krok", "Skrytý postup", "Doplňující vysvětlení"]) {
    assert.ok(extracted.includes(fragment), "PDF loses manual content: " + fragment);
  }
  assert.ok(!extracted.includes("TAJNE_UDAJE_123"), "Nested excluded data escaped into PDF");
  await page.screenshot({path: path.join(out, "viewer-verified-desktop.png")});
  await page.setViewportSize({width: 390, height: 844});
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  assert.ok(overflow <= 2, "Viewer horizontal overflow at 390px: " + overflow);
  await page.screenshot({path: path.join(out, "viewer-verified-mobile.png")});

  await page.evaluate(() => {
    window.__manualQaAllowed = false;
    document.dispatchEvent(new Event("ghrab:access-changed"));
  });
  await page.waitForFunction(() => document.querySelector("#viewer-state-title")?.textContent?.includes("uzamčen"));
  assert.equal(await page.locator("#viewer-pdf").isVisible(), false);
  assert.equal(await page.locator("#manual-frame").isVisible(), false);
  assert.equal(await page.getByText("Zpět na manuály").count() > 0, true);

  await page.goto(base + "&review=pending");
  await page.frameLocator("#manual-frame").locator("html[data-ghrab-access='granted']").waitFor();
  assert.equal(await page.locator("#viewer-pdf").isVisible(), false, "Unreviewed guide must not export");

  await page.goto(base + "&child=denied");
  await page.frameLocator("#manual-frame").locator("html[data-ghrab-access='denied']").waitFor();
  assert.equal(await page.locator("#viewer-pdf").isVisible(), false, "Denied iframe must not export");

  await page.goto(base + "&role=denied");
  await page.getByText("Tento manuál je uzamčen").waitFor();
  assert.equal(await page.locator("#viewer-pdf").isVisible(), false);

  await page.goto(base + "&external=yes");
  await page.getByText("Adresa manuálu není bezpečná").waitFor();
  assert.equal(await page.locator("#viewer-pdf").isVisible(), false);

  await page.goto(host + prefix + "manualy/viewer.html?app=unknown");
  await page.getByText("Manuál nebyl nalezen").waitFor();

  assert.deepEqual(errors, [], "Browser JS errors: " + errors.join(" | "));
  console.log(JSON.stringify({ok: true, viewer: "real Studio viewer.html/js",
    contexts: ["verified", "revoked", "pending", "child-denied", "role-denied", "bad-origin", "unknown"],
    pdfBytes: pdf.length, overflow}));
} finally {
  await browser?.close();
}
