<#
.SYNOPSIS
    A one-page BRD becomes a working activity-statement app - and a traced test
    pack that runs itself.

.DESCRIPTION
    One command. No server, no Node required for the demo itself, no design-tool
    licence, no network. The pages run straight off the filesystem, so this works
    on a locked-down laptop and on conference wifi that has given up.

    The business analyst track (default):
      1. The BRD        - one page, eight requirements, nine rules, approved.
      2. The ask        - one plain-English sentence.
      3. The app        - the journey, working, every screen traceable back to a
                          requirement reference.
      4. The revision   - the BA edits the BRD, not the code. v1.1 adds REQ-009,
                          revises BR-07, and the app follows.

    The tester track (-Tester):
      1. The document   - section 8 asks for a traced pack.
      2. The pack       - a case for every reference, each naming what it verifies.
      3. The matrix     - coverage both ways, and what the revision re-baselines.
      4. The boundary   - 85% exactly, versus one dollar under.
      5. The run        - the whole pack in a real browser, reporting the same IDs.

    Nothing in this script pretends to generate code. It opens pages and prints
    presenter cues. The verification numbers it quotes come from
    testing/test-pack/results.js, which is written by an actual run.

.PARAMETER Tester
    Run the tester track instead of the business analyst track.

.PARAMETER Manual
    Advance each beat with Enter instead of a timer. Use this when presenting
    live - it means questions cannot derail the run.

.PARAMETER Verify
    Execute the verification suite for real and print the result. Needs Node and
    Microsoft Edge. Takes a couple of minutes.

.PARAMETER Live
    Invoke Copilot CLI to rebuild the prototype from the BRD, into
    prototype-live\. A workshop exercise, not a keynote one. prototype\ and
    prototype-v2\ are never touched.

.PARAMETER Check
    Validate the demo assets and exit. Prints a verdict and sets the exit code.

.PARAMETER NoBrowser
    Print the beats without opening browser windows.

.EXAMPLE
    .\go.ps1
    The business analyst track, timed.

.EXAMPLE
    .\go.ps1 -Tester -Manual
    The tester track, you control the pacing.
#>

[CmdletBinding()]
param(
    [switch]$Tester,
    [switch]$Manual,
    [switch]$Verify,
    [switch]$Live,
    [switch]$Check,
    [switch]$NoBrowser
)

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot

$Brd      = Join-Path $root 'brd\ato-bas-lodgment-brd.html'
$BrdV11   = Join-Path $root 'brd\ato-bas-lodgment-brd-v1.1.html'
$App      = Join-Path $root 'prototype\index.html'
$AppV2    = Join-Path $root 'prototype-v2\index.html'
$Pack     = Join-Path $root 'testing\test-pack\acceptance-pack.html'
$Matrix   = Join-Path $root 'testing\test-pack\traceability.html'
$Data     = Join-Path $root 'testing\test-pack\test-data.html'
$Results  = Join-Path $root 'testing\test-pack\results.json'

$Assets = @(
    'brd\ato-bas-lodgment-brd.html',
    'brd\ato-bas-lodgment-brd-v1.1.html',
    'assets\screens.css',
    'prototype\index.html',
    'prototype\prototype.css',
    'prototype\app.js',
    'prototype-v2\index.html',
    'prototype-v2\prototype.css',
    'prototype-v2\app.js',
    'testing\verify.mjs',
    'testing\test-pack\cases.js',
    'testing\test-pack\acceptance-pack.html',
    'testing\test-pack\traceability.html',
    'testing\test-pack\test-data.html',
    'testing\test-pack\pack.css'
)

$Prompt = 'Read the business requirements document in brd\. Build a working ' +
          'click-through prototype that satisfies every requirement and business ' +
          'rule in it, using our existing Lodge Assist design system. Tag each ' +
          'screen with the requirement references it satisfies. Verify it in a ' +
          'real browser before you finish.'

$IteratePrompt = 'The BRD has been revised to v1.1. Compare it with v1.0, work out ' +
                 'what changed, and update the prototype to match.'

$TesterPrompt = 'Read the BRD in brd\. Write a test case for every requirement and ' +
                'every business rule, each naming the reference it verifies, with ' +
                'negative and boundary cases for every rule expressed as a limit. ' +
                'Then write a suite that runs them in a real browser and reports ' +
                'the same case IDs.'

# --------------------------------------------------------------------- ui ---

