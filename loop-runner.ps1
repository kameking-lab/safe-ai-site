<#
.SYNOPSIS
  Unattended self-run loop for the safe-ai-site project.
  Repeatedly launches the Claude Code CLI (headless) to process one BACKLOG task per iteration.

.DESCRIPTION
  Claude Code is turn-based: it ends a turn after replying and waits for the next human input.
  This script acts as the "human", launching `claude` headless at a fixed interval so the
  agent processes BACKLOG.md one task per iteration without manual prompting.

  This file is intentionally PURE ASCII so Windows PowerShell 5.x parses it correctly
  (BOM-less UTF-8 with Japanese was mis-decoded as Shift-JIS and broke parsing).
  The variable Japanese instruction is kept in loop-prompt.txt (UTF-8) and read at runtime.

  Backoff: when an iteration fails fast (exit code != 0 within 2 minutes, e.g. the
  Claude usage limit is active), the wait is extended after 3 consecutive short
  failures to 5 minutes, then 10 minutes, then capped at 30 minutes. Any successful
  or long-running iteration restores the normal interval immediately. This avoids
  hammering the CLI every 2 minutes for hours while a usage limit is in effect.
  Run with -SelfTest to dry-run the backoff schedule (no Claude CLI needed).

  Each iteration the agent is told to:
    1) Merge its own CI-green open PRs, pull main, ensure clean.
    2) Take the top open task in BACKLOG.md (or replenish if fewer than 3 remain).
    3) Implement on one branch, run gates (tsc/lint/test/build), push, open a PR.
    4) Update BACKLOG.md and the cycle-log.
  main stays deployable; only CI-green PRs are merged.

.PARAMETER IntervalSeconds
  Seconds to wait after each iteration (default 120). CI runs async; the next iteration
  collects green PRs.

.PARAMETER MaxIterations
  Max iterations (default 0 = unlimited; stop with Ctrl+C).

.PARAMETER UntilIso
  Stop once past this ISO datetime, e.g. "2026-06-09T09:13:00" (default empty = no limit).

.PARAMETER ClaudeCmd
  Command/path for the Claude CLI (default "claude").

.PARAMETER Model
  Model id passed to the Claude CLI (default "claude-fable-5").
  Pass -Model "" to let the CLI use its own default.

.PARAMETER PromptFile
  UTF-8 file with the per-iteration instruction (default loop-prompt.txt next to this script,
  or loop-prompt-<lane>.txt when -Lane is set and that file exists).

.PARAMETER Lane
  Lane name for parallel multi-lane operation (default "" = legacy single all-domains loop).
  When set (e.g. "seo", "data", "ux-records"):
    - logs go to logs/loop-<lane>-<stamp>.log (so lanes never interleave in one log),
    - the default prompt becomes loop-prompt-<lane>.txt when present (each lane reads only
      its own BACKLOG-<lane>.md and touches only its own file domain),
    - the single-instance guard becomes PER-LANE: a second runner for the SAME lane is
      blocked, but runners for OTHER lanes (and the legacy no-lane loop) are allowed to run
      concurrently. This is the core of safe parallelism.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\loop-runner.ps1

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\loop-runner.ps1 -IntervalSeconds 300 -UntilIso "2026-06-09T09:13:00"

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\loop-runner.ps1 -Lane seo -Model claude-opus-4-8 -UntilIso "2026-06-14T10:00:00"
#>
[CmdletBinding()]
param(
  [int]$IntervalSeconds = 120,
  [int]$MaxIterations = 0,
  [string]$UntilIso = "",
  [string]$RepoPath = $PSScriptRoot,
  [string]$ClaudeCmd = "claude",
  [string]$Model = "claude-fable-5",
  [string]$PromptFile = "",
  [string]$Lane = "",
  [switch]$SelfTest
)

$ErrorActionPreference = "Continue"
# Send UTF-8 (no BOM) to native commands so the Japanese prompt reaches claude intact.
$OutputEncoding = New-Object System.Text.UTF8Encoding $false
try { [Console]::OutputEncoding = New-Object System.Text.UTF8Encoding $false } catch {}

# Short-failure backoff schedule (typically the Claude usage limit): keep the normal
# interval until 3 consecutive short failures, then step 5 -> 10 -> 30 minutes. The
# returned wait never drops below the configured interval. Pure function so -SelfTest
# can dry-run the schedule without launching the CLI.
function Get-BackoffSeconds([int]$ConsecutiveShortFails, [int]$IntervalSeconds) {
  $backoff = 0
  if ($ConsecutiveShortFails -ge 3) { $backoff = 300 }
  if ($ConsecutiveShortFails -ge 4) { $backoff = 600 }
  if ($ConsecutiveShortFails -ge 5) { $backoff = 1800 }
  if ($backoff -gt $IntervalSeconds) { return $backoff }
  return $IntervalSeconds
}

