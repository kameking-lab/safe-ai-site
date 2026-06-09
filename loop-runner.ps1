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
  UTF-8 file with the per-iteration instruction (default loop-prompt.txt next to this script).

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\loop-runner.ps1

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\loop-runner.ps1 -IntervalSeconds 300 -UntilIso "2026-06-09T09:13:00"
#>
[CmdletBinding()]
param(
  [int]$IntervalSeconds = 120,
  [int]$MaxIterations = 0,
  [string]$UntilIso = "",
  [string]$RepoPath = $PSScriptRoot,
  [string]$ClaudeCmd = "claude",
  [string]$Model = "claude-fable-5",
  [string]$PromptFile = ""
)

$ErrorActionPreference = "Continue"
# Send UTF-8 (no BOM) to native commands so the Japanese prompt reaches claude intact.
$OutputEncoding = New-Object System.Text.UTF8Encoding $false
try { [Console]::OutputEncoding = New-Object System.Text.UTF8Encoding $false } catch {}

if (-not $RepoPath -or $RepoPath -eq "") { $RepoPath = (Get-Location).Path }
Set-Location $RepoPath
if ($PromptFile -eq "") { $PromptFile = Join-Path $RepoPath "loop-prompt.txt" }

$logDir = Join-Path $RepoPath "logs"
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }
$runStamp = Get-Date -Format "yyyyMMdd-HHmmss"
$logFile = Join-Path $logDir ("loop-" + $runStamp + ".log")

function Write-Log([string]$msg) {
  $line = "[" + (Get-Date -Format "yyyy-MM-dd HH:mm:ss") + "] " + $msg
  Write-Host $line
  try { Add-Content -Path $logFile -Value $line -Encoding UTF8 } catch {}
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

$iter = 0
Write-Log ("=== loop-runner start (interval=" + $IntervalSeconds + "s, max=" + $MaxIterations + ", until='" + $UntilIso + "', repo=" + $RepoPath + ") ===")
Write-Log ("claude: " + $claudeResolved + " | model: " + $(if ($Model -ne "") { $Model } else { "(cli default)" }) + " | prompt: " + $PromptFile)
Write-Log ("log: " + $logFile)

while ($true) {
  $iter++
  if ($MaxIterations -gt 0 -and $iter -gt $MaxIterations) { Write-Log "MaxIterations reached. Stop."; break }
  if ($UntilIso -ne "") {
    try { if ((Get-Date) -ge [datetime]::Parse($UntilIso)) { Write-Log ("Deadline " + $UntilIso + " reached. Stop."); break } } catch {}
  }

  Write-Log ("----- iteration #" + $iter + " start -----")
  $claudeArgs = @("-p", "--dangerously-skip-permissions")
  if ($Model -ne "") { $claudeArgs += @("--model", $Model) }
  try {
    # Pipe the UTF-8 prompt to claude headless via stdin; tee output to the log.
    $prompt | & $ClaudeCmd @claudeArgs 2>&1 | Tee-Object -FilePath $logFile -Append
    Write-Log ("iteration #" + $iter + " done (exit=" + $LASTEXITCODE + ")")
  } catch {
    Write-Log ("iteration #" + $iter + " exception: " + $_.Exception.Message)
  }

  if ($MaxIterations -gt 0 -and $iter -ge $MaxIterations) { Write-Log "MaxIterations reached. Stop."; break }
  if ($UntilIso -ne "") {
    try { if ((Get-Date) -ge [datetime]::Parse($UntilIso)) { Write-Log ("Deadline " + $UntilIso + " reached. Stop."); break } } catch {}
  }
  Write-Log ("waiting " + $IntervalSeconds + "s before next iteration...")
  Start-Sleep -Seconds $IntervalSeconds
}
Write-Log "=== loop-runner end ==="
