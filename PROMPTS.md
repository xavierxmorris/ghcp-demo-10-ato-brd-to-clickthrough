# PROMPTS — how to turn a BRD into a working app, and a test pack that runs itself

These are the prompts that produced this repository. Two of them are for a
business analyst; two are for a tester. Copy them, fill in the bracketed bits,
and keep the lines marked load-bearing.

You need Copilot and a folder. You do not need to write code.

> Everything here was run against a **fictional** BRD for a **fictional** service.
> Nothing in this repository is affiliated with, endorsed by, or representative of
> the Australian Taxation Office, and nothing in it is tax advice.

---

## Prompt 1 — build the app from the BRD

Run this from the repo root with the BRD already in `brd/`.

```text
Read the business requirements document at brd/ato-bas-lodgment-brd.html.
Build a working click-through prototype that satisfies every requirement REQ-001 to
REQ-008 and every business rule BR-01 to BR-09 in it. Put it in a new folder called
prototype, as index.html plus prototype.css plus app.js. It must run straight from the
filesystem by double-clicking index.html, with no server, no framework, no library, no
build step and no CDN. Use the existing Lodge Assist design system at
assets/screens.css exactly as it is - link to it, reuse its existing classes and CSS
variables, and do not modify that file. Present the journey inside a 390x844 phone
frame centred on the page. This is used by a sole trader on their own phone, often
outside business hours and under time pressure near the due date, so keep tap targets
at least 44x44, meet WCAG 2.2 AA, and never signal an error by colour alone. Every
refusal message must name the business rule that refused it. On every screen section
add a data-req attribute listing the requirement references that screen satisfies, and
show a small trace strip under the phone that reads the current screen's data-req live,
plus a toggle that labels those references on the screen itself. Do not modify any file
or folder outside prototype, and remove any scratch folders you create. Verify your
work in a real browser before you finish: walk the whole journey, check every
requirement and rule, and confirm nothing is clipped or unreachable at 390x844. Stop
once the journey works end to end and nothing is clipped - do not keep polishing.
Finish by listing which requirement each screen satisfies, and anything you had to
decide that the document did not specify.
```

### Why each clause is there

| Clause | What it buys you |
|---|---|
| *"Read the business requirements document at …"* | The BRD is the **input**, not a summary you retyped. Point at the file. |
| *"satisfies every requirement REQ-001 to REQ-008 and every business rule BR-01 to BR-09"* | Names the contract explicitly, so nothing quietly gets skipped. |
| *"run straight from the filesystem … no server, framework, build step, CDN"* | The single most valuable constraint. **Anyone** can open it, on a locked-down laptop, forever. |
| *"Use the existing design system … do not modify that file"* | Output looks like your product instead of a generic form. |
| *"inside a 390x844 phone frame"* | Stops it building a desktop page when the journey is mobile. |
| *"44x44 … WCAG 2.2 AA … never by colour alone"* | Lift this from your BRD's brand section. It changes real design decisions, and it is testable. |
| **"Every refusal message must name the business rule that refused it"** | **The line that makes the demo land.** *"That ABN did not pass the check-digit test. (BR-01)"* is the bridge from the document to the build. |
| *"add a data-req attribute … trace strip … toggle"* | **The BA superpower.** Every screen declares which requirements it meets, so you can mark the build against your own acceptance criteria. |
| *"Do not modify any file or folder outside prototype"* | Cheap to write, saves a bad afternoon. |
| *"Verify your work in a real browser before you finish"* | **Do not skip this line.** It is the difference between a first draft and something that has been checked. |
| *"Stop once the journey works … do not keep polishing"* | The single biggest cost control. Unbounded, a run will chase sub-pixel hit areas long past useful. |
| *"…anything you had to decide that the document did not specify"* | It **will** fill gaps your BRD left. That list is your next set of requirements. |

---

## Prompt 2 — change the BRD, and let the app follow

Revise the document first: bump the version, add the new requirement and rules,
**mark what changed**, and be explicit about whether a rule was *added* or
*revised*. Then:

