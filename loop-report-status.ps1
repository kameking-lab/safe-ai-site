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
  [int]$WedgeMinutes = 240,
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
#   * STALE     (loud) : a lane that WAS reporting and stopped >StaleMinutes ago (report-then-silent death)
#                        WHOSE RUNNER PROCESS IS NOT alive. A stale lane whose runner IS alive ($AliveLanes)
#                        is demoted to ALIVE-NO-REPORT (it reported then its agent went quiet, not a crash).
#   * BORN-DEAD (loud) : an enabled lane with NO parseable report row whose missing-since stamp has aged
#                        past StaleMinutes (never reported for 2h+ = runner dying at ignition or a broken
#                        report path - no longer a fresh-ignition transient). $MissingSince supplies the
#                        clock these rowless lanes otherwise lack.
#   * MISSING   (note): an enabled lane with NO parseable report row, still WITHIN the grace window (or with
#                        no stamp yet). Softer wording because a fresh ignition legitimately shows this for
#                        the minutes until each lane's first report; it self-clears as they report.
#   * ALIVE-NO-REPORT (note): an enabled lane WHOSE RUNNER PROCESS IS ALIVE ($AliveLanes, ground truth from
#                        Get-AliveRunnerLanes) but is not self-reporting - EITHER never reported OR reported
#                        then went silent (demoted from STALE). It is provably NOT dead, so it must NEVER
#                        escalate to a loud stopped/born-dead banner regardless of stamp age - it is simply
#                        alive and not self-reporting (old runner / agent skipping step5.5). This is the
#                        process-liveness tie-breaker that stops BOTH the born-dead and the stale FALSE alarm.
# Precedence stale > born-dead > alive-no-report > missing > ok keeps each banner single-purpose. When the
# roster is unknown (empty) the function reverts exactly to the pre-roster behavior (TOTAL = reported count,
# no detection). $AliveLanes defaults to empty, so callers that cannot scan processes (or older self-tests)
# get exactly the prior behavior.
function Get-LaneHealthLine {
  param([string[]]$Rows, [datetime]$Now, [int]$StaleMinutes, [string[]]$ExpectedLanes, [hashtable]$MissingSince, [string[]]$AliveLanes = @(), [int]$WedgeMinutes = 240, [double]$WatchdogUpMinutes = -1)
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
  $canBornDead = $LS.ContainsKey("laneHealthBornDead")
  $canAliveNoReport = $LS.ContainsKey("laneHealthAliveNoReport")
  # STALE lanes reported once then fell silent past $StaleMinutes. A stale lane whose RUNNER PROCESS is alive
  # ($AliveLanes, ground truth from Get-AliveRunnerLanes) is provably NOT crashed - it reported earlier then
  # its agent went quiet (old runner without heartbeat / agent skipping step5.5), the report-then-silent twin
  # of the never-reported alive case (#696). Demote it out of the loud "stopped" banner into the calm alive-
  # no-report note so a working lane is never falsely mourned. Guard on $canAliveNoReport: with older strings
  # that lack the calm banner, keep every stale lane LOUD (never fall through to a falsely-OK banner). Stale
  # lanes with no live runner always keep the loud alarm.
  $stale = @(Get-StaleLanes -Rows $Rows -Now $Now -StaleMinutes $StaleMinutes -RowTemplate $rowTpl)
  $staleDead = @()
  $staleAlive = @()
  # $anrAge maps each alive-no-report lane -> minutes it has been alive-but-silent. It feeds the wedge
  # escalation below: a stale-alive lane's age is its own report age; a never-reported-alive lane's age is
  # supplied from $MissingSince (0 when no stamp is known, so a clockless lane never trips the loud alarm).
  $anrAge = @{}
  foreach ($s in $stale) {
    if ($canAliveNoReport -and ($AliveLanes -contains $s.Lane)) { $staleAlive += $s.Lane; $anrAge[$s.Lane] = [double]$s.AgeMinutes } else { $staleDead += $s }
  }
  if ($staleDead.Count -gt 0) {
    $items = @()
    foreach ($s in $staleDead) {
      $hours = [math]::Round($s.AgeMinutes / 60.0, 1)
      $items += (Fmt "laneHealthItem" @{ LANE = $s.Lane; LASTRUN = $s.LastRun.ToString("yyyy-MM-dd HH:mm"); HOURS = $hours })
    }
    return (Fmt "laneHealthStale" @{ LANES = ($items -join $sep); MIN = $StaleMinutes })
  }
  # Split never-reported lanes three ways. A lane whose RUNNER PROCESS is alive ($AliveLanes) is provably
  # NOT dead, so it goes to alive-no-report (calm note) regardless of stamp age - this is the ground-truth
  # tie-breaker that prevents the born-dead FALSE alarm. Of the rest, lanes stamped >= StaleMinutes ago are
  # born-dead (loud); those still within the fresh-ignition grace window are quiet. Fallbacks that NEVER let
  # a rowless lane reach the falsely-OK banner: if the born-dead string is absent, its lanes fold into quiet;
  # if the alive-no-report string is absent, alive lanes fold into quiet (still named, never dropped).
  # $staleAlive (reported-then-silent but process-alive) seeds the same calm bucket as never-reported-alive.
  $bornDead = @()
  $aliveNoReport = @($staleAlive)
  $quietMissing = @()
  foreach ($m in $missing) {
    if ($canAliveNoReport -and ($AliveLanes -contains $m)) {
      $aliveNoReport += $m
      $ageM = 0.0
      if ($MissingSince -and $MissingSince.ContainsKey($m)) { $ageM = ($Now - $MissingSince[$m]).TotalMinutes }
      $anrAge[$m] = $ageM
      continue
    }
    $since = $null
    if ($MissingSince -and $MissingSince.ContainsKey($m)) { $since = $MissingSince[$m] }
    # A lane confirmed alive is never born-dead even without the alive-no-report string: fold it to quiet.
    if ($AliveLanes -contains $m) { $quietMissing += $m; continue }
    if ($canBornDead -and $null -ne $since -and ($Now - $since).TotalMinutes -ge $StaleMinutes) { $bornDead += $m }
    else { $quietMissing += $m }
  }
  if ($bornDead.Count -gt 0 -and $LS.ContainsKey("laneHealthBornDead")) {
    return (Fmt "laneHealthBornDead" @{ LANES = ($bornDead -join $sep); MIN = $StaleMinutes })
  }
  if ($aliveNoReport.Count -gt 0 -and $canAliveNoReport) {
    # WEDGE escalation: alive-no-report is normally CALM because a below-floor runner is expected to be
    # silent only until the cooperative drain (#727) cycles it to fresh code - which takes minutes once the
    # heal watchdog is resident. But the runner's claude call has NO timeout (loop-runner.ps1), so a hung
    # claude keeps a child alive forever -> the drain (which only cycles IDLE runners) defers it forever ->
    # it stays below-floor-silent PERMANENTLY, yet the calm banner reads "auto-resolves". Escalate to a LOUD
    # "wedge suspected" banner ONLY when BOTH gates hold: (a) the lane has been alive-but-silent >= WedgeMinutes
    # (a generous multiple of StaleMinutes) AND (b) the heal watchdog (the drain engine) has itself been up
    # >= WedgeMinutes. Gate (b) prevents a FALSE alarm right after the watchdog starts, when a lane's silence
    # clock predates the drain ever getting a chance (the live 06:38 runners vs an 18:09 watchdog). Unknown
    # watchdog uptime (-1, no scan / no watchdog) never escalates: no drain engine means this is a cold state,
    # the logon launcher's job, not a wedge. Absent the string, fall through to the calm banner (never silent).
    $canStalled = $LS.ContainsKey("laneHealthAliveNoReportStalled")
    if ($canStalled -and $WatchdogUpMinutes -ge $WedgeMinutes) {
      $stalled = @($aliveNoReport | Where-Object { $anrAge.ContainsKey($_) -and $anrAge[$_] -ge $WedgeMinutes })
      if ($stalled.Count -gt 0) {
        return (Fmt "laneHealthAliveNoReportStalled" @{ LANES = ($stalled -join $sep); MIN = $WedgeMinutes })
      }
    }
    # TOTAL is the denominator on the owner's watch line ("N/TOTAL running-but-silent"). This branch is the
    # ONLY one reachable with an EMPTY roster: $missing needs a roster, but $staleAlive is derived from rows
    # alone, so a config that is momentarily unreadable in a clone (mid git-checkout) while a lane is stale-
    # but-alive falls here with $ExpectedLanes.Count = 0 and would print a nonsense "N/0". The documented
    # contract (see the header) is that an unknown roster reverts to pre-roster behavior, so fall back to the
    # reported-lane count exactly like the OK branch below. When the roster IS known this is unchanged.
    $anrTotal = if ($ExpectedLanes -and $ExpectedLanes.Count -gt 0) { $ExpectedLanes.Count } else { $all.Count }
    return (Fmt "laneHealthAliveNoReport" @{ LANES = ($aliveNoReport -join $sep); MISSING = $aliveNoReport.Count; TOTAL = $anrTotal })
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

# Ordinal longest-common-prefix of a set of strings ("" when there is no non-empty shared prefix). Pure.
function Get-CommonPrefix([string[]]$Items) {
  $nonEmpty = @($Items | Where-Object { $null -ne $_ -and $_ -ne "" })
  if ($nonEmpty.Count -eq 0) { return "" }
  $stem = [string]$nonEmpty[0]
  foreach ($p in $nonEmpty) {
    $max = [math]::Min($stem.Length, $p.Length); $i = 0
    while ($i -lt $max -and $stem[$i] -eq $p[$i]) { $i++ }
    $stem = $stem.Substring(0, $i)
    if ($stem -eq "") { break }
  }
  return $stem
}

# True when a region line is a per-lane health BANNER that must be stripped before the fresh one is
# reinserted. Two matchers, union-ed so the result is always a SUPERSET of the legacy explicit list
# (never a regression): (a) the runtime-derived shared stem of all banner templates, and (b) each known
# pre-placeholder prefix. (a) is the load-bearing fix for version skew: when a NEW reporter writes a
# banner keyed by a string an OLD clone's reporter does not yet know (observed live: an "alive-no-report"
# banner beside a stale "unreported" one because the old strip list lacked the new key -> two
# contradictory health lines on the operator's only watch surface), the shared stem still matches it, so
# any reporter version - old or new - removes any banner variant. Stem is "" -> fall back to (b) alone
# (strictly today's behavior), so a garbled strings file never strips everything. Lane rows ("- lane :")
# and the missing-since marker ("<!--") share no stem with the banners, so they are never touched.
function Test-IsHealthBanner {
  param([string]$TrimmedLine, [string]$Stem, [string[]]$KnownPrefixes)
  if ($null -eq $TrimmedLine) { return $false }
  if ($Stem -and $Stem.Trim() -ne "" -and $TrimmedLine.StartsWith($Stem)) { return $true }
  foreach ($p in $KnownPrefixes) { if ($p -and $p.Trim() -ne "" -and $TrimmedLine.StartsWith($p)) { return $true } }
  return $false
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

# ---- Process-liveness corroboration for the born-dead banner ----------------------------------
# A NEVER-reported lane is ambiguous: it is either genuinely born dead (runner crashed at ignition ->
# loud born-dead is right) OR alive and working but simply not self-reporting (its agent skips step5.5
# AND its runner predates the #672 heartbeat / can't hot-swap it in). The central status file alone
# cannot tell these apart, so #640's born-dead escalation fired LOUD on both - observed live: seo and
# ux-records ran all afternoon merging PRs yet were about to be flagged "born dead" at the 120-min mark.
# The tie-breaker is ground truth: is a loop-runner PROCESS for that lane alive on this machine? WMI is
# machine-global, so a reporter in any clone sees every lane's runner. Best-effort and gated to the rare
# case where a missing lane exists: any failure (WMI outage, non-Windows) returns an EMPTY set, which
# makes Get-LaneHealthLine behave exactly as before (safe degradation - never worse than today). Mirrors
# loop-launcher.ps1 Get-RunningLanes; kept as a tiny local copy because the two scripts share no module
# and the reporter runs in separate lane clones.
# Pure: does a process command line genuinely LAUNCH loop-runner.ps1 (invoked via -File), not merely MENTION
# the filename (an operator/agent -Command diagnostic that names the script + a lane)? A bare mention spoofs
# the alive-tiebreak below into treating a dead lane as alive, which is the WRONG direction here: it would
# calm a genuinely dead lane's health banner. Every real runner launches via -File <path>\loop-runner.ps1;
# match that shape so a -Command mention no longer counts. Local copy of the sibling predicate in
# loop-runner.ps1 / loop-launcher.ps1 (the scripts share no module). Pure so -SelfTest asserts it offline.
function Test-IsRunnerProcess([string]$CommandLine) {
  if ([string]::IsNullOrEmpty($CommandLine)) { return $false }
  return ($CommandLine -match '(?i)-File\s+"?[^"]*loop-runner\.ps1(?:"|\s|$)')
}

function Get-AliveRunnerLanes {
  $names = New-Object System.Collections.Generic.List[string]
  try {
    $procs = @(Get-CimInstance Win32_Process -Filter "Name LIKE 'powershell%' OR Name LIKE 'pwsh%'" -ErrorAction Stop |
      Where-Object { Test-IsRunnerProcess ([string]$_.CommandLine) })
    foreach ($p in $procs) {
      $m = [regex]::Match([string]$p.CommandLine, '(?i)-Lane(\s+|:|=)["'']?([\w\-]+)')
      if ($m.Success) {
        $lane = $m.Groups[2].Value
        if (-not $names.Contains($lane)) { $names.Add($lane) }
      }
    }
  } catch {}
  return $names.ToArray()
}

# How long (minutes) the resurrection watchdog (loop-watchdog.ps1) has been resident, or -1 if none is
# running (or the scan fails). The watchdog is the drain engine: it fires `launcher -HealOnly` every
# interval, which cooperatively cycles idle below-floor runners to fresh code. Get-LaneHealthLine uses this
# as the SECOND wedge gate so a lane that has been alive-but-silent is only escalated to the loud "wedge"
# banner once the drain has HAD time to fix it - never in the transient right after the watchdog starts (when
# a lane's silence clock predates the drain ever getting a chance). Returns the OLDEST watchdog's uptime
# (max), so a brief self-respawn overlap does not reset the clock. Best-effort; any failure -> -1 (no
# escalation), matching the safe-degradation contract of Get-AliveRunnerLanes.
function Get-WatchdogUptimeMinutes {
  param([datetime]$Now)
  $best = -1.0
  try {
    $procs = @(Get-CimInstance Win32_Process -Filter "Name LIKE 'powershell%' OR Name LIKE 'pwsh%'" -ErrorAction Stop |
      Where-Object { $_.CommandLine -like '*loop-watchdog.ps1*' })
    foreach ($p in $procs) {
      if ($p.CreationDate -is [datetime]) {
        $up = ($Now - $p.CreationDate).TotalMinutes
        if ($up -gt $best) { $best = $up }
      }
    }
  } catch {}
  return $best
}

# Whether the ground-truth process-liveness scan (Get-AliveRunnerLanes) must run this write. The scan feeds
# the alive/dead tie-breaker that demotes a provably-alive lane out of the LOUD banners. #696 wired that
# demotion for NEVER-reported lanes (missing -> born-dead) and the callers gated the scan on
# "missingLanes.Count > 0". #703 then extended the SAME demotion to STALE lanes (reported-once-then-silent),
# but the scan gate was never widened - so once every enabled lane has reported at least once (zero missing)
# and one then falls silent, the gate skips the scan, $aliveLanes is empty, and Get-LaneHealthLine's stale-
# alive branch can never fire: the #703 fix silently reverts to a FALSE loud "stopped" alarm on a working
# lane (the exact class #602..#703 exist to remove). Gate on EITHER a missing lane OR a stale lane so the
# scan runs whenever a demotion is possible. Pure: callers pass the already-computed missing count so the
# region is not parsed twice; stale is derived from the rows. Empty rows / no stale -> false (legacy no-scan).
function Test-NeedsAliveScan {
  param([int]$MissingCount, [string[]]$Rows, [datetime]$Now, [int]$StaleMinutes, [string]$RowTemplate)
  if ($MissingCount -gt 0) { return $true }
  $stale = @(Get-StaleLanes -Rows $Rows -Now $Now -StaleMinutes $StaleMinutes -RowTemplate $RowTemplate)
  return ($stale.Count -gt 0)
}

# ---- Trailing-blank hygiene for the status file -----------------------------------------------
# The status writers compose "($lines -join CRLF) + CRLF" and then Set-Content APPENDS its own
# terminator, so each write leaves the file ending in a DOUBLE CRLF; Get-Content preserves all-but-one
# trailing terminator on the next read, so one extra blank line reappears - a net +1 trailing blank
# per write. Measured live: the owner's single watch file (docs/loop-status.md) grew 19->20->21->22
# blank lines across three reports, unbounded (the same watch-surface-bloat class as the #661 logs
# fix). The two-part fix: (1) -NoNewline on the Set-Content so the file ends in exactly the single CRLF
# the composed text already carries (stops the growth at the source; the write becomes round-trip
# stable), and (2) this trim before composing, so the already-accumulated bloat self-heals on the next
# write. EOF blank lines carry no meaning (the file's last real line is the region END marker, or the
# launcher's watch3 line), so trimming them is always safe. Pure.
function Remove-TrailingBlankLines {
  param([string[]]$Lines)
  if ($null -eq $Lines) { return @() }
  $last = $Lines.Count - 1
  while ($last -ge 0 -and ([string]$Lines[$last]).Trim() -eq "") { $last-- }
  if ($last -lt 0) { return @() }
  return @($Lines[0..$last])
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

      # N) Test-NeedsAliveScan gates the ground-truth process scan feeding the alive/dead tie-breaker. #703
      # made the STALE (report-then-silent) branch a consumer of $aliveLanes, but the call sites kept gating
      # the scan on missing-count only - so a zero-missing fleet with one stale lane skipped the scan, left
      # $aliveLanes empty, and reverted to a FALSE loud "stopped" alarm. The gate must fire on missing OR stale.
      $rowTplN = S "reportLine"
      $nA = Test-NeedsAliveScan -MissingCount 1 -Rows @($rOps, $rData) -Now $hNow -StaleMinutes 120 -RowTemplate $rowTplN
      Assert-Test "N1: a missing lane forces the alive scan (legacy trigger preserved)" ($nA -eq $true)
      $nB = Test-NeedsAliveScan -MissingCount 0 -Rows @($rOps, $rDataStale) -Now $hNow -StaleMinutes 120 -RowTemplate $rowTplN
      Assert-Test "N2: zero missing but a stale lane STILL forces the scan (the #703-gate regression fix)" ($nB -eq $true)
      $nC = Test-NeedsAliveScan -MissingCount 0 -Rows @($rOps, $rData) -Now $hNow -StaleMinutes 120 -RowTemplate $rowTplN
      Assert-Test "N3: no missing and no stale lane -> no scan (legacy no-op preserved)" ($nC -eq $false)
      $nD = Test-NeedsAliveScan -MissingCount 0 -Rows @() -Now $hNow -StaleMinutes 120 -RowTemplate $rowTplN
      Assert-Test "N4: empty rows with zero missing -> no scan, no throw" ($nD -eq $false)

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

        # K) Process-liveness tie-breaker: a NEVER-reported lane whose runner PROCESS is alive ($AliveLanes)
        # must NOT escalate to the loud born-dead banner even past grace - it surfaces as the calm
        # alive-no-report note. This is the ground-truth fix for the seo/ux-records false alarm.
        if ($LS.ContainsKey("laneHealthAliveNoReport")) {
          # K1: seo never reported, stamp 200 min old (>=120 = past grace), but its runner is ALIVE ->
          # alive-no-report note naming seo, NOT the born-dead banner.
          $k1 = Get-LaneHealthLine -Rows @($rOps, $rData) -Now $hNow -StaleMinutes 120 -ExpectedLanes @("ops", "data", "seo") -MissingSince $mapOld -AliveLanes @("seo")
          $k1exp = Fmt "laneHealthAliveNoReport" @{ LANES = "seo"; MISSING = 1; TOTAL = 3 }
          Assert-Test "K1: alive never-reported lane past grace is alive-no-report, NOT born-dead" ($k1 -eq $k1exp)
          # K2: regression - the SAME past-grace lane with NO live process still escalates to born-dead.
          $k2 = Get-LaneHealthLine -Rows @($rOps, $rData) -Now $hNow -StaleMinutes 120 -ExpectedLanes @("ops", "data", "seo") -MissingSince $mapOld -AliveLanes @()
          Assert-Test "K2: dead never-reported lane past grace still escalates to born-dead" ($k2 -eq $g2exp)
          # K3: a genuinely dead lane (born-dead) still outranks an alive-no-report lane in the same file.
          $mapTwo = @{ "seo" = $hNow.AddMinutes(-200); "ux-records" = $hNow.AddMinutes(-200) }
          $k3 = Get-LaneHealthLine -Rows @($rOps, $rData) -Now $hNow -StaleMinutes 120 -ExpectedLanes @("ops", "data", "seo", "ux-records") -MissingSince $mapTwo -AliveLanes @("seo")
          $k3exp = Fmt "laneHealthBornDead" @{ LANES = "ux-records"; MIN = 120 }
          Assert-Test "K3: born-dead (truly dead lane) outranks alive-no-report" ($k3 -eq $k3exp)
          # K4: an alive lane still WITHIN grace is also the calm alive-no-report note (confirmed alive).
          $k4 = Get-LaneHealthLine -Rows @($rOps, $rData) -Now $hNow -StaleMinutes 120 -ExpectedLanes @("ops", "data", "seo") -MissingSince $mapFresh -AliveLanes @("seo")
          Assert-Test "K4: alive lane within grace is alive-no-report (calm, named)" ($k4 -eq $k1exp)

          # M) Stale (report-then-silent) tie-breaker: a lane that reported then fell silent >120 min but
          # whose runner PROCESS is alive is demoted OUT of the loud stale banner into the calm alive-no-report
          # note - it is not a crash, just an old runner / agent that stopped self-reporting. This is the fix
          # for the live "data(2h ago)" false stopped-alarm while its runner was provably alive.
          # M1: data is stale (200 min) but ALIVE -> calm alive-no-report naming data, NOT the loud stale banner.
          $m1 = Get-LaneHealthLine -Rows @($rOps, $rDataStale) -Now $hNow -StaleMinutes 120 -ExpectedLanes @("ops", "data") -AliveLanes @("data")
          $m1exp = Fmt "laneHealthAliveNoReport" @{ LANES = "data"; MISSING = 1; TOTAL = 2 }
          Assert-Test "M1: stale-but-alive lane is demoted to calm alive-no-report, NOT loud stale" ($m1 -eq $m1exp)
          # M2: regression - the SAME stale lane with NO live runner still fires the loud stale banner.
          $m2 = Get-LaneHealthLine -Rows @($rOps, $rDataStale) -Now $hNow -StaleMinutes 120 -ExpectedLanes @("ops", "data") -AliveLanes @()
          Assert-Test "M2: stale lane with no live runner still fires the loud stale banner" ($m2 -eq $f3exp)
          # M3: two stale lanes, one alive one dead -> loud stale names ONLY the dead one (alive not mourned).
          $rSeoStale = Fmt "reportLine" @{ LANE = "seo"; LASTRUN = $staleTs; PR = "#3"; OPEN = "1"; NOTE = "ok" }
          $m3 = Get-LaneHealthLine -Rows @($rOps, $rDataStale, $rSeoStale) -Now $hNow -StaleMinutes 120 -ExpectedLanes @("ops", "data", "seo") -AliveLanes @("data")
          $m3item = Fmt "laneHealthItem" @{ LANE = "seo"; LASTRUN = $staleTs; HOURS = [math]::Round(200 / 60.0, 1) }
          $m3exp = Fmt "laneHealthStale" @{ LANES = $m3item; MIN = 120 }
          Assert-Test "M3: loud stale names only the dead stale lane; the alive stale lane is not mourned" ($m3 -eq $m3exp)
          # M4: a genuinely born-dead missing lane still outranks a demoted stale-alive lane (loud wins).
          $m4 = Get-LaneHealthLine -Rows @($rOps, $rDataStale) -Now $hNow -StaleMinutes 120 -ExpectedLanes @("ops", "data", "seo") -MissingSince $mapOld -AliveLanes @("data")
          Assert-Test "M4: a truly born-dead missing lane still outranks a demoted stale-alive lane" ($m4 -eq $g2exp)
          # O) Empty-roster denominator: a config momentarily unreadable in a clone (mid git-checkout) yields an
          # EMPTY roster while a lane is stale-but-alive. That path returned "N/0" (nonsense fraction on the
          # owner's watch line) because TOTAL was $ExpectedLanes.Count. The contract says an unknown roster
          # reverts to pre-roster behavior, so TOTAL must fall back to the reported-lane count.
          # O1: empty roster + stale-alive data -> alive-no-report with TOTAL = reported count (2), not 0.
          $o1 = Get-LaneHealthLine -Rows @($rOps, $rDataStale) -Now $hNow -StaleMinutes 120 -ExpectedLanes @() -AliveLanes @("data")
          $o1exp = Fmt "laneHealthAliveNoReport" @{ LANES = "data"; MISSING = 1; TOTAL = 2 }
          Assert-Test "O1: empty roster + stale-alive lane -> TOTAL falls back to reported count (no nonsense /0)" ($o1 -eq $o1exp)
          # O2: regression - a KNOWN roster is unchanged (TOTAL stays the roster size, here 2), same as M1.
          $o2 = Get-LaneHealthLine -Rows @($rOps, $rDataStale) -Now $hNow -StaleMinutes 120 -ExpectedLanes @("ops", "data") -AliveLanes @("data")
          Assert-Test "O2: known roster still uses the roster size as TOTAL (no regression)" ($o2 -eq $m1exp)

          # W) Wedge escalation: a below-floor runner whose claude call has hung keeps a child alive forever,
          # so the cooperative drain (idle-only) defers it PERMANENTLY and it stays alive-but-silent for good.
          # The calm alive-no-report banner ("auto-resolves") then lies. Escalate to a LOUD "wedge" banner ONLY
          # when the lane has been silent >= WedgeMinutes AND the heal watchdog has itself been up >= WedgeMinutes
          # (gate (b) prevents the false alarm right after the watchdog starts, when the clock predates any drain
          # chance - the live 06:38 runners vs 18:09 watchdog). Fixtures below use WedgeMinutes=240.
          if ($LS.ContainsKey("laneHealthAliveNoReportStalled")) {
            $mapWedge = @{ "seo" = $hNow.AddMinutes(-300) }       # 300 min silent (>= 240 wedge threshold)
            $mapMid = @{ "seo" = $hNow.AddMinutes(-100) }         # 100 min silent (< 240, still calm)
            $wedgeExp = Fmt "laneHealthAliveNoReportStalled" @{ LANES = "seo"; MIN = 240 }
            $calmSeoExp = Fmt "laneHealthAliveNoReport" @{ LANES = "seo"; MISSING = 1; TOTAL = 3 }
            # W1: silent 300 min + watchdog up 300 min + ALIVE -> LOUD wedge naming seo.
            $w1 = Get-LaneHealthLine -Rows @($rOps, $rData) -Now $hNow -StaleMinutes 120 -ExpectedLanes @("ops", "data", "seo") -MissingSince $mapWedge -AliveLanes @("seo") -WedgeMinutes 240 -WatchdogUpMinutes 300
            Assert-Test "W1: alive lane silent past wedge + watchdog long-resident -> loud wedge banner" ($w1 -eq $wedgeExp)
            # W2: SAME lane/clock but the watchdog only just started (up 11 min) -> stays CALM (the live-scenario
            # regression guard: a fresh drain has not yet had a chance, so no false wedge alarm).
            $w2 = Get-LaneHealthLine -Rows @($rOps, $rData) -Now $hNow -StaleMinutes 120 -ExpectedLanes @("ops", "data", "seo") -MissingSince $mapWedge -AliveLanes @("seo") -WedgeMinutes 240 -WatchdogUpMinutes 11
            Assert-Test "W2: watchdog only just resident -> calm alive-no-report, NOT a false wedge alarm" ($w2 -eq $calmSeoExp)
            # W3: clock too young (100 min < 240) even with a long-resident watchdog -> calm.
            $w3 = Get-LaneHealthLine -Rows @($rOps, $rData) -Now $hNow -StaleMinutes 120 -ExpectedLanes @("ops", "data", "seo") -MissingSince $mapMid -AliveLanes @("seo") -WedgeMinutes 240 -WatchdogUpMinutes 300
            Assert-Test "W3: lane silent under the wedge threshold stays calm" ($w3 -eq $calmSeoExp)
            # W4: no watchdog scan (-1, default) never escalates, even with an old clock -> calm (safe degrade).
            $w4 = Get-LaneHealthLine -Rows @($rOps, $rData) -Now $hNow -StaleMinutes 120 -ExpectedLanes @("ops", "data", "seo") -MissingSince $mapWedge -AliveLanes @("seo")
            Assert-Test "W4: unknown watchdog uptime (default -1) never escalates -> calm" ($w4 -eq $calmSeoExp)
            # W5: a genuinely born-dead lane still OUTRANKS a wedge (loud dead beats loud wedged).
            $mapDeadAndWedge = @{ "seo" = $hNow.AddMinutes(-300); "ux-records" = $hNow.AddMinutes(-300) }
            $w5 = Get-LaneHealthLine -Rows @($rOps, $rData) -Now $hNow -StaleMinutes 120 -ExpectedLanes @("ops", "data", "seo", "ux-records") -MissingSince $mapDeadAndWedge -AliveLanes @("seo") -WedgeMinutes 240 -WatchdogUpMinutes 300
            $w5exp = Fmt "laneHealthBornDead" @{ LANES = "ux-records"; MIN = 120 }
            Assert-Test "W5: a truly born-dead lane outranks a wedged-alive lane" ($w5 -eq $w5exp)
            # W6: the report-then-silent (stale-alive) path also feeds the wedge clock: data reported 300 min ago,
            # is alive, watchdog long-resident -> loud wedge naming data (age comes from its own report row).
            $veryStaleTs = $hNow.AddMinutes(-300).ToString("yyyy-MM-dd HH:mm")
            $rDataVeryStale = Fmt "reportLine" @{ LANE = "data"; LASTRUN = $veryStaleTs; PR = "#2"; OPEN = "5"; NOTE = "ok" }
            $w6 = Get-LaneHealthLine -Rows @($rOps, $rDataVeryStale) -Now $hNow -StaleMinutes 120 -ExpectedLanes @("ops", "data") -AliveLanes @("data") -WedgeMinutes 240 -WatchdogUpMinutes 300
            $w6exp = Fmt "laneHealthAliveNoReportStalled" @{ LANES = "data"; MIN = 240 }
            Assert-Test "W6: a report-then-silent alive lane past wedge also escalates to the loud wedge banner" ($w6 -eq $w6exp)
          }
        }
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

    # J) Trailing-blank hygiene: Remove-TrailingBlankLines must drop EOF blanks, keep interior blanks,
    # be a no-op on already-clean input, and (composed with -NoNewline) make the write round-trip stable
    # so the owner's watch file stops accumulating blank lines. First the pure-function contract:
    $jTrim = @(Remove-TrailingBlankLines -Lines @("a", "", "b", "", "  ", "`t"))
    Assert-Test "J1: trailing blanks (incl. whitespace-only) are dropped, interior blank kept" (($jTrim.Count -eq 3) -and ($jTrim[0] -eq "a") -and ($jTrim[1] -eq "") -and ($jTrim[2] -eq "b"))
    $jClean = @(Remove-TrailingBlankLines -Lines @("x", "y"))
    Assert-Test "J2: already-clean input is unchanged (no-op)" (($jClean.Count -eq 2) -and ($jClean[1] -eq "y"))
    Assert-Test "J3: all-blank input collapses to empty array (no throw)" ((@(Remove-TrailingBlankLines -Lines @("", "  ", "")).Count) -eq 0)
    Assert-Test "J4: null input is safe (empty array)" ((@(Remove-TrailingBlankLines -Lines $null).Count) -eq 0)
    # Real file round-trip: seed a file whose EOF has 5 trailing blanks (as the double-append bug leaves),
    # then run the exact heal+write recipe (trim -> join+CRLF -> Set-Content -NoNewline) twice and read
    # back. The trailing-blank count must land at 0 on the first heal and STAY 0 (stable, not re-growing).
    $jFile = Join-Path $tmp ("blank-roundtrip-" + [System.Guid]::NewGuid().ToString("N") + ".md")
    Set-Content -Path $jFile -Value ((@("- ops : row", "<!-- LANE-REPORT:END -->", "", "", "", "", "") -join "`r`n") + "`r`n") -Encoding UTF8
    $countTrailing = {
      param($p)
      $l = @(Get-Content -Encoding UTF8 -Path $p); $c = 0
      for ($i = $l.Count - 1; $i -ge 0; $i--) { if (([string]$l[$i]).Trim() -eq "") { $c++ } else { break } }
      return $c
    }
    $seedBlanks = & $countTrailing $jFile
    $healOnce = {
      param($p)
      $ln = @(Get-Content -Encoding UTF8 -Path $p)
      $ln = Remove-TrailingBlankLines -Lines $ln
      Set-Content -Path $p -Value (($ln -join "`r`n") + "`r`n") -Encoding UTF8 -NoNewline
    }
    & $healOnce $jFile; $afterHeal1 = & $countTrailing $jFile
    & $healOnce $jFile; $afterHeal2 = & $countTrailing $jFile
    Assert-Test "J5: seed file starts with accumulated trailing blanks" ($seedBlanks -ge 5)
    Assert-Test "J6: first heal removes ALL trailing blanks" ($afterHeal1 -eq 0)
    Assert-Test "J7: second write stays at 0 blanks (round-trip stable, no re-growth)" ($afterHeal2 -eq 0)

    # L) Version-robust health-banner stripping. The region-cleanup used to enumerate a FIXED set of
    # banner prefixes; a reporter that predated a newer banner key failed to strip that banner and added
    # its own alongside it -> two contradictory health lines (observed live). Get-CommonPrefix + the
    # shared-stem matcher in Test-IsHealthBanner make the strip a version-independent superset.
    # First the pure prefix math on SYNTHETIC ASCII inputs (deterministic, no strings-file dependency):
    Assert-Test "L1: common prefix of banner-like strings is the shared stem" ((Get-CommonPrefix @("HZ: full", "HZ warn: x", "HZ info: y")) -eq "HZ")
    Assert-Test "L2: no shared prefix yields empty stem" ((Get-CommonPrefix @("abc", "xyz")) -eq "")
    Assert-Test "L3: blanks/nulls are ignored when computing the stem" ((Get-CommonPrefix @("", $null, "PRE-a", "PRE-b")) -eq "PRE-")
    Assert-Test "L4: empty input yields empty stem (no throw)" ((Get-CommonPrefix @()) -eq "")
    # The regression proof: an OLD reporter's known list LACKS the alive-no-report key, yet the stem still
    # identifies that banner as strippable. Real banners are built from $LS via Fmt (Japanese stays in the
    # strings file, never in this ASCII source) so the test tracks the shipped templates exactly.
    if ($LS.ContainsKey("laneHealthUnreported") -and $LS.ContainsKey("laneHealthAliveNoReport")) {
      $realUnrep = Fmt "laneHealthUnreported" @{ MISSING = 2; TOTAL = 6; LANES = "seo" }
      $realAnr = Fmt "laneHealthAliveNoReport" @{ MISSING = 2; TOTAL = 6; LANES = "seo" }
      $knownOld = @((Get-TplPrefix "laneHealthOk"), (Get-TplPrefix "laneHealthStale"), (Get-TplPrefix "laneHealthUnreported"), (Get-TplPrefix "laneHealthBornDead"))
      $stemOld = Get-CommonPrefix $knownOld
      Assert-Test "L5: shared stem derived from an OLD prefix list is still non-empty" ($stemOld -ne "")
      Assert-Test "L6: the stem strips an alive-no-report banner an OLD prefix list would miss" (Test-IsHealthBanner -TrimmedLine $realAnr -Stem $stemOld -KnownPrefixes $knownOld)
      Assert-Test "L7: a known banner is still stripped (superset, no regression)" (Test-IsHealthBanner -TrimmedLine $realUnrep -Stem $stemOld -KnownPrefixes $knownOld)
      Assert-Test "L8: a lane row is NOT treated as a health banner" (-not (Test-IsHealthBanner -TrimmedLine "- ops : LR 2026-07-03 14:37 / PR #696 / open 2 / note" -Stem $stemOld -KnownPrefixes $knownOld))
      Assert-Test "L9: the missing-since marker is NOT treated as a health banner" (-not (Test-IsHealthBanner -TrimmedLine "<!-- lane-missing-since: seo=2026-07-03T12:55:54 -->" -Stem $stemOld -KnownPrefixes $knownOld))
      Assert-Test "L10: empty stem falls back to the known prefix list only (never strips everything)" ((Test-IsHealthBanner -TrimmedLine $realUnrep -Stem "" -KnownPrefixes $knownOld) -and (-not (Test-IsHealthBanner -TrimmedLine $realAnr -Stem "" -KnownPrefixes $knownOld)))
    }

    # R) Test-IsRunnerProcess: the alive-tiebreak (Get-AliveRunnerLanes) must count a real -File launch of
    #    loop-runner.ps1 and must NOT count a -Command MENTION of the filename + a lane - the false match that
    #    would calm a genuinely dead lane's health banner by reporting it "alive".
    Assert-Test "R1: bare -File launch is a runner" (Test-IsRunnerProcess 'powershell -NoProfile -File C:\r\loop-runner.ps1 -Lane data')
    Assert-Test "R2: quoted -File launch (spaced path) is a runner" (Test-IsRunnerProcess 'powershell -File "C:\Program Files\r\loop-runner.ps1" -Lane seo')
    Assert-Test "R3: a -Command MENTION of the filename + lane is NOT a runner (spoof fix)" (-not (Test-IsRunnerProcess 'powershell -Command "gci | ? { $_.CommandLine -like ''*loop-runner.ps1*'' -and ''-Lane data'' }"'))
    Assert-Test "R4: a watchdog -File launch is NOT a runner" (-not (Test-IsRunnerProcess 'powershell -File C:\r\loop-watchdog.ps1'))
    Assert-Test "R5: empty command line is NOT a runner (null-safe)" (-not (Test-IsRunnerProcess ""))
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
      $knownHealthPrefixes = @((Get-TplPrefix "laneHealthOk"), (Get-TplPrefix "laneHealthStale"), (Get-TplPrefix "laneHealthUnreported"), (Get-TplPrefix "laneHealthBornDead"), (Get-TplPrefix "laneHealthAliveNoReport"), (Get-TplPrefix "laneHealthAliveNoReportStalled"))
      $healthStem = Get-CommonPrefix $knownHealthPrefixes
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
          if (Test-IsHealthBanner -TrimmedLine $t -Stem $healthStem -KnownPrefixes $knownHealthPrefixes) { continue }
          if ($t.StartsWith($selfPrefix)) { $rows.Add($laneLine); $sawSelf = $true } else { $rows.Add($prev[$k]) }
        }
      }
      if (-not $sawSelf) { $rows.Add($laneLine) }
      $rowTpl = S "reportLine"; $nowH = Get-Date
      $missingLanes = @(Get-MissingLanes -Rows $rows.ToArray() -ExpectedLanes $ExpectedLanes -RowTemplate $rowTpl)
      $newMap = Update-MissingSinceMap -Old (Get-MissingSinceMap -Rows $markerRows.ToArray()) -MissingLanes $missingLanes -Now $nowH
      # Ground-truth process liveness (best-effort) when a lane is missing OR stale, so a provably-alive
      # lane is never falsely escalated to born-dead (#696) OR to a loud stale "stopped" alarm (#703).
      # Empty on any failure -> prior behavior.
      $aliveLanes = @()
      $wdUp = -1.0
      if (Test-NeedsAliveScan -MissingCount $missingLanes.Count -Rows $rows.ToArray() -Now $nowH -StaleMinutes $StaleMinutes -RowTemplate $rowTpl) { $aliveLanes = @(Get-AliveRunnerLanes); $wdUp = Get-WatchdogUptimeMinutes -Now $nowH }
      $hl = Get-LaneHealthLine -Rows $rows.ToArray() -Now $nowH -StaleMinutes $StaleMinutes -ExpectedLanes $ExpectedLanes -MissingSince $newMap -AliveLanes $aliveLanes -WedgeMinutes $WedgeMinutes -WatchdogUpMinutes $wdUp
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
      $knownHealthPrefixes = @((Get-TplPrefix "laneHealthOk"), (Get-TplPrefix "laneHealthStale"), (Get-TplPrefix "laneHealthUnreported"), (Get-TplPrefix "laneHealthBornDead"), (Get-TplPrefix "laneHealthAliveNoReport"), (Get-TplPrefix "laneHealthAliveNoReportStalled"))
      $healthStem = Get-CommonPrefix $knownHealthPrefixes
      # Peel the region into: the persisted missing-since marker (captured, to keep prior clocks running)
      # and the real lane rows (health + marker lines stripped so they never accumulate).
      $markerRows = New-Object System.Collections.Generic.List[string]
      $inner = New-Object System.Collections.Generic.List[string]
      for ($k = $bIdx + 1; $k -lt $eIdx; $k++) {
        $t = $lines[$k].TrimStart()
        if ($t.StartsWith($missingMarkerPrefix)) { $markerRows.Add($lines[$k]); continue }
        if (Test-IsHealthBanner -TrimmedLine $t -Stem $healthStem -KnownPrefixes $knownHealthPrefixes) { continue }
        $inner.Add($lines[$k])
      }
      $rowTpl = S "reportLine"; $nowH = Get-Date
      $missingLanes = @(Get-MissingLanes -Rows $inner.ToArray() -ExpectedLanes $ExpectedLanes -RowTemplate $rowTpl)
      $newMap = Update-MissingSinceMap -Old (Get-MissingSinceMap -Rows $markerRows.ToArray()) -MissingLanes $missingLanes -Now $nowH
      # Ground-truth process liveness (best-effort) when a lane is missing OR stale, so a provably-alive lane
      # is never falsely escalated to born-dead (#696) OR to a loud stale "stopped" alarm (#703). Empty on any
      # failure (WMI outage / non-Windows) -> prior behavior.
      $aliveLanes = @()
      $wdUp = -1.0
      if (Test-NeedsAliveScan -MissingCount $missingLanes.Count -Rows $inner.ToArray() -Now $nowH -StaleMinutes $StaleMinutes -RowTemplate $rowTpl) { $aliveLanes = @(Get-AliveRunnerLanes); $wdUp = Get-WatchdogUptimeMinutes -Now $nowH }
      $healthLine = Get-LaneHealthLine -Rows $inner.ToArray() -Now $nowH -StaleMinutes $StaleMinutes -ExpectedLanes $ExpectedLanes -MissingSince $newMap -AliveLanes $aliveLanes -WedgeMinutes $WedgeMinutes -WatchdogUpMinutes $wdUp
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

  # Trim EOF blank lines so accumulated bloat self-heals, and write with -NoNewline so the file ends in
  # exactly one CRLF (Set-Content would otherwise append a second terminator -> +1 blank line per write).
  $lines = Remove-TrailingBlankLines -Lines $lines
  $text = ($lines -join "`r`n") + "`r`n"
  Set-Content -Path $StatusPath -Value $text -Encoding UTF8 -NoNewline
  Write-Rep ("row written to " + $StatusPath)
} catch {
  Write-Rep ("WARN: report write failed (non-fatal): " + $_.Exception.Message)
} finally {
  try { Remove-Item -Path $lockPath -Force -ErrorAction SilentlyContinue } catch {}
}

exit 0
