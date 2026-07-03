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
  arguments, triggered at logon and daily at 07:00. Registering a Scheduled Task requires an
  ELEVATED PowerShell on this machine (empirically verified: even a per-user Limited/Interactive
  task registration returns Access Denied without admin). This path adds the DAILY 07:00 heartbeat
  (status refresh + long-uptime dead-lane resurrection) on top of logon resurrection.

.PARAMETER InstallUserStartup
  ADMIN-FREE logon resurrection (O17). Writes a launcher shortcut command into the CURRENT USER'S
  Startup folder (shell:startup) so the launcher fires at every logon with NO Task Scheduler and NO
  admin rights. This is the primary, always-available resurrection path: it alone guarantees the
  loops come back after a PC restart. -Register remains an OPTIONAL upgrade for the daily heartbeat.
  Idempotent, -WhatIf aware, and post-verified (throws if the entry is not written as intended).

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
  [switch]$InstallUserStartup,
  [switch]$WhatIf,
  [switch]$SelfTest,
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

# Export the ONE central status file to every child (lane runners + one-shots) so a lane running
# in its own clone (..\safe-ai-lanes\<name>) self-reports into THIS file, not its local copy.
# loop-report-status.ps1 reads $env:SAFE_AI_LOOP_STATUS (see diagnosis 08 section D).
$env:SAFE_AI_LOOP_STATUS = $statusPath

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

# Acquire the exclusive docs/loop-status.md lock (CreateNew = atomic "only if absent"), reclaiming a
# STALE orphan. If a prior holder is killed between CreateNew and Remove-Item, the .lock survives
# forever and every future status write fails to acquire it - freezing the liveness heartbeat into a
# false "loop is dead" alarm (watch point #1). A legit hold is sub-second even with all six lanes
# serialized, so a lock older than $StaleSeconds cannot be live: reclaim it once and retry. Returns
# $true if held (caller MUST Remove-Item the lock when done), $false after exhausting retries. Shared
# by every status write in this launcher (banner reconcile, config-error banner) and mirrors the
# identical Get-StatusLock in loop-report-status.ps1 so the two writers agree on reclamation.
function Get-LauncherStatusLock {
  param([string]$LockPath, [int]$StaleSeconds = 60, [int]$Tries = 25, [int]$DelayMs = 200)
  for ($try = 0; $try -lt $Tries; $try++) {
    try {
      $fs = [System.IO.File]::Open($LockPath, [System.IO.FileMode]::CreateNew, [System.IO.FileAccess]::Write, [System.IO.FileShare]::None)
      $fs.Close(); return $true
    } catch {
      $reclaimed = $false
      try {
        $li = Get-Item -LiteralPath $LockPath -ErrorAction SilentlyContinue
        if ($li -and (((Get-Date) - $li.LastWriteTime).TotalSeconds -gt $StaleSeconds)) {
          Remove-Item -LiteralPath $LockPath -Force -ErrorAction SilentlyContinue
          Write-Launcher ("reclaimed stale status lock (age > " + $StaleSeconds + "s; prior holder likely killed mid-write).")
          $reclaimed = $true
        }
      } catch {}
      if (-not $reclaimed) { Start-Sleep -Milliseconds $DelayMs }
    }
  }
  return $false
}

# ---------------------------------------------------------------------------
# Decide what to persist as lastCriticIso after a critic one-shot. On success we stamp $Now (the full
# criticEveryDays interval elapses before the next run). On failure (timeout kill / non-zero exit /
# could-not-run) we BACK-DATE the stamp so the next launcher pass retries in ~$RetryDays instead of
# hiding a broken inspection system for a full interval - and without re-firing a blocking 30-min
# one-shot on every single logon. Pure function so -SelfTest can cover it offline.
# ---------------------------------------------------------------------------
function Resolve-CriticStamp {
  param([string]$Outcome, [datetime]$Now, [int]$CriticEveryDays, [int]$RetryDays = 1)
  if ($Outcome -eq 'ok') { return $Now }
  $back = [Math]::Max(0, $CriticEveryDays - $RetryDays)
  return $Now.AddDays(-$back)
}

