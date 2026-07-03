<#
.SYNOPSIS
  Unattended self-run loop for the safe-ai-site project.
  Repeatedly launches the Claude Code CLI (headless) to process one BACKLOG task per iteration.

.DESCRIPTION
  Claude Code is turn-based: it ends a turn after replying and waits for the next human input.
  This script acts as the "human", launching `claude` headless at a fixed interval so the
  agent processes BACKLOG.md one task per iteration without manual prompting.

  This file is intentionally PURE ASCII so Windows PowerShell 5.x parses it correctly
  (BOM-less UTF-8 with Japanese was mis-decoded as Shift-JIS and broke parsing).
  The variable Japanese instruction is kept in loop-prompt.txt (UTF-8) and read at runtime.

  Backoff: when an iteration fails fast (exit code != 0 within 2 minutes, e.g. the
  Claude usage limit is active), the wait is extended after 3 consecutive short
  failures to 5 minutes, then 10 minutes, then capped at 30 minutes. Any successful
  or long-running iteration restores the normal interval immediately. This avoids
  hammering the CLI every 2 minutes for hours while a usage limit is in effect.
  Run with -SelfTest to dry-run the backoff schedule (no Claude CLI needed).

  Each iteration the agent is told to:
    1) Merge its own CI-green open PRs, pull main, ensure clean.
    2) Take the top open task in BACKLOG.md (or replenish if fewer than 3 remain).
    3) Implement on one branch, run gates (tsc/lint/test/build), push, open a PR.
    4) Update BACKLOG.md and the cycle-log.
  main stays deployable; only CI-green PRs are merged.

.PARAMETER IntervalSeconds
  Seconds to wait after each iteration (default 120). CI runs async; the next iteration
  collects green PRs.

.PARAMETER MaxIterations
  Max iterations (default 0 = unlimited; stop with Ctrl+C).

.PARAMETER UntilIso
  Stop once past this ISO datetime, e.g. "2026-06-09T09:13:00" (default empty = no limit).

.PARAMETER ClaudeCmd
  Command/path for the Claude CLI (default "claude").

.PARAMETER Model
  Model id passed to the Claude CLI (default "claude-fable-5").
  Pass -Model "" to let the CLI use its own default.

.PARAMETER PromptFile
  UTF-8 file with the per-iteration instruction (default loop-prompt.txt next to this script,
  or loop-prompt-<lane>.txt when -Lane is set and that file exists).

.PARAMETER Lane
  Lane name for parallel multi-lane operation (default "" = legacy single all-domains loop).
  When set (e.g. "seo", "data", "ux-records"):
    - logs go to logs/loop-<lane>-<stamp>.log (so lanes never interleave in one log),
    - the default prompt becomes loop-prompt-<lane>.txt when present (each lane reads only
      its own BACKLOG-<lane>.md and touches only its own file domain),
    - the single-instance guard becomes PER-LANE: a second runner for the SAME lane is
      blocked, but runners for OTHER lanes (and the legacy no-lane loop) are allowed to run
      concurrently. This is the core of safe parallelism.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\loop-runner.ps1

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\loop-runner.ps1 -IntervalSeconds 300 -UntilIso "2026-06-09T09:13:00"

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\loop-runner.ps1 -Lane seo -Model claude-opus-4-8 -UntilIso "2026-06-14T10:00:00"
#>
[CmdletBinding()]
param(
  [int]$IntervalSeconds = 120,
  [int]$MaxIterations = 0,
  [string]$UntilIso = "",
  [string]$RepoPath = $PSScriptRoot,
  [string]$ClaudeCmd = "claude",
  [string]$Model = "claude-fable-5",
  [string]$PromptFile = "",
  [string]$Lane = "",
  [int]$IterationTimeoutSeconds = 5400,
  [switch]$SelfTest,
  [switch]$RehearseTimeout
)

$ErrorActionPreference = "Continue"
# Send UTF-8 (no BOM) to native commands so the Japanese prompt reaches claude intact.
$OutputEncoding = New-Object System.Text.UTF8Encoding $false
try { [Console]::OutputEncoding = New-Object System.Text.UTF8Encoding $false } catch {}

# Short-failure backoff schedule (typically the Claude usage limit): keep the normal
# interval until 3 consecutive short failures, then step 5 -> 10 -> 30 minutes. The
# returned wait never drops below the configured interval. Pure function so -SelfTest
# can dry-run the schedule without launching the CLI.
function Get-BackoffSeconds([int]$ConsecutiveShortFails, [int]$IntervalSeconds) {
  $backoff = 0
  if ($ConsecutiveShortFails -ge 3) { $backoff = 300 }
  if ($ConsecutiveShortFails -ge 4) { $backoff = 600 }
  if ($ConsecutiveShortFails -ge 5) { $backoff = 1800 }
  if ($backoff -gt $IntervalSeconds) { return $backoff }
  return $IntervalSeconds
}

# Whether a run should self-report its deadline stop into the central docs/loop-status.md.
# Only a PERSISTENT LANED runner qualifies: a one-shot planner/critic pass (-MaxIterations >= 1)
# must not stamp a spurious "stopped: deadline" row, and the legacy no-lane loop has no lane row to
# upsert. Pure function so -SelfTest can assert the gate without launching anything. (See
# Report-DeadlineStop below for why the runner must self-report: on a genuine deadline stop there is
# no further claude iteration to run the per-iteration report step, so the runner reports it itself.)
function Test-ShouldReportDeadlineStop([string]$LaneTag, [int]$MaxIter) {
  return (($LaneTag -ne "") -and ($MaxIter -le 0))
}

