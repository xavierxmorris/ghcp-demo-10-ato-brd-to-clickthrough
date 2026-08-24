# TESTER PLAYBOOK — eight things a tester can do with a BRD before there is a build

> **Audience:** test analysts, test leads, QA engineers.
> **Prerequisite:** Copilot, a folder, and a business requirements document.
> **What you get:** a traced test pack, a bidirectional coverage matrix, synthetic
> data at the boundaries, and a suite that runs in a real browser and reports
> your own case IDs.

The business-analyst story in [`README.md`](./README.md) stops at *"the BRD became
an app."* For a tester that is where the interesting part starts, because the
same document that produced the build can produce the pack that tests it — and
both can be checked against each other.

Everything below is real and in this repo. Open
[`testing/test-pack/acceptance-pack.html`](./testing/test-pack/acceptance-pack.html)
and you are looking at the output.

---

## Why this matters more for testers than for anyone else

A test pack written from a BRD is normally three weeks of typing, goes stale on
the first revision, and nobody can answer *"is BR-06 covered?"* without reading
all of it.

Three things change that here:

1. **Every case names the reference it verifies.** Not in a spreadsheet
   somewhere — in the case itself.
2. **The pack and the automation read the same file.** `testing/test-pack/cases.js`
   is the single source of truth for case IDs, references and applicability. The
   human pack, the coverage matrix and the data tables are three views of it, and
   the executable suite reads it too — **refusing to run** if a case is marked
   automatable with no implementation, or an implementation exists with no case.
   Expected *values* are written twice on purpose: the hand calculation in the
   case text and the assertion in code are two witnesses, not one.
3. **Coverage is answerable in both directions.** Every reference with no case is
   a gap. Every case with no reference is a test nobody asked for. Both are
   listed on [`traceability.html`](./testing/test-pack/traceability.html).

---

## UC-1 — Generate a traced test pack from the document

> *"Read the business requirements document in `brd/`. Write a test case for
> every requirement and every business rule in it. Each case must state a
> precondition, numbered steps, an expected result, and the reference it
> verifies. Include negative and boundary cases for every rule expressed as a
> limit or a comparison."*

**What this repo has:** 59 cases for v1.1, 43 for v1.0, all in
`testing/test-pack/cases.js`, rendered at
[`acceptance-pack.html`](./testing/test-pack/acceptance-pack.html).

**The clause that carries the weight** is *"and the reference it verifies."*
Without it you get a readable pack that nobody can audit. With it, coverage
becomes a query rather than a reading exercise.

---

## UC-2 — Get the boundary cases you would have argued about in UAT

Rules stated as limits are where builds fail and where testers earn their keep.
BRD-2026-118 has five of them, and the pack tests both sides of each.

| Rule | The line | Cases |
|---|---|---|
| BR-01 | ABN is *eleven* digits, check digit must pass | ten, eleven-that-fails, eleven-that-passes, twelve |
| BR-04 | zero or greater, whole dollars | `0` accepted, `-1` refused, `1000.50` refused, `1000.00` refused |
| BR-05 | 1A **cannot exceed** G1 | equal accepted, one dollar over refused |
| BR-06 | W2 **cannot exceed** W1 | equal accepted, one dollar over refused |
| BR-11 | warn **below** 85%, not **at** 85% | 2,210 of 2,600 silent, 2,209 warns |

That last row is the one to point at. *"Less than 85%"* and *"85% or less"* are
one word apart in a document and one defect apart in a build. TC-085 and TC-086
pin it at the dollar.

> **Worth reading:** the note on TC-085. We assumed `t9 < t7 * 0.85` would be
> wrong in floating point, wrote the case to prove it, and it turned out the
> float form is fine for the values that matter. The build still compares
> integers — exact by construction beats exact by luck — but the honest record
> is that the test corrected *us*, not the code.

---

## UC-3 — Answer "is it covered?" in both directions

> *"Produce a traceability matrix from the test pack. Forward: every requirement
> and business rule, and the cases that verify it. Backward: every case, and the
> references it claims. List anything uncovered in either direction."*

**What this repo has:** [`traceability.html`](./testing/test-pack/traceability.html) —
24 references, 0 untraced, 3.2 cases per reference for v1.1, with the version
switchable. Anything uncovered turns red.

This is the artefact that ends the *"did we test BR-06?"* conversation, and it is
a page a test lead can put in front of a governance forum without editing.

---

## UC-4 — Work out what a revision breaks

This is the use case that does not exist without the document being the source
of truth.

> *"BRD-2026-118 has been revised to v1.1. Compare it with v1.0. For each change,
> say whether it adds cases, obsoletes cases, or re-baselines existing ones.
> Flag every case whose expected result may no longer hold."*

**What this repo has:** the *What changed between versions* table at the bottom of
[`traceability.html`](./testing/test-pack/traceability.html).

The distinction it draws is the whole point:

