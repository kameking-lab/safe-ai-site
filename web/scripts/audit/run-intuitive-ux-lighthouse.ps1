param(
  [Parameter(Mandatory = $true)]
  [int]$ServerPid,
  [string]$BaseUrl = "http://127.0.0.1:3320",
  [string]$EvidenceRoot = "../docs/audits/evidence/intuitive-ux-heat-first-2026-07-29/lighthouse-runs",
  [string]$PageIds = "home,heat-hub,ky,chemical-ra,automation"
)

$ErrorActionPreference = "Stop"
$env:LIGHTHOUSE_BASE_URL = $BaseUrl
$env:LIGHTHOUSE_EVIDENCE_ROOT = $EvidenceRoot
$env:LIGHTHOUSE_RUN_KIND = "final"
$env:LIGHTHOUSE_PAGE_IDS = $PageIds
$env:LIGHTHOUSE_PROFILES = "mobile,desktop"
$env:LIGHTHOUSE_RUNS_PER_PROFILE = "3"
$env:LIGHTHOUSE_ATTEMPTS_PER_RUN = "2"
$env:LIGHTHOUSE_SERVER_COMMAND =
  "node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3320"
$env:LIGHTHOUSE_SERVER_PID = [string]$ServerPid

node scripts/audit/best-in-class-lighthouse.mjs
exit $LASTEXITCODE