# Pure: does a process command line genuinely LAUNCH loop-runner.ps1 (invoked via -File), as opposed to
# merely MENTIONING the filename in its arguments (e.g. an operator/agent diagnostic run with
# -Command "... loop-runner.ps1 ... -Lane data ...")? The single-instance guard below counted ANY
# powershell whose command line CONTAINED the substring "loop-runner.ps1", so a stray command that names
# the script (and a lane) spoofs the liveness scan exactly as a bare mention spoofed the watchdog scan
# before it was hardened. The concrete harm: a legitimately relaunched runner (after a hot-swap clean-exit
# or a heal pass) sees the diagnostic as a same-lane competitor and self-exits, and Get-RunningLanes then
# reports the lane "alive" so -HealOnly will not resurrect it -> the lane stays dead while the diagnostic
# lingers. Every REAL launch form uses -File: the launcher's persistent/heal spawn and one-shot planner/
# critic (-File <path>\loop-runner.ps1) and every manual/usage form. Match that shape - a path ending in
# loop-runner.ps1 immediately after -File, quoted or bare - so a -Command mention (no -File before the
# path) no longer counts. Pure so -SelfTest asserts it offline. (loop-watchdog.ps1 / loop-launcher.ps1 keep
# their own local copies of the sibling predicate because the scripts share no module.)
function Test-IsRunnerProcess([string]$CommandLine) {
  if ([string]::IsNullOrEmpty($CommandLine)) { return $false }
  return ($CommandLine -match '(?i)-File\s+"?[^"]*loop-runner\.ps1(?:"|\s|$)')
}

# Hot-swap gate: whether the running runner's OWN script file has changed on disk since launch, i.e. an
# ops fix to loop-runner.ps1 has been pulled into this lane's clone but the long-lived process is still
# executing the OLD code. A persistent runner reads its whole script into the process at launch, so
# runner-code fixes (backoff #590, deadline-stop #619, heartbeat #672) never reach an ALREADY-RUNNING
# lane until the process restarts - and the launcher's single-instance guard refuses to restart a live
# runner, so up to 5/6 lanes can execute stale runner code for days (the heartbeat fix could not even
# activate for its own targets seo/ux-records). Pure function so -SelfTest can assert it without file IO:
# a change is signalled ONLY when both hashes are non-empty and differ. An empty/failed current hash
# (file briefly locked mid git-checkout) returns $false = fail-safe toward "unchanged", so a transient
# read error can never spin the runner into a restart loop; an empty launch baseline also never restarts.
function Test-ScriptChanged([string]$LaunchHash, [string]$CurrentHash) {
  if ([string]::IsNullOrEmpty($LaunchHash)) { return $false }
  if ([string]::IsNullOrEmpty($CurrentHash)) { return $false }
  return ($LaunchHash -ne $CurrentHash)
}

# Content hash of a file, or "" on any failure (missing / locked mid-checkout). Never throws so the
# hot-swap check degrades to "unchanged" instead of crashing the loop.
function Get-ScriptHashSafe([string]$Path) {
  try {
    if (-not $Path -or -not (Test-Path $Path)) { return "" }
    return (Get-FileHash -Algorithm SHA256 -Path $Path -ErrorAction Stop).Hash
  } catch { return "" }
}

# Wedge self-heal: whether a bounded-timeout monitor should guard the claude turn. The invocation
# `$prompt | & claude | Tee-Object` has NO timeout, so a hung claude (network/stdin deadlock) blocks the
# pipe forever - the runner never returns to the loop top, never re-reads the prompt (no hot-swap), never
# heartbeats -> a PERMANENT wedge that #736 could only REPORT (LOUD "manual restart" banner at 4h), not
# clear. A positive bound arms an out-of-band monitor that force-kills the hung child tree so the pipe
# unblocks, the runner heartbeats, and the next iteration self-heals. <=0 disables it (legacy infinite
# wait / fail-safe kill switch). Pure so -SelfTest can assert the gate without spawning anything.
function Test-TimeoutMonitorEnabled([int]$TimeoutSeconds) {
  return ($TimeoutSeconds -gt 0)
}

# Seconds the wedge monitor sleeps before killing, or 0 when disabled. Pure so -SelfTest can assert the
# mapping (<=0 -> 0 = no monitor; positive -> passthrough) without spawning anything.
function Get-IterationWaitSeconds([int]$TimeoutSeconds) {
  if ($TimeoutSeconds -le 0) { return 0 }
  return $TimeoutSeconds
}

# Reporter coupling (see loop-report-status.ps1 StaleMinutes, default 120 min): the wedge monitor is the
# ONLY thing that refreshes this lane's central-status heartbeat DURING a hung claude turn - the agent
# never reaches its own step5.5 report while wedged, and Report-Heartbeat fires only AFTER the turn ends.
# So a maximally-wedged iteration freezes the lane's last-run timestamp for the FULL IterationTimeoutSeconds.
# If that ceiling reaches the reporter's StaleMinutes (both were 7200s / 120min = ZERO headroom), a single
# wedge drives the row's age to the reporter's `-ge 120min` boundary and the reporter raises a FALSE
# "silent per-lane death / manual restart" alarm for a lane that is alive and self-heals next iteration -
# defeating the very heartbeat this monitor exists to feed (see the WEDGE-log comment in the loop). The
# ceiling MUST therefore stay below the stale threshold with margin so the post-wedge heartbeat lands
# before that boundary; the default 5400s (90min) vs 120min stale leaves 30min headroom. A disabled monitor
# (<=0, legacy infinite wait) is exempt: a truly infinite hang is a genuine death the reporter SHOULD flag.
# Pure so -SelfTest asserts the invariant offline (with the reporter's StaleMinutes literal it must match).
function Test-WedgeCeilingUnderStale([int]$TimeoutSeconds, [int]$ReporterStaleMinutes, [int]$MarginSeconds) {
  if ($TimeoutSeconds -le 0) { return $true }
  return ($TimeoutSeconds -le (($ReporterStaleMinutes * 60) - $MarginSeconds))
}

