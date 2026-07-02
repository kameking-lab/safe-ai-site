<#
.SYNOPSIS
  Zero-argument launcher for the safe-ai-site self-run loops. Reads loop-config.json,
  ignites every enabled lane's loop-runner.ps1 idempotently, runs the supply (planner) and
  inspection (critic) gates when due, and keeps docs/loop-status.md fresh so a stopped loop
  is LOUD, never silent.

.DESCRIPTION
  PERMANENT FIX for the "baked deadline" failure (diagnosis 08 section A). The old design
  baked -UntilIso into the Task Scheduler action, so extending the run required re-registering
  the task from human memory; when the deadline passed the task ran, judged itself expired,
  and exited 0 (a SILENT normal stop that stayed invisible for 3 weeks).

  This launcher removes that failure mode on three axes:
    1) The stop time lives in loop-config.json (untilIso, one human-edited line). The scheduler
       calls THIS launcher with ZERO baked arguments, so the scheduler is never re-registered.
    2) The scheduler fires at logon AND every day at 07:00. The daily run rewrites
       docs/loop-status.md every day, so a past-deadline stop is re-surfaced daily as a loud
       banner instead of succeeding once and vanishing. It also warns while lanes are STILL
       running when the deadline is near (warnWithinDays), so the extension happens before
       expiry - breaking the chicken-and-egg where the "next sprint" that was supposed to
       extend the deadline never fired because the deadline had already expired.
    3) The daily run also RESURRECTS any lane whose runner died: the per-lane single-instance
       guard in loop-runner.ps1 makes re-launch idempotent (a live lane self-exits, a dead
       lane restarts).

  Lane topology: the content lanes (data/seo/ux-hub/ux-records/ux-tools) each run in their own
  clone under lanesRoot so their git working trees never collide. The ops lane runs in THIS
  main repo (repoPath "."), because it owns the repo-root loop-* infrastructure.

  Mutable runtime state (lastCriticIso) is kept in the gitignored loop-state.json, NOT in the
  tracked loop-config.json, so the ops lane (which runs in this same tree) keeps a clean tree.
  docs/loop-status.md is likewise launcher-written and gitignored - see the notes doc.

  Pure ASCII for Windows PowerShell 5.x (BOM-less UTF-8 with Japanese was mis-decoded as
  Shift-JIS and broke parsing). All Japanese lives in loop-status-strings.txt and
  loop-prompt-*.txt (UTF-8), read at runtime.

.PARAMETER Register
  (Re)register the Task Scheduler task 'safe-ai-loop-runner' to run THIS launcher with no baked
  arguments, triggered at logon and daily at 07:00. Run once after pulling O16 to main.

.PARAMETER WhatIf
  Dry run: parse config, evaluate every gate, and print what WOULD happen WITHOUT launching any
  runner, invoking claude, or touching docs/loop-status.md. Writes the computed status to
  logs/loop-status.dryrun.md so it can be inspected. Used for stub verification.

.PARAMETER ConfigPath
  Path to loop-config.json (default: next to this script).

.PARAMETER ClaudeCmd
  Claude CLI command (default 'claude'); forwarded to every lane runner and one-shot.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\loop-launcher.ps1 -Register

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\loop-launcher.ps1

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\loop-launcher.ps1 -WhatIf
#>
[CmdletBinding()]
param(
  [switch]$Register,
  [switch]$WhatIf,
  [string]$ConfigPath = "",
  [string]$ClaudeCmd = "claude"
)

$ErrorActionPreference = "Continue"
$OutputEncoding = New-Object System.Text.UTF8Encoding $false
try { [Console]::OutputEncoding = New-Object System.Text.UTF8Encoding $false } catch {}

$repoRoot = $PSScriptRoot
if (-not $repoRoot -or $repoRoot -eq "") { $repoRoot = (Get-Location).Path }
if ($ConfigPath -eq "") { $ConfigPath = Join-Path $repoRoot "loop-config.json" }
$statePath = Join-Path $repoRoot "loop-state.json"
$statusPath = Join-Path $repoRoot "docs\loop-status.md"
$stringsPath = Join-Path $repoRoot "loop-status-strings.txt"

