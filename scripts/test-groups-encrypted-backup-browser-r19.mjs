#!/usr/bin/env node
/* R19 encrypted teacher backup UI: fictional test data and ephemeral downloads. */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {chromium} from "playwright";
const origin="https://safe-backup.example",base="/AI-Studio-GHRAB/";
const html=readFileSync("src/groups/index.html","utf8").replace('<script src="../app.js" type="module"></script>',"");
const map=new Map(["groups.js","group-service.js","write-transaction.js","encrypted-backup.js"]
  .map(n=>[base+"groups/"+n,readFileSync("src/groups/"+n,"utf8")]));
const phrase="Synthetic-Only-Backup-Passphrase-Not-For-School";
const browser=await chromium.launch({headless:true});
try{
  const context=await browser.newContext({acceptDownloads:true});
  await context.addInitScript(()=>{
    window.GHRAB={accessReady:Promise.resolve(),
      getAccessSnapshot(){return{ready:true,valid:true,mode:"signed-permit",
        permit:{sub:"synthetic-teacher",role:"teacher",exp:Math.floor(Date.now()/1000)+3600}}},
      isColleaguePreview(){return false}};
    window.__backupAlerts=[];
    window.alert=message=>window.__backupAlerts.push(message);
    window.confirm=()=>true;
  });
  const page=await context.newPage(),errors=[];
  page.on("pageerror",e=>errors.push(e.message));
  await page.route(origin+"/**",route=>{
    const p=new URL(route.request().url()).pathname;
    if(p===base+"groups/")return route.fulfill({status:200,contentType:"text/html",body:html});
    if(map.has(p))return route.fulfill({status:200,contentType:"text/javascript",body:map.get(p)});
    if(p.endsWith(".css"))return route.fulfill({status:200,contentType:"text/css",body:""});
    return route.fulfill({status:404,body:"Not in test"});
  });
  await page.goto(origin+base+"groups/");
  await page.waitForFunction(()=>!!window.GHRAB_GROUPS);
  await page.evaluate(async()=>window.GHRAB_GROUPS.withWriteLock(tx=>
    tx.createGroupWithRoster({input:{displayName:"Synthetic Class",schoolYear:"2026/27"},
      rawText:"Alice Fictional; alice@example.invalid"})));
  await page.locator("#groups-backup-export").click();
  await page.locator("#groups-secret-input").fill(phrase);
  await page.locator("#groups-secret-repeat").fill(phrase);
  const downloadPromise=page.waitForEvent("download");
  await page.locator("#groups-backup-secret-form button[type=submit]").click();
  const download=await downloadPromise;
  assert.match(download.suggestedFilename(),/sifrovana-v2-.*\.json$/);
  const ciphertext=readFileSync(await download.path(),"utf8");
  assert.doesNotMatch(ciphertext,/alice@example.invalid|Alice Fictional|Synthetic Class|schoolEmail/);
  assert.equal(JSON.parse(ciphertext).iterations,600000);
  assert.equal(await page.locator("#groups-secret-input").inputValue(),"");
  await page.evaluate(async()=>window.GHRAB_GROUPS.withWriteLock(tx=>
    tx.createGroup({displayName:"More Work",schoolYear:"2026/27"})));
  const load=async()=>{
    await page.locator("#groups-backup-file").setInputFiles({
      name:"synthetic-secure.json",mimeType:"application/json",buffer:Buffer.from(ciphertext)
    });
    await page.locator("#groups-backup-secret-dialog").waitFor({state:"visible"});
  };
  await load();
  await page.locator("#groups-secret-input").fill("wrong-password-long-enough");
  await page.locator("#groups-backup-secret-form button[type=submit]").click();
  await page.waitForFunction(()=>window.__backupAlerts.length===1);
  assert.equal(await page.evaluate(()=>window.GHRAB_GROUPS.listGroups().length),2);
  await load();
  await page.locator("#groups-secret-input").fill(phrase);
  await page.locator("#groups-backup-secret-form button[type=submit]").click();
  await page.waitForFunction(()=>window.GHRAB_GROUPS.listGroups().length===1);
  const roster=await page.evaluate(()=>window.GHRAB_GROUPS.listGroups()[0]);
  assert.equal(roster.displayName,"Synthetic Class");
  assert.equal(roster.members[0].schoolEmail,"alice@example.invalid");
  assert.deepEqual(errors,[]);
  console.log("PASS Groups R19 Chromium: encrypted-only export, secret scrub, wrong password hold, restored exact roster");
  await context.close();
}finally{await browser.close()}