# Arm an out-of-band monitor for one claude turn. Returns a Job handle (or $null when disabled) so the
# main thread runs the EXISTING inline pipe unchanged (streaming + UTF-8 stdin preserved) while a sibling
# process waits $TimeoutSeconds and, on expiry, force-kills the runner's claude child tree (taskkill /T)
# and drops a sentinel file. The kill unblocks the blocked pipe on the main thread. NameFilter restricts
# the kill to the known claude chain (claude / node / the claude.cmd shim's cmd.exe) as defense-in-depth;
# the monitor only ever fires on a genuine multi-hour hang, when that tree is the runner's sole child.
function Start-WedgeMonitor([int]$RunnerPid, [int]$TimeoutSeconds, [string]$SentinelPath, [string]$NameFilter = '^(claude|node|cmd)') {
  if (-not (Test-TimeoutMonitorEnabled $TimeoutSeconds)) { return $null }
  return Start-Job -ScriptBlock {
    param($ppid, $sec, $sentinel, $nameRe)
    Start-Sleep -Seconds $sec
    # Drop the sentinel BEFORE killing: the kill unblocks the main thread's pipe, which then Stop-Job's
    # this monitor - if the sentinel were written after the kill it could lose that race and the wedge
    # would go unlogged. Written first, it is always on disk by the time the pipe unblocks.
    try { Set-Content -Path $sentinel -Value "fired" -Encoding ASCII } catch {}
    try {
      $kids = Get-CimInstance Win32_Process -Filter ("ParentProcessId=" + $ppid) -ErrorAction SilentlyContinue
      foreach ($k in $kids) {
        if ($k.Name -match $nameRe) {
          try { & taskkill /F /T /PID $k.ProcessId 2>&1 | Out-Null } catch {}
        }
      }
    } catch {}
  } -ArgumentList $RunnerPid, $TimeoutSeconds, $SentinelPath, $NameFilter
}

# Tear down a wedge monitor (no-op on $null). Always called in a finally so a completed OR still-sleeping
# monitor never leaks a background job.
function Stop-WedgeMonitor($Job) {
  if ($null -eq $Job) { return }
  try { Stop-Job $Job -ErrorAction SilentlyContinue } catch {}
  try { Remove-Job $Job -Force -ErrorAction SilentlyContinue } catch {}
}