| Change | Type | Consequence for the pack |
|---|---|---|
| REQ-009, BR-10, BR-11 | **Added** | New cases. Nothing existing is affected. |
| **BR-07** | **Revised** | **TC-040, TC-041, TC-042 must be re-baselined** — they existed in v1.0, their expected results were agreed against the old wording, and those results are superseded until someone re-reads all three. **TC-088 is new**, written for the behaviour that actually changed. |

Note the distinction the matrix makes and the first draft of this page did not:
a case introduced *with* the revision is a new case, not a superseded agreement.
Conflating the two overstates the disruption, and a test lead reading the pack
will spot it in about four seconds.

**The sting is that all three re-baselined cases still pass.** Nothing about the
unvaried calculation changed. A rule that was *revised* is far more dangerous
than one that was *added*, precisely because the tests against it keep going
green while quietly checking last quarter's agreement. The pack marks
re-baselined cases explicitly, and section 8 of BRD v1.1 asks for exactly that.

---

## UC-5 — Generate synthetic data that hits the rules

> *"Produce test data for every rule in the document. For the ABN rule, generate
> values that pass and values that fail the published check-digit algorithm.
> Everything must be synthetic — no real identifiers."*

**What this repo has:** [`test-data.html`](./testing/test-pack/test-data.html) — four
tables covering ABNs, monetary values, hand-calculated net amounts and the
variation boundary.

**The guard rail is not optional.** Say *"synthetic only, nothing that could
identify a real entity"* in the prompt and say it again in the artefact. This
repo's data page opens with that statement, the ABNs are visibly patterned
(`26 262 626 210`, `55 555 555 550`), emails use the reserved `.example` domain,
and no TFN appears anywhere — the document deliberately never asks for one.

**Be precise about what "synthetic" buys you.** Generating a check-digit-valid
ABN does *not* prove it is unassigned; nothing here was looked up against the
register. The honest claim is *"generated to exercise the rule, not
intentionally associated with any entity"* — not *"cannot identify anyone"*.
If your organisation needs the stronger claim, you need a lookup, and that
belongs in the prompt.

---

## UC-6 — Let it write and run the checks, then read what it found

> *"Write an executable suite that runs the automated cases from the test pack
> against the prototype in a real browser, over `file://`. Report results
> against the same case IDs. Fail the run if any case fails."*

**What this repo has:** [`testing/verify.mjs`](./testing/verify.mjs) — 102 checks
across both versions, driving Microsoft Edge. Run it:

```powershell
node testing\verify.mjs          # both versions
node testing\verify.mjs v1.1     # one
node testing\verify.mjs --headed # watch it
```

It writes `testing/test-pack/results.js` and `results.json`, which the acceptance
pack picks up, so the human pack shows live pass/fail beside each case. It also
refuses to start if the pack and the harness have drifted — a case marked
automatable with no implementation, or an implementation with no case.

**Three defects came out of this, and they are worth quoting because they are the
kinds of thing a hand walk-through misses:**

| Found | What it was |
|---|---|
| **v1.1 threw on load** | `updateGic()` still referenced `#gicAckError`, an element deleted when the acknowledgement was restructured. The exception aborted start-up before the first render, so the traceability strip was blank on the opening screen — and *only* the opening screen, because every later render was triggered by a click. TC-061 caught the symptom, the console assertion caught the cause. |
| **A panel clipped to 26 px** | On the GST screen with all three labels refused at once, the running-total panel was squashed from 123 px to 26 px. The label sheet was a CSS grid that shrank, and its auto rows compressed instead of scrolling. Nobody would have seen it without entering three errors at once. |
| **A bug in the harness itself** | The first clipping check flagged the introduction artwork, whose decorative blur deliberately bleeds past its own box. The check was wrong, not the art. Fixing the *test* is a result too — an assertion that cries wolf gets switched off within a fortnight. |

### And three the suite did *not* find — the more useful lesson

A green suite is a claim about the assertions you wrote, not about the product.
These came out of review, after 93 of 93 were passing:

| What | Why the suite missed it |
|---|---|
| **The interest warning read "85%" while firing.** 2,209 of 2,600 is 84.96%; `Math.round` made it say 85 — on the exact beat where the demo claims 85% does *not* warn. | **TC-086 only asserted the string ended in `%`.** The assertion was too weak to notice. Now it asserts the number is below 85, and the app floors instead of rounding. |
| **TC-070–073 traced to the wrong requirements.** They pointed at REQ-007 and REQ-001, neither of which mentions target size, contrast or clipping. Section 6 was **unnumbered**, so the matrix could not see it — coverage theatre on the page that argues against coverage theatre. | **Nothing checks that a trace is *apt*.** "0 untraced" only proves each case named *a* reference. Section 6 is now NFR-01–NFR-04 and the cases point at them. If a requirement isn't numbered, your coverage report cannot report on it. |
| **Control borders were 1.46:1**, against the 3:1 WCAG 2.2 SC 1.4.11 wants — and against the design system's own header comment. | **Nothing measured contrast.** TC-070 measured *size*. The contrast claim was written, not tested. Fixed with a dedicated `--control-edge` token at 3.8:1. |