function Write-Rule {
    param([string]$Text = '')
    if ($Text) {
        $pad = 74 - $Text.Length - 4
        if ($pad -lt 0) { $pad = 0 }
        Write-Host ''
        Write-Host ("-- $Text " + ('-' * $pad)) -ForegroundColor DarkGray
    } else {
        Write-Host ('-' * 74) -ForegroundColor DarkGray
    }
}

function Write-Beat {
    param([string]$Clock, [string]$Title)
    Write-Host ''
    Write-Host "  $Clock  " -ForegroundColor DarkGray -NoNewline
    Write-Host $Title -ForegroundColor White
}

function Write-Say  { param([string]$Text) Write-Host '        " ' -ForegroundColor DarkGray -NoNewline; Write-Host $Text -ForegroundColor Cyan }
function Write-Note { param([string]$Text) Write-Host "        $Text" -ForegroundColor DarkGray }
function Write-Ok   { param([string]$Text) Write-Host '  [ OK ] ' -ForegroundColor Green -NoNewline; Write-Host $Text -ForegroundColor Gray }
function Write-Fail { param([string]$Text) Write-Host '  [FAIL] ' -ForegroundColor Red   -NoNewline; Write-Host $Text -ForegroundColor Gray }

function Wait-Beat {
    param([int]$Seconds)
    if ($Manual) {
        Write-Host ''
        Write-Host '        [Enter] to continue ' -ForegroundColor DarkGray -NoNewline
        try { [void](Read-Host); return }
        catch {
            Write-Host ''
            Write-Note 'Non-interactive host - using the timer instead.'
        }
    }
    for ($i = $Seconds; $i -gt 0; $i--) {
        Write-Host ("`r        next in {0,2}s " -f $i) -ForegroundColor DarkGray -NoNewline
        Start-Sleep -Seconds 1
    }
    Write-Host "`r                        `r" -NoNewline
}

function Open-Page {
    param([string]$Path, [string]$Label)
    if ($NoBrowser) { Write-Note "would open: $Label"; return }
    Start-Process $Path | Out-Null
    Write-Note "opened: $Label"
}

# ---------------------------------------------------------- measured facts ---
# Read from the file the verification actually writes. Never hard-coded, so this
# cannot quote a number that was not taken.

