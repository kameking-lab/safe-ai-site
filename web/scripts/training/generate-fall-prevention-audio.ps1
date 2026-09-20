param(
  [ValidateSet("fall-prevention", "ai-chat-work", "all")]
  [string]$TrainingId = "all"
)

$ErrorActionPreference = "Stop"
$generator = Join-Path $PSScriptRoot "generate-training-aivis-audio.py"
& py -3.12 $generator --training $TrainingId
if ($LASTEXITCODE -ne 0) { throw "AivisSpeech training audio generation failed" }