If you take one thing from this section: **write the assertion so it can fail.**
`/%$/` cannot fail. `< 85` can.

---

## UC-7 — Test accessibility as a requirement, not an afterthought

Section 6 of the BRD is not decoration — but in the first draft it was
**unnumbered**, and that made it invisible to the coverage matrix. The
accessibility cases traced to REQ-007 and REQ-001, which say nothing about
target size or contrast. The fix is the lesson:

> **Number your non-functional requirements.** `NFR-01` interactive targets
> ≥ 44 × 44. `NFR-02` WCAG 2.2 Level AA, refused controls marked and associated
> with their message, status messages announced. `NFR-03` no error by colour
> alone. `NFR-04` nothing clipped at 390 × 844 in any state.

An unnumbered requirement is one your coverage report cannot report on.

| Case | Verifies | Checks |
|---|---|---|
| TC-070 | NFR-01 | every interactive control in the frame is at least 44 × 44 CSS px |
| TC-071 | NFR-03 | every error carries text **and** a non-colour indicator |
| TC-072 | NFR-02 | a refused control is marked invalid and points at its message |
| TC-073 | NFR-04 | nothing is clipped at 390 × 844, including every error state |
| TC-074 | NFR-02 | the interest warning is **announced** when it appears (SC 4.1.3) |

TC-070 measures the *label* for a checkbox or radio, not the 22 px box inside it,
because that is what a finger actually hits. Getting that distinction right in
the harness is the difference between a useful check and a wall of false
failures.

TC-074 exists because a review found the warning panel appearing silently as a
side effect of typing: a screen-reader user entered the amount, heard nothing,
and was then refused by a checkbox they were never told had appeared.

**Be honest about the limit.** These five cases verify five specific criteria.
They do **not** establish WCAG 2.2 AA conformance, and no automated suite can.
Contrast is the proof: the control borders sat at 1.46:1 against the 3:1 that
SC 1.4.11 requires — through 93 passing checks — because nothing measured it.

---

## UC-8 — Keep the automation alive across the next rebuild

The honest warning in most of these demos is that generated markup is not stable
between runs, so tests written against one build will not survive the next.

This repo takes the other route: **the selectors are a documented contract.** The
table at the bottom of [`test-data.html`](./testing/test-pack/test-data.html) lists
every identifier the suite depends on. Put that table in the prompt and the next
build has to honour it:

> *"Rebuild the prototype from the BRD. Honour the selector contract in
> `testing/test-pack/test-data.html` exactly — the automated suite in
> `testing/verify.mjs` must pass against your output without modification."*

That turns *"the tests broke again"* into a build failure with a name.

---

## The five lines to keep in your own prompts

| Line | What goes wrong without it |
|---|---|
| *"…and the reference it verifies"* | A readable pack that cannot be audited. |
| *"negative and boundary cases for every rule expressed as a limit"* | Happy path only. The defects live at the edges. |
| *"say whether the change adds, obsoletes, or re-baselines"* | Revised rules keep passing against last quarter's agreement. |
| *"everything must be synthetic — no real identifiers"* | Real-looking data in a repo. Say it in the prompt **and** in the artefact. |
| *"fail the run if any case fails"* | A suite that reports and nobody reads. |

---

## What this does not do

Straight answers, because a tester will ask.

- **It is not a replacement for exploratory testing.** Everything here is derived
  from the document. The most valuable defects you find will be the ones the
  document never mentioned — and *those* are the ones to take back to the BA.
- **It only tests what was written down.** A pack generated from a vague BRD is a
  vague pack. Garbage in still applies.
- **102 automated checks is not "fully tested".** It is complete against
  BRD-2026-118 and nothing more. There is no backend, no identity, no
  integration, and none of the real world's data.
- **Coverage of references is not coverage of risk.** Every reference having a
  case says nothing about whether the *right* cases were written. That judgement
  is still yours.
- **This is prototype code.** The BRD says so. Test packs written against a
  prototype are a head start on the real ones, not a substitute.
- **The figures, rules and thresholds are invented.** Lodge Assist is a fictional
  service in a fictional program. Nothing here is affiliated with, endorsed by,
  or representative of the Australian Taxation Office, and nothing here is tax
  advice.

---

## Files

```
testing/
├── verify.mjs                      the executable suite - 102 checks, real browser
├── smoke.mjs                       a visual walk that screenshots every screen
└── test-pack/
    ├── cases.js                    THE source of truth - cases, refs and data
    ├── acceptance-pack.html        the pack a tester walks, with live results
    ├── traceability.html           coverage both ways, and the version delta
    ├── test-data.html              synthetic data + the selector contract
    ├── results.js                  written by verify.mjs - do not edit
    └── pack.css                    shared presentation
```
