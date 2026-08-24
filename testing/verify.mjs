/* ============================================================================
   Lodge Assist — executable verification
   ----------------------------------------------------------------------------
   Runs the automated cases from test-pack/cases.js against a real browser,
   over file://, and writes test-pack/results.js so the acceptance pack shows
   live pass/fail against the same case IDs a tester walks by hand.

     node testing/verify.mjs            both versions
     node testing/verify.mjs v1.1       one version
     node testing/verify.mjs --headed   watch it run

   Exits 0 when every case passes, 1 otherwise.
   ========================================================================= */

import { chromium } from 'playwright-core';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

/* cases.js is a plain script shared with the browser. Indirect eval runs it in
   global scope, which is exactly where it expects to publish itself. */
(0, eval)(fs.readFileSync(path.join(HERE, 'test-pack', 'cases.js'), 'utf8'));
const PACK = globalThis.ATO_TEST_PACK;

const argv = process.argv.slice(2);
const HEADED = argv.includes('--headed');
const only = argv.find(a => /^v\d/.test(a));
/* Point the harness at a different build of the same document. This is the
   selector contract in test-data.html being cashed in: an independently
   generated prototype should pass the committed suite unmodified. */
const targetOverride = (argv.find(a => a.startsWith('--target=')) || '').split('=')[1];
const WRITE_RESULTS = !targetOverride;

const VALID_ABN = '26 262 626 210';
const BAD_ABN   = '26 262 626 211';

const results = {};          /* { 'v1.0': { 'TC-001': {status, detail} } }     */
const netLog  = { };

/* ------------------------------------------------------------------ utils - */

const urlFor = target => 'file:///' + path.join(ROOT, target, 'index.html').replace(/\\/g, '/');

async function activeScreen(page) {
  return page.evaluate(() => document.querySelector('.screen:not([hidden])').id);
}

async function errorText(page, fieldId) {
  return page.evaluate(id => {
    const f = document.getElementById(id);
    const e = f && f.querySelector('.field-error');
    return e ? e.textContent.trim() : null;
  }, fieldId);
}

async function allErrors(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll('.screen:not([hidden]) .field-error')].map(e => e.textContent.trim()));
}

async function stepLabel(page) {
  return page.evaluate(() => {
    const s = document.querySelector('.screen:not([hidden]) .step-count');
    return s ? s.textContent.trim() : null;
  });
}

async function overflowReport(page) {
  return page.evaluate(() => {
    const scr = document.querySelector('.screen:not([hidden])');
    const body = scr.querySelector('.frame-body');
    const frame = document.querySelector('.frame');
    const clipped = [...body.querySelectorAll('*')].filter(el => {
      const cs = getComputedStyle(el);
      if (cs.overflow === 'visible') return false;
      if (cs.overflowY === 'auto' || cs.overflowY === 'scroll') return false;
      if (el.scrollHeight - el.clientHeight <= 1) return false;
      /* Decoration deliberately bled past the edge is not clipped content.
         Judge on in-flow children only. */
      const inflow = [...el.children].filter(c => getComputedStyle(c).position !== 'absolute');
      if (!inflow.length) return false;
      const bottom = Math.max(...inflow.map(c => c.offsetTop + c.offsetHeight));
      return bottom - el.clientHeight > 1;
    }).map(el => `${el.className.split(' ')[0]} (${el.scrollHeight - el.clientHeight}px)`);
    return {
      screen: scr.id,
      frame: frame.scrollHeight - frame.clientHeight,
      body: body.scrollHeight - body.clientHeight,
      clipped
    };
  });
}

/* Section 6: 44 x 44 CSS px. For a checkbox or radio the real target is the
   label wrapping it, which is what a finger actually hits. */
async function smallTargets(page) {
  return page.evaluate(() => {
    const scr = document.querySelector('.screen:not([hidden])');
    const controls = [...scr.querySelectorAll('button, select, input, [tabindex="0"]')];
    const seen = new Set();
    const bad = [];
    for (const c of controls) {
      const target = (c.type === 'checkbox' || c.type === 'radio') ? (c.closest('label') || c) : c;
      if (seen.has(target)) continue;
      seen.add(target);
      const r = target.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;            /* not rendered */
      if (r.width < 44 || r.height < 44) {
        bad.push(`${target.tagName.toLowerCase()}${target.id ? '#' + target.id : '.' + (target.className || '').split(' ')[0]} ${Math.round(r.width)}x${Math.round(r.height)}`);
      }
    }
    return bad;
  });
}

/* ------------------------------------------------------------ journey ----- */

async function reset(page) {
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(80);
}

async function fillEntity(page, o = {}) {
  await page.fill('#abn', o.abn ?? VALID_ABN);
  await page.fill('#contact', o.contact ?? 'Sam Chen');
  await page.fill('#email', o.email ?? 'sam@potteryshed.com.au');
}

async function fillGst(page, o = {}) {
  await page.fill('#g1', String(o.g1 ?? 88000));
  await page.fill('#a1', String(o.a1 ?? 8000));
  await page.fill('#b1', String(o.b1 ?? 3200));
}

async function fillPayg(page, o = {}) {
  await page.fill('#w1', String(o.w1 ?? 42000));
  await page.fill('#w2', String(o.w2 ?? 7100));
  await page.fill('#t7', String(o.t7 ?? 2600));
}

/* Drive to a named screen through the real UI. Never skips a rule. */
async function driveTo(page, screen, o = {}) {
  await page.click('#btnStart');
  if (screen === 'scr-entity') return;
  await fillEntity(page, o);
  await page.click('#scr-entity [data-next]');
  if (screen === 'scr-gst') return;
  await fillGst(page, o);
  await page.click('#scr-gst [data-next]');
  if (screen === 'scr-payg') return;
  await fillPayg(page, o);
  if (o.vary) await page.check('#varyYes');
  await page.click('#scr-payg [data-next]');
  if (screen === 'scr-vary') return;
  if (o.vary) {
    await page.fill('#t8', String(o.t8 ?? 7800));
    await page.fill('#t9', String(o.t9 ?? 1800));
    await page.selectOption('#t4', o.t4 ?? '23');
    if (await page.isVisible('#gicWarning')) await page.check('#gicAck');
    await page.click('#scr-vary [data-next]');
  }
  if (screen === 'scr-review') return;
  await page.check('#declare');
  await page.click('#btnLodge');
}

