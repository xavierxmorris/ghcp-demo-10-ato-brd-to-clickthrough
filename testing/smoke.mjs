/* Visual smoke: walk the journey and screenshot each screen. Scratch tool. */
import { chromium } from 'playwright-core';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const target = process.argv[2] || 'prototype';
const URL = 'file:///' + path.join(ROOT, target, 'index.html').replace(/\\/g, '/');
const OUT = path.join(HERE, 'shots');
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage({ viewport: { width: 520, height: 1080 }, deviceScaleFactor: 1 });
const errs = [];
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
page.on('pageerror', e => errs.push('pageerror: ' + e.message));

await page.goto(URL, { waitUntil: 'load' });
await page.waitForTimeout(250);

async function overflow() {
  return page.evaluate(() => {
    const s = document.querySelector('.screen:not([hidden])');
    const b = s.querySelector('.frame-body');
    const f = document.querySelector('.frame');
    const scrollers = [...b.querySelectorAll('*')].filter(el => {
      const cs = getComputedStyle(el);
      return cs.overflowY === 'auto' || cs.overflowY === 'scroll';
    }).map(el => ({ cls: el.className.split(' ')[0], over: el.scrollHeight - el.clientHeight }));
    return { id: s.id, body: b.scrollHeight - b.clientHeight, frame: f.scrollHeight - f.clientHeight, scrollers };
  });
}

async function shot(name) {
  const o = await overflow();
  console.log(`${name.padEnd(14)} screen=${o.id.padEnd(11)} bodyOverflow=${String(o.body).padStart(4)} frameOverflow=${String(o.frame).padStart(3)} scrollers=${JSON.stringify(o.scrollers)}`);
  await page.screenshot({ path: path.join(OUT, `${target}-${name}.png`), fullPage: false });
}

await shot('1-intro');
await page.click('#btnStart');           await page.waitForTimeout(150);
await shot('2-entity-empty');
await page.click('[data-next]:visible'); await page.waitForTimeout(150);
await shot('3-entity-errors');
await page.keyboard.press('Escape');
await page.evaluate(() => window.LodgeAssist.fillDemo());
await page.waitForTimeout(120);
await shot('4-entity-filled');
await page.click('#scr-entity [data-next]'); await page.waitForTimeout(150);
await shot('5-gst');
await page.fill('#a1', '99999');
await page.click('#scr-gst [data-next]');   await page.waitForTimeout(150);
await shot('6-gst-br05');
await page.fill('#a1', '8000');
await page.click('#scr-gst [data-next]');   await page.waitForTimeout(150);
await shot('7-payg');
await page.click('#scr-payg [data-next]');  await page.waitForTimeout(200);
await shot('8-review');
await page.click('#btnLodge');              await page.waitForTimeout(150);
await shot('9-review-br08');
await page.check('#refsToggle');            await page.waitForTimeout(150);
await shot('10-refs-on');
await page.uncheck('#refsToggle');
await page.check('#declare');
await page.click('#btnLodge');              await page.waitForTimeout(200);
await shot('11-done');

/* v1.1 adds a conditional screen. Screenshotting "every screen" has to mean
   every screen, including the one the whole revision story depends on. */
if (target === 'prototype-v2') {
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(200);
  await page.click('#btnStart');
  await page.evaluate(() => window.LodgeAssist.fillDemo(false));
  await page.click('#scr-entity [data-next]');
  await page.click('#scr-gst [data-next]');
  await page.check('#varyYes');
  await page.click('#scr-payg [data-next]');  await page.waitForTimeout(150);
  await shot('12-vary-empty');
  await page.click('#scr-vary [data-next]');  await page.waitForTimeout(150);
  await shot('13-vary-errors');
  await page.fill('#t8', '7800');
  await page.fill('#t9', '2210');
  await page.selectOption('#t4', '23');       await page.waitForTimeout(150);
  await shot('14-vary-exactly-85');
  await page.fill('#t9', '2209');             await page.waitForTimeout(150);
  await shot('15-vary-gic-warning');
  await page.fill('#t9', '1800');
  await page.check('#gicAck');
  await page.click('#scr-vary [data-next]');  await page.waitForTimeout(200);
  await shot('16-review-varied');
}

console.log('\nconsole errors:', errs.length ? errs : 'none');
await browser.close();
