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
      const metrics = await page.evaluate(() => ({
        screenWidth: document.documentElement.clientWidth,
        contentWidth: document.documentElement.scrollWidth,
        hasContent: (document.body?.innerText || '').length > 100
      }));
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
