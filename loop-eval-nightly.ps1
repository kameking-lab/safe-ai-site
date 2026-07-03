<#
.SYNOPSIS
  Nightly generation-quality (chatbot-gen) self-measurement for the safe-ai-site self-run loops.

.DESCRIPTION
  O18(a): run the 23-question production generation-quality eval (web `npm run eval:chatbot-gen`,
  which drives the LIVE chatbot over HTTP against the deployed site and scores each answer
  mechanically) once per calendar day, WITHOUT the owner ever prompting for it, and append the
  result in a machine-readable form under a gitignored output dir.

  Why this is safe to run under the 6-lane loop (the perf-measurement tasks are quiet-window-blocked
  but this is NOT): the eval hits PRODUCTION over HTTP (23 requests to the deployed chatbot API), so
  it consumes NO local CPU/GPU and does not compete with the lanes' builds - only the prod server
  spends Gemini, and this script's once-per-night idempotent guard caps that at 23 questions/night.

  Trigger (ignition, this lane's mandate): the ops lane, the one lane guaranteed always alive, calls
  this at the tail of every iteration (loop-prompt-ops.txt step 5.7). The per-night guard makes every
  call after the day's first a fast no-op, so a ~195s ops cadence still measures exactly once/day.

  Idempotency = the day's daily file exists. The guard is the LOAD-BEARING budget control: the daily
  marker is written on BOTH a successful measure AND a definitive eval failure (a failure where the
  eval process actually started), so a transient prod blip cannot make the ops loop re-hammer the
  prod Gemini budget every 195s for the rest of the day. A pure setup failure (web/ not installed)
  writes NO marker and simply retries next call, since no requests were spent.

  Outputs (all gitignored, main tree only - so this never dirties the ops clean-tree contract nor
  races the ops runner's git; a committed snapshot for /about is O18(b)):
    .loop-eval/genquality/<yyyy-MM-dd>.json  per-night full record (existence = "already ran today")
    .loop-eval/genquality/latest.json        overwritten each success (most-recent, for /about later)
    .loop-eval/genquality/history.jsonl      one compact line per run (trend history)

  This file is intentionally PURE ASCII so Windows PowerShell 5.x parses it as BOM-less UTF-8
  (a Japanese literal here would be mis-decoded and break parsing) - like loop-runner/loop-watchdog.

  Run with -SelfTest to exercise the pure gates (no npm / no network / no writes).
  Run with -WhatIf to print the exact plan (guard decision + command + output paths), touching nothing.

.PARAMETER BaseUrl
  Deployed base URL the eval drives (default = the production portal). Passed as CHATBOT_EVAL_BASE_URL.

.PARAMETER Target
  Strict-accuracy floor recorded as belowTarget in each record (default 0.80). The baseline is
  0.905 (docs/chatbot-genquality-eval-2026-07-03.md); 0.80 is >2 questions below baseline, chosen so
  normal LLM run-to-run variance does not raise a false regression. Surfacing belowTarget onto the
  loop-status dashboard is O18(b); this slice only records it.

.PARAMETER OutDir
  Output root (default = <repoRoot>\.loop-eval). The genquality subdir holds the daily/latest/history.

.PARAMETER RepoPath
  Main-tree repo root that owns web/ (default = this script's dir).

.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File .\loop-eval-nightly.ps1

.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File .\loop-eval-nightly.ps1 -SelfTest
#>
[CmdletBinding()]
param(
  [string]$BaseUrl = "https://www.anzen-ai-portal.jp",
  [double]$Target = 0.80,
  [string]$OutDir = "",
  [string]$RepoPath = "",
  [switch]$WhatIf,
  [switch]$SelfTest
)

# ---------------------------------------------------------------------------
# Pure helpers (no IO) - fully covered by -SelfTest.
# ---------------------------------------------------------------------------

# The calendar-day key. "Nightly" here means "once per local calendar day": the first ops iteration of
# the day runs it, later ones no-op. Kept as a function so -SelfTest can pin a fixed clock.
function Get-NightlyDateStamp {
  param([datetime]$Now)
  return $Now.ToString("yyyy-MM-dd")
}

# The per-night marker file whose mere existence means "already measured today" (the budget guard).
function Get-NightlyDailyPath {
  param([string]$Dir, [string]$Stamp)
  return (Join-Path $Dir ($Stamp + ".json"))
}

# The budget guard: has today's measurement already run? Existence of the daily file is the whole test.
function Test-AlreadyRanTonight {
  param([string]$Dir, [string]$Stamp)
  return (Test-Path -LiteralPath (Get-NightlyDailyPath -Dir $Dir -Stamp $Stamp))
}

# Regression classification. Kept separate so O18(b)'s dashboard banner reuses the SAME predicate the
# record is stamped with - the record and the (future) warning can never disagree.
function Test-EvalBelowTarget {
  param([double]$StrictAccuracy, [double]$Target)
  return ($StrictAccuracy -lt $Target)
}

# Build the machine-readable record from a parsed eval report (report.summary shape is fixed by
# web/scripts/chatbot-eval-phase2.ts). Pure: takes the parsed object, returns an ordered hashtable.
function ConvertTo-NightlyRecord {
  param([object]$Report, [string]$Stamp, [double]$Target, [string]$RanAtIso)
  $s = $Report.summary
  $strict = [double]$s.strictAccuracy
  return [ordered]@{
    date           = $Stamp
    ranAt          = $RanAtIso
    baseUrl        = [string]$Report.base_url
    mode           = [string]$Report.mode
    generatedAt    = [string]$Report.generated_at
    strictAccuracy = $strict
    correct        = [int]$s.correct
    partial        = [int]$s.partial
    incorrect      = [int]$s.incorrect
    scorable       = [int]$s.scorable
    usefulRate     = [double]$s.usefulRate
    target         = $Target
    belowTarget    = (Test-EvalBelowTarget -StrictAccuracy $strict -Target $Target)
    ok             = $true
  }
}

# A definitive-failure record (the eval process started but did not yield a usable report). Written to
# the daily marker so the day's budget is treated as spent (no 195s re-hammer). Distinct shape (ok=false).
function New-FailureRecord {
  param([string]$Stamp, [string]$RanAtIso, [int]$ExitCode, [string]$ErrorText)
  return [ordered]@{
    date     = $Stamp
    ranAt    = $RanAtIso
    ok       = $false
    exitCode = $ExitCode
    error    = $ErrorText
  }
}

# One compact JSON line for the append-only trend history.
function Format-HistoryLine {
  param([object]$Record)
  return (ConvertTo-Json -InputObject $Record -Compress -Depth 5)
}

# Write JSON WITHOUT a UTF-8 BOM. Windows PowerShell 5.1's `Set-Content -Encoding UTF8` prepends a BOM,
# which Node's JSON.parse rejects (a leading ﻿ is a SyntaxError) - and these files are the machine-
# readable contract O18(b)'s /about will read from JS. UTF8Encoding($false) = no BOM. ASCII-only content
# here anyway, but this keeps the bytes clean for any consumer.
function Write-JsonNoBom {
  param([string]$Path, [string]$Text)
  [System.IO.File]::WriteAllText($Path, $Text, (New-Object System.Text.UTF8Encoding($false)))
}
function Add-JsonLineNoBom {
  param([string]$Path, [string]$Line)
  [System.IO.File]::AppendAllText($Path, ($Line + "`n"), (New-Object System.Text.UTF8Encoding($false)))
}

# ---------------------------------------------------------------------------
# O18(b) part 1: surface a below-target measurement onto docs/loop-status.md (the owner's ONE watch file)
# as a loud, self-healing warning banner. "Don't silently degrade": a regression the record already
# stamped must be visible where the owner looks, and clear itself the moment quality recovers.
# ---------------------------------------------------------------------------

# Region markers for the eval-quality banner (ASCII literals, NOT localized - stable across encodings and
# shared with loop-launcher.ps1, which preserves this banner verbatim across a full status render so a
# launcher pass never silently wipes a live warning).
$EvalBeginMarker = "<!-- EVAL-QUALITY:BEGIN (managed by loop-eval-nightly.ps1) -->"
$EvalEndMarker   = "<!-- EVAL-QUALITY:END -->"

# Load the localized status strings (Japanese lives in loop-status-strings.txt, read at RUNTIME so THIS
# source stays pure ASCII - a Japanese literal here would be mis-decoded by Windows PowerShell 5.x and
# break parsing). Same external-file convention as loop-launcher.ps1 / loop-report-status.ps1.
function Import-StatusStrings {
  param([string]$Path)
  $ls = @{}
  if ($Path -and (Test-Path $Path)) {
    foreach ($ln in (Get-Content -Encoding UTF8 -Path $Path)) {
      if ($ln -match '^\s*#') { continue }
      $i = $ln.IndexOf('=')
      if ($i -gt 0) { $ls[$ln.Substring(0, $i)] = $ln.Substring($i + 1) }
    }
  }
  return $ls
}

# Format one localized string, substituting {KEY} placeholders. Returns the raw key when absent so a
# missing/garbled strings file degrades to a visible ASCII marker rather than throwing.
function Format-StatusString {
  param([hashtable]$Strings, [string]$Key, [hashtable]$Vals)
  $t = if ($Strings -and $Strings.ContainsKey($Key)) { [string]$Strings[$Key] } else { $Key }
  if ($Vals) { foreach ($k in $Vals.Keys) { $t = $t.Replace('{' + $k + '}', [string]$Vals[$k]) } }
  return $t
}

# The desired banner body for a record: the localized 3-line warning when the record is a below-target
# measurement, otherwise an EMPTY array (= clear the banner). Pure: the SAME belowTarget the record was
# stamped with (Test-EvalBelowTarget) drives this, so the dashboard and the record can never disagree.
function Get-EvalBannerLines {
  param([hashtable]$Strings, [object]$Record)
  if ($null -eq $Record -or -not $Record.ok -or -not $Record.belowTarget) { return @() }
  $pct = [math]::Round([double]$Record.strictAccuracy * 100, 1)
  $tgt = [math]::Round([double]$Record.target * 100, 0)
  $vals = @{ PCT = $pct; TARGET = $tgt; DATE = [string]$Record.date; CORRECT = [string]$Record.correct; SCORABLE = [string]$Record.scorable }
  return @(
    (Format-StatusString -Strings $Strings -Key "evalBelowHeader" -Vals $vals),
    "",
    (Format-StatusString -Strings $Strings -Key "evalBelowBody1" -Vals $vals),
    (Format-StatusString -Strings $Strings -Key "evalBelowBody2" -Vals $vals)
  )
}

# Idempotently reconcile the eval-quality region in a status file's LINES. Removes any existing
# BEGIN..END block (plus one trailing blank), then - when $Desired is non-empty - reinserts a fresh block
# immediately BEFORE the self-report header ($ReportHeader), the one anchor present in BOTH the
# reporter-only file and a launcher full render (falls back to the top of the file when that header is
# absent). Applying it twice with the same $Desired yields identical lines (idempotent). Pure: operates on
# and returns a string array, so -SelfTest exercises raise/clear/idempotent/preserve entirely offline.
function Set-EvalRegion {
  param([string[]]$Lines, [string[]]$Desired, [string]$ReportHeader, [string]$BeginMarker = $EvalBeginMarker, [string]$EndMarker = $EvalEndMarker)
  $src = @($Lines)
  # 1) Strip any existing region (BEGIN..END) plus a single trailing blank line if present.
  $b = -1; $e = -1
  for ($i = 0; $i -lt $src.Count; $i++) {
    if (([string]$src[$i]).Trim() -eq $BeginMarker) { $b = $i }
    elseif (([string]$src[$i]).Trim() -eq $EndMarker) { $e = $i; break }
  }
  $stripped = New-Object System.Collections.Generic.List[string]
  if ($b -ge 0 -and $e -gt $b) {
    for ($i = 0; $i -lt $b; $i++) { $stripped.Add([string]$src[$i]) }
    $after = $e + 1
    if ($after -lt $src.Count -and ([string]$src[$after]).Trim() -eq "") { $after++ }
    for ($i = $after; $i -lt $src.Count; $i++) { $stripped.Add([string]$src[$i]) }
  } else {
    foreach ($l in $src) { $stripped.Add([string]$l) }
  }
  if (-not $Desired -or $Desired.Count -eq 0) { return $stripped.ToArray() }
  # 2) Build the fresh region block (markers wrap the desired body; one trailing blank separates it).
  $block = New-Object System.Collections.Generic.List[string]
  $block.Add($BeginMarker)
  foreach ($d in $Desired) { $block.Add([string]$d) }
  $block.Add($EndMarker)
  $block.Add("")
  # 3) Insert before the report header (or at the top when it is absent).
  $insertAt = 0
  if ($ReportHeader) {
    for ($i = 0; $i -lt $stripped.Count; $i++) {
      if (([string]$stripped[$i]).Trim() -eq $ReportHeader.Trim()) { $insertAt = $i; break }
    }
  }
  $result = New-Object System.Collections.Generic.List[string]
  for ($i = 0; $i -lt $insertAt; $i++) { $result.Add([string]$stripped[$i]) }
  foreach ($l in $block) { $result.Add([string]$l) }
  for ($i = $insertAt; $i -lt $stripped.Count; $i++) { $result.Add([string]$stripped[$i]) }
  return $result.ToArray()
}

# Acquire an exclusive lock on the status file (CreateNew = atomic "only if absent"), reclaiming a STALE
# orphan older than $StaleSeconds. Identical semantics to loop-report-status.ps1's Get-StatusLock so the
# eval banner serializes against the lane heartbeats that write this same file under the same .lock every
# iteration. Returns $true if held (caller MUST Remove-Item the lockPath), $false after exhausting retries.
function Get-StatusLock {
  param([string]$LockPath, [int]$StaleSeconds = 60, [int]$Tries = 25, [int]$DelayMs = 200)
  for ($try = 0; $try -lt $Tries; $try++) {
    try {
      $fs = [System.IO.File]::Open($LockPath, [System.IO.FileMode]::CreateNew, [System.IO.FileAccess]::Write, [System.IO.FileShare]::None)
      $fs.Close()
      return $true
    } catch {
      $reclaimed = $false
      try {
        $li = Get-Item -LiteralPath $LockPath -ErrorAction SilentlyContinue
        if ($li -and (((Get-Date) - $li.LastWriteTime).TotalSeconds -gt $StaleSeconds)) {
          Remove-Item -LiteralPath $LockPath -Force -ErrorAction SilentlyContinue
          Write-Host "[loop-eval-nightly] reclaimed stale status lock (age > $StaleSeconds s; prior holder likely killed mid-write)."
          $reclaimed = $true
        }
      } catch {}
      if (-not $reclaimed) { Start-Sleep -Milliseconds $DelayMs }
    }
  }
  return $false
}

# ---------------------------------------------------------------------------
# -SelfTest: pure gates only (no npm / no network / no writes).
# ---------------------------------------------------------------------------
if ($SelfTest) {
  $ok = $true
  function Assert-E([string]$name, [bool]$cond) {
    if (-not $cond) { $script:ok = $false }
    Write-Host ("[selftest] " + $name + " -> " + $(if ($cond) { "OK" } else { "FAIL" }))
  }

  # A) Date stamp is the local calendar day (stable across the day, so the guard is once/day).
  $fixed = [datetime]"2026-07-04T02:15:00"
  Assert-E "date stamp is yyyy-MM-dd of the clock" ((Get-NightlyDateStamp -Now $fixed) -eq "2026-07-04")
  $fixedLate = [datetime]"2026-07-04T23:59:00"
  Assert-E "same calendar day -> same stamp (idempotent within the day)" ((Get-NightlyDateStamp -Now $fixedLate) -eq (Get-NightlyDateStamp -Now $fixed))

  # B) Daily path + already-ran guard (existence is the whole test). Use a throwaway temp dir.
  $tmp = Join-Path ([System.IO.Path]::GetTempPath()) ("eval-selftest-" + [guid]::NewGuid().ToString("N"))
  New-Item -ItemType Directory -Path $tmp -Force | Out-Null
  try {
    $stamp = "2026-07-04"
    $daily = Get-NightlyDailyPath -Dir $tmp -Stamp $stamp
    Assert-E "daily path is <dir>\<stamp>.json" ($daily -eq (Join-Path $tmp "2026-07-04.json"))
    Assert-E "before write: not already ran" (-not (Test-AlreadyRanTonight -Dir $tmp -Stamp $stamp))
    Set-Content -LiteralPath $daily -Value "{}" -Encoding UTF8
    Assert-E "after write: already ran (budget guard trips)" (Test-AlreadyRanTonight -Dir $tmp -Stamp $stamp)
    Assert-E "a DIFFERENT day is not yet run" (-not (Test-AlreadyRanTonight -Dir $tmp -Stamp "2026-07-05"))
  } finally {
    Remove-Item -LiteralPath $tmp -Recurse -Force -ErrorAction SilentlyContinue
  }

  # C) Regression classification: strictly-below is a regression; equal/above is not.
  Assert-E "0.75 < 0.80 -> belowTarget" (Test-EvalBelowTarget -StrictAccuracy 0.75 -Target 0.80)
  Assert-E "0.80 == 0.80 -> NOT below (floor is inclusive-ok)" (-not (Test-EvalBelowTarget -StrictAccuracy 0.80 -Target 0.80))
  Assert-E "0.905 baseline > 0.80 -> NOT below" (-not (Test-EvalBelowTarget -StrictAccuracy 0.9047619 -Target 0.80))

  # D) Record construction from a fixture report mirroring chatbot-eval-phase2.ts summary shape.
  $fixtureOk = [pscustomobject]@{
    base_url = "https://www.anzen-ai-portal.jp"; mode = "live"; generated_at = "2026-07-04T03:00:00.000Z"
    summary = [pscustomobject]@{ scorable = 21; correct = 19; partial = 2; incorrect = 0; strictAccuracy = 0.9047619047619048; usefulRate = 1 }
  }
  $rec = ConvertTo-NightlyRecord -Report $fixtureOk -Stamp "2026-07-04" -Target 0.80 -RanAtIso "2026-07-04T03:05:00+09:00"
  Assert-E "record carries strictAccuracy from summary" ([math]::Abs([double]$rec.strictAccuracy - 0.9047619047619048) -lt 1e-9)
  Assert-E "record correct/scorable copied" (($rec.correct -eq 19) -and ($rec.scorable -eq 21))
  Assert-E "baseline record is NOT belowTarget" (-not $rec.belowTarget)
  Assert-E "record ok=true" ([bool]$rec.ok)

  $fixtureBad = [pscustomobject]@{
    base_url = "https://www.anzen-ai-portal.jp"; mode = "live"; generated_at = "2026-07-04T03:00:00.000Z"
    summary = [pscustomobject]@{ scorable = 21; correct = 15; partial = 1; incorrect = 5; strictAccuracy = 0.7142857; usefulRate = 0.76 }
  }
  $recBad = ConvertTo-NightlyRecord -Report $fixtureBad -Stamp "2026-07-04" -Target 0.80 -RanAtIso "2026-07-04T03:05:00+09:00"
  Assert-E "degraded record (0.714) IS belowTarget" ([bool]$recBad.belowTarget)

  # E) History line is compact single-line JSON round-tripping the record fields.
  $line = Format-HistoryLine -Record $rec
  Assert-E "history line has no newline (one line per run)" (-not ($line -match "\n"))
  $round = $line | ConvertFrom-Json
  Assert-E "history line round-trips strictAccuracy" ([math]::Abs([double]$round.strictAccuracy - 0.9047619047619048) -lt 1e-9)
  Assert-E "history line round-trips date" ($round.date -eq "2026-07-04")

  # F) Failure record marks the day spent (ok=false) so the budget guard still trips.
  $fail = New-FailureRecord -Stamp "2026-07-04" -RanAtIso "2026-07-04T03:05:00+09:00" -ExitCode 1 -ErrorText "harness failed"
  Assert-E "failure record ok=false" (-not $fail.ok)
  Assert-E "failure record carries exit code" ($fail.exitCode -eq 1)

  # G) Written JSON is BOM-free so a JS/Node consumer (O18(b) /about) can JSON.parse it. WinPS 5.1
  # Set-Content -Encoding UTF8 would prepend a BOM (EF BB BF) that JSON.parse rejects; verify the
  # first bytes are the raw '{' of the JSON, not a BOM.
  $tmp2 = Join-Path ([System.IO.Path]::GetTempPath()) ("eval-bom-" + [guid]::NewGuid().ToString("N") + ".json")
  try {
    Write-JsonNoBom -Path $tmp2 -Text ($rec | ConvertTo-Json -Depth 5)
    $bytes = [System.IO.File]::ReadAllBytes($tmp2)
    $hasBom = ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF)
    Assert-E "written JSON has NO UTF-8 BOM (Node JSON.parse-safe)" (-not $hasBom)
    Assert-E "written JSON first char is '{'" ([char]$bytes[0] -eq '{')
    Add-JsonLineNoBom -Path $tmp2 -Line (Format-HistoryLine -Record $rec)
  } finally {
    Remove-Item -LiteralPath $tmp2 -Force -ErrorAction SilentlyContinue
  }

  # H) O18(b) eval-quality banner: strings loader, banner body, and the idempotent region reconciler.
  # Synthetic ASCII strings so this never depends on the real loop-status-strings.txt (keeps the gate
  # hermetic and this source ASCII).
  $S = @{
    evalBelowHeader = "## WARN: gen-quality below target (strictAccuracy {PCT}% < target {TARGET}%)"
    evalBelowBody1  = "{DATE} eval: {CORRECT}/{SCORABLE}={PCT}% below target {TARGET}%."
    evalBelowBody2  = "Check recent RAG/prompt/corpus changes."
    reportHeader    = "## SELF-REPORT HEADER"
  }
  # H1) Strings round-trip from a temp file (comment + KEY=VALUE lines).
  $tmpS = Join-Path ([System.IO.Path]::GetTempPath()) ("eval-strings-" + [guid]::NewGuid().ToString("N") + ".txt")
  try {
    Set-Content -LiteralPath $tmpS -Value @("# a comment", "evalBelowHeader=HDR {PCT}", "reportHeader=RH") -Encoding UTF8
    $ls = Import-StatusStrings -Path $tmpS
    Assert-E "H1: strings loader skips comments and parses KEY=VALUE" (($ls["evalBelowHeader"] -eq "HDR {PCT}") -and ($ls["reportHeader"] -eq "RH") -and (-not $ls.ContainsKey("# a comment")))
  } finally { Remove-Item -LiteralPath $tmpS -Force -ErrorAction SilentlyContinue }
  Assert-E "H1b: absent strings file -> empty map (no throw)" ((Import-StatusStrings -Path (Join-Path ([System.IO.Path]::GetTempPath()) ("nope-" + [guid]::NewGuid().ToString("N")))).Count -eq 0)

  # H2) Banner body: a below-target record yields the localized 4-line block; ok/above and failure yield none.
  $below = ConvertTo-NightlyRecord -Report $fixtureBad -Stamp "2026-07-04" -Target 0.80 -RanAtIso "2026-07-04T03:05:00+09:00"
  $bLines = Get-EvalBannerLines -Strings $S -Record $below
  Assert-E "H2: below-target record -> 4 banner lines" ($bLines.Count -eq 4)
  Assert-E "H2: header carries the rounded pct and target" (($bLines[0] -match "71\.4%") -and ($bLines[0] -match "80%"))
  Assert-E "H2: body carries correct/scorable" ($bLines[2] -match "15/21")
  Assert-E "H2: at/above-target record -> NO banner (empty)" ((Get-EvalBannerLines -Strings $S -Record $rec).Count -eq 0)
  $failRec = New-FailureRecord -Stamp "2026-07-04" -RanAtIso "2026-07-04T03:05:00+09:00" -ExitCode 1 -ErrorText "x"
  Assert-E "H2: failure record (ok=false) -> NO banner" ((Get-EvalBannerLines -Strings $S -Record $failRec).Count -eq 0)

  # H3) Region reconciler on a fixture that mirrors the live reporter-only status file.
  $doc = @(
    "## SELF-REPORT HEADER",
    "",
    "<!-- LANE-REPORT:BEGIN (managed by loop-report-status.ps1) -->",
    "- ops : last run ...",
    "<!-- LANE-REPORT:END -->"
  )
  $raised = Set-EvalRegion -Lines $doc -Desired $bLines -ReportHeader "## SELF-REPORT HEADER"
  Assert-E "H3: raise inserts the region ABOVE the self-report header" (($raised -join "`n").IndexOf($EvalBeginMarker) -lt ($raised -join "`n").IndexOf("## SELF-REPORT HEADER"))
  Assert-E "H3: raised region carries the warning header line" (($raised -join "`n") -match "gen-quality below target")
  Assert-E "H3: the lane rows are preserved verbatim" (($raised -join "`n") -match "- ops : last run")
  # H4) Idempotent: re-applying the same desired yields identical lines (no duplicate region).
  $raised2 = Set-EvalRegion -Lines $raised -Desired $bLines -ReportHeader "## SELF-REPORT HEADER"
  Assert-E "H4: reconcile is idempotent (2nd apply == 1st)" (($raised -join "`n") -eq ($raised2 -join "`n"))
  Assert-E "H4: exactly one BEGIN marker after double-apply" ((([regex]::Matches(($raised2 -join "`n"), [regex]::Escape($EvalBeginMarker))).Count) -eq 1)
  # H5) Clear: empty desired removes the region and restores the original document exactly.
  $cleared = Set-EvalRegion -Lines $raised -Desired @() -ReportHeader "## SELF-REPORT HEADER"
  Assert-E "H5: clearing removes the region entirely" (-not (($cleared -join "`n") -match "EVAL-QUALITY"))
  Assert-E "H5: cleared document equals the original (self-healing)" (($cleared -join "`n") -eq ($doc -join "`n"))
  # H6) No header present -> insert at the very top (still visible, never lost).
  $noHdr = Set-EvalRegion -Lines @("some other line") -Desired $bLines -ReportHeader "## MISSING HEADER"
  Assert-E "H6: absent header -> region inserted at the top" ($noHdr[0] -eq $EvalBeginMarker)

  # H7) Status lock: clean acquire / fresh respect / stale reclaim (parity with loop-report-status.ps1).
  $lp = Join-Path ([System.IO.Path]::GetTempPath()) ("eval-lock-" + [guid]::NewGuid().ToString("N") + ".lock")
  try {
    Assert-E "H7: clean acquire on absent lock" (Get-StatusLock -LockPath $lp -StaleSeconds 60 -Tries 5 -DelayMs 20)
    Assert-E "H7: a FRESH lock is respected (not reclaimed)" (-not (Get-StatusLock -LockPath $lp -StaleSeconds 60 -Tries 2 -DelayMs 20))
    (Get-Item -LiteralPath $lp).LastWriteTime = (Get-Date).AddSeconds(-120)
    Assert-E "H7: a STALE lock (>60s) is reclaimed and re-acquired" (Get-StatusLock -LockPath $lp -StaleSeconds 60 -Tries 5 -DelayMs 20)
  } finally { Remove-Item -LiteralPath $lp -Force -ErrorAction SilentlyContinue }

  if ($ok) { Write-Host "[selftest] PASS"; exit 0 } else { Write-Host "[selftest] FAIL"; exit 1 }
}

# ---------------------------------------------------------------------------
# Live path.
# ---------------------------------------------------------------------------
if (-not $RepoPath -or $RepoPath -eq "") {
  $RepoPath = $PSScriptRoot
  if (-not $RepoPath -or $RepoPath -eq "") { $RepoPath = (Get-Location).Path }
}
if (-not $OutDir -or $OutDir -eq "") { $OutDir = Join-Path $RepoPath ".loop-eval" }
$genDir = Join-Path $OutDir "genquality"
$webDir = Join-Path $RepoPath "web"

$logDir = Join-Path $RepoPath "logs"
if (-not $WhatIf -and -not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }
$runStamp = Get-Date -Format "yyyyMMdd-HHmmss"
$logFile = Join-Path $logDir ("eval-nightly-" + $runStamp + ".log")

function Write-Log([string]$msg) {
  $line = "[" + (Get-Date -Format "yyyy-MM-dd HH:mm:ss") + "] " + $msg
  Write-Host $line
  if (-not $WhatIf) { try { Add-Content -Path $logFile -Value $line -Encoding UTF8 } catch {} }
}

# The owner's ONE watch file. Resolve exactly like loop-report-status.ps1: the central status via
# SAFE_AI_LOOP_STATUS (the main tree the launcher reads/writes), else this tree's docs/loop-status.md.
$statusPath = if ([string]$env:SAFE_AI_LOOP_STATUS -ne "") { [string]$env:SAFE_AI_LOOP_STATUS } else { Join-Path $RepoPath "docs\loop-status.md" }
$stringsPath = Join-Path $RepoPath "loop-status-strings.txt"
$Strings = Import-StatusStrings -Path $stringsPath
$reportHeader = Format-StatusString -Strings $Strings -Key "reportHeader" -Vals $null

# Reconcile the below-target warning banner in the status file for a measured record: RAISE it when the
# record is below target, CLEAR it otherwise (self-healing on recovery). Lock-serialized against the lane
# heartbeats. -Preview writes a private dry file and takes no lock. Non-fatal throughout - a surfacing
# hiccup must never fail the measurement that already succeeded.
function Update-EvalStatusBanner {
  param([object]$Record, [switch]$Preview)
  if (-not $statusPath) { Write-Log "eval banner: no status path resolved; skipping (non-fatal)."; return }
  if (-not (Test-Path -LiteralPath $statusPath)) {
    Write-Log ("eval banner: status file not present yet (" + $statusPath + "); skipping (the reporter/launcher own its creation). Non-fatal.")
    return
  }
  $desired = @(Get-EvalBannerLines -Strings $Strings -Record $Record)
  $action = if ($desired.Count -gt 0) { "RAISE below-target warning" } else { "CLEAR (quality at/above target)" }
  if ($Preview) {
    try {
      $lines = @(Get-Content -Encoding UTF8 -Path $statusPath)
      $new = @(Set-EvalRegion -Lines $lines -Desired $desired -ReportHeader $reportHeader)
      $dry = Join-Path $logDir ("loop-status.evaldry-" + $runStamp + ".md")
      Set-Content -Path $dry -Value (($new -join "`r`n") + "`r`n") -Encoding UTF8 -NoNewline
      Write-Log ("[WHATIF] eval banner would " + $action + " -> " + $dry + " (no lock; real status untouched).")
    } catch { Write-Log ("[WHATIF] eval banner preview skipped: " + $_.Exception.Message) }
    return
  }
  $lockPath = $statusPath + ".lock"
  if (-not (Get-StatusLock -LockPath $lockPath -StaleSeconds 60 -Tries 25 -DelayMs 200)) {
    Write-Log "eval banner: could not acquire status lock after retries; skipping (non-fatal)."
    return
  }
  try {
    $lines = @(Get-Content -Encoding UTF8 -Path $statusPath)
    $new = @(Set-EvalRegion -Lines $lines -Desired $desired -ReportHeader $reportHeader)
    # Trim EOF blank lines so repeated writes never accumulate bloat (parity with the reporter's write).
    while ($new.Count -gt 0 -and ([string]$new[$new.Count - 1]).Trim() -eq "") { $new = $new[0..($new.Count - 2)] }
    Set-Content -Path $statusPath -Value (($new -join "`r`n") + "`r`n") -Encoding UTF8 -NoNewline
    Write-Log ("eval banner: " + $action + " in " + $statusPath)
  } catch { Write-Log ("eval banner: write failed (non-fatal): " + $_.Exception.Message) }
  finally { try { Remove-Item -LiteralPath $lockPath -Force -ErrorAction SilentlyContinue } catch {} }
}

$now = Get-Date
$stamp = Get-NightlyDateStamp -Now $now
$dailyPath = Get-NightlyDailyPath -Dir $genDir -Stamp $stamp
$latestPath = Join-Path $genDir "latest.json"
$historyPath = Join-Path $genDir "history.jsonl"

Write-Log ("=== loop-eval-nightly start (date=" + $stamp + ", base=" + $BaseUrl + ", target=" + $Target + ") ===")

# Budget guard: if today's marker already exists, this is a later ops iteration of the same day - no-op.
if (Test-AlreadyRanTonight -Dir $genDir -Stamp $stamp) {
  Write-Log ("already measured today (" + $stamp + "); skipping (idempotent - caps prod Gemini at 23Q/night). Daily record: " + $dailyPath)
  exit 0
}

# Setup precondition: the eval spawns vitest from web/node_modules. If web/ is not installed this is a
# setup issue, NOT a spent budget - write NO marker so a later call (after install) still measures.
$webPkg = Join-Path $webDir "package.json"
$nodeModules = Join-Path $webDir "node_modules"
if (-not (Test-Path -LiteralPath $webPkg) -or -not (Test-Path -LiteralPath $nodeModules)) {
  Write-Log ("web/ is not installed (package.json or node_modules missing at " + $webDir + "); skipping WITHOUT marking the day (will retry once installed). Non-fatal.")
  exit 0
}

$tmpReport = Join-Path ([System.IO.Path]::GetTempPath()) ("chatbot-genquality-" + $runStamp + ".json")

if ($WhatIf) {
  Write-Log "[WHATIF] today is NOT yet measured; would run the production generation-quality eval:"
  Write-Log ("[WHATIF]   cd " + $webDir + " ; CHATBOT_EVAL_BASE_URL=" + $BaseUrl + " CHATBOT_GENQUALITY_OUT=" + $tmpReport + " npm run eval:chatbot-gen")
  Write-Log ("[WHATIF]   -> on success write daily=" + $dailyPath + ", overwrite latest=" + $latestPath + ", append history=" + $historyPath)
  Write-Log ("[WHATIF]   -> record belowTarget when strictAccuracy < " + $Target + " (baseline 0.905); on belowTarget, RAISE the loop-status warning banner (O18(b) part 1))")
  Write-Log ("[WHATIF]   status file = " + $statusPath + " (reconcile eval-quality banner: raise below-target / clear otherwise)")
  # Preview the banner reconcile against the REAL status file (read-only -> dry file) using the most
  # recent measurement, if any, so a dry run shows exactly what the below-target warning would do.
  $latestForPreview = $null
  if (Test-Path -LiteralPath $latestPath) { try { $latestForPreview = Get-Content -Raw -Encoding UTF8 -LiteralPath $latestPath | ConvertFrom-Json } catch {} }
  if ($latestForPreview) { Update-EvalStatusBanner -Record $latestForPreview -Preview }
  else { Write-Log "[WHATIF] no latest.json yet; eval banner preview skipped (nothing measured)." }
  Write-Log "[WHATIF] no npm run, no network, no real-status writes performed."
  exit 0
}

if (-not (Test-Path -LiteralPath $genDir)) { New-Item -ItemType Directory -Path $genDir -Force | Out-Null }

Write-Log ("running production eval (23 HTTP questions against " + $BaseUrl + ")...")
$prevBase = $env:CHATBOT_EVAL_BASE_URL
$prevOut = $env:CHATBOT_GENQUALITY_OUT
$exitCode = 1
$evalOut = ""
try {
  $env:CHATBOT_EVAL_BASE_URL = $BaseUrl
  $env:CHATBOT_GENQUALITY_OUT = $tmpReport
  Push-Location $webDir
  try {
    # npm.cmd so Windows resolves the shim; capture combined output for the log tail on failure.
    $evalOut = & npm.cmd run eval:chatbot-gen 2>&1 | Out-String
    $exitCode = $LASTEXITCODE
  } finally {
    Pop-Location
  }
} catch {
  $evalOut = $_.Exception.Message
  $exitCode = 1
} finally {
  $env:CHATBOT_EVAL_BASE_URL = $prevBase
  $env:CHATBOT_GENQUALITY_OUT = $prevOut
}

# Parse the report the eval wrote. exit 0 = ran (report present). Anything else = harness failure; we
# STILL mark the day (the eval process started = budget considered spent) so ops does not re-hammer.
$report = $null
if ($exitCode -eq 0 -and (Test-Path -LiteralPath $tmpReport)) {
  try { $report = Get-Content -Raw -Encoding UTF8 -LiteralPath $tmpReport | ConvertFrom-Json } catch { $report = $null }
}

if ($null -eq $report) {
  $rec = New-FailureRecord -Stamp $stamp -RanAtIso $now.ToString("o") -ExitCode $exitCode -ErrorText "eval harness did not produce a parseable report"
  try { Write-JsonNoBom -Path $dailyPath -Text ($rec | ConvertTo-Json -Depth 5) } catch {}
  try { Add-JsonLineNoBom -Path $historyPath -Line (Format-HistoryLine -Record $rec) } catch {}
  Write-Log ("WARN: eval did not yield a usable report (exit=" + $exitCode + "); wrote a failure marker for " + $stamp + " so the day's budget is not re-spent. Tail:")
  Write-Log (($evalOut).ToString().Trim() | Out-String).Trim()
  try { Remove-Item -LiteralPath $tmpReport -Force -ErrorAction SilentlyContinue } catch {}
  exit 0
}

$rec = ConvertTo-NightlyRecord -Report $report -Stamp $stamp -Target $Target -RanAtIso $now.ToString("o")
$recJson = $rec | ConvertTo-Json -Depth 5
try { Write-JsonNoBom -Path $dailyPath -Text $recJson } catch { Write-Log ("WARN: could not write daily record: " + $_.Exception.Message) }
try { Write-JsonNoBom -Path $latestPath -Text $recJson } catch { Write-Log ("WARN: could not write latest.json: " + $_.Exception.Message) }
try { Add-JsonLineNoBom -Path $historyPath -Line (Format-HistoryLine -Record $rec) } catch { Write-Log ("WARN: could not append history: " + $_.Exception.Message) }
try { Remove-Item -LiteralPath $tmpReport -Force -ErrorAction SilentlyContinue } catch {}

$pct = [math]::Round([double]$rec.strictAccuracy * 100, 1)
if ($rec.belowTarget) {
  Write-Log ("MEASURED " + $stamp + ": strictAccuracy=" + $pct + "% (" + $rec.correct + "/" + $rec.scorable + ") BELOW target " + ([math]::Round($Target * 100, 0)) + "% - a regression. Raising the loop-status warning banner. Records: " + $dailyPath)
} else {
  Write-Log ("MEASURED " + $stamp + ": strictAccuracy=" + $pct + "% (" + $rec.correct + "/" + $rec.scorable + "), useful=" + [math]::Round([double]$rec.usefulRate * 100, 0) + "%, target " + ([math]::Round($Target * 100, 0)) + "% met. Records: " + $dailyPath + " / latest.json / history.jsonl")
}

# Surface (O18(b) part 1): raise the loud below-target warning on the owner's watch file when belowTarget,
# clear it otherwise (self-healing on recovery). Non-fatal - the measurement above already succeeded.
Update-EvalStatusBanner -Record $rec

Write-Log "=== loop-eval-nightly end ==="
exit 0
