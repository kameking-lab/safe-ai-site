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

# Read untilIso out of loop-config.json each tick (re-read so an owner's live edit is respected).
# Any failure -> "" (no deadline), matching Test-WatchdogPastDeadline's fail-open contract.
function Get-ConfigUntilIso([string]$ConfigPath) {
  if (-not (Test-Path $ConfigPath)) { return "" }
  try {
    $cfg = Get-Content -Raw -Encoding UTF8 -Path $ConfigPath | ConvertFrom-Json
    return [string]$cfg.untilIso
  } catch { return "" }
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
try {
  $others = @(Get-CimInstance Win32_Process -Filter "Name LIKE 'powershell%' OR Name LIKE 'pwsh%'" -ErrorAction Stop |
    Where-Object { $_.ProcessId -ne $PID -and $_.CommandLine -like '*loop-watchdog.ps1*' })
  if ($others.Count -gt 0) {
    Write-Log ("GUARD: another loop-watchdog is already running (PID " + (($others | ForEach-Object { $_.ProcessId }) -join ", ") + "). Exiting to keep a single instance.")
    exit 0
  }
} catch {
  Write-Log ("WARN: single-instance scan failed (" + $_.Exception.Message + "); continuing without guard")
}

if (-not (Test-Path $launcher)) {
  Write-Log ("ERROR: launcher not found at " + $launcher + "; watchdog cannot heal. Exiting.")
  exit 1
}

$interval = Get-WatchdogInterval $IntervalSeconds

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
  Start-Sleep -Seconds $interval
}
Write-Log "=== loop-watchdog end ==="