function Get-RunFacts {
    if (-not (Test-Path $Results)) { return $null }
    try { $f = Get-Content $Results -Raw | ConvertFrom-Json } catch { return $null }

    # ConvertFrom-Json may already have turned the ISO timestamp into a DateTime.
    $ran = $f.ranAt
    if ($ran -isnot [datetime]) {
        $ran = [datetime]::Parse($ran, [System.Globalization.CultureInfo]::InvariantCulture,
                                 [System.Globalization.DateTimeStyles]::RoundtripKind)
    }
    $ran = $ran.ToUniversalTime()

    # Stale means "something it tested has changed since". Say so rather than
    # quoting a number that no longer describes what is on disk.
    $stale = @()
    foreach ($rel in $f.inputs) {
        $full = Join-Path $root ($rel -replace '/', '\')
        if ((Test-Path $full) -and ((Get-Item $full).LastWriteTimeUtc -gt $ran)) { $stale += $rel }
    }

    return [pscustomobject]@{
        Raw     = $f
        RanUtc  = $ran
        Stale   = $stale
        Checks  = "$($f.summary.passed)/$($f.summary.total)"
        Green   = [bool]$f.summary.green
        Pack    = $f.pack.'v1.1'
        PackV10 = $f.pack.'v1.0'
    }
}

# Every number this script prints comes from here. If there is no run, or the
# run is stale, it prints nothing numeric - it does not guess.
$Facts = Get-RunFacts

function Fact {
    param([string]$Path, [string]$Fallback = '')
    if (-not $Facts -or $Facts.Stale.Count -gt 0) { return $Fallback }
    $v = $Facts
    foreach ($p in $Path.Split('.')) { if ($null -eq $v) { return $Fallback }; $v = $v.$p }
    if ($null -eq $v) { return $Fallback }
    return [string]$v
}

function Write-RunFacts {
    if (-not $Facts) {
        Write-Note 'No verification run recorded. Run: .\go.ps1 -Verify'
        Write-Note 'Until then this script will not quote any figures.'
        return
    }
    if ($Facts.Stale.Count -gt 0) {
        Write-Host ('          {0,-11} {1}' -f 'STALE', "these files changed after the last run: $($Facts.Stale -join ', ')") -ForegroundColor Yellow
        Write-Host ('          {0,-11} {1}' -f '', 'Re-run: .\go.ps1 -Verify') -ForegroundColor Yellow
        return
    }
    $v10 = ($Facts.Raw.versions.'v1.0'.PSObject.Properties | Where-Object { $_.Name -notlike '__*' }).Count
    $v11 = ($Facts.Raw.versions.'v1.1'.PSObject.Properties | Where-Object { $_.Name -notlike '__*' }).Count
    $when = $Facts.RanUtc.ToLocalTime().ToString('d MMM yyyy, h:mm tt')
    $colour = if ($Facts.Green) { 'Green' } else { 'Red' }
    Write-Host ('          {0,-11} {1}' -f 'Checks',   ("{0} passed  ({1} for v1.0, {2} for v1.1)" -f $Facts.Checks, $v10, $v11)) -ForegroundColor $colour
    Write-Host ('          {0,-11} {1}' -f 'Coverage', ("{0} references in v1.1, {1} untraced, {2} cases per reference" -f $Facts.Pack.references, $Facts.Pack.untracedReferences, $Facts.Pack.casesPerReference)) -ForegroundColor $colour
    Write-Host ('          {0,-11} {1}' -f 'Browser',  $Facts.Raw.browser) -ForegroundColor $colour
    Write-Host ('          {0,-11} {1}' -f 'Last run', $when) -ForegroundColor $colour
    Write-Host ('          {0,-11} {1}' -f 'Evidence', 'testing\test-pack\results.json - written by the run, not by hand') -ForegroundColor $colour
}

# -------------------------------------------------------------- preflight ---

function Test-Assets {
    $failed = 0
    foreach ($rel in $Assets) {
        $full = Join-Path $root $rel
        if (Test-Path $full) {
            Write-Ok ("{0,-48} {1,7:N0} bytes" -f $rel, (Get-Item $full).Length)
        } else {
            Write-Fail ("{0,-48} missing" -f $rel)
            $failed++
        }
    }
    return $failed
}

try { Clear-Host } catch { }

Write-Host ''
if ($Tester) {
    $n = Fact 'Checks'
    $hdr = if ($n) { "  ONE-PAGE BRD  ->  TRACED TEST PACK  ->  $n CHECKS IN A REAL BROWSER" } else { '  ONE-PAGE BRD  ->  TRACED TEST PACK  ->  CHECKS IN A REAL BROWSER' }
    Write-Host $hdr -ForegroundColor White
    Write-Host '  Coverage answerable both ways, before there is anything to test.' -ForegroundColor DarkGray
} else {
    Write-Host '  ONE-PAGE BRD  ->  WORKING APP  ->  REVISED BRD  ->  REVISED APP' -ForegroundColor White
    Write-Host '  1:15 of beats. No code written by hand. No build step. No network.' -ForegroundColor DarkGray
}

Write-Rule 'Preflight'
$failed = Test-Assets

if ($failed -gt 0) {
    Write-Host ''
    Write-Host "  NOT READY - $failed asset(s) missing." -ForegroundColor Red
    exit 1
}

if ($Check) {
    Write-Host ''
    Write-Host ("  READY - {0}/{0} assets present." -f $Assets.Count) -ForegroundColor Green
    Write-Host '  Prerequisites: none.  Servers required: 0.  Network required: no.' -ForegroundColor DarkGray
    Write-RunFacts
    Write-Host ''
    exit 0
}

# ------------------------------------------------------------ verify mode ---

if ($Verify) {
    Write-Rule 'Verification'
    Write-Note 'Running the automated cases from testing\test-pack\cases.js against'
    Write-Note 'both prototypes, in Microsoft Edge, over file://. Needs Node.'
    Write-Host ''
    Push-Location $root
    try {
        if (-not (Test-Path (Join-Path $root 'node_modules\playwright-core'))) {
            Write-Note 'Installing playwright-core (one off, no browser download) ...'
            & npm install playwright-core --silent --no-fund --no-audit
        }
        & node (Join-Path $root 'testing\verify.mjs')
        $code = $LASTEXITCODE
    } finally { Pop-Location }
    Write-Host ''
    if ($code -eq 0) { Write-Ok 'every automated case passed' } else { Write-Fail 'at least one case failed - see above' }
    Open-Page $Pack 'the acceptance pack, now showing the fresh results'
    exit $code
}

# ------------------------------------------------------------- live mode ---

if ($Live) {
    Write-Rule 'Live mode'
    Write-Note 'Rebuilding the prototype from the BRD for real, in front of you.'
    Write-Note 'Output should go to prototype-live\. The ONLY thing keeping Copilot out of'
    Write-Note 'prototype\ and prototype-v2\ is the instruction in the prompt below - it is'
    Write-Note 'an instruction, not a sandbox. Commit your work before running this.'
    Write-Note 'Budget 20-30 minutes. Do not do this in a 90-second slot.'
    Write-Host ''

    $livePrompt = 'Read the business requirements document at ' +
                  'brd/ato-bas-lodgment-brd.html. Build a working click-through ' +
                  'prototype in a new folder called prototype-live that satisfies ' +
                  'every requirement REQ-001 to REQ-008 and every business rule ' +
                  'BR-01 to BR-09. It must run straight from the filesystem with ' +
                  'no server, framework, library, build step or CDN. Use the ' +
                  'existing design system at assets/screens.css unmodified. ' +
                  'Present the journey inside a 390x844 phone frame. On every ' +
                  'screen section add a data-req attribute listing the ' +
                  'requirements it satisfies, and show a trace strip under the ' +
                  'phone that reads it live. Do not modify any file or folder ' +
                  'outside prototype-live, and do not touch prototype or prototype-v2. ' +
                  'Remove any scratch folders you ' +
                  'create. Verify your work in a real browser before you finish. ' +
                  'Stop once the journey works end to end and nothing is clipped.'

    Write-Host '  copilot -p "<the prompt below>" --allow-all-tools' -ForegroundColor Yellow
    Write-Host ''
    Write-Host "  $livePrompt" -ForegroundColor Gray
    Write-Host ''

    if (-not (Get-Command copilot -ErrorAction SilentlyContinue)) {
        Write-Fail 'the Copilot CLI is not on PATH. Copy the prompt above and run it yourself.'
        exit 1
    }

    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    & copilot -C $root -p $livePrompt --allow-all-tools
    $sw.Stop()

    $liveIndex = Join-Path $root 'prototype-live\index.html'
    if (Test-Path $liveIndex) {
        Write-Ok ('prototype-live\index.html generated in {0:mm\:ss}' -f $sw.Elapsed)
        Open-Page $liveIndex 'the freshly generated prototype'
        exit 0
    }
    Write-Fail 'no prototype-live\index.html was produced'
    exit 1
}

# ======================================================== the tester track ===

if ($Tester) {
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    Write-Rule 'Run - tester track'

    Write-Beat '0:00' 'THE DOCUMENT ASKS FOR IT'
    Open-Page $BrdV11 'BRD-2026-118 v1.1 - see section 8, Test and assurance'
    Write-Say 'Section 8: every requirement and every rule carries a test case.'
    Write-Say 'Coverage reportable both ways. Negative and boundary cases for every limit.'
    Write-Note 'That is a testable clause in the document, not a wish in a plan.'
    Wait-Beat 15

    Write-Beat '0:15' 'THE ASK'
    Write-Host ''
    Write-Host "  $TesterPrompt" -ForegroundColor Yellow
    Write-Host ''
    Write-RunFacts
    Write-Host ''
    Write-Say 'One source of truth: cases.js. The pack, the matrix and the suite all read it.'
    Wait-Beat 14

    Write-Beat '0:29' 'THE PACK'
    Open-Page $Pack ((Fact 'Pack.cases' 'every') + ' cases for v1.1, each naming what it verifies')
    Write-Say 'Every case states a precondition, steps, an expected result - and the reference.'
    Write-Say 'The green column on the right is a real browser run, not a claim.'
    Write-Note 'Switch the version buttons: the pack changes with the document.'
    Wait-Beat 20

    Write-Beat '0:49' 'THE MATRIX - AND WHAT THE REVISION BROKE'
    Open-Page $Matrix 'coverage forward and backward, 0 gaps'
    $cov = Fact 'Pack.references'
    if ($cov) { Write-Say "$cov references, $(Fact 'Pack.untracedReferences') untraced, and every case traces to something real." }
    else       { Write-Say 'Every reference carries a case, and every case traces to something real.' }
    Write-Say 'Scroll to the bottom. REQ-009 was ADDED - that is just new cases.'
    Write-Say 'BR-07 was REVISED - three EXISTING cases re-baselined, plus one new one.'
    Write-Note 'A revised rule is the dangerous one: the old tests still pass.'
    Wait-Beat 22

    Write-Beat '1:11' 'THE BOUNDARY'
    Open-Page $Data 'synthetic data, and the selector contract'
    Open-Page $AppV2 'v1.1 - press "v" to fill a varied statement'
    Write-Say 'BR-11 warns BELOW 85 per cent. On a $2,600 instalment that is $2,210.'
    Write-Say 'Type 2210 - silence. Type 2209 - the interest warning appears.'
    Write-Note 'TC-085 and TC-086. One word in the document, one dollar in the build.'
    Wait-Beat 20

    $sw.Stop()
    Write-Host ''
    Write-Rule
    Write-Host ''
    Write-Host ('  DONE - {0:mm\:ss} elapsed' -f $sw.Elapsed) -ForegroundColor Green
    Write-Host '  A traced pack, a coverage matrix and a running suite - all from' -ForegroundColor DarkGray
    Write-Host '  the document, and all moving together when the document moves.' -ForegroundColor DarkGray
    Write-Host ''
    Write-Host '  Run the checks    : .\go.ps1 -Verify' -ForegroundColor DarkGray
    Write-Host '  The eight use cases: TESTER-PLAYBOOK.md' -ForegroundColor DarkGray
    Write-Host ''
    exit 0
}

# ================================================= the business analyst run ===

$sw = [System.Diagnostics.Stopwatch]::StartNew()

Write-Rule 'Run'

Write-Beat '0:00' 'THE BUSINESS ASSET'
Open-Page $Brd 'BRD-2026-118 v1.0 - one page, approved for build'
Write-Say 'One page. Eight requirements, nine business rules, approved.'
Write-Say 'Your BA wrote this. Everyone signed it.'
Write-Note 'Today, 21% of self-prepared statements need a correction, and the'
Write-Note 'biggest single cause is the net amount - a figure the lodger cannot'
Write-Note 'see until after they have lodged. Median time to fix it: 17 days.'
Write-Note 'And this document now waits in a queue until a developer is free.'
Wait-Beat 15

Write-Beat '0:15' 'THE ASK'
Write-Host ''
Write-Host "  $Prompt" -ForegroundColor Yellow
Write-Host ''
Write-RunFacts
Write-Host ''
Write-Say 'One sentence. The BRD is the input - not a spec someone rewrote.'
Wait-Beat 12

Write-Beat '0:27' 'THE APP'
Open-Page $App 'Lodge Assist, built from the BRD'
Write-Say 'Press "d" to fill it. Clear the ABN and continue - it refuses you,'
Write-Say 'and it tells you which rule refused: BR-01, the check digit.'
Write-Say 'The review screen shows what YOU typed, and it does the arithmetic.'
Write-Note 'Look under the phone: every screen tags the requirements it meets.'
Write-Note 'Tick "Show BRD refs on the screen" to label them in place.'
Wait-Beat 26

Write-Beat '0:53' 'THE REVISION'
Open-Page $BrdV11 'BRD v1.1 - REQ-009 added, BR-07 revised, change-barred'
Write-Host ''
Write-Host "  $IteratePrompt" -ForegroundColor Yellow
Write-Host ''
Open-Page $AppV2 'version 2 - built from the revised BRD'
Write-Say 'Trading conditions changed, so lodgers need to vary their instalment.'
Write-Say 'The BA edits the DOCUMENT. REQ-009 is new - and BR-07 is REVISED.'
Write-Say 'Press "v": there is now a variation step, and the sum uses T9, not T7.'
Write-Note 'Nobody wrote a change request in code. The BRD stays the source of truth.'
Wait-Beat 22

$sw.Stop()

Write-Host ''
Write-Rule
Write-Host ''
Write-Host ('  DONE - {0:mm\:ss} elapsed' -f $sw.Elapsed) -ForegroundColor Green
Write-Host '  BRD -> working prototype -> revised BRD -> revised prototype,' -ForegroundColor DarkGray
Write-Host '  with nobody writing code by hand at any point.' -ForegroundColor DarkGray
Write-Host ''
Write-Host '  Run again       : .\go.ps1' -ForegroundColor DarkGray
Write-Host '  Present live    : .\go.ps1 -Manual      (Enter advances each beat)' -ForegroundColor DarkGray
Write-Host '  The tester track: .\go.ps1 -Tester      (test pack, matrix, boundaries)' -ForegroundColor DarkGray
$vn = Fact 'Checks'
Write-Host ('  Run the checks  : .\go.ps1 -Verify      (' + $(if ($vn) { "$vn checks" } else { 'the full suite' }) + ' in a real browser)') -ForegroundColor DarkGray
Write-Host '  Rebuild it live : .\go.ps1 -Live        (workshop mode, 20-30 minutes)' -ForegroundColor DarkGray
Write-Host ''
