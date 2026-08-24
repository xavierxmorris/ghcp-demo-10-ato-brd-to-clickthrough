# ghcp-demo-10 — an ATO-style BRD becomes a working app, and a test pack that runs itself

> **Difficulty:** ⭐
> **Audience:** business analysts, product owners, delivery leads — **and testers**
> **Length:** 1:15 of scripted beats inside a 90-second slot, per track
> **Prerequisites:** none for the demo. Node and Edge only if you re-run the checks.

```powershell
.\go.ps1              # the business analyst track
.\go.ps1 -Tester      # the tester track
```

No install, no server, no framework, no design-tool licence, no network. The
pages run straight off the filesystem, so this works on a locked-down laptop and
on conference wifi that has given up.

> ### ⚠️ This is a demonstration, not an ATO service
> **Lodge Assist is fictional.** This repository is not affiliated with, endorsed
> by, or representative of the Australian Taxation Office. The program, sponsor,
> document reference, statistics, thresholds and figures are invented. Activity
> statement label codes are used because they make the example legible, not
> because this describes the real obligations attached to them. **Nothing here is
> tax advice** — for real obligations, see [ato.gov.au](https://www.ato.gov.au).
> No real taxpayer data appears anywhere; every ABN is synthetic.

---

## The one idea

> A BRD is a **description of an app** and a **specification for its tests**.
> Everyone signs it off; nobody has ever used it, and nobody can tell you whether
> BR-06 is covered. One sentence of plain English turns it into something you can
> click — and a second sentence turns it into something you can prove.

---

## The scenario

**Lodge Assist** — a guided, mobile-first quarterly Business Activity Statement
lodgment journey for micro and small business, in a fictional Digital Lodgment
Program.

Self-lodgers file on paper or through a portal built for a desktop. In the
fictional baseline, **21% of self-prepared statements need a correction**, and the
biggest single cause is an arithmetic error in the net amount at labels 7A / 7B —
a figure the lodger cannot see until after they have lodged. Median time to
correction: **17 days**.

The BA writes a one-page BRD for a journey that does the arithmetic *before* you
commit. Normally the document then waits in a queue. Here it doesn't.

---

## Two tracks

### Track 1 — the business analyst *(`.\go.ps1`)*

| Beat | Time | What the room sees |
|---|---|---|
| **The business asset** | 0:00 | `BRD-2026-118 v1.0`. Eight requirements, nine business rules, approved for build. Familiar — and completely un-clickable. |
| **The ask** | 0:15 | One plain-English sentence, with the *measured* facts of the run underneath. |
| **The app** | 0:27 | **Lodge Assist**, working. Enter a bad ABN and it refuses you *by rule*: `BR-01`, the check digit. The review screen does the arithmetic and shows its working. |
| **The revision** | 0:53 | Trading conditions change. The BA edits **the BRD**. v1.1 adds `REQ-009` and **revises `BR-07`** — and the app follows. |

### Track 2 — the tester *(`.\go.ps1 -Tester`)*

| Beat | Time | What the room sees |
|---|---|---|
| **The document asks for it** | 0:00 | Section 8: *every requirement and every rule carries a test case, coverage reportable both ways.* A testable clause, not a wish. |
| **The pack** | 0:29 | 59 cases for v1.1, each naming the reference it verifies — with a live pass/fail column from a real browser run. |
| **The matrix** | 0:49 | 24 references, **0 untraced**, forward and backward. And the part that matters: `REQ-009` was **added**, `BR-07` was **revised** — so three existing cases must be **re-baselined**, and one new case written for the changed behaviour. |
| **The boundary** | 1:11 | `BR-11` warns *below* 85%. On a $2,600 instalment that is $2,210. Type `2210` — silence. Type `2209` — the warning fires, and reads **84.9%**. |

Full playbook, eight use cases, copy-paste prompts: **[`TESTER-PLAYBOOK.md`](./TESTER-PLAYBOOK.md)**.

---

## The measured facts — quote these, not rounder ones

Everything below is written by an actual run into
[`testing/test-pack/results.json`](./testing/test-pack/results.json). `go.ps1`
reads that file for every figure it prints, and if any input has changed since
the run it prints **STALE** instead of a number.

| | |
|---|---|
| Automated checks | **102 / 102 passing** — 43 against v1.0, 59 against v1.1 |
| Executed in | Microsoft Edge (Chromium), headless, over `file://` |
| References in v1.1 | **24** — 9 requirements, 4 non-functional requirements, 11 business rules |
| Untraced references | **0**, in both directions. 3.2 cases per reference |
| Defects found during the build | **6** — three by the automation, three by review. All fixed |
| Re-take them yourself | `.\go.ps1 -Verify` |

### The defects, because they are the point

**Found by the automation, while building:**

| Found by | What it was |
|---|---|
| Console assertion + `TC-061` | **v1.1 threw on load.** `updateGic()` still referenced `#gicAckError`, an element removed when the acknowledgement was restructured. The exception aborted start-up before the first render, so the traceability strip was blank on the opening screen — and *only* the opening screen, because every later render came from a click. |
| `TC-073` | **A panel clipped to 26 px.** On the GST screen with all three labels refused at once, the running-total panel was squashed from 123 px to 26 px. The label sheet was a CSS grid that shrank, and its auto rows compressed instead of scrolling. You only see it if you enter three errors at once. |
| The harness itself | **A false positive.** The first clipping check flagged the introduction artwork, whose decorative blur deliberately bleeds past its own box. The check was wrong, not the art — and an assertion that cries wolf gets switched off within a fortnight, so fixing it counts. |

**Found by review, after the suite was green — which is the more useful lesson:**

| What | Why the suite missed it |
|---|---|
| **The warning said "85%" while firing.** At $2,209 of $2,600 the figure is 84.96%, and `Math.round` made it read *"you have varied to **85%**"* — on the exact beat where the presenter says 85% does **not** warn. `TC-086` passed because it only asserted the string ended in `%`. Now floored to one decimal, and the case asserts the number is **below 85**. | The assertion was too weak to notice. A passing test is not the same as a checked behaviour. |
| **The accessibility cases traced to the wrong requirements.** `TC-070`–`TC-073` pointed at `REQ-007` (*"prevented from progressing…"*) and `REQ-001` (*"the introduction screen names the service…"*), neither of which says anything about target size, contrast or clipping. Section 6 was **unnumbered**, so the matrix could not see it. That is coverage theatre on the page that argues against coverage theatre. | Section 6 is now `NFR-01`–`NFR-04` in both BRDs, and the cases point at them. **An unnumbered requirement is one your coverage report cannot report on.** |
| **Control borders were 1.46:1.** `--ink-200` on white, used for every input, select, option card and consent box — against the 3:1 that WCAG 2.2 SC 1.4.11 requires for a control boundary, and against this file's own header comment. Now a dedicated `--control-edge` token at 3.8:1. | Nothing measured contrast. `TC-070` measured *size*; the claim about contrast was written, not tested. |

There is a seventh worth admitting: we *asserted* that `t9 < t7 * 0.85` would
break at exactly 85%, wrote `TC-085` to prove it, and found the float form is
fine for the values that matter. The build compares integers anyway — exact by
construction beats exact by luck — but the honest record is that the test
corrected **us**, not the code.

---

## The rebuild — the most useful number in the repo

Everything above is 102 of 102 green. This is not.

`.\go.ps1 -Live` rebuilt the entire prototype from BRD v1.0 in one unattended
Copilot run — **22 minutes 7 seconds**, three files, no hand-written code. The
full transcript is in
[`iteration/copilot-run-live-oneshot.log`](./iteration/copilot-run-live-oneshot.log).
It wrote and ran its own suite (204 checks, all passing) and fixed a real
grid-squash defect it found on the way.

Then the **committed** suite was pointed at it:

```powershell
node testing\verify.mjs v1.0 --target=prototype-live   # 27 / 43
```

**Sixteen failures, and not one of them was a defect in the build.** An
independent walk confirmed the net amount is $14,500 — matching a hand
calculation of BR-07 — with all 7 screens traced, the frame at exactly
390 × 844, zero network requests and zero console errors.

| What actually failed | Count |
|---|---|
| One journey-shape decision the BRD never specified — it gave the net amount its **own screen**, making the journey 5 steps rather than 4 — and everything downstream of my `driveTo()` helper | ~9 |
| Assertions written against *my* wording, not the document's meaning (`/owe the ATO/` vs *"Payable to the ATO — 7A"*) | 3 |
| One assertion that was simply badly written — TC-042 refuses a nil message that mentions `7A`; the build's *"Nil result — neither 7A nor 7B is reported"* is better copy and fails it | 1 |
| Selectors I never wrote into the published contract, including the refs toggle, which it built as a `<button aria-pressed>` instead of a checkbox | 3 |

Two things follow, and they are the honest ones:

- **Test the journey, not the prose.** `netAmount === 14500` survives a rebuild.
  `/owe the ATO/` tests my English.
- **A red suite is not a broken build.** Sixteen red lines, zero defects. A test
  lead who reports "27/43, it's broken" without reading the failures has done
  real damage.

And one caveat that matters: the run read `prototype-v2/index.html` early on, and
34 of its 72 element ids match mine. **This was not a clean room** — some of the
selector contract held because the prior implementation was visible, not purely
because the prompt asked for it. Full analysis in
[`TESTER-PLAYBOOK.md`](./TESTER-PLAYBOOK.md), UC-8.

---

## Why it lands

- **The input is theirs.** A BRD is an artefact business analysts own and defend.
  It shares no stylesheet, markup or tokens with the app.
- **It refuses you by rule.** Bad ABN → *"That ABN did not pass the check-digit
  test — check the digits. **(BR-01)**"* Every refusal cites the rule that
  refused it, which is REQ-007 met and demonstrable.
- **It shows its working.** The review screen prints
  `(1A $8,000 − 1B $3,200) + W2 $7,100 + T7 $2,600` above the answer. That is
  BR-07, visible, checkable by hand.
- **Traceability, in their language.** A live strip under the phone reads
  *"Screen 3 of 6 · REQ-004 REQ-007 BR-04 BR-05"*, plus a **Show BRD refs on the
  screen** toggle that labels elements in place. That is acceptance criterion 2,
  met.
- **The revision is a *revision*, not just an addition.** v1.1 adds REQ-009 —
  easy, just new cases. It also **revises BR-07**, which is the dangerous kind,
  because three existing cases keep passing while quietly checking last
  quarter's agreement. The matrix separates the two: *three re-baselined,
  one new.*
- **Accessibility is numbered, so it is traceable.** Section 6 is `NFR-01`–
  `NFR-04`: 44 × 44 targets, WCAG 2.2 AA, no error by colour alone, nothing
  clipped at 390 × 844. `TC-070`–`TC-074` verify those four specifically — not
  general AA conformance, which no automated suite can claim.

---

## Running it

| Command | Use it when |
|---|---|
| `.\go.ps1` | The business analyst track, timed. |
| `.\go.ps1 -Tester` | The tester track. |
| `.\go.ps1 -Manual` | **Presenting live.** Enter advances each beat, so questions can't run down the clock. |
| `.\go.ps1 -Check` | Pre-flight before you walk on stage. Exits 0/1, CI-safe, prints the measured facts — or **STALE** if anything changed since the last run. |
| `.\go.ps1 -Verify` | Re-run every check for real. Needs Node and Edge. |
| `node testing\verify.mjs v1.0 --target=<folder>` | Point the committed suite at a different build of the same document. Never writes results. |
| `.\go.ps1 -NoBrowser` | Rehearsing the words without opening windows. |
| `.\go.ps1 -Live` | Workshop mode — Copilot really rebuilds the app from the BRD into `prototype-live\`. Budget 20–30 minutes. **Commit first:** the only thing keeping it out of `prototype\` is an instruction in the prompt, not a sandbox. |

Presenter script, beat by beat, with the awkward questions answered:
**[`RUN-SHEET.md`](./RUN-SHEET.md)**.

Prefer to skip the terminal? Open these in order:

1. [`brd/ato-bas-lodgment-brd.html`](./brd/ato-bas-lodgment-brd.html) — the business asset (v1.0)
2. [`prototype/index.html`](./prototype/index.html) — built from it
3. [`brd/ato-bas-lodgment-brd-v1.1.html`](./brd/ato-bas-lodgment-brd-v1.1.html) — the revision
4. [`prototype-v2/index.html`](./prototype-v2/index.html) — built from the revision
5. [`testing/test-pack/acceptance-pack.html`](./testing/test-pack/acceptance-pack.html) — the test pack, with live results
6. [`testing/test-pack/traceability.html`](./testing/test-pack/traceability.html) — coverage both ways

**Presenter shortcuts:** press **`d`** in either prototype to fill the statement
instantly. In v2, press **`v`** to fill it *with a varied instalment*.

---

## The prompts

The exact prompts that built this, annotated clause by clause, with a
fill-in-the-blanks template for your own BRD: **[`PROMPTS.md`](./PROMPTS.md)**.

The short version, for a BA:

> *"Read the business requirements document in `brd/`. Build a working
> click-through prototype that satisfies every requirement and business rule in
> it, using our existing design system. Tag each screen with the requirement
> references it satisfies. **Verify it in a real browser before you finish.**"*

And for a tester:

> *"Read the BRD in `brd/`. Write a test case for every requirement and every
> business rule, **each naming the reference it verifies**, with negative and
> boundary cases for every rule expressed as a limit. Then write a suite that
> runs them in a real browser and reports the same case IDs."*

---

## Layout

```
.
├── go.ps1                          the runner - both tracks
├── README.md                       you are here
├── RUN-SHEET.md                    presenter script: beats, words, Q&A
├── PROMPTS.md                      the exact prompts, annotated + a template
├── TESTER-PLAYBOOK.md              eight use cases for testers
├── brd/
│   ├── ato-bas-lodgment-brd.html        v1.0 - the business asset
│   └── ato-bas-lodgment-brd-v1.1.html   v1.1 - +REQ-009, +BR-10/11, BR-07 revised
├── assets/
│   └── screens.css                 the Lodge Assist design system, reused unmodified
├── prototype/                      built from BRD v1.0  - 6 screens
├── prototype-v2/                   built from BRD v1.1  - 7 screens, one conditional
├── prototype-rebuild/              an INDEPENDENT rebuild from BRD v1.0, produced by
│                                   one unattended .\go.ps1 -Live run. Scores 27/43
│                                   against the committed suite - see the README
├── testing/
│   ├── verify.mjs                  102 checks, real browser, exits 0/1
│   ├── smoke.mjs                   a visual walk that screenshots every screen
│   └── test-pack/
│       ├── cases.js                THE source of truth - cases, references, data
│       ├── acceptance-pack.html    the pack a tester walks, with live results
│       ├── traceability.html       coverage both ways, and the version delta
│       ├── test-data.html          synthetic data + the selector contract
│       ├── results.js / .json      written by verify.mjs - do not edit
│       └── pack.css                shared presentation
└── iteration/                      raw output of the verification run, and the full
                                    transcript of the -Live rebuild
```

**One source of truth, with one deliberate exception.** The pack, the matrix and
the data page are three views of `cases.js`. The automation reads the same file
for its case list, applicability and references, and **refuses to run** if the
two have drifted — a case marked automatable with no implementation, or an
implementation with no case, fails the run before a browser opens.

Its *expected values*, though, are written independently on purpose. `$14,500`
appears in the case text as a hand calculation of BR-07 and again in the
assertion as code. Two witnesses, not one — if the pack's arithmetic is wrong,
the check disagrees with it instead of inheriting the mistake.

---

## Honesty notes

Worth being straight about these if anyone asks — the demo is stronger for it.

- **Lodge Assist is fictional.** The program, sponsor, document reference,
  statistics and thresholds are invented. This is not an ATO service and not tax
  advice. The disclaimer is on every page, including inside the app, and the
  phone frame says **DEMO — NOT AN ATO SERVICE** rather than anything that could
  be mistaken for a live one.
- **The label codes and reason codes are real; what this does with them is not.**
  `G1`, `1A`, `1B`, `W1`, `W2`, `T7`, `T8`, `T9`, `T4`, `7A`, `7B` and the PAYG
  variation reason codes 21–27 are genuine identifiers, used because they make
  the example legible. The rules, thresholds, eligibility and consequences
  applied to them here are invented — including the 85% figure in BR-11.
- **The ABNs are synthetic, and the claim is no stronger than that.** They were
  generated to pass or fail the published check-digit algorithm so BR-01 could be
  tested at its boundary. They were **not** checked against the Australian
  Business Register, so a valid one could coincide with an issued ABN; none is
  intentionally associated with any entity. **No TFN appears anywhere** — the
  document deliberately never asks for one. Email addresses use the reserved
  `.example` domain.
- **Nothing is lodged, sent or stored.** The confirmation screen says so on its
  face — *"Simulated · nothing was sent"* — because a screenshot of a screen
  reading *"Statement lodged"* should not be able to travel on its own.
- **What is evidenced, and what is not.** Evidenced: that every automatable case
  ran against these pages in a real browser, with the raw output in
  [`iteration/`](./iteration) and [`results.json`](./testing/test-pack/results.json).
  Re-runnable by you in about two minutes. *Not* evidenced by this repository:
  the authoring history. Both prototypes and the pack were produced in a single
  Copilot CLI session without hand-written code, but you are taking that on
  trust — what you can check is the artefact and the suite.
- **The apps are pre-built** so the run is reliable and fits the slot. The script
  never fakes generation — it opens pages and prints cues.
- **`go.ps1` quotes no hard-coded results.** Every figure comes from
  `results.json`, and if any tested file is newer than the run it prints
  **STALE** and no number at all.
- **102 checks is not "fully tested".** It is complete against BRD-2026-118 and
  nothing more. Coverage of *references* is not coverage of *risk* — and
  `NFR-02` cites WCAG 2.2 AA, but four automated cases verify four specific
  criteria, not conformance.
- **Three of the six defects were found by review, not by the suite** — including
  one where a passing test was too weak to notice the bug it was pointed at.
  That is the honest state of any test pack, and it is why the exploratory
  caveat in the playbook matters.
- **This is prototype code, not production code** — the BRD says so itself
  (BR-09 and the note to delivery).
- **`file://` is not a shareable link.** To send it round, publish the static
  files to an approved host first.
- **No data goes anywhere.** Everything stays in the browser — and `TC-053`
  fails the run if any request leaves the page.

---

## Licence

MIT — see [LICENSE](./LICENSE).
