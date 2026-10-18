
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { webkit } from 'playwright';

const ORIGIN = 'https://conversation-lab-ghrab.pages.dev';
const RELEASE = 'cl-ai-b1-pilot-20261018-r2';
const NEW = Object.freeze({
  css: '5e57ee9f651f028dbb4065d939fef58ceeed15c0a8fb1bc8a782855a9cbd4e92',
  catalog: '2ab4cab8e95a8c124f1f8670b1cfe861f3e7557dfe9ece89c768bb2d7121fce6',
  studioManifest: 'c071bc4af56367458fb4e391019d3476790111f31495718e737bc339ee5cd134'
});
const OLD = Object.freeze({
  css: 'f6d2cdd4af7f3a37f0405d44c543ca0d33f9cce75cd45a8c31e4491b5e7b029c',
  catalog: '93813482fabf53fe3ff5c0657b4f6b9c362f912aa496dd44c5b2c38de5ee7b4f',
  studioManifest: 'e139a829fadc59e1563632aae9995334c87e0b23f991dcf5e6b41dc9c1b51464'
});
const sha = value => createHash('sha256').update(value).digest('hex');
const oldAnchor = '@media (max-width: 370px) {\n  .brand-words small { max-width: 145px; }';
const newAnchor = '@media (max-width: 370px) {\n' +
  '  /* E106: WebKit at 320px would let the approved-count badge extend to x=333px. */\n' +
  '  .catalog-heading-row { flex-wrap: wrap; }\n' +
  '  .approved-count { max-width: 100%; white-space: normal; }\n' +
  '  .brand-words small { max-width: 145px; }';
const fixtures = new Map();
async function alter(route, kind) {
  const response = await route.fetch();
  assert.equal(response.status(), 200, kind + ' public baseline missing');
  assert.equal(response.url().startsWith(ORIGIN), true);
  const bytes = Buffer.from(await response.body());
  assert.equal(sha(bytes), OLD[kind], kind + ' original deployed bytes drifted');
  let modified;
  if (kind === 'css') {
    const content = bytes.toString('utf8');
    assert.equal(content.split(oldAnchor).length, 2, 'unique CSS mobile anchor required');
    modified = Buffer.from(content.replace(oldAnchor, newAnchor), 'utf8');
  } else {
    const value = JSON.parse(bytes.toString('utf8'));
    if (kind === 'catalog') {
      assert.equal(value.releaseId, 'cl-ai-b1-pilot-20261018');
      value.releaseId = RELEASE;
    } else {
      assert.equal(value.version, '0.9.1');
      value.version = '0.9.2';
      value.integration.releaseId = RELEASE;
      value.integration.manifestSha256 = NEW.catalog;
      value.platform.cacheName = 'ghrab-conversation-lab-v0.9.2';
      assert.equal(value.integration.signedStatementSha256, null);
    }
    modified = Buffer.from(JSON.stringify(value, null, 2) + '\n', 'utf8');
  }
  assert.equal(sha(modified), NEW[kind], kind + ' v0.9.2 candidate SHA mismatch');
  fixtures.set(kind, (fixtures.get(kind) || 0) + 1);
  await route.fulfill({response, body:modified});
}

test('E107: exact future 0.9.2 B1 byte delta tested in WebKit at 320/390/820/1280; NO DEPLOY and NO security GO', {timeout:150000}, async () => {
  const browser=await webkit.launch({headless:true});
  try {
    for(const width of [320,390,820,1280]){
      const page=await browser.newPage({viewport:{width,height:900},isMobile:width<900,hasTouch:width<900,locale:'cs-CZ',reducedMotion:'reduce'});
      const errors=[];
      const thirdParty=[];
      page.on('pageerror',e=>errors.push(e.message));
      page.on('request',request=>{
        const u=request.url();
        if(/^https?:/i.test(u)&&new URL(u).origin!==ORIGIN) thirdParty.push(u);
      });
      await page.route('**/assets/styles.css',route=>alter(route,'css'));
      await page.route('**/data/catalog.json',route=>alter(route,'catalog'));
      await page.route('**/studio-manifest.json',route=>alter(route,'studioManifest'));
      const response=await page.goto(ORIGIN+'/',{waitUntil:'networkidle',timeout:30000});
      assert.equal(response.status(),200);
      await page.waitForFunction(()=>document.querySelectorAll('.catalog-card').length===1);
      const library=await page.evaluate(()=>({
        visibleWidth:document.documentElement.clientWidth,
        scrollWidth:document.documentElement.scrollWidth,
        tiles:document.querySelectorAll('.catalog-card').length,
        approved:document.querySelector('#approved-count')?.textContent
      }));
      assert.equal(library.tiles,1);
      assert.ok(library.scrollWidth<=library.visibleWidth+2,'Library overflow at '+width+': '+JSON.stringify(library));
      await page.locator('.catalog-card a').first().click();
      await page.waitForFunction(()=>!document.querySelector('#lesson-view').hidden && document.querySelectorAll('#station-nav button').length===8);
      const lesson=await page.evaluate(()=>({
        visibleWidth:document.documentElement.clientWidth,
        scrollWidth:document.documentElement.scrollWidth,
        stationCount:document.querySelectorAll('#station-nav button').length,
        title:document.querySelector('#lesson-title')?.textContent
      }));
      assert.equal(lesson.stationCount,8);
      assert.ok(lesson.scrollWidth<=lesson.visibleWidth+2,'Lesson overflow at '+width+': '+JSON.stringify(lesson));
      await page.locator('#next-station').click();
      await page.waitForFunction(()=>document.querySelector('#pager-count')?.textContent.includes('2 z 8'));
      await page.locator('#share-open').click();
      await page.waitForFunction(()=>document.querySelector('#share-dialog')?.open===true);
      assert.ok((await page.locator('#share-url').inputValue()).startsWith(ORIGIN+'/#/'));
      assert.ok((await page.locator('#share-qr svg').count())>0,'QR SVG missing at '+width);
      await page.locator('#share-close').click();
      assert.equal(await page.locator('#share-dialog').evaluate(e=>e.open),false);
      assert.deepEqual(errors,[],'JS errors at '+width);
      assert.deepEqual(thirdParty,[],'external requests at '+width);
      console.log('E107_WEBKIT_PREVIEW '+JSON.stringify({width,library,lesson,offline:true,noExternalRequests:true}));
      await page.close();
    }
  } finally {await browser.close();}
  assert.equal(fixtures.get('css'),4);
  assert.equal(fixtures.get('catalog'),4);
  // The manifest is not fetched by the public player; the separate SHA-mutational route
  // is explicitly exercised only by the provenance test below.
});

test('E107: new manifest is a separate unsigned artifact, not a production-release authorization', {timeout:45000}, async () => {
  const browser=await webkit.launch({headless:true});
  try {
    const page=await browser.newPage();
    await page.route('**/studio-manifest.json',route=>alter(route,'studioManifest'));
    const response=await page.goto(ORIGIN+'/studio-manifest.json',{waitUntil:'domcontentloaded',timeout:30000});
    assert.equal(response.status(),200);
    assert.equal(fixtures.get('studioManifest'),1);
    await page.close();
  } finally {await browser.close();}
});
