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

.PARAMETER HealOnly
  Lightweight watchdog (recovery half of the dead-lane story). Re-launches ONLY the enabled lanes
  whose persistent runner has died, and does NOTHING else - no deadline eval, no planner/critic gate,
  no git worktree, no docs/loop-status.md rewrite. Meant to be called every interval by the
  always-alive ops lane so an individually-wedged lane recovers in ~one ops interval instead of
  waiting for the next logon / 07:00 full launcher pass (up to ~22h without the admin-only 07:00
  task). Idempotent by construction: loop-runner.ps1's per-lane single-instance guard makes a
  re-launch of a still-alive lane self-exit. Refuses to act if the process scan shows ZERO running
  lanes (a WMI outage returns empty AND makes the runner guard fail-open -> double-launch risk; a
  genuinely cold machine is the launcher's logon job, not heal's). Respects untilIso: past the
  deadline it heals nothing (the run is meant to be stopped). Combine with -WhatIf to preview.

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
  [switch]$HealOnly,
  [switch]$RehearseCritic,
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

# Pre-flight gate: after the side-effect-free rehearsal (Invoke-CriticRehearsal exercises the exact
# fetch/worktree-add/verify/teardown the real critic uses), decide whether the expensive real critic
# one-shot may fire. A FAILED rehearsal means the isolated-worktree plumbing is broken RIGHT NOW, so
# the unattended real fire would fail the same way after burning setup and a blocking 30-min slot -
# skip it and let the caller back-date (Resolve-CriticStamp treats the "rehearsal-failed" outcome as
# non-ok -> ~1-day retry + a degraded dashboard note) instead of blackholing the whole critic season.
# Pure so -SelfTest covers the skip-on-failure wiring offline (no git, no worktree, no Claude).
function Test-CriticFireAfterRehearsal {
  param([bool]$RehearsalOk)
  return [bool]$RehearsalOk
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
# Watchdog (heal): which enabled lanes have NO live runner and must be re-launched. Pure - takes the
# config lanes and the process-scan map, does no IO - so -SelfTest covers it offline. A disabled lane
# is never healed (owner turned it off on purpose). This backs the -HealOnly mode: the always-alive
# ops lane calls the launcher with -HealOnly every interval, so an individually-wedged lane recovers
# in ~one ops interval instead of waiting for the next logon / 07:00 launcher pass (up to ~22h - the
# recovery half of the dead-lane story whose DETECTION half is the loop-status health banner).
# ---------------------------------------------------------------------------
function Get-LanesToHeal {
  param($Lanes, [hashtable]$Running)
  $out = @()
  foreach ($lane in $Lanes) {
    if (-not $lane.enabled) { continue }
    $name = [string]$lane.name
    if ($name -eq "") { continue }
    if (-not $Running.ContainsKey($name)) { $out += $name }
  }
  # Plain return (NOT ,$out): callers ALWAYS wrap in @() so empty/single/multi all normalize; the
  # unary-comma idiom double-wraps under an inline @(...) call and is the wrong tool here.
  return $out
}

# ---------------------------------------------------------------------------
# Version-floor / cooperative stale-runner cycle (the "live-but-ancient runner" bootstrap fix).
#
# The hot-swap self-update (#675) and the runner-driven heartbeat (#672) can only take effect from the
# NEXT process launch onward: a persistent runner reads its whole script into memory at start, so a
# process that was ALREADY running when those fixes landed has no self-update code and can never exit to
# pick up the new version. The watchdog (-HealOnly / Get-LanesToHeal) only resurrects DEAD lanes, so a
# live-but-ancient runner is invisible to every existing recovery path and executes stale code until the
# machine is restarted. `runnerFloorIso` in loop-config.json marks the instant before which a runner is
# below floor; the launcher cooperatively cycles such runners so the fix reaches them unattended.
#
# "Cooperative" = the runner is only killed when IDLE (between iterations): a runner mid-iteration has a
# live `claude` child process, so zero child processes means the Claude turn has fully ended and the tree
# is clean - the exact safe point the hot-swap check itself uses. Cycling a below-floor runner only when
# idle therefore never breaks an in-flight iteration (existing-work-destruction = 0). Killing is all the
# cycle does: the existing relaunch paths (full-pass ignition loop; -HealOnly Get-LanesToHeal) then see
# the lane as DEAD and resurrect it onto the fresh on-disk code - no duplicate launch logic.
# ---------------------------------------------------------------------------

# Is a runner below the version floor? Pure so -SelfTest covers it offline. An empty/unparseable floor
# means "no floor configured" -> never below floor -> the cycle is a no-op (fail-safe: never cycle when
# the marker is absent or malformed). A runner that started AT or AFTER the floor already carries the
# fix and is left alone.
function Test-RunnerBelowFloor {
  param([datetime]$ProcStart, [string]$FloorIso)
  if ([string]::IsNullOrWhiteSpace($FloorIso)) { return $false }
  $floor = $null
  try { $floor = [datetimeoffset]::Parse($FloorIso).UtcDateTime } catch { return $false }
  return ($ProcStart.ToUniversalTime() -lt $floor)
}

# Should a below-floor runner be cycled THIS pass? Pure. Cycle ONLY when idle: ChildCount -eq 0 means no
# in-flight Claude turn. ChildCount -lt 0 is the "scan failed / unknown" sentinel and must be treated as
# BUSY (never cycle on an ambiguous scan), so a transient WMI hiccup can never kill a working runner.
function Test-ShouldCycleStaleRunner {
  param([bool]$BelowFloor, [int]$ChildCount)
  return ($BelowFloor -and ($ChildCount -eq 0))
}

# Live scan: map lane name -> @{ Pid; Start } for every running loop-runner.ps1 whose -Lane matches an
# enabled config lane. Separate from Get-RunningLanes (which returns only booleans and is used for
# planner/heal gating) because the cycle needs the PID and start time. Never throws.
function Get-RunnerProcInfo {
  $map = @{}
  try {
    $procs = @(Get-CimInstance Win32_Process -Filter "Name LIKE 'powershell%' OR Name LIKE 'pwsh%'" -ErrorAction Stop |
      Where-Object { $_.CommandLine -like '*loop-runner.ps1*' })
    foreach ($p in $procs) {
      $cl = [string]$p.CommandLine
      $m = [regex]::Match($cl, '(?i)-Lane(\s+|:|=)["'']?([\w\-]+)')
      if ($m.Success) { $map[$m.Groups[2].Value] = @{ Pid = [int]$p.ProcessId; Start = [datetime]$p.CreationDate } }
    }
  } catch {}
  return $map
}

# Count direct child processes of a PID (a runner mid-iteration owns a claude/node child; an idle runner
# between iterations owns none). Returns -1 on any scan failure so the caller treats "unknown" as busy.
function Get-ProcChildCount {
  param([int]$ProcId)
  try {
    return @(Get-CimInstance Win32_Process -Filter ("ParentProcessId = " + $ProcId) -ErrorAction Stop).Count
  } catch { return -1 }
}

# PIDs of the current process's ancestor chain (parent, grandparent, ...). Used to guarantee the cycle
# never stops a runner that spawned this launcher (e.g. the ops runner calling -HealOnly). Never throws;
# a scan failure returns whatever was collected so far (the idle gate is the primary safeguard anyway).
function Get-AncestorPids {
  $out = @()
  try {
    $cur = $PID
    for ($i = 0; $i -lt 12 -and $cur -gt 0; $i++) {
      $p = Get-CimInstance Win32_Process -Filter ("ProcessId = " + $cur) -ErrorAction Stop
      if ($null -eq $p) { break }
      $out += [int]$cur
      $cur = [int]$p.ParentProcessId
    }
  } catch {}
  return $out
}

# Cooperatively cycle (kill-only) every below-floor lane runner that is currently idle. Returns the list
# of lane names cycled (or that WOULD be cycled under -WhatIf). Kill-only by design: the caller's normal
# relaunch path resurrects the lane onto fresh code. Honors -WhatIf (logs, kills nothing). The optional
# -ExcludePids guards against a runner cycling an ancestor of the current process (belt-and-braces on top
# of the idle gate, which already spares a busy runner that owns this launcher as a child).
function Invoke-StaleRunnerCycle {
  param($Lanes, [string]$FloorIso, [switch]$DryRun, [int[]]$ExcludePids = @())
  $cycled = @()
  if ([string]::IsNullOrWhiteSpace($FloorIso)) { return $cycled }
  $info = Get-RunnerProcInfo
  foreach ($lane in $Lanes) {
    if (-not $lane.enabled) { continue }
    $name = [string]$lane.name
    if ($name -eq "" -or -not $info.ContainsKey($name)) { continue }
    $rp = $info[$name]
    if ($ExcludePids -contains $rp.Pid) { continue }
    if (-not (Test-RunnerBelowFloor -ProcStart $rp.Start -FloorIso $FloorIso)) { continue }
    $children = Get-ProcChildCount -ProcId $rp.Pid
    if (-not (Test-ShouldCycleStaleRunner -BelowFloor $true -ChildCount $children)) {
      Write-Launcher ("[CYCLE] lane '" + $name + "' PID " + $rp.Pid + " is below floor (started " + $rp.Start.ToString("yyyy-MM-dd HH:mm:ss") + ") but BUSY (children=" + $children + "); deferring cycle to a later idle pass (no in-flight iteration is broken).")
      continue
    }
    if ($DryRun) {
      Write-Launcher ("[CYCLE][WHATIF] would cooperatively cycle idle below-floor lane '" + $name + "' PID " + $rp.Pid + " (started " + $rp.Start.ToString("yyyy-MM-dd HH:mm:ss") + "); the relaunch path would then start it on fresh code.")
      $cycled += $name
      continue
    }
    try {
      Write-Launcher ("[CYCLE] cooperatively cycling idle below-floor lane '" + $name + "' PID " + $rp.Pid + " (started " + $rp.Start.ToString("yyyy-MM-dd HH:mm:ss") + "); stopping so the relaunch path starts it on fresh code.")
      Stop-Process -Id $rp.Pid -ErrorAction Stop
      try { Wait-Process -Id $rp.Pid -Timeout 10 -ErrorAction SilentlyContinue } catch {}
      $cycled += $name
    } catch {
      Write-Launcher ("[CYCLE] WARN: failed to stop lane '" + $name + "' PID " + $rp.Pid + " (non-fatal, will retry next pass): " + $_.Exception.Message)
    }
  }
  return $cycled
}

# ---------------------------------------------------------------------------
# Log retention: which files under logs/ are stale loop artifacts safe to delete. Nothing prunes the
# logs/ dir today, so on a machine that stays logged in it grows without bound - every full launcher
# pass (logon / 07:00) plus every watchdog heal spawn drops a fresh launcher-*/watchdog-* log, and
# each runner restart drops a loop-*.log. Unbounded growth degrades the operator's primary diagnostic
# surface (the reporting system) and, eventually, disk. This picks ONLY the loop's OWN generated logs
# (launcher-*.log / loop-*.log / watchdog-*.log / planner-*.txt) - hand-authored progress/audit .md
# files and every non-matching file are untouched - and NEVER prunes the KeepMin newest, so recent
# diagnostics always survive even a burst; among the rest it deletes those older than RetentionDays.
# Pure (takes a file list, does no IO) so -SelfTest covers it offline; a currently-open runner log is
# further protected at the call site by Remove-Item's per-file failure on a Windows write lock.
# ---------------------------------------------------------------------------
function Get-LogsToPrune {
  param($Files, [datetime]$Now, [int]$RetentionDays, [int]$KeepMin)
  $eligible = @($Files | Where-Object {
    $n = [string]$_.Name
    ($n -like 'launcher-*.log') -or ($n -like 'loop-*.log') -or `
    ($n -like 'watchdog-*.log') -or ($n -like 'planner-*.txt')
  })
  if ($eligible.Count -le $KeepMin) { return @() }
  $sorted = @($eligible | Sort-Object LastWriteTime -Descending)
  $cutoff = $Now.AddDays(-$RetentionDays)
  $out = @()
  for ($i = $KeepMin; $i -lt $sorted.Count; $i++) {
    if ($sorted[$i].LastWriteTime -lt $cutoff) { $out += [string]$sorted[$i].Name }
  }
  return $out
}

# The retention sweep must cover EVERY lane's logs/, not just this tree's. loop-runner.ps1 writes its
# loop-<lane>-*.log into <RepoPath>\logs, and non-ops lanes run in sibling clones under lanesRoot - so
# the main-tree-only sweep left 5 of 6 log dirs growing without bound (only the ops lane shares this
# tree). This dedups the candidate log dirs (main tree + each lane clone) by normalized full path so a
# lane whose repoPath resolves to this tree (ops) is not swept twice. Pure (string-only, no IO) so
# -SelfTest covers the dedup offline; non-existent dirs are handled at the call site by Get-ChildItem.
function Get-UniqueLogDirs {
  param([string[]]$Dirs)
  $seen = @{}
  $out = @()
  foreach ($d in $Dirs) {
    if ([string]$d -eq "") { continue }
    $key = [string]$d
    try { $key = [System.IO.Path]::GetFullPath($d) } catch {}
    $key = $key.TrimEnd('\', '/').ToLowerInvariant()
    if (-not $seen.ContainsKey($key)) { $seen[$key] = $true; $out += [string]$d }
  }
  return $out
}

# ---------------------------------------------------------------------------
# Isolate the weekly critic in a dedicated git worktree. The critic runs as -Lane site and does
# git checkout/commit/push; the ops persistent runner works the SAME main tree, so running the
# critic in-place races git (index.lock contention / branch clobber) - the same family the planner
# guard closes. But the critic CANNOT be skipped-when-running like the planner: ops is nearly always
# alive, so skipping would starve the weekly critique forever. Isolation is the only correct fix -
# a separate worktree has its own index + HEAD, so its git activity never collides with the main
# tree. These helpers are pure so -SelfTest can cover the worktree path offline (no git, no network).
# ---------------------------------------------------------------------------
function Get-CriticWorktreePath {
  param([string]$RepoRoot, [string]$Stamp)
  # A SIBLING of the repo, never inside it: a nested worktree would show up in the main tree's own
  # git status and could be committed by accident. Deterministic per launch stamp for clean teardown.
  $parent = Split-Path -Parent $RepoRoot
  return (Join-Path $parent ("safe-ai-critic-wt-" + $Stamp))
}
function Get-WorktreeAddArgs {
  param([string]$Path, [string]$Ref)
  # Detached HEAD at the ref: the critic creates its own ops/critique-<date> branch inside the
  # worktree, so there is no branch name to collide with whatever the main tree has checked out
  # (git refuses to check out one branch in two worktrees).
  return @("worktree", "add", "--detach", $Path, $Ref)
}
function Get-WorktreeRemoveArgs {
  param([string]$Path)
  return @("worktree", "remove", "--force", $Path)
}
function Test-WorktreeIsIsolated {
  param([string]$RepoRoot, [string]$WorktreePath)
  # Invariant: the worktree must live OUTSIDE the main tree, else its git ops re-enter the very
  # tree we are isolating from. Compare normalized full paths, case-insensitive (Windows).
  try {
    $r = [System.IO.Path]::GetFullPath($RepoRoot).TrimEnd('\', '/')
    $w = [System.IO.Path]::GetFullPath($WorktreePath).TrimEnd('\', '/')
    if ($w.Length -eq 0 -or $r.Length -eq 0) { return $false }
    if ($w -eq $r) { return $false }
    $sep = [System.IO.Path]::DirectorySeparatorChar
    return (-not $w.StartsWith($r + $sep, [System.StringComparison]::OrdinalIgnoreCase))
  } catch { return $false }
}
# Thin git wrapper: runs `git -C <RepoRoot> <args>`, returns @{ ok; out }. Never throws so the
# critic lifecycle can branch on outcome without try/catch at every call site.
function Invoke-Git {
  param([string]$RepoRoot, [string[]]$GitArgs)
  try {
    $all = @("-C", $RepoRoot) + $GitArgs
    $out = & git @all 2>&1
    return @{ ok = ($LASTEXITCODE -eq 0); out = ($out | Out-String).Trim() }
  } catch { return @{ ok = $false; out = $_.Exception.Message } }
}

# ---------------------------------------------------------------------------
# Exercise the EXACT git-worktree plumbing the weekly critic uses (fetch origin/main -> worktree add
# --detach a sibling checkout -> verify it carries its own loop-runner.ps1 -> worktree remove --force
# -> prune) WITHOUT spending a Claude one-shot. The real critic path (critic gate, ~line 1044) is
# otherwise never exercised until it first fires UNATTENDED, and its own -WhatIf branch deliberately
# does NOT create the worktree - so before this helper the plumbing had no side-effect-free rehearsal.
# A distinct "rehearsal-" stamp guarantees the throwaway path can never collide with a live critic
# worktree carrying the same launch stamp; teardown lives in finally so a mid-run failure never leaks a
# worktree. Returns @{ ok; steps; worktree }. -DryRun reports the plan and runs NO git (mirrors the
# critic -WhatIf branch). Fails only on real breakage: fetch/add failure, a checkout missing its own
# loop-runner.ps1 (the one-shot's target), or a worktree left behind after teardown.
# ---------------------------------------------------------------------------
function Invoke-CriticRehearsal {
  param([string]$RepoRoot, [string]$Stamp, [switch]$DryRun)
  $steps = New-Object System.Collections.Generic.List[string]
  $wtPath = Get-CriticWorktreePath -RepoRoot $RepoRoot -Stamp ("rehearsal-" + $Stamp)
  if (-not (Test-WorktreeIsIsolated -RepoRoot $RepoRoot -WorktreePath $wtPath)) {
    $steps.Add("FAIL: computed rehearsal worktree is not isolated from the main tree: " + $wtPath)
    return @{ ok = $false; steps = $steps; worktree = $wtPath }
  }
  if ($DryRun) {
    $steps.Add("[WHATIF] would fetch origin/main, add a detached worktree at " + $wtPath + " (git " + ((Get-WorktreeAddArgs -Path $wtPath -Ref 'origin/main') -join ' ') + "), verify it carries its own loop-runner.ps1, then remove it (git " + ((Get-WorktreeRemoveArgs -Path $wtPath) -join ' ') + "). No git executed in dry-run.")
    return @{ ok = $true; steps = $steps; worktree = $wtPath }
  }
  $ok = $true
  try {
    $f = Invoke-Git -RepoRoot $RepoRoot -GitArgs @("fetch", "origin", "main", "--quiet")
    $steps.Add("fetch origin main: " + $(if ($f.ok) { "ok" } else { "FAIL " + $f.out })); if (-not $f.ok) { $ok = $false }
    $null = Invoke-Git -RepoRoot $RepoRoot -GitArgs @("worktree", "prune")
    if (Test-Path -LiteralPath $wtPath) {
      $null = Invoke-Git -RepoRoot $RepoRoot -GitArgs (Get-WorktreeRemoveArgs -Path $wtPath)
      if (Test-Path -LiteralPath $wtPath) { try { Remove-Item -LiteralPath $wtPath -Recurse -Force -ErrorAction SilentlyContinue } catch {} }
    }
    $a = Invoke-Git -RepoRoot $RepoRoot -GitArgs (Get-WorktreeAddArgs -Path $wtPath -Ref "origin/main")
    $steps.Add("worktree add --detach @origin/main: " + $(if ($a.ok) { "ok" } else { "FAIL " + $a.out })); if (-not $a.ok) { $ok = $false }
    if ($a.ok) {
      $hasRunner = Test-Path -LiteralPath (Join-Path $wtPath "loop-runner.ps1")
      $steps.Add("checkout carries its own loop-runner.ps1 (one-shot target): " + $hasRunner); if (-not $hasRunner) { $ok = $false }
      $steps.Add("checkout carries loop-prompt-critic.txt (origin/main sanity): " + (Test-Path -LiteralPath (Join-Path $wtPath "loop-prompt-critic.txt")))
    }
  } finally {
    if (Test-Path -LiteralPath $wtPath) {
      $null = Invoke-Git -RepoRoot $RepoRoot -GitArgs (Get-WorktreeRemoveArgs -Path $wtPath)
      if (Test-Path -LiteralPath $wtPath) { try { Remove-Item -LiteralPath $wtPath -Recurse -Force -ErrorAction SilentlyContinue } catch {} }
      $null = Invoke-Git -RepoRoot $RepoRoot -GitArgs @("worktree", "prune")
    }
    $leaked = (Test-Path -LiteralPath $wtPath)
    $steps.Add("teardown: worktree removed; leaked=" + $leaked); if ($leaked) { $ok = $false }
  }
  return @{ ok = $ok; steps = $steps; worktree = $wtPath }
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
    # I) Critic worktree path is a SIBLING of the repo (outside it), stamp-scoped, and passes the
    #    isolation invariant. A path inside the repo (or equal to it) must FAIL isolation so we never
    #    run the critic in the very tree we are protecting.
    $repoFixture = Join-Path $tmp "repo"
    New-Item -ItemType Directory -Path $repoFixture -Force | Out-Null
    $wt = Get-CriticWorktreePath -RepoRoot $repoFixture -Stamp "20260703-080000"
    Assert-L "worktree path carries the launch stamp" ($wt -like "*safe-ai-critic-wt-20260703-080000")
    Assert-L "worktree path is a sibling of the repo (not nested)" (Test-WorktreeIsIsolated -RepoRoot $repoFixture -WorktreePath $wt)
    Assert-L "a nested worktree path FAILS isolation" (-not (Test-WorktreeIsIsolated -RepoRoot $repoFixture -WorktreePath (Join-Path $repoFixture "wt")))
    Assert-L "the repo path itself FAILS isolation" (-not (Test-WorktreeIsIsolated -RepoRoot $repoFixture -WorktreePath $repoFixture))
    # J) The git arg builders emit the exact isolating command (detached add, forced remove).
    $addArgs = Get-WorktreeAddArgs -Path $wt -Ref "origin/main"
    Assert-L "worktree add is detached at the given ref" (($addArgs -join " ") -eq ("worktree add --detach " + $wt + " origin/main"))
    $rmArgs = Get-WorktreeRemoveArgs -Path $wt
    Assert-L "worktree remove is forced" (($rmArgs -join " ") -eq ("worktree remove --force " + $wt))
    # P) -RehearseCritic path derivation: the throwaway worktree is a SIBLING (isolated) and its
    #    "rehearsal-" stamp can never collide with a real critic worktree carrying the same launch
    #    stamp; the dry-run reports a plan and executes no git (mirrors the critic -WhatIf branch).
    $rehWt = Get-CriticWorktreePath -RepoRoot $repoFixture -Stamp ("rehearsal-20260703-080000")
    Assert-L "rehearsal worktree is a sibling of the repo (isolated)" (Test-WorktreeIsIsolated -RepoRoot $repoFixture -WorktreePath $rehWt)
    Assert-L "rehearsal path carries the rehearsal- marker" ($rehWt -like "*safe-ai-critic-wt-rehearsal-20260703-080000")
    Assert-L "rehearsal path never collides with a real critic worktree of the same launch stamp" ($rehWt -ne (Get-CriticWorktreePath -RepoRoot $repoFixture -Stamp "20260703-080000"))
    $rehDry = Invoke-CriticRehearsal -RepoRoot $repoFixture -Stamp "20260703-080000" -DryRun
    Assert-L "rehearsal dry-run reports ok and executes no git" ($rehDry.ok -and (($rehDry.steps -join " ") -like "*WHATIF*") -and (-not (Test-Path -LiteralPath $rehDry.worktree)))
    # Q) Auto pre-flight wiring: the rehearsal result gates the real (expensive) critic fire. A PASSING
    #    rehearsal lets the real one-shot proceed; a FAILING rehearsal skips it, and the "rehearsal-failed"
    #    outcome then flows through the SAME back-date + degraded-note block as any other non-ok outcome.
    Assert-L "preflight: a passing rehearsal lets the real critic fire" (Test-CriticFireAfterRehearsal -RehearsalOk $true)
    Assert-L "preflight: a failing rehearsal skips the real critic fire" (-not (Test-CriticFireAfterRehearsal -RehearsalOk $false))
    $rehFixed = [datetime]"2026-07-03T08:00:00"
    $sReh = Resolve-CriticStamp -Outcome "rehearsal-failed" -Now $rehFixed -CriticEveryDays 7 -RetryDays 1
    Assert-L "preflight: rehearsal-failed back-dates (NOT due 12h later)" ((($rehFixed.AddHours(12)) - $sReh).TotalDays -lt 7)
    Assert-L "preflight: rehearsal-failed IS due ~1 day later (bounded retry, no 7d blackout)" ((($rehFixed.AddDays(1)) - $sReh).TotalDays -ge 7)
    Assert-L "preflight: rehearsal-failed is a non-ok outcome so the degraded dashboard note fires" ("rehearsal-failed" -ne "ok")
    # K) Get-LanesToHeal: names exactly the enabled lanes that have no live runner. A disabled lane
    #    is never healed even when absent from the scan; an alive lane is never re-launched.
    $healLanes = @(
      [pscustomobject]@{ name = "ops";  enabled = $true },
      [pscustomobject]@{ name = "data"; enabled = $true },
      [pscustomobject]@{ name = "seo";  enabled = $false }
    )
    $allAlive = @{ ops = $true; data = $true; seo = $true }
    Assert-L "heal: nothing to do when every enabled lane is alive" (@(Get-LanesToHeal -Lanes $healLanes -Running $allAlive).Count -eq 0)
    $dataDead = @{ ops = $true }
    $deadList = @(Get-LanesToHeal -Lanes $healLanes -Running $dataDead)
    Assert-L "heal: names the one dead enabled lane" (($deadList -join ",") -eq "data")
    $seoDeadToo = @{ ops = $true }  # seo is disabled AND absent -> must NOT be healed
    Assert-L "heal: a disabled lane is never healed even when absent" (-not (@(Get-LanesToHeal -Lanes $healLanes -Running $seoDeadToo) -contains "seo"))
    $noneAlive = @{}
    Assert-L "heal: empty scan yields all enabled lanes (caller gates on this to refuse under WMI outage)" ((@(Get-LanesToHeal -Lanes $healLanes -Running $noneAlive) -join ",") -eq "ops,data")
    # L) Get-LogsToPrune: deletes ONLY old loop-generated logs beyond the KeepMin newest; never touches
    #    hand-authored .md artifacts or non-matching files, and always keeps recent logs.
    $nowL = [datetime]"2026-07-03T12:00:00"
    $mk = { param($n, $daysOld) [pscustomobject]@{ Name = $n; LastWriteTime = $nowL.AddDays(-$daysOld) } }
    $logFixture = @(
      (& $mk "launcher-old.log" 40), (& $mk "loop-ops-old.log" 30), (& $mk "watchdog-old.log" 20),
      (& $mk "planner-seo-old.txt" 25), (& $mk "launcher-recent.log" 2), (& $mk "loop-data-recent.log" 1),
      (& $mk "audit-progress.md" 90), (& $mk "loop-status.dryrun.md" 99), (& $mk "note.txt" 88)
    )
    $pruned = @(Get-LogsToPrune -Files $logFixture -Now $nowL -RetentionDays 14 -KeepMin 2)
    Assert-L "prune: an old launcher log beyond keep-min is deleted" ($pruned -contains "launcher-old.log")
    Assert-L "prune: an old planner one-shot is deleted" ($pruned -contains "planner-seo-old.txt")
    Assert-L "prune: a recent log is NEVER deleted" (-not ($pruned -contains "launcher-recent.log"))
    Assert-L "prune: a hand-authored .md artifact is NEVER deleted" (-not ($pruned -contains "audit-progress.md") -and -not ($pruned -contains "loop-status.dryrun.md"))
    Assert-L "prune: a non-loop .txt file is NEVER deleted" (-not ($pruned -contains "note.txt"))
    Assert-L "prune: KeepMin newest matched logs are retained even when old" (@(Get-LogsToPrune -Files @((& $mk "loop-a.log" 40), (& $mk "loop-b.log" 41)) -Now $nowL -RetentionDays 14 -KeepMin 2).Count -eq 0)
    Assert-L "prune: nothing to do on an empty logs dir" (@(Get-LogsToPrune -Files @() -Now $nowL -RetentionDays 14 -KeepMin 20).Count -eq 0)
    # Get-UniqueLogDirs: the sweep now covers every lane clone's logs/, deduped so the ops tree (which
    # equals the main tree) is not swept twice, and blanks are dropped.
    $ud = @(Get-UniqueLogDirs -Dirs @("C:\repo\logs", "C:\lanes\data\logs", "C:\lanes\seo\logs"))
    Assert-L "logdirs: distinct dirs all kept" ($ud.Count -eq 3)
    $udDup = @(Get-UniqueLogDirs -Dirs @("C:\repo\logs", "C:\repo\logs", "c:\repo\Logs\"))
    Assert-L "logdirs: case/trailing-slash duplicates collapse to one" ($udDup.Count -eq 1)
    $udBlank = @(Get-UniqueLogDirs -Dirs @("C:\a\logs", "", "C:\b\logs"))
    Assert-L "logdirs: blank entries are dropped" ($udBlank.Count -eq 2)
    Assert-L "logdirs: empty input yields empty" (@(Get-UniqueLogDirs -Dirs @()).Count -eq 0)
    # M) Test-RunnerBelowFloor: a runner started before the floor is stale; one started at/after carries
    #    the fix; an empty/garbage floor disables the whole cycle (never below floor = fail-safe).
    $floor = "2026-07-03T13:43:09+09:00"
    Assert-L "floor: a runner started BEFORE the floor is below floor" (Test-RunnerBelowFloor -ProcStart ([datetime]"2026-07-03T06:38:54+09:00") -FloorIso $floor)
    Assert-L "floor: a runner started AFTER the floor is NOT below floor" (-not (Test-RunnerBelowFloor -ProcStart ([datetime]"2026-07-03T17:42:11+09:00") -FloorIso $floor))
    Assert-L "floor: a runner started AT the floor is NOT below floor (boundary)" (-not (Test-RunnerBelowFloor -ProcStart ([datetimeoffset]"2026-07-03T13:43:09+09:00").UtcDateTime -FloorIso $floor))
    Assert-L "floor: an empty floor marker disables cycling (never below floor)" (-not (Test-RunnerBelowFloor -ProcStart ([datetime]"2000-01-01T00:00:00Z") -FloorIso ""))
    Assert-L "floor: an unparseable floor marker disables cycling (never below floor)" (-not (Test-RunnerBelowFloor -ProcStart ([datetime]"2000-01-01T00:00:00Z") -FloorIso "not-a-date"))
    # N) Test-ShouldCycleStaleRunner: cycle ONLY a below-floor runner that is idle (zero children);
    #    a busy (>=1 child) or unknown (-1 scan failure) runner is NEVER cycled -> no in-flight iteration
    #    is ever broken, and a not-below-floor runner is never touched regardless of idleness.
    Assert-L "cycle: below-floor AND idle (0 children) -> cycle" (Test-ShouldCycleStaleRunner -BelowFloor $true -ChildCount 0)
    Assert-L "cycle: below-floor but BUSY (1 child = live claude turn) -> do NOT cycle" (-not (Test-ShouldCycleStaleRunner -BelowFloor $true -ChildCount 1))
    Assert-L "cycle: below-floor but scan FAILED (-1 = unknown) -> do NOT cycle (treat as busy)" (-not (Test-ShouldCycleStaleRunner -BelowFloor $true -ChildCount -1))
    Assert-L "cycle: NOT below floor + idle -> do NOT cycle (already carries the fix)" (-not (Test-ShouldCycleStaleRunner -BelowFloor $false -ChildCount 0))
    # O) Invoke-StaleRunnerCycle: an empty floor marker short-circuits to a no-op (kills nothing) even
    #    when lanes are configured - the guard that makes an unset marker completely inert.
    Assert-L "cycle: empty floor marker makes Invoke-StaleRunnerCycle a no-op" (@(Invoke-StaleRunnerCycle -Lanes $healLanes -FloorIso "" -DryRun).Count -eq 0)
  } finally {
    try { Remove-Item -LiteralPath $tmp -Recurse -Force -ErrorAction SilentlyContinue } catch {}
  }
  if ($fails -eq 0) { Write-Launcher "[SELFTEST] ALL PASS"; exit 0 }
  Write-Launcher ("[SELFTEST] " + $fails + " FAILURE(S)"); exit 1
}

# ---------------------------------------------------------------------------
# -RehearseCritic: prove the weekly critic's git-worktree plumbing works against the deployed HEAD
# without spending a Claude one-shot, then exit. Needs only $repoRoot + git, so it runs before any
# config read. Use it as a side-effect-free pre-flight before an unattended critic season (the real
# critic first fires unattended, and its -WhatIf branch never creates the worktree). Add -WhatIf to
# print the plan without touching git. Exits 0 when the full add/verify/teardown cycle succeeds and
# leaves NO worktree behind, 1 on any breakage.
# ---------------------------------------------------------------------------
if ($RehearseCritic) {
  Write-Launcher ("critic-rehearsal: exercising fetch/worktree-add/verify/teardown (no Claude one-shot)" + $(if ($WhatIf) { " [dry-run]" } else { "" }) + ".")
  $reh = Invoke-CriticRehearsal -RepoRoot $repoRoot -Stamp $launchStamp -DryRun:$WhatIf
  foreach ($s in $reh.steps) { Write-Launcher ("  " + $s) }
  if ($reh.ok) { Write-Launcher "[REHEARSE-CRITIC] PASS (critic plumbing sound; no worktree leaked)."; exit 0 }
  Write-Launcher "[REHEARSE-CRITIC] FAIL (see steps above; critic would break on plumbing)."; exit 1
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
    Set-Content -Path $dry -Value $newText -Encoding UTF8 -NoNewline
    Write-Launcher ("[WHATIF] resurrection banner reconcile -> " + $dry + " (sched=" + $sched + ", startup=" + $startup + ", bannerLines=" + $desired.Count + ")")
  } else {
    Set-Content -Path $statusPath -Value $newText -Encoding UTF8 -NoNewline
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
    Set-Content -Path $dry -Value $text -Encoding UTF8 -NoNewline
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
    Set-Content -Path $statusPath -Value $text -Encoding UTF8 -NoNewline
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
# -HealOnly: watchdog re-launch of individually-dead lanes, and NOTHING else. This is the recovery
# half of the dead-lane story (loop-status' health banner is the detection half): the always-alive
# ops lane calls this every interval, so a lane whose runner wedged/crashed comes back in ~one ops
# interval rather than waiting for the next logon / 07:00 full launcher pass. Deliberately minimal -
# no deadline banner, no planner/critic gate, no git, no status rewrite - to be cheap and side-effect
# free enough to run on a hot loop. Idempotency is provided by loop-runner.ps1's own per-lane
# single-instance guard (a re-launched live lane self-exits), so we never double-run a healthy lane.
# ---------------------------------------------------------------------------
if ($HealOnly) {
  # Respect the run deadline: past untilIso the run is meant to be STOPPED, so heal nothing (else the
  # ops watchdog would fight the runners' own deadline-break and resurrect an expired run forever).
  $healUntil = $null
  if ([string]$cfg.untilIso -ne "") { try { $healUntil = [datetime]::Parse([string]$cfg.untilIso) } catch {} }
  if (($null -ne $healUntil) -and ((Get-Date) -ge $healUntil)) {
    Write-Launcher ("[HEAL] past deadline (untilIso=" + ([string]$cfg.untilIso) + "); healing nothing (run is meant to be stopped).")
    exit 0
  }
  $healRunning = Get-RunningLanes
  # Fail-safe: an empty scan means either a genuinely cold machine (logon launcher's job, not heal's)
  # OR a WMI outage - and under a WMI outage the runner's OWN guard fail-opens, so re-launching now
  # would double-run every lane. Either way, refuse: heal only ever fixes "some alive, one dead".
  if ($healRunning.Count -eq 0) {
    Write-Launcher "[HEAL] process scan shows ZERO running lanes; refusing to heal (cold start is the logon launcher's job; an empty scan may also be a WMI outage where re-launch would double-run). No action."
    exit 0
  }
  # Cooperative stale-runner cycle FIRST: kill (only) any idle below-floor runner so the resurrection
  # path below relaunches it on fresh code. Exclude this launcher's ancestor chain so heal can never kill
  # the ops runner that spawned it (the idle gate already spares it - it owns this launcher as a child -
  # but the exclusion is belt-and-braces). Re-scan after so a just-cycled lane counts as DEAD -> healed.
  $cycledHeal = @(Invoke-StaleRunnerCycle -Lanes $cfg.lanes -FloorIso ([string]$cfg.runnerFloorIso) -DryRun:$WhatIf -ExcludePids (Get-AncestorPids))
  if ($cycledHeal.Count -gt 0) {
    Write-Launcher ("[HEAL] cooperatively cycled below-floor lanes [" + ($cycledHeal -join ", ") + "]" + $(if ($WhatIf) { " (WHATIF)" } else { "; re-scanning so the resurrection path relaunches them on fresh code." }))
    if (-not $WhatIf) { $healRunning = Get-RunningLanes }
  }
  $toHeal = @(Get-LanesToHeal -Lanes $cfg.lanes -Running $healRunning)
  if ($toHeal.Count -eq 0) {
    Write-Launcher ("[HEAL] all enabled lanes alive (" + (($healRunning.Keys | Sort-Object) -join ", ") + "); nothing to resurrect.")
    exit 0
  }
  foreach ($name in $toHeal) {
    $lane = $cfg.lanes | Where-Object { [string]$_.name -eq $name } | Select-Object -First 1
    if ($null -eq $lane) { continue }
    $laneRepo = Resolve-LaneRepo -lane $lane
    $runner = Join-Path $laneRepo "loop-runner.ps1"
    if (-not (Test-Path $runner)) {
      Write-Launcher ("[HEAL] WARN: lane '" + $name + "' has no runner at " + $runner + "; cannot resurrect. Skipping.")
      continue
    }
    $argList = @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $runner,
      "-Lane", $name, "-RepoPath", $laneRepo, "-Model", [string]$lane.model,
      "-IntervalSeconds", [string][int]$lane.intervalSeconds)
    if ([string]$cfg.untilIso -ne "") { $argList += @("-UntilIso", [string]$cfg.untilIso) }
    if ($ClaudeCmd -ne "claude") { $argList += @("-ClaudeCmd", $ClaudeCmd) }
    if ($WhatIf) {
      Write-Launcher ("[HEAL][WHATIF] would resurrect dead lane '" + $name + "' (model=" + $lane.model + ", interval=" + $lane.intervalSeconds + "s, repo=" + $laneRepo + ").")
    } else {
      Write-Launcher ("[HEAL] resurrecting dead lane '" + $name + "' (model=" + $lane.model + ", interval=" + $lane.intervalSeconds + "s, repo=" + $laneRepo + "). Runner's own guard makes this a no-op if it is actually alive.")
      Start-Process -FilePath "powershell" -ArgumentList $argList -WorkingDirectory $laneRepo
    }
  }
  Write-Launcher ("[HEAL] done. Alive=[" + (($healRunning.Keys | Sort-Object) -join ", ") + "] Resurrected=[" + ($toHeal -join ", ") + "]" + $(if ($WhatIf) { " (WHATIF: nothing actually launched)" } else { "" }))
  exit 0
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
    Set-Content -Path $dry -Value $statusText -Encoding UTF8 -NoNewline
    Write-Launcher ("[WHATIF] wrote status to " + $dry)
  } else {
    $statusDir = Split-Path -Parent $statusPath
    if (-not (Test-Path $statusDir)) { New-Item -ItemType Directory -Path $statusDir | Out-Null }
    Set-Content -Path $statusPath -Value $statusText -Encoding UTF8 -NoNewline
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

# Cooperative stale-runner cycle (full pass): before scanning who is running, stop any idle below-floor
# runner so the ignition loop below sees it as absent and relaunches it on fresh code. Skipped past the
# deadline (the run is meant to be stopping). -WhatIf logs only. Then $running reflects the post-cycle
# state so cycled lanes are (re)started rather than treated as already-alive no-ops.
if (-not $deadlinePassed) {
  $cycledFull = @(Invoke-StaleRunnerCycle -Lanes $cfg.lanes -FloorIso ([string]$cfg.runnerFloorIso) -DryRun:$WhatIf -ExcludePids (Get-AncestorPids))
  if ($cycledFull.Count -gt 0) {
    Write-Launcher ("cooperatively cycled below-floor lanes [" + ($cycledFull -join ", ") + "]" + $(if ($WhatIf) { " (WHATIF)" } else { "; the ignition loop will relaunch them on fresh code." }))
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
  Write-Launcher ("critic due (last=" + ([string]$state.lastCriticIso) + ", every=" + $criticEvery + "d). Firing critic one-shot in an ISOLATED git worktree (main tree untouched).")
  $state.lastCriticIso = $now.ToString("o")
  Save-State
  # Pre-flight: rehearse the EXACT git-worktree plumbing (side-effect-free, no Claude) before spending
  # a blocking 30-min one-shot. Invoke-CriticRehearsal runs the same fetch/worktree-add/verify/teardown
  # under a non-colliding "rehearsal-" stamp; if that add/verify/teardown is broken RIGHT NOW, the
  # unattended real fire would fail the same way after burning setup, so we skip it and back-date for a
  # ~1-day retry (the block below) instead of silently blackholing the critic season. In -WhatIf the
  # rehearsal is itself a dry-run (prints its plan, runs no git); the real fire then falls into its own
  # plan-only branch, so a dry-run shows the full wiring: rehearse -> (pass) -> fire.
  $preflight = Invoke-CriticRehearsal -RepoRoot $repoRoot -Stamp $launchStamp -DryRun:$WhatIf
  foreach ($ln in $preflight.steps) { Write-Launcher ("critic pre-flight: " + $ln) }
  # Run the critic in a throwaway worktree so its checkout/commit/push never shares an index with
  # the ops persistent runner in the main tree. The critic prompt is fed by absolute path from the
  # main tree; the worktree is a full origin/main checkout, so it has its own loop-runner.ps1.
  $wtPath = Get-CriticWorktreePath -RepoRoot $repoRoot -Stamp $launchStamp
  $criticOutcome = $null
  if (-not $WhatIf -and -not (Test-CriticFireAfterRehearsal -RehearsalOk ([bool]$preflight.ok))) {
    Write-Launcher ("WARN: critic pre-flight rehearsal FAILED; NOT firing the real critic one-shot this pass (the isolated-worktree plumbing is broken now and the unattended fire would fail the same way). Back-dating for a ~1-day retry and blaring a dashboard note.")
    $criticOutcome = "rehearsal-failed"
  } elseif (-not (Test-WorktreeIsIsolated -RepoRoot $repoRoot -WorktreePath $wtPath)) {
    Write-Launcher ("WARN: computed critic worktree '" + $wtPath + "' is not isolated from the main tree; refusing to run critic in-place (would re-open the git race). Treating as failure.")
    $criticOutcome = "worktree-unsafe"
  } elseif ($WhatIf) {
    # Honest dry-run: the worktree is NOT created in WhatIf, so we must NOT call Invoke-OneShot against
    # $wtPath (its Test-Path runner guard would fire and mislead the log with "skipped, no runner").
    # Report the exact plan instead - a real worktree checkout carries its own loop-runner.ps1.
    Write-Launcher ("[WHATIF] would fetch origin/main, create a detached worktree at " + $wtPath + " (git " + ((Get-WorktreeAddArgs -Path $wtPath -Ref 'origin/main') -join ' ') + "), run the critic one-shot there (tag=site-critic, model=" + $criticModel + ", timeout=30min), then remove the worktree (git " + ((Get-WorktreeRemoveArgs -Path $wtPath) -join ' ') + ").")
    $criticOutcome = "whatif"
  } else {
    # Fresh base: fetch origin/main so the critique runs against the deployed HEAD, not a stale local
    # ref. Prune + remove any orphan worktree from a prior crashed pass before (re)creating.
    $null = Invoke-Git -RepoRoot $repoRoot -GitArgs @("fetch", "origin", "main", "--quiet")
    $null = Invoke-Git -RepoRoot $repoRoot -GitArgs @("worktree", "prune")
    if (Test-Path -LiteralPath $wtPath) {
      $null = Invoke-Git -RepoRoot $repoRoot -GitArgs (Get-WorktreeRemoveArgs -Path $wtPath)
      if (Test-Path -LiteralPath $wtPath) { try { Remove-Item -LiteralPath $wtPath -Recurse -Force -ErrorAction SilentlyContinue } catch {} }
    }
    $add = Invoke-Git -RepoRoot $repoRoot -GitArgs (Get-WorktreeAddArgs -Path $wtPath -Ref "origin/main")
    if (-not $add.ok) {
      Write-Launcher ("WARN: git worktree add failed; critic NOT run this pass (better than racing the main tree). " + $add.out)
      $criticOutcome = "worktree-setup-failed"
    } else {
      Write-Launcher ("critic worktree ready at " + $wtPath + " (detached @origin/main).")
      try {
        $criticOutcome = Invoke-OneShot -Kind "critic" -LaneName "site" -LaneRepo $wtPath -Model $criticModel -PromptFile $criticPrompt -TimeoutMin 30
      } finally {
        # Always tear the worktree down, even on timeout/kill. The critic's branch is already pushed,
        # so removing the worktree does not lose its PR.
        $rm = Invoke-Git -RepoRoot $repoRoot -GitArgs (Get-WorktreeRemoveArgs -Path $wtPath)
        if (-not $rm.ok) { Write-Launcher ("WARN: git worktree remove reported: " + $rm.out) }
        if (Test-Path -LiteralPath $wtPath) { try { Remove-Item -LiteralPath $wtPath -Recurse -Force -ErrorAction SilentlyContinue } catch {} }
        $null = Invoke-Git -RepoRoot $repoRoot -GitArgs @("worktree", "prune")
        Write-Launcher ("critic worktree removed (" + $wtPath + ").")
      }
    }
  }
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

# ---------------------------------------------------------------------------
# Spawn the main-tree heal watchdog (loop-watchdog.ps1). This closes the ops single-point-of-failure
# in the recovery path: ops runs -HealOnly every iteration to resurrect OTHER lanes, but if the OPS
# runner itself dies nothing resurrects it until the next logon/07:00 pass (and only a MAIN-TREE
# process can heal correctly, since the 5 non-ops lanes live in separate clones). The watchdog is a
# tiny git-free/claude-free loop that calls -HealOnly on an interval, so a dead ops runner comes back
# in ~one watchdog interval. Spawned here on every FULL pass (never under -HealOnly, which exits
# earlier) so the admin-free logon->launcher chain covers the watchdog's own resurrection. Idempotent:
# the watchdog's own single-instance guard makes a second spawn a no-op, but we also skip when one is
# already alive to avoid a useless process churn. Skipped past the deadline (nothing to heal).
if (-not $deadlinePassed) {
  $watchdog = Join-Path $repoRoot "loop-watchdog.ps1"
  if (Test-Path $watchdog) {
    $wdRunning = $false
    try {
      $wdRunning = @(Get-CimInstance Win32_Process -Filter "Name LIKE 'powershell%' OR Name LIKE 'pwsh%'" -ErrorAction Stop |
        Where-Object { $_.ProcessId -ne $PID -and $_.CommandLine -like '*loop-watchdog.ps1*' }).Count -gt 0
    } catch {}
    if ($wdRunning) {
      Write-Launcher "heal watchdog already running; not spawning a second."
    } elseif ($WhatIf) {
      Write-Launcher ("[WHATIF] would spawn heal watchdog: " + $watchdog)
    } else {
      $wdArgs = @("-NoProfile", "-ExecutionPolicy", "Bypass", "-WindowStyle", "Hidden", "-File", $watchdog)
      if ($ClaudeCmd -ne "claude") { $wdArgs += @("-ClaudeCmd", $ClaudeCmd) }
      Start-Process -FilePath "powershell" -ArgumentList $wdArgs -WorkingDirectory $repoRoot
      Write-Launcher ("spawned heal watchdog (" + $watchdog + ").")
    }
  }
}

# Log retention sweep: bound the unbounded growth of logs/ so the operator's diagnostic surface stays
# readable and disk cannot slowly fill. Runs on every full pass (NOT under -HealOnly, which exited
# earlier) and regardless of the deadline - cleanup is always safe. Sweeps EVERY lane's logs/ (this
# tree PLUS each sibling clone under lanesRoot - non-ops lanes write their loop-*.log there and it
# would otherwise never be pruned), deduped by full path so the ops tree is not swept twice. Keeps the
# 20 newest per dir + last 14d (Get-LogsToPrune); a still-open runner log is Windows-write-locked so
# its delete simply fails and is skipped. -WhatIf lists what WOULD be pruned and touches nothing.
try {
  $candidateDirs = @($logDir)
  foreach ($lane in $cfg.lanes) {
    $lr = Resolve-LaneRepo $lane
    if ([string]$lr -ne "") { $candidateDirs += (Join-Path $lr "logs") }
  }
  $sweepDirs = @(Get-UniqueLogDirs -Dirs $candidateDirs)
  $now = Get-Date
  $totalPrune = 0; $totalDeleted = 0; $totalFiles = 0
  foreach ($dir in $sweepDirs) {
    if (-not (Test-Path -LiteralPath $dir)) { continue }
    $logItems = @(Get-ChildItem -LiteralPath $dir -File -ErrorAction SilentlyContinue)
    $totalFiles += $logItems.Count
    $toPrune = @(Get-LogsToPrune -Files $logItems -Now $now -RetentionDays 14 -KeepMin 20)
    if ($toPrune.Count -eq 0) { continue }
    $totalPrune += $toPrune.Count
    if ($WhatIf) {
      Write-Launcher ("[WHATIF] log retention: " + $dir + " -> would prune " + $toPrune.Count + " stale log(s): " + (($toPrune | Select-Object -First 8) -join ", ") + $(if ($toPrune.Count -gt 8) { " ..." } else { "" }))
    } else {
      foreach ($name in $toPrune) {
        $p = Join-Path $dir $name
        try { Remove-Item -LiteralPath $p -Force -ErrorAction Stop; $totalDeleted++ } catch {}
      }
    }
  }
  if ($totalPrune -eq 0) {
    Write-Launcher ("log retention: nothing to prune across " + $sweepDirs.Count + " lane log dir(s) (" + $totalFiles + " files, keep>=20 newest + last 14d).")
  } elseif ($WhatIf) {
    Write-Launcher ("[WHATIF] log retention: would prune " + $totalPrune + " stale log(s) across " + $sweepDirs.Count + " lane log dir(s).")
  } else {
    Write-Launcher ("log retention: pruned " + $totalDeleted + " of " + $totalPrune + " stale log(s) across " + $sweepDirs.Count + " lane log dir(s) (kept 20 newest + last 14d per dir).")
  }
} catch {
  Write-Launcher ("WARN: log retention sweep failed (non-fatal): " + $_.Exception.Message)
}

Write-Launcher "=== loop-launcher end ==="
