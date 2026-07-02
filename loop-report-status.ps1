<#
.SYNOPSIS
  Per-lane self-report writer for docs/loop-status.md (diagnosis 08 section D:
  "report unification"). Each lane calls this at the END of every iteration to stamp its own
  row - last active time, latest merged PR, remaining open task count, and a one-line judgment -
  into the SINGLE status file the owner watches.

.DESCRIPTION
  loop-launcher.ps1 owns the top of docs/loop-status.md (deadline banner, scheduler health, the
  per-lane ignition rows) and rewrites it on every logon / daily 07:00 / ignition. This script
  owns ONE delimited region inside that same file:

      <!-- LANE-REPORT:BEGIN (managed by loop-report-status.ps1) -->
      - ops : ... one line per lane ...
      <!-- LANE-REPORT:END -->

  The launcher PRESERVES this region verbatim when it rewrites the file (see loop-launcher.ps1
  Get-PreservedLaneReport), so a live lane row survives a launcher pass. This script only ever
  touches its OWN lane's line inside the region (surgical upsert keyed by "- <lane> :"), so six
  lanes writing near-simultaneously never clobber each other - a lightweight lock file serializes
  the read-modify-write.

  CENTRAL FILE LOCATION (why lanes in separate clones still write ONE file):
  content lanes run in their own clone under ..\safe-ai-lanes\<name>, whose local
  docs/loop-status.md is a DIFFERENT file from the main repo's. loop-launcher.ps1 exports the
  absolute path of the main repo's status file as the environment variable SAFE_AI_LOOP_STATUS
  before igniting each lane runner, so the child claude inherits it and this script routes there.
  Resolution order: -StatusPath > $env:SAFE_AI_LOOP_STATUS > <RepoPath>\docs\loop-status.md
  (the last is correct for the ops lane, which runs in the main repo itself).

  NON-FATAL BY DESIGN: reporting must never break a lane iteration. Any failure (missing git,
  lock contention, unwritable path) logs a warning and exits 0.

  Pure ASCII source (Windows PowerShell 5.x mis-decodes BOM-less UTF-8 with Japanese as
  Shift-JIS and breaks parsing). Japanese labels are read at runtime from loop-status-strings.txt,
  exactly like loop-launcher.ps1. The Japanese -Note is runtime DATA, written UTF-8, never parsed
  as source.

.PARAMETER Lane
  Lane name whose row to upsert (ops / data / seo / ux-tools / ux-records / ux-hub).

.PARAMETER Note
  One-line judgment for this iteration (Japanese OK). Optional.

.PARAMETER StatusPath
  Explicit central status file. Overrides env and the RepoPath default.

.PARAMETER RepoPath
  Repo whose BACKLOG-<lane>.md and git log are read (default: this script's directory).

.PARAMETER StringsPath
  loop-status-strings.txt (default: next to this script).

.PARAMETER WhatIf
  Dry run: compute and print the line that WOULD be written and the resolved target path; touch
  no file and take no lock. Used for stub verification.

.PARAMETER SelfTest
  Offline self-check of the status-lock acquisition (stale-orphan reclamation + fresh-lock respect).
  Uses only temp files - no Claude, no real status file, no network. Exits 0 on PASS, 1 on FAIL.
  -Lane is ignored in this mode (pass any placeholder to avoid an interactive prompt).

.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File .\loop-report-status.ps1 -Lane ops -Note "報告一元化を実装"

.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File .\loop-report-status.ps1 -Lane data -WhatIf

.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File .\loop-report-status.ps1 -Lane selftest -SelfTest
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$Lane,
  [string]$Note = "",
  [string]$StatusPath = "",
  [string]$RepoPath = "",
  [string]$StringsPath = "",
  [switch]$WhatIf,
  [switch]$SelfTest
)

$ErrorActionPreference = "Continue"
$OutputEncoding = New-Object System.Text.UTF8Encoding $false
try { [Console]::OutputEncoding = New-Object System.Text.UTF8Encoding $false } catch {}

