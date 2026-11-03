#!/usr/bin/env node
/* R18 real Chromium, synthetic-only proof of compare-and-swap backup restore. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { chromium } from "playwright";
const origin="https://restore.example",base="/AI-Studio-GHRAB/";
const html=readFileSync("src/groups/index.html","utf8").replace(
  '<script src="../app.js" type="module"></script>',"");
const assets=new Map([
  [base+"groups/groups.js",readFileSync("src/groups/groups.js","utf8")],
  [base+"groups/group-service.js",readFileSync("src/groups/group-service.js","utf8")],
  [base+"groups/write-transaction.js",readFileSync("src/groups/write-transaction.js","utf8")]
]);
const browser=await chromium.launch({headless:true});
try {
  const context=await browser.newContext();
  await context.addInitScript(()=>{
    window.GHRAB={
      accessReady:Promise.resolve(),
      getAccessSnapshot(){return{ready:true,valid:true,mode:"signed-permit",
        permit:{sub:"synthetic-teacher",role:"teacher",exp:Math.floor(Date.now()/1000)+3600}}},
      isColleaguePreview(){return false}
    };
    window.__restoreAlerts=[];
    window.__restoreConfirmations=[];
    window.confirm=message=>{window.__restoreConfirmations.push(message);return true};
    window.alert=message=>{window.__restoreAlerts.push(message)};
    const original=File.prototype.text;
    File.prototype.text=function(){
      const file=this;
      return new Promise((resolve,reject)=>{
        window.__releaseFileRead=()=>{
          delete window.__releaseFileRead;
          original.call(file).then(resolve,reject);
        };
      });
    };
  });
  const page=await context.newPage(),errors=[];
  page.on("pageerror",e=>errors.push(e.message));
  await page.route(origin+"/**",route=>{
    const p=new URL(route.request().url()).pathname;
    if(p===base+"groups/")return route.fulfill({status:200,contentType:"text/html",body:html});
    if(assets.has(p))return route.fulfill({status:200,contentType:"text/javascript",body:assets.get(p)});
    if(p.endsWith(".css"))return route.fulfill({status:200,contentType:"text/css",body:""});
    return route.fulfill({status:404,body:"Not in synthetic fixture"});
  });
  await page.goto(origin+base+"groups/");
  await page.waitForFunction(()=>!!window.GHRAB_GROUPS);
  const fixture=await page.evaluate(async()=>{
    const service=window.GHRAB_GROUPS;
    const original=await service.withWriteLock(tx=>
      tx.createGroupWithRoster({input:{displayName:"Synthetic Base",schoolYear:"2026/27"},
        rawText:"Ada Synthetic; ada@example.invalid"}));
    return {
      backup:service.exportBackup(),
      groupId:original.group.groupId,
      memberId:original.group.members[0].memberId
    };
  });
  const restore=async()=>{
    await page.locator("#groups-backup-file").setInputFiles({
      name:"valid-v2-backup.json",mimeType:"application/json",
      buffer:Buffer.from(JSON.stringify(fixture.backup))
    });
    await page.waitForFunction(()=>typeof window.__releaseFileRead==="function");
  };
  // Another local edit after consent, before file read: must remain intact.
  await restore();
  const newer=await page.evaluate(async()=>{
    return window.GHRAB_GROUPS.withWriteLock(tx=>tx.createGroup({
      displayName:"Synthetic Newer",schoolYear:"2026/27"
    }));
  });
  await page.evaluate(()=>window.__releaseFileRead());
  await page.waitForFunction(()=>window.__restoreAlerts.length===1);
  assert.match(await page.evaluate(()=>window.__restoreAlerts[0]),/během obnovy změnila/);
  assert.equal(await page.evaluate(()=>window.GHRAB_GROUPS.listGroups().length),2,
    "older backup must not erase a newer group");
  assert.ok((await page.evaluate(()=>window.GHRAB_GROUPS.listGroups()))
    .some(g=>g.groupId===newer.groupId));
  assert.equal(await page.evaluate(()=>window.__restoreConfirmations.length),2,
    "plain JSON requires restore consent and a separate plaintext warning");

  // A new explicit confirmation on an unchanged source may restore the backup.
  await restore();
  await page.evaluate(()=>window.__releaseFileRead());
  await page.waitForFunction(()=>window.GHRAB_GROUPS.listGroups().length===1);
  const restored=await page.evaluate(()=>window.GHRAB_GROUPS.listGroups()[0]);
  assert.equal(restored.groupId,fixture.groupId);
  assert.equal(restored.members[0].memberId,fixture.memberId);
  assert.equal(await page.evaluate(()=>window.__restoreAlerts.length),1);

  // Corruption is a distinct, double-confirmed recovery preserving original bytes.
  const corrupt=await page.evaluate(()=>{
    const key=Object.keys(localStorage).find(k=>
      k.startsWith("ghrab.ai-studio.groups.account.v2."));
    localStorage.setItem(key,"{synthetic-corrupt");
    try {window.GHRAB_GROUPS.listGroups()} catch {}
    return{key,raw:localStorage.getItem(key)};
  });
  await restore();
  await page.evaluate(()=>window.__releaseFileRead());
  await page.waitForFunction(()=>window.GHRAB_GROUPS.listGroups().length===1);
  const recovered=await page.evaluate(key=>{
    return{
      archive:localStorage.getItem(key+".original-corrupt.v1"),
      restored:window.GHRAB_GROUPS.listGroups()[0].displayName
    };
  },corrupt.key);
  assert.equal(recovered.archive,corrupt.raw,
    "corrupt bytes must be preserved before recovery");
  assert.equal(recovered.restored,"Synthetic Base");
  assert.equal(await page.evaluate(()=>window.__restoreConfirmations.length),7,
    "each legacy plaintext restore requires a warning; corrupt recovery needs another confirmation");
  assert.deepEqual(errors,[]);
  console.log("PASS Groups R18: stale backup restore denied; retry works; corrupt recovery preserves raw bytes");
  await context.close();
}finally{await browser.close()}
