#!/usr/bin/env node
/* R16 real-browser, synthetic-only, read-only V1 backup preflight. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { chromium } from "playwright";
const origin="https://school.example",base="/AI-Studio-GHRAB/";
const html=readFileSync("src/groups/index.html","utf8")
  .replace('<script src="../app.js" type="module"></script>',"");
const modules=new Map([
  [base+"groups/groups.js",readFileSync("src/groups/groups.js","utf8")],
  [base+"groups/group-service.js",readFileSync("src/groups/group-service.js","utf8")],
  [base+"groups/write-transaction.js",readFileSync("src/groups/write-transaction.js","utf8")],
  [base+"groups/legacy-migration.js",readFileSync("src/groups/legacy-migration.js","utf8")]
]);
const browser=await chromium.launch({headless:true});
try {
  const context=await browser.newContext();
  await context.addInitScript(()=>{
    window.GHRAB={
      accessReady:Promise.resolve(),
      getAccessSnapshot(){return {ready:true,valid:true,mode:"signed-permit",
        permit:{sub:"synthetic-teacher-A",role:"teacher",exp:Math.floor(Date.now()/1000)+3600}};},
      isColleaguePreview(){return false}
    };
  });
  const page=await context.newPage(),errors=[];
  page.on("pageerror",e=>errors.push(e.message));
  await page.route(origin+"/**",route=>{
    const p=new URL(route.request().url()).pathname;
    if(p===base+"groups/"||p===base+"groups/index.html")
      return route.fulfill({status:200,contentType:"text/html",body:html});
    if(modules.has(p))return route.fulfill({status:200,contentType:"text/javascript",body:modules.get(p)});
    if(p.endsWith(".css"))return route.fulfill({status:200,contentType:"text/css",body:""});
    return route.fulfill({status:404,body:"Unexpected route"});
  });
  await page.goto(origin+base+"groups/");
  await page.locator("#groups-legacy-open").waitFor();
  const fixture=await page.evaluate(async()=>{
    const module=await import("/AI-Studio-GHRAB/groups/group-service.js");
    const old=module.createGroupsService({provider:new module.LocalGroupsProvider()});
    const created=old.createGroup({displayName:"Synthetic Class",schoolYear:"2026/27"});
    old.importRoster({groupId:created.groupId,expectedRevision:created.revision,
      rawText:["Synthetic Learner; synthetic@example.invalid",
        "Synthetic Second; second@example.invalid"].join("\n")});
    return {backup:old.exportBackup(),
      v1:localStorage.getItem("ghrab.ai-studio.groups.v1")};
  });
  await page.locator("#groups-legacy-open").click();
  assert.equal(await page.locator("#groups-legacy-dialog").evaluate(x=>x.open),true);
  await page.locator("#groups-legacy-file").setInputFiles({
    name:"synthetic-v1.json",mimeType:"application/json",
    buffer:Buffer.from(JSON.stringify(fixture.backup))
  });
  await page.getByText(/Kontrola zálohy V1 proběhla/).waitFor();
  const shown=await page.locator("#groups-legacy-preview").innerText();
  assert.ok(shown.includes("Skupin: 1"),"one synthetic group count");
  assert.ok(shown.includes("Studentů: 2"),"two synthetic members");
  assert.ok(shown.includes("NIC NEBYLO PŘEVEDENO"));
  assert.doesNotMatch(shown,/Synthetic Learner|synthetic@example.invalid|Synthetic Class/);
  assert.equal(await page.locator("#groups-legacy-dialog button[type=submit]").count(),0);
  const final=await page.evaluate(()=>({
    v1:localStorage.getItem("ghrab.ai-studio.groups.v1"),
    v2:Object.keys(localStorage).filter(x=>x.startsWith("ghrab.ai-studio.groups.account.v2.")).length
  }));
  assert.equal(final.v1,fixture.v1,"original shared v1 is unchanged");
  assert.equal(final.v2,0,"no account v2 write");
  await page.locator("#groups-legacy-file").setInputFiles({
    name:"invalid.json",mimeType:"application/json",buffer:Buffer.from('{"schema":"unknown"}')
  });
  await page.getByText(/Soubor není platná záloha skupin V1/).waitFor();
  await page.locator("#groups-legacy-dialog [data-dialog-close]").last().click();
  assert.equal(await page.locator("#groups-legacy-preview").innerText(),"");
  assert.equal(await page.locator("#groups-legacy-dialog").evaluate(x=>x.open),false);
  assert.deepEqual(errors,[]);
  console.log("PASS Groups R16: UI preview, invalid file, no student data shown, no V1/V2 writes, dialog scrub");
  await context.close();
} finally {await browser.close();}