# Dry-run self-check of the backoff schedule. Runs BEFORE any Claude CLI / scheduler
# dependency so it is safe to invoke on any machine: powershell -File loop-runner.ps1 -SelfTest
if ($SelfTest) {
  $cases = @(
    @{ f = 0; want = [Math]::Max($IntervalSeconds, 0) },
    @{ f = 2; want = [Math]::Max($IntervalSeconds, 0) },
    @{ f = 3; want = [Math]::Max($IntervalSeconds, 300) },
    @{ f = 4; want = [Math]::Max($IntervalSeconds, 600) },
    @{ f = 5; want = [Math]::Max($IntervalSeconds, 1800) },
    @{ f = 9; want = [Math]::Max($IntervalSeconds, 1800) }
  )
  $ok = $true
  foreach ($c in $cases) {
    $got = Get-BackoffSeconds $c.f $IntervalSeconds
    $pass = ($got -eq $c.want)
    if (-not $pass) { $ok = $false }
    Write-Host ("[selftest] fails=" + $c.f + " interval=" + $IntervalSeconds + "s -> " + $got + "s (want " + $c.want + ") " + $(if ($pass) { "OK" } else { "FAIL" }))
  }
  # Core assertion for S13-b: the schedule must reach the 30-minute (1800s) cap.
  $capReached = ((Get-BackoffSeconds 5 60) -eq 1800) -and ((Get-BackoffSeconds 99 60) -eq 1800)
  Write-Host ("[selftest] 30-min (1800s) cap reached at 5+ consecutive short fails: " + $(if ($capReached) { "YES" } else { "NO" }))

  # Deadline-stop reporting gate: only a persistent laned runner self-reports its deadline stop.
  $gateCases = @(
    @{ lane = ""; max = 0; want = $false },     # legacy no-lane loop: no lane row -> no report
    @{ lane = "ops"; max = 0; want = $true },   # persistent laned runner -> report the stop
    @{ lane = "ops"; max = 1; want = $false },  # one-shot planner/critic pass -> no spurious stop
    @{ lane = "data"; max = 5; want = $false }  # capped run -> no report
  )
  $gateOk = $true
  foreach ($g in $gateCases) {
    $got = Test-ShouldReportDeadlineStop $g.lane $g.max
    $pass = ($got -eq $g.want)
    if (-not $pass) { $gateOk = $false }
    Write-Host ("[selftest] deadline-stop gate lane='" + $g.lane + "' max=" + $g.max + " -> " + $got + " (want " + $g.want + ") " + $(if ($pass) { "OK" } else { "FAIL" }))
  }

  # Hot-swap gate: the runner exits cleanly (for the watchdog/launcher to relaunch the new code) ONLY
  # when its own script file genuinely changed on disk. Fail-safe: an empty/failed current hash, or no
  # launch baseline, must never trigger a restart (no restart loop on a transient read failure).
  $swapCases = @(
    @{ launch = "AAAA"; cur = "AAAA"; want = $false },  # unchanged -> keep running
    @{ launch = "AAAA"; cur = "BBBB"; want = $true },   # changed on disk -> relaunch new code
    @{ launch = "AAAA"; cur = "";     want = $false },  # unreadable now (locked mid-checkout) -> no restart loop
    @{ launch = "";     cur = "BBBB"; want = $false }   # no launch baseline -> never restart
  )
  $swapOk = $true
  foreach ($s in $swapCases) {
    $got = Test-ScriptChanged $s.launch $s.cur
    $pass = ($got -eq $s.want)
    if (-not $pass) { $swapOk = $false }
    Write-Host ("[selftest] hotswap launch='" + $s.launch + "' cur='" + $s.cur + "' -> " + $got + " (want " + $s.want + ") " + $(if ($pass) { "OK" } else { "FAIL" }))
  }

  # Wedge self-heal gate (X group): a positive iteration-timeout arms the monitor; <=0 disables it
  # (legacy infinite wait). Get-IterationWaitSeconds maps <=0 -> 0 (no monitor) and passes positives
  # through unchanged. Pure - no process is spawned here (the live plumbing is proven by -RehearseTimeout).
  $wedgeCases = @(
    @{ t = 5400; wantEnabled = $true;  wantWait = 5400 },  # default 90min -> armed
    @{ t = 7200; wantEnabled = $true;  wantWait = 7200 },  # explicit 2h -> armed, passthrough
    @{ t = 1;    wantEnabled = $true;  wantWait = 1 },     # any positive -> armed, passthrough
    @{ t = 0;    wantEnabled = $false; wantWait = 0 },     # disabled -> no monitor (legacy infinite wait)
    @{ t = -5;   wantEnabled = $false; wantWait = 0 }      # negative -> disabled (fail-safe)
  )
  $wedgeOk = $true
  foreach ($w in $wedgeCases) {
    $gotEnabled = Test-TimeoutMonitorEnabled $w.t
    $gotWait = Get-IterationWaitSeconds $w.t
    $pass = (($gotEnabled -eq $w.wantEnabled) -and ($gotWait -eq $w.wantWait))
    if (-not $pass) { $wedgeOk = $false }
    Write-Host ("[selftest] wedge timeout=" + $w.t + "s -> enabled=" + $gotEnabled + " wait=" + $gotWait + "s (want enabled=" + $w.wantEnabled + " wait=" + $w.wantWait + ") " + $(if ($pass) { "OK" } else { "FAIL" }))
  }
  # Stop-WedgeMonitor must be a safe no-op on a null handle (disabled path never leaks / never throws).
  $nullSafe = $true
  try { Stop-WedgeMonitor $null } catch { $nullSafe = $false }
  Write-Host ("[selftest] Stop-WedgeMonitor(null) no-op: " + $(if ($nullSafe) { "OK" } else { "FAIL" }))
  if (-not $nullSafe) { $wedgeOk = $false }

  # Wedge-vs-stale coupling (Y group): the wedge ceiling must stay below the reporter's StaleMinutes with
  # margin, so a maximally-wedged iteration refreshes the heartbeat BEFORE the reporter flags the lane
  # silently-dead (else a wedge = a FALSE "manual restart" alarm). Reporter StaleMinutes default = 120min
  # (loop-report-status.ps1); assert the SHIPPING default ceiling leaves >=15min headroom, and that the old
  # zero-headroom 7200s value would have been caught, and that a disabled monitor is exempt.
  $reporterStaleMin = 120   # keep in sync with loop-report-status.ps1 -StaleMinutes default
  $marginSec = 900          # >=15min: post-wedge heartbeat + prior-iteration tail must land before the boundary
  $yCases = @(
    @{ name = "shipping default ceiling (5400s/90min) is under 120min stale with headroom"; t = 5400; want = $true },
    @{ name = "old zero-headroom ceiling (7200s = stale) is REJECTED (the bug this fixes)";  t = 7200; want = $false },
    @{ name = "at the headroom boundary (6300s = stale-15min) is accepted";                  t = 6300; want = $true },
    @{ name = "just over the boundary (6301s) is rejected";                                  t = 6301; want = $false },
    @{ name = "disabled monitor (0, legacy infinite wait) is exempt - infinite hang is a real death"; t = 0; want = $true },
    @{ name = "disabled monitor (negative) is exempt";                                       t = -5; want = $true }
  )
  $yOk = $true
  foreach ($y in $yCases) {
    $got = Test-WedgeCeilingUnderStale $y.t $reporterStaleMin $marginSec
    $pass = ($got -eq $y.want)
    if (-not $pass) { $yOk = $false }
    Write-Host ("[selftest] wedge-vs-stale: " + $y.name + " -> " + $got + " (want " + $y.want + ") " + $(if ($pass) { "OK" } else { "FAIL" }))
  }
  # Guard the SHIPPING param default itself (not just an arbitrary input): the default must satisfy the invariant.
  $defaultCeilingOk = (Test-WedgeCeilingUnderStale $IterationTimeoutSeconds $reporterStaleMin $marginSec)
  Write-Host ("[selftest] shipping IterationTimeoutSeconds default (" + $IterationTimeoutSeconds + "s) is under " + $reporterStaleMin + "min stale with >=" + $marginSec + "s margin: " + $(if ($defaultCeilingOk) { "OK" } else { "FAIL" }))
  if (-not $defaultCeilingOk) { $yOk = $false }

  # Runner process-identity gate (RID group): the single-instance guard must count only a genuine -File
  # launch of loop-runner.ps1, never a -Command mention of the filename (an operator/agent diagnostic that
  # spoofs the liveness scan and makes a relaunched runner self-exit into a dead lane).
  $ridCases = @(
    @{ name = "bare -File launch (heal/persistent form) is a runner";        cl = 'powershell -NoProfile -ExecutionPolicy Bypass -File C:\r\loop-runner.ps1 -Lane data -RepoPath C:\r'; want = $true },
    @{ name = "quoted -File launch (spaced path) is a runner";               cl = 'powershell -File "C:\Program Files\r\loop-runner.ps1" -Lane seo';                          want = $true },
    @{ name = "one-shot -File launch (planner tag) is a runner";             cl = 'powershell -File C:\r\loop-runner.ps1 -Lane data-planner -MaxIterations 1';                want = $true },
    @{ name = "legacy -File launch (no -Lane) is a runner";                  cl = 'powershell -File C:\r\loop-runner.ps1 -IntervalSeconds 300';                              want = $true },
    @{ name = "a -Command MENTION of the filename is NOT a runner (spoof)";  cl = 'powershell -NoProfile -Command "gci | ? { $_.CommandLine -like ''*loop-runner.ps1*'' -and ''-Lane data'' }"'; want = $false },
    @{ name = "a watchdog -File launch is NOT a runner";                     cl = 'powershell -File C:\r\loop-watchdog.ps1 -SupersedePid 100';                               want = $false },
    @{ name = "empty command line is NOT a runner (null-safe)";              cl = "";                                                                                       want = $false }
  )
  $ridOk = $true
  foreach ($r in $ridCases) {
    $got = Test-IsRunnerProcess $r.cl
    $pass = ($got -eq $r.want)
    if (-not $pass) { $ridOk = $false }
    Write-Host ("[selftest] runner-id: " + $r.name + " -> " + $got + " (want " + $r.want + ") " + $(if ($pass) { "OK" } else { "FAIL" }))
  }

  if ($ok -and $capReached -and $gateOk -and $swapOk -and $wedgeOk -and $ridOk -and $yOk) { Write-Host "[selftest] PASS"; exit 0 } else { Write-Host "[selftest] FAIL"; exit 1 }
}

