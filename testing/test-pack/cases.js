/* ============================================================================
   Lodge Assist — test pack
   ----------------------------------------------------------------------------
   ONE source of truth, read by four things:

     test-pack/acceptance-pack.html   the human-readable pack a tester walks
     test-pack/traceability.html      coverage, both directions, with gaps
     test-pack/test-data.html         the data the cases are written against
     verify.mjs                       the automation, which reports these IDs

   Every case names the BRD reference it verifies, so a result can be read
   straight back against the document. Nothing here is generated at runtime -
   if you change a rule in the BRD, you change it here and the pack, the matrix
   and the automation all move together.

   Works in a browser over file:// and in Node. No build step.
   ========================================================================= */

(function (root) {
  'use strict';

  var pack = {

    document: 'BRD-2026-118',
    title: 'Lodge Assist — quarterly activity statement self-lodgment',
    versions: [
      { id: 'v1.0', date: '31 July 2026',   target: 'prototype',    note: 'Baseline.' },
      { id: 'v1.1', date: '14 August 2026', target: 'prototype-v2', note: 'Adds REQ-009, BR-10, BR-11. Revises BR-07.' }
    ],

    /* ---------------------------------------------------------- the document */

    requirements: [
      { ref: 'REQ-001', since: 'v1.0', priority: 'Must',   title: 'Introduction screen names the service, the period, the due date and three benefits' },
      { ref: 'REQ-002', since: 'v1.0', priority: 'Must',   title: 'Start in one action, see progress, return without losing data' },
      { ref: 'REQ-003', since: 'v1.0', priority: 'Must',   title: 'Capture ABN, authorised contact and contact email' },
      { ref: 'REQ-004', since: 'v1.0', priority: 'Must',   title: 'Capture GST labels G1, 1A, 1B with code and plain-English name' },
      { ref: 'REQ-005', since: 'v1.0', priority: 'Must',   title: 'Capture PAYG labels W1, W2, T7' },
      { ref: 'REQ-006', since: 'v1.0', priority: 'Must',   title: 'Calculate and display the net amount with its arithmetic, before lodgment' },
      { ref: 'REQ-007', since: 'v1.0', priority: 'Must',   title: 'Refuse progression on invalid input, naming the field, the reason and the rule' },
      { ref: 'REQ-008', since: 'v1.0', priority: 'Must',   title: 'Review every value, confirm the declaration, receive a receipt number' },
      { ref: 'REQ-009', since: 'v1.1', priority: 'Must',   title: 'Vary the PAYG instalment (T8, T9, T4)' }
    ],

    /* Section 6 of the BRD. Numbered so the matrix can see them - an unnumbered
       requirement is one the coverage report cannot report on. */
    nfrs: [
      { ref: 'NFR-01', since: 'v1.0', priority: 'Must', title: 'Every interactive control presents a target of at least 44 x 44 CSS pixels' },
      { ref: 'NFR-02', since: 'v1.0', priority: 'Must', title: 'WCAG 2.2 Level AA: a refused control is marked invalid and associated with its message, and a message appearing without a change of context is announced' },
      { ref: 'NFR-03', since: 'v1.0', priority: 'Must', title: 'No error signalled by colour alone - text plus a non-colour indicator' },
      { ref: 'NFR-04', since: 'v1.0', priority: 'Must', title: 'Nothing clipped or unreachable at 390 x 844 in any state; taller content scrolls and says so' }
    ],

    rules: [
      { ref: 'BR-01', since: 'v1.0', title: 'ABN is eleven digits and passes the check-digit algorithm; spaces ignored' },
      { ref: 'BR-02', since: 'v1.0', title: 'Authorised contact name mandatory, at least two characters' },
      { ref: 'BR-03', since: 'v1.0', title: 'Contact email mandatory and structurally valid' },
      { ref: 'BR-04', since: 'v1.0', title: 'Monetary labels mandatory, zero or greater, whole dollars, at most twelve digits; dollar signs and separators ignored' },
      { ref: 'BR-05', since: 'v1.0', title: '1A cannot exceed G1' },
      { ref: 'BR-06', since: 'v1.0', title: 'W2 cannot exceed W1' },
      { ref: 'BR-07', since: 'v1.0', revisedIn: 'v1.1', title: 'Net = (1A − 1B) + W2 + instalment; 7A payable, 7B refundable, zero is nil',
        revision: 'v1.1 replaces T7 with the varied amount T9 where the instalment has been varied.' },
      { ref: 'BR-08', since: 'v1.0', title: 'Declaration must be confirmed before lodging' },
      { ref: 'BR-09', since: 'v1.0', title: 'No statement data transmitted, stored or lodged' },
      { ref: 'BR-10', since: 'v1.1', title: 'T8, T9 and T4 all mandatory when varying; T8 and T9 whole dollars, zero or greater' },
      { ref: 'BR-11', since: 'v1.1', title: 'Interest charge warning below 85% of T7, acknowledged before continuing; exactly 85% does not warn' }
    ],

    /* -------------------------------------------------------------- the data */

    data: {
      abn: {
        caption: 'ABNs (BR-01). Generated to pass or fail the published check-digit algorithm so the ' +
                 'rule can be tested at its boundary. They were not checked against the Australian ' +
                 'Business Register, so a check-digit-valid value here could coincide with an issued ' +
                 'ABN; none is intentionally associated with any entity, and none should be treated as ' +
                 'identifying one. No tax file number appears anywhere in this repository - the ' +
                 'document deliberately never asks for one.',
        columns: ['Value', 'Expected', 'Why'],
        rows: [
          ['26 262 626 210', 'accept', 'Eleven digits, check digit passes'],
          ['26262626210',    'accept', 'Same value without spaces (BR-01 ignores spaces)'],
          ['55 555 555 550', 'accept', 'Second valid value, for a repeat run'],
          ['40 404 040 414', 'accept', 'Third valid value'],
          ['11 111 111 106', 'accept', 'Valid, and visibly synthetic'],
          ['26 262 626 211', 'refuse', 'Eleven digits, check digit fails'],
          ['11 111 111 111', 'refuse', 'Eleven digits, check digit fails'],
          ['12 345 678 901', 'refuse', 'Eleven digits, check digit fails'],
          ['2626262621',     'refuse', 'Ten digits'],
          ['262626262100',   'refuse', 'Twelve digits'],
          ['26 262 626 21A', 'refuse', 'Contains a letter'],
          ['',               'refuse', 'Empty — mandatory field']
        ]
      },
      money: {
        caption: 'Monetary label values (BR-04). Applies to G1, 1A, 1B, W1, W2, T7, and to T8 and T9 under BR-10.',
        columns: ['Value', 'Expected', 'Why'],
        rows: [
          ['0',        'accept', 'Zero is the documented floor'],
          ['1',        'accept', 'Smallest positive whole dollar'],
          ['88000',    'accept', 'Ordinary value'],
          ['999999999999', 'accept', 'Twelve digits — the documented maximum (BR-04)'],
          ['1000000000000', 'refuse', 'Thirteen digits — over the documented maximum (BR-04)'],
          ['1000.50',  'refuse', 'Cents are refused, not rounded'],
          ['1000.00',  'refuse', 'Cents notation is still cents'],
          ['-1',       'refuse', 'Below zero'],
          ['1,000',    'accept', 'Thousands separators are stripped before parsing'],
          ['$1000',    'accept', 'A leading dollar sign is stripped'],
          ['ten',      'refuse', 'Not digits'],
          ['1e6',      'refuse', 'Not digits'],
          ['',         'refuse', 'Empty — every label is mandatory']
        ]
      },
      calculation: {
        caption: 'Net amount cases (BR-07). Hand-calculated, so the build can be checked against the document rather than against itself.',
        columns: ['1A', '1B', 'W2', 'Instalment', 'Net', 'Reported at'],
        rows: [
          ['8,000', '3,200', '7,100', '2,600 (T7)', '+14,500', '7A — payable'],
          ['1,000', '5,000', '0',     '0 (T7)',     '−4,000',  '7B — refundable'],
          ['1,000', '1,000', '0',     '0 (T7)',     '0',       'Nil — neither label'],
          ['8,000', '3,200', '7,100', '1,800 (T9)', '+13,700', '7A — payable, varied (v1.1)']
        ]
      },
      variation: {
        caption: 'Instalment variation boundary (BR-11), against an instalment T7 of $2,600. 85% of 2,600 is exactly 2,210.',
        columns: ['T9 varied amount', '% of T7', 'Warning', 'Why'],
        rows: [
          ['2,600', '100%',   'no',  'No reduction'],
          ['2,211', '85.04%', 'no',  'Above the threshold'],
          ['2,210', '85.00%', 'no',  'Exactly 85% — the document says this does not warn'],
          ['2,209', '84.96%', 'yes', 'One dollar under the threshold'],
          ['1,800', '69.23%', 'yes', 'Well under'],
          ['0',     '0%',     'yes', 'Varied to nil']
        ]
      }
    },

    /* ------------------------------------------------------------- the cases */

    cases: [

      /* ---- journey and navigation -------------------------------------- */
      { id: 'TC-001', refs: ['REQ-001'], type: 'positive', applies: ['v1.0', 'v1.1'], auto: true,
        pre: 'The prototype is open at the introduction screen.',
        steps: ['Read the introduction screen.'],
        expect: 'The service is named, the reporting period and due date are shown, and three benefits are listed.' },

      { id: 'TC-002', refs: ['REQ-002'], type: 'positive', applies: ['v1.0', 'v1.1'], auto: true,
        pre: 'The prototype is open at the introduction screen.',
        steps: ['Select the single start action.'],
        expect: 'The first capture screen opens. No other action was needed.' },

      { id: 'TC-003', refs: ['REQ-002'], type: 'positive', applies: ['v1.0', 'v1.1'], auto: true,
        pre: 'On any capture screen.',
        steps: ['Read the step indicator and the progress bar.'],
        expect: 'The current step and the total are shown, and the progress bar reflects them.' },

      { id: 'TC-004', refs: ['REQ-002'], type: 'positive', applies: ['v1.0', 'v1.1'], auto: true,
        pre: 'Entity details have been entered and the GST screen is open.',
        steps: ['Select back.', 'Read the fields.'],
        expect: 'The previous step reopens with every entered value still present.' },

      { id: 'TC-005', refs: ['REQ-002', 'REQ-009'], type: 'positive', applies: ['v1.1'], auto: true,
        pre: 'On the PAYG screen.',
        steps: ['Choose to lodge the instalment as it is; read the step total.',
                'Choose to vary the instalment; read the step total again.'],
        expect: 'The total is 4 steps when not varying and 5 steps when varying.' },

      /* ---- entity details ----------------------------------------------- */
      { id: 'TC-010', refs: ['REQ-003'], type: 'positive', applies: ['v1.0', 'v1.1'], auto: true,
        pre: 'On the entity screen.',
        steps: ['Read the fields presented.'],
        expect: 'ABN, authorised contact and contact email are all present and labelled.' },

      { id: 'TC-011', refs: ['REQ-007', 'BR-01'], type: 'negative', applies: ['v1.0', 'v1.1'], auto: true,
        pre: 'On the entity screen with every field empty.',
        steps: ['Select continue.'],
        expect: 'Progression is refused. The ABN field is marked, and the message cites BR-01.' },

      { id: 'TC-012', refs: ['BR-01'], type: 'boundary', applies: ['v1.0', 'v1.1'], auto: true,
        pre: 'On the entity screen.',
        steps: ['Enter a ten-digit ABN.', 'Select continue.'],
        expect: 'Refused, citing BR-01. An ABN is eleven digits.' },

      { id: 'TC-013', refs: ['BR-01'], type: 'boundary', applies: ['v1.0', 'v1.1'], auto: true,
        pre: 'On the entity screen.',
        steps: ['Enter a twelve-digit ABN.', 'Select continue.'],
        expect: 'Refused, citing BR-01.' },

      { id: 'TC-014', refs: ['BR-01'], type: 'negative', applies: ['v1.0', 'v1.1'], auto: true,
        pre: 'On the entity screen.',
        steps: ['Enter eleven digits that fail the check digit (see test data).', 'Select continue.'],
        expect: 'Refused, citing BR-01, with a message about the check digit rather than the length.' },

      { id: 'TC-015', refs: ['BR-01'], type: 'positive', applies: ['v1.0', 'v1.1'], auto: true,
        pre: 'On the entity screen.',
        steps: ['Enter a valid ABN written with spaces.', 'Complete the other fields and continue.'],
        expect: 'Accepted. Spaces are ignored, as BR-01 requires.' },

      { id: 'TC-016', refs: ['BR-02'], type: 'negative', applies: ['v1.0', 'v1.1'], auto: true,
        pre: 'On the entity screen with a valid ABN.',
        steps: ['Leave the contact name empty.', 'Select continue.'],
        expect: 'Refused, citing BR-02.' },

      { id: 'TC-017', refs: ['BR-02'], type: 'boundary', applies: ['v1.0', 'v1.1'], auto: true,
        pre: 'On the entity screen with a valid ABN and email.',
        steps: ['Enter a one-character name and continue.', 'Enter a two-character name and continue.'],
        expect: 'One character is refused citing BR-02; two characters is accepted.' },

      { id: 'TC-018', refs: ['BR-03'], type: 'negative', applies: ['v1.0', 'v1.1'], auto: true,
        pre: 'On the entity screen with the other fields valid.',
        steps: ['Enter an email with no @ symbol.', 'Select continue.'],
        expect: 'Refused, citing BR-03.' },

      { id: 'TC-019', refs: ['BR-03'], type: 'negative', applies: ['v1.0', 'v1.1'], auto: true,
        pre: 'On the entity screen with the other fields valid.',
        steps: ['Enter an email with no dot in the domain.', 'Select continue.'],
        expect: 'Refused, citing BR-03.' },

      { id: 'TC-020', refs: ['REQ-003', 'BR-03'], type: 'positive', applies: ['v1.0', 'v1.1'], auto: true,
        pre: 'On the entity screen.',
        steps: ['Enter a valid ABN, a name and a valid email.', 'Select continue.'],
        expect: 'The GST screen opens.' },

      /* ---- GST ----------------------------------------------------------- */
      { id: 'TC-025', refs: ['REQ-004'], type: 'positive', applies: ['v1.0', 'v1.1'], auto: true,
        pre: 'On the GST screen.',
        steps: ['Read the labels presented.'],
        expect: 'G1, 1A and 1B each appear with their label code and a plain-English name.' },

      { id: 'TC-026', refs: ['REQ-007', 'BR-04'], type: 'negative', applies: ['v1.0', 'v1.1'], auto: true,
        pre: 'On the GST screen with every label empty.',
        steps: ['Select continue.'],
        expect: 'Refused. Every empty label is marked and each message cites BR-04.' },

      { id: 'TC-027', refs: ['BR-04'], type: 'negative', applies: ['v1.0', 'v1.1'], auto: true,
        pre: 'On the GST screen.',
        steps: ['Enter an amount with cents at G1.', 'Select continue.'],
        expect: 'Refused, citing BR-04, with a message about cents. The amount is not silently rounded.' },

      { id: 'TC-028', refs: ['BR-04'], type: 'negative', applies: ['v1.0', 'v1.1'], auto: true,
        pre: 'On the GST screen.',
        steps: ['Enter a negative amount at 1B.', 'Select continue.'],
        expect: 'Refused, citing BR-04.' },

      { id: 'TC-029', refs: ['BR-04'], type: 'negative', applies: ['v1.0', 'v1.1'], auto: true,
        pre: 'On the GST screen.',
        steps: ['Enter letters at G1.', 'Select continue.'],
        expect: 'Refused, citing BR-04.' },

      { id: 'TC-030', refs: ['BR-04'], type: 'boundary', applies: ['v1.0', 'v1.1'], auto: true,
        pre: 'On the GST screen.',
        steps: ['Enter 0 at all three labels.', 'Select continue.'],
        expect: 'Accepted. Zero is the documented floor, not a missing value.' },

      { id: 'TC-031', refs: ['BR-05'], type: 'boundary', applies: ['v1.0', 'v1.1'], auto: true,
        pre: 'On the GST screen.',
        steps: ['Enter the same amount at G1 and 1A.', 'Select continue.'],
        expect: 'Accepted. BR-05 says 1A cannot exceed G1; equal is not exceeding.' },

      { id: 'TC-032', refs: ['REQ-007', 'BR-05'], type: 'negative', applies: ['v1.0', 'v1.1'], auto: true,
        pre: 'On the GST screen.',
        steps: ['Enter 1A greater than G1.', 'Select continue.'],
        expect: 'Refused. The 1A field is marked and the message cites BR-05.' },

      { id: 'TC-033', refs: ['BR-04'], type: 'boundary', applies: ['v1.0', 'v1.1'], auto: true,
        pre: 'On the GST screen.',
        steps: ['Enter a twelve-digit amount at G1 and continue.',
                'Return, enter a thirteen-digit amount at G1 and continue.'],
        expect: 'Twelve digits is accepted; thirteen is refused, citing BR-04.',
        note: 'The twelve-digit ceiling was originally an undocumented decision made during the ' +
              'build. It was written back into BR-04 rather than left implicit, which is what the ' +
              '"list anything you had to decide that the document did not specify" clause is for.' },

      /* ---- PAYG ---------------------------------------------------------- */
      { id: 'TC-035', refs: ['REQ-005'], type: 'positive', applies: ['v1.0', 'v1.1'], auto: true,
        pre: 'On the PAYG screen.',
        steps: ['Read the labels presented.'],
        expect: 'W1, W2 and T7 each appear with their label code and a plain-English name.' },

      { id: 'TC-036', refs: ['BR-06'], type: 'boundary', applies: ['v1.0', 'v1.1'], auto: true,
        pre: 'On the PAYG screen.',
        steps: ['Enter the same amount at W1 and W2.', 'Select continue.'],
        expect: 'Accepted. Equal is not exceeding.' },

      { id: 'TC-037', refs: ['REQ-007', 'BR-06'], type: 'negative', applies: ['v1.0', 'v1.1'], auto: true,
        pre: 'On the PAYG screen.',
        steps: ['Enter W2 greater than W1.', 'Select continue.'],
        expect: 'Refused. The W2 field is marked and the message cites BR-06.' },

      /* ---- the calculation ----------------------------------------------- */
      { id: 'TC-040', refs: ['REQ-006', 'BR-07'], type: 'calculation', applies: ['v1.0', 'v1.1'], auto: true,
        rebaselined: 'v1.1',
        pre: 'A statement of 1A 8,000 / 1B 3,200 / W2 7,100 / T7 2,600, not varied.',
        steps: ['Reach the review screen.', 'Read the net amount.'],
        expect: '$14,500 shown as payable to the ATO at label 7A.' },

      { id: 'TC-041', refs: ['REQ-006', 'BR-07'], type: 'calculation', applies: ['v1.0', 'v1.1'], auto: true,
        rebaselined: 'v1.1',
        pre: 'A statement of 1A 1,000 / 1B 5,000 / W2 0 / T7 0, not varied.',
        steps: ['Reach the review screen.', 'Read the net amount.'],
        expect: '$4,000 shown as refundable to the entity at label 7B.' },

      { id: 'TC-042', refs: ['REQ-006', 'BR-07'], type: 'calculation', applies: ['v1.0', 'v1.1'], auto: true,
        rebaselined: 'v1.1',
        pre: 'A statement of 1A 1,000 / 1B 1,000 / W2 0 / T7 0, not varied.',
        steps: ['Reach the review screen.', 'Read the net amount.'],
        expect: 'Zero, described as a nil statement, with neither 7A nor 7B reported.' },

      { id: 'TC-043', refs: ['REQ-006'], type: 'positive', applies: ['v1.0', 'v1.1'], auto: true,
        pre: 'On the review screen.',
        steps: ['Read the calculation panel.'],
        expect: 'The arithmetic is shown, not just the result, and it names the labels used.' },

      /* ---- review, declaration, confirmation ----------------------------- */
      { id: 'TC-050', refs: ['REQ-008'], type: 'positive', applies: ['v1.0', 'v1.1'], auto: true,
        pre: 'A statement has been completed with values the tester chose.',
        steps: ['Reach the review screen.', 'Compare every row with what was entered.'],
        expect: 'Every entered value is replayed exactly. Nothing is sample data.' },

      { id: 'TC-051', refs: ['REQ-007', 'BR-08'], type: 'negative', applies: ['v1.0', 'v1.1'], auto: true,
        pre: 'On the review screen with the declaration unconfirmed.',
        steps: ['Select lodge.'],
        expect: 'Lodgment is refused with a visible message citing BR-08. The confirmation screen is not reached.' },

      { id: 'TC-052', refs: ['REQ-008'], type: 'positive', applies: ['v1.0', 'v1.1'], auto: true,
        pre: 'On the review screen with the declaration confirmed.',
        steps: ['Select lodge.'],
        expect: 'The confirmation screen shows a receipt number and the date and time of lodgment.' },

      { id: 'TC-053', refs: ['BR-09'], type: 'negative', applies: ['v1.0', 'v1.1'], auto: true,
        pre: 'Network activity is being observed.',
        steps: ['Complete the whole journey and lodge.'],
        expect: 'No request leaves the page. Every resource loaded is local.' },

      { id: 'TC-054', refs: ['REQ-002', 'BR-09'], type: 'negative', applies: ['v1.0', 'v1.1'], auto: true,
        pre: 'A statement has been lodged after at least one field was refused.',
        steps: ['Select "Start another statement".', 'Inspect every field and every control.'],
        expect: 'Every value is cleared, no error message survives, no control is still marked ' +
                'invalid or still pointing at a deleted message, and the reference overlay is off.',
        note: 'A demo is run repeatedly in front of different rooms. State that survives a restart ' +
              'is state the second audience sees.' },

      /* ---- traceability -------------------------------------------------- */
      { id: 'TC-060', refs: ['REQ-001', 'REQ-008'], type: 'traceability', applies: ['v1.0', 'v1.1'], auto: true,
        pre: 'The prototype is open.',
        steps: ['Inspect every screen for its declared references.'],
        expect: 'Every screen declares at least one requirement reference — acceptance criterion 2.' },

      { id: 'TC-061', refs: ['REQ-008'], type: 'traceability', applies: ['v1.0', 'v1.1'], auto: true,
        pre: 'The prototype is open.',
        steps: ['Walk each screen and compare the trace strip with the screen.'],
        expect: 'The strip always names the current screen and its references, live.' },

      { id: 'TC-062', refs: ['REQ-008'], type: 'traceability', applies: ['v1.0', 'v1.1'], auto: true,
        pre: 'On any screen.',
        steps: ['Turn on "Show BRD refs on the screen".'],
        expect: 'References are labelled in place, and nothing is clipped by the phone frame.' },

      /* ---- accessibility (section 6, NFR-01 to NFR-04) ------------------ */
      { id: 'TC-070', refs: ['NFR-01'], type: 'accessibility', applies: ['v1.0', 'v1.1'], auto: true,
        pre: 'On every screen in turn, considering the controls inside the phone frame.',
        steps: ['Measure every visible interactive control.'],
        expect: 'Every control is at least 44 x 44 CSS pixels. For a checkbox or radio the target measured is the label wrapping it, which is what a finger actually hits.' },

      { id: 'TC-071', refs: ['NFR-03'], type: 'accessibility', applies: ['v1.0', 'v1.1'], auto: true,
        pre: 'A refused field is on screen.',
        steps: ['Read the error.'],
        expect: 'The error carries text and a non-colour indicator, so it is not conveyed by colour alone.' },

      { id: 'TC-072', refs: ['NFR-02'], type: 'accessibility', applies: ['v1.0', 'v1.1'], auto: true,
        pre: 'A refused field is on screen.',
        steps: ['Inspect the control.'],
        expect: 'The control is marked invalid and points at its message, so assistive technology reads the reason.' },

      { id: 'TC-073', refs: ['NFR-04'], type: 'accessibility', applies: ['v1.0', 'v1.1'], auto: true,
        pre: 'The prototype is open at 390 x 844.',
        steps: ['Walk every screen, including every error state.'],
        expect: 'Nothing is clipped or unreachable. Anything taller than the frame scrolls and says so.' },

      { id: 'TC-074', refs: ['NFR-02', 'BR-11'], type: 'accessibility', applies: ['v1.1'], auto: true,
        pre: 'On the variation screen with the interest warning not yet showing.',
        steps: ['Enter a varied amount below 85% of the instalment.'],
        expect: 'The warning is announced to assistive technology as it appears, not left to be discovered.',
        note: 'WCAG 2.2 SC 4.1.3, Status Messages. The panel appears as a side effect of typing. Without an announcement a screen-reader user types the amount, hears nothing, and is then refused by a checkbox they were never told existed.' },

      /* ---- v1.1: varying the instalment ---------------------------------- */
      { id: 'TC-080', refs: ['REQ-009'], type: 'positive', applies: ['v1.1'], auto: true,
        pre: 'On the PAYG screen.',
        steps: ['Read the screen below the labels.'],
        expect: 'The lodger is asked whether the instalment suits their circumstances.' },

      { id: 'TC-081', refs: ['REQ-009'], type: 'positive', applies: ['v1.1'], auto: true,
        pre: 'On the PAYG screen with valid PAYG figures.',
        steps: ['Choose to vary the instalment.', 'Select continue.'],
        expect: 'The variation screen opens, offering T8, T9 and T4.' },

      { id: 'TC-082', refs: ['REQ-009'], type: 'positive', applies: ['v1.1'], auto: true,
        pre: 'On the PAYG screen with valid PAYG figures.',
        steps: ['Leave the instalment as it is.', 'Select continue.'],
        expect: 'The variation screen is skipped and the review screen opens.' },

      { id: 'TC-083', refs: ['REQ-007', 'BR-10'], type: 'negative', applies: ['v1.1'], auto: true,
        pre: 'On the variation screen with every field empty.',
        steps: ['Select continue.'],
        expect: 'Refused. T8, T9 and T4 are each marked and the messages cite BR-10.' },

      { id: 'TC-084', refs: ['BR-10'], type: 'negative', applies: ['v1.1'], auto: true,
        pre: 'On the variation screen with T8 and T9 entered.',
        steps: ['Leave the reason unselected.', 'Select continue.'],
        expect: 'Refused, citing BR-10.' },

      { id: 'TC-085', refs: ['BR-11'], type: 'boundary', applies: ['v1.1'], auto: true,
        pre: 'T7 is 2,600. On the variation screen.',
        steps: ['Enter a varied amount of 2,210 — exactly 85%.'],
        expect: 'No interest charge warning. The document says exactly 85% does not warn.',
        note: 'Exactly-85% is where BR-11 is most easily misread, which is why this case exists. ' +
              'It is worth knowing what was actually measured: the obvious form, t9 < t7 * 0.85, is ' +
              'NOT wrong here — 2,600 × 0.85 is exactly 2,210 in IEEE-754, and a scan of every ' +
              'instalment up to 2,000,000 found none where the float form fires wrongly at exactly ' +
              '85%. The build compares integers anyway (t9 × 100 < t7 × 85) because that is exact by ' +
              'construction rather than by luck.' },

      { id: 'TC-086', refs: ['BR-11'], type: 'boundary', applies: ['v1.1'], auto: true,
        pre: 'T7 is 2,600. On the variation screen.',
        steps: ['Enter a varied amount of 2,209 — one dollar under 85%.'],
        expect: 'The interest charge warning appears, and the percentage it states is below 85%.',
        note: 'The stated percentage is floored, not rounded. 2,209 of 2,600 is 84.96%, which rounds ' +
              'to "85%" — a warning that fires while claiming 85% appears to contradict the rule it ' +
              'is enforcing.' },

      { id: 'TC-087', refs: ['REQ-007', 'BR-11'], type: 'negative', applies: ['v1.1'], auto: true,
        pre: 'The interest charge warning is showing and unacknowledged.',
        steps: ['Select continue.'],
        expect: 'Refused, citing BR-11. Acknowledging it then allows progression.' },

      { id: 'TC-088', refs: ['REQ-006', 'BR-07'], type: 'calculation', applies: ['v1.1'], auto: true,
        pre: 'A statement of 1A 8,000 / 1B 3,200 / W2 7,100 / T7 2,600, varied to T9 1,800.',
        steps: ['Reach the review screen.', 'Read the net amount and its arithmetic.'],
        expect: '$13,700 payable at 7A, and the arithmetic names T9 rather than T7.',
        note: 'This is the case that BR-07 was revised for. Cases TC-040 to TC-042 keep their v1.0 expected results because they do not vary.' },

      { id: 'TC-089', refs: ['REQ-009', 'REQ-008'], type: 'positive', applies: ['v1.1'], auto: true,
        pre: 'A varied statement has reached the review screen.',
        steps: ['Read the PAYG summary and the notice below it.'],
        expect: 'T8, T9 and the reason are shown, and the notice states the amount varied from and to.' },

      { id: 'TC-090', refs: ['BR-10'], type: 'boundary', applies: ['v1.1'], auto: true,
        pre: 'T7 is 2,600. On the variation screen.',
        steps: ['Enter 0 at T8 and 0 at T9, choose a reason, and acknowledge the interest warning.',
                'Select continue.'],
        expect: 'Accepted. Zero is the documented floor for the variation labels too, not a missing value.' },

      { id: 'TC-091', refs: ['BR-10'], type: 'negative', applies: ['v1.1'], auto: true,
        pre: 'On the variation screen.',
        steps: ['Enter a varied amount with cents at T9.', 'Select continue.'],
        expect: 'Refused, citing BR-10, with a message about cents.' },

      { id: 'TC-092', refs: ['BR-10'], type: 'negative', applies: ['v1.1'], auto: true,
        pre: 'On the variation screen.',
        steps: ['Enter a negative amount at T8.', 'Select continue.'],
        expect: 'Refused, citing BR-10.' },

      { id: 'TC-093', refs: ['BR-11'], type: 'boundary', applies: ['v1.1'], auto: true,
        pre: 'T7 is 0. On the variation screen.',
        steps: ['Enter 0 at T8 and 0 at T9 and choose a reason.', 'Select continue.'],
        expect: 'No interest charge warning appears and no acknowledgement is required. ' +
                'With no instalment there is nothing to vary downwards, so BR-11 cannot apply.',
        note: 'The degenerate case. An implementation that computes a percentage of zero divides by ' +
              'zero and shows NaN, or fires the warning on every value.' }
    ]
  };

  /* Derived once, used by every view. Requirements, non-functional
     requirements and business rules are all "references" - a case that traces
     to none of them is untraceable, whichever kind it is. */
  pack.references = pack.requirements.concat(pack.nfrs).concat(pack.rules);

  pack.refIndex = (function () {
    var idx = {};
    pack.references.forEach(function (r) { idx[r.ref] = { meta: r, cases: [] }; });
    pack.cases.forEach(function (c) {
      c.refs.forEach(function (ref) {
        if (!idx[ref]) idx[ref] = { meta: { ref: ref, title: '(not in the document)' }, cases: [] };
        idx[ref].cases.push(c.id);
      });
    });
    return idx;
  })();

  root.ATO_TEST_PACK = pack;

})(typeof window !== 'undefined' ? window : globalThis);
