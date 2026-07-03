<#
.SYNOPSIS
  Main-tree heal watchdog for the safe-ai-site self-run loops.

.DESCRIPTION
  The ops lane calls `loop-launcher.ps1 -HealOnly` every iteration (prompt step 5.6) to resurrect
  OTHER dead lanes, but that leaves ops itself a single point of failure: if the OPS runner process
  dies, nothing resurrects it until the next logon / 07:00 launcher pass - potentially days on a
  machine that stays logged in. And ops is the ONLY process that can heal correctly, because only a
  MAIN-TREE process resolves loop-config.json's lanesRoot/repoPath the right way: the five non-ops
  lanes run in separate clones under ..\safe-ai-lanes\<name>, so a heal launched from one of THOSE
  clones would mis-resolve every path (and could even launch a lane into the wrong tree). So the
  recovery half of the "no lane stays dead" promise has a hole exactly at its most load-bearing lane.

  This watchdog is the missing piece: a tiny, git-free, claude-free loop that lives in the MAIN tree
  and calls `loop-launcher.ps1 -HealOnly` on a fixed interval. -HealOnly resurrects ANY dead lane
  including ops, so a wedged/crashed ops runner comes back in ~one watchdog interval instead of
  waiting for logon. The launcher spawns this watchdog idempotently on every full pass, so the
  existing admin-free logon -> Startup -> launcher chain already covers the watchdog's OWN
  resurrection (and the watchdog is far simpler than a lane runner, so far less likely to die).

  Hot-swap (mirrors loop-runner.ps1 #672): a long-lived watchdog reads its whole script at launch, so a
  pulled loop-watchdog.ps1 fix would otherwise never reach it until it dies - and #654 made the watchdog
  deliberately durable, so its own code is the MOST stranded of all. Each tick it compares its on-disk
  hash to the launch baseline; on a change it SELF-respawns (spawns a successor from the new code tagged
  with -SupersedePid <outgoing pid>, then exits). It must self-respawn rather than merely clean-exit like
  the runner because -HealOnly never resurrects the watchdog, so nothing else would relaunch it until the
  next full launcher pass (logon / 07:00). The successor's guard excludes the superseded PID so the brief
  hand-off overlap never collapses to zero watchdogs.

  This file is intentionally PURE ASCII so Windows PowerShell 5.x parses it as BOM-less UTF-8
  (a Japanese literal here would be mis-decoded as Shift-JIS and break parsing) - like loop-runner.ps1.

  Run with -SelfTest to dry-run the pure gates (no launcher / no process scan needed).
  Run with -WhatIf to do ONE planned heal pass (launcher -HealOnly -WhatIf, read-only) and exit.

.PARAMETER IntervalSeconds
  Seconds between heal passes (default 300). Clamped to a 60s floor so a bad value cannot spin hot.

.PARAMETER RepoPath
  Main-tree repo root that owns loop-launcher.ps1 + loop-config.json (default = this script's dir).

.PARAMETER ClaudeCmd
  Passed through to the launcher for symmetry (heal does not launch claude, but a lane it resurrects
  may need a non-default CLI path). Default "claude".

.PARAMETER SupersedePid
  Set ONLY by a hot-swap self-respawn: the outgoing watchdog's PID, which the successor's single-instance
  guard excludes so the brief hand-off overlap is not mistaken for a competing instance. Default 0 (a
  normal launch has no predecessor to supersede).

.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File .\loop-watchdog.ps1

.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File .\loop-watchdog.ps1 -SelfTest
#>
[CmdletBinding()]
param(
  [int]$IntervalSeconds = 300,
  [string]$RepoPath = $PSScriptRoot,
  [string]$ClaudeCmd = "claude",
  [int]$SupersedePid = 0,
  [switch]$WhatIf,
  [switch]$SelfTest
)

$ErrorActionPreference = "Continue"
$OutputEncoding = New-Object System.Text.UTF8Encoding $false
try { [Console]::OutputEncoding = New-Object System.Text.UTF8Encoding $false } catch {}

# Pure: has the run deadline passed? A blank/garbage untilIso means "no deadline" (keep healing) so a
# transiently unreadable config never stops the watchdog. Pure so -SelfTest can assert it offline.
function Test-WatchdogPastDeadline([string]$UntilIso, [datetime]$Now) {
  if ([string]::IsNullOrWhiteSpace($UntilIso)) { return $false }
  try { return ($Now -ge [datetime]::Parse($UntilIso)) } catch { return $false }
}

# Pure: clamp the interval to a 60s floor so a mis-set 0/negative value cannot busy-spin the loop
# (and, with it, hammer -HealOnly process scans). Pure so -SelfTest can assert the clamp.
function Get-WatchdogInterval([int]$Requested) {
  if ($Requested -lt 60) { return 60 }
  return $Requested
}

# Content hash of a file, or "" on any failure (missing / locked mid-checkout). Never throws so the
# hot-swap check degrades to "unchanged" instead of crashing the loop. Mirrors loop-runner.ps1.
function Get-ScriptHashSafe([string]$Path) {
  try {
    if (-not $Path -or -not (Test-Path $Path)) { return "" }
    return (Get-FileHash -Algorithm SHA256 -Path $Path -ErrorAction Stop).Hash
  } catch { return "" }
}

# Hot-swap gate: whether the running watchdog's OWN script changed on disk since launch, i.e. an ops fix
# to loop-watchdog.ps1 was pulled into the main tree but this long-lived process is still executing the
# OLD code. Like loop-runner.ps1 (#672), the watchdog reads its whole script into the process at launch;
# unlike a lane runner it is deliberately the MOST durable process (#654 "far less likely to die"), so a
# watchdog-code fix is the MOST stranded of all - and -HealOnly (its own resurrection lever) never
# touches the watchdog, so nothing relaunches a clean-exited watchdog until the next FULL launcher pass
# (logon / 07:00, up to ~24h). Therefore the watchdog must SELF-respawn (see relaunch below), not merely
# clean-exit like the runner. Pure so -SelfTest asserts it without file IO: change is signalled ONLY when
# both hashes are non-empty and differ; an empty/failed current hash (file briefly locked mid git-
# checkout) or empty launch baseline returns $false = fail-safe toward "unchanged" (no restart loop).
function Test-ScriptChanged([string]$LaunchHash, [string]$CurrentHash) {
  if ([string]::IsNullOrEmpty($LaunchHash)) { return $false }
  if ([string]::IsNullOrEmpty($CurrentHash)) { return $false }
  return ($LaunchHash -ne $CurrentHash)
}

# Pure: given the PIDs a single-instance scan found, return the genuine competitors = everything that is
# neither THIS process nor a superseded predecessor handing off during a self-respawn. A self-respawn
# passes the outgoing PID as -SupersedePid so the successor does NOT count its still-alive predecessor as
# a competitor and immediately self-exit (which would leave ZERO watchdogs - the one outcome to avoid; a
# few ms of TWO watchdogs is harmless since heal is idempotent). Pure so -SelfTest can assert the filter.
function Select-CompetingWatchdogPids($Pids, [int]$SelfPid, [int]$SupersedePid) {
  return @($Pids | Where-Object { ([int]$_ -ne $SelfPid) -and (($SupersedePid -le 0) -or ([int]$_ -ne $SupersedePid)) })
}

# Pure: build the Start-Process argument array that relaunches THIS watchdog script from its (new) on-disk
# copy, tagging the outgoing PID as -SupersedePid so the successor's guard tolerates the hand-off. Path
# args are quoted so a repo path with spaces survives Start-Process's space-join. Pure so -SelfTest can
# assert the hand-off flag and script path without spawning anything.
function Get-WatchdogRelaunchArgs([string]$ScriptPath, [int]$Interval, [string]$RepoPath, [string]$ClaudeCmd, [int]$SelfPid) {
  return @(
    "-NoProfile", "-ExecutionPolicy", "Bypass",
    "-File", ('"' + $ScriptPath + '"'),
    "-SupersedePid", "$SelfPid",
    "-IntervalSeconds", "$Interval",
    "-RepoPath", ('"' + $RepoPath + '"'),
    "-ClaudeCmd", $ClaudeCmd
  )
}

# Read untilIso out of loop-config.json each tick (re-read so an owner's live edit is respected).
# Any failure -> "" (no deadline), matching Test-WatchdogPastDeadline's fail-open contract.
function Get-ConfigUntilIso([string]$ConfigPath) {
  if (-not (Test-Path $ConfigPath)) { return "" }
  try {
    $cfg = Get-Content -Raw -Encoding UTF8 -Path $ConfigPath | ConvertFrom-Json
    return [string]$cfg.untilIso
  } catch { return "" }
}

# Pure: does a process command line genuinely LAUNCH loop-watchdog.ps1 (invoked via -File), as opposed to
# merely MENTIONING the filename somewhere in its arguments (e.g. an operator/agent diagnostic run with
# -Command "... loop-watchdog.ps1 ...")? The single-instance guard below (and the launcher's
# Invoke-EnsureHealWatchdog) counted ANY powershell whose command line CONTAINED the substring
# "loop-watchdog.ps1", so a stray command that names the script spoofs the liveness scan: it can make a
# correctly-spawned watchdog self-exit here (thinking a competitor exists) into a zero-watchdog gap whose
# only resurrector is a rare full launcher pass, or (in the launcher's scan) suppress spawning a genuinely
# dead watchdog. Both REAL launch forms use -File: the launcher's ensure-spawn (-File <path>\loop-watchdog.ps1)
# and the self-respawn hand-off (Get-WatchdogRelaunchArgs, -File "<path>\loop-watchdog.ps1"). Match that
# shape - a path ending in loop-watchdog.ps1 immediately after -File, quoted or bare - so a -Command mention
# (which has no -File before the path) no longer counts. Pure so -SelfTest asserts it offline.
function Test-IsWatchdogProcess([string]$CommandLine) {
  if ([string]::IsNullOrEmpty($CommandLine)) { return $false }
  return ($CommandLine -match '(?i)-File\s+"?[^"]*loop-watchdog\.ps1(?:"|\s|$)')
}

# Dry-run self-check of the pure gates. Runs BEFORE any launcher / process dependency so it is safe
# on any machine: powershell -File loop-watchdog.ps1 -SelfTest
if ($SelfTest) {
  $ref = [datetime]::Parse("2026-07-03T12:00:00")
  $cases = @(
    @{ name = "blank untilIso -> not past (keep healing)"; got = (Test-WatchdogPastDeadline "" $ref); want = $false },
    @{ name = "whitespace untilIso -> not past";           got = (Test-WatchdogPastDeadline "   " $ref); want = $false },
    @{ name = "garbage untilIso -> not past (fail-open)";  got = (Test-WatchdogPastDeadline "not-a-date" $ref); want = $false },
    @{ name = "future untilIso -> not past";               got = (Test-WatchdogPastDeadline "2026-07-31T23:00:00" $ref); want = $false },
    @{ name = "past untilIso -> past (stop)";              got = (Test-WatchdogPastDeadline "2026-07-01T00:00:00" $ref); want = $true },
    @{ name = "exact boundary -> past (>=)";               got = (Test-WatchdogPastDeadline "2026-07-03T12:00:00" $ref); want = $true },
    @{ name = "interval 300 -> 300";                       got = (Get-WatchdogInterval 300); want = 300 },
    @{ name = "interval 60 -> 60 (floor)";                 got = (Get-WatchdogInterval 60); want = 60 },
    @{ name = "interval 10 -> 60 (clamped up)";            got = (Get-WatchdogInterval 10); want = 60 },
    @{ name = "interval 0 -> 60 (clamped up)";             got = (Get-WatchdogInterval 0); want = 60 },
    @{ name = "interval -5 -> 60 (clamped up)";            got = (Get-WatchdogInterval -5); want = 60 }
  )
  $ok = $true
  foreach ($c in $cases) {
    $pass = ($c.got -eq $c.want)
    if (-not $pass) { $ok = $false }
    Write-Host ("[selftest] " + $c.name + " -> got=" + $c.got + " want=" + $c.want + " " + $(if ($pass) { "OK" } else { "FAIL" }))
  }

  # Hot-swap gate: the watchdog self-respawns (relaunches the new on-disk code) ONLY when its own script
  # genuinely changed. Fail-safe: an empty/failed current hash, or no launch baseline, never respawns.
  $swapCases = @(
    @{ launch = "AAAA"; cur = "AAAA"; want = $false },  # unchanged -> keep running
    @{ launch = "AAAA"; cur = "BBBB"; want = $true },   # changed on disk -> self-respawn new code
    @{ launch = "AAAA"; cur = "";     want = $false },  # unreadable now (locked mid-checkout) -> no respawn loop
    @{ launch = "";     cur = "BBBB"; want = $false }   # no launch baseline -> never respawn
  )
  foreach ($s in $swapCases) {
    $got = Test-ScriptChanged $s.launch $s.cur
    $pass = ($got -eq $s.want)
    if (-not $pass) { $ok = $false }
    Write-Host ("[selftest] hotswap launch='" + $s.launch + "' cur='" + $s.cur + "' -> " + $got + " (want " + $s.want + ") " + $(if ($pass) { "OK" } else { "FAIL" }))
  }

  # Guard exclusion: a superseded predecessor (hand-off) and this process itself are never counted as
  # competitors; any OTHER watchdog PID is. This is what keeps a self-respawn from leaving ZERO watchdogs.
  $guardCases = @(
    @{ name = "self excluded";                    pids = @(100);           self = 100; sup = 0;   want = 0 },
    @{ name = "superseded predecessor excluded";  pids = @(100, 200);      self = 200; sup = 100; want = 0 },
    @{ name = "real competitor kept";             pids = @(100, 300);      self = 200; sup = 100; want = 1 },
    @{ name = "no supersede -> only self excluded";pids = @(100, 200);     self = 200; sup = 0;   want = 1 }
  )
  foreach ($g in $guardCases) {
    $got = @(Select-CompetingWatchdogPids $g.pids $g.self $g.sup).Count
    $pass = ($got -eq $g.want)
    if (-not $pass) { $ok = $false }
    Write-Host ("[selftest] guard " + $g.name + " -> competitors=" + $got + " (want " + $g.want + ") " + $(if ($pass) { "OK" } else { "FAIL" }))
  }

  # Relaunch args: the hand-off command must re-run THIS script and tag the outgoing PID as -SupersedePid
  # (else the successor's guard would see the predecessor and self-exit into a no-watchdog gap).
  $relaunch = Get-WatchdogRelaunchArgs "C:\repo\loop-watchdog.ps1" 300 "C:\repo" "claude" 4242
  $joined = ($relaunch -join " ")
  $relaunchOk = ($joined -match '-File "C:\\repo\\loop-watchdog\.ps1"') -and ($joined -match '-SupersedePid 4242') -and ($joined -match '-IntervalSeconds 300')
  if (-not $relaunchOk) { $ok = $false }
  Write-Host ("[selftest] relaunch args carry -File(self) + -SupersedePid(outgoing pid) + interval: " + $(if ($relaunchOk) { "OK" } else { "FAIL" }) + " [" + $joined + "]")

  # Watchdog-process identity: the single-instance scan must count a real -File launch of loop-watchdog.ps1
  # (ensure-spawn bare form, self-respawn quoted form) and must NOT count a mere command-line MENTION
  # (a -Command diagnostic that names the script) - the false match that could suppress a spawn or force a
  # correct watchdog to self-exit into a zero-watchdog gap.
  $wdIdCases = @(
    @{ name = "bare -File launch (ensure-spawn form) -> watchdog";      cl = 'powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File C:\r\loop-watchdog.ps1'; want = $true },
    @{ name = "quoted -File launch (self-respawn form) -> watchdog";    cl = 'powershell -NoProfile -File "C:\r\loop-watchdog.ps1" -SupersedePid 100 -IntervalSeconds 300'; want = $true },
    @{ name = "bare -File launch with trailing args -> watchdog";       cl = 'powershell -File C:\r\loop-watchdog.ps1 -ClaudeCmd claude'; want = $true },
    @{ name = "-Command MENTION (diagnostic) -> NOT watchdog";          cl = 'powershell -NoProfile -Command "gci | ? { $_.CommandLine -like ''*loop-watchdog.ps1*'' }"'; want = $false },
    @{ name = "substring-only -like filter text -> NOT watchdog";       cl = "powershell -Command `"Get-Process # loop-watchdog.ps1`""; want = $false },
    @{ name = "a lane runner -File launch -> NOT watchdog";             cl = 'powershell -File C:\r\loop-runner.ps1 -Lane ops'; want = $false },
    @{ name = "empty command line -> NOT watchdog (null-safe)";         cl = ""; want = $false }
  )
  foreach ($w in $wdIdCases) {
    $got = Test-IsWatchdogProcess $w.cl
    $pass = ($got -eq $w.want)
    if (-not $pass) { $ok = $false }
    Write-Host ("[selftest] wd-id " + $w.name + " -> " + $got + " (want " + $w.want + ") " + $(if ($pass) { "OK" } else { "FAIL" }))
  }

  if ($ok) { Write-Host "[selftest] PASS"; exit 0 } else { Write-Host "[selftest] FAIL"; exit 1 }
}

if (-not $RepoPath -or $RepoPath -eq "") { $RepoPath = (Get-Location).Path }
Set-Location $RepoPath
$launcher = Join-Path $RepoPath "loop-launcher.ps1"
$configPath = Join-Path $RepoPath "loop-config.json"

$logDir = Join-Path $RepoPath "logs"
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }
$runStamp = Get-Date -Format "yyyyMMdd-HHmmss"
$logFile = Join-Path $logDir ("watchdog-" + $runStamp + ".log")

function Write-Log([string]$msg) {
  $line = "[" + (Get-Date -Format "yyyy-MM-dd HH:mm:ss") + "] " + $msg
  Write-Host $line
  try { Add-Content -Path $logFile -Value $line -Encoding UTF8 } catch {}
}

# Single-instance guard: exit immediately if another loop-watchdog.ps1 is already running, so the
# launcher can spawn this idempotently on every full pass (logon / 07:00) without stacking watchdogs.
# A process scan (not a lock file) is used on purpose - a reboot/crash leaves no stale lock to clear.
# A failed scan only warns (fail-open) so a broken WMI service never blocks the watchdog from running.
# During a hot-swap self-respawn the successor is started with -SupersedePid <outgoing pid>; that PID is
# excluded here so the successor does NOT treat its still-alive predecessor as a competitor and self-exit
# into a zero-watchdog gap (Select-CompetingWatchdogPids).
try {
  $scanPids = @(Get-CimInstance Win32_Process -Filter "Name LIKE 'powershell%' OR Name LIKE 'pwsh%'" -ErrorAction Stop |
    Where-Object { Test-IsWatchdogProcess ([string]$_.CommandLine) } | ForEach-Object { $_.ProcessId })
  $competitors = @(Select-CompetingWatchdogPids $scanPids $PID $SupersedePid)
  if ($competitors.Count -gt 0) {
    Write-Log ("GUARD: another loop-watchdog is already running (PID " + ($competitors -join ", ") + "). Exiting to keep a single instance.")
    exit 0
  }
  if ($SupersedePid -gt 0) {
    Write-Log ("hand-off: superseding predecessor watchdog PID " + $SupersedePid + " (self-respawn after a loop-watchdog.ps1 hot-swap).")
  }
} catch {
  Write-Log ("WARN: single-instance scan failed (" + $_.Exception.Message + "); continuing without guard")
}

if (-not (Test-Path $launcher)) {
  Write-Log ("ERROR: launcher not found at " + $launcher + "; watchdog cannot heal. Exiting.")
  exit 1
}

$interval = Get-WatchdogInterval $IntervalSeconds

# Baseline content hash of THIS script for the hot-swap check (see Test-ScriptChanged). Captured once at
# launch; compared to the on-disk copy each tick so a pulled loop-watchdog.ps1 fix triggers a self-respawn.
$launchWatchdogHash = Get-ScriptHashSafe $PSCommandPath

# Self-respawn hand-off: relaunch THIS watchdog from its (new) on-disk copy, tagging the outgoing PID so
# the successor's guard tolerates the brief overlap, then return $true so the caller can stop this loop.
# Unlike a lane runner, the watchdog has no external fast resurrector (-HealOnly never touches it), so it
# must start its own replacement rather than merely clean-exit. Never throws (a failed spawn keeps the
# current watchdog looping on OLD code - degraded but alive - rather than exiting into a zero-watchdog gap).
function Invoke-WatchdogRespawn {
  try {
    $relaunchArgs = Get-WatchdogRelaunchArgs $PSCommandPath $IntervalSeconds $RepoPath $ClaudeCmd $PID
    Start-Process -FilePath "powershell" -ArgumentList $relaunchArgs -WorkingDirectory $RepoPath -WindowStyle Hidden | Out-Null
    Write-Log ("self-update: loop-watchdog.ps1 changed on disk; spawned successor (supersede PID " + $PID + ") from the new code and exiting.")
    return $true
  } catch {
    Write-Log ("WARN: self-respawn failed (" + $_.Exception.Message + "); staying alive on the current code.")
    return $false
  }
}

# One heal pass = launcher -HealOnly, blocking with a short cap (heal is process-scan + Start-Process,
# normally sub-10s). -HealOnly is git-free and, on good config, does NOT rewrite loop-status.md; on a
# broken config it writes the loud config-error banner (under a lock) and exits - both are correct.
function Invoke-HealPass([bool]$Dry) {
  $argList = @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $launcher, "-HealOnly")
  if ($Dry) { $argList += "-WhatIf" }
  if ($ClaudeCmd -ne "claude") { $argList += @("-ClaudeCmd", $ClaudeCmd) }
  try {
    $p = Start-Process -FilePath "powershell" -ArgumentList $argList -WorkingDirectory $RepoPath -WindowStyle Hidden -PassThru
    if (-not $p.WaitForExit(120000)) {
      try { $p.Kill() } catch {}
      Write-Log "WARN: heal pass exceeded 120s; killed and continuing."
      return
    }
    Write-Log ("heal pass finished (launcher -HealOnly" + $(if ($Dry) { " -WhatIf" } else { "" }) + ", exit=" + $p.ExitCode + ").")
  } catch {
    Write-Log ("WARN: heal pass failed (non-fatal): " + $_.Exception.Message)
  }
}

# -WhatIf: prove the integration with ONE read-only heal pass, then exit (do not loop).
if ($WhatIf) {
  Write-Log ("[WHATIF] one planned heal pass via '" + $launcher + " -HealOnly -WhatIf' (read-only); then exit. interval would be " + $interval + "s.")
  Invoke-HealPass $true
  Write-Log "[WHATIF] done."
  exit 0
}

Write-Log ("=== loop-watchdog start (repo=" + $RepoPath + ", interval=" + $interval + "s, launcher=" + $launcher + ") ===")
Write-Log ("log: " + $logFile)

while ($true) {
  $untilIso = Get-ConfigUntilIso $configPath
  if (Test-WatchdogPastDeadline $untilIso (Get-Date)) {
    Write-Log ("run deadline (untilIso=" + $untilIso + ") reached; stopping watchdog (edit loop-config.json untilIso and re-run the launcher to resume).")
    break
  }
  Invoke-HealPass $false

  # Hot-swap: if a fix to THIS script was pulled into the main tree since launch, hand off to a fresh
  # watchdog running the new code. Checked AFTER the heal pass (nothing is in flight) and only when the
  # self-respawn actually launched, so a transient spawn failure keeps this watchdog alive on old code.
  $curWatchdogHash = Get-ScriptHashSafe $PSCommandPath
  if (Test-ScriptChanged $launchWatchdogHash $curWatchdogHash) {
    if (Invoke-WatchdogRespawn) { break }
  }

  Start-Sleep -Seconds $interval
}
Write-Log "=== loop-watchdog end ==="
