#!/usr/bin/env node
/* R21: one password modal per backup operation; browser-only synthetic roster. */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {chromium} from "playwright";
const origin="https://r21-dialog.example",base="/AI-Studio-GHRAB/";
const html=readFileSync("src/groups/index.html","utf8")
  .replace('<script src="../app.js" type="module"></script>',"");
const modules=new Map(["groups.js","group-service.js","write-transaction.js","encrypted-backup.js"]
  .map(n=>[base+"groups/"+n,readFileSync("src/groups/"+n,"utf8")]));
const browser=await chromium.launch({headless:true});
try {
  const context=await browser.newContext({acceptDownloads:true});
  await context.addInitScript(()=>{
    window.GHRAB={
      accessReady:Promise.resolve(),
      getAccessSnapshot(){return {ready:true,valid:true,mode:"signed-permit",
        permit:{sub:"synthetic-teacher",role:"teacher",exp:Math.floor(Date.now()/1000)+3600}}},
      isColleaguePreview(){return false}
    };
    window.alert=message=>{window.__r21Alerts.push(String(message));};
    window.__r21Alerts=[];
  });
  const page=await context.newPage();
  const errors=[],downloads=[];
  page.on("pageerror",e=>errors.push(String(e.message)));
  page.on("download",d=>downloads.push(d.suggestedFilename()));
  await page.route(origin+"/**",route=>{
    const path=new URL(route.request().url()).pathname;
    if(path===base+"groups/")return route.fulfill({status:200,contentType:"text/html",body:html});
    if(modules.has(path))return route.fulfill({status:200,contentType:"text/javascript",body:modules.get(path)});
    if(path.endsWith(".css"))return route.fulfill({status:200,contentType:"text/css",body:""});
    return route.fulfill({status:404,body:"No external requests in synthetic test"});
  });
  await page.goto(origin+base+"groups/");
  await page.waitForFunction(()=>!!window.GHRAB_GROUPS);
  await page.evaluate(()=>window.GHRAB_GROUPS.withWriteLock(tx=>
    tx.createGroupWithRoster({input:{displayName:"Synthetic Class",schoolYear:"2026/27"},
      rawText:"Synthetic Learner; student@example.invalid"})));
  // Calling the same action twice synchronously simulates repeated input
  // while a native modal is already open. It MUST NOT create two handlers.
  await page.evaluate(()=>{
    const button=document.querySelector("#groups-backup-export");
    button.click();button.click();
  });
  assert.equal(await page.locator("#groups-backup-secret-dialog").evaluate(d=>d.open),true);
  await page.locator("#groups-secret-input").fill("Fictional-only-strong-passphrase-for-browser-test");
  await page.locator("#groups-secret-repeat").fill("Fictional-only-strong-passphrase-for-browser-test");
  const downloadPromise=page.waitForEvent("download");
  await page.locator("#groups-backup-secret-form button[type=submit]").click();
  const download=await downloadPromise;
  assert.match(download.suggestedFilename(),/sifrovana-v2-.*\.json$/);
  const encrypted=readFileSync(await download.path(),"utf8");
  assert.doesNotMatch(encrypted,/student@example\.invalid|Synthetic Learner|Synthetic Class/);
  await page.waitForTimeout(150);
  assert.equal(downloads.length,1,"one consent must produce only one encrypted file");
  assert.deepEqual(errors,[],"a second click must not throw an unhandled dialog exception");
  assert.deepEqual(await page.evaluate(()=>window.__r21Alerts),[]);
  assert.equal(await page.locator("#groups-secret-input").inputValue(),"");
  assert.equal(await page.locator("#groups-secret-repeat").inputValue(),"");
  // Closing the next dialog must cancel cleanly and not keep stale submit listeners.
  await page.locator("#groups-backup-export").click();
  await page.locator("#groups-backup-secret-dialog [data-dialog-close]").first().click();
  await page.waitForFunction(()=>!document.querySelector("#groups-backup-secret-dialog").open);
  await page.waitForTimeout(150);
  assert.equal(downloads.length,1);
  assert.deepEqual(errors,[]);
  console.log("PASS Groups R21: reentrant backup modal denied; one encrypted download; cancel scrubs fields");
  await context.close();
} finally {await browser.close();}
