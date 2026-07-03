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

.PARAMETER StaleMinutes
  A lane whose "最終稼働" timestamp is older than this (default 120) is flagged as a silent per-lane
  stop in the region health line while OTHER lanes stay alive (which keep the top heartbeat fresh).
  Deliberately generous: a heavy single iteration (implement + build + lint + vitest + PR) tops out
  near 30-40 min of wall-clock and CI waits are deferred to the next iteration, so 120 gives >3x
  headroom against false alarms while cutting dead-lane detection from ~24h (next launcher pass) to
  ~2h. The alarm self-clears: the lane's next successful report rewrites its own row fresh.

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
  [int]$StaleMinutes = 120,
  [switch]$HeartbeatOnly,
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

# The enabled-lane roster from loop-config.json - the single source of truth for "which lanes SHOULD be
# reporting". Without it the health line can only see lanes that HAVE a region row, so a lane that has
# produced NO report at all (born dead right after ignition, or a broken report path) is invisible AND
# the OK banner counts only reported lanes as if they were the whole roster - falsely asserting "no
# per-lane silent stop" while a configured lane is entirely unaccounted for (the blind spot #628's
# scope note deferred). Unreadable/absent config -> empty roster -> the health line falls back to the
# legacy reported-count behavior, so a missing config never fabricates a false alarm.
function Get-EnabledLaneRoster {
  param([string]$ConfigPath)
  $roster = New-Object System.Collections.Generic.List[string]
  if (-not $ConfigPath -or -not (Test-Path $ConfigPath)) { return $roster.ToArray() }
  try {
    $raw = Get-Content -Encoding UTF8 -Path $ConfigPath -Raw
    $cfg = $raw | ConvertFrom-Json
    if ($cfg -and $cfg.lanes) {
      foreach ($l in $cfg.lanes) {
        if ($l.enabled -and $l.name) { $roster.Add([string]$l.name) }
      }
    }
  } catch {}
  return $roster.ToArray()
}

