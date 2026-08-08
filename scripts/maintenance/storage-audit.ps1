[CmdletBinding()]
param(
    [switch]$Json
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = 'Stop'

function Resolve-RepositoryRoot {
    $candidate = [System.IO.Path]::GetFullPath((Join-Path -Path $PSScriptRoot -ChildPath '..\..'))
    if (-not (Test-Path -LiteralPath (Join-Path -Path $candidate -ChildPath '.git'))) {
        throw "The script location is not inside a Git repository: $candidate"
    }

    $gitRootOutput = @(& git -C $candidate rev-parse --show-toplevel 2>$null)
    if ($LASTEXITCODE -ne 0 -or $gitRootOutput.Count -eq 0) {
        throw "Unable to resolve the Git repository root from: $candidate"
    }

    $gitRoot = [System.IO.Path]::GetFullPath([string]$gitRootOutput[0])
    if (-not [string]::Equals(
        $candidate.TrimEnd('\', '/'),
        $gitRoot.TrimEnd('\', '/'),
        [System.StringComparison]::OrdinalIgnoreCase
    )) {
        throw "Script root and Git root differ. Script: $candidate Git: $gitRoot"
    }

    return $gitRoot.TrimEnd('\', '/')
}

function Test-IsReparsePoint {
    param([Parameter(Mandatory = $true)][System.IO.FileSystemInfo]$Item)

    return (($Item.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0)
}

function Get-CategoryNames {
    param(
        [Parameter(Mandatory = $true)]
        [AllowEmptyString()]
        [string]$RelativePath
    )

    $normalized = $RelativePath.Replace('\', '/').Trim('/')
    $lower = $normalized.ToLowerInvariant()
    $segments = @()
    if ($lower.Length -gt 0) {
        $segments = @($lower.Split('/'))
    }

    $names = New-Object 'System.Collections.Generic.HashSet[string]' ([System.StringComparer]::OrdinalIgnoreCase)
    [void]$names.Add('repository')

    if ($segments.Count -gt 0 -and $segments[0] -eq '.git') {
        [void]$names.Add('git')
    }
    if ($segments -contains 'node_modules') {
        [void]$names.Add('node_modules')
    }
    if ($segments -contains '.next') {
        [void]$names.Add('next')
    }
    if ($lower -eq 'docs/audits' -or $lower.StartsWith('docs/audits/')) {
        [void]$names.Add('docs_audits')
    }
    if ($lower -eq 'docs/audits/evidence' -or $lower.StartsWith('docs/audits/evidence/')) {
        [void]$names.Add('docs_audits_evidence')
    }

    $isTestOutput = $false
    $isInternalDependencyOrGit = (
        ($segments.Count -gt 0 -and $segments[0] -eq '.git') -or
        ($segments -contains 'node_modules')
    )
    $isRuntimeScreenshot = $lower -eq 'web/public/screenshots' -or $lower.StartsWith('web/public/screenshots/')
    foreach ($segment in $segments) {
        if ($isInternalDependencyOrGit -or $isRuntimeScreenshot) {
            break
        }
        if (
            $segment -eq 'coverage' -or
            $segment -eq 'playwright-report' -or
            $segment.StartsWith('playwright-report-') -or
            $segment -eq 'test-results' -or
            $segment.StartsWith('test-results-') -or
            $segment -eq 'screenshots' -or
            $segment -eq 'trace' -or
            $segment -eq 'traces' -or
            $segment -eq 'videos' -or
            $segment -eq 'lighthouse-raw' -or
            $segment -eq 'lighthouse-trace' -or
            $segment -eq '.lighthouseci' -or
            $segment -eq 'logs' -or
            $segment -eq 'tmp' -or
            $segment -eq 'temp' -or
            $segment -eq '.tmp' -or
            $segment -eq 'cache' -or
            $segment -eq '.cache' -or
            $segment -eq '.turbo'
        ) {
            $isTestOutput = $true
            break
        }
    }
    if (-not $isTestOutput -and $lower -match '(^|/)\.vercel/output(/|$)') {
        $isTestOutput = $true
    }
    if ($isTestOutput) {
        [void]$names.Add('test_and_generated_outputs')
    }

    $result = @()
    foreach ($name in $names) {
        $result += $name
    }
    return $result
}

function New-MetricTable {
    $table = @{}
    foreach ($name in @(
        'repository',
        'git',
        'node_modules',
        'next',
        'docs_audits',
        'docs_audits_evidence',
        'test_and_generated_outputs'
    )) {
        $table[$name] = @{
            Bytes = [int64]0
            FileCount = [int64]0
            DirectoryCount = [int64]0
        }
    }
    return $table
}

function Measure-RepositoryTree {
    param([Parameter(Mandatory = $true)][string]$Root)

    $metrics = New-MetricTable
    $stack = New-Object 'System.Collections.Generic.Stack[string]'
    $stack.Push($Root)
    $skippedReparsePoints = [int64]0
    $readErrors = [int64]0

    while ($stack.Count -gt 0) {
        $currentPath = $stack.Pop()
        try {
            $currentItem = Get-Item -LiteralPath $currentPath -Force -ErrorAction Stop
            if ($currentPath -ne $Root -and (Test-IsReparsePoint -Item $currentItem)) {
                $skippedReparsePoints++
                continue
            }

            $relativeDirectory = ''
            if ($currentPath.Length -gt $Root.Length) {
                $relativeDirectory = $currentPath.Substring($Root.Length).TrimStart('\', '/')
            }
            foreach ($category in @(Get-CategoryNames -RelativePath $relativeDirectory)) {
                $metrics[$category].DirectoryCount++
            }

            $children = @(Get-ChildItem -LiteralPath $currentPath -Force -ErrorAction Stop)
            foreach ($child in $children) {
                if (Test-IsReparsePoint -Item $child) {
                    $skippedReparsePoints++
                    continue
                }
                if ($child.PSIsContainer) {
                    $stack.Push($child.FullName)
                    continue
                }

                $relativeFile = $child.FullName.Substring($Root.Length).TrimStart('\', '/')
                foreach ($category in @(Get-CategoryNames -RelativePath $relativeFile)) {
                    $metrics[$category].FileCount++
                    $metrics[$category].Bytes += [int64]$child.Length
                }
            }
        }
        catch {
            $readErrors++
        }
    }

    return [pscustomobject]@{
        Metrics = $metrics
        SkippedReparsePoints = $skippedReparsePoints
        ReadErrors = $readErrors
    }
}

function Measure-UntrackedFiles {
    param([Parameter(Mandatory = $true)][string]$Root)

    $paths = @(& git -c core.quotepath=false -C $Root ls-files --others --exclude-standard)
    if ($LASTEXITCODE -ne 0) {
        throw 'git ls-files failed while measuring untracked files.'
    }

    $rootPrefix = $Root.TrimEnd('\', '/') + [System.IO.Path]::DirectorySeparatorChar
    $fileCount = [int64]0
    $bytes = [int64]0
    $missingCount = [int64]0

    foreach ($relativePath in $paths) {
        if ([string]::IsNullOrEmpty([string]$relativePath)) {
            continue
        }

        $fullPath = [System.IO.Path]::GetFullPath((Join-Path -Path $Root -ChildPath ([string]$relativePath)))
        if (-not $fullPath.StartsWith($rootPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
            throw "Git returned an untracked path outside the repository: $relativePath"
        }

        if (-not (Test-Path -LiteralPath $fullPath -PathType Leaf)) {
            $missingCount++
            continue
        }
        $item = Get-Item -LiteralPath $fullPath -Force
        if (Test-IsReparsePoint -Item $item) {
            continue
        }
        $fileCount++
        $bytes += [int64]$item.Length
    }

    return [pscustomobject]@{
        Bytes = $bytes
        FileCount = $fileCount
        MissingCount = $missingCount
    }
}

$repositoryRoot = Resolve-RepositoryRoot
$tree = Measure-RepositoryTree -Root $repositoryRoot
$untracked = Measure-UntrackedFiles -Root $repositoryRoot

$orderedNames = @(
    'repository',
    'git',
    'node_modules',
    'next',
    'docs_audits',
    'docs_audits_evidence',
    'test_and_generated_outputs'
)
$measurements = @()
foreach ($name in $orderedNames) {
    $metric = $tree.Metrics[$name]
    $measurements += [pscustomobject]@{
        Name = $name
        Bytes = [int64]$metric.Bytes
        FileCount = [int64]$metric.FileCount
        DirectoryCount = [int64]$metric.DirectoryCount
    }
}
$measurements += [pscustomobject]@{
    Name = 'untracked'
    Bytes = [int64]$untracked.Bytes
    FileCount = [int64]$untracked.FileCount
    DirectoryCount = [int64]0
}

$result = [pscustomobject]@{
    GeneratedAtUtc = [DateTime]::UtcNow.ToString('o')
    RepositoryRoot = $repositoryRoot
    Measurements = $measurements
    SkippedReparsePoints = [int64]$tree.SkippedReparsePoints
    ReadErrors = [int64]$tree.ReadErrors
    MissingUntrackedFiles = [int64]$untracked.MissingCount
}

if ($Json) {
    $result | ConvertTo-Json -Depth 5
}
else {
    "Repository: $repositoryRoot"
    $measurements | Format-Table -AutoSize Name, Bytes, FileCount, DirectoryCount
    "Skipped reparse points: $($result.SkippedReparsePoints)"
    "Read errors: $($result.ReadErrors)"
    "Missing untracked files: $($result.MissingUntrackedFiles)"
}
