#!/usr/bin/env node
/* R20: synthetic school account switch during costly PBKDF2 export.
 * No live identities, student data, encryption secrets or network calls.
 * The underlying application modules execute unchanged; only the mock encryption
 * module's return is paused to make an async revocation deterministic.
 */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {chromium} from "playwright";

const base="/AI-Studio-GHRAB/",origin="https://backup-switch.example";
const html=readFileSync("src/groups/index.html","utf8")
  .replace('<script src="../app.js" type="module"></script>',"");
const assets=new Map(["groups.js","group-service.js","write-transaction.js"].map(name=>
  [base+"groups/"+name,readFileSync("src/groups/"+name,"utf8")]));
const cryptoModule=readFileSync("src/groups/encrypted-backup.js","utf8");
const needle="return {schema:ENCRYPTED_SCHEMA,version:1,iterations:N,salt:b64(salt),iv:b64(iv),data:b64(new Uint8Array(enc))};";
assert.equal(cryptoModule.split(needle).length,2,"instrument exact encrypted export");
const pausedCrypto=cryptoModule.replace(needle,
  "await new Promise(resolve=>{globalThis.__r20ReleaseEncryption=resolve});\n"+needle);
assets.set(base+"groups/encrypted-backup.js",pausedCrypto);
const phrase="Fictional-Passphrase-For-Only-This-Browser-Test";
const browser=await chromium.launch({headless:true});
try {
  const context=await browser.newContext({acceptDownloads:true});
  await context.addInitScript(()=>{
    window.__r20Principal="teacher-a";
    window.__r20Alerts=[];
    window.GHRAB={
      accessReady:Promise.resolve(),
      getAccessSnapshot(){return{ready:true,valid:true,mode:"signed-permit",
        permit:{sub:window.__r20Principal,role:"teacher",
          exp:Math.floor(Date.now()/1000)+3600}};},
      isColleaguePreview(){return false}
    };
    window.alert=msg=>window.__r20Alerts.push(String(msg));
  });
  const page=await context.newPage();
  const errors=[],downloads=[];
  page.on("pageerror",e=>errors.push(e.message));
  page.on("download",d=>downloads.push(d.suggestedFilename()));
  await page.route(origin+"/**",route=>{
    const p=new URL(route.request().url()).pathname;
    if(p===base+"groups/")return route.fulfill({status:200,
      contentType:"text/html",body:html});
    if(assets.has(p))return route.fulfill({status:200,
      contentType:"text/javascript",body:assets.get(p)});
    if(p.endsWith(".css"))return route.fulfill({status:200,
      contentType:"text/css",body:""});
    return route.fulfill({status:404,body:"Unexpected synthetic route"});
  });
  await page.goto(origin+base+"groups/");
  await page.waitForFunction(()=>Boolean(window.GHRAB_GROUPS));
  await page.evaluate(()=>window.GHRAB_GROUPS.withWriteLock(tx=>
    tx.createGroupWithRoster({
      input:{displayName:"Fictional Class",schoolYear:"2026/27"},
      rawText:"Fictional Student; pupil@example.invalid"
    })));
  const originally=await page.evaluate(()=>window.GHRAB_GROUPS.exportBackup());
  assert.equal(originally.store.groups.length,1);
  await page.locator("#groups-backup-export").click();
  await page.locator("#groups-secret-input").fill(phrase);
  await page.locator("#groups-secret-repeat").fill(phrase);
  await page.locator("#groups-backup-secret-form button[type=submit]").click();
  await page.waitForFunction(()=>typeof window.__r20ReleaseEncryption==="function");
  // Switching principal while encryption awaits must not produce any backup file.
  await page.evaluate(()=>{
    window.__r20Principal="teacher-b";
    window.__r20ReleaseEncryption();
  });
  await page.waitForFunction(()=>window.__r20Alerts.length===1);
  assert.deepEqual(downloads,[],"must not download teacher A data in teacher B session");
  assert.equal(await page.locator("#groups-secret-input").inputValue(),"");
  assert.equal(await page.locator("#groups-secret-repeat").inputValue(),"");
  assert.deepEqual(errors,[]);
  console.log("PASS Groups R20: account switch during encryption denies download, clears password fields");
  await context.close();
}finally{await browser.close()}
