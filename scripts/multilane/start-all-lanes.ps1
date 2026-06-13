<#
.SYNOPSIS
  Launch all parallel lane loops, each in its own clone, with staggered intervals so their
  PRs do not all hit CI at the same instant. Each lane's per-lane single-instance guard means
  re-running this script is safe (already-running lanes self-exit; only missing lanes start).

.DESCRIPTION
  Pure ASCII for Windows PowerShell 5.x. Each lane is started in a NEW PowerShell window
  (Start-Process) running that lane's own loop-runner.ps1 with -Lane <name> -RepoPath <clone>.
  Logs land in <clone>\logs\loop-<lane>-<stamp>.log.

  Staggered intervals (120/135/150/165/180s) spread CI submissions; with 5 lanes x 2 CI jobs
  per PR (web-ci smoke + e2e) the peak concurrent jobs stay well under the free-plan 20-job
  cap (public repo = unlimited free minutes; concurrency is the real ceiling). See
  docs/multilane-parallel-loops-2026-06-13.md.

.PARAMETER LanesRoot
  Directory holding the per-lane clones (default: <repo-parent>\safe-ai-lanes).

.PARAMETER Model
  Model id for every lane (default claude-opus-4-8).

.PARAMETER UntilIso
  Stop time for every lane (default empty = no limit; e.g. "2026-06-14T10:00:00").

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\scripts\multilane\start-all-lanes.ps1 -UntilIso "2026-06-14T10:00:00"
#>
[CmdletBinding()]
param(
  [string]$LanesRoot = "",
  [string]$Model = "claude-opus-4-8",
  [string]$UntilIso = ""
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$repoRoot = Split-Path -Parent $repoRoot
if ($LanesRoot -eq "") { $LanesRoot = Join-Path (Split-Path -Parent $repoRoot) "safe-ai-lanes" }

# lane name -> interval seconds (staggered to spread CI submissions)
$laneIntervals = [ordered]@{
  "seo"        = 120
  "data"       = 135
  "ux-records" = 150
  "ux-tools"   = 165
  "ux-hub"     = 180
}

Write-Host ("Lanes root : " + $LanesRoot)
Write-Host ("Model      : " + $Model)
Write-Host ("UntilIso   : " + $(if ($UntilIso -ne "") { $UntilIso } else { "(none)" }))

foreach ($lane in $laneIntervals.Keys) {
  $laneDir = Join-Path $LanesRoot $lane
  $runner = Join-Path $laneDir "loop-runner.ps1"
  if (-not (Test-Path $runner)) {
    Write-Warning ("lane '" + $lane + "' not set up (missing " + $runner + "). Run setup-lanes.ps1 first. Skipping.")
    continue
  }
  $interval = $laneIntervals[$lane]
  $argList = @(
    "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $runner,
    "-Lane", $lane, "-RepoPath", $laneDir,
    "-Model", $Model, "-IntervalSeconds", $interval
  )
  if ($UntilIso -ne "") { $argList += @("-UntilIso", $UntilIso) }
  Write-Host ("start lane '" + $lane + "' (interval=" + $interval + "s) in " + $laneDir)
  Start-Process -FilePath "powershell" -ArgumentList $argList -WorkingDirectory $laneDir
  Start-Sleep -Seconds 3
}

Write-Host ""
Write-Host "All lanes launched (each in its own window). Tail a lane: Get-Content -Wait <clone>\logs\loop-<lane>-*.log"
