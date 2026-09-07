# Workshop: requirements, assertions, and evidence are different things

**Audience:** business analysts, testers, and delivery leads. **Time:** 60 minutes.
**Outcome:** a requirements delta, independent business-rule checks, and a
triaged failure report rather than an unexplained pass percentage.

Lodge Assist is fictional, not an ATO service or tax advice. Use only the
supplied synthetic data. Nothing is lodged, transmitted, or stored.

## 1. Distinguish the three run modes - 7 minutes

| Mode | Command from repo root | What it proves |
| --- | --- | --- |
| Replay preflight | `.\go.ps1 -Check` | Assets exist; reports saved evidence and freshness |
| Tester presentation | `.\go.ps1 -Tester -Manual` | Opens the existing test pack and traceability views |
| Fresh browser execution | `.\go.ps1 -Verify` after dependency setup below | Runs registered checks and rewrites saved results; missing-dependency bootstrap has additional side effects |

`-Check` can report **STALE** and still exit successfully because the assets
are present. Do not treat its exit code as a fresh browser-test result.
Timestamps are a useful freshness warning, not cryptographic provenance.

Fresh execution needs Node, Microsoft Edge, and the dependency declared in
[package.json](package.json), `playwright-core` **^1.57.0**.
Inspect the installed version with `npm ls playwright-core`. The replay does
not need those tools or network access.

On a fresh clone, run `npm ci` from the repository root to use the committed
lockfile, then inspect the resolved version. Installation requires network
access but does not update the lockfile. If `playwright-core` is
absent, `-Verify` instead runs an unspecified `npm install playwright-core`,
which can update `package.json` as well as the lockfile. Do not treat that
bootstrap as a pinned or non-writing check.

The new CI path runs the contract tests and both browser versions after a locked
install. Locally, `npm run verify -- --no-write-results` preserves saved result
files while still executing every selected assertion.

## 2. Trace a requirement through the evidence - 10 minutes

| Artifact | Purpose |
| --- | --- |
| [BRD v1.0](brd/ato-bas-lodgment-brd.html) / [v1.1](brd/ato-bas-lodgment-brd-v1.1.html) | Business rules and revision history |
| [cases.js](testing/test-pack/cases.js) | Case IDs, references, applicability, and human-readable expectations |
| [verify.mjs](testing/verify.mjs) | Executable assertions and browser-driving assumptions |
| [Acceptance pack](testing/test-pack/acceptance-pack.html) | Case-level presentation |
| [Traceability](testing/test-pack/traceability.html) | Forward/reverse links and revision impact |
| [Test data](testing/test-pack/test-data.html) | Synthetic data and selector contract |
| [results.json](testing/test-pack/results.json) and [results.js](testing/test-pack/results.js) | Saved outcomes and their browser presentation, not hand-authored expectations |

Pick `BR-07` and follow it to its cases, assertion, and actual displayed
result. Then reverse the direction: choose a case and find the requirement
that justifies it. A reference count with no meaningful assertion is not coverage.

```text
Trace BR-07 through the BRD, cases.js, and verify.mjs. Separate the business
expectation from DOM selectors and navigation assumptions. Do not edit any
expected result or saved output.
```

## 3. Calculate before automating - 10 minutes

For the supplied baseline amounts, independently calculate:

```text
(1A 8,000 - 1B 3,200) + W2 7,100 + T7 2,600 = 14,500
```

Check the review screen's working and result. Do not compute an expected value
by calling the same application helper that produced the displayed value.
That would make one implementation testify for itself.

In v1.1, identify when T9 replaces T7. Distinguish the new `REQ-009` from
the **revised** `BR-07`: new references need new cases, while changed rules
can require old cases to be re-baselined after business approval.

Keep nil, payable, and refundable outcomes distinct. Text can change without
changing arithmetic, but copy must still represent the right business outcome.

## 4. Probe the exact variation threshold - 10 minutes

Use the v1.1 prototype with T7 = 2600. BR-11's fictional threshold is strictly
**below** 85%, not less than or equal.