# Live rehearsal of the wedge-monitor plumbing against a DUMMY child (no claude / no usage), mirroring
# -RehearseCritic: proves the never-before-fired kill path actually kills a hung child, unblocks the pipe,
# and leaves a fast child untouched - before it must fire unattended on a real multi-hour hang. Uses the
# SAME Start-/Stop-WedgeMonitor functions the loop uses, only substituting a cmd/ping child for claude.
if ($RehearseTimeout) {
  Write-Host "[rehearse-timeout] exercising the wedge monitor against a dummy cmd child (no claude, no usage)"
  $allPass = $true

  # Case 1: a hung child must be force-killed within the bound and unblock the pipe (~seconds, not ~60s).
  $sent1 = Join-Path $env:TEMP ("loop-wedge-rehearse-kill-" + $PID + ".flag")
  Remove-Item -Force $sent1 -ErrorAction SilentlyContinue
  $t0 = Get-Date
  $job1 = Start-WedgeMonitor $PID 2 $sent1
  "x" | & cmd /c "ping -n 61 127.0.0.1 >nul" 2>&1 | Out-Null
  Stop-WedgeMonitor $job1
  $elapsed1 = ((Get-Date) - $t0).TotalSeconds
  $killed1 = Test-Path $sent1
  $unblocked1 = ($elapsed1 -lt 30)   # ~60s if the kill had NOT unblocked the pipe
  Remove-Item -Force $sent1 -ErrorAction SilentlyContinue
  $p1 = ($killed1 -and $unblocked1)
  if (-not $p1) { $allPass = $false }
  Write-Host ("[rehearse-timeout] KILL: sentinel=" + $killed1 + " elapsed=" + [Math]::Round($elapsed1, 1) + "s (<30 expected) " + $(if ($p1) { "OK" } else { "FAIL" }))

  # Case 2: a fast child completes normally -> no kill, no sentinel.
  $sent2 = Join-Path $env:TEMP ("loop-wedge-rehearse-pass-" + $PID + ".flag")
  Remove-Item -Force $sent2 -ErrorAction SilentlyContinue
  $job2 = Start-WedgeMonitor $PID 30 $sent2
  "x" | & cmd /c "ping -n 2 127.0.0.1 >nul" 2>&1 | Out-Null
  Stop-WedgeMonitor $job2
  $killed2 = Test-Path $sent2
  Remove-Item -Force $sent2 -ErrorAction SilentlyContinue
  $p2 = (-not $killed2)
  if (-not $p2) { $allPass = $false }
  Write-Host ("[rehearse-timeout] PASS-THROUGH: fast child, sentinel=" + $killed2 + " (expected False) " + $(if ($p2) { "OK" } else { "FAIL" }))

  # Case 3: disabled (<=0) -> no monitor job at all (legacy infinite wait preserved exactly).
  $job3 = Start-WedgeMonitor $PID 0 (Join-Path $env:TEMP "loop-wedge-rehearse-off.flag")
  $p3 = ($null -eq $job3)
  Stop-WedgeMonitor $job3
  if (-not $p3) { $allPass = $false }
  Write-Host ("[rehearse-timeout] DISABLED: timeout<=0 -> no monitor job (" + $(if ($p3) { "OK" } else { "FAIL" }) + ")")

  if ($allPass) { Write-Host "[rehearse-timeout] PASS"; exit 0 } else { Write-Host "[rehearse-timeout] FAIL"; exit 1 }
}

