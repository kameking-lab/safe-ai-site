# PPTX → JPG 画像化（PowerPoint COM 経由）
# Usage: pwsh -File scripts/pptx-to-images.ps1 -Pptx <path> -OutDir <dir> [-Width 1600]

param(
    [Parameter(Mandatory = $true)][string]$Pptx,
    [Parameter(Mandatory = $true)][string]$OutDir,
    [int]$Width = 1600
)

$ErrorActionPreference = "Stop"

$pptxAbs = (Resolve-Path $Pptx).Path
if (-not (Test-Path $OutDir)) {
    New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
}
$outAbs = (Resolve-Path $OutDir).Path

Write-Host "[export] $pptxAbs -> $outAbs (width=$Width)"

$ppt = New-Object -ComObject PowerPoint.Application
try {
    $pres = $ppt.Presentations.Open($pptxAbs, $true, $false, $false)  # ReadOnly, Untitled=false, WithWindow=false
    $count = $pres.Slides.Count
    # 16:9 に比例した高さ
    $height = [int]([math]::Round($Width * 9 / 16))
    for ($i = 1; $i -le $count; $i++) {
        $slide = $pres.Slides.Item($i)
        $outPath = Join-Path $outAbs ("slide-{0:D2}.jpg" -f $i)
        $slide.Export($outPath, "JPG", $Width, $height) | Out-Null
        Write-Host "  slide $i -> $outPath"
    }
    $pres.Close()
}
finally {
    $ppt.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($ppt) | Out-Null
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
}

Write-Host "[done] exported $count slide(s)"