# ---------------------------------------------------------------------------
# Supply gate (planner): decide whether to fire a planner one-shot for a lane. The gate must NOT
# fire when that lane's persistent runner is ALREADY running, because the one-shot and the live
# runner would operate the SAME clone concurrently (two claude+git processes -> index.lock
# contention / branch clobber). At cold start (reboot/logon) nothing is running, so a drained
# backlog is replenished before ignition; on the daily 07:00 self-healing re-run the lane is
# already alive and self-replenishes per its own contract, so the one-shot is both unnecessary
# and unsafe. Open<0 means the BACKLOG file is missing (never fire). Pure so -SelfTest covers it.
# ---------------------------------------------------------------------------
function Test-ShouldFirePlanner {
  param([int]$Open, [bool]$LaneRunning, [bool]$HasPrompt)
  return ($HasPrompt -and (-not $LaneRunning) -and ($Open -ge 0) -and ($Open -lt 3))
}

# ---------------------------------------------------------------------------
# -SelfTest: offline verification of the shared status-lock helper (stale-orphan reclamation +
# fresh-lock respect). Temp files only - no Claude, no real status file, no config, no network.
# Exits 0 on PASS, 1 on FAIL. Runs before any config read so a broken config cannot block the test.
# ---------------------------------------------------------------------------
if ($SelfTest) {
  $fails = 0
  $tmp = Join-Path ([System.IO.Path]::GetTempPath()) ("loop-launcher-selftest-" + [System.Guid]::NewGuid().ToString("N"))
  New-Item -ItemType Directory -Path $tmp -Force | Out-Null
  $lp = Join-Path $tmp "status.md.lock"
  function Assert-L([string]$n, [bool]$c) {
    if ($c) { Write-Launcher ("[SELFTEST] PASS: " + $n) } else { Write-Launcher ("[SELFTEST] FAIL: " + $n); $script:fails++ }
  }
  try {
    # A) Clean acquire when no lock exists -> true, lock file left for the holder.
    $a = Get-LauncherStatusLock $lp 60 5 50
    Assert-L "clean acquire returns true" ($a -eq $true)
    Assert-L "clean acquire leaves lock file" (Test-Path -LiteralPath $lp)
    if (Test-Path -LiteralPath $lp) { Remove-Item -LiteralPath $lp -Force }
    # B) A FRESH foreign lock (age 0) must be respected, not reclaimed -> false.
    $fs = [System.IO.File]::Open($lp, [System.IO.FileMode]::CreateNew, [System.IO.FileAccess]::Write, [System.IO.FileShare]::None); $fs.Close()
    $b = Get-LauncherStatusLock $lp 60 3 30
    Assert-L "fresh foreign lock is NOT reclaimed" ($b -eq $false)
    Assert-L "fresh foreign lock still present" (Test-Path -LiteralPath $lp)
    # C) A STALE orphan (backdated past threshold) is reclaimed and acquired -> true.
    (Get-Item -LiteralPath $lp).LastWriteTime = (Get-Date).AddSeconds(-120)
    $c = Get-LauncherStatusLock $lp 60 5 50
    Assert-L "stale orphan lock is reclaimed and acquired" ($c -eq $true)
    if (Test-Path -LiteralPath $lp) { Remove-Item -LiteralPath $lp -Force }
    # D) Resolve-CriticStamp: success stamps now (next due exactly at the full interval).
    $fixed = [datetime]"2026-07-03T08:00:00"
    $sOk = Resolve-CriticStamp -Outcome "ok" -Now $fixed -CriticEveryDays 7 -RetryDays 1
    Assert-L "critic ok stamps now (full interval)" ($sOk -eq $fixed)
    # E) A FAILED critic back-dates so it is NOT due after ~half a day but IS due after ~1 day
    #    (bounded retry: no 7-day blackout, no every-logon 30-min re-fire).
    $sFail = Resolve-CriticStamp -Outcome "timeout" -Now $fixed -CriticEveryDays 7 -RetryDays 1
    Assert-L "critic failure is NOT due 12h later" ((($fixed.AddHours(12)) - $sFail).TotalDays -lt 7)
    Assert-L "critic failure IS due ~1 day later" ((($fixed.AddDays(1)) - $sFail).TotalDays -ge 7)
    # F) nonzero exit behaves the same as timeout (any non-ok = degraded retry).
    $sNz = Resolve-CriticStamp -Outcome "nonzero" -Now $fixed -CriticEveryDays 7 -RetryDays 1
    Assert-L "critic nonzero back-dates like timeout" ($sNz -eq $sFail)
    # G) Edge: RetryDays >= CriticEveryDays clamps back-date to 0 (no negative interval).
    $sEdge = Resolve-CriticStamp -Outcome "timeout" -Now $fixed -CriticEveryDays 1 -RetryDays 1
    Assert-L "critic retry clamps to now when RetryDays>=interval" ($sEdge -eq $fixed)
    # H) Test-ShouldFirePlanner: fires only when a drained backlog exists AND the lane is NOT
    #    already running (the core fix: no one-shot in a clone with a live runner -> no git race).
    Assert-L "planner fires when drained + not running + prompt" (Test-ShouldFirePlanner -Open 2 -LaneRunning $false -HasPrompt $true)
    Assert-L "planner SKIPS when lane already running (concurrent-git guard)" (-not (Test-ShouldFirePlanner -Open 0 -LaneRunning $true -HasPrompt $true))
    Assert-L "planner SKIPS when backlog not drained (open=3)" (-not (Test-ShouldFirePlanner -Open 3 -LaneRunning $false -HasPrompt $true))
    Assert-L "planner SKIPS when backlog missing (open=-1)" (-not (Test-ShouldFirePlanner -Open -1 -LaneRunning $false -HasPrompt $true))
    Assert-L "planner SKIPS when no planner prompt present" (-not (Test-ShouldFirePlanner -Open 1 -LaneRunning $false -HasPrompt $false))
  } finally {
    try { Remove-Item -LiteralPath $tmp -Recurse -Force -ErrorAction SilentlyContinue } catch {}
  }
  if ($fails -eq 0) { Write-Launcher "[SELFTEST] ALL PASS"; exit 0 }
  Write-Launcher ("[SELFTEST] " + $fails + " FAILURE(S)"); exit 1
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
    Write-Launcher "Registering a Task Scheduler task requires admin on this machine (even a per-user Limited task returns Access Denied without elevation). Nothing was changed."
    Write-Launcher ('If you can elevate, run this ONCE:  powershell -ExecutionPolicy Bypass -File "' + $launcherPath + '" -Register')
    Write-Launcher ('Otherwise use the ADMIN-FREE resurrection instead (covers PC-restart recovery):  powershell -ExecutionPolicy Bypass -File "' + $launcherPath + '" -InstallUserStartup')
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
# ADMIN-FREE logon resurrection (O17). The Task Scheduler path (-Register) needs admin, which the
# self-run loops cannot obtain unattended - so for weeks the scheduler stayed at the old baked
# deadline and "PC restart -> auto-resurrection" was never actually enabled. The current user's
# Startup folder needs NO admin (there is already a note-worker-startup.cmd precedent there) and
# fires the launcher at every logon. That alone guarantees the loops come back after a restart.
# ---------------------------------------------------------------------------
$startupFolder = [Environment]::GetFolderPath('Startup')
$startupCmdPath = Join-Path $startupFolder "safe-ai-loop-launcher.cmd"

# Scheduler self-check: is the 'safe-ai-loop-runner' task actually pointing at THIS launcher
# (permanent fix active), or still at the old baked-deadline loop-runner (needs one elevated
# -Register)? Surfacing 'stale'/'missing' in loop-status.md keeps the one remaining manual
# step visible in the same file the operator watches. Defined here (before the -InstallUserStartup
# path) so the install can reconcile the banner without a full launcher run.
function Get-SchedulerHealth {
  try {
    $t = Get-ScheduledTask -TaskName 'safe-ai-loop-runner' -ErrorAction Stop
    $a = [string]$t.Actions[0].Arguments
    if (($a -match 'loop-launcher\.ps1') -and ($a -notmatch 'UntilIso')) { return 'ok' }
    return 'stale'
  } catch { return 'missing' }
}

# Admin-free resurrection self-check: does the current user's Startup entry exist and point at THIS
# launcher? When present, PC-restart recovery is guaranteed with NO admin, so the loud "no
# auto-resurrection" banner must NOT fire even if the (admin) scheduler task is still stale.
function Get-StartupResurrectionHealth {
  try {
    if (-not (Test-Path $startupCmdPath)) { return 'missing' }
    $body = Get-Content -Raw -Path $startupCmdPath
    if ($body -match 'loop-launcher\.ps1') { return 'ok' }
    return 'stale'
  } catch { return 'missing' }
}

# Surgically reconcile the reboot-resurrection banner inside an EXISTING loop-status.md to the
# current (or just-installed) health, WITHOUT a full launcher regeneration. Called from the
# -InstallUserStartup path: otherwise the loud "no auto-resurrection" alarm from a prior launcher
# run lingers until the next logon run (the scheduler is stale, so there is no daily 07:00 pass),
# while the per-iteration heartbeat keeps the top "last updated" line fresh - so a false loud
# banner looks current and pushes the owner toward an admin step that O17 made optional.
#
# ASCII-safe by construction: this .ps1 stays pure ASCII (Windows PowerShell 5.x mis-decodes
# BOM-less Japanese as Shift-JIS), so it NEVER pattern-matches Japanese literals. Instead it locates
# the banner STRUCTURALLY using anchors read at runtime from loop-status-strings.txt (UTF-8): the
# resurrection banner is the first "## " block sitting between the deadline line and the lanes
# header that is NOT one of the deadline banners (warn / stopped). This handles the current header
# text AND any legacy text, and never clobbers the deadline banners or the lane rows below.
function Set-ResurrectionBanner {
  param([switch]$AssumeStartupInstalled, [switch]$Preview)
  if (-not (Test-Path $statusPath)) {
    Write-Launcher "banner reconcile skipped: loop-status.md not present yet (next launcher run creates it)."
    return
  }
  $sched = Get-SchedulerHealth
  $startup = if ($AssumeStartupInstalled) { 'ok' } else { Get-StartupResurrectionHealth }
  $launcherFile = Join-Path $repoRoot 'loop-launcher.ps1'
  # Desired banner lines for the current health (empty = both paths covered -> no banner at all).
  $desired = @()
  if ($sched -ne 'ok' -and $startup -ne 'ok') {
    $desired = @((S "resurrectMissingHeader"), "", (S "resurrectMissingBody1"),
      (Fmt "resurrectMissingBody2" @{ LAUNCHER = $launcherFile }),
      (Fmt "resurrectMissingBody3" @{ LAUNCHER = $launcherFile }))
  } elseif ($sched -ne 'ok' -and $startup -eq 'ok') {
    $desired = @((S "resurrectStartupHeader"), "", (S "resurrectStartupBody1"),
      (Fmt "resurrectStartupBody2" @{ LAUNCHER = $launcherFile }))
  }
  # Runtime anchors (all from the UTF-8 strings file - never hard-coded Japanese here).
  $deadlineTpl = S "deadline"; $dph = $deadlineTpl.IndexOf('{UNTIL}')
  $deadlinePrefix = if ($dph -ge 0) { $deadlineTpl.Substring(0, $dph) } else { $deadlineTpl }
  $lanesHeader = (S "lanesHeader").Trim()
  $warnTpl = S "warnHeader"; $wph = $warnTpl.IndexOf('{DAYS}')
  $warnPrefix = if ($wph -ge 0) { $warnTpl.Substring(0, $wph) } else { $warnTpl }
  $stoppedHeader = (S "stoppedHeader").Trim()
  if ($deadlinePrefix.Trim() -eq "" -or $lanesHeader -eq "" -or $lanesHeader -eq "lanesHeader") {
    Write-Launcher "banner reconcile skipped: status strings unavailable (safe no-op)."
    return
  }
  # Serialize the read-modify-write against the lane heartbeats (loop-report-status.ps1), which
  # write this same file every iteration under the same lock. Preview writes to a private dry file,
  # so it needs no lock. Non-fatal: if the lock cannot be taken, skip rather than risk a torn write.
  $lockPath = $statusPath + ".lock"
  $haveLock = $false
  if (-not $Preview) {
    $haveLock = Get-LauncherStatusLock $lockPath
    if (-not $haveLock) {
      Write-Launcher "banner reconcile skipped: could not acquire status lock (non-fatal)."
      return
    }
  }
  try {
  $lines = @(Get-Content -Encoding UTF8 -Path $statusPath)
  # Anchor the search window between the deadline line and the lanes header.
  $deadlineIdx = -1; $lanesIdx = -1
  for ($i = 0; $i -lt $lines.Count; $i++) {
    $t = [string]$lines[$i]
    if ($deadlineIdx -lt 0 -and $t.StartsWith($deadlinePrefix)) { $deadlineIdx = $i }
    elseif ($deadlineIdx -ge 0 -and $t.Trim() -eq $lanesHeader) { $lanesIdx = $i; break }
  }
  if ($deadlineIdx -lt 0 -or $lanesIdx -lt 0) {
    Write-Launcher "banner reconcile skipped: deadline/lanes anchors not found (next full launcher run regenerates)."
    return
  }
  # Within the window, the resurrection banner is the FIRST "## " block that is not a deadline banner.
  function Test-IsDeadlineBanner([string]$h) {
    $ht = $h.Trim()
    if ($ht -eq $stoppedHeader) { return $true }
    if ($warnPrefix.Trim() -ne "" -and $h.StartsWith($warnPrefix)) { return $true }
    return $false
  }
  $bstart = -1
  for ($j = $deadlineIdx + 1; $j -lt $lanesIdx; $j++) {
    if ([string]$lines[$j] -match '^##\s') {
      if (Test-IsDeadlineBanner ([string]$lines[$j])) { break }  # deadline banner first => no resurrection banner
      $bstart = $j; break
    }
  }
  $result = New-Object System.Collections.Generic.List[string]
  if ($bstart -ge 0) {
    # Resurrection banner block = [bstart, next "## " heading within window) incl. its trailing blanks.
    $bend = $lanesIdx
    for ($j = $bstart + 1; $j -lt $lanesIdx; $j++) { if ([string]$lines[$j] -match '^##\s') { $bend = $j; break } }
    for ($k = 0; $k -lt $bstart; $k++) { $result.Add([string]$lines[$k]) }
    if ($desired.Count -gt 0) { foreach ($d in $desired) { $result.Add([string]$d) }; $result.Add("") }
    for ($k = $bend; $k -lt $lines.Count; $k++) { $result.Add([string]$lines[$k]) }
  } elseif ($desired.Count -gt 0) {
    # No resurrection banner present but one is now needed: insert after the deadline line's blank.
    $insertAt = $deadlineIdx + 1
    if ($insertAt -lt $lines.Count -and ([string]$lines[$insertAt]).Trim() -eq "") { $insertAt++ }
    for ($k = 0; $k -lt $insertAt; $k++) { $result.Add([string]$lines[$k]) }
    foreach ($d in $desired) { $result.Add([string]$d) }
    $result.Add("")
    for ($k = $insertAt; $k -lt $lines.Count; $k++) { $result.Add([string]$lines[$k]) }
  } else {
    Write-Launcher "banner reconcile: no banner needed and none present (no-op)."
    return
  }
  $newText = ($result -join "`r`n") + "`r`n"
  if ($Preview) {
    $dry = Join-Path $logDir "loop-status.bannerdry.md"
    Set-Content -Path $dry -Value $newText -Encoding UTF8
    Write-Launcher ("[WHATIF] resurrection banner reconcile -> " + $dry + " (sched=" + $sched + ", startup=" + $startup + ", bannerLines=" + $desired.Count + ")")
  } else {
    Set-Content -Path $statusPath -Value $newText -Encoding UTF8
    Write-Launcher ("resurrection banner reconciled in loop-status.md (sched=" + $sched + ", startup=" + $startup + ", bannerLines=" + $desired.Count + ")")
  }
  } finally {
    if ($haveLock) { try { Remove-Item -Path $lockPath -Force -ErrorAction SilentlyContinue } catch {} }
  }
}

function Install-UserStartupEntry {
  param([string]$LauncherPath)
  # A .cmd (not a .lnk) so it is plain text, diff-able, and needs no COM/WScript.Shell. -WindowStyle
  # Hidden keeps logon quiet; the launcher itself is short-lived (it ignites detached runners).
  $line = 'start "" /min powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "' + $LauncherPath + '"'
  $body = "@echo off`r`nrem safe-ai-site self-run loops - admin-free logon resurrection (O17). Managed by loop-launcher.ps1 -InstallUserStartup.`r`n" + $line + "`r`n"
  if ($WhatIf) {
    Write-Launcher ("[WHATIF] would write Startup entry: " + $startupCmdPath)
    Write-Launcher ("[WHATIF] entry command: " + $line)
    return
  }
  if (-not (Test-Path $startupFolder)) { throw ("Startup folder not found: " + $startupFolder) }
  Set-Content -Path $startupCmdPath -Value $body -Encoding ASCII -ErrorAction Stop
  # Post-verify: the file must exist and reference THIS launcher (never a silent no-op).
  if (-not (Test-Path $startupCmdPath)) { throw ("post-verify failed: " + $startupCmdPath + " was not created") }
  $written = Get-Content -Raw -Path $startupCmdPath
  if ($written -notmatch [regex]::Escape($LauncherPath)) { throw ("post-verify failed: Startup entry does not reference the launcher") }
  Write-Launcher ("Admin-free Startup resurrection installed and verified: " + $startupCmdPath)
}

if ($InstallUserStartup) {
  $launcherPath = Join-Path $repoRoot "loop-launcher.ps1"
  try {
    Install-UserStartupEntry -LauncherPath $launcherPath
    # Clear the loud "no auto-resurrection" alarm in loop-status.md immediately (the entry now
    # exists), instead of leaving it stale until the next full launcher run. AssumeStartupInstalled
    # so a -WhatIf preview reflects the intended post-install banner, not the pre-install health.
    Set-ResurrectionBanner -AssumeStartupInstalled -Preview:$WhatIf
    if (-not $WhatIf) {
      Write-Launcher "Done. The loops now auto-resurrect at every logon with NO admin. Optional: run -Register from an elevated PowerShell to also get the daily 07:00 heartbeat."
    }
    exit 0
  } catch {
    Write-Launcher ("ERROR: Startup install failed (nothing changed): " + $_.Exception.Message)
    exit 1
  }
}

# ---------------------------------------------------------------------------
# Config-error LOUD banner. When loop-config.json is missing or unparseable the launcher CANNOT
# start any lane - but the OLD design exited 1 writing only to the private launcher log, never to
# docs/loop-status.md. The owner's single watch-file then froze at its last good render with NO
# explanation - the exact silent-death class O16 exists to kill, and the owner's most common manual
# action (hand-editing untilIso) is precisely what fat-fingers the JSON. This rewrites the watch-file
# with a loud "config broken, lanes NOT started, fix the JSON" banner, preserving the lanes'
# self-report region verbatim (a lane from a PRIOR launch may still be alive and reporting) so the
# emergency rewrite never destroys live self-reports. Honors -WhatIf; serialized by the shared lock.
function Write-ConfigErrorStatus {
  param([string]$ConfigFile, [string]$ErrorMsg)
  $reportBegin = "<!-- LANE-REPORT:BEGIN (managed by loop-report-status.ps1) -->"
  $reportEnd = "<!-- LANE-REPORT:END -->"
  $now = Get-Date
  $out = New-Object System.Collections.Generic.List[string]
  $out.Add((S "title")); $out.Add("")
  $out.Add((S "intro1")); $out.Add((S "intro2")); $out.Add("")
  $out.Add((Fmt "updated" @{ NOW = $now.ToString("yyyy-MM-dd HH:mm:ss") })); $out.Add("")
  $out.Add((S "configErrorHeader")); $out.Add("")
  $out.Add((Fmt "configErrorBody1" @{ CONFIG = $ConfigFile }))
  $out.Add((S "configErrorBody2"))
  $out.Add((Fmt "configErrorBody3" @{ ERROR = $ErrorMsg }))
  # Preserve the lanes' self-report region verbatim if present (never destroy live self-reports).
  $preserved = $null
  if (Test-Path $statusPath) {
    try {
      $old = @(Get-Content -Encoding UTF8 -Path $statusPath)
      $b = -1; $e = -1
      for ($k = 0; $k -lt $old.Count; $k++) {
        if ($old[$k].Trim() -eq $reportBegin) { $b = $k }
        elseif ($old[$k].Trim() -eq $reportEnd) { $e = $k; break }
      }
      if ($b -ge 0 -and $e -gt $b) { $preserved = $old[$b..$e] }
    } catch {}
  }
  $out.Add(""); $out.Add((S "reportHeader")); $out.Add("")
  if ($preserved) { foreach ($l in $preserved) { $out.Add([string]$l) } }
  $out.Add(""); $out.Add((S "watchHeader"))
  $out.Add((S "watch1")); $out.Add((S "watch2")); $out.Add((S "watch3"))
  $text = ($out -join "`r`n") + "`r`n"
  if ($WhatIf) {
    $dry = Join-Path $logDir "loop-status.dryrun.md"
    Set-Content -Path $dry -Value $text -Encoding UTF8
    Write-Launcher ("[WHATIF] config-error banner -> " + $dry + " (config=" + $ConfigFile + ")")
    return
  }
  $lockPath = $statusPath + ".lock"
  $haveLock = Get-LauncherStatusLock $lockPath
  if (-not $haveLock) {
    Write-Launcher "WARN: config-error banner skipped: could not acquire status lock (non-fatal). See launcher log for the error."
    return
  }
  try {
    $statusDir = Split-Path -Parent $statusPath
    if ($statusDir -and -not (Test-Path $statusDir)) { New-Item -ItemType Directory -Path $statusDir | Out-Null }
    Set-Content -Path $statusPath -Value $text -Encoding UTF8
    Write-Launcher ("config-error banner written to " + $statusPath)
  } catch {
    Write-Launcher ("WARN: could not write config-error status (non-fatal): " + $_.Exception.Message)
  } finally {
    try { Remove-Item -Path $lockPath -Force -ErrorAction SilentlyContinue } catch {}
  }
}

# ---------------------------------------------------------------------------
# Read config + state.
# ---------------------------------------------------------------------------
if (-not (Test-Path $ConfigPath)) {
  Write-Launcher ("ERROR: config not found: " + $ConfigPath)
  Write-ConfigErrorStatus -ConfigFile $ConfigPath -ErrorMsg (S "configErrorNotFound")
  exit 1
}
try {
  $cfg = Get-Content -Raw -Encoding UTF8 -Path $ConfigPath | ConvertFrom-Json
} catch {
  Write-Launcher ("ERROR: could not parse " + $ConfigPath + ": " + $_.Exception.Message)
  Write-ConfigErrorStatus -ConfigFile $ConfigPath -ErrorMsg $_.Exception.Message
  exit 1
}
if ($null -eq $cfg -or -not ($cfg.PSObject.Properties.Name -contains "lanes") -or @($cfg.lanes).Count -eq 0) {
  Write-Launcher ("ERROR: config parsed but has no lanes: " + $ConfigPath)
  Write-ConfigErrorStatus -ConfigFile $ConfigPath -ErrorMsg (S "configErrorNoLanes")
  exit 1
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

# (Get-SchedulerHealth and Get-StartupResurrectionHealth are defined earlier, before the
# -InstallUserStartup path, so the install can reconcile the resurrection banner in place.)

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
  if (-not (Test-Path $runner)) { Write-Launcher ("WARN: " + $Kind + " skipped, no runner at " + $runner); return "skipped" }
  if (-not (Test-Path $PromptFile)) { Write-Launcher ("WARN: " + $Kind + " skipped, no prompt " + $PromptFile); return "skipped" }
  $tag = $LaneName + "-" + $Kind
  $argList = @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $runner,
    "-Lane", $tag, "-RepoPath", $LaneRepo, "-Model", $Model,
    "-PromptFile", $PromptFile, "-MaxIterations", "1")
  if ($ClaudeCmd -ne "claude") { $argList += @("-ClaudeCmd", $ClaudeCmd) }
  if ($WhatIf) { Write-Launcher ("[WHATIF] would run " + $Kind + " one-shot (tag=" + $tag + ", model=" + $Model + ", repo=" + $LaneRepo + ", prompt=" + $PromptFile + ")"); return "whatif" }
  Write-Launcher ("running " + $Kind + " one-shot (tag=" + $tag + ", model=" + $Model + ", timeout=" + $TimeoutMin + "min)...")
  $p = Start-Process -FilePath "powershell" -ArgumentList $argList -WorkingDirectory $LaneRepo -PassThru
  if (-not $p.WaitForExit($TimeoutMin * 60 * 1000)) {
    try { $p.Kill() } catch {}
    Write-Launcher ("WARN: " + $Kind + " one-shot exceeded " + $TimeoutMin + "min; killed and continuing.")
    return "timeout"
  }
  Write-Launcher ($Kind + " one-shot finished (exit=" + $p.ExitCode + ").")
  if ($p.ExitCode -eq 0) { return "ok" }
  return "nonzero"
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

# ---------------------------------------------------------------------------
# Lane self-report region (diagnosis 08 section D). The launcher owns the top of the file and
# rewrites it wholesale; this region is owned by the lanes (loop-report-status.ps1). We PRESERVE
# whatever the lanes wrote verbatim, so a live row survives a launcher pass. On first run (no
# region yet) we emit a placeholder row per enabled lane so the section is never empty.
# Markers are ASCII literals shared with loop-report-status.ps1.
$reportBegin = "<!-- LANE-REPORT:BEGIN (managed by loop-report-status.ps1) -->"
$reportEnd = "<!-- LANE-REPORT:END -->"
function Add-LaneReportSection {
  Add-Status ""
  Add-Status (S "reportHeader")
  Add-Status ""
  $preserved = $null
  if (Test-Path $statusPath) {
    try {
      $old = @(Get-Content -Encoding UTF8 -Path $statusPath)
      $b = -1; $e = -1
      for ($k = 0; $k -lt $old.Count; $k++) {
        if ($old[$k].Trim() -eq $reportBegin) { $b = $k }
        elseif ($old[$k].Trim() -eq $reportEnd) { $e = $k; break }
      }
      if ($b -ge 0 -and $e -gt $b) { $preserved = $old[$b..$e] }
    } catch {}
  }
  if ($preserved) {
    foreach ($l in $preserved) { Add-Status $l }
  } else {
    Add-Status $reportBegin
    foreach ($lane in $cfg.lanes) {
      if ($lane.enabled) { Add-Status (Fmt "reportPlaceholder" @{ LANE = $lane.name }) }
    }
    Add-Status $reportEnd
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

# Reboot-resurrection is covered by EITHER the (admin) scheduler task OR the (admin-free) Startup
# entry. Blare the loud banner ONLY when NEITHER exists. When the admin-free Startup path is in
# place but the scheduler is still stale, show a calm info note (restart recovery is fine; the
# daily 07:00 heartbeat is the only thing the optional -Register adds).
$schedHealth = Get-SchedulerHealth
$startupHealth = Get-StartupResurrectionHealth
$launcherFile = Join-Path $repoRoot 'loop-launcher.ps1'
if ($schedHealth -ne 'ok' -and $startupHealth -ne 'ok') {
  Add-Status (S "resurrectMissingHeader")
  Add-Status ""
  Add-Status (S "resurrectMissingBody1")
  Add-Status (Fmt "resurrectMissingBody2" @{ LAUNCHER = $launcherFile })
  Add-Status (Fmt "resurrectMissingBody3" @{ LAUNCHER = $launcherFile })
  Add-Status ""
  Write-Launcher ("WARN: NO auto-resurrection (scheduler=" + $schedHealth + ", startup=" + $startupHealth + "). Run -InstallUserStartup (no admin) to fix.")
} elseif ($schedHealth -ne 'ok' -and $startupHealth -eq 'ok') {
  Add-Status (S "resurrectStartupHeader")
  Add-Status ""
  Add-Status (S "resurrectStartupBody1")
  Add-Status (Fmt "resurrectStartupBody2" @{ LAUNCHER = $launcherFile })
  Add-Status ""
  Write-Launcher ("INFO: reboot-resurrection via Startup folder (admin-free). Scheduler=" + $schedHealth + "; optional -Register adds the daily 07:00 heartbeat.")
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
  Add-LaneReportSection
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
# overlaps the ops lane in the main tree. lastCriticIso is PRE-stamped to now so a launcher that
# starts concurrently (e.g. a logon near the 07:00 pass) sees not-due and does not fire a second
# overlapping critic while this 30-min one-shot runs. But a silently FAILED critic (timeout kill /
# non-zero exit / could-not-run) must NOT then hide behind that full-interval stamp: on failure we
# back-date the stamp for a ~1-day retry and BLARE a note on the dashboard, so watch point #1 shows
# the inspection system is degraded instead of the critique silently never running for a full week.
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
  $criticOutcome = Invoke-OneShot -Kind "critic" -LaneName "site" -LaneRepo $repoRoot -Model $criticModel -PromptFile $criticPrompt -TimeoutMin 30
  if (-not $WhatIf -and $criticOutcome -ne "ok") {
    $retryStamp = Resolve-CriticStamp -Outcome $criticOutcome -Now $now -CriticEveryDays $criticEvery -RetryDays 1
    $state.lastCriticIso = $retryStamp.ToString("o")
    Save-State
    Add-Status (Fmt "criticFailHeader" @{ REASON = [string]$criticOutcome })
    Add-Status ""
    Add-Status (S "criticFailBody1")
    Add-Status (S "criticFailBody2")
    Add-Status ""
    Write-Launcher ("WARN: critic one-shot degraded (" + $criticOutcome + "). Back-dated lastCriticIso for ~1-day retry; wrote dashboard note.")
  }
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
  # Skip when the lane's persistent runner is already alive: a one-shot in the same clone as a
  # live runner races git (index.lock / branch clobber). A running lane self-replenishes anyway.
  $laneAlreadyRunning = $running.ContainsKey($lane.name)
  if ($open -ge 0 -and $open -lt 3 -and $laneAlreadyRunning) {
    Write-Launcher ("lane '" + $lane.name + "' open=" + $open + " (<3) but runner already alive; skipping planner one-shot (avoids concurrent-git race; live lane self-replenishes).")
  }
  if ((Test-ShouldFirePlanner -Open $open -LaneRunning $laneAlreadyRunning -HasPrompt (Test-Path $plannerPrompt))) {
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

Add-LaneReportSection

Add-Status ""
Add-Status (S "watchHeader")
Add-Status (S "watch1")
Add-Status (S "watch2")
Add-Status (S "watch3")

Write-Status
Write-Launcher "=== loop-launcher end ==="