# Whether a run should self-report its deadline stop into the central docs/loop-status.md.
# Only a PERSISTENT LANED runner qualifies: a one-shot planner/critic pass (-MaxIterations >= 1)
# must not stamp a spurious "stopped: deadline" row, and the legacy no-lane loop has no lane row to
# upsert. Pure function so -SelfTest can assert the gate without launching anything. (See
# Report-DeadlineStop below for why the runner must self-report: on a genuine deadline stop there is
# no further claude iteration to run the per-iteration report step, so the runner reports it itself.)
function Test-ShouldReportDeadlineStop([string]$LaneTag, [int]$MaxIter) {
  return (($LaneTag -ne "") -and ($MaxIter -le 0))
}

# Dry-run self-check of the backoff schedule. Runs BEFORE any Claude CLI / scheduler
# dependency so it is safe to invoke on any machine: powershell -File loop-runner.ps1 -SelfTest
if ($SelfTest) {
  $cases = @(
    @{ f = 0; want = [Math]::Max($IntervalSeconds, 0) },
    @{ f = 2; want = [Math]::Max($IntervalSeconds, 0) },
    @{ f = 3; want = [Math]::Max($IntervalSeconds, 300) },
    @{ f = 4; want = [Math]::Max($IntervalSeconds, 600) },
    @{ f = 5; want = [Math]::Max($IntervalSeconds, 1800) },
    @{ f = 9; want = [Math]::Max($IntervalSeconds, 1800) }
  )
  $ok = $true
  foreach ($c in $cases) {
    $got = Get-BackoffSeconds $c.f $IntervalSeconds
    $pass = ($got -eq $c.want)
    if (-not $pass) { $ok = $false }
    Write-Host ("[selftest] fails=" + $c.f + " interval=" + $IntervalSeconds + "s -> " + $got + "s (want " + $c.want + ") " + $(if ($pass) { "OK" } else { "FAIL" }))
  }
  # Core assertion for S13-b: the schedule must reach the 30-minute (1800s) cap.
  $capReached = ((Get-BackoffSeconds 5 60) -eq 1800) -and ((Get-BackoffSeconds 99 60) -eq 1800)
  Write-Host ("[selftest] 30-min (1800s) cap reached at 5+ consecutive short fails: " + $(if ($capReached) { "YES" } else { "NO" }))

  # Deadline-stop reporting gate: only a persistent laned runner self-reports its deadline stop.
  $gateCases = @(
    @{ lane = ""; max = 0; want = $false },     # legacy no-lane loop: no lane row -> no report
    @{ lane = "ops"; max = 0; want = $true },   # persistent laned runner -> report the stop
    @{ lane = "ops"; max = 1; want = $false },  # one-shot planner/critic pass -> no spurious stop
    @{ lane = "data"; max = 5; want = $false }  # capped run -> no report
  )
  $gateOk = $true
  foreach ($g in $gateCases) {
    $got = Test-ShouldReportDeadlineStop $g.lane $g.max
    $pass = ($got -eq $g.want)
    if (-not $pass) { $gateOk = $false }
    Write-Host ("[selftest] deadline-stop gate lane='" + $g.lane + "' max=" + $g.max + " -> " + $got + " (want " + $g.want + ") " + $(if ($pass) { "OK" } else { "FAIL" }))
  }

  if ($ok -and $capReached -and $gateOk) { Write-Host "[selftest] PASS"; exit 0 } else { Write-Host "[selftest] FAIL"; exit 1 }
}

if (-not $RepoPath -or $RepoPath -eq "") { $RepoPath = (Get-Location).Path }
Set-Location $RepoPath
$laneTag = $Lane.Trim()
# Default prompt: lane-specific (loop-prompt-<lane>.txt) when present, else the shared file.
if ($PromptFile -eq "") {
  if ($laneTag -ne "") {
    $lanePrompt = Join-Path $RepoPath ("loop-prompt-" + $laneTag + ".txt")
    if (Test-Path $lanePrompt) { $PromptFile = $lanePrompt } else { $PromptFile = Join-Path $RepoPath "loop-prompt.txt" }
  } else {
    $PromptFile = Join-Path $RepoPath "loop-prompt.txt"
  }
}

