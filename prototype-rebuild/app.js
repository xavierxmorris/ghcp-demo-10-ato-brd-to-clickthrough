/* ============================================================================
   Lodge Assist — click-through prototype (prototype-live)
   ----------------------------------------------------------------------------
   Built from BRD-2026-118. Plain ES5-compatible browser JavaScript, loaded as a
   classic script so it runs from file:// with no server, framework, library,
   build step or CDN.

   BR-09: nothing here transmits, stores or lodges anything. All state lives in
   the `state` object below for the life of the page and is lost on reload.
   ========================================================================= */
(function () {
  'use strict';

  /* -------------------------------------------------------- BAS labels ---- */

  var MONEY_LABELS = {
    g1: { code: 'G1', name: 'Total sales including GST' },
    a1: { code: '1A', name: 'GST on sales' },
    b1: { code: '1B', name: 'GST on purchases' },
    w1: { code: 'W1', name: 'Total salary, wages and other payments' },
    w2: { code: 'W2', name: 'Amounts withheld from those payments' },
    t7: { code: 'T7', name: 'PAYG instalment for the quarter' }
  };

  var state = {
    abn: '', contact: '', email: '',
    g1: '', a1: '', b1: '', w1: '', w2: '', t7: '',
    declared: false,
    receipt: null, lodgedAt: null
  };

  /* ======================================================================
     BUSINESS RULES — every refusal returns the rule reference that refused it
     ====================================================================== */

  /* BR-01 — eleven digits passing the standard ABN check-digit algorithm. */
  function abnCheckDigit(digits) {
    var weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
    var sum = (Number(digits.charAt(0)) - 1) * weights[0];
    for (var i = 1; i < 11; i++) sum += Number(digits.charAt(i)) * weights[i];
    return sum % 89 === 0;
  }

  function checkAbn(raw) {
    var cleaned = String(raw).replace(/\s+/g, '');            // BR-01: spaces ignored
    if (cleaned === '') {
      return { ok: false, rule: 'BR-01', msg: 'Enter the ABN. It is mandatory.' };
    }
    if (!/^\d+$/.test(cleaned)) {
      return { ok: false, rule: 'BR-01', msg: 'The ABN must be digits only. Spaces are ignored, other characters are not accepted.' };
    }
    if (cleaned.length !== 11) {
      return { ok: false, rule: 'BR-01', msg: 'The ABN must be exactly 11 digits. You entered ' + cleaned.length + '.' };
    }
    if (!abnCheckDigit(cleaned)) {
      return { ok: false, rule: 'BR-01', msg: 'That ABN failed the ABN check-digit test. Check the digits and try again.' };
    }
    return { ok: true, value: cleaned };
  }

  /* BR-02 — mandatory, at least two characters. */
  function checkContact(raw) {
    var trimmed = String(raw).trim();
    if (trimmed === '') {
      return { ok: false, rule: 'BR-02', msg: 'Enter the authorised contact name. It is mandatory.' };
    }
    if (trimmed.length < 2) {
      return { ok: false, rule: 'BR-02', msg: 'The authorised contact name must be at least 2 characters.' };
    }
    return { ok: true, value: trimmed };
  }

  /* BR-03 — mandatory, structurally valid address. */
  function checkEmail(raw) {
    var trimmed = String(raw).trim();
    if (trimmed === '') {
      return { ok: false, rule: 'BR-03', msg: 'Enter a contact email address. It is mandatory.' };
    }
    if (!/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(trimmed)) {
      return { ok: false, rule: 'BR-03', msg: 'That is not a structurally valid email address. It needs a name, an @ and a domain — for example name@business.com.au.' };
    }
    return { ok: true, value: trimmed };
  }

  /* BR-04 — mandatory, zero or greater, whole dollars, 12 digits maximum.
     Dollar signs, thousands separators and spaces entered by the lodger are
     ignored. */
  function checkMoney(key, raw) {
    var code = MONEY_LABELS[key].code;
    var cleaned = String(raw).replace(/[\s$,]/g, '');
    if (cleaned === '') {
      return { ok: false, rule: 'BR-04', msg: 'Enter a value for ' + code + '. Every money label is mandatory — enter 0 if it does not apply.' };
    }
    if (/^[-\u2212]/.test(cleaned)) {
      return { ok: false, rule: 'BR-04', msg: code + ' must be zero or greater. Negative amounts are not accepted.' };
    }
    if (!/^\d+(\.\d*)?$/.test(cleaned)) {
      return { ok: false, rule: 'BR-04', msg: code + ' must be a number. Dollar signs and thousands separators are ignored, other characters are not accepted.' };
    }
    if (cleaned.indexOf('.') !== -1) {
      return { ok: false, rule: 'BR-04', msg: code + ' must be a whole dollar amount. Cents are not accepted — round to the nearest dollar.' };
    }
    if (cleaned.replace(/^0+(?=\d)/, '').length > 12) {
      return { ok: false, rule: 'BR-04', msg: code + ' may not be more than 12 digits.' };
    }
    return { ok: true, value: Number(cleaned) };
  }

  /* BR-07 — net amount = (1A − 1B) + W2 + T7. */
  function netAmount(v) {
    return (v.a1 - v.b1) + v.w2 + v.t7;
  }

  /* --------------------------------------------------------- formatting --- */

  var money0 = new Intl.NumberFormat('en-AU', {
    style: 'currency', currency: 'AUD',
    minimumFractionDigits: 0, maximumFractionDigits: 0
  });
  function fmt(n) { return money0.format(Math.abs(n)); }
  function fmtSigned(n) { return (n < 0 ? '\u2212' : '') + money0.format(Math.abs(n)); }
  function fmtAbn(d) {
    return d.slice(0, 2) + ' ' + d.slice(2, 5) + ' ' + d.slice(5, 8) + ' ' + d.slice(8);
  }

  /* ------------------------------------------------------------ helpers --- */

  function $(id) { return document.getElementById(id); }
  function all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function baseDescribedBy(input) {
    if (!input.hasAttribute('data-base-described')) {
      input.setAttribute('data-base-described', input.getAttribute('aria-describedby') || '');
    }
    return input.getAttribute('data-base-described');
  }

  /* Marks a control as refused: is-invalid on the row, aria-invalid on the
     control (NFR-02), the message associated with aria-describedby (NFR-02),
     and the rule reference spelled out in text beside the design system's
     non-colour "!" indicator (NFR-03, REQ-007). */
  function refuse(fieldId, inputId, errId, rule, msg) {
    var field = $(fieldId), input = $(inputId), err = $(errId);
    field.classList.add('is-invalid');
    input.setAttribute('aria-invalid', 'true');
    err.innerHTML = '<span class="err-body"><b class="rule-ref">' + rule + '</b>' + msg + '</span>';
    err.hidden = false;
    var base = baseDescribedBy(input);
    input.setAttribute('aria-describedby', (base ? base + ' ' : '') + errId);
  }

  function accept(fieldId, inputId, errId) {
    var field = $(fieldId), input = $(inputId), err = $(errId);
    field.classList.remove('is-invalid');
    input.removeAttribute('aria-invalid');
    err.hidden = true;
    err.innerHTML = '';
    var base = baseDescribedBy(input);
    if (base) input.setAttribute('aria-describedby', base);
    else input.removeAttribute('aria-describedby');
  }

  function showSummary(summaryId, failures) {
    var box = $(summaryId);
    if (!failures.length) { box.hidden = true; return; }
    var rules = [];
    failures.forEach(function (f) { if (rules.indexOf(f.rule) === -1) rules.push(f.rule); });
    var n = failures.length;
    box.querySelector('.sum-text').textContent =
      n + (n === 1 ? ' answer was refused' : ' answers were refused') +
      ' — ' + rules.join(', ') + '. ' +
      (n === 1 ? 'It is' : 'Each one is') + ' explained below, on the answer itself.';
    box.hidden = false;
  }

  function revealInScroll(el) {
    var area = el.closest ? el.closest('[data-scroll]') : null;
    if (!area) return;
    var offset = el.getBoundingClientRect().top - area.getBoundingClientRect().top;
    area.scrollTop = Math.max(0, area.scrollTop + offset - 10);
  }

  function focusFirstFailure(failures) {
    if (!failures.length) return;
    var input = $(failures[0].inputId);
    revealInScroll(input.closest('.field, .label-field') || input);
    input.focus({ preventScroll: true });
    updateScrollNotes();
  }

  /* ======================================================================
     SCREEN VALIDATION — REQ-007: no progress while anything is refused
     ====================================================================== */

  var ENTITY_FIELDS = [
    { key: 'abn',     fieldId: 'f-abn',     inputId: 'abn',     errId: 'err-abn',     check: checkAbn },
    { key: 'contact', fieldId: 'f-contact', inputId: 'contact', errId: 'err-contact', check: checkContact },
    { key: 'email',   fieldId: 'f-email',   inputId: 'email',   errId: 'err-email',   check: checkEmail }
  ];

  function validateEntity() {
    var failures = [];
    ENTITY_FIELDS.forEach(function (f) {
      var r = f.check($(f.inputId).value);
      if (r.ok) { accept(f.fieldId, f.inputId, f.errId); state[f.key] = r.value; }
      else { refuse(f.fieldId, f.inputId, f.errId, r.rule, r.msg); failures.push({ rule: r.rule, inputId: f.inputId }); }
    });
    showSummary('sum-entity', failures);
    return failures;
  }

  /* Shared money-screen validation with an optional comparison rule
     (BR-05 for 1A vs G1, BR-06 for W2 vs W1). */
  function validateMoneyScreen(keys, summaryId, compare) {
    var failures = [];
    var values = {};
    keys.forEach(function (key) {
      var r = checkMoney(key, $(key).value);
      if (r.ok) { accept('f-' + key, key, 'err-' + key); state[key] = String(r.value); values[key] = r.value; }
      else { refuse('f-' + key, key, 'err-' + key, r.rule, r.msg); failures.push({ rule: r.rule, inputId: key }); }
    });

    if (compare && values.hasOwnProperty(compare.left) && values.hasOwnProperty(compare.right)) {
      if (values[compare.left] > values[compare.right]) {
        refuse('f-' + compare.left, compare.left, 'err-' + compare.left, compare.rule,
          MONEY_LABELS[compare.left].name + ' (' + MONEY_LABELS[compare.left].code + ') cannot exceed ' +
          MONEY_LABELS[compare.right].name.charAt(0).toLowerCase() + MONEY_LABELS[compare.right].name.slice(1) +
          ' (' + MONEY_LABELS[compare.right].code + '), which is ' + fmt(values[compare.right]) + '.');
        failures.push({ rule: compare.rule, inputId: compare.left });
      }
    }

    showSummary(summaryId, failures);
    return failures;
  }

  function validateGst() {
    return validateMoneyScreen(['g1', 'a1', 'b1'], 'sum-gst',
      { left: 'a1', right: 'g1', rule: 'BR-05' });
  }

  function validatePayg() {
    return validateMoneyScreen(['w1', 'w2', 't7'], 'sum-payg',
      { left: 'w2', right: 'w1', rule: 'BR-06' });
  }

  /* BR-08 — the statement cannot be lodged until the declaration is confirmed. */
  function validateReview() {
    var box = $('declare'), err = $('err-declare'), wrap = box.closest('[data-ref]');
    if (box.checked) {
      state.declared = true;
      box.removeAttribute('aria-invalid');
      err.hidden = true; err.innerHTML = '';
      wrap.querySelector('.consent').classList.remove('is-invalid');
      showSummary('sum-review', []);
      return [];
    }
    state.declared = false;
    box.setAttribute('aria-invalid', 'true');
    err.innerHTML = '<span class="err-body"><b class="rule-ref">BR-08</b>' +
      'You cannot lodge this statement until you confirm the declaration.</span>';
    err.hidden = false;
    showSummary('sum-review', [{ rule: 'BR-08', inputId: 'declare' }]);
    return [{ rule: 'BR-08', inputId: 'declare' }];
  }

  /* ======================================================================
     RENDERING
     ====================================================================== */

  function numericState() {
    return {
      g1: Number(state.g1), a1: Number(state.a1), b1: Number(state.b1),
      w1: Number(state.w1), w2: Number(state.w2), t7: Number(state.t7)
    };
  }

  /* REQ-006 / BR-07 — the arithmetic, and who the money moves to, in words. */
  function renderNet(workingEl, outEl, whoEl, amountEl) {
    var v = numericState();
    var net = netAmount(v);

    workingEl.innerHTML =
      '(<b>1A</b> ' + fmt(v.a1) + ' \u2212 <b>1B</b> ' + fmt(v.b1) + ')' +
      ' + <b>W2</b> ' + fmt(v.w2) +
      ' + <b>T7</b> ' + fmt(v.t7) +
      ' = <b>' + fmtSigned(net) + '</b>';

    outEl.classList.remove('is-payable', 'is-refund', 'is-nil');
    if (net > 0) {
      outEl.classList.add('is-payable');
      whoEl.innerHTML = 'Payable to the ATO<br><span class="label-code">7A</span>';
      amountEl.textContent = fmt(net);
    } else if (net < 0) {
      outEl.classList.add('is-refund');
      whoEl.innerHTML = 'Refundable to your business<br><span class="label-code">7B</span>';
      amountEl.textContent = fmt(net);
    } else {
      outEl.classList.add('is-nil');
      whoEl.innerHTML = 'Nil result &mdash; neither <b>7A</b> nor <b>7B</b> is reported';
      amountEl.textContent = fmt(0);
    }
    return net;
  }

  function netSentence(net) {
    if (net > 0) return 'The net amount for this quarter is payable to the ATO. It is reported at label 7A.';
    if (net < 0) return 'The net amount for this quarter is refundable to your business. It is reported at label 7B.';
    return 'This quarter is a nil result. Neither label 7A nor label 7B is reported.';
  }

  function item(dt, dd, cls) {
    return '<div class="item"><dt>' + dt + '</dt><dd' + (cls ? ' class="' + cls + '"' : '') + '>' + dd + '</dd></div>';
  }
  function codeItem(key) {
    return item('<span class="label-code">' + MONEY_LABELS[key].code + '</span>' + MONEY_LABELS[key].name,
                fmt(Number(state[key])), 'num');
  }

  function renderNetScreen() {
    var net = renderNet($('netWorking'), $('netOut'), $('netWho'), $('netAmount'));
    $('netPlain').textContent = netSentence(net);
    $('netFigures').innerHTML =
      codeItem('a1') + codeItem('b1') + codeItem('w2') + codeItem('t7');
  }

  /* REQ-008 — every label value the lodger entered, and the calculated net. */
  function renderReviewScreen() {
    $('revEntity').innerHTML =
      item('ABN', fmtAbn(state.abn), 'num') +
      item('Authorised contact', escapeHtml(state.contact)) +
      item('Contact email', escapeHtml(state.email));

    $('revGst').innerHTML = codeItem('g1') + codeItem('a1') + codeItem('b1');
    $('revPayg').innerHTML = codeItem('w1') + codeItem('w2') + codeItem('t7');

    renderNet($('revWorking'), $('revOut'), $('revWho'), $('revAmount'));
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* REQ-008 — receipt number, and the date and time of lodgment. */
  function renderConfirmation() {
    var now = new Date();
    state.lodgedAt = now;
    state.receipt = makeReceipt(now);

    var net = netAmount(numericState());
    $('receiptNo').textContent = state.receipt;
    $('doneDate').textContent = new Intl.DateTimeFormat('en-AU',
      { day: 'numeric', month: 'long', year: 'numeric' }).format(now);
    $('doneTime').textContent = new Intl.DateTimeFormat('en-AU',
      { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true }).format(now);
    $('doneNet').innerHTML = net === 0
      ? fmt(0) + ' <span class="pill pill-brand">Nil</span>'
      : fmt(net) + ' <span class="label-code">' + (net > 0 ? '7A' : '7B') + '</span>';
    $('doneEmail').textContent = state.email;
    $('doneLede').textContent = netSentence(net);
  }

  function makeReceipt(d) {
    var alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var block = '';
    for (var i = 0; i < 4; i++) {
      block += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
    }
    var yy = String(d.getFullYear()).slice(2);
    var mm = ('0' + (d.getMonth() + 1)).slice(-2);
    var tail = ('000' + Math.floor(Math.random() * 10000)).slice(-4);
    return 'AS-' + yy + mm + '-' + block + '-' + tail;
  }

  /* ======================================================================
     NAVIGATION — REQ-002
     ====================================================================== */

  var SCREENS = ['intro', 'entity', 'gst', 'payg', 'net', 'review', 'done'];

  function screenEl(name) { return $('scr-' + name); }

  function show(name) {
    SCREENS.forEach(function (n) { screenEl(n).hidden = (n !== name); });
    var el = screenEl(name);
    all('[data-scroll]', el).forEach(function (a) { a.scrollTop = 0; });
    var heading = el.querySelector('[tabindex="-1"]');
    if (heading) heading.focus({ preventScroll: true });
    $('frame').scrollTop = 0;
    updateTrace();
    updateScrollNotes();
  }

  var NEXT = {
    entity: { validate: validateEntity, to: 'gst' },
    gst:    { validate: validateGst,    to: 'payg' },
    payg:   { validate: validatePayg,   to: 'net'  },
    net:    { validate: function () { return []; }, to: 'review' },
    review: { validate: validateReview, to: 'done' }
  };

  function advance(from) {
    var step = NEXT[from];
    var failures = step.validate();
    if (failures.length) {          // REQ-007 — refused, so no progress
      updateScrollNotes();
      focusFirstFailure(failures);
      return;
    }
    if (step.to === 'net') renderNetScreen();
    if (step.to === 'review') renderReviewScreen();
    if (step.to === 'done') renderConfirmation();
    show(step.to);
  }

  /* ======================================================================
     NFR-04 — content taller than the frame scrolls, and says so
     ====================================================================== */

  function updateScrollNotes() {
    all('.scroll-wrap').forEach(function (wrap) {
      var area = wrap.querySelector('[data-scroll]');
      var note = wrap.querySelector('.scroll-note');
      if (!area || !note) return;
      if (area.scrollHeight - area.clientHeight > 2) {
        var atEnd = area.scrollTop + area.clientHeight >= area.scrollHeight - 2;
        note.querySelector('.scroll-note-text').textContent =
          atEnd ? 'End of this screen \u00b7 scroll up for more' : 'This screen scrolls \u00b7 more below';
        note.hidden = false;
      } else {
        note.hidden = true;
      }
    });
  }

  /* ======================================================================
     TRACE STRIP — reads the current screen's data-req live
     ====================================================================== */

  function chipClass(ref) {
    if (ref.indexOf('NFR') === 0) return 'ref-chip is-nfr';
    if (ref.indexOf('BR') === 0) return 'ref-chip is-br';
    return 'ref-chip';
  }

  function updateTrace() {
    var current = null;
    SCREENS.forEach(function (n) { if (!screenEl(n).hidden) current = screenEl(n); });
    if (!current) return;
    $('traceNum').textContent = current.getAttribute('data-screen');
    $('traceName').textContent = current.getAttribute('data-title');
    var refs = (current.getAttribute('data-req') || '').split(',').map(function (s) {
      return s.trim();
    }).filter(Boolean);
    $('traceChips').innerHTML = refs.map(function (r) {
      return '<span class="' + chipClass(r) + '">' + r + '</span>';
    }).join('');
  }

  /* ======================================================================
     WIRING
     ====================================================================== */

  function resetAll() {
    Object.keys(MONEY_LABELS).forEach(function (k) {
      $(k).value = '';
      accept('f-' + k, k, 'err-' + k);
      state[k] = '';
    });
    ENTITY_FIELDS.forEach(function (f) {
      $(f.inputId).value = '';
      accept(f.fieldId, f.inputId, f.errId);
      state[f.key] = '';
    });
    ['sum-entity', 'sum-gst', 'sum-payg', 'sum-review'].forEach(function (id) { $(id).hidden = true; });
    $('declare').checked = false;
    $('declare').removeAttribute('aria-invalid');
    $('err-declare').hidden = true;
    state.declared = false;
    state.receipt = null;
    state.lodgedAt = null;
    show('intro');
  }

  function init() {
    $('btnStart').addEventListener('click', function () { show('entity'); });
    $('btnRestart').addEventListener('click', resetAll);

    all('[data-next]').forEach(function (btn) {
      btn.addEventListener('click', function () { advance(btn.getAttribute('data-next')); });
    });
    all('[data-back]').forEach(function (btn) {
      // REQ-002 — going back keeps everything already entered.
      btn.addEventListener('click', function () { show(btn.getAttribute('data-back')); });
    });
    all('[data-goto]').forEach(function (btn) {
      btn.addEventListener('click', function () { show(btn.getAttribute('data-goto')); });
    });

    // Keep state in step with the inputs so Back never loses an answer.
    ENTITY_FIELDS.forEach(function (f) {
      $(f.inputId).addEventListener('input', function () { state[f.key] = $(f.inputId).value; });
    });
    Object.keys(MONEY_LABELS).forEach(function (k) {
      $(k).addEventListener('input', function () { state[k] = $(k).value; });
    });
    $('declare').addEventListener('change', function () {
      if ($('declare').checked) validateReview();
    });

    // Requirement labels on the screen itself.
    var stage = $('stage'), btnRefs = $('btnRefs');
    btnRefs.addEventListener('click', function () {
      var on = btnRefs.getAttribute('aria-pressed') === 'true';
      btnRefs.setAttribute('aria-pressed', on ? 'false' : 'true');
      btnRefs.textContent = on ? 'Show refs on screen' : 'Hide refs on screen';
      stage.classList.toggle('show-refs', !on);
      updateScrollNotes();
    });

    all('[data-scroll]').forEach(function (area) {
      area.addEventListener('scroll', updateScrollNotes, { passive: true });
    });
    window.addEventListener('resize', updateScrollNotes);
    if (window.ResizeObserver) {
      var ro = new ResizeObserver(updateScrollNotes);
      all('[data-scroll]').forEach(function (area) {
        ro.observe(area);
        Array.prototype.forEach.call(area.children, function (c) { ro.observe(c); });
      });
    }

    // The trace strip reads the DOM, so it stays true even if a screen is
    // shown by something other than show().
    if (window.MutationObserver) {
      var mo = new MutationObserver(function () { updateTrace(); updateScrollNotes(); });
      SCREENS.forEach(function (n) {
        mo.observe(screenEl(n), { attributes: true, attributeFilter: ['hidden'] });
      });
    }

    tickClock();
    setInterval(tickClock, 20000);
    updateTrace();
    updateScrollNotes();

    // Exposed only so the browser check can drive the journey.
    window.__proto_live = {
      state: state, checkAbn: checkAbn, checkMoney: checkMoney, netAmount: netAmount,
      show: show, advance: advance, updateScrollNotes: updateScrollNotes
    };
  }

  function tickClock() {
    $('clock').textContent = new Intl.DateTimeFormat('en-AU',
      { hour: 'numeric', minute: '2-digit', hour12: false }).format(new Date());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