$logDir = Join-Path $repoRoot "logs"
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }
$launchStamp = Get-Date -Format "yyyyMMdd-HHmmss"
$launchLog = Join-Path $logDir ("launcher-" + $launchStamp + ".log")

function Write-Launcher([string]$msg) {
  $line = "[" + (Get-Date -Format "yyyy-MM-dd HH:mm:ss") + "] " + $msg
  Write-Host $line
  try { Add-Content -Path $launchLog -Value $line -Encoding UTF8 } catch {}
}

# Japanese status strings live in an external UTF-8 file so this script stays pure ASCII.
$LS = @{}
if (Test-Path $stringsPath) {
  foreach ($ln in (Get-Content -Encoding UTF8 -Path $stringsPath)) {
    if ($ln -match '^\s*#') { continue }
    $i = $ln.IndexOf('=')
    if ($i -gt 0) { $LS[$ln.Substring(0, $i)] = $ln.Substring($i + 1) }
  }
}
function S([string]$key) { if ($LS.ContainsKey($key)) { return [string]$LS[$key] } else { return $key } }
function Fmt([string]$key, [hashtable]$vals) {
  $t = S $key
  if ($vals) { foreach ($k in $vals.Keys) { $t = $t.Replace('{' + $k + '}', [string]$vals[$k]) } }
  return $t
}

# ---------------------------------------------------------------------------
# -Register: (re)register the scheduled task pointing at THIS launcher, no baked args.
# ---------------------------------------------------------------------------
function Register-LoopTask {
  param([string]$LauncherPath)
  $taskName = "safe-ai-loop-runner"
  $arg = '-NoProfile -ExecutionPolicy Bypass -File "' + $LauncherPath + '"'
  $action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument $arg -WorkingDirectory (Split-Path -Parent $LauncherPath)
  $tLogon = New-ScheduledTaskTrigger -AtLogOn
  $tDaily = New-ScheduledTaskTrigger -Daily -At ([datetime]"07:00")
  $principal = New-ScheduledTaskPrincipal -UserId ($env:USERDOMAIN + "\" + $env:USERNAME) -LogonType Interactive -RunLevel Limited
  # StartWhenAvailable: if the PC was off at 07:00, run at next boot (so the heartbeat/warning
  # is never skipped). IgnoreNew: never stack a second launcher on top of a running one.
  $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -MultipleInstances IgnoreNew
  # -ErrorAction Stop so a denied/failed registration THROWS (never a silent success - that
  # silent-success-on-failure is the very failure class O16 exists to kill).
  Register-ScheduledTask -TaskName $taskName -Action $action -Trigger @($tLogon, $tDaily) -Principal $principal -Settings $settings -Force -ErrorAction Stop | Out-Null
  # Post-verify: the registered action must point at THIS launcher with NO baked -UntilIso.
  $reg = (Get-ScheduledTask -TaskName $taskName -ErrorAction Stop).Actions[0].Arguments
  if (($reg -notmatch 'loop-launcher\.ps1') -or ($reg -match 'UntilIso')) {
    throw ("post-verify failed: task action is still '" + $reg + "'")
  }
  Write-Launcher ("Task Scheduler '" + $taskName + "' registered and verified. action args = " + $reg)
}

if ($Register) {
  $launcherPath = Join-Path $repoRoot "loop-launcher.ps1"
  $isAdmin = $false
  try { $isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltinRole]::Administrator) } catch {}
  if (-not $isAdmin) {
    Write-Launcher "ERROR: -Register needs an ELEVATED PowerShell (Run as administrator)."
    Write-Launcher "The existing 'safe-ai-loop-runner' task was created elevated, so updating it requires admin rights. Nothing was changed."
    Write-Launcher ('Run this ONCE from an elevated PowerShell:  powershell -ExecutionPolicy Bypass -File "' + $launcherPath + '" -Register')
    exit 1
  }
  try {
    Register-LoopTask -LauncherPath $launcherPath
    Write-Launcher "Register done. The scheduler now runs the zero-arg launcher; extend the run by editing loop-config.json untilIso only."
  } catch {
    Write-Launcher ("ERROR: registration failed (nothing changed): " + $_.Exception.Message)
    exit 1
  }
  exit 0
}

