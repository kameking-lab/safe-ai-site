param(
  [string]$VoiceName = "Microsoft Haruka Desktop",
  [int]$Rate = -6
)

$ErrorActionPreference = "Stop"

$webRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$dataPath = Join-Path $webRoot "src\data\safety-seminars\fall-prevention.json"
$outputDir = Join-Path $webRoot "public\training\safety-seminars\fall-prevention\audio"
$tempDir = Join-Path $webRoot ".cache\fall-prevention-audio"

New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
New-Item -ItemType Directory -Force -Path $tempDir | Out-Null

Add-Type -AssemblyName System.Speech
$training = Get-Content -Raw -Encoding UTF8 -LiteralPath $dataPath | ConvertFrom-Json
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.SelectVoice($VoiceName)
$synth.Rate = $Rate
$synth.Volume = 100

foreach ($slide in $training.slides) {
  $number = "{0:D2}" -f [int]$slide.number
  $wavPath = Join-Path $tempDir "slide-$number.wav"
  $mp3Path = Join-Path $outputDir "slide-$number.mp3"
  $synth.SetOutputToWaveFile($wavPath)
  $synth.Speak([string]$slide.narration)
  $synth.SetOutputToNull()
  & ffmpeg -hide_banner -loglevel error -y -i $wavPath -ac 1 -ar 24000 -b:a 48k $mp3Path
  if ($LASTEXITCODE -ne 0) { throw "ffmpeg failed for slide $number" }
  Write-Output $mp3Path
}

$synth.Dispose()
Remove-Item -LiteralPath $tempDir -Recurse -Force