if (-not $RepoPath -or $RepoPath -eq "") { $RepoPath = (Get-Location).Path }
Set-Location $RepoPath
$laneTag = $Lane.Trim()
# Default prompt: lane-specific (loop-prompt-<lane>.txt) when present, else the shared file.
if ($PromptFile -eq "") {
  if ($laneTag -ne "") {
    $lanePrompt = Join-Path $RepoPath ("loop-prompt-" + $laneTag + ".txt")
    if (Test-Path $lanePrompt) { $PromptFile = $lanePrompt } else { $PromptFile = Join-Path $RepoPath "loop-prompt.txt" }
  } else {
    $PromptFile = Join-Path $RepoPath "loop-prompt.txt"
  }
}

$logDir = Join-Path $RepoPath "logs"
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }
$runStamp = Get-Date -Format "yyyyMMdd-HHmmss"
$logPrefix = if ($laneTag -ne "") { "loop-" + $laneTag + "-" } else { "loop-" }
$logFile = Join-Path $logDir ($logPrefix + $runStamp + ".log")

function Write-Log([string]$msg) {
  $line = "[" + (Get-Date -Format "yyyy-MM-dd HH:mm:ss") + "] " + $msg
  Write-Host $line
  try { Add-Content -Path $logFile -Value $line -Encoding UTF8 } catch {}
}

# Single-instance guard (PER LANE): exit immediately when another loop-runner.ps1 process
# for the SAME lane is already running, so a manual run and a Task Scheduler (logon-trigger)
# run never overlap within a lane. Different lanes (and the legacy no-lane loop) are allowed
# to run concurrently - that is what makes parallel multi-lane operation safe.
# A process scan is used instead of a lock file on purpose: a PC restart or crash leaves no
# stale lock to clear, and instances started before this guard existed are detected as well.
# Failure of the scan itself only warns (fail-open) so the resurrection path never deadlocks
# on a broken WMI service.
$conflictPids = @()
try {
  $running = @(Get-CimInstance Win32_Process -Filter "Name LIKE 'powershell%' OR Name LIKE 'pwsh%'" -ErrorAction Stop |
    Where-Object { $_.ProcessId -ne $PID -and (Test-IsRunnerProcess ([string]$_.CommandLine)) })
  foreach ($p in $running) {
    $cl = [string]$p.CommandLine
    $clHasLane = ($cl -match '(?i)-Lane(\s+|:|=)\S')
    if ($laneTag -eq "") {
      # Legacy (no lane): conflict only with another legacy runner (one that has no -Lane).
      if (-not $clHasLane) { $conflictPids += $p.ProcessId }
    } else {
      # Laned: conflict only with a runner started for the SAME lane name.
      $pat = '(?i)-Lane(\s+|:|=)["'']?' + [regex]::Escape($laneTag) + '(?=$|\s|["''])'
      if ($cl -match $pat) { $conflictPids += $p.ProcessId }
    }
  }
} catch {
  Write-Log ("WARN: single-instance scan failed (" + $_.Exception.Message + "); continuing without guard")
}
if ($conflictPids.Count -gt 0) {
  $laneLabel = if ($laneTag -ne "") { $laneTag } else { "(default/legacy)" }
  Write-Log ("GUARD: another loop-runner for lane '" + $laneLabel + "' is already running (PID " + ($conflictPids -join ", ") + "). Exiting to keep a single instance per lane.")
  exit 0
}

# Preflight checks.
$claudeResolved = $null
try { $claudeResolved = (Get-Command $ClaudeCmd -ErrorAction Stop).Source } catch {}
if (-not $claudeResolved) {
  Write-Log ("ERROR: Claude CLI '" + $ClaudeCmd + "' not found in PATH. Pass -ClaudeCmd with the full path, e.g. -ClaudeCmd '$env:APPDATA\npm\claude.cmd'")
  exit 1
}
if (-not (Test-Path $PromptFile)) {
  Write-Log ("ERROR: prompt file not found: " + $PromptFile)
  exit 1
}

$prompt = Get-Content -Raw -Encoding UTF8 -Path $PromptFile
# Baseline content hash of THIS script for the hot-swap check (see Test-ScriptChanged). Captured once at
# launch; each iteration compares the on-disk file to this so a runner-code fix pulled into the clone
# triggers a clean relaunch onto the new version instead of running stale code indefinitely.
$launchScriptHash = Get-ScriptHashSafe $PSCommandPath

