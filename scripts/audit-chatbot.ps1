$ErrorActionPreference = "Continue"
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()

$queriesFile = Join-Path $PSScriptRoot "chatbot-queries.txt"
$queries = @()
foreach ($line in (Get-Content -Path $queriesFile -Encoding UTF8)) {
  $s = [string]$line
  if ($s.Trim() -ne "") { $queries += $s }
}

$url = "https://www.anzen-ai-portal.jp/api/chatbot"
$i = 0
foreach ($q in $queries) {
  $i++
  $qStr = [string]$q
  $payload = @{ message = $qStr } | ConvertTo-Json -Compress
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($payload)
  $tmpFile = [System.IO.Path]::GetTempFileName()
  [System.IO.File]::WriteAllBytes($tmpFile, $bytes)
  $resp = & curl.exe -s -X POST $url -H "Content-Type: application/json; charset=utf-8" --data-binary "@$tmpFile" --max-time 60
  Remove-Item $tmpFile -ErrorAction SilentlyContinue
  if (-not $resp) {
    Write-Output ("Q{0} [{1}] EMPTY_RESPONSE" -f $i, $qStr)
    Write-Output ""
    continue
  }
  try {
    $j = $resp | ConvertFrom-Json
    $conf = $j.confidence
    $confScore = $j.confidenceScore
    $sourceType = $j.source_type
    $srcCount = if ($j.sources) { $j.sources.Count } else { 0 }
    $firstSrcLaw = if ($j.sources -and $j.sources.Count -gt 0) { "$($j.sources[0].law) $($j.sources[0].article)" } else { "(none)" }
    $answerLen = if ($j.answer) { $j.answer.Length } else { 0 }
    $answer = $j.answer -replace "`r?`n", " | "
    $answerPrefix = if ($answer) { $answer.Substring(0, [Math]::Min(180, $answer.Length)) } else { "" }
    Write-Output ("Q{0} [{1}]" -f $i, $qStr)
    Write-Output ("  type={0} conf={1} score={2} srcs={3} first={4}" -f $sourceType, $conf, $confScore, $srcCount, $firstSrcLaw)
    Write-Output ("  ans({0}): {1}" -f $answerLen, $answerPrefix)
  } catch {
    $rprefix = $resp.Substring(0, [Math]::Min(300, $resp.Length))
    Write-Output ("Q{0} [{1}] PARSE_ERR: {2}" -f $i, $qStr, $rprefix)
  }
  Write-Output ""
}