# The roster's authoritative config is the one beside the CENTRAL status file (the MAIN tree the
# launcher actually reads), NOT this reporter's own clone. The 5 non-ops lanes run in separate clones
# under ..\safe-ai-lanes\<name>, each with its OWN committed loop-config.json; every lane WRITES to the
# central status (via SAFE_AI_LOOP_STATUS) but was READING the roster from its local clone ($RepoPath),
# so the health denominator/never-reported detection depended on WHICH lane happened to report and
# could lag the owner's live edits to the main-tree config (untilIso bumps / lane toggles land in the
# main working tree, unseen by a clone until its next pull). Anchor the roster to the status file's repo
# so every lane shows the roster the launcher actually launched. StatusPath is <maintree>\docs\
# loop-status.md, so its grandparent is <maintree>. Falls back to $RepoPath's config when the anchored
# file is absent (standalone/manual runs, or an unusual status path) - preserving the safe-degradation
# contract that a missing config never fabricates a false alarm.
function Resolve-RosterConfigPath {
  param([string]$StatusPath, [string]$RepoPath)
  if ($StatusPath) {
    $docsDir = Split-Path -Parent $StatusPath
    if ($docsDir) {
      $treeRoot = Split-Path -Parent $docsDir
      if ($treeRoot) {
        $anchored = Join-Path $treeRoot "loop-config.json"
        if (Test-Path $anchored) { return $anchored }
      }
    }
  }
  return (Join-Path $RepoPath "loop-config.json")
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

# Detect lanes that went silently dead WHILE OTHER LANES STAY ALIVE. The top heartbeat ("最終更新")
# is bumped by ANY living lane every iteration, so if one lane's runner wedges/dies (not a deadline
# stop, not a config error - just one process gone) the heartbeat still reads fresh and nothing tells
# the owner WHICH lane fell silent. He would have to eyeball six "最終稼働" timestamps against "now"
# by hand. This is the per-lane residue of the same silent-death class #602/#608/#611/#616/#619 killed
# at the aggregate level. Every reporting (=alive) lane recomputes this from the region rows, so a dead
# lane is flagged within one healthy lane's interval (minutes) instead of waiting for the next launcher
# pass (up to ~24h). Pure function of (rows, now, threshold, template): the Japanese "最終稼働" literal
# lives in the template (from strings), never in this source, so the regex is built at runtime.
# Returns PSCustomObjects { Lane; LastRun; AgeMinutes } for rows older than $StaleMinutes.
function Get-StaleLanes {
  param([string[]]$Rows, [datetime]$Now, [int]$StaleMinutes, [string]$RowTemplate)
  $result = New-Object System.Collections.Generic.List[object]
  if (-not $RowTemplate -or -not $RowTemplate.Contains('{LANE}') -or -not $RowTemplate.Contains('{LASTRUN}')) {
    return $result.ToArray()
  }
  # Build a parse regex from the localized row template so the Japanese stays in strings, not source.
  # NOTE: [regex]::Escape escapes "{" (-> "\{") but NOT "}", so match "\{NAME}" (escaped open, bare close).
  $rx = [regex]::Escape($RowTemplate)
  $rx = $rx -replace '\\\{LANE}', '(?<lane>\S+)'
  $rx = $rx -replace '\\\{LASTRUN}', '(?<ts>\d{4}-\d{2}-\d{2} \d{2}:\d{2})'
  $rx = $rx -replace '\\\{PR}', '.*?'
  $rx = $rx -replace '\\\{OPEN}', '.*?'
  $rx = $rx -replace '\\\{NOTE}', '.*'
  foreach ($r in $Rows) {
    if ($null -eq $r) { continue }
    $m = [regex]::Match([string]$r, $rx)
    if (-not $m.Success) { continue }
    $ts = $null
    try { $ts = [datetime]::ParseExact($m.Groups['ts'].Value, 'yyyy-MM-dd HH:mm', $null) } catch { $ts = $null }
    if ($null -eq $ts) { continue }
    $age = ($Now - $ts).TotalMinutes
    if ($age -ge $StaleMinutes) {
      $result.Add([PSCustomObject]@{ Lane = $m.Groups['lane'].Value; LastRun = $ts; AgeMinutes = [int]$age })
    }
  }
  return $result.ToArray()
}

# Marker line (ASCII, machine-only) persisted INSIDE the region to give NEVER-reported lanes a clock.
# The health line can time a lane that once reported (its row carries a "最終稼働" timestamp Get-StaleLanes
# reads), but a lane that has produced NO parseable row has no timestamp - so #628/#631 could only ever
# flag it as a QUIET note, and a born-dead runner or a broken report path stays soft-worded ("clears in a
# few minutes") FOREVER. That is the last false-reassurance hole in watch point #1. We stamp the first
# time the fleet observes each enabled-but-unreported lane; once that stamp ages past the SAME threshold
# used for stale, the health line escalates the lane to the LOUD born-dead banner. The stamp lives in the
# region (not a side file) so it is serialized by the same status lock as every other write, rides the
# launcher's verbatim region preservation, and self-clears the instant the lane finally reports (its stamp
# is dropped). ASCII literal; full line looks like: "<!-- lane-missing-since: seo=2026-07-03T12:05:00 -->".
$missingMarkerPrefix = "<!-- lane-missing-since:"

# Enabled roster lanes with NO parseable report row (never reported this file-lifetime). Pure: reuses the
# Get-StaleLanes MinValue path (which returns every parseable reportLine row regardless of age) to get the
# reported set, then subtracts it from the roster. Empty roster -> no missing (caller falls back to legacy).
function Get-MissingLanes {
  param([string[]]$Rows, [string[]]$ExpectedLanes, [string]$RowTemplate)
  if (-not $ExpectedLanes -or $ExpectedLanes.Count -eq 0) { return @() }
  $reported = @(Get-StaleLanes -Rows $Rows -Now ([datetime]'2000-01-01') -StaleMinutes ([int]::MinValue) -RowTemplate $RowTemplate | ForEach-Object { $_.Lane })
  return @($ExpectedLanes | Where-Object { $reported -notcontains $_ })
}

# Parse the missing-since marker among region rows -> hashtable lane -> [datetime]. Garbled/absent entries
# are skipped (safe: an unparseable stamp just means that lane gets a fresh stamp this run). Pure.
function Get-MissingSinceMap {
  param([string[]]$Rows)
  $map = @{}
  if (-not $Rows) { return $map }
  foreach ($r in $Rows) {
    if ($null -eq $r) { continue }
    $t = ([string]$r).Trim()
    if (-not $t.StartsWith($missingMarkerPrefix)) { continue }
    $body = $t.Substring($missingMarkerPrefix.Length)
    $body = $body -replace '-->\s*$', ''
    foreach ($tok in ($body -split '\s+')) {
      if ($tok -eq '') { continue }
      $eq = $tok.IndexOf('=')
      if ($eq -le 0) { continue }
      $lane = $tok.Substring(0, $eq)
      $iso = $tok.Substring($eq + 1)
      $dt = $null
      try { $dt = [datetime]::ParseExact($iso, 'yyyy-MM-ddTHH:mm:ss', $null) } catch { $dt = $null }
      if ($null -ne $dt) { $map[$lane] = $dt }
    }
    break
  }
  return $map
}

# New map for this run: KEEP the prior stamp for a still-missing lane (its clock keeps running), stamp a
# newly-missing lane at $Now, and DROP any lane no longer missing (it reported, or left the roster). Pure.
function Update-MissingSinceMap {
  param([hashtable]$Old, [string[]]$MissingLanes, [datetime]$Now)
  $new = @{}
  foreach ($lane in $MissingLanes) {
    if ($Old -and $Old.ContainsKey($lane)) { $new[$lane] = $Old[$lane] }
    else { $new[$lane] = $Now }
  }
  return $new
}

# Render the marker line from a map, or $null when empty (so no marker line is written). Lanes are sorted
# for a deterministic, diff-stable line. Pure.
function Format-MissingSinceMarker {
  param([hashtable]$Map)
  if (-not $Map -or $Map.Keys.Count -eq 0) { return $null }
  $parts = @(foreach ($lane in ($Map.Keys | Sort-Object)) { "$lane=" + ($Map[$lane].ToString('yyyy-MM-ddTHH:mm:ss')) })
  return ($missingMarkerPrefix + ' ' + ($parts -join ' ') + ' -->')
}

# Build the ONE managed health-summary line placed at the top of the region, or $null when the health
# strings are absent (older strings files stay a safe no-op) or nothing can be said. Uses Get-StaleLanes
# twice: a threshold of Int.MinValue counts every parseable lane row (even this lane's just-stamped row
# whose age is momentarily ~0), and $StaleMinutes selects the silently-dead ones. $ExpectedLanes is the
# enabled roster from loop-config.json: it lets the line distinguish two failure modes and pick the
# roster (not the region) as the denominator -
#   * STALE     (loud) : a lane that WAS reporting and stopped >StaleMinutes ago (report-then-silent death).
#   * BORN-DEAD (loud) : an enabled lane with NO parseable report row whose missing-since stamp has aged
#                        past StaleMinutes (never reported for 2h+ = runner dying at ignition or a broken
#                        report path - no longer a fresh-ignition transient). $MissingSince supplies the
#                        clock these rowless lanes otherwise lack.
#   * MISSING   (note): an enabled lane with NO parseable report row, still WITHIN the grace window (or with
#                        no stamp yet). Softer wording because a fresh ignition legitimately shows this for
#                        the minutes until each lane's first report; it self-clears as they report.
# Precedence stale > born-dead > missing > ok keeps each banner single-purpose. When the roster is unknown
# (empty) the function reverts exactly to the pre-roster behavior (TOTAL = reported count, no detection).
function Get-LaneHealthLine {
  param([string[]]$Rows, [datetime]$Now, [int]$StaleMinutes, [string[]]$ExpectedLanes, [hashtable]$MissingSince)
  if (-not $LS.ContainsKey("laneHealthOk") -or -not $LS.ContainsKey("laneHealthStale")) { return $null }
  $rowTpl = S "reportLine"
  $all = @(Get-StaleLanes -Rows $Rows -Now $Now -StaleMinutes ([int]::MinValue) -RowTemplate $rowTpl)
  $reportedNames = @($all | ForEach-Object { $_.Lane })
  $missing = @()
  if ($ExpectedLanes -and $ExpectedLanes.Count -gt 0) {
    $missing = @($ExpectedLanes | Where-Object { $reportedNames -notcontains $_ })
  }
  if ($all.Count -eq 0 -and $missing.Count -eq 0) { return $null }
  $sep = S "laneHealthSep"
  $stale = @(Get-StaleLanes -Rows $Rows -Now $Now -StaleMinutes $StaleMinutes -RowTemplate $rowTpl)
  if ($stale.Count -gt 0) {
    $items = @()
    foreach ($s in $stale) {
      $hours = [math]::Round($s.AgeMinutes / 60.0, 1)
      $items += (Fmt "laneHealthItem" @{ LANE = $s.Lane; LASTRUN = $s.LastRun.ToString("yyyy-MM-dd HH:mm"); HOURS = $hours })
    }
    return (Fmt "laneHealthStale" @{ LANES = ($items -join $sep); MIN = $StaleMinutes })
  }
  # Split never-reported lanes by how long they have been missing: those stamped >= StaleMinutes ago are
  # born-dead (loud); the rest are still within the fresh-ignition grace window (quiet note). If the
  # born-dead string is absent (older strings file) treat every missing lane as quiet so it is still named
  # by the unreported banner - NEVER let a rowless lane fall through to the falsely-OK banner.
  $canBornDead = $LS.ContainsKey("laneHealthBornDead")
  $bornDead = @()
  $quietMissing = @()
  foreach ($m in $missing) {
    $since = $null
    if ($MissingSince -and $MissingSince.ContainsKey($m)) { $since = $MissingSince[$m] }
    if ($canBornDead -and $null -ne $since -and ($Now - $since).TotalMinutes -ge $StaleMinutes) { $bornDead += $m }
    else { $quietMissing += $m }
  }
  if ($bornDead.Count -gt 0 -and $LS.ContainsKey("laneHealthBornDead")) {
    return (Fmt "laneHealthBornDead" @{ LANES = ($bornDead -join $sep); MIN = $StaleMinutes })
  }
  if ($quietMissing.Count -gt 0 -and $LS.ContainsKey("laneHealthUnreported")) {
    return (Fmt "laneHealthUnreported" @{ LANES = ($quietMissing -join $sep); MISSING = $quietMissing.Count; TOTAL = $ExpectedLanes.Count })
  }
  $total = if ($ExpectedLanes -and $ExpectedLanes.Count -gt 0) { $ExpectedLanes.Count } else { $all.Count }
  return (Fmt "laneHealthOk" @{ TOTAL = $total; MIN = $StaleMinutes; NOW = $Now.ToString("yyyy-MM-dd HH:mm") })
}

# Prefix (template text before the first placeholder) used to idempotently strip a prior health line.
function Get-TplPrefix([string]$key) {
  $t = S $key
  $i = $t.IndexOf('{')
  if ($i -ge 0) { return $t.Substring(0, $i) } else { return $t }
}

# ---- Heartbeat (runner-emitted liveness) ------------------------------------------------------
# Reporting must NOT depend on the agent remembering step5.5. Observed live: seo and ux-records ran
# 30+ iterations over ~6.5h, merged PRs, yet NEVER self-reported - so the per-lane health banner
# (#628/#631/#640) kept flagging two ALIVE, working lanes as unreported/born-dead (a FALSE silent-death
# alarm, the very class those fixes exist to remove). The persistent lane RUNNER therefore emits a
# liveness heartbeat after every iteration (-HeartbeatOnly). To avoid clobbering a rich note the agent
# DID write, a heartbeat swaps ONLY the {LASTRUN} timestamp of the lane's existing row; when the lane has
# produced no row yet it writes a minimal row whose note honestly states the agent has not self-reported,
# so the operator sees "alive, but its agent is skipping the report step" - never a false silent death.

# Swap the {LASTRUN} timestamp (the first yyyy-MM-dd HH:mm, which structurally precedes the note in the
# reportLine template) in an existing row for a fresh one, leaving PR/OPEN/NOTE byte-identical. Pure.
function Set-RowTimestamp {
  param([string]$ExistingRow, [string]$FreshLastRun)
  if ($null -eq $ExistingRow) { return $ExistingRow }
  return [regex]::Replace([string]$ExistingRow, '\d{4}-\d{2}-\d{2} \d{2}:\d{2}', $FreshLastRun, 1)
}

# The row a heartbeat should upsert: refresh the lane's existing row's timestamp (note preserved), or -
# when the lane has produced no row yet - the supplied minimal placeholder row (honest no-self-report
# note). Pure function of the current region rows so -SelfTest can verify both branches offline.
function Get-HeartbeatRow {
  param([string[]]$Rows, [string]$Lane, [string]$FreshLastRun, [string]$PlaceholderRow)
  $prefix = "- " + $Lane + " :"
  if ($Rows) {
    foreach ($r in $Rows) {
      if ($null -eq $r) { continue }
      if (([string]$r).TrimStart().StartsWith($prefix)) {
        return (Set-RowTimestamp -ExistingRow ([string]$r) -FreshLastRun $FreshLastRun)
      }
    }
  }
  return $PlaceholderRow
}

# ---- MSYS/Git-Bash path-conversion repair for -Note -------------------------------------------
# Git-Bash/MSYS applies POSIX->Windows path conversion to any command-line argument that LOOKS like a
# leading-slash path BEFORE this script ever receives -Note. A lane note that mentions a site route such
# as "/stats" is silently rewritten in the SHELL layer to the Git install root + that token
# ("C:/Program Files/Git/stats"), corrupting the operator-facing status surface (observed live in the
# ux-tools row: "C:/Program Files/Git/stats ..." where the lane's note began with the route "/stats"). The
# reporter is the ONE shell-agnostic choke point every caller funnels through (agents via Bash, runner
# heartbeat/deadline via PowerShell), so repair it here instead of trying to make six free-form notes
# each remember to escape. Discover the ACTUAL MSYS root at runtime and revert only "<root><sep><rest>"
# back to "/<rest>"; a legitimate lane note never contains the literal Git install directory, and when
# no root can be resolved (not launched from Git Bash, so no mangling occurred) it is a pure no-op.
function Get-MsysRoot {
  # `cygpath -m /` is the authoritative MSYS root in mixed (forward-slash) form and resolves on PATH
  # whenever the mangling could have happened (both ship with Git for Windows). EXEPATH's PARENT is a
  # best-effort fallback (EXEPATH points at ...\Git\bin). Returns a plausible rooted path or $null.
  $root = $null
  try {
    $cp = & cygpath -m / 2>$null
    if ($LASTEXITCODE -eq 0 -and $cp) { $root = ([string]$cp).Trim() }
  } catch {}
  if ((-not $root) -and $env:EXEPATH) {
    try { $p = Split-Path -Parent ([string]$env:EXEPATH); if ($p) { $root = ($p -replace '\\', '/') } } catch {}
  }
  if ($root) { $root = $root.TrimEnd('/') }
  # Require a drive-letter-rooted path so a garbage value can never strip arbitrary text from a note.
  if ($root -and ($root -match '^[A-Za-z]:/.+')) { return $root }
  return $null
}

# Revert a shell-mangled leading-slash token: collapse "<MsysRoot><sep>" back to a single leading "/".
# Matches the root in EITHER slash form (MSYS emits '/', but guard '\' for MSYS2_ARG_CONV variants),
# anchored to the discovered root so nothing else in the note is affected. Case-insensitive (Windows
# paths). Pure; $null/empty root or note -> unchanged (so -SelfTest and non-Git-Bash callers no-op).
function Repair-MsysMangledNote {
  param([string]$Note, [string]$MsysRoot)
  if (-not $Note -or -not $MsysRoot) { return $Note }
  $slashFlexible = ([regex]::Escape($MsysRoot)) -replace '/', '[\\/]'
  return [regex]::Replace($Note, $slashFlexible + '[\\/]', '/', 'IgnoreCase')
}

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

    # D) Get-StaleLanes: parse rows built from an ASCII-only template (keeps this source ASCII while
    # exercising the same regex-build path the real Japanese template uses) and select the silent ones.
    $tpl = "- {LANE} : LR {LASTRUN} / PR {PR} / open {OPEN} / {NOTE}"
    $now = [datetime]"2026-07-03 12:00"
    $fresh = "- ops : LR 2026-07-03 11:58 / PR #1 / open 2 / ok"      # 2 min old  -> alive
    $dead  = "- data : LR 2026-07-03 08:00 / PR #2 / open 5 / ok"     # 240 min old -> stale
    $edge  = "- seo : LR 2026-07-03 10:00 / PR #3 / open 1 / ok"      # 120 min old -> stale (>=)
    $junk  = "health: not a lane row at all"
    $stale = @(Get-StaleLanes -Rows @($fresh, $dead, $edge, $junk) -Now $now -StaleMinutes 120 -RowTemplate $tpl)
    Assert-Test "stale detection flags exactly the two silent lanes" ($stale.Count -eq 2)
    Assert-Test "stale detection does NOT flag the fresh lane" (-not ($stale | Where-Object { $_.Lane -eq "ops" }))
    Assert-Test "stale detection flags the dead lane by name" ([bool]($stale | Where-Object { $_.Lane -eq "data" }))
    Assert-Test "stale age is computed in minutes" (($stale | Where-Object { $_.Lane -eq "data" }).AgeMinutes -eq 240)
    $none = @(Get-StaleLanes -Rows @($fresh) -Now $now -StaleMinutes 120 -RowTemplate $tpl)
    Assert-Test "all-fresh region yields no stale lanes" ($none.Count -eq 0)
    $allCount = @(Get-StaleLanes -Rows @($fresh, $dead, $edge, $junk) -Now $now -StaleMinutes ([int]::MinValue) -RowTemplate $tpl)
    Assert-Test "MinValue threshold counts every parseable lane row (junk excluded)" ($allCount.Count -eq 3)
    $noTpl = @(Get-StaleLanes -Rows @($dead) -Now $now -StaleMinutes 120 -RowTemplate "no placeholders here")
    Assert-Test "template without placeholders parses nothing (safe no-op)" ($noTpl.Count -eq 0)

    # E) Get-EnabledLaneRoster: only enabled+named lanes; missing file -> empty (safe fallback).
    $cfgFile = Join-Path $tmp "loop-config.json"
    Set-Content -Path $cfgFile -Encoding UTF8 -Value '{ "lanes": [ { "name": "ops", "enabled": true }, { "name": "data", "enabled": true }, { "name": "seo", "enabled": false }, { "enabled": true } ] }'
    $roster = @(Get-EnabledLaneRoster -ConfigPath $cfgFile)
    Assert-Test "roster picks exactly the enabled, named lanes" (($roster.Count -eq 2) -and ($roster -contains "ops") -and ($roster -contains "data"))
    Assert-Test "roster excludes the disabled lane" (-not ($roster -contains "seo"))
    $rosterNone = @(Get-EnabledLaneRoster -ConfigPath (Join-Path $tmp "does-not-exist.json"))
    Assert-Test "absent config yields empty roster (fallback)" ($rosterNone.Count -eq 0)

    # E2) Resolve-RosterConfigPath anchors the roster to the CENTRAL status file's tree (main tree),
    # not this clone's $RepoPath, so all lanes read one authoritative config. Simulate a non-ops lane:
    # StatusPath points at the main tree's docs\loop-status.md (which has a config beside it) while
    # RepoPath is a separate clone (which has its OWN, different config). The resolver must pick main's.
    $mainTree = Join-Path $tmp "maintree"
    $mainDocs = Join-Path $mainTree "docs"
    New-Item -ItemType Directory -Path $mainDocs -Force | Out-Null
    Set-Content -Path (Join-Path $mainTree "loop-config.json") -Encoding UTF8 -Value '{ "lanes": [ { "name": "ops", "enabled": true }, { "name": "data", "enabled": true }, { "name": "seo", "enabled": true } ] }'
    $mainStatus = Join-Path $mainDocs "loop-status.md"
    $cloneRepo = Join-Path $tmp "clone"
    New-Item -ItemType Directory -Path $cloneRepo -Force | Out-Null
    Set-Content -Path (Join-Path $cloneRepo "loop-config.json") -Encoding UTF8 -Value '{ "lanes": [ { "name": "ops", "enabled": true } ] }'
    $resolved = Resolve-RosterConfigPath -StatusPath $mainStatus -RepoPath $cloneRepo
    Assert-Test "resolver anchors config to the status file's tree, not the clone" ($resolved -eq (Join-Path $mainTree "loop-config.json"))
    $anchoredRoster = @(Get-EnabledLaneRoster -ConfigPath $resolved)
    Assert-Test "anchored roster is the main tree's 3 lanes, not the clone's 1" ($anchoredRoster.Count -eq 3)
    # Fallback: when the status-anchored config is absent, fall back to $RepoPath's own config.
    $noAnchor = Resolve-RosterConfigPath -StatusPath (Join-Path $tmp "nowhere\docs\loop-status.md") -RepoPath $cloneRepo
    Assert-Test "resolver falls back to RepoPath config when anchor is absent" ($noAnchor -eq (Join-Path $cloneRepo "loop-config.json"))
    # Blank StatusPath (standalone run before resolution) -> RepoPath config, never throws.
    $blankAnchor = Resolve-RosterConfigPath -StatusPath "" -RepoPath $cloneRepo
    Assert-Test "resolver with blank status path falls back to RepoPath config" ($blankAnchor -eq (Join-Path $cloneRepo "loop-config.json"))

    # F) Get-LaneHealthLine roster behavior. Rows are built from the REAL reportLine template (so the
    # regex-build path and the health strings are exercised end-to-end) while this source stays ASCII by
    # asserting against Fmt round-trips, never against Japanese literals.
    if ($LS.ContainsKey("laneHealthOk") -and $LS.ContainsKey("laneHealthStale") -and $LS.ContainsKey("laneHealthUnreported")) {
      $hNow = [datetime]"2026-07-03 12:00"
      $freshTs = $hNow.AddMinutes(-1).ToString("yyyy-MM-dd HH:mm")
      $staleTs = $hNow.AddMinutes(-200).ToString("yyyy-MM-dd HH:mm")
      $rOps = Fmt "reportLine" @{ LANE = "ops"; LASTRUN = $freshTs; PR = "#1"; OPEN = "2"; NOTE = "ok" }
      $rData = Fmt "reportLine" @{ LANE = "data"; LASTRUN = $freshTs; PR = "#2"; OPEN = "5"; NOTE = "ok" }
      $rDataStale = Fmt "reportLine" @{ LANE = "data"; LASTRUN = $staleTs; PR = "#2"; OPEN = "5"; NOTE = "ok" }

      # F1: seo enabled but never reported -> unreported (note) banner naming seo, NOT the OK banner.
      $f1 = Get-LaneHealthLine -Rows @($rOps, $rData) -Now $hNow -StaleMinutes 120 -ExpectedLanes @("ops", "data", "seo")
      $f1exp = Fmt "laneHealthUnreported" @{ LANES = "seo"; MISSING = 1; TOTAL = 3 }
      Assert-Test "never-reported enabled lane surfaces as the unreported banner" ($f1 -eq $f1exp)

      # F2: full roster reported & fresh -> OK banner with TOTAL = roster size (not region-row count).
      $f2 = Get-LaneHealthLine -Rows @($rOps, $rData) -Now $hNow -StaleMinutes 120 -ExpectedLanes @("ops", "data")
      $f2exp = Fmt "laneHealthOk" @{ TOTAL = 2; MIN = 120; NOW = $hNow.ToString("yyyy-MM-dd HH:mm") }
      Assert-Test "all-reported roster yields OK banner with roster-size TOTAL" ($f2 -eq $f2exp)

      # F3: a report-then-silent (stale) lane takes precedence over a never-reported lane.
      $f3 = Get-LaneHealthLine -Rows @($rOps, $rDataStale) -Now $hNow -StaleMinutes 120 -ExpectedLanes @("ops", "data", "seo")
      $f3item = Fmt "laneHealthItem" @{ LANE = "data"; LASTRUN = $staleTs; HOURS = [math]::Round(200 / 60.0, 1) }
      $f3exp = Fmt "laneHealthStale" @{ LANES = $f3item; MIN = 120 }
      Assert-Test "stale (report-then-silent) takes precedence over unreported" ($f3 -eq $f3exp)

      # F4: unknown roster (empty) reverts to legacy reported-count OK banner (no false alarm).
      $f4 = Get-LaneHealthLine -Rows @($rOps, $rData) -Now $hNow -StaleMinutes 120 -ExpectedLanes @()
      $f4exp = Fmt "laneHealthOk" @{ TOTAL = 2; MIN = 120; NOW = $hNow.ToString("yyyy-MM-dd HH:mm") }
      Assert-Test "empty roster falls back to legacy reported-count OK banner" ($f4 -eq $f4exp)

      # G: born-dead escalation for NEVER-reported lanes + missing-since map parse/update/format.
      if ($LS.ContainsKey("laneHealthBornDead")) {
        # G1: a never-reported lane still WITHIN grace (stamp 30 min old < 120) stays the quiet banner.
        $mapFresh = @{ "seo" = $hNow.AddMinutes(-30) }
        $g1 = Get-LaneHealthLine -Rows @($rOps, $rData) -Now $hNow -StaleMinutes 120 -ExpectedLanes @("ops", "data", "seo") -MissingSince $mapFresh
        Assert-Test "never-reported within grace stays the quiet unreported banner" ($g1 -eq $f1exp)

        # G2: the SAME lane past grace (stamp 200 min old >= 120) escalates to the LOUD born-dead banner.
        $mapOld = @{ "seo" = $hNow.AddMinutes(-200) }
        $g2 = Get-LaneHealthLine -Rows @($rOps, $rData) -Now $hNow -StaleMinutes 120 -ExpectedLanes @("ops", "data", "seo") -MissingSince $mapOld
        $g2exp = Fmt "laneHealthBornDead" @{ LANES = "seo"; MIN = 120 }
        Assert-Test "never-reported past grace escalates to the loud born-dead banner" ($g2 -eq $g2exp)

        # G3: a report-then-silent (stale) lane still outranks a born-dead lane.
        $g3 = Get-LaneHealthLine -Rows @($rOps, $rDataStale) -Now $hNow -StaleMinutes 120 -ExpectedLanes @("ops", "data", "seo") -MissingSince $mapOld
        Assert-Test "stale still outranks born-dead" ($g3 -eq $f3exp)

        # G4: Update keeps a prior stamp for a still-missing lane, stamps a newly-missing lane at now, and
        # drops a lane that recovered (no longer in the missing set).
        $u = Update-MissingSinceMap -Old @{ "seo" = $hNow.AddMinutes(-200); "data" = $hNow.AddMinutes(-10) } -MissingLanes @("seo", "ux-records") -Now $hNow
        Assert-Test "Update keeps the prior stamp for a still-missing lane" ($u["seo"] -eq $hNow.AddMinutes(-200))
        Assert-Test "Update stamps a newly-missing lane at now" ($u["ux-records"] -eq $hNow)
        Assert-Test "Update drops a lane that recovered (no longer missing)" (-not $u.ContainsKey("data"))

        # G5: marker format <-> parse round-trip (ASCII prefix, ISO stamps, empty map -> no line).
        $mk = Format-MissingSinceMarker -Map @{ "seo" = $hNow; "data" = $hNow.AddMinutes(-5) }
        Assert-Test "marker carries the ASCII prefix" ($mk.StartsWith($missingMarkerPrefix))
        $rt = Get-MissingSinceMap -Rows @($mk)
        Assert-Test "marker round-trips the seo stamp" ($rt["seo"] -eq $hNow)
        Assert-Test "marker round-trips the data stamp" ($rt["data"] -eq $hNow.AddMinutes(-5))
        Assert-Test "empty map renders no marker line" ($null -eq (Format-MissingSinceMarker -Map @{}))

        # G6: Get-MissingLanes = enabled roster minus lanes that have a parseable report row.
        $ml = @(Get-MissingLanes -Rows @($rOps, $rData) -ExpectedLanes @("ops", "data", "seo", "ux-records") -RowTemplate (S "reportLine"))
        Assert-Test "missing lanes = enabled roster minus reported" (($ml.Count -eq 2) -and ($ml -contains "seo") -and ($ml -contains "ux-records"))
      }
    }

    # H) Heartbeat helpers: the runner-emitted liveness upsert must preserve a rich note, swap only the
    # timestamp, and (for a never-reported lane) fall back to the honest placeholder row. Pure - no I/O.
    $hbFresh = "2026-07-03 13:20"
    $richRow = "- seo : LR 2026-07-03 08:01 / PR #666 / open 1 / merged #666; sitemap fix landed (2026-07-03)"
    $swapped = Set-RowTimestamp -ExistingRow $richRow -FreshLastRun $hbFresh
    Assert-Test "H1: heartbeat swaps ONLY the leading timestamp to the fresh one" ($swapped -eq ("- seo : LR " + $hbFresh + " / PR #666 / open 1 / merged #666; sitemap fix landed (2026-07-03)"))
    Assert-Test "H1b: a date inside the note is NOT touched (only the first timestamp)" ($swapped.EndsWith("(2026-07-03)"))
    $placeholder = "- ux-records : LR " + $hbFresh + " / PR - / open 0 / runner heartbeat: agent not self-reporting"
    $existRow = Get-HeartbeatRow -Rows @("- ops : LR 2026-07-03 13:00 / PR #1 / open 2 / ok", $richRow) -Lane "seo" -FreshLastRun $hbFresh -PlaceholderRow $placeholder
    Assert-Test "H2: existing lane row -> its own row with a fresh timestamp (note preserved)" ($existRow -eq $swapped)
    $newRow = Get-HeartbeatRow -Rows @("- ops : LR 2026-07-03 13:00 / PR #1 / open 2 / ok") -Lane "ux-records" -FreshLastRun $hbFresh -PlaceholderRow $placeholder
    Assert-Test "H3: no row for the lane -> the honest placeholder row is used" ($newRow -eq $placeholder)
    $emptyRow = Get-HeartbeatRow -Rows @() -Lane "seo" -FreshLastRun $hbFresh -PlaceholderRow $placeholder
    Assert-Test "H4: empty region -> placeholder row (no throw)" ($emptyRow -eq $placeholder)
    Assert-Test "H5: Set-RowTimestamp on a null/empty row is safe (no throw, empty result)" ((Set-RowTimestamp -ExistingRow $null -FreshLastRun $hbFresh) -eq "")

    # I) Repair-MsysMangledNote reverts Git-Bash path-conversion of a leading-slash route token, using a
    # SYNTHETIC root so the check is deterministic offline (independent of this machine's real cygpath).
    # Real lane notes never contain the install path, so unrelated text stays byte-identical.
    $synthRoot = "C:/Program Files/Git"
    Assert-Test "I1: forward-slash mangled route is reverted to /route" ((Repair-MsysMangledNote -Note "C:/Program Files/Git/stats conclusion card" -MsysRoot $synthRoot) -eq "/stats conclusion card")
    Assert-Test "I2: backslash-mangled route is reverted to /route" ((Repair-MsysMangledNote -Note "C:\Program Files\Git\stats fixed" -MsysRoot $synthRoot) -eq "/stats fixed")
    Assert-Test "I3: a mangled token mid-note is reverted too" ((Repair-MsysMangledNote -Note "shipped C:/Program Files/Git/ky/paper canvas" -MsysRoot $synthRoot) -eq "shipped /ky/paper canvas")
    Assert-Test "I4: a note WITHOUT the install path is untouched (real /route stays)" ((Repair-MsysMangledNote -Note "merged #675; /stats already clean" -MsysRoot $synthRoot) -eq "merged #675; /stats already clean")
    Assert-Test "I5: null root is a safe no-op (not launched from Git Bash)" ((Repair-MsysMangledNote -Note "C:/Program Files/Git/stats" -MsysRoot $null) -eq "C:/Program Files/Git/stats")
    Assert-Test "I6: empty note is safe (no throw)" ((Repair-MsysMangledNote -Note "" -MsysRoot $synthRoot) -eq "")
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

# Enabled roster from loop-config.json - anchored to the CENTRAL status file's tree (see
# Resolve-RosterConfigPath), NOT this reporter's clone, so every lane's health line shares one
# authoritative roster. Drives the health line's denominator and its never-reported detection. Empty
# when config is absent/unreadable, in which case the health line reverts to the legacy reported-count
# behavior (no false alarm).
$configPath = Resolve-RosterConfigPath -StatusPath $StatusPath -RepoPath $RepoPath
$ExpectedLanes = Get-EnabledLaneRoster -ConfigPath $configPath
if ($ExpectedLanes.Count -gt 0) { Write-Rep ("enabled lane roster (" + $ExpectedLanes.Count + "): " + ($ExpectedLanes -join ", ")) }

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

# Undo any Git-Bash/MSYS path-conversion mangling the shell applied to a leading-slash route token in
# the note before it reached this script (see Repair-MsysMangledNote). No-op when not launched from Git
# Bash (no root resolves) or when the note contains no install-path token, so it can never corrupt a
# clean note. Applied before the WhatIf preview so the dry run shows the same repaired text as a real write.
$Note = Repair-MsysMangledNote -Note $Note -MsysRoot (Get-MsysRoot)

$noteText = $Note.Trim()
if ($noteText -eq "") {
  if ($HeartbeatOnly) {
    # Placeholder note for a lane that has produced NO row yet: honestly says the agent is not
    # self-reporting (ASCII fallback when the strings file lacks the key). Only used when creating a
    # fresh row; an existing row's own note is preserved verbatim by Get-HeartbeatRow.
    $hb = S "reportRunnerHeartbeat"
    if ($hb -eq "reportRunnerHeartbeat") { $hb = "runner heartbeat: lane alive, but its agent has not run the step5.5 self-report" }
    $noteText = $hb
  } else {
    $noteText = S "reportEmptyNote"
  }
}
$laneLine = Fmt "reportLine" @{ LANE = $Lane; LASTRUN = $lastRun; PR = $pr; OPEN = $open; NOTE = $noteText }

Write-Rep ("computed row: " + $laneLine)

if ($WhatIf) {
  Write-Rep "[WHATIF] no file written, no lock taken."
  # Heartbeat: preview the row we WOULD upsert (existing row's timestamp swapped, or the placeholder
  # row when the lane has no row yet) so the health preview below reflects heartbeat semantics.
  if ($HeartbeatOnly -and (Test-Path $StatusPath)) {
    try {
      $hbPrev = @(Get-Content -Encoding UTF8 -Path $StatusPath)
      $hbB = -1; $hbE = -1
      for ($k = 0; $k -lt $hbPrev.Count; $k++) {
        if ($hbPrev[$k].Trim() -eq $beginMarker) { $hbB = $k } elseif ($hbPrev[$k].Trim() -eq $endMarker) { $hbE = $k; break }
      }
      $hbRows = @(); if ($hbB -ge 0 -and $hbE -gt $hbB) { for ($k = $hbB + 1; $k -lt $hbE; $k++) { $hbRows += $hbPrev[$k] } }
      $laneLine = Get-HeartbeatRow -Rows $hbRows -Lane $Lane -FreshLastRun $lastRun -PlaceholderRow $laneLine
    } catch {}
    Write-Rep ("[WHATIF][HEARTBEAT] would upsert row: " + $laneLine)
  }
  Write-Rep ("[WHATIF] would also refresh the top heartbeat line to: " + (Fmt "updated" @{ NOW = $lastRun }))
  # Read-only preview of the per-lane health line: take existing region rows + this lane's fresh row,
  # strip any prior health line, and show what would be computed (no file is touched, no lock taken).
  if ($LS.ContainsKey("laneHealthOk") -and $LS.ContainsKey("laneHealthStale") -and (Test-Path $StatusPath)) {
    try {
      $prev = @(Get-Content -Encoding UTF8 -Path $StatusPath)
      $okPre = Get-TplPrefix "laneHealthOk"; $stalePre = Get-TplPrefix "laneHealthStale"; $unrepPre = Get-TplPrefix "laneHealthUnreported"; $bdPre = Get-TplPrefix "laneHealthBornDead"
      $rows = New-Object System.Collections.Generic.List[string]
      $markerRows = New-Object System.Collections.Generic.List[string]
      $bI = -1; $eI = -1
      for ($k = 0; $k -lt $prev.Count; $k++) {
        if ($prev[$k].Trim() -eq $beginMarker) { $bI = $k } elseif ($prev[$k].Trim() -eq $endMarker) { $eI = $k; break }
      }
      $selfPrefix = "- " + $Lane + " :"; $sawSelf = $false
      if ($bI -ge 0 -and $eI -gt $bI) {
        for ($k = $bI + 1; $k -lt $eI; $k++) {
          $t = $prev[$k].TrimStart()
          if ($t.StartsWith($missingMarkerPrefix)) { $markerRows.Add($prev[$k]); continue }
          if (($okPre.Trim() -ne "" -and $t.StartsWith($okPre)) -or ($stalePre.Trim() -ne "" -and $t.StartsWith($stalePre)) -or ($unrepPre.Trim() -ne "" -and $t.StartsWith($unrepPre)) -or ($bdPre.Trim() -ne "" -and $t.StartsWith($bdPre))) { continue }
          if ($t.StartsWith($selfPrefix)) { $rows.Add($laneLine); $sawSelf = $true } else { $rows.Add($prev[$k]) }
        }
      }
      if (-not $sawSelf) { $rows.Add($laneLine) }
      $rowTpl = S "reportLine"; $nowH = Get-Date
      $missingLanes = @(Get-MissingLanes -Rows $rows.ToArray() -ExpectedLanes $ExpectedLanes -RowTemplate $rowTpl)
      $newMap = Update-MissingSinceMap -Old (Get-MissingSinceMap -Rows $markerRows.ToArray()) -MissingLanes $missingLanes -Now $nowH
      $hl = Get-LaneHealthLine -Rows $rows.ToArray() -Now $nowH -StaleMinutes $StaleMinutes -ExpectedLanes $ExpectedLanes -MissingSince $newMap
      if ($hl) { Write-Rep ("[WHATIF] would set the region health line to: " + $hl) }
      else { Write-Rep "[WHATIF] no health line would be written (no parseable lane rows)." }
      $mk = Format-MissingSinceMarker -Map $newMap
      if ($mk) { Write-Rep ("[WHATIF] would set the missing-since marker to: " + $mk) }
      else { Write-Rep "[WHATIF] no missing-since marker would be written (all enabled lanes reporting)." }
    } catch { Write-Rep ("[WHATIF] health preview skipped: " + $_.Exception.Message) }
  }
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

  # Heartbeat mode: refresh only this lane's timestamp (note preserved), or create the honest
  # placeholder row when the lane has no row yet. Derived from the CURRENT region rows under the lock.
  if ($HeartbeatOnly) {
    $regionRows = @()
    if ($beginIdx -ge 0 -and $endIdx -gt $beginIdx) {
      for ($k = $beginIdx + 1; $k -lt $endIdx; $k++) { $regionRows += $lines[$k] }
    }
    $laneLine = Get-HeartbeatRow -Rows $regionRows -Lane $Lane -FreshLastRun $lastRun -PlaceholderRow $laneLine
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

  # Per-lane liveness: recompute the ONE managed health line at the top of the region from the current
  # lane rows, so a lane that fell silent WHILE OTHERS RUN (the top heartbeat stays fresh because living
  # lanes bump it) is flagged the moment any healthy lane next reports - not hours later at the launcher
  # pass. Idempotent: strip any prior health line (matched by either template's pre-placeholder prefix)
  # then reinsert the fresh one right after BEGIN. No-op when health strings are absent (older files).
  if ($LS.ContainsKey("laneHealthOk") -and $LS.ContainsKey("laneHealthStale")) {
    $bIdx = -1; $eIdx = -1
    for ($k = 0; $k -lt $lines.Count; $k++) {
      if ($lines[$k].Trim() -eq $beginMarker) { $bIdx = $k }
      elseif ($lines[$k].Trim() -eq $endMarker) { $eIdx = $k; break }
    }
    if ($bIdx -ge 0 -and $eIdx -gt $bIdx) {
      $okPre = Get-TplPrefix "laneHealthOk"
      $stalePre = Get-TplPrefix "laneHealthStale"
      $unrepPre = Get-TplPrefix "laneHealthUnreported"
      $bdPre = Get-TplPrefix "laneHealthBornDead"
      # Peel the region into: the persisted missing-since marker (captured, to keep prior clocks running)
      # and the real lane rows (health + marker lines stripped so they never accumulate).
      $markerRows = New-Object System.Collections.Generic.List[string]
      $inner = New-Object System.Collections.Generic.List[string]
      for ($k = $bIdx + 1; $k -lt $eIdx; $k++) {
        $t = $lines[$k].TrimStart()
        if ($t.StartsWith($missingMarkerPrefix)) { $markerRows.Add($lines[$k]); continue }
        if (($okPre.Trim() -ne "" -and $t.StartsWith($okPre)) -or ($stalePre.Trim() -ne "" -and $t.StartsWith($stalePre)) -or ($unrepPre.Trim() -ne "" -and $t.StartsWith($unrepPre)) -or ($bdPre.Trim() -ne "" -and $t.StartsWith($bdPre))) { continue }
        $inner.Add($lines[$k])
      }
      $rowTpl = S "reportLine"; $nowH = Get-Date
      $missingLanes = @(Get-MissingLanes -Rows $inner.ToArray() -ExpectedLanes $ExpectedLanes -RowTemplate $rowTpl)
      $newMap = Update-MissingSinceMap -Old (Get-MissingSinceMap -Rows $markerRows.ToArray()) -MissingLanes $missingLanes -Now $nowH
      $healthLine = Get-LaneHealthLine -Rows $inner.ToArray() -Now $nowH -StaleMinutes $StaleMinutes -ExpectedLanes $ExpectedLanes -MissingSince $newMap
      $markerLine = Format-MissingSinceMarker -Map $newMap
      $rebuilt = New-Object System.Collections.Generic.List[string]
      for ($k = 0; $k -le $bIdx; $k++) { $rebuilt.Add($lines[$k]) }
      if ($healthLine) { $rebuilt.Add($healthLine) }
      if ($markerLine) { $rebuilt.Add($markerLine) }
      foreach ($l in $inner) { $rebuilt.Add($l) }
      for ($k = $eIdx; $k -lt $lines.Count; $k++) { $rebuilt.Add($lines[$k]) }
      $lines = $rebuilt.ToArray()
    }
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
