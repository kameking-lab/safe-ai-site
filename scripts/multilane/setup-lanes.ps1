<#
.SYNOPSIS
  One-time setup for parallel multi-lane loops: create one independent git clone per lane
  and install its dependencies. Each lane runs in its OWN clone so that `git checkout main`,
  branch creation and local builds never collide between lanes (only GitHub origin is shared).

.DESCRIPTION
  Pure ASCII for Windows PowerShell 5.x. Idempotent: skips a clone that already exists and
  only re-runs `npm ci` when node_modules is missing.

  After this completes, launch the lanes with scripts/multilane/start-all-lanes.ps1
  (or start one lane manually; see that script / docs/multilane-parallel-loops-2026-06-13.md).

.PARAMETER LanesRoot
  Directory under which each lane clone is created (default: <repo-parent>\safe-ai-lanes).

.PARAMETER RepoUrl
  Git URL to clone (default: the current repo's origin URL).

.PARAMETER Lanes
  Lane names to set up (default: the 5 standard lanes).

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\scripts\multilane\setup-lanes.ps1
#>
[CmdletBinding()]
param(
  [string]$LanesRoot = "",
  [string]$RepoUrl = "",
  [string[]]$Lanes = @("seo", "data", "ux-records", "ux-tools", "ux-hub")
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot   # scripts\multilane -> scripts
$repoRoot = Split-Path -Parent $repoRoot       # scripts -> repo root
if ($LanesRoot -eq "") { $LanesRoot = Join-Path (Split-Path -Parent $repoRoot) "safe-ai-lanes" }
if ($RepoUrl -eq "") {
  Push-Location $repoRoot
  try { $RepoUrl = (git config --get remote.origin.url).Trim() } finally { Pop-Location }
}
if (-not $RepoUrl) { Write-Error "Could not determine origin URL; pass -RepoUrl."; exit 1 }

Write-Host ("Lanes root : " + $LanesRoot)
Write-Host ("Repo URL   : " + $RepoUrl)
Write-Host ("Lanes      : " + ($Lanes -join ", "))
if (-not (Test-Path $LanesRoot)) { New-Item -ItemType Directory -Path $LanesRoot | Out-Null }

foreach ($lane in $Lanes) {
  $laneDir = Join-Path $LanesRoot $lane
  Write-Host ""
  Write-Host ("===== lane: " + $lane + " =====")
  if (-not (Test-Path $laneDir)) {
    Write-Host ("clone -> " + $laneDir)
    git clone $RepoUrl $laneDir
    if ($LASTEXITCODE -ne 0) { Write-Error ("clone failed for lane " + $lane); continue }
  } else {
    Write-Host ("clone exists, fetching latest main")
    Push-Location $laneDir
    git fetch origin --prune
    git checkout main 2>$null
    git pull --ff-only
    Pop-Location
  }
  $nodeModules = Join-Path $laneDir "web\node_modules"
  if (-not (Test-Path $nodeModules)) {
    Write-Host ("npm ci in " + (Join-Path $laneDir "web"))
    Push-Location (Join-Path $laneDir "web")
    npm ci
    Pop-Location
  } else {
    Write-Host "node_modules present, skipping npm ci"
  }
}

Write-Host ""
Write-Host "Setup done. Next: scripts/multilane/start-all-lanes.ps1 (from the primary repo) to launch all lanes."