```text
The business requirements document has been revised. Compare
brd/ato-bas-lodgment-brd.html (v1.0) with brd/ato-bas-lodgment-brd-v1.1.html (v1.1)
and identify what changed - separating what was ADDED from what was REVISED. Copy the
prototype folder to a new folder called prototype-v2, then update prototype-v2 so it
satisfies the revised document, including the newly added requirement and rules AND
the revised wording of any rule that changed. Keep everything else exactly as it is:
same visual style, reuse assets/screens.css unmodified, no framework, library, build
step or CDN, and it must still run straight from the filesystem. Keep the data-req
traceability attributes and the trace strip accurate for any screen you change, and
update the BRD version reference shown on the page to match the revised document.
Where the revision makes a step conditional, the step counter and progress bar must
reflect the journey the lodger is actually on, not a hard-coded total. Do not modify
the original prototype folder or either BRD. Verify your work in a real browser before
you finish, and remove any scratch folders you create.
```

### Why each clause is there

| Clause | What it buys you |
|---|---|
| *"Compare v1.0 with v1.1 and identify what changed"* | **This is the whole idea.** You describe the change in the document you already own. |
| **"separating what was ADDED from what was REVISED"** | A revised rule is far more dangerous than an added one, because the existing behaviour still *looks* right. Here, `REQ-009` was added and `BR-07` was revised — different consequences entirely. |
| *"Copy the prototype folder to a new folder"* | You keep the version everyone already signed off. |
| *"Keep everything else exactly as it is"* | Stops unrelated drift, so the diff is reviewable. |
| *"the step counter … must reflect the journey the lodger is actually on"* | Conditional steps are where hard-coded totals rot. Say it once and you never have a *"Step 4 of 4"* on a five-step journey. |
| *"Do not modify the original prototype folder or either BRD"* | Explicit guard rails. |

---

## Prompt 3 — generate the test pack *(for testers)*

```text
Read the business requirements document at brd/ato-bas-lodgment-brd-v1.1.html.
Produce a test pack in testing/test-pack as a single data file plus HTML views of it.
Write at least one test case for every requirement and every business rule. Each case
must have an ID, a precondition, numbered steps, an expected result, a type, and the
document reference or references it verifies. Include negative and boundary cases for
every rule expressed as a limit or a comparison - test both sides of the line, one unit
apart. Include accessibility cases for the target size and error-signalling rules in
section 6. Mark which cases are automatable. Also produce synthetic test data for every
rule: for the ABN rule generate values that pass and values that fail the published
check-digit algorithm. Everything must be synthetic - nothing that could identify a
real entity, and no tax file numbers anywhere. Render the pack, a bidirectional
traceability matrix and the data as HTML pages that read the same data file, so they
cannot drift apart. The pages must open from the filesystem with no server.
```

### The lines that matter

| Line | What goes wrong without it |
|---|---|
| **"and the document reference or references it verifies"** | A readable pack that nobody can audit. Coverage becomes a reading exercise instead of a query. |
| **"negative and boundary cases … both sides of the line, one unit apart"** | Happy path only. *"Cannot exceed"* and *"must be less than"* are one word apart in a document and one defect apart in a build. |
| *"Mark which cases are automatable"* | Otherwise everything looks automatable until someone tries. |
| **"Everything must be synthetic … no tax file numbers anywhere"** | Real-looking identifiers in a repository. Say it in the prompt **and** print it on the artefact. |
| **"read the same data file, so they cannot drift apart"** | Three artefacts that disagree by the second sprint. This is what makes the coverage number worth anything. |

---

## Prompt 4 — make the pack executable *(for testers)*

```text
Write testing/verify.mjs. It must read the same test pack data file, run every case
marked automatable against both prototypes in a real browser over file://, and report
results against the same case IDs. Drive the real UI - never bypass a validation rule
or jump straight to a screen. Assert on what the document says, not on what the code
does: check the calculated net against a hand calculation, check that each refusal
message cites the correct rule, and check the interest-charge boundary at exactly the
threshold and one unit below it. Also assert that no request leaves the page, that
nothing is clipped at 390x844 in any state including every error state, and that every
interactive control is at least 44x44 - measuring the label for a checkbox or radio,
not the box inside it. Write the results to a file the HTML pack reads, and to plain
JSON. Exit non-zero if any case fails.
```

### The lines that matter

| Line | What goes wrong without it |
|---|---|
| **"Drive the real UI — never bypass a validation rule"** | A suite that tests the test harness. If it can skip a screen, it is not checking the journey. |
| **"Assert on what the document says, not on what the code does"** | Tests that ratify the bug. The $14,500 in `TC-040` is a hand calculation of BR-07, not a value read out of the app. |
| *"measuring the label for a checkbox, not the box inside it"* | A wall of false failures on every 22 px checkbox, and the check gets switched off. |
| *"Write the results to a file the HTML pack reads"* | The pack and the run disagree, and the human pack goes stale. |
| *"Exit non-zero if any case fails"* | A suite that reports and nobody reads. |