# ---------------------------------------------------------------------------
# Read config + state.
# ---------------------------------------------------------------------------
if (-not (Test-Path $ConfigPath)) { Write-Launcher ("ERROR: config not found: " + $ConfigPath); exit 1 }
try {
  $cfg = Get-Content -Raw -Encoding UTF8 -Path $ConfigPath | ConvertFrom-Json
} catch {
  Write-Launcher ("ERROR: could not parse " + $ConfigPath + ": " + $_.Exception.Message); exit 1
}

$state = $null
if (Test-Path $statePath) {
  try { $state = Get-Content -Raw -Encoding UTF8 -Path $statePath | ConvertFrom-Json } catch {}
}
if ($null -eq $state) { $state = [pscustomobject]@{ lastCriticIso = "" } }
if (-not ($state.PSObject.Properties.Name -contains "lastCriticIso")) {
  $state | Add-Member -NotePropertyName lastCriticIso -NotePropertyValue "" -Force
}

function Save-State {
  if ($WhatIf) { Write-Launcher "[WHATIF] would save loop-state.json"; return }
  try { $state | ConvertTo-Json | Set-Content -Path $statePath -Encoding UTF8 } catch { Write-Launcher ("WARN: could not save state: " + $_.Exception.Message) }
}

# Resolve lanes root (relative paths are relative to the repo root).
$lanesRoot = [string]$cfg.lanesRoot
if ($lanesRoot -eq "") { $lanesRoot = Join-Path (Split-Path -Parent $repoRoot) "safe-ai-lanes" }
elseif (-not [System.IO.Path]::IsPathRooted($lanesRoot)) { $lanesRoot = [System.IO.Path]::GetFullPath((Join-Path $repoRoot $lanesRoot)) }

function Resolve-LaneRepo {
  param($lane)
  if ($lane.PSObject.Properties.Name -contains "repoPath" -and [string]$lane.repoPath -ne "") {
    $rp = [string]$lane.repoPath
    if ($rp -eq ".") { return $repoRoot }
    if ([System.IO.Path]::IsPathRooted($rp)) { return $rp }
    return [System.IO.Path]::GetFullPath((Join-Path $repoRoot $rp))
  }
  return (Join-Path $lanesRoot $lane.name)
}

function Get-OpenTaskCount {
  param([string]$BacklogPath)
  if (-not (Test-Path $BacklogPath)) { return -1 }
  try { return @(Select-String -Path $BacklogPath -Pattern '^- \[ \]').Count } catch { return -1 }
}

# One scan of running loop-runner.ps1 processes, mapped to their -Lane value, for status.
function Get-RunningLanes {
  $map = @{}
  try {
    $procs = @(Get-CimInstance Win32_Process -Filter "Name LIKE 'powershell%' OR Name LIKE 'pwsh%'" -ErrorAction Stop |
      Where-Object { $_.CommandLine -like '*loop-runner.ps1*' })
    foreach ($p in $procs) {
      $cl = [string]$p.CommandLine
      $m = [regex]::Match($cl, '(?i)-Lane(\s+|:|=)["'']?([\w\-]+)')
      if ($m.Success) { $map[$m.Groups[2].Value] = $true }
    }
  } catch {}
  return $map
}

# Scheduler self-check: is the 'safe-ai-loop-runner' task actually pointing at THIS launcher
# (permanent fix active), or still at the old baked-deadline loop-runner (needs one elevated
# -Register)? Surfacing 'stale'/'missing' in loop-status.md keeps the one remaining manual
# step visible in the same file the operator watches.
function Get-SchedulerHealth {
  try {
    $t = Get-ScheduledTask -TaskName 'safe-ai-loop-runner' -ErrorAction Stop
    $a = [string]$t.Actions[0].Arguments
    if (($a -match 'loop-launcher\.ps1') -and ($a -notmatch 'UntilIso')) { return 'ok' }
    return 'stale'
  } catch { return 'missing' }
}

