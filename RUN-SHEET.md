# Run-sheet — two 90-second tracks from one BRD

**Prerequisites:** none. No Node, no server, no design-tool licence, no network.
**One command:**

```powershell
.\go.ps1              # business analyst track
.\go.ps1 -Tester      # tester track
```

Presenting live? Add `-Manual` so questions can't run down the clock — you
advance each beat with Enter.

> **Say this in the first ten seconds, every time:** *"Lodge Assist is made up.
> This isn't an ATO service, it's not affiliated with the ATO, and none of the
> numbers are real."* It is on every page, but say it out loud anyway. It costs
> you three seconds and it removes the only objection that can derail the room.

---

## Which track for which room

| Room | Track | The sentence you're selling |
|---|---|---|
| BAs, product owners, delivery leads, execs | default | *"Your BA takes a document they already own and gets a working demo out of it — without writing code."* |
| Testers, test leads, QA, assurance, audit | `-Tester` | *"The same document produces the test pack, and the pack proves its own coverage — before there is anything to test."* |
| Mixed | default, then beats 3–4 of `-Tester` | Do the app, then the boundary. Skip the matrix. |

---

# Track 1 — the business analyst

### 0:00 — The business asset *(15s)*
Opens **`brd/ato-bas-lodgment-brd.html`** — BRD-2026-118 v1.0.

> "One page. Eight requirements, nine business rules, a sponsor, and a status of
> *approved for build*. Your BA wrote this. Everyone in this room has signed one."

> "Today, one in five self-prepared statements needs a correction. The biggest
> single cause is the net amount — and that's a figure the lodger can't see until
> **after** they've lodged. Seventeen days to fix, on average."

> "And this document now waits in a queue until a developer is free."

Point at **acceptance criterion 2** — *"every screen traces to at least one
requirement reference."* You'll cash that cheque in thirty seconds.

### 0:15 — The ask *(12s)*
The prompt appears, followed by the **measured** facts of the run — read from
`results.json`, not typed into the script.

> "Read the BRD. Build a working click-through prototype that satisfies every
> requirement and business rule in it, using our existing design system. Tag each
> screen with the references it satisfies. **Verify it in a real browser before
> you finish.**"

> "One sentence. And the BRD is the input — not a spec somebody rewrote into
> developer language first."

### 0:27 — The app *(26s)* — **drive it yourself**
Opens **`prototype/index.html`**.

