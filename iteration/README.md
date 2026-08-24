# iteration — the evidence

This folder exists so nobody has to take the README's word for anything.

## `verification-run.log`

The raw console output of a real run of [`../testing/verify.mjs`](../testing/verify.mjs)
against both prototypes, in Microsoft Edge (Chromium), headless, over `file://`.

It lists every case ID, the document references it verifies, and what was
actually observed — not a summary written afterwards. The numbers quoted in
[`../README.md`](../README.md) and [`../RUN-SHEET.md`](../RUN-SHEET.md) come from
this run, and `go.ps1` reads them from
[`../testing/test-pack/results.json`](../testing/test-pack/results.json) rather
than from a hard-coded string.

## Re-take it yourself

```powershell
.\go.ps1 -Verify
```

or, without the runner:

```powershell
npm install                     # playwright-core only, no browser download
node testing\verify.mjs         # both versions
node testing\verify.mjs v1.1    # one version
node testing\verify.mjs --headed
```

The suite exits non-zero if any case fails, so it is safe to put in CI.

## What this evidence does and does not show

**It does show:** that every automatable case in
[`../testing/test-pack/cases.js`](../testing/test-pack/cases.js) was executed
against the real pages in a real browser, and what each one observed.

**It does not show:** that the prototypes are correct in any broader sense. They
are checked against `BRD-2026-118` and nothing else. There is no backend, no
identity, no integration, and no real data — by design, and as the document
itself requires (BR-09).

## A note on what the checks found

Three defects were found by the automation while this was being built, and three
more by review *after* the suite was showing 93 of 93 green. All six are
described in [`../README.md`](../README.md). One of the three the suite missed
was a case whose assertion was too weak to fail — the sharpest lesson in the
repository.

A seventh item is recorded there as well: an assumption about floating-point
comparison at the 85% boundary that the test disproved. That one is in the record
deliberately — a test that corrects the author is doing its job.

## What this log does not contain

The failing runs. This file is the output of the current, green run; the earlier
red ones were not preserved. That is a gap, and it is named here rather than
papered over: what you can verify is that the suite passes against these pages
right now, and that it contains a regression check for each of the defects
described. The `iteration/` folder of a repository like this should really carry
the red runs too.

---

*Illustrative demonstration artefact. Not affiliated with, endorsed by, or
representative of the Australian Taxation Office. Nothing here is tax advice.*