$logDir = Join-Path $RepoPath "logs"
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }
$runStamp = Get-Date -Format "yyyyMMdd-HHmmss"
$logPrefix = if ($laneTag -ne "") { "loop-" + $laneTag + "-" } else { "loop-" }
$logFile = Join-Path $logDir ($logPrefix + $runStamp + ".log")

function Write-Log([string]$msg) {
  $line = "[" + (Get-Date -Format "yyyy-MM-dd HH:mm:ss") + "] " + $msg
  Write-Host $line
  try { Add-Content -Path $logFile -Value $line -Encoding UTF8 } catch {}
}

# Single-instance guard (PER LANE): exit immediately when another loop-runner.ps1 process
# for the SAME lane is already running, so a manual run and a Task Scheduler (logon-trigger)
# run never overlap within a lane. Different lanes (and the legacy no-lane loop) are allowed
# to run concurrently - that is what makes parallel multi-lane operation safe.
# A process scan is used instead of a lock file on purpose: a PC restart or crash leaves no
# stale lock to clear, and instances started before this guard existed are detected as well.
# Failure of the scan itself only warns (fail-open) so the resurrection path never deadlocks
# on a broken WMI service.
$conflictPids = @()
try {
  $running = @(Get-CimInstance Win32_Process -Filter "Name LIKE 'powershell%' OR Name LIKE 'pwsh%'" -ErrorAction Stop |
    Where-Object { $_.ProcessId -ne $PID -and $_.CommandLine -like '*loop-runner.ps1*' })
  foreach ($p in $running) {
    $cl = [string]$p.CommandLine
    $clHasLane = ($cl -match '(?i)-Lane(\s+|:|=)\S')
    if ($laneTag -eq "") {
      # Legacy (no lane): conflict only with another legacy runner (one that has no -Lane).
      if (-not $clHasLane) { $conflictPids += $p.ProcessId }
    } else {
      # Laned: conflict only with a runner started for the SAME lane name.
      $pat = '(?i)-Lane(\s+|:|=)["'']?' + [regex]::Escape($laneTag) + '(?=$|\s|["''])'
      if ($cl -match $pat) { $conflictPids += $p.ProcessId }
    }
  }
} catch {
  Write-Log ("WARN: single-instance scan failed (" + $_.Exception.Message + "); continuing without guard")
}
if ($conflictPids.Count -gt 0) {
  $laneLabel = if ($laneTag -ne "") { $laneTag } else { "(default/legacy)" }
  Write-Log ("GUARD: another loop-runner for lane '" + $laneLabel + "' is already running (PID " + ($conflictPids -join ", ") + "). Exiting to keep a single instance per lane.")
  exit 0
}

# Preflight checks.
$claudeResolved = $null
try { $claudeResolved = (Get-Command $ClaudeCmd -ErrorAction Stop).Source } catch {}
if (-not $claudeResolved) {
  Write-Log ("ERROR: Claude CLI '" + $ClaudeCmd + "' not found in PATH. Pass -ClaudeCmd with the full path, e.g. -ClaudeCmd '$env:APPDATA\npm\claude.cmd'")
  exit 1
}
if (-not (Test-Path $PromptFile)) {
  Write-Log ("ERROR: prompt file not found: " + $PromptFile)
  exit 1
}

$prompt = Get-Content -Raw -Encoding UTF8 -Path $PromptFile

# Self-report a genuine deadline stop into the ONE central docs/loop-status.md via
# loop-report-status.ps1. When UntilIso is reached the runner breaks and exits 0; historically that
# stop was logged only to this lane's PRIVATE log, so the owner's single watch-file kept showing the
# lane "起動" with a FROZEN heartbeat and NO reason - the exact silent normal-stop O16 exists to kill
# (the launcher's loud stop banner only re-appears at the NEXT logon / 07:00 pass). There is no
# further claude iteration to run the per-iteration report step, so the runner reports the stop
# itself: a "stopped: deadline" note into the lane's own row, prompting the untilIso edit. The child
# powershell inherits $env:SAFE_AI_LOOP_STATUS (exported by the launcher) so it routes to the central
# file, exactly like the per-iteration reports. Non-fatal by design (never blocks shutdown).
function Report-DeadlineStop {
  if (-not (Test-ShouldReportDeadlineStop $laneTag $MaxIterations)) { return }
  $reporter = Join-Path $RepoPath "loop-report-status.ps1"
  if (-not (Test-Path $reporter)) { Write-Log ("deadline-stop report skipped: no reporter at " + $reporter); return }
  # Japanese note lives in loop-status-strings.txt (this .ps1 stays pure ASCII); ASCII fallback if
  # the strings file or key is missing, so the report is never blank.
  $note = "stopped: run deadline (untilIso " + $UntilIso + ") reached; edit loop-config.json untilIso and re-run launcher to resume"
  try {
    $sp = Join-Path $RepoPath "loop-status-strings.txt"
    if (Test-Path $sp) {
      foreach ($ln in (Get-Content -Encoding UTF8 -Path $sp)) {
        if ($ln -match '^\s*#') { continue }
        $i = $ln.IndexOf('=')
        if ($i -gt 0 -and $ln.Substring(0, $i) -eq 'runnerDeadlineStop') { $note = $ln.Substring($i + 1).Replace('{UNTIL}', $UntilIso); break }
      }
    }
  } catch {}
  try {
    Write-Log ("reporting deadline stop to central status (lane=" + $laneTag + ").")
    & powershell -NoProfile -ExecutionPolicy Bypass -File $reporter -Lane $laneTag -Note $note 2>&1 | Tee-Object -FilePath $logFile -Append | Out-Null
  } catch {
    Write-Log ("WARN: deadline-stop report failed (non-fatal): " + $_.Exception.Message)
  }
}