1. **Start your statement**.
2. Press **`d`** to fill it *(or type a real audience member's name — much better)*.
3. **Change the last digit of the ABN** and hit Continue.

> "It doesn't just say *invalid*. It says *that ABN didn't pass the check-digit
> test* — and it tells you **which rule** refused it. **BR-01.** That's the
> document, in the app, in the error message."

4. Fix it, continue through **GST** and **PAYG** to **Check your statement**.

> "Look at the top of the review. It isn't just showing you $14,500 — it's showing
> you the working: *one-A minus one-B, plus W2, plus T7*. That's business rule
> seven, printed on the screen so your BA can check it by hand."

5. **Point at the trace strip** under the phone: *Screen 5 of 6 · REQ-006 REQ-008
   BR-07 BR-08.*

> "Every screen declares which requirements it satisfies. Tick *Show BRD refs on
> the screen* and it labels them in place. That's the acceptance criterion from
> the document — met, and checkable by the person who wrote it."

### 0:53 — The revision *(22s)* — **the beat that proves the claim**
**`…-brd-v1.1.html`** opens, then **`prototype-v2/index.html`**.

> "Trading conditions changed, so self-lodgers need to vary their instalment. The
> BA opens the BRD and marks it up — see the change bars."

> "But look carefully. **REQ-009 was *added*.** And **BR-07 was *revised*** — the
> sum now uses the varied amount instead of the original instalment. Those are
> very different things, and I'll come back to why."

**Drive v2:** press **`v`** → there's now a **Vary your instalment** step →
the step counter reads **Step 4 of 5**, not 4 of 4 → the review shows **T8, T9,
the reason code**, an *instalment varied* notice, and the working now names
**T9**, not T7.

**Close on this:**

> "Nobody wrote a change request in code. The analyst changed the document they
> already own, and the build followed it — including the counter, which went from
> four steps to five because the journey genuinely did."

---

# Track 2 — the tester

### 0:00 — The document asks for it *(15s)*
Opens **`…-brd-v1.1.html`**. Scroll to **section 8, Test and assurance**.

> "Four sentences. Every requirement and every rule carries at least one case.
> Coverage reportable in both directions. Negative and boundary cases for every
> rule expressed as a limit."

> "That's not a wish in a test plan. That's a **testable clause in the document
> the business signed.**"

### 0:15 — The ask *(14s)*
> "Read the BRD. Write a test case for every requirement and every rule, **each
> naming the reference it verifies**, with negative and boundary cases for every
> limit. Then write a suite that runs them in a real browser and reports the same
> case IDs."

> "One source of truth. The human pack, the coverage matrix and the data tables
> are three views of the same file — and the automation reads that same file for
> its case list. If they ever disagree, the suite refuses to run."

### 0:29 — The pack *(20s)*
Opens **`testing/test-pack/acceptance-pack.html`**.

> "Fifty-nine cases for v1.1. Every one has a precondition, numbered steps, an
> expected result — and the reference it verifies, right there in the second
> column."

**Point at the green column on the right.**

> "That's not a claim. That's a real browser run: a hundred and two checks across
> both versions, in Edge, over the filesystem. A hundred and two out of a hundred
> and two."

Switch the **version buttons** v1.1 → v1.0.

> "And the pack moves with the document."

### 0:49 — The matrix *(22s)* — **the beat that lands with an audit function**
Opens **`testing/test-pack/traceability.html`**.

> "Twenty-four references. None untraced. Forward: every requirement, every
> non-functional requirement and every rule, and what verifies it. Backward:
> every case, and what it claims. Both directions, because a test that traces to
> nothing is a test nobody asked for."

**Scroll to the bottom — *What changed between versions*.**

> "Here's the part I promised to come back to. REQ-009 was **added** — that's just
> new cases, nothing existing is affected."

> "BR-07 was **revised**. Different animal. Three existing cases — forty,
> forty-one and forty-two — have to be **re-baselined**: their expected results
> were agreed against the old wording, so somebody has to re-read all three
> before anyone can trust them again. Plus one new case, eighty-eight, for the
> behaviour that actually changed."

> "And here's the sting: all three of those cases still **pass**. A revised rule
> is the dangerous one, because the old tests keep going green while quietly
> checking last quarter's agreement. This page is what tells you to go and look."

### 1:11 — The boundary *(20s)*
Opens **`test-data.html`** and **`prototype-v2/index.html`**.

> "BR-11 says the interest warning appears when you vary to **less than** 85% of
> your instalment — and that exactly 85% does **not** warn."

**Press `v`, go to the variation step.** The instalment is $2,600, so 85% is
exactly $2,210.

- Type **2210** → nothing. Silence.
- Type **2209** → the interest charge warning appears, and you can't continue
  until you acknowledge it.

> "TC-085 and TC-086. One word in the document — *less than* — and one dollar in
> the build."

---

## The measured claims — quote these, not rounder ones

| | |
|---|---|
| Automated checks | **102 / 102 passing** — 43 for v1.0, 59 for v1.1 |
| Executed in | Microsoft Edge (Chromium), headless, over `file://` |
| References in v1.1 | **24** — 9 requirements, 4 non-functional requirements, 11 business rules |
| Untraced references | **0**, both directions. 3.2 cases per reference |
| Defects found during the build | **6** — three by the automation, three by review. All fixed |

`go.ps1` reads these from `testing/test-pack/results.json`, which is written by
the run. **It cannot print a number nobody took** — and if any file the suite
tested has changed since, it prints **STALE** and no figure at all. Re-take them
with `.\go.ps1 -Verify`.

The three defects are worth saying out loud, because they show it did the
**checking**, not just the typing:

- **v1.1 threw on load.** A dead element reference aborted start-up before the
  first render, so the traceability strip was blank on the opening screen — and
  *only* the opening screen, because every later render came from a click.
- **A panel was clipped to 26 px** on the GST screen when all three labels were
  refused at once. You only see it if you enter three errors simultaneously.
- **A false positive in the harness itself** — the intro artwork's decorative blur
  deliberately bleeds past its own box, and the first clipping check counted that
  as clipped. Fixing the *test* is a result too.

**And be ready for the sharper question: what did the suite miss?** Three more
came out of review while it was showing 93 of 93 — a warning that read "85%"
while firing, accessibility cases traced to requirements that did not cover them,
and control borders at 1.46:1 against a 3:1 standard. If someone asks, that is
the best answer in the deck: *a green suite is a claim about the assertions you
wrote, not about the product.* The detail is in `TESTER-PLAYBOOK.md`, UC-6.

And a seventh, which is the best one: *"we asserted the float comparison would
break at exactly 85%, wrote a case to prove it, and found it doesn't. The test
corrected us, not the code."*

---

## What to say if asked

| Question | Answer |
|---|---|
| "Is this an ATO system?" | **No.** Lodge Assist is fictional, this is not affiliated with or endorsed by the ATO, and the rules and figures are invented. The disclaimer is on every page including inside the app. |
| "Are those real ABNs?" | They're synthetic — generated to pass or fail the published check-digit algorithm so the rule can be tested at its boundary. Be precise if pressed: they weren't checked against the register, so a valid one *could* coincide with an issued ABN. None is intentionally associated with an entity, there's no TFN anywhere, and the emails use the reserved .example domain. |
| "Did Copilot really build that from the BRD?" | Yes, in one session, with no hand-written code — but be straight that the repo evidences the *artefact*, not the authoring. What you can check on the spot is the suite: offer to run `.\go.ps1 -Verify`, a couple of minutes. |
| "Is it staged?" | The apps are pre-built so the run is reliable and fits the slot. The *building* was real. The script only opens pages and prints cues — it never fakes generation, and it reads its numbers from the results file. |
| "Why not run it live?" | You can: `.\go.ps1 -Live`. Budget 20–30 minutes, so it's a workshop exercise, not a keynote one. |
| "Is 102 checks 'fully tested'?" | No. It's complete against BRD-2026-118 and nothing else. Coverage of *references* is not coverage of *risk* — that judgement is still the tester's. |
| "Is this production code?" | No, and the BRD says so — BR-09 and the note to delivery. It's the artefact the business signs off, and the delivery team's starting point. |
| "Could my BA really do this?" | They'd need Copilot and a folder. They wouldn't need to write code. That's the claim — no more, no less. |
| "What about our design system?" | Section 6 of the BRD points at it, and the app reuses `assets/screens.css` unmodified. Point yours at your own tokens. |
| "Would our automation survive a rebuild?" | Only if you make the selectors a contract. There's one in `test-data.html`, and UC-8 in the playbook shows how to put it in the prompt. |
| "Can you send me the link?" | Not as-is — it runs off `file://`. Publish the static files to an approved host first. |
| "Where does the data go?" | Nowhere. BR-09. Nothing is submitted, nothing is stored, there is no backend — and TC-053 fails the run if any request leaves the page. |

---

## Flags

| Command | Use it when |
|---|---|
| `.\go.ps1` | Business analyst track, timed. |
| `.\go.ps1 -Tester` | Tester track. |
| `.\go.ps1 -Manual` | **Presenting live.** Enter advances each beat. |
| `.\go.ps1 -Check` | Pre-flight before you walk on stage. Exits 0/1, prints the measured facts. |
| `.\go.ps1 -Verify` | Re-run every check for real. Needs Node and Edge. |
| `.\go.ps1 -NoBrowser` | Rehearsing the words without opening windows. |
| `.\go.ps1 -Live` | Workshop mode — rebuild from the BRD into `prototype-live\`. **Commit first**: staying out of `prototype\` is an instruction in the prompt, not a sandbox. |

---

## Presenter notes

- **Press `d`** in either prototype to fill the statement instantly. In v2, press
  **`v`** to fill it *with a varied instalment*. Typing a real audience member's
  name is better if you have ten seconds.
- **The browser is the star. The terminal is the autocue.** Don't demo the script.
- **Point at the rule reference in the error message.** *"(BR-01)"* is the single
  most persuasive pixel in the whole demo — it's the document, inside the app.
- **Point at the trace chips.** They're the bridge from their world to ours, and
  they're the acceptance criterion the BRD itself asks for.
- **Never imply Copilot is generating during the run.** It isn't. The script opens
  pages and prints cues. The real work is evidenced by a results file you can
  regenerate on the spot — a stronger story than a fake progress bar, and it
  survives being challenged.
- **Say "nobody wrote code by hand", not "no developer."** Someone still cloned a
  repo and ran a script. The narrower claim is true and defensible.
- **On the review screen the declaration sits below the fold — scroll to it.**
  That's deliberate; the screen says *"Scroll for the declaration ↓"*.
- **Don't explain MCP, tokens, or HTML.** This audience doesn't care and the clock
  doesn't allow it. Keep every sentence in business language.