$scriptRoot = $PSScriptRoot
if (-not $scriptRoot -or $scriptRoot -eq "") { $scriptRoot = (Get-Location).Path }
if ($RepoPath -eq "") { $RepoPath = $scriptRoot }
if ($StringsPath -eq "") { $StringsPath = Join-Path $scriptRoot "loop-status-strings.txt" }

function Write-Rep([string]$msg) {
  Write-Host ("[loop-report-status][" + $Lane + "] " + $msg)
}

# ---- Japanese label strings (same external-file convention as loop-launcher.ps1) -------------
$LS = @{}
if (Test-Path $StringsPath) {
  foreach ($ln in (Get-Content -Encoding UTF8 -Path $StringsPath)) {
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

# Acquire an exclusive lock on the status file (CreateNew = atomic "only if absent"), reclaiming a
# STALE orphan. If a prior holder is killed (Ctrl-C, sleep, crash) between CreateNew and Remove-Item,
# the .lock file survives forever and every future report/banner write then fails to acquire it -
# freezing the liveness heartbeat and manufacturing a false "loop is dead" alarm (watch point #1).
# Worst-case legitimate hold is a few hundred ms even with all six lanes serialized, so a lock older
# than $StaleSeconds cannot be a live holder: reclaim it once and retry immediately. Returns $true if
# the lock is held (caller MUST Remove-Item the lockPath when done), $false after exhausting retries.
function Get-StatusLock([string]$lockPath, [int]$StaleSeconds = 60, [int]$Tries = 25, [int]$DelayMs = 200) {
  for ($try = 0; $try -lt $Tries; $try++) {
    try {
      $fs = [System.IO.File]::Open($lockPath, [System.IO.FileMode]::CreateNew, [System.IO.FileAccess]::Write, [System.IO.FileShare]::None)
      $fs.Close()
      return $true
    } catch {
      $reclaimed = $false
      try {
        $li = Get-Item -LiteralPath $lockPath -ErrorAction SilentlyContinue
        if ($li -and (((Get-Date) - $li.LastWriteTime).TotalSeconds -gt $StaleSeconds)) {
          Remove-Item -LiteralPath $lockPath -Force -ErrorAction SilentlyContinue
          Write-Rep ("reclaimed stale status lock (age > " + $StaleSeconds + "s; prior holder likely killed mid-write).")
          $reclaimed = $true
        }
      } catch {}
      # After reclaiming, retry CreateNew at once (no sleep) - whoever wins CreateNew holds it; a rare
      # double-reclaim race just means last-writer-wins on content, which the lock already tolerates.
      if (-not $reclaimed) { Start-Sleep -Milliseconds $DelayMs }
    }
  }
  return $false
}

# Region markers are ASCII literals (NOT localized) so parsing stays stable across encodings.
$beginMarker = "<!-- LANE-REPORT:BEGIN (managed by loop-report-status.ps1) -->"
$endMarker = "<!-- LANE-REPORT:END -->"

# ---- Self-test: offline verification of the lock's stale-orphan reclamation -------------------
if ($SelfTest) {
  $fails = 0
  $tmp = Join-Path ([System.IO.Path]::GetTempPath()) ("loop-report-selftest-" + [System.Guid]::NewGuid().ToString("N"))
  New-Item -ItemType Directory -Path $tmp -Force | Out-Null
  $lp = Join-Path $tmp "status.md.lock"
  function Assert-Test([string]$name, [bool]$cond) {
    if ($cond) { Write-Rep ("[SELFTEST] PASS: " + $name) }
    else { Write-Rep ("[SELFTEST] FAIL: " + $name); $script:fails++ }
  }
  try {
    # A) Clean acquire when no lock exists -> true, and the lock file is left behind for the holder.
    $a = Get-StatusLock $lp 60 5 50
    Assert-Test "clean acquire returns true" ($a -eq $true)
    Assert-Test "clean acquire leaves lock file" (Test-Path -LiteralPath $lp)
    if (Test-Path -LiteralPath $lp) { Remove-Item -LiteralPath $lp -Force }

    # B) A FRESH foreign lock (age 0) must be respected, not reclaimed -> false after a few tries.
    $fs = [System.IO.File]::Open($lp, [System.IO.FileMode]::CreateNew, [System.IO.FileAccess]::Write, [System.IO.FileShare]::None); $fs.Close()
    $b = Get-StatusLock $lp 60 3 30
    Assert-Test "fresh foreign lock is NOT reclaimed" ($b -eq $false)
    Assert-Test "fresh foreign lock still present" (Test-Path -LiteralPath $lp)

    # C) A STALE orphan (backdated well past the threshold) is reclaimed and acquired -> true.
    (Get-Item -LiteralPath $lp).LastWriteTime = (Get-Date).AddSeconds(-120)
    $c = Get-StatusLock $lp 60 5 50
    Assert-Test "stale orphan lock is reclaimed and acquired" ($c -eq $true)
    if (Test-Path -LiteralPath $lp) { Remove-Item -LiteralPath $lp -Force }
  } finally {
    try { Remove-Item -LiteralPath $tmp -Recurse -Force -ErrorAction SilentlyContinue } catch {}
  }
  if ($fails -eq 0) { Write-Rep "[SELFTEST] ALL PASS"; exit 0 }
  Write-Rep ("[SELFTEST] " + $fails + " FAILURE(S)"); exit 1
}

# ---- Resolve the central status file ---------------------------------------------------------
if ($StatusPath -eq "") {
  if ([string]$env:SAFE_AI_LOOP_STATUS -ne "") { $StatusPath = [string]$env:SAFE_AI_LOOP_STATUS }
  else { $StatusPath = Join-Path $RepoPath "docs\loop-status.md" }
}
# Normalize to a rooted, backslash path so Split-Path -Parent is correct even if a relative or
# forward-slash path was passed (the launcher always passes an absolute path; this guards manual use).
try {
  if (-not [System.IO.Path]::IsPathRooted($StatusPath)) { $StatusPath = Join-Path (Get-Location).Path $StatusPath }
  $StatusPath = [System.IO.Path]::GetFullPath($StatusPath)
} catch {}
Write-Rep ("target status file = " + $StatusPath)

# ---- Compute this lane's facts ---------------------------------------------------------------
$lastRun = (Get-Date -Format "yyyy-MM-dd HH:mm")

# Remaining open tasks = unchecked checkboxes in BACKLOG-<lane>.md.
$open = "?"
$backlog = Join-Path $RepoPath ("BACKLOG-" + $Lane + ".md")
if (Test-Path $backlog) {
  try { $open = [string]@(Select-String -Path $backlog -Pattern '^- \[ \]').Count } catch { $open = "?" }
}

# Latest merged PR: newest "(#NNN)" on origin/main, preferring a commit scoped to this lane
# (e.g. "fix(ops): ... (#583)"); fall back to the newest merged PR overall, else "-".
$pr = "-"
try {
  $refCandidates = @("origin/main", "main", "HEAD")
  $logLines = $null
  foreach ($ref in $refCandidates) {
    $out = & git -C $RepoPath log --oneline -50 $ref 2>$null
    if ($LASTEXITCODE -eq 0 -and $out) { $logLines = @($out); break }
  }
  if ($logLines) {
    $laneEsc = [regex]::Escape($Lane)
    foreach ($l in $logLines) {
      if (($l -match ('\(' + $laneEsc + '\)')) -and ($l -match '\(#(\d+)\)')) { $pr = "#" + $Matches[1]; break }
    }
    if ($pr -eq "-") {
      foreach ($l in $logLines) {
        if ($l -match '\(#(\d+)\)') { $pr = "#" + $Matches[1]; break }
      }
    }
  }
} catch { $pr = "-" }

$noteText = $Note.Trim()
if ($noteText -eq "") { $noteText = S "reportEmptyNote" }
$laneLine = Fmt "reportLine" @{ LANE = $Lane; LASTRUN = $lastRun; PR = $pr; OPEN = $open; NOTE = $noteText }

Write-Rep ("computed row: " + $laneLine)

if ($WhatIf) {
  Write-Rep "[WHATIF] no file written, no lock taken."
  Write-Rep ("[WHATIF] would also refresh the top heartbeat line to: " + (Fmt "updated" @{ NOW = $lastRun }))
  exit 0
}

# ---- Serialize the read-modify-write with a lock file (reporter-vs-reporter safety) -----------
$lockPath = $StatusPath + ".lock"
$haveLock = Get-StatusLock $lockPath 60 25 200
if (-not $haveLock) {
  Write-Rep "WARN: could not acquire status lock after retries; skipping report (non-fatal)."
  exit 0
}

try {
  $statusDir = Split-Path -Parent $StatusPath
  if ($statusDir -and -not (Test-Path $statusDir)) { New-Item -ItemType Directory -Path $statusDir | Out-Null }

  $lines = @()
  if (Test-Path $StatusPath) {
    try { $lines = @(Get-Content -Encoding UTF8 -Path $StatusPath) } catch { $lines = @() }
  }

  $beginIdx = -1; $endIdx = -1
  for ($k = 0; $k -lt $lines.Count; $k++) {
    if ($lines[$k].Trim() -eq $beginMarker) { $beginIdx = $k }
    elseif ($lines[$k].Trim() -eq $endMarker) { $endIdx = $k; break }
  }

  $rowPrefix = "- " + $Lane + " :"
  if ($beginIdx -ge 0 -and $endIdx -gt $beginIdx) {
    # Region exists: replace this lane's row in place, or insert just before END if absent.
    $replaced = $false
    $newLines = New-Object System.Collections.Generic.List[string]
    for ($k = 0; $k -lt $lines.Count; $k++) {
      if ($k -gt $beginIdx -and $k -lt $endIdx -and $lines[$k].TrimStart().StartsWith($rowPrefix)) {
        $newLines.Add($laneLine); $replaced = $true
      } elseif ($k -eq $endIdx -and -not $replaced) {
        $newLines.Add($laneLine); $newLines.Add($lines[$k])
      } else {
        $newLines.Add($lines[$k])
      }
    }
    $lines = $newLines.ToArray()
  } else {
    # No region yet (file absent, or written by a pre-S13a launcher). Append a fresh region.
    $newLines = New-Object System.Collections.Generic.List[string]
    foreach ($l in $lines) { $newLines.Add($l) }
    if ($lines.Count -gt 0) { $newLines.Add("") }
    $newLines.Add((S "reportHeader"))
    $newLines.Add("")
    $newLines.Add($beginMarker)
    $newLines.Add($laneLine)
    $newLines.Add($endMarker)
    $lines = $newLines.ToArray()
  }

  # Keep the top "last updated" line an HONEST heartbeat. The launcher stamps it ONLY on its
  # (logon / daily-07:00) passes, but lanes touch this file every iteration - so between launcher
  # passes (potentially all day) it stays frozen even while lanes run, and the owner cannot tell
  # "alive" from "silently dead" (watch point #1: does the loop live?). Bump it to now on every
  # write so it reads "at least one lane was alive as of X"; the per-lane rows still show WHICH.
  # Refresh in place only (never create it) - the launcher owns emitting the line. Match by the
  # label prefix (text before {NOW}); if strings are missing the prefix is a non-Japanese key that
  # matches nothing, so this is a safe no-op.
  $updatedTpl = S "updated"
  $ph = $updatedTpl.IndexOf('{NOW}')
  $updPrefix = if ($ph -ge 0) { $updatedTpl.Substring(0, $ph) } else { $updatedTpl }
  if ($updPrefix.Trim() -ne "") {
    $freshUpdated = Fmt "updated" @{ NOW = (Get-Date -Format "yyyy-MM-dd HH:mm:ss") }
    for ($k = 0; $k -lt $lines.Count; $k++) {
      if ($lines[$k].TrimStart().StartsWith($updPrefix)) { $lines[$k] = $freshUpdated; break }
    }
  }

  $text = ($lines -join "`r`n") + "`r`n"
  Set-Content -Path $StatusPath -Value $text -Encoding UTF8
  Write-Rep ("row written to " + $StatusPath)
} catch {
  Write-Rep ("WARN: report write failed (non-fatal): " + $_.Exception.Message)
} finally {
  try { Remove-Item -Path $lockPath -Force -ErrorAction SilentlyContinue } catch {}
}

exit 0