# ---------------------------------------------------------------------------
# Deadline evaluation (the heart of the permanent fix).
# ---------------------------------------------------------------------------
$now = Get-Date
$until = $null
if ([string]$cfg.untilIso -ne "") { try { $until = [datetime]::Parse([string]$cfg.untilIso) } catch {} }
$deadlinePassed = ($null -ne $until) -and ($now -ge $until)
$daysRemaining = $null
if ($null -ne $until) { $daysRemaining = [math]::Round(($until - $now).TotalDays, 1) }
$warnWithin = if ($cfg.warnWithinDays) { [double]$cfg.warnWithinDays } else { 3 }
$nearDeadline = ($null -ne $daysRemaining) -and (-not $deadlinePassed) -and ($daysRemaining -le $warnWithin)

Write-Launcher ("=== loop-launcher start (config=" + $ConfigPath + ", until=" + ([string]$cfg.untilIso) + ", daysRemaining=" + ([string]$daysRemaining) + ", whatif=" + $WhatIf + ") ===")

# ---------------------------------------------------------------------------
# One-shot runner (planner / critic) via loop-runner.ps1 with a distinct lane tag and
# -MaxIterations 1. Blocking with a timeout so a hung claude cannot wedge the launcher,
# and so it never overlaps the persistent runner in the same clone (distinct tag + ordering).
# ---------------------------------------------------------------------------
function Invoke-OneShot {
  param(
    [string]$Kind, [string]$LaneName, [string]$LaneRepo,
    [string]$Model, [string]$PromptFile, [int]$TimeoutMin
  )
  $runner = Join-Path $LaneRepo "loop-runner.ps1"
  if (-not (Test-Path $runner)) { Write-Launcher ("WARN: " + $Kind + " skipped, no runner at " + $runner); return }
  if (-not (Test-Path $PromptFile)) { Write-Launcher ("WARN: " + $Kind + " skipped, no prompt " + $PromptFile); return }
  $tag = $LaneName + "-" + $Kind
  $argList = @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $runner,
    "-Lane", $tag, "-RepoPath", $LaneRepo, "-Model", $Model,
    "-PromptFile", $PromptFile, "-MaxIterations", "1")
  if ($ClaudeCmd -ne "claude") { $argList += @("-ClaudeCmd", $ClaudeCmd) }
  if ($WhatIf) { Write-Launcher ("[WHATIF] would run " + $Kind + " one-shot (tag=" + $tag + ", model=" + $Model + ", repo=" + $LaneRepo + ", prompt=" + $PromptFile + ")"); return }
  Write-Launcher ("running " + $Kind + " one-shot (tag=" + $tag + ", model=" + $Model + ", timeout=" + $TimeoutMin + "min)...")
  $p = Start-Process -FilePath "powershell" -ArgumentList $argList -WorkingDirectory $LaneRepo -PassThru
  if (-not $p.WaitForExit($TimeoutMin * 60 * 1000)) {
    try { $p.Kill() } catch {}
    Write-Launcher ("WARN: " + $Kind + " one-shot exceeded " + $TimeoutMin + "min; killed and continuing.")
  } else {
    Write-Launcher ($Kind + " one-shot finished (exit=" + $p.ExitCode + ").")
  }
}

# ---------------------------------------------------------------------------
# Status buffer + writer.
# ---------------------------------------------------------------------------
$statusLines = New-Object System.Collections.Generic.List[string]
function Add-Status([string]$s) { $statusLines.Add($s) | Out-Null }
function Write-Status {
  $statusText = ($statusLines -join "`r`n") + "`r`n"
  if ($WhatIf) {
    $dry = Join-Path $logDir "loop-status.dryrun.md"
    Set-Content -Path $dry -Value $statusText -Encoding UTF8
    Write-Launcher ("[WHATIF] wrote status to " + $dry)
  } else {
    $statusDir = Split-Path -Parent $statusPath
    if (-not (Test-Path $statusDir)) { New-Item -ItemType Directory -Path $statusDir | Out-Null }
    Set-Content -Path $statusPath -Value $statusText -Encoding UTF8
    Write-Launcher ("status written to " + $statusPath)
  }
}

$running = Get-RunningLanes
$remainStr = if ($null -ne $daysRemaining) { Fmt "remain" @{ DAYS = $daysRemaining } } else { "" }

