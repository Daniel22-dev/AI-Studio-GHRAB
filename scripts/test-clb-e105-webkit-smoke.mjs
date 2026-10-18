import test from 'node:test';
import assert from 'node:assert/strict';
import { webkit } from 'playwright';

const ORIGIN = 'https://conversation-lab-ghrab.pages.dev';
const VIEWPORTS = [
  { name: 'narrow-phone', width: 320, height: 700, isMobile: true, hasTouch: true },
  { name: 'iPhone-size', width: 390, height: 844, isMobile: true, hasTouch: true },
  { name: 'iPad-size', width: 820, height: 1180, isMobile: true, hasTouch: true },
  { name: 'desktop', width: 1280, height: 800, isMobile: false, hasTouch: false }
];
test('E105 isolated public player is usable in WebKit at four viewports without JS errors, overflow or third-party requests', { timeout: 120000 }, async () => {
  const browser = await webkit.launch({ headless: true });
  try {
    for (const device of VIEWPORTS) {
      const page = await browser.newPage({
        viewport: { width: device.width, height: device.height },
        isMobile: device.isMobile, hasTouch: device.hasTouch,
        locale: 'cs-CZ', reducedMotion: 'reduce'
      });
      const errors = [];
      const offsite = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('request', request => {
        const url = request.url();
        if (url.startsWith('http:') || url.startsWith('https:')) {
          if (new URL(url).origin !== ORIGIN) offsite.push(url);
        }
      });
      const response = await page.goto(ORIGIN + '/', { waitUntil: 'networkidle', timeout: 30000 });
      assert.equal(response?.status(), 200, device.name + ': public page unavailable');
      assert.match(await page.title(), /conversation lab/i, device.name + ': wrong public player');
      const metrics = await page.evaluate(() => {
        const width = document.documentElement.clientWidth;
        const offenders = Array.from(document.body.querySelectorAll('*'))
          .map(el => {
            const box = el.getBoundingClientRect();
            const css = getComputedStyle(el);
            return { name: el.tagName.toLowerCase(), id: el.id, className: String(el.className || '').slice(0, 100),
              left: Math.round(box.left), right: Math.round(box.right), width: Math.round(box.width),
              position: css.position, overflowX: css.overflowX };
          })
          .filter(x => x.width > 0 && x.right > width + 3)
          .sort((a, b) => b.right - a.right)
          .slice(0, 18);
        return {
          screenWidth: width,
          contentWidth: document.documentElement.scrollWidth,
          hasContent: (document.body?.innerText || '').length > 100,
          offenders
        };
      });
      if (metrics.contentWidth > metrics.screenWidth + 3)
        console.error('E105_OVERFLOW_DETAIL ' + JSON.stringify({ device: device.name, metrics }));
      assert.equal(metrics.hasContent, true, device.name + ': no visible lesson/player UI');
      assert.ok(metrics.contentWidth <= metrics.screenWidth + 3,
        device.name + ': horizontal overflow ' + JSON.stringify(metrics));
      assert.deepEqual(errors, [], device.name + ': JS console page errors');
      assert.deepEqual(offsite, [], device.name + ': external network traffic forbidden');
      await page.close();
    }
  } finally {
    await browser.close();
  }
});

test('E105 PREVIEW: E106 CSS source wrap removes WebKit overflow through stylesheet interception, not CSP bypass', { timeout: 60000 }, async () => {
  const browser = await webkit.launch({ headless: true });
  try {
    const opts = { viewport: { width: 320, height: 700 }, isMobile: true, hasTouch: true };
    const beforePage = await browser.newPage(opts);
    assert.equal((await beforePage.goto(ORIGIN + '/', { waitUntil: 'networkidle', timeout: 30000 }))?.status(), 200);
    const readWidth = page => page.evaluate(() => ({
      client: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth
    }));
    const before = await readWidth(beforePage);
    await beforePage.close();
    assert.ok(before.scroll > before.client + 3, 'current signed 0.9.1 has the documented 320px defect');
    const patchedPage = await browser.newPage(opts);
    let intercepted = 0;
    await patchedPage.route('**/assets/styles.css', async route => {
      const original = await route.fetch();
      assert.equal(original.status(), 200);
      const css = await original.text();
      const patch = '\\n@media (max-width:370px){.catalog-heading-row{flex-wrap:wrap}.approved-count{max-width:100%;white-space:normal}}\\n';
      intercepted++;
      await route.fulfill({ response: original, body: css + patch });
    });
    assert.equal((await patchedPage.goto(ORIGIN + '/', { waitUntil: 'networkidle', timeout: 30000 }))?.status(), 200);
    const after = await readWidth(patchedPage);
    console.log('E106_SOURCE_FIX_PREVIEW ' + JSON.stringify({ before, after, stylesheetIntercepts: intercepted }));
    assert.equal(intercepted, 1, 'only the approved same-origin stylesheet may be intercepted for this test');
    assert.ok(after.scroll <= after.client + 3, 'source CSS patch must remove the WebKit page overflow');
    await patchedPage.close();
  } finally {
    await browser.close();
  }
});
