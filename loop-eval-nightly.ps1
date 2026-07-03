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
  Write-Log ("[WHATIF]   -> record belowTarget when strictAccuracy < " + $Target + " (baseline 0.905); dashboard surfacing is O18(b))")
  Write-Log "[WHATIF] no npm run, no network, no writes performed."
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
  try { $rec | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $dailyPath -Encoding UTF8 } catch {}
  try { Add-Content -LiteralPath $historyPath -Value (Format-HistoryLine -Record $rec) -Encoding UTF8 } catch {}
  Write-Log ("WARN: eval did not yield a usable report (exit=" + $exitCode + "); wrote a failure marker for " + $stamp + " so the day's budget is not re-spent. Tail:")
  Write-Log (($evalOut).ToString().Trim() | Out-String).Trim()
  try { Remove-Item -LiteralPath $tmpReport -Force -ErrorAction SilentlyContinue } catch {}
  exit 0
}

$rec = ConvertTo-NightlyRecord -Report $report -Stamp $stamp -Target $Target -RanAtIso $now.ToString("o")
$recJson = $rec | ConvertTo-Json -Depth 5
try { $recJson | Set-Content -LiteralPath $dailyPath -Encoding UTF8 } catch { Write-Log ("WARN: could not write daily record: " + $_.Exception.Message) }
try { $recJson | Set-Content -LiteralPath $latestPath -Encoding UTF8 } catch { Write-Log ("WARN: could not write latest.json: " + $_.Exception.Message) }
try { Add-Content -LiteralPath $historyPath -Value (Format-HistoryLine -Record $rec) -Encoding UTF8 } catch { Write-Log ("WARN: could not append history: " + $_.Exception.Message) }
try { Remove-Item -LiteralPath $tmpReport -Force -ErrorAction SilentlyContinue } catch {}

$pct = [math]::Round([double]$rec.strictAccuracy * 100, 1)
if ($rec.belowTarget) {
  Write-Log ("MEASURED " + $stamp + ": strictAccuracy=" + $pct + "% (" + $rec.correct + "/" + $rec.scorable + ") BELOW target " + ([math]::Round($Target * 100, 0)) + "% - a regression. (loop-status surfacing is O18(b).) Records: " + $dailyPath)
} else {
  Write-Log ("MEASURED " + $stamp + ": strictAccuracy=" + $pct + "% (" + $rec.correct + "/" + $rec.scorable + "), useful=" + [math]::Round([double]$rec.usefulRate * 100, 0) + "%, target " + ([math]::Round($Target * 100, 0)) + "% met. Records: " + $dailyPath + " / latest.json / history.jsonl")
}
Write-Log "=== loop-eval-nightly end ==="
exit 0