| Varied instalment | Expected observation |
| --- | --- |
| 2211 | No below-threshold warning |
| 2210 | Exactly 85%; no warning |
| 2209 | Warning and acknowledgement path |
| T7 = 0, T9 = 0 | No divide-by-zero or invented percentage |

At 2209, the displayed percentage must not round up to "85%" while claiming
to be below 85%. The captured implementation displays 84.9%.
Inspect the warning text and the acknowledgement behavior, not just whether
a string contains a percent sign.

Use the relevant `TC-08x` cases in the pack as anchors. Record actual values
from your own run; the original 102/102 result is historical until refreshed.

**Checkpoint:** explain why the exact-boundary and just-below-boundary checks
are distinct. Do not describe this fictional 85% rule as an actual tax obligation.

## 5. Challenge the test harness - 15 minutes

The committed alternate build is [prototype-rebuild/](prototype-rebuild/).
It is a separate generation, **not** a clean-room reconstruction: its recorded
run saw part of an earlier implementation.

With dependencies installed, run:

```powershell
node testing\verify.mjs v1.0 --target=prototype-rebuild
```

`--target` leaves the saved acceptance-pack results unchanged. A failing exit
code is expected in the historical exercise, whose captured score was 27/43.
Record today's output rather than assuming the count is unchanged.

Classify each failure:

| Classification | Evidence needed | Appropriate response |
| --- | --- | --- |
| Application defect | Behavior violates a cited BRD rule | Fix the application and add/retain a regression |
| Test defect | Assertion contradicts the agreed rule | Correct the test with an independent expected result |
| Selector/navigation coupling | Valid behavior reached through a different permitted UI | Repair the driver contract, not business expectations |
| Requirement ambiguity | BRD leaves the disputed behavior unspecified | Obtain a document-owner decision |
| Environment problem | Browser/dependency/setup failure before behavior | Repair setup and rerun |

Do not bulk-edit regular expressions or remove failing cases to improve the
percentage. A test can be brittle and still reveal a real defect elsewhere.

```text
Triage these failures against the BRD and the published selector contract.
For each, cite the assertion and observed behavior, assign a category, and
propose the smallest correction. Preserve independent arithmetic checks.
Do not claim the alternate build is defect-free.
```

## 6. Handoff and extension - 8 minutes

Keep the requirements delta, boundary table, case IDs, selected screenshots,
target directory, tool versions, run time, and failure classifications.
Attach the exact revision evaluated; never hand-edit `results.js` or
`results.json` to make a presentation green.

A useful extension is a second selector-compatible implementation whose
wording differs but whose arithmetic is the same. Demonstrate that the harness
detects a deliberately wrong amount while accepting permitted wording changes.

Accessibility references are valuable, but the existing automated cases do
not establish full WCAG conformance. Add manual keyboard, zoom, error-recovery,
and assistive-technology exploration as a separately recorded activity.

## Troubleshooting and reset

| Symptom | Action |
| --- | --- |
| `STALE` | Run fresh automation after preserving the historical artifacts |
| Edge cannot launch | Verify the installed browser/channel; do not substitute a screenshot for execution |
| Module not found | Install the declared package in this repo, not globally |
| Rebuild path missing | Use committed `prototype-rebuild`; `prototype-live` exists only after a new generation |
| Many downstream navigation failures | Diagnose the first driver assumption before interpreting later failures |

Replay requires no data reset beyond reloading the pages. Fresh verification
writes result artifacts and may bootstrap dependencies as described above;
inspect both result and dependency diffs before retaining them.
The shipped `-Live` mode grants all tools, so use a disposable clone or an
interactive approval-based session, never an unprotected working tree.

Guide reviewed **2026-09-07** against the shipped BRDs, case registry, and runner.
For a language-migration version of the oracle problem, continue with
[Demo 13](https://github.com/xavierxmorris/ghcp-demo-13-modernize-legacy-cobol-app).