# Self-report a genuine deadline stop into the ONE central docs/loop-status.md via
# loop-report-status.ps1. When UntilIso is reached the runner breaks and exits 0; historically that
# stop was logged only to this lane's PRIVATE log, so the owner's single watch-file kept showing the
# lane "running" with a FROZEN heartbeat and NO reason - the exact silent normal-stop O16 exists to kill
# (the launcher's loud stop banner only re-appears at the NEXT logon / 07:00 pass). There is no
# further claude iteration to run the per-iteration report step, so the runner reports the stop
# itself: a "stopped: deadline" note into the lane's own row, prompting the untilIso edit. The child
# powershell inherits $env:SAFE_AI_LOOP_STATUS (exported by the launcher) so it routes to the central
# file, exactly like the per-iteration reports. Non-fatal by design (never blocks shutdown).
function Report-DeadlineStop {
  if (-not (Test-ShouldReportDeadlineStop $laneTag $MaxIterations)) { return }
  $reporter = Join-Path $RepoPath "loop-report-status.ps1"
  if (-not (Test-Path $reporter)) { Write-Log ("deadline-stop report skipped: no reporter at " + $reporter); return }
  # Japanese note lives in loop-status-strings.txt (this .ps1 stays pure ASCII); ASCII fallback if
  # the strings file or key is missing, so the report is never blank.
  $note = "stopped: run deadline (untilIso " + $UntilIso + ") reached; edit loop-config.json untilIso and re-run launcher to resume"
  try {
    $sp = Join-Path $RepoPath "loop-status-strings.txt"
    if (Test-Path $sp) {
      foreach ($ln in (Get-Content -Encoding UTF8 -Path $sp)) {
        if ($ln -match '^\s*#') { continue }
        $i = $ln.IndexOf('=')
        if ($i -gt 0 -and $ln.Substring(0, $i) -eq 'runnerDeadlineStop') { $note = $ln.Substring($i + 1).Replace('{UNTIL}', $UntilIso); break }
      }
    }
  } catch {}
  try {
    Write-Log ("reporting deadline stop to central status (lane=" + $laneTag + ").")
    & powershell -NoProfile -ExecutionPolicy Bypass -File $reporter -Lane $laneTag -Note $note 2>&1 | Tee-Object -FilePath $logFile -Append | Out-Null
  } catch {
    Write-Log ("WARN: deadline-stop report failed (non-fatal): " + $_.Exception.Message)
  }
}

# Runner-emitted liveness heartbeat after EVERY iteration. Self-reporting must NOT depend on the agent
# running step5.5: observed live, seo and ux-records ran 30+ iterations, merged PRs, yet NEVER self-
# reported, so the per-lane health banner (#628/#631/#640) kept flagging two ALIVE, working lanes as
# unreported/born-dead - a FALSE silent-death alarm, the exact class those fixes exist to remove. After
# each iteration the runner refreshes its own lane row via loop-report-status.ps1 -HeartbeatOnly, which
# swaps ONLY the timestamp so a rich note the agent DID write survives, and for a never-reporting lane
# writes an honest "agent has not self-reported" row - turning the false alarm into an accurate "alive
# but not reporting" signal. Only for persistent laned runs (same gate as the deadline stop - never a
# one-shot planner/critic). The child powershell inherits $env:SAFE_AI_LOOP_STATUS so it routes to the
# central file, exactly like the per-iteration and deadline reports. Non-fatal by design.
function Report-Heartbeat {
  if (-not (Test-ShouldReportDeadlineStop $laneTag $MaxIterations)) { return }
  $reporter = Join-Path $RepoPath "loop-report-status.ps1"
  if (-not (Test-Path $reporter)) { return }
  try {
    & powershell -NoProfile -ExecutionPolicy Bypass -File $reporter -Lane $laneTag -HeartbeatOnly 2>&1 | Tee-Object -FilePath $logFile -Append | Out-Null
  } catch {
    Write-Log ("WARN: heartbeat report failed (non-fatal): " + $_.Exception.Message)
  }
}

$iter = 0
$consecutiveShortFails = 0
Write-Log ("=== loop-runner start (lane=" + $(if ($laneTag -ne "") { $laneTag } else { "(default)" }) + ", interval=" + $IntervalSeconds + "s, max=" + $MaxIterations + ", until='" + $UntilIso + "', repo=" + $RepoPath + ") ===")
Write-Log ("claude: " + $claudeResolved + " | model: " + $(if ($Model -ne "") { $Model } else { "(cli default)" }) + " | prompt: " + $PromptFile)
Write-Log ("log: " + $logFile)

