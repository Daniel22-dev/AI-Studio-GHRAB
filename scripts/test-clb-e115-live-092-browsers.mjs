import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium, webkit} from 'playwright';

const origin='https://conversation-lab-ghrab.pages.dev';
const viewports=[
  {name:'narrow-320',width:320,height:700},
  {name:'phone-390',width:390,height:844},
  {name:'tablet-820',width:820,height:1180},
  {name:'desktop-1280',width:1280,height:800}
];
const whenVisible=async(page,selector)=>page.waitForFunction(sel=>{
  const node=document.querySelector(sel);
  return !!node&&!node.hidden&&getComputedStyle(node).display!=='none';
},selector);

async function runEngine(name,engine){
  const browser=await engine.launch({headless:true});
  try{
    for(const viewport of viewports){
      const page=await browser.newPage({
        viewport:{width:viewport.width,height:viewport.height},
        isMobile:viewport.width<900,
        hasTouch:viewport.width<900,
        locale:'cs-CZ', reducedMotion:'reduce'
      });
      const pageErrors=[],thirdParty=[];
      page.on('pageerror',err=>pageErrors.push(err.message));
      page.on('request',r=>{
        if(/^https?:/i.test(r.url())&&new URL(r.url()).origin!==origin) thirdParty.push(r.url());
      });
      const response=await page.goto(origin+'/',{waitUntil:'networkidle',timeout:35000});
      assert.equal(response?.status(),200,name+' '+viewport.name+' root');
      assert.match(await page.title(),/conversation lab/i);
      await page.waitForFunction(()=>document.querySelectorAll('.catalog-card').length===1);
      const before=await page.evaluate(()=>({
        width:document.documentElement.clientWidth,
        scrollWidth:document.documentElement.scrollWidth,
        lessonCount:document.querySelectorAll('.catalog-card').length,
        approved:document.querySelector('#approved-count')?.textContent
      }));
      assert.equal(before.lessonCount,1);
      assert.ok(before.scrollWidth<=before.width+2,name+' '+viewport.name+' library overflow '+JSON.stringify(before));

      await page.locator('.catalog-card a').first().click();
      await page.waitForFunction(()=>!document.querySelector('#lesson-view').hidden&&document.querySelectorAll('#station-nav button').length===8);
      const during=await page.evaluate(()=>({
        width:document.documentElement.clientWidth,
        scrollWidth:document.documentElement.scrollWidth,
        stations:document.querySelectorAll('#station-nav button').length,
        title:document.querySelector('#lesson-title')?.textContent
      }));
      assert.equal(during.stations,8);
      assert.ok(during.scrollWidth<=during.width+2,name+' '+viewport.name+' lesson overflow '+JSON.stringify(during));
      await page.locator('#next-station').click();
      await page.waitForFunction(()=>document.querySelector('#pager-count')?.textContent.includes('2 z 8'));
      await page.locator('#share-open').click();
      await page.waitForFunction(()=>document.querySelector('#share-dialog')?.open===true);
      assert.ok((await page.locator('#share-url').inputValue()).startsWith(origin+'/#/'));
      assert.ok((await page.locator('#share-qr svg').count())>0);
      await page.locator('#share-close').click();
      assert.equal(await page.locator('#share-dialog').evaluate(e=>e.open),false);
      assert.deepEqual(pageErrors,[],name+' '+viewport.name+' script errors');
      assert.deepEqual(thirdParty,[],name+' '+viewport.name+' forbidden third-party request');
      console.log('E115_LIVE_BROWSER_PASS '+JSON.stringify({engine:name,viewport:viewport.width,libraryWidth:before.scrollWidth,lessonWidth:during.scrollWidth,stationCount:during.stations,qr:true,origin,thirdParty:0}));
      await page.close();
    }
  }finally{await browser.close();}
}

test('E115 WebKit Safari/iPad viewport LIVE 0.9.2: all four sizes, B1 8 stations + QR, no horizontal overflow', {timeout:180000},async()=>runEngine('WebKit',webkit));
test('E115 Chromium phone/desktop viewport LIVE 0.9.2: all four sizes, B1 8 stations + QR, no third-party traffic', {timeout:180000},async()=>runEngine('Chromium',chromium));