---

## Adapt it to your own BRD

Copy this and fill in the five bracketed bits. Everything else is load-bearing.

```text
Read the business requirements document at [PATH TO YOUR BRD].
Build a working click-through prototype that satisfies every requirement and every
business rule in it. Put it in a new folder called [OUTPUT FOLDER NAME], as index.html
plus prototype.css plus app.js. It must run straight from the filesystem by
double-clicking index.html, with no server, no framework, no library, no build step
and no CDN.
Use the existing design system at [PATH TO YOUR STYLESHEET OR TOKENS] exactly as it is
- link to it, reuse its existing classes and variables, and do not modify that file.
Present the journey inside a [390x844 phone frame / desktop layout] centred on the page.
[ONE SENTENCE OF REAL-WORLD CONTEXT: who uses this, where, and under what conditions.]
Every refusal message must name the business rule that refused it.
On every screen section add a data-req attribute listing the requirement references
that screen satisfies, and show a small trace strip that reads the current screen's
data-req live, plus a toggle that labels those references on the screen itself.
Do not modify any file or folder outside [OUTPUT FOLDER NAME], and remove any scratch
folders you create.
Verify your work in a real browser before you finish: walk the whole journey, check
every requirement and rule, and confirm nothing is clipped or unreachable at the
target screen size.
Stop once the journey works end to end and nothing is clipped - do not keep polishing.
Finish by listing which requirement each screen satisfies, and anything you had to
decide that the document did not specify.
```

No design system to point at? Drop that sentence and add: *"Pick a clean, modern
visual style and apply it consistently across every screen."*

---

## Writing the BRD so this works well

The prompt matters less than the document. Five things make the output
dramatically better, and a good BA is already doing four of them.

1. **Number your requirements and rules.** `REQ-001`, `BR-01`. They become the
   contract, the traceability tags, and your test checklist.
2. **Write rules as testable statements.** *"GST on sales (1A) cannot exceed total
   sales (G1)"* produces validation and two boundary cases. *"The form should be
   user-friendly"* produces nothing.
3. **State limits precisely, and say what happens *at* the limit.** BR-11 in this
   repo says *"less than 85% … a varied amount of exactly 85% does not trigger the
   warning."* That second clause is worth more than the first.
4. **Add a brand and visual direction section.** Point at your design system, name
   the target screen size, and say who uses it and where. In this repo, *"on their
   own phone, outside business hours, under time pressure"* is why the tap
   targets are the size they are.
5. **Add a test and assurance section.** Ask for traceability in both directions
   and for negative and boundary cases on every limit. Section 8 of
   `ato-bas-lodgment-brd.html` is four sentences long and it is the reason
   `traceability.html` exists.

---

## What to expect, honestly

- **It is not instant.** Budget 20–30 minutes for a build run. Most of that is it
  testing and fixing its own work. Compare it to the queue the BRD would
  otherwise sit in.
- **It will make design decisions the BRD didn't specify.** Here it gave the
  variation its own screen rather than squeezing three labels onto the PAYG page.
  Review those decisions — they are a conversation with your stakeholders, not a
  defect.
- **It will find real defects, including in your tests.** In this repo the checks
  caught a start-up exception, a panel clipped to 26 px, and a false positive in
  the harness itself. Review then caught three more the green suite had missed —
  including an assertion too weak to fail. See the README for the detail.
- **A green suite is a claim about your assertions, not your product.** Write
  every assertion so it *can* fail. `/%$/` cannot. `< 85` can.
- **Markup is not stable between independent runs.** If you want automation that
  survives a rebuild, publish a selector contract and put it in the prompt — see
  UC-8 in [`TESTER-PLAYBOOK.md`](./TESTER-PLAYBOOK.md).
- **It is a prototype, not production.** That is the point: it is the artefact the
  business signs off, and the starting point for the delivery team.

---

## Reproduce it yourself

```powershell
.\go.ps1 -Live      # rebuild the app from the BRD into prototype-live\
.\go.ps1 -Verify    # re-run every check and rewrite the results
```

`-Verify` touches nothing but the results files. `-Live` is told to write only into `prototype-live\` — that is an instruction in the prompt, not a sandbox, so commit your work first.
