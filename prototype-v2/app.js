/* ============================================================================
   Lodge Assist prototype — behaviour
   ----------------------------------------------------------------------------
   Built from BRD-2026-118 v1.1. Every rule below carries the reference it
   implements, so the build can be marked against the document.

   No framework, no build step, no CDN, no network. Nothing leaves the browser
   (BR-09).
   ========================================================================= */

(function () {
  'use strict';

  /* ---------------------------------------------------------------- flow -- */

  var FLOW = ['scr-intro', 'scr-entity', 'scr-gst', 'scr-payg', 'scr-vary', 'scr-review', 'scr-done'];
  var STEP_SCREENS = ['scr-entity', 'scr-gst', 'scr-payg', 'scr-vary', 'scr-review'];
  var TOTAL_SCREENS = FLOW.length;
  var index = 0;

  var $  = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /* ------------------------------------------------------------ BR-01 ----- */
  /* Standard ABN check-digit algorithm: subtract 1 from the leading digit,
     apply the published weights, and require the total to divide by 89. */

  var ABN_WEIGHTS = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];

  function abnDigits(raw) {
    return String(raw == null ? '' : raw).replace(/\s/g, '');
  }

  function isValidAbn(raw) {
    var d = abnDigits(raw);
    if (!/^\d{11}$/.test(d)) return false;
    var total = 0;
    for (var i = 0; i < 11; i++) {
      var n = Number(d.charAt(i)) - (i === 0 ? 1 : 0);
      total += n * ABN_WEIGHTS[i];
    }
    return total % 89 === 0;
  }

  function formatAbn(raw) {
    var d = abnDigits(raw);
    return /^\d{11}$/.test(d)
      ? d.slice(0, 2) + ' ' + d.slice(2, 5) + ' ' + d.slice(5, 8) + ' ' + d.slice(8, 11)
      : d;
  }

  /* ------------------------------------------------------------ BR-04 ----- */
  /* Whole dollars, zero or greater. Cents are refused rather than rounded, so
     the lodger sees the same number the ATO would. */

  function parseMoney(raw) {
    var s = String(raw == null ? '' : raw).replace(/[\s,$]/g, '');
    if (s === '') return { ok: false, why: 'empty' };
    if (/^-/.test(s)) return { ok: false, why: 'negative' };
    if (/\./.test(s)) return { ok: false, why: 'cents' };
    if (!/^\d+$/.test(s)) return { ok: false, why: 'format' };
    if (s.length > 12) return { ok: false, why: 'toolong' };
    return { ok: true, value: parseInt(s, 10) };
  }

  var MONEY_MESSAGE = {
    empty:    'Enter an amount, or 0 if this label does not apply. (BR-04)',
    negative: 'This amount cannot be less than zero. (BR-04)',
    cents:    'Whole dollars only \u2014 remove the cents. (BR-04)',
    format:   'Use digits only, with no letters or symbols. (BR-04)',
    toolong:  'That amount is too large for this statement. (BR-04)'
  };

  function money(n) {
    var neg = n < 0;
    var s = String(Math.abs(Math.round(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (neg ? '-$' : '$') + s;
  }

  /* ------------------------------------------------------------ BR-03 ----- */
  /* Structural check only. Deliverability is not a business rule here. */
  function isValidEmail(v) {
    return /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(String(v || '').trim());
  }

  /* ------------------------------------------------------- error plumbing -- */

  function clearError(fieldId) {
    var field = document.getElementById(fieldId);
    if (!field) return;
    field.classList.remove('is-invalid');
    var msg = $('.field-error', field);
    if (msg) msg.remove();
    var input = $('input, select, textarea', field);
    if (input) {
      input.removeAttribute('aria-invalid');
      var described = (input.getAttribute('aria-describedby') || '')
        .split(/\s+/).filter(function (id) { return id && id !== 'e-' + fieldId; }).join(' ');
      if (described) input.setAttribute('aria-describedby', described);
      else input.removeAttribute('aria-describedby');
    }
  }

  /* REQ-007: name the field, say why, and cite the rule that refused it. */
  function showError(fieldId, message) {
    var field = document.getElementById(fieldId);
    if (!field) return;
    clearError(fieldId);
    field.classList.add('is-invalid');

    var p = document.createElement('p');
    p.className = 'field-error';
    p.id = 'e-' + fieldId;
    p.textContent = message;

    /* Sit the message directly under its label, above the control it refuses,
       so the fold does not move and a screen reader meets it first. */
    var label = field.querySelector(':scope > label');
    if (label) label.insertAdjacentElement('afterend', p);
    else field.appendChild(p);

    var input = $('input, select, textarea', field);
    if (input) {
      input.setAttribute('aria-invalid', 'true');
      var described = (input.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
      described.push(p.id);
      input.setAttribute('aria-describedby', described.join(' '));
    }
  }

  function clearScreenErrors(screen) {
    $$('.is-invalid', screen).forEach(function (el) { clearError(el.id); });
  }

  var live;
  function announce(text) {
    if (!live) {
      live = document.createElement('div');
      live.className = 'visually-hidden';
      live.setAttribute('role', 'status');
      live.setAttribute('aria-live', 'polite');
      document.body.appendChild(live);
    }
    live.textContent = '';
    window.setTimeout(function () { live.textContent = text; }, 30);
  }

  /* ------------------------------------------------------------ validation - */

  function validateEntity() {
    var errors = [];

    var abn = $('#abn').value;
    if (abnDigits(abn) === '') errors.push(['f-abn', 'Enter the ABN for the reporting entity. (BR-01)']);
    else if (!/^\d{11}$/.test(abnDigits(abn))) errors.push(['f-abn', 'An ABN is eleven digits. (BR-01)']);
    else if (!isValidAbn(abn)) errors.push(['f-abn', 'That ABN did not pass the check-digit test \u2014 check the digits. (BR-01)']);

    var contact = $('#contact').value.trim();
    if (contact === '') errors.push(['f-contact', 'Enter the name of the authorised contact. (BR-02)']);
    else if (contact.length < 2) errors.push(['f-contact', 'Enter at least two characters. (BR-02)']);

    var email = $('#email').value.trim();
    if (email === '') errors.push(['f-email', 'Enter a contact email address for the receipt. (BR-03)']);
    else if (!isValidEmail(email)) errors.push(['f-email', 'That email address is not valid \u2014 check for a missing @ or domain. (BR-03)']);

    return errors;
  }

  function validateMoneyFields(pairs, ruleRef) {
    var errors = [];
    var values = {};
    pairs.forEach(function (p) {
      var parsed = parseMoney($('#' + p.input).value);
      if (!parsed.ok) errors.push([p.field, MONEY_MESSAGE[parsed.why].replace('(BR-04)', '(' + (ruleRef || 'BR-04') + ')')]);
      else values[p.input] = parsed.value;
    });
    return { errors: errors, values: values };
  }

  var GST_FIELDS  = [{ field: 'f-g1', input: 'g1' }, { field: 'f-1a', input: 'a1' }, { field: 'f-1b', input: 'b1' }];
  var PAYG_FIELDS = [{ field: 'f-w1', input: 'w1' }, { field: 'f-w2', input: 'w2' }, { field: 'f-t7', input: 't7' }];

  function validateGst() {
    var r = validateMoneyFields(GST_FIELDS);
    /* BR-05 is a comparison, so it can only run once both labels parse. */
    if (!r.errors.length && r.values.a1 > r.values.g1) {
      r.errors.push(['f-1a', 'GST on sales (1A) cannot be more than total sales (G1). (BR-05)']);
    }
    return r.errors;
  }

  function validatePayg() {
    var r = validateMoneyFields(PAYG_FIELDS);
    if (!r.errors.length && r.values.w2 > r.values.w1) {
      r.errors.push(['f-w2', 'Amounts withheld (W2) cannot be more than salary and wages (W1). (BR-06)']);
    }
    return r.errors;
  }

  var VALIDATORS = {
    'scr-entity': validateEntity,
    'scr-gst':    validateGst,
    'scr-payg':   validatePayg,
    'scr-vary':   validateVary
  };

  /* ------------------------------------------------------ REQ-009 -------- */
  /* Varying the PAYG instalment. Added in BRD v1.1. */

  var VARY_FIELDS = [{ field: 'f-t8', input: 't8' }, { field: 'f-t9', input: 't9' }];

  var REASONS = {
    '21': 'Change in investments',
    '22': 'Current business structure not continuing',
    '23': 'Significant change in trading conditions',
    '24': 'Internal business restructure',
    '25': 'Change in legislation or product mix',
    '26': 'Financial market changes',
    '27': 'Use of income tax losses'
  };

  function isVarying() {
    var yes = document.getElementById('varyYes');
    return !!(yes && yes.checked);
  }

  /* BR-11: warn below 85% of T7, and NOT at exactly 85%.
     Compared as integers because t9 * 100 < t7 * 85 is exact by construction,
     so an exact-85% variation can never land on the wrong side of the line
     through rounding. The float form happens to be safe for the values we
     measured; this does not depend on that. */
  function triggersGic(t7, t9) {
    return t7 > 0 && (t9 * 100) < (t7 * 85);
  }

  function instalmentBase() {
    var p = parseMoney($('#t7').value);
    return p.ok ? p.value : 0;
  }

  var gicShowing = false;

  function updateGic() {
    var warn = $('#gicWarning');
    if (!warn) return;
    var t7 = instalmentBase();
    var t9 = parseMoney($('#t9').value);
    var fire = t9.ok && triggersGic(t7, t9.value);

    warn.hidden = !fire;
    if (fire) {
      /* Floored to one decimal: the warning only ever fires below 85%, so it
         must never round up to "85%" and appear to contradict BR-11. */
      var pct = (Math.floor((t9.value / t7) * 1000) / 10).toFixed(1) + '%';
      $('#gicPct').textContent = pct;
      /* NFR-02 / WCAG 2.2 SC 4.1.3: this panel appears as a side effect of
         typing, so it has to be announced or a screen-reader user meets it as
         an unexplained refusal two actions later. */
      if (!gicShowing) {
        announce('General interest charge warning. You have varied to ' + pct +
                 ' of your instalment. You must acknowledge this before you can continue.');
      }
    } else {
      $('#gicAck').checked = false;
      clearError('f-gicAck');
    }
    gicShowing = fire;
  }

  function validateVary() {
    var r = validateMoneyFields(VARY_FIELDS, 'BR-10');
    var errors = r.errors;

    if ($('#t4').value === '') {
      errors.push(['f-t4', 'Choose the reason you are varying the instalment. (BR-10)']);
    }

    /* BR-11 can only be judged once T9 parses, so it runs last. */
    if (!errors.length && triggersGic(instalmentBase(), r.values.t9) && !$('#gicAck').checked) {
      errors.push(['f-gicAck', 'Confirm you understand the general interest charge. (BR-11)']);
    }
    return errors;
  }

  /* ------------------------------------------------------------ BR-07 ----- */

  function readStatement() {
    var get = function (id) { var p = parseMoney($('#' + id).value); return p.ok ? p.value : 0; };
    return {
      abn:     abnDigits($('#abn').value),
      contact: $('#contact').value.trim(),
      email:   $('#email').value.trim(),
      g1: get('g1'), a1: get('a1'), b1: get('b1'),
      w1: get('w1'), w2: get('w2'), t7: get('t7'),
      varied: isVarying(),
      t8: get('t8'), t9: get('t9'), t4: $('#t4').value
    };
  }

  /* BR-07, as revised in v1.1: net = (1A - 1B) + W2 + I, where I is the varied
     amount T9 when the instalment has been varied, and T7 otherwise. */
  function instalmentUsed(s) {
    return s.varied ? s.t9 : s.t7;
  }

  function netAmount(s) {
    return (s.a1 - s.b1) + s.w2 + instalmentUsed(s);
  }

  function describeNet(net) {
    if (net > 0) return { label: '7A', who: 'Amount you owe the ATO', cls: 'is-payable' };
    if (net < 0) return { label: '7B', who: 'Amount the ATO owes you', cls: 'is-refund' };
    return { label: '\u2014', who: 'Nil statement \u2014 nothing owed either way', cls: 'is-nil' };
  }

  /* --------------------------------------------------------- live GST calc - */

  function updateGstRunning() {
    var a = parseMoney($('#a1').value);
    var b = parseMoney($('#b1').value);
    var av = a.ok ? a.value : 0;
    var bv = b.ok ? b.value : 0;
    var net = av - bv;
    $('#rG1A').textContent = money(av);
    $('#rG1B').textContent = money(bv);
    $('#rGstNet').textContent = money(net);
    var out = $('#gstRunning .calc-out');
    out.className = 'calc-out ' + describeNet(net).cls;
  }

  /* ------------------------------------------------------------- review --- */

  function renderReview() {
    var s = readStatement();

    $('#sAbn').textContent     = formatAbn(s.abn);
    $('#sContact').textContent = s.contact;
    $('#sEmail').textContent   = s.email;
    $('#sG1').textContent = money(s.g1);
    $('#sA1').textContent = money(s.a1);
    $('#sB1').textContent = money(s.b1);
    $('#sW1').textContent = money(s.w1);
    $('#sW2').textContent = money(s.w2);
    $('#sT7').textContent = money(s.t7);

    /* REQ-009: a varied statement shows the varied figures and the reason. */
    $('#rowT8').hidden = !s.varied;
    $('#rowT9').hidden = !s.varied;
    $('#rowT4').hidden = !s.varied;
    $('#variedNotice').hidden = !s.varied;
    if (s.varied) {
      $('#sT8').textContent = money(s.t8);
      $('#sT9').textContent = money(s.t9);
      $('#sT4').textContent = s.t4 + ' \u2014 ' + (REASONS[s.t4] || '');
      $('#vFrom').textContent = money(s.t7);
      $('#vTo').textContent = money(s.t9);
    }

    var net = netAmount(s);
    var d = describeNet(net);
    var iLabel = s.varied ? 'T9' : 'T7';

    $('#netWorking').innerHTML =
      '(1A <b>' + money(s.a1) + '</b> &minus; 1B <b>' + money(s.b1) + '</b>) ' +
      '+ W2 <b>' + money(s.w2) + '</b> ' +
      '+ ' + iLabel + ' <b>' + money(instalmentUsed(s)) + '</b>';

    $('#netOut').className = 'calc-out ' + d.cls;
    $('#netWho').textContent = d.who + (d.label !== '\u2014' ? ' \u2014 label ' + d.label : '');
    $('#netAmount').textContent = money(Math.abs(net));
  }

  /* --------------------------------------------------------------- done --- */

  function receiptNumber() {
    var alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var out = '';
    for (var i = 0; i < 6; i++) out += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
    return 'LA-2026Q2-' + out;
  }

  function renderDone() {
    var s = readStatement();
    var net = netAmount(s);
    var d = describeNet(net);

    $('#receiptNo').textContent = receiptNumber();
    $('#doneVaried').hidden = !s.varied;
    $('#doneLede').textContent = net === 0
      ? 'Thanks ' + s.contact.split(' ')[0] + '. In a real service this would be lodged as a nil statement for the quarter.'
      : 'Thanks ' + s.contact.split(' ')[0] + '. ' + d.who + ' for this quarter is ' + money(Math.abs(net)) + '.';

    var now = new Date();
    $('#lodgedAt').textContent =
      'Lodged ' + now.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }) +
      ' at ' + now.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' }) +
      ' \u00b7 in a real service a receipt would go to ' + s.email;
  }

  /* ------------------------------------------------------- screen switching */

  var SCROLLERS = [
    ['#scr-review .scroll', '#scrollHint'],
    ['#scr-vary .scroll',   '#varyScrollHint']
  ];

  /* NFR-04: content taller than the frame must scroll AND say so. */
  function syncScrollHint() {
    SCROLLERS.forEach(function (pair) {
      var scroller = $(pair[0]);
      var hint = $(pair[1]);
      if (!scroller || !hint) return;
      hint.hidden = (scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop) < 8;
    });
  }

  function resetReviewScroll() {
    var scroller = $('#scr-review .scroll');
    if (scroller) scroller.scrollTop = 0;
    syncScrollHint();
  }

  function currentScreen() {
    return document.getElementById(FLOW[index]);
  }

  function show(i) {
    index = Math.max(0, Math.min(FLOW.length - 1, i));
    FLOW.forEach(function (id, n) {
      document.getElementById(id).hidden = (n !== index);
    });
    if (FLOW[index] === 'scr-vary') {
      $('#varyBase').textContent = money(instalmentBase());
      updateGic();
      syncScrollHint();
    }
    if (FLOW[index] === 'scr-review') { renderReview(); resetReviewScroll(); }
    if (FLOW[index] === 'scr-done') renderDone();
    updateSteps();
    updateTrace();

    var heading = $('.h2, .display', currentScreen());
    if (heading) {
      heading.setAttribute('tabindex', '-1');
      try { heading.focus({ preventScroll: true }); } catch (e) { heading.focus(); }
    }
  }

  /* The journey is four steps, or five when the instalment is varied. The
     counter and the progress bar are derived, never hard-coded. */
  function activeSteps() {
    return STEP_SCREENS.filter(function (id) {
      return id !== 'scr-vary' || isVarying();
    });
  }

  function updateSteps() {
    var steps = activeSteps();
    var total = steps.length;
    var at = steps.indexOf(FLOW[index]);
    if (at === -1) return;

    var screen = currentScreen();
    var count = $('.step-count', screen);
    var bar = $('.progress', screen);
    if (count) count.textContent = 'Step ' + (at + 1) + ' of ' + total;
    if (bar) {
      bar.setAttribute('aria-valuemax', String(total));
      bar.setAttribute('aria-valuenow', String(at + 1));
      $('span', bar).style.width = Math.round(((at + 1) / total) * 100) + '%';
    }
  }

  /* Skip the variation screen unless the lodger asked for it (REQ-009). */
  function neighbour(dir) {
    var i = index + dir;
    while (FLOW[i] === 'scr-vary' && !isVarying()) i += dir;
    return i;
  }

  function next() {
    var screen = currentScreen();
    var validator = VALIDATORS[screen.id];
    if (validator) {
      clearScreenErrors(screen);
      var errors = validator();
      if (errors.length) {
        errors.forEach(function (e) { showError(e[0], e[1]); });
        announce(errors.length + (errors.length === 1 ? ' problem' : ' problems') + ' to fix before you can continue.');
        var first = $('.is-invalid input, .is-invalid select', screen);
        if (first) first.focus();
        return false;
      }
    }
    show(neighbour(1));
    return true;
  }

  /* ------------------------------------------------------------- tracing -- */
  /* Acceptance criterion 2: every screen declares the references it satisfies. */

  function updateTrace() {
    var screen = currentScreen();
    var refs = (screen.getAttribute('data-req') || '').split(',')
      .map(function (r) { return r.trim(); }).filter(Boolean);

    $('#traceScreen').textContent = 'Screen ' + screen.getAttribute('data-screen') + ' of ' + TOTAL_SCREENS;
    var host = $('#traceRefs');
    host.textContent = '';
    refs.forEach(function (r) {
      var b = document.createElement('b');
      b.textContent = r;
      if (r.indexOf('BR-') === 0) b.className = 'br';
      host.appendChild(b);
    });
  }

  /* ---------------------------------------------------------------- init -- */

  /* Clear every field AND every trace of the last run - including the ARIA
     state on controls, which survives a naive class reset and leaves the next
     lodger's screen reader announcing errors that are no longer there. */
  function resetAll() {
    $$('.field, .label-field, #f-declare, #f-gicAck').forEach(function (f) {
      if (f.id) clearError(f.id);
    });
    $$('input').forEach(function (i) {
      if (i.type === 'checkbox') i.checked = false;
      else if (i.type === 'radio') i.checked = (i.id === 'varyNo');
      else i.value = '';
    });
    $('#t4').value = '';
    $$('.field-error').forEach(function (el) { el.remove(); });
    $$('.is-invalid').forEach(function (el) { el.classList.remove('is-invalid'); });
    $('#refsToggle').checked = false;
    $('#stage').classList.remove('show-refs');
    var scroller = $('#scr-review .scroll');
    if (scroller) scroller.scrollTop = 0;
    updateGstRunning();
    updateGic();
  }

  function fillDemo(varied) {
    $('#abn').value     = '26 262 626 210';
    $('#contact').value = 'Sam Chen';
    $('#email').value   = 'sam@potteryshed.example';
    $('#g1').value = '88000';
    $('#a1').value = '8000';
    $('#b1').value = '3200';
    $('#w1').value = '42000';
    $('#w2').value = '7100';
    $('#t7').value = '2600';
    if (varied) {
      $('#varyYes').checked = true;
      $('#t8').value = '7800';
      $('#t9').value = '1800';
      $('#t4').value = '23';
    } else {
      /* Without this, pressing "v" then "d" leaves the journey varied while the
         presenter says it isn't. */
      $('#varyNo').checked = true;
      $('#t8').value = '';
      $('#t9').value = '';
      $('#t4').value = '';
    }
    /* Setting .value fires no input event, so clear any errors by hand. */
    $$('.is-invalid').forEach(function (el) { clearError(el.id); });
    updateGstRunning();
    updateGic();
    updateSteps();
    announce(varied ? 'Demonstration values filled, with a varied instalment.' : 'Demonstration values filled.');
  }

  function boot() {
    $('#btnStart').addEventListener('click', function () { show(neighbour(1)); });
    $$('[data-next]').forEach(function (b) { b.addEventListener('click', next); });
    $$('[data-back]').forEach(function (b) {
      b.addEventListener('click', function () {
        clearScreenErrors(currentScreen());
        show(neighbour(-1));
      });
    });

    /* BR-08: the declaration gates lodgment, and says so when it blocks. */
    $('#btnLodge').addEventListener('click', function () {
      var box = $('#declare');
      clearError('f-declare');
      if (!box.checked) {
        showError('f-declare', 'Confirm the declaration before you lodge. (BR-08)');
        announce('Confirm the declaration before you lodge.');
        box.focus();
        syncScrollHint();
        return;
      }
      show(neighbour(1));
    });

    $('#btnRestart').addEventListener('click', function () {
      resetAll();
      show(0);
    });

    ['a1', 'b1'].forEach(function (id) {
      $('#' + id).addEventListener('input', updateGstRunning);
    });

    /* REQ-009 / BR-11: the choice changes the length of the journey, and the
       varied amount decides whether the interest warning applies. */
    $$('input[name="vary"]').forEach(function (r) {
      r.addEventListener('change', updateSteps);
    });
    $('#t9').addEventListener('input', updateGic);
    $('#t7').addEventListener('input', function () {
      $('#varyBase').textContent = money(instalmentBase());
      updateGic();
    });
    $('#gicAck').addEventListener('change', function () { clearError('f-gicAck'); });
    $('#t4').addEventListener('change', function () { clearError('f-t4'); });

    /* Clear a field's error as soon as the lodger starts fixing it. */
    $$('.field, .label-field').forEach(function (f) {
      var input = $('input, select', f);
      if (input) input.addEventListener('input', function () { clearError(f.id); });
    });

    $('#refsToggle').addEventListener('change', function () {
      $('#stage').classList.toggle('show-refs', this.checked);
      syncScrollHint();
    });

    var reviewScroller = $('#scr-review .scroll');
    if (reviewScroller) reviewScroller.addEventListener('scroll', syncScrollHint);
    var varyScroller = $('#scr-vary .scroll');
    if (varyScroller) varyScroller.addEventListener('scroll', syncScrollHint);
    $('#t9').addEventListener('input', syncScrollHint);

    /* Presenter shortcuts: "d" fills the statement, "v" fills it varied. */
    document.addEventListener('keydown', function (e) {
      var t = e.target;
      var typing = t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA');
      if (typing) return;
      if (e.key === 'd' || e.key === 'D') fillDemo(false);
      if (e.key === 'v' || e.key === 'V') fillDemo(true);
    });

    var now = new Date();
    $('#clock').textContent = now.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' });

    updateGstRunning();
    updateGic();
    show(0);
  }

  /* A small, documented surface for automated checks. It reads state and
     validates - it never bypasses a rule or skips a screen. */
  window.LodgeAssist = {
    version: 'BRD-2026-118 v1.1',
    screens: FLOW,
    isValidAbn: isValidAbn,
    parseMoney: parseMoney,
    netAmount: netAmount,
    triggersGic: triggersGic,
    read: readStatement,
    currentScreenId: function () { return FLOW[index]; },
    fillDemo: fillDemo
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