while ($true) {
  $iter++
  if ($MaxIterations -gt 0 -and $iter -gt $MaxIterations) { Write-Log "MaxIterations reached. Stop."; break }
  if ($UntilIso -ne "") {
    try { if ((Get-Date) -ge [datetime]::Parse($UntilIso)) { Write-Log ("Deadline " + $UntilIso + " reached. Stop."); Report-DeadlineStop; break } } catch {}
  }

  # Re-read the per-iteration prompt so a pulled prompt edit (contract/model/steering changes) reaches
  # this long-lived runner WITHOUT a restart - the prompt was read once at launch, so a live runner used
  # a frozen prompt forever. Keep the last good prompt if the file is briefly unreadable or empty (e.g.
  # mid git-checkout) so a transient failure never sends a blank prompt to claude.
  try {
    $freshPrompt = Get-Content -Raw -Encoding UTF8 -Path $PromptFile -ErrorAction Stop
    if ($null -ne $freshPrompt -and $freshPrompt -ne "") { $prompt = $freshPrompt }
  } catch { Write-Log ("WARN: prompt re-read failed (keeping previous): " + $_.Exception.Message) }

  Write-Log ("----- iteration #" + $iter + " start -----")
  $claudeArgs = @("-p", "--dangerously-skip-permissions")
  if ($Model -ne "") { $claudeArgs += @("--model", $Model) }
  $iterStart = Get-Date
  $iterExit = $null
  # Arm the wedge monitor around the (otherwise unbounded) claude pipe. On a genuine multi-hour hang it
  # force-kills the claude tree so the pipe below unblocks; on the happy path it is Stop-Job'd in the
  # finally long before it fires, leaving the streaming invocation byte-identical to before.
  $wedgeSentinel = Join-Path $env:TEMP ("loop-wedge-" + $PID + "-" + $iter + ".flag")
  if (Test-Path $wedgeSentinel) { Remove-Item -Force $wedgeSentinel -ErrorAction SilentlyContinue }
  $wedgeJob = Start-WedgeMonitor $PID $IterationTimeoutSeconds $wedgeSentinel
  try {
    # Pipe the UTF-8 prompt to claude headless via stdin; tee output to the log.
    $prompt | & $ClaudeCmd @claudeArgs 2>&1 | Tee-Object -FilePath $logFile -Append
    $iterExit = $LASTEXITCODE
    Write-Log ("iteration #" + $iter + " done (exit=" + $iterExit + ")")
  } catch {
    Write-Log ("iteration #" + $iter + " exception: " + $_.Exception.Message)
  } finally {
    Stop-WedgeMonitor $wedgeJob
  }
  # If the monitor fired, the turn was a wedge: log LOUDLY and continue. The heartbeat below keeps the
  # lane's central-status row fresh (so the reporter does NOT escalate to the 4h "manual restart" banner),
  # and the next iteration re-reads the prompt (hot-swap) -> the runner self-heals with no human action.
  if (Test-Path $wedgeSentinel) {
    Write-Log ("!!! iteration #" + $iter + " WEDGE TIMEOUT: claude turn exceeded " + $IterationTimeoutSeconds + "s and its process tree was force-killed; runner continues (heartbeat + next iteration self-heal).")
    Remove-Item -Force $wedgeSentinel -ErrorAction SilentlyContinue
  }

  # Liveness heartbeat: keep this lane's central-status row honest (fresh timestamp; rich agent note
  # preserved) even when the agent skipped step5.5 this iteration. Non-fatal.
  Report-Heartbeat

  # Short-failure backoff: a non-zero exit (or exception) within 2 minutes of start
  # is treated as a fast failure (typically the usage limit). 3 in a row -> 5 min,
  # 4 -> 10 min, 5+ -> 30 min cap (see Get-BackoffSeconds). Success or a long-running
  # iteration resets it.
  $iterSeconds = ((Get-Date) - $iterStart).TotalSeconds
  $isShortFail = (($null -eq $iterExit) -or ($iterExit -ne 0)) -and ($iterSeconds -lt 120)
  if ($isShortFail) {
    $consecutiveShortFails++
  } else {
    if ($consecutiveShortFails -ge 3) {
      Write-Log ("backoff reset after " + $consecutiveShortFails + " consecutive short failures; normal interval restored")
    }
    $consecutiveShortFails = 0
  }

  if ($MaxIterations -gt 0 -and $iter -ge $MaxIterations) { Write-Log "MaxIterations reached. Stop."; break }
  if ($UntilIso -ne "") {
    try { if ((Get-Date) -ge [datetime]::Parse($UntilIso)) { Write-Log ("Deadline " + $UntilIso + " reached. Stop."); Report-DeadlineStop; break } } catch {}
  }
  # Hot-swap: if a fix to THIS script was pulled into the clone since launch, exit cleanly so the
  # watchdog (loop-watchdog.ps1) / next launcher pass relaunches the NEW code from the on-disk file. The
  # single-instance guard blocks a self-spawn (the new process would see this one still alive and exit),
  # so a clean exit + the existing -HealOnly resurrection path is the race-free way to upgrade a live
  # runner: once this process is gone the heal launch finds no conflict and starts the fresh version.
  # Checked BETWEEN iterations - the claude turn has fully ended and the tree is clean - so no work is in
  # flight. Only persistent laned runs (never a one-shot planner/critic), same gate as the heartbeat.
  if (Test-ShouldReportDeadlineStop $laneTag $MaxIterations) {
    $curScriptHash = Get-ScriptHashSafe $PSCommandPath
    if (Test-ScriptChanged $launchScriptHash $curScriptHash) {
      Write-Log ("self-update: loop-runner.ps1 changed on disk (launch=" + $launchScriptHash.Substring(0, [Math]::Min(8, $launchScriptHash.Length)) + " now=" + $curScriptHash.Substring(0, [Math]::Min(8, $curScriptHash.Length)) + "); exiting cleanly so the watchdog/launcher relaunches the new version.")
      break
    }
  }

  $waitSeconds = Get-BackoffSeconds $consecutiveShortFails $IntervalSeconds
  if ($consecutiveShortFails -ge 3) {
    Write-Log ("backoff engaged (" + $consecutiveShortFails + " consecutive short failures, likely usage limit): waiting " + $waitSeconds + "s before next iteration...")
  } else {
    Write-Log ("waiting " + $waitSeconds + "s before next iteration...")
  }
  Start-Sleep -Seconds $waitSeconds
}
Write-Log "=== loop-runner end ==="