Add-Status (S "title")
Add-Status ""
Add-Status (S "intro1")
Add-Status (S "intro2")
Add-Status ""
Add-Status (Fmt "updated" @{ NOW = $now.ToString("yyyy-MM-dd HH:mm:ss") })
Add-Status (Fmt "deadline" @{ UNTIL = [string]$cfg.untilIso; REMAIN = $remainStr })
Add-Status ""

# Surface a stale/missing scheduler as a loud banner in the operator's one file.
$schedHealth = Get-SchedulerHealth
if ($schedHealth -ne 'ok') {
  Add-Status (S "schedWarnHeader")
  Add-Status ""
  Add-Status (S "schedWarnBody1")
  Add-Status (S "schedWarnBody2")
  Add-Status (Fmt "schedWarnBody3" @{ LAUNCHER = (Join-Path $repoRoot 'loop-launcher.ps1') })
  Add-Status ""
  Write-Launcher ("WARN: scheduler health=" + $schedHealth + " (task not pointing at loop-launcher.ps1). One elevated -Register needed.")
}

# ---------------------------------------------------------------------------
# When the deadline has passed: DO NOT launch. Write the loud stop banner and exit.
# The daily 07:00 trigger re-runs this branch every day, so the banner stays fresh.
# ---------------------------------------------------------------------------
if ($deadlinePassed) {
  Add-Status (S "stoppedHeader")
  Add-Status ""
  Add-Status (Fmt "stoppedBody1" @{ UNTIL = [string]$cfg.untilIso })
  Add-Status (S "stoppedBody2")
  Add-Status (S "stoppedBody3")
  Write-Launcher ("DEADLINE PASSED (" + ([string]$cfg.untilIso) + "). No lanes launched. Wrote stop banner to status.")
  Write-Status
  Write-Launcher "=== loop-launcher end (stopped: deadline) ==="
  exit 0
}

if ($nearDeadline) {
  Add-Status (Fmt "warnHeader" @{ DAYS = $daysRemaining })
  Add-Status ""
  Add-Status (S "warnBody1")
  Add-Status (S "warnBody2")
  Add-Status ""
  Write-Launcher ("WARN: near deadline (" + $daysRemaining + " days). Lanes still running; extend untilIso.")
}

# ---------------------------------------------------------------------------
# Inspection gate (critic): once per criticEveryDays. Runs BEFORE the lane loop so it never
# overlaps the ops lane in the main tree. Best-effort; lastCriticIso is stamped immediately so
# it does not re-fire on the same day even if it takes a while.
# ---------------------------------------------------------------------------
$criticEvery = if ($cfg.criticEveryDays) { [int]$cfg.criticEveryDays } else { 7 }
$lastCritic = $null
if ([string]$state.lastCriticIso -ne "") { try { $lastCritic = [datetime]::Parse([string]$state.lastCriticIso) } catch {} }
$criticDue = ($null -eq $lastCritic) -or ((($now - $lastCritic).TotalDays) -ge $criticEvery)
$criticModel = if ([string]$cfg.criticModel -ne "") { [string]$cfg.criticModel } else { "claude-opus-4-8" }
$criticPrompt = Join-Path $repoRoot "loop-prompt-critic.txt"

if ($criticDue -and (Test-Path $criticPrompt)) {
  Write-Launcher ("critic due (last=" + ([string]$state.lastCriticIso) + ", every=" + $criticEvery + "d). Firing critic one-shot in main repo.")
  $state.lastCriticIso = $now.ToString("o")
  Save-State
  Invoke-OneShot -Kind "critic" -LaneName "site" -LaneRepo $repoRoot -Model $criticModel -PromptFile $criticPrompt -TimeoutMin 30
} else {
  Write-Launcher ("critic not due (last=" + ([string]$state.lastCriticIso) + ", every=" + $criticEvery + "d).")
}

# ---------------------------------------------------------------------------
# Ignite each enabled lane. Per-lane guard makes every launch idempotent (this is what makes
# the daily re-run a safe self-healing resurrection). Supply gate (planner) fires first for a
# lane whose BACKLOG has drained below 3 open tasks.
# ---------------------------------------------------------------------------
$plannerPrompt = Join-Path $repoRoot "loop-prompt-planner.txt"
Add-Status (S "lanesHeader")
Add-Status ""