/* ---------------------------------------------------------------- cases --- */
/* Each returns a detail string on success, or throws with the reason. */

const T = {

  'TC-001': async page => {
    const text = await page.textContent('#scr-intro');
    const bits = {
      service: /Lodge Assist/.test(text),
      period:  /1 Oct\s*[–-]\s*31 Dec 2026/.test(text),
      due:     /28 February 2027/.test(text),
      benefits: (await page.$$('#scr-intro .value-list li')).length
    };
    if (!bits.service) throw new Error('service not named');
    if (!bits.period) throw new Error('reporting period not stated');
    if (!bits.due) throw new Error('due date not stated');
    if (bits.benefits !== 3) throw new Error(`expected 3 benefits, found ${bits.benefits}`);
    return 'service, period, due date and 3 benefits all present';
  },

  'TC-002': async page => {
    await page.click('#btnStart');
    const s = await activeScreen(page);
    if (s !== 'scr-entity') throw new Error(`landed on ${s}`);
    return 'one action reaches scr-entity';
  },

  'TC-003': async (page, v) => {
    const seen = [];
    await driveTo(page, 'scr-entity');
    seen.push(await stepLabel(page));
    await fillEntity(page); await page.click('#scr-entity [data-next]');
    seen.push(await stepLabel(page));
    await fillGst(page); await page.click('#scr-gst [data-next]');
    seen.push(await stepLabel(page));
    const expect = ['Step 1 of 4', 'Step 2 of 4', 'Step 3 of 4'];
    if (seen.join('|') !== expect.join('|')) throw new Error(`saw ${seen.join(', ')}`);
    const pct = await page.evaluate(() =>
      document.querySelector('.screen:not([hidden]) .progress span').style.width);
    if (pct !== '75%') throw new Error(`progress bar at ${pct} on step 3 of 4`);
    return `${seen.join(', ')} — bar at ${pct}`;
  },

  'TC-004': async page => {
    await driveTo(page, 'scr-gst');
    await page.click('#scr-gst [data-back]');
    const s = await activeScreen(page);
    if (s !== 'scr-entity') throw new Error(`back landed on ${s}`);
    const kept = await page.inputValue('#contact');
    if (kept !== 'Sam Chen') throw new Error(`contact was "${kept}" after going back`);
    return 'returned to scr-entity with values intact';
  },

  'TC-005': async page => {
    await driveTo(page, 'scr-payg');
    await fillPayg(page);
    await page.check('#varyNo');
    const notVaried = await stepLabel(page);
    await page.check('#varyYes');
    const varied = await stepLabel(page);
    if (notVaried !== 'Step 3 of 4') throw new Error(`not varying showed "${notVaried}"`);
    if (varied !== 'Step 3 of 5') throw new Error(`varying showed "${varied}"`);
    return 'total moves 4 → 5 when varying';
  },

  'TC-010': async page => {
    await driveTo(page, 'scr-entity');
    for (const id of ['#abn', '#contact', '#email']) {
      if (!(await page.isVisible(id))) throw new Error(`${id} not present`);
    }
    return 'ABN, contact and email all captured';
  },

  'TC-011': async page => {
    await driveTo(page, 'scr-entity');
    await page.click('#scr-entity [data-next]');
    if (await activeScreen(page) !== 'scr-entity') throw new Error('progressed with empty fields');
    const e = await errorText(page, 'f-abn');
    if (!e || !/BR-01/.test(e)) throw new Error(`ABN message was "${e}"`);
    return e;
  },

  'TC-012': async page => {
    await driveTo(page, 'scr-entity');
    await fillEntity(page, { abn: '2626262621' });
    await page.click('#scr-entity [data-next]');
    const e = await errorText(page, 'f-abn');
    if (await activeScreen(page) !== 'scr-entity') throw new Error('10 digits accepted');
    if (!/BR-01/.test(e || '')) throw new Error(`message was "${e}"`);
    return e;
  },

  'TC-013': async page => {
    await driveTo(page, 'scr-entity');
    await fillEntity(page, { abn: '262626262100' });
    await page.click('#scr-entity [data-next]');
    const e = await errorText(page, 'f-abn');
    if (await activeScreen(page) !== 'scr-entity') throw new Error('12 digits accepted');
    if (!/BR-01/.test(e || '')) throw new Error(`message was "${e}"`);
    return e;
  },

  'TC-014': async page => {
    await driveTo(page, 'scr-entity');
    await fillEntity(page, { abn: BAD_ABN });
    await page.click('#scr-entity [data-next]');
    const e = await errorText(page, 'f-abn');
    if (await activeScreen(page) !== 'scr-entity') throw new Error(`${BAD_ABN} was accepted`);
    if (!/check-digit/i.test(e || '')) throw new Error(`message did not mention the check digit: "${e}"`);
    return e;
  },

  'TC-015': async page => {
    await driveTo(page, 'scr-entity');
    await fillEntity(page, { abn: VALID_ABN });
    await page.click('#scr-entity [data-next]');
    if (await activeScreen(page) !== 'scr-gst') throw new Error('spaced valid ABN refused');
    return `${VALID_ABN} accepted with spaces`;
  },

  'TC-016': async page => {
    await driveTo(page, 'scr-entity');
    await fillEntity(page, { contact: '' });
    await page.click('#scr-entity [data-next]');
    const e = await errorText(page, 'f-contact');
    if (!/BR-02/.test(e || '')) throw new Error(`message was "${e}"`);
    return e;
  },

  'TC-017': async page => {
    await driveTo(page, 'scr-entity');
    await fillEntity(page, { contact: 'S' });
    await page.click('#scr-entity [data-next]');
    const one = await errorText(page, 'f-contact');
    if (!/BR-02/.test(one || '')) throw new Error(`1 char gave "${one}"`);
    await page.fill('#contact', 'Sa');
    await page.click('#scr-entity [data-next]');
    if (await activeScreen(page) !== 'scr-gst') throw new Error('2 characters was refused');
    return '1 refused, 2 accepted';
  },

  'TC-018': async page => {
    await driveTo(page, 'scr-entity');
    await fillEntity(page, { email: 'sam.potteryshed.com.au' });
    await page.click('#scr-entity [data-next]');
    const e = await errorText(page, 'f-email');
    if (!/BR-03/.test(e || '')) throw new Error(`message was "${e}"`);
    return e;
  },

  'TC-019': async page => {
    await driveTo(page, 'scr-entity');
    await fillEntity(page, { email: 'sam@potteryshed' });
    await page.click('#scr-entity [data-next]');
    const e = await errorText(page, 'f-email');
    if (!/BR-03/.test(e || '')) throw new Error(`message was "${e}"`);
    return e;
  },

  'TC-020': async page => {
    await driveTo(page, 'scr-entity');
    await fillEntity(page);
    await page.click('#scr-entity [data-next]');
    if (await activeScreen(page) !== 'scr-gst') throw new Error('valid entity details refused');
    return 'valid details accepted';
  },

  'TC-025': async page => {
    await driveTo(page, 'scr-gst');
    const rows = await page.evaluate(() =>
      [...document.querySelectorAll('#scr-gst .label-field')].map(f => ({
        code: f.querySelector('.label-code')?.textContent.trim(),
        name: f.querySelector('.lbl')?.textContent.trim(),
        input: !!f.querySelector('input')
      })));
    const codes = rows.map(r => r.code).join(',');
    if (codes !== 'G1,1A,1B') throw new Error(`labels were ${codes}`);
    if (rows.some(r => !r.name || !r.input)) throw new Error('a label is missing its name or its input');
    return rows.map(r => `${r.code} ${r.name}`).join(' · ');
  },

  'TC-026': async page => {
    await driveTo(page, 'scr-gst');
    await page.click('#scr-gst [data-next]');
    const errs = await allErrors(page);
    if (await activeScreen(page) !== 'scr-gst') throw new Error('progressed with empty labels');
    if (errs.length !== 3) throw new Error(`expected 3 messages, saw ${errs.length}`);
    if (!errs.every(e => /BR-04/.test(e))) throw new Error(`a message did not cite BR-04: ${errs.join(' | ')}`);
    return `3 labels refused, all citing BR-04`;
  },

  'TC-027': async page => {
    await driveTo(page, 'scr-gst');
    await fillGst(page, { g1: '88000.50' });
    await page.click('#scr-gst [data-next]');
    const e = await errorText(page, 'f-g1');
    if (await activeScreen(page) !== 'scr-gst') throw new Error('cents accepted');
    if (!/cents/i.test(e || '') || !/BR-04/.test(e || '')) throw new Error(`message was "${e}"`);
    return e;
  },

  'TC-028': async page => {
    await driveTo(page, 'scr-gst');
    await fillGst(page, { b1: '-1' });
    await page.click('#scr-gst [data-next]');
    const e = await errorText(page, 'f-1b');
    if (!/BR-04/.test(e || '')) throw new Error(`message was "${e}"`);
    return e;
  },

  'TC-029': async page => {
    await driveTo(page, 'scr-gst');
    await fillGst(page, { g1: 'ten thousand' });
    await page.click('#scr-gst [data-next]');
    const e = await errorText(page, 'f-g1');
    if (!/BR-04/.test(e || '')) throw new Error(`message was "${e}"`);
    return e;
  },

  'TC-030': async page => {
    await driveTo(page, 'scr-gst');
    await fillGst(page, { g1: 0, a1: 0, b1: 0 });
    await page.click('#scr-gst [data-next]');
    if (await activeScreen(page) !== 'scr-payg') throw new Error('zero was refused');
    return 'all three labels at zero accepted';
  },

  'TC-031': async page => {
    await driveTo(page, 'scr-gst');
    await fillGst(page, { g1: 8000, a1: 8000, b1: 0 });
    await page.click('#scr-gst [data-next]');
    if (await activeScreen(page) !== 'scr-payg') throw new Error('1A equal to G1 was refused');
    return '1A = G1 accepted (equal is not exceeding)';
  },

  'TC-032': async page => {
    await driveTo(page, 'scr-gst');
    await fillGst(page, { g1: 8000, a1: 8001, b1: 0 });
    await page.click('#scr-gst [data-next]');
    const e = await errorText(page, 'f-1a');
    if (await activeScreen(page) !== 'scr-gst') throw new Error('1A greater than G1 was accepted');
    if (!/BR-05/.test(e || '')) throw new Error(`message was "${e}"`);
    return e;
  },

  'TC-035': async page => {
    await driveTo(page, 'scr-payg');
    const codes = await page.evaluate(() =>
      [...document.querySelectorAll('#scr-payg .label-field .label-code')].map(c => c.textContent.trim()).join(','));
    if (codes !== 'W1,W2,T7') throw new Error(`labels were ${codes}`);
    return codes;
  },

  'TC-036': async page => {
    await driveTo(page, 'scr-payg');
    await fillPayg(page, { w1: 42000, w2: 42000, t7: 0 });
    await page.click('#scr-payg [data-next]');
    const s = await activeScreen(page);
    if (s === 'scr-payg') throw new Error('W2 equal to W1 was refused');
    return 'W2 = W1 accepted';
  },

  'TC-037': async page => {
    await driveTo(page, 'scr-payg');
    await fillPayg(page, { w1: 42000, w2: 42001, t7: 0 });
    await page.click('#scr-payg [data-next]');
    const e = await errorText(page, 'f-w2');
    if (await activeScreen(page) !== 'scr-payg') throw new Error('W2 greater than W1 was accepted');
    if (!/BR-06/.test(e || '')) throw new Error(`message was "${e}"`);
    return e;
  },

  'TC-040': async page => {
    await driveTo(page, 'scr-review', { a1: 8000, b1: 3200, w2: 7100, t7: 2600 });
    const amount = (await page.textContent('#netAmount')).trim();
    const who = (await page.textContent('#netWho')).trim();
    if (amount !== '$14,500') throw new Error(`net was ${amount}, hand calculation says $14,500`);
    if (!/owe the ATO/.test(who) || !/7A/.test(who)) throw new Error(`described as "${who}"`);
    return `${amount} — ${who}`;
  },

  'TC-041': async page => {
    await driveTo(page, 'scr-review', { g1: 5000, a1: 1000, b1: 5000, w1: 0, w2: 0, t7: 0 });
    const amount = (await page.textContent('#netAmount')).trim();
    const who = (await page.textContent('#netWho')).trim();
    if (amount !== '$4,000') throw new Error(`net was ${amount}, hand calculation says $4,000`);
    if (!/owes you/.test(who) || !/7B/.test(who)) throw new Error(`described as "${who}"`);
    return `${amount} — ${who}`;
  },

  'TC-042': async page => {
    await driveTo(page, 'scr-review', { g1: 5000, a1: 1000, b1: 1000, w1: 0, w2: 0, t7: 0 });
    const amount = (await page.textContent('#netAmount')).trim();
    const who = (await page.textContent('#netWho')).trim();
    if (amount !== '$0') throw new Error(`net was ${amount}`);
    if (!/[Nn]il/.test(who)) throw new Error(`described as "${who}"`);
    if (/7A|7B/.test(who)) throw new Error(`a nil statement should report neither label: "${who}"`);
    return `${amount} — ${who}`;
  },

  'TC-043': async page => {
    await driveTo(page, 'scr-review');
    const working = (await page.textContent('#netWorking')).replace(/\s+/g, ' ').trim();
    for (const label of ['1A', '1B', 'W2']) {
      if (!working.includes(label)) throw new Error(`arithmetic did not name ${label}: "${working}"`);
    }
    if (!/T7|T9/.test(working)) throw new Error(`arithmetic named no instalment label: "${working}"`);
    return working;
  },

  'TC-050': async page => {
    const mine = { contact: 'Robyn Aleksic', email: 'robyn@aleksic.example', g1: 71234, a1: 6475, b1: 2811, w1: 30500, w2: 5123, t7: 1975 };
    await driveTo(page, 'scr-review', mine);
    const shown = await page.evaluate(() => ({
      contact: document.getElementById('sContact').textContent.trim(),
      email: document.getElementById('sEmail').textContent.trim(),
      g1: document.getElementById('sG1').textContent.trim(),
      a1: document.getElementById('sA1').textContent.trim(),
      b1: document.getElementById('sB1').textContent.trim(),
      w1: document.getElementById('sW1').textContent.trim(),
      w2: document.getElementById('sW2').textContent.trim(),
      t7: document.getElementById('sT7').textContent.trim()
    }));
    const want = { contact: 'Robyn Aleksic', email: 'robyn@aleksic.example', g1: '$71,234', a1: '$6,475', b1: '$2,811', w1: '$30,500', w2: '$5,123', t7: '$1,975' };
    for (const k of Object.keys(want)) {
      if (shown[k] !== want[k]) throw new Error(`${k} replayed as "${shown[k]}", entered "${want[k]}"`);
    }
    return 'all eight entered values replayed exactly';
  },

  'TC-051': async page => {
    await driveTo(page, 'scr-review');
    await page.click('#btnLodge');
    if (await activeScreen(page) !== 'scr-review') throw new Error('lodged without the declaration');
    const e = await errorText(page, 'f-declare');
    if (!/BR-08/.test(e || '')) throw new Error(`message was "${e}"`);
    return e;
  },

  'TC-052': async page => {
    await driveTo(page, 'scr-done');
    if (await activeScreen(page) !== 'scr-done') throw new Error('did not reach the confirmation screen');
    const receipt = (await page.textContent('#receiptNo')).trim();
    const when = (await page.textContent('#lodgedAt')).trim();
    if (!/^LA-2026Q2-[A-Z0-9]{6}$/.test(receipt)) throw new Error(`receipt was "${receipt}"`);
    if (!/^Lodged .+ at .+/.test(when)) throw new Error(`timestamp was "${when}"`);
    return `${receipt} · ${when}`;
  },

  'TC-053': async (page, v) => {
    await driveTo(page, 'scr-done');
    const offsite = netLog[v].filter(u => !u.startsWith('file://'));
    if (offsite.length) throw new Error(`requests left the page: ${offsite.join(', ')}`);
    return `${netLog[v].length} resource requests, all file://`;
  },

  'TC-033': async page => {
    await driveTo(page, 'scr-gst');
    await fillGst(page, { g1: '999999999999', a1: 8000, b1: 3200 });
    await page.click('#scr-gst [data-next]');
    if (await activeScreen(page) !== 'scr-payg') {
      throw new Error(`twelve digits was refused: ${await errorText(page, 'f-g1')}`);
    }
    await page.click('#scr-payg [data-back]');
    await page.fill('#g1', '1000000000000');
    await page.click('#scr-gst [data-next]');
    const e = await errorText(page, 'f-g1');
    if (await activeScreen(page) !== 'scr-gst') throw new Error('thirteen digits was accepted');
    if (!/BR-04/.test(e || '')) throw new Error(`message was "${e}"`);
    return `twelve accepted, thirteen refused — ${e}`;
  },

  'TC-054': async (page, v) => {
    /* Refuse something first, so there is state worth failing to clear. */
    await page.click('#btnStart');
    await page.click('#scr-entity [data-next]');
    await fillEntity(page);
    await page.click('#scr-entity [data-next]');
    await fillGst(page);
    await page.click('#scr-gst [data-next]');
    await fillPayg(page);
    if (v === 'v1.1') {
      await page.check('#varyYes');
      await page.click('#scr-payg [data-next]');
      await page.fill('#t8', '7800');
      await page.fill('#t9', '1800');
      await page.selectOption('#t4', '23');
      if (await page.isVisible('#gicWarning')) await page.check('#gicAck');
      await page.click('#scr-vary [data-next]');
    } else {
      await page.click('#scr-payg [data-next]');
    }
    await page.check('#refsToggle');
    await page.check('#declare');
    await page.click('#btnLodge');
    if (await activeScreen(page) !== 'scr-done') throw new Error('could not reach the confirmation screen');
    await page.click('#btnRestart');
    await page.waitForTimeout(120);

    const state = await page.evaluate(() => ({
      screen: document.querySelector('.screen:not([hidden])').id,
      values: [...document.querySelectorAll('input')]
        .filter(i => i.type !== 'checkbox' && i.type !== 'radio')
        .filter(i => i.value !== '').map(i => i.id),
      checked: [...document.querySelectorAll('input[type=checkbox]')].filter(i => i.checked).map(i => i.id),
      selects: [...document.querySelectorAll('select')].filter(s => s.value !== '').map(s => s.id),
      errors: document.querySelectorAll('.field-error').length,
      invalid: [...document.querySelectorAll('[aria-invalid="true"]')].map(i => i.id),
      dangling: [...document.querySelectorAll('[aria-describedby]')]
        .filter(i => (i.getAttribute('aria-describedby') || '').split(/\s+/)
          .some(id => id && !document.getElementById(id))).map(i => i.id),
      refsOn: document.getElementById('stage').classList.contains('show-refs')
    }));

    if (state.screen !== 'scr-intro') throw new Error(`restart landed on ${state.screen}`);
    if (state.values.length) throw new Error(`values survived: ${state.values.join(', ')}`);
    if (state.checked.length) throw new Error(`checkboxes survived: ${state.checked.join(', ')}`);
    if (state.selects.length) throw new Error(`selects survived: ${state.selects.join(', ')}`);
    if (state.errors) throw new Error(`${state.errors} error message(s) survived`);
    if (state.invalid.length) throw new Error(`still marked invalid: ${state.invalid.join(', ')}`);
    if (state.dangling.length) throw new Error(`aria-describedby points at deleted nodes: ${state.dangling.join(', ')}`);
    if (state.refsOn) throw new Error('the reference overlay was still on');
    return 'fields, errors, ARIA state and the overlay all cleared';
  },

  'TC-060': async page => {
    const missing = await page.evaluate(() =>
      [...document.querySelectorAll('.screen')]
        .filter(s => !(s.getAttribute('data-req') || '').trim())
        .map(s => s.id));
    if (missing.length) throw new Error(`screens with no data-req: ${missing.join(', ')}`);
    const n = await page.evaluate(() => document.querySelectorAll('.screen').length);
    return `${n}/${n} screens declare a reference`;
  },

  'TC-061': async (page, v) => {
    const flow = v === 'v1.1'
      ? ['scr-entity', 'scr-gst', 'scr-payg', 'scr-vary', 'scr-review', 'scr-done']
      : ['scr-entity', 'scr-gst', 'scr-payg', 'scr-review', 'scr-done'];
    const check = async () => {
      const r = await page.evaluate(() => {
        const s = document.querySelector('.screen:not([hidden])');
        return {
          id: s.id,
          declared: (s.getAttribute('data-req') || '').split(',').map(x => x.trim()).filter(Boolean),
          chips: [...document.querySelectorAll('#traceRefs b')].map(b => b.textContent.trim()),
          label: document.getElementById('traceScreen').textContent.trim(),
          n: s.getAttribute('data-screen')
        };
      });
      if (r.declared.join('|') !== r.chips.join('|')) {
        throw new Error(`${r.id}: strip showed ${r.chips.join(', ')} but the screen declares ${r.declared.join(', ')}`);
      }
      if (!r.label.startsWith(`Screen ${r.n} of `)) throw new Error(`${r.id}: strip said "${r.label}"`);
      return r.id;
    };
    const seen = [await check()];
    await driveTo(page, 'scr-entity');            seen.push(await check());
    await fillEntity(page); await page.click('#scr-entity [data-next]'); seen.push(await check());
    await fillGst(page);    await page.click('#scr-gst [data-next]');    seen.push(await check());
    await fillPayg(page);
    if (v === 'v1.1') await page.check('#varyYes');
    await page.click('#scr-payg [data-next]');    seen.push(await check());
    if (v === 'v1.1') {
      await page.fill('#t8', '7800'); await page.fill('#t9', '1800');
      await page.selectOption('#t4', '23');
      if (await page.isVisible('#gicWarning')) await page.check('#gicAck');
      await page.click('#scr-vary [data-next]');  seen.push(await check());
    }
    await page.check('#declare'); await page.click('#btnLodge'); seen.push(await check());
    if (seen.length !== flow.length + 1) throw new Error(`walked ${seen.length} screens: ${seen.join(', ')}`);
    return `${seen.length} screens, strip matched every one`;
  },

  'TC-062': async page => {
    await driveTo(page, 'scr-gst');
    await page.check('#refsToggle');
    await page.waitForTimeout(120);
    const tagged = await page.evaluate(() => {
      const scr = document.querySelector('.screen:not([hidden])');
      const marked = [...scr.querySelectorAll('[data-ref]')];
      const clipped = marked.filter(el => {
        const r = el.getBoundingClientRect();
        const f = document.querySelector('.frame').getBoundingClientRect();
        return r.top < f.top - 1 || r.right > f.right + 1;
      }).length;
      return { count: marked.length, clipped };
    });
    if (tagged.count === 0) throw new Error('no elements carried a reference label');
    if (tagged.clipped) throw new Error(`${tagged.clipped} reference labels fall outside the frame`);
    const over = await overflowReport(page);
    if (over.frame > 0) throw new Error(`frame overflowed by ${over.frame}px with references on`);
    return `${tagged.count} elements labelled, none clipped`;
  },

  'TC-070': async (page, v) => {
    const seen = [];
    const check = async () => {
      const bad = await smallTargets(page);
      if (bad.length) throw new Error(`${await activeScreen(page)}: ${bad.join(', ')}`);
      seen.push(await activeScreen(page));
    };
    await check();
    await driveTo(page, 'scr-entity');   await check();
    await fillEntity(page); await page.click('#scr-entity [data-next]'); await check();
    await fillGst(page);    await page.click('#scr-gst [data-next]');    await check();
    await fillPayg(page);
    if (v === 'v1.1') { await page.check('#varyYes'); await page.click('#scr-payg [data-next]'); await check();
      await page.fill('#t8', '7800'); await page.fill('#t9', '1800'); await page.selectOption('#t4', '23');
      if (await page.isVisible('#gicWarning')) await page.check('#gicAck');
      await page.click('#scr-vary [data-next]');
    } else {
      await page.click('#scr-payg [data-next]');
    }
    await check();
    await page.check('#declare'); await page.click('#btnLodge'); await check();
    return `${seen.length} screens, every control at least 44 × 44`;
  },

  'TC-071': async page => {
    await driveTo(page, 'scr-entity');
    await page.click('#scr-entity [data-next]');
    const nonColour = await page.evaluate(() => {
      const e = document.querySelector('.field-error');
      if (!e) return null;
      const marker = getComputedStyle(e, '::before').content;
      return { text: e.textContent.trim().length, marker };
    });
    if (!nonColour) throw new Error('no error was rendered');
    if (!nonColour.text) throw new Error('the error carried no text');
    if (!nonColour.marker || nonColour.marker === 'none') throw new Error('the error had no non-colour indicator');
    return `text plus a ${nonColour.marker} indicator`;
  },

  'TC-072': async page => {
    await driveTo(page, 'scr-entity');
    await page.click('#scr-entity [data-next]');
    const a = await page.evaluate(() => {
      const i = document.getElementById('abn');
      const describedBy = (i.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
      return {
        invalid: i.getAttribute('aria-invalid'),
        points: describedBy.some(id => document.getElementById(id)?.classList.contains('field-error'))
      };
    });
    if (a.invalid !== 'true') throw new Error(`aria-invalid was "${a.invalid}"`);
    if (!a.points) throw new Error('aria-describedby did not point at the error message');
    return 'aria-invalid=true and aria-describedby points at the message';
  },

  'TC-073': async (page, v) => {
    const problems = [];
    const check = async where => {
      const o = await overflowReport(page);
      if (o.frame > 0) problems.push(`${where}: frame +${o.frame}px`);
      if (o.body > 0) problems.push(`${where}: body +${o.body}px`);
      if (o.clipped.length) problems.push(`${where}: clipped ${o.clipped.join(', ')}`);
    };
    await check('intro');
    await driveTo(page, 'scr-entity');
    await page.click('#scr-entity [data-next]');  await check('entity, all errors');
    await fillEntity(page); await page.click('#scr-entity [data-next]');
    await page.click('#scr-gst [data-next]');     await check('gst, all errors');
    await fillGst(page);    await page.click('#scr-gst [data-next]');
    await page.click('#scr-payg [data-next]');    await check('payg, all errors');
    await fillPayg(page);
    if (v === 'v1.1') {
      await page.check('#varyYes'); await page.click('#scr-payg [data-next]');
      await page.click('#scr-vary [data-next]');  await check('vary, all errors');
      await page.fill('#t8', '7800'); await page.fill('#t9', '1800'); await page.selectOption('#t4', '23');
      await page.click('#scr-vary [data-next]');  await check('vary, interest warning');
      await page.check('#gicAck'); await page.click('#scr-vary [data-next]');
    } else {
      await page.click('#scr-payg [data-next]');
    }
    await page.click('#btnLodge');                await check('review, declaration error');
    await page.check('#declare'); await page.click('#btnLodge'); await check('confirmation');
    if (problems.length) throw new Error(problems.join(' | '));
    return 'no clipping on any screen or error state at 390 × 844';
  },

  'TC-074': async page => {
    await driveTo(page, 'scr-vary', { vary: true, t7: 2600 });
    /* Clear anything announced on arrival, then make the warning appear. */
    await page.evaluate(() => {
      const l = document.querySelector('[role="status"]');
      if (l) l.textContent = '';
    });
    await page.fill('#t9', '1800');
    await page.waitForTimeout(220);
    const said = await page.evaluate(() => {
      const l = document.querySelector('[role="status"][aria-live="polite"]');
      return l ? l.textContent.trim() : null;
    });
    if (said === null) throw new Error('there is no live region for status messages at all');
    if (!said) throw new Error('the warning appeared but nothing was announced (WCAG 2.2 SC 4.1.3)');
    if (!/interest charge/i.test(said)) throw new Error(`announced "${said}" — it does not name the warning`);
    return said;
  },

  'TC-080': async page => {
    await driveTo(page, 'scr-payg');
    if (!(await page.isVisible('#f-varyChoice'))) throw new Error('no variation question on the PAYG screen');
    const text = await page.textContent('#f-varyChoice');
    if (!/vary/i.test(text)) throw new Error('the question does not offer to vary');
    return (await page.textContent('#f-varyChoice legend')).trim();
  },

  'TC-081': async page => {
    await driveTo(page, 'scr-payg');
    await fillPayg(page);
    await page.check('#varyYes');
    await page.click('#scr-payg [data-next]');
    if (await activeScreen(page) !== 'scr-vary') throw new Error('the variation screen did not open');
    for (const id of ['#t8', '#t9', '#t4']) {
      if (!(await page.isVisible(id))) throw new Error(`${id} not offered`);
    }
    return 'T8, T9 and T4 all offered';
  },

  'TC-082': async page => {
    await driveTo(page, 'scr-payg');
    await fillPayg(page);
    await page.check('#varyNo');
    await page.click('#scr-payg [data-next]');
    if (await activeScreen(page) !== 'scr-review') throw new Error(`landed on ${await activeScreen(page)}`);
    return 'variation screen skipped';
  },

  'TC-083': async page => {
    await driveTo(page, 'scr-vary', { vary: true });
    await page.click('#scr-vary [data-next]');
    if (await activeScreen(page) !== 'scr-vary') throw new Error('progressed with empty variation fields');
    const errs = await allErrors(page);
    if (errs.length !== 3) throw new Error(`expected 3 messages, saw ${errs.length}: ${errs.join(' | ')}`);
    if (!errs.every(e => /BR-10/.test(e))) throw new Error(`a message did not cite BR-10: ${errs.join(' | ')}`);
    return '3 fields refused, all citing BR-10';
  },

  'TC-084': async page => {
    await driveTo(page, 'scr-vary', { vary: true });
    await page.fill('#t8', '7800');
    await page.fill('#t9', '2600');
    await page.click('#scr-vary [data-next]');
    const e = await errorText(page, 'f-t4');
    if (await activeScreen(page) !== 'scr-vary') throw new Error('progressed with no reason chosen');
    if (!/BR-10/.test(e || '')) throw new Error(`message was "${e}"`);
    return e;
  },

  'TC-085': async page => {
    await driveTo(page, 'scr-vary', { vary: true, t7: 2600 });
    await page.fill('#t9', '2210');
    await page.waitForTimeout(80);
    if (await page.isVisible('#gicWarning')) {
      throw new Error('the warning fired at exactly 85% — BR-11 says it should not');
    }
    await page.fill('#t8', '7800');
    await page.selectOption('#t4', '23');
    await page.click('#scr-vary [data-next]');
    if (await activeScreen(page) !== 'scr-review') throw new Error('exactly 85% was blocked');
    return '2,210 of 2,600 is exactly 85% — no warning, progression allowed';
  },

  'TC-086': async page => {
    await driveTo(page, 'scr-vary', { vary: true, t7: 2600 });
    await page.fill('#t9', '2209');
    await page.waitForTimeout(80);
    if (!(await page.isVisible('#gicWarning'))) throw new Error('no warning one dollar under 85%');
    const pct = (await page.textContent('#gicPct')).trim();
    const n = parseFloat(pct);
    if (!/%$/.test(pct) || Number.isNaN(n)) throw new Error(`percentage shown as "${pct}"`);
    if (n >= 85) throw new Error(`the warning fired but reported "${pct}" — it must read below 85%`);
    return `warning shown, stated as ${pct} of the instalment`;
  },

  'TC-087': async page => {
    await driveTo(page, 'scr-vary', { vary: true, t7: 2600 });
    await page.fill('#t8', '7800');
    await page.fill('#t9', '1800');
    await page.selectOption('#t4', '23');
    await page.click('#scr-vary [data-next]');
    if (await activeScreen(page) !== 'scr-vary') throw new Error('progressed without acknowledging');
    const e = await errorText(page, 'f-gicAck');
    if (!/BR-11/.test(e || '')) throw new Error(`message was "${e}"`);
    await page.check('#gicAck');
    await page.click('#scr-vary [data-next]');
    if (await activeScreen(page) !== 'scr-review') throw new Error('still blocked after acknowledging');
    return `${e} — then allowed once acknowledged`;
  },

  'TC-088': async page => {
    await driveTo(page, 'scr-review', { vary: true, a1: 8000, b1: 3200, w2: 7100, t7: 2600, t9: 1800 });
    const amount = (await page.textContent('#netAmount')).trim();
    const working = (await page.textContent('#netWorking')).replace(/\s+/g, ' ').trim();
    if (amount !== '$13,700') throw new Error(`net was ${amount}, hand calculation says $13,700`);
    if (!/T9/.test(working)) throw new Error(`arithmetic still names T7: "${working}"`);
    if (/T7/.test(working)) throw new Error(`arithmetic names T7 as well as T9: "${working}"`);
    return `${amount} — ${working}`;
  },

  'TC-089': async page => {
    await driveTo(page, 'scr-review', { vary: true, t7: 2600, t8: 7800, t9: 1800, t4: '23' });
    const r = await page.evaluate(() => ({
      t8: document.getElementById('rowT8').hidden ? null : document.getElementById('sT8').textContent.trim(),
      t9: document.getElementById('rowT9').hidden ? null : document.getElementById('sT9').textContent.trim(),
      t4: document.getElementById('rowT4').hidden ? null : document.getElementById('sT4').textContent.trim(),
      notice: document.getElementById('variedNotice').hidden ? null :
        document.getElementById('variedNotice').textContent.replace(/\s+/g, ' ').trim()
    }));
    if (!r.t8 || !r.t9 || !r.t4) throw new Error(`variation rows missing: ${JSON.stringify(r)}`);
    if (r.t9 !== '$1,800') throw new Error(`T9 shown as ${r.t9}`);
    if (!/23/.test(r.t4)) throw new Error(`reason shown as "${r.t4}"`);
    if (!r.notice || !/\$2,600/.test(r.notice) || !/\$1,800/.test(r.notice)) {
      throw new Error(`notice did not state from and to: "${r.notice}"`);
    }
    return `${r.t4} · varied ${'$2,600'} → ${r.t9}`;
  },

  'TC-090': async page => {
    await driveTo(page, 'scr-vary', { vary: true, t7: 2600 });
    await page.fill('#t8', '0');
    await page.fill('#t9', '0');
    await page.selectOption('#t4', '22');
    await page.waitForTimeout(80);
    if (!(await page.isVisible('#gicWarning'))) throw new Error('varying to nil did not warn');
    await page.check('#gicAck');
    await page.click('#scr-vary [data-next]');
    if (await activeScreen(page) !== 'scr-review') {
      throw new Error(`zero was refused: ${(await allErrors(page)).join(' | ')}`);
    }
    const t9 = (await page.textContent('#sT9')).trim();
    if (t9 !== '$0') throw new Error(`T9 carried through as ${t9}`);
    return 'zero accepted at T8 and T9 once the warning was acknowledged';
  },

  'TC-091': async page => {
    await driveTo(page, 'scr-vary', { vary: true });
    await page.fill('#t8', '7800');
    await page.fill('#t9', '1800.50');
    await page.selectOption('#t4', '23');
    await page.click('#scr-vary [data-next]');
    const e = await errorText(page, 'f-t9');
    if (await activeScreen(page) !== 'scr-vary') throw new Error('cents accepted at T9');
    if (!/cents/i.test(e || '') || !/BR-10/.test(e || '')) throw new Error(`message was "${e}"`);
    return e;
  },

  'TC-092': async page => {
    await driveTo(page, 'scr-vary', { vary: true });
    await page.fill('#t8', '-1');
    await page.fill('#t9', '1800');
    await page.selectOption('#t4', '23');
    await page.click('#scr-vary [data-next]');
    const e = await errorText(page, 'f-t8');
    if (await activeScreen(page) !== 'scr-vary') throw new Error('a negative T8 was accepted');
    if (!/BR-10/.test(e || '')) throw new Error(`message was "${e}"`);
    return e;
  },

  'TC-093': async page => {
    await driveTo(page, 'scr-vary', { vary: true, t7: 0 });
    const base = (await page.textContent('#varyBase')).trim();
    if (base !== '$0') throw new Error(`the screen shows the instalment as ${base}`);
    await page.fill('#t8', '0');
    await page.fill('#t9', '0');
    await page.selectOption('#t4', '27');
    await page.waitForTimeout(80);
    if (await page.isVisible('#gicWarning')) {
      const pct = (await page.textContent('#gicPct')).trim();
      throw new Error(`the warning fired with no instalment to vary, showing "${pct}"`);
    }
    await page.click('#scr-vary [data-next]');
    if (await activeScreen(page) !== 'scr-review') {
      throw new Error(`blocked with no instalment: ${(await allErrors(page)).join(' | ')}`);
    }
    return 'no warning and no acknowledgement required when T7 is 0';
  }
};

/* ------------------------------------------------------------------- run -- */

/* The pack and the harness share IDs, applicability and references, but the
   expected VALUES are written independently on purpose - a hand calculation in
   the case text and an assertion in code are two witnesses, not one. What must
   never drift is the case list itself, so that is checked before anything runs. */
function checkPackAgainstHarness() {
  const problems = [];
  const implemented = new Set(Object.keys(T));
  const declared = new Set(PACK.cases.map(c => c.id));

  PACK.cases.filter(c => c.auto).forEach(c => {
    if (!implemented.has(c.id)) problems.push(`${c.id} is marked automatable in cases.js but has no implementation`);
  });
  implemented.forEach(id => {
    if (!declared.has(id)) problems.push(`${id} is implemented here but does not exist in cases.js`);
  });
  PACK.cases.forEach(c => {
    if (!c.refs || !c.refs.length) problems.push(`${c.id} names no document reference`);
    if (!c.applies || !c.applies.length) problems.push(`${c.id} applies to no version`);
  });
  return problems;
}

async function runVersion(browser, version) {
  const spec = PACK.versions.find(v => v.id === version);
  const target = targetOverride || spec.target;
  const cases = PACK.cases.filter(c => c.applies.includes(version) && c.auto);
  results[version] = {};
  netLog[version] = [];

  const ctx = await browser.newContext({ viewport: { width: 520, height: 1000 } });
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', e => consoleErrors.push('pageerror: ' + e.message));
  page.on('request', r => netLog[version].push(r.url()));

  await page.goto(urlFor(target), { waitUntil: 'load' });

  console.log(`\n  ${version}  →  ${target}\\   (${cases.length} automated cases)`);
  console.log('  ' + '-'.repeat(72));

  let pass = 0;
  for (const c of cases) {
    const fn = T[c.id];
    await reset(page);
    try {
      const detail = await fn(page, version);
      results[version][c.id] = { status: 'pass', detail: String(detail || '') };
      pass++;
      console.log(`  [ ok ] ${c.id}  ${c.refs.join(' ')}  ${String(detail || '').slice(0, 84)}`);
    } catch (err) {
      results[version][c.id] = { status: 'fail', detail: err.message };
      console.log(`  [FAIL] ${c.id}  ${c.refs.join(' ')}  ${err.message}`);
    }
  }

  /* Unique the console errors: one broken call in start-up repeats on every
     reload and would otherwise bury everything else. */
  const unique = [...new Set(consoleErrors)];
  if (unique.length) {
    results[version].__console = { status: 'fail', detail: unique.join(' | ') };
    console.log(`  [FAIL] console  ${unique.length} distinct error(s): ${unique.join(' | ').slice(0, 200)}`);
  } else {
    results[version].__console = { status: 'pass', detail: 'no console or page errors' };
    console.log('  [ ok ] console  no console or page errors');
  }

  console.log(`  ${'-'.repeat(72)}\n  ${pass}/${cases.length} passed`);
  await ctx.close();
  return { pass, total: cases.length, consoleClean: unique.length === 0 };
}

console.log('\n  Lodge Assist — verification');
console.log(`  ${PACK.document} · executed in Microsoft Edge over file://`);

const drift = checkPackAgainstHarness();
if (drift.length) {
  console.log('\n  [FAIL] the test pack and this harness have drifted apart:');
  drift.forEach(p => console.log(`         ${p}`));
  console.log('');
  process.exit(1);
}
console.log(`  pack/harness consistency: ${PACK.cases.filter(c => c.auto).length} automatable cases, all implemented`);

const browser = await chromium.launch({ channel: 'msedge', headless: !HEADED });
const versions = only ? [only] : PACK.versions.map(v => v.id);

let total = 0, passed = 0, consoleClean = true;
for (const v of versions) {
  const r = await runVersion(browser, v);
  total += r.total; passed += r.pass;
  if (!r.consoleClean) consoleClean = false;
}
await browser.close();

const green = passed === total && consoleClean;

/* Summarise the pack itself alongside the run, so anything that wants to quote
   a number (go.ps1, CI, a slide) has exactly one place to read it from. */
const order = PACK.versions.map(v => v.id);
const packSummary = {};
for (const v of order) {
  const at = order.indexOf(v);
  const refs = PACK.references.filter(r => order.indexOf(r.since) <= at);
  const cs = PACK.cases.filter(c => c.applies.includes(v));
  const links = cs.reduce((a, c) => a + c.refs.length, 0);
  packSummary[v] = {
    references: refs.length,
    requirements: refs.filter(r => /^REQ/.test(r.ref)).length,
    nonFunctional: refs.filter(r => /^NFR/.test(r.ref)).length,
    rules: refs.filter(r => /^BR/.test(r.ref)).length,
    cases: cs.length,
    automated: cs.filter(c => c.auto).length,
    casesPerReference: Number((links / refs.length).toFixed(1)),
    untracedReferences: refs.filter(r => !cs.some(c => c.refs.includes(r.ref))).length
  };
}

const out = {
  ranAt: new Date().toISOString(),
  browser: `Microsoft Edge (Chromium), ${HEADED ? 'headed' : 'headless'}`,
  document: PACK.document,
  summary: { passed, total, consoleClean, green },
  pack: packSummary,
  /* Anything newer than ranAt makes this run stale. */
  inputs: [
    'testing/test-pack/cases.js',
    'testing/verify.mjs',
    'prototype/index.html', 'prototype/app.js', 'prototype/prototype.css',
    'prototype-v2/index.html', 'prototype-v2/app.js', 'prototype-v2/prototype.css',
    'assets/screens.css'
  ],
  versions: results
};

if (WRITE_RESULTS) {
fs.writeFileSync(
  path.join(HERE, 'test-pack', 'results.js'),
  '/* Generated by testing/verify.mjs. Do not edit by hand. */\n' +
  '(function (root) { root.ATO_TEST_RESULTS = ' + JSON.stringify(out, null, 2) + '; })' +
  '(typeof window !== "undefined" ? window : globalThis);\n'
);

/* Same data as plain JSON, for anything that is not a browser. */
fs.writeFileSync(
  path.join(HERE, 'test-pack', 'results.json'),
  JSON.stringify(out, null, 2) + '\n'
);
} else {
  console.log('\n  --target given: results NOT written, the committed baseline is untouched.');
}

console.log(`\n  TOTAL  ${passed}/${total} passed` +
            (consoleClean ? '' : '  ·  CONSOLE ERRORS PRESENT') +
            (WRITE_RESULTS
              ? '  ·  results written to testing/test-pack/results.js and results.json'
              : '  ·  results NOT written (--target)') + '\n');
process.exit(green ? 0 : 1);
