#!/usr/bin/env node
/* R17: real Chromium confirms exact teacher-reviewed roster before locked write.
 * Synthetic data, mock signed identity, no school requests.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { chromium } from "playwright";
const origin="https://review.example",base="/AI-Studio-GHRAB/";
const html=readFileSync("src/groups/index.html","utf8")
  .replace('<script src="../app.js" type="module"></script>',"");
const routes=new Map([
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
      getAccessSnapshot(){return {ready:true,valid:true,mode:"signed-permit",
        permit:{sub:"synthetic-teacher",role:"teacher",exp:Math.floor(Date.now()/1000)+3600}}},
      isColleaguePreview(){return false}
    };
  });
  const page=await context.newPage();
  const errors=[];
  page.on("pageerror",e=>errors.push(e.message));
  await page.route(origin+"/**",route=>{
    const name=new URL(route.request().url()).pathname;
    if(name===base+"groups/")return route.fulfill({status:200,contentType:"text/html",body:html});
    if(routes.has(name))return route.fulfill({status:200,contentType:"text/javascript",body:routes.get(name)});
    if(name.endsWith(".css"))return route.fulfill({status:200,contentType:"text/css",body:""});
    return route.fulfill({status:404,body:"Unexpected route"});
  });
  await page.goto(origin+base+"groups/");
  await page.locator("#group-create").click();
  await page.locator("#group-name").fill("Synthetic English");
  await page.locator("#group-year").fill("2026/27");
  await page.locator("#group-form button[type=submit]").click();
  await page.locator("#groups-detail").getByText("Synthetic English").waitFor();
  const button=page.getByRole("button",{name:"Import / aktualizace z IS"});
  const startImport=async()=>{
    await button.click();
    await page.locator("#roster-input").fill("Alice Synthetic; alice@example.invalid");
    await page.locator("#roster-preview-button").click();
    assert.equal(await page.locator("#roster-confirm-button").isDisabled(),false);
  };
  const memberCount=()=>page.evaluate(()=>window.GHRAB_GROUPS.listGroups()[0]?.members.length);
  await startImport();
  await page.evaluate(()=>{
    document.querySelector("#roster-input").value="Unreviewed Student; unreviewed@example.invalid";
  });
  await page.locator("#roster-confirm-button").click();
  await page.getByText(/Seznam nebo nastavení se od náhledu změnily/).waitFor();
  assert.equal(await memberCount(),0,"unreviewed changed text cannot be committed");

  await page.locator("#roster-preview-button").click();
  assert.equal(await page.locator("#roster-confirm-button").isDisabled(),false);
  await page.evaluate(()=>{document.querySelector("#roster-replace").checked=false});
  await page.locator("#roster-confirm-button").click();
  await page.getByText(/Seznam nebo nastavení se od náhledu změnily/).waitFor();
  assert.equal(await memberCount(),0,"unreviewed replace mode cannot be committed");

  await page.locator("#roster-replace").check();
  await page.locator("#roster-preview-button").click();
  await page.evaluate(()=>{document.querySelector("#roster-dialog").dataset.groupId="grp_999999999999"});
  await page.locator("#roster-confirm-button").click();
  await page.getByText(/Seznam nebo nastavení se od náhledu změnily/).waitFor();
  assert.equal(await memberCount(),0,"changed target group cannot be committed");

  await page.locator("#roster-dialog [data-dialog-close]").last().click();
  await page.waitForFunction(()=>!document.querySelector("#roster-dialog").open);
  await startImport();
  await page.locator("#roster-confirm-button").click();
  await page.waitForFunction(()=>window.GHRAB_GROUPS.listGroups()[0]?.members.length===1);
  const result=await page.evaluate(()=>{
    const group=window.GHRAB_GROUPS.listGroups()[0];
    return {member:group.members[0],revision:group.revision};
  });
  assert.equal(result.member.name,"Alice Synthetic");
  assert.equal(result.member.schoolEmail,"alice@example.invalid");
  assert.equal(result.revision,2);
  assert.deepEqual(errors,[]);
  console.log("PASS Groups R17: changed text/mode/target blocked; approved roster committed once");
  await context.close();
}finally{await browser.close();}