foreach ($lane in $cfg.lanes) {
  if (-not $lane.enabled) {
    Write-Launcher ("lane '" + $lane.name + "' disabled; skipping.")
    Add-Status (Fmt "laneDisabled" @{ LANE = $lane.name })
    continue
  }
  $laneRepo = Resolve-LaneRepo -lane $lane
  $runner = Join-Path $laneRepo "loop-runner.ps1"
  $backlog = Join-Path $laneRepo ("BACKLOG-" + $lane.name + ".md")
  $open = Get-OpenTaskCount -BacklogPath $backlog

  if (-not (Test-Path $runner)) {
    Write-Launcher ("WARN: lane '" + $lane.name + "' has no runner at " + $runner + " (setup-lanes.ps1 not run?). Skipping.")
    Add-Status (Fmt "laneNotSetUp" @{ LANE = $lane.name; RUNNER = $runner })
    continue
  }

  # Supply gate: replenish an almost-empty backlog before starting the persistent runner.
  if ($open -ge 0 -and $open -lt 3 -and (Test-Path $plannerPrompt)) {
    Write-Launcher ("lane '" + $lane.name + "' open=" + $open + " (<3). Firing planner one-shot before ignition.")
    $laneTaggedPrompt = $plannerPrompt
    if (-not $WhatIf) {
      # Inject the target lane into a per-run prompt copy so the shared planner template knows
      # which BACKLOG to replenish.
      $tmp = Join-Path $logDir ("planner-" + $lane.name + "-" + $launchStamp + ".txt")
      $header = (Fmt "plannerLaneHeader" @{ LANE = $lane.name }) + "`r`n`r`n"
      try { Set-Content -Path $tmp -Value ($header + (Get-Content -Raw -Encoding UTF8 -Path $plannerPrompt)) -Encoding UTF8; $laneTaggedPrompt = $tmp } catch {}
    }
    Invoke-OneShot -Kind "planner" -LaneName $lane.name -LaneRepo $laneRepo -Model $lane.model -PromptFile $laneTaggedPrompt -TimeoutMin 20
    $open = Get-OpenTaskCount -BacklogPath $backlog
  }

  # Ignite the persistent lane runner.
  $argList = @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $runner,
    "-Lane", $lane.name, "-RepoPath", $laneRepo, "-Model", [string]$lane.model,
    "-IntervalSeconds", [string][int]$lane.intervalSeconds)
  if ([string]$cfg.untilIso -ne "") { $argList += @("-UntilIso", [string]$cfg.untilIso) }
  if ($ClaudeCmd -ne "claude") { $argList += @("-ClaudeCmd", $ClaudeCmd) }

  $wasRunning = $running.ContainsKey($lane.name)
  if ($WhatIf) {
    Write-Launcher ("[WHATIF] would start lane '" + $lane.name + "' (model=" + $lane.model + ", interval=" + $lane.intervalSeconds + "s, repo=" + $laneRepo + ", open=" + $open + ", alreadyRunning=" + $wasRunning + ")")
  } else {
    Write-Launcher ("start lane '" + $lane.name + "' (model=" + $lane.model + ", interval=" + $lane.intervalSeconds + "s, repo=" + $laneRepo + ", alreadyRunning=" + $wasRunning + ")")
    Start-Process -FilePath "powershell" -ArgumentList $argList -WorkingDirectory $laneRepo
    Start-Sleep -Seconds 3
  }
  $stateLabel = if ($wasRunning) { S "laneRunning" } else { S "laneStart" }
  Add-Status (Fmt "laneRow" @{ LANE = $lane.name; MODEL = [string]$lane.model; INTERVAL = [string]$lane.intervalSeconds; OPEN = [string]$open; STATE = $stateLabel })
}

Add-Status ""
Add-Status (S "watchHeader")
Add-Status (S "watch1")
Add-Status (S "watch2")
Add-Status (S "watch3")

Write-Status
Write-Launcher "=== loop-launcher end ==="