$iter = 0
$consecutiveShortFails = 0
Write-Log ("=== loop-runner start (lane=" + $(if ($laneTag -ne "") { $laneTag } else { "(default)" }) + ", interval=" + $IntervalSeconds + "s, max=" + $MaxIterations + ", until='" + $UntilIso + "', repo=" + $RepoPath + ") ===")
Write-Log ("claude: " + $claudeResolved + " | model: " + $(if ($Model -ne "") { $Model } else { "(cli default)" }) + " | prompt: " + $PromptFile)
Write-Log ("log: " + $logFile)

while ($true) {
  $iter++
  if ($MaxIterations -gt 0 -and $iter -gt $MaxIterations) { Write-Log "MaxIterations reached. Stop."; break }
  if ($UntilIso -ne "") {
    try { if ((Get-Date) -ge [datetime]::Parse($UntilIso)) { Write-Log ("Deadline " + $UntilIso + " reached. Stop."); Report-DeadlineStop; break } } catch {}
  }

  Write-Log ("----- iteration #" + $iter + " start -----")
  $claudeArgs = @("-p", "--dangerously-skip-permissions")
  if ($Model -ne "") { $claudeArgs += @("--model", $Model) }
  $iterStart = Get-Date
  $iterExit = $null
  try {
    # Pipe the UTF-8 prompt to claude headless via stdin; tee output to the log.
    $prompt | & $ClaudeCmd @claudeArgs 2>&1 | Tee-Object -FilePath $logFile -Append
    $iterExit = $LASTEXITCODE
    Write-Log ("iteration #" + $iter + " done (exit=" + $iterExit + ")")
  } catch {
    Write-Log ("iteration #" + $iter + " exception: " + $_.Exception.Message)
  }

  # Short-failure backoff: a non-zero exit (or exception) within 2 minutes of start
  # is treated as a fast failure (typically the usage limit). 3 in a row -> 5 min,
  # 4 -> 10 min, 5+ -> 30 min cap (see Get-BackoffSeconds). Success or a long-running
  # iteration resets it.
  $iterSeconds = ((Get-Date) - $iterStart).TotalSeconds
  $isShortFail = (($null -eq $iterExit) -or ($iterExit -ne 0)) -and ($iterSeconds -lt 120)
  if ($isShortFail) {
    $consecutiveShortFails++
  } else {
    if ($consecutiveShortFails -ge 3) {
      Write-Log ("backoff reset after " + $consecutiveShortFails + " consecutive short failures; normal interval restored")
    }
    $consecutiveShortFails = 0
  }

  if ($MaxIterations -gt 0 -and $iter -ge $MaxIterations) { Write-Log "MaxIterations reached. Stop."; break }
  if ($UntilIso -ne "") {
    try { if ((Get-Date) -ge [datetime]::Parse($UntilIso)) { Write-Log ("Deadline " + $UntilIso + " reached. Stop."); Report-DeadlineStop; break } } catch {}
  }
  $waitSeconds = Get-BackoffSeconds $consecutiveShortFails $IntervalSeconds
  if ($consecutiveShortFails -ge 3) {
    Write-Log ("backoff engaged (" + $consecutiveShortFails + " consecutive short failures, likely usage limit): waiting " + $waitSeconds + "s before next iteration...")
  } else {
    Write-Log ("waiting " + $waitSeconds + "s before next iteration...")
  }
  Start-Sleep -Seconds $waitSeconds
}
Write-Log "=== loop-runner end ==="
