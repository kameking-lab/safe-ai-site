[CmdletBinding()]
param(
    [switch]$Apply,
    [ValidateRange(1, 3650)]
    [int]$EvidenceRetentionDays = 7,
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

function Assert-SafePath {
    param(
        [Parameter(Mandatory = $true)][string]$Root,
        [Parameter(Mandatory = $true)][string]$Path
    )

    $rootFull = [System.IO.Path]::GetFullPath($Root).TrimEnd('\', '/')
    $pathFull = [System.IO.Path]::GetFullPath($Path).TrimEnd('\', '/')
    $rootPrefix = $rootFull + [System.IO.Path]::DirectorySeparatorChar
    if (
        [string]::Equals($rootFull, $pathFull, [System.StringComparison]::OrdinalIgnoreCase) -or
        -not $pathFull.StartsWith($rootPrefix, [System.StringComparison]::OrdinalIgnoreCase)
    ) {
        throw "Refusing a path that is not a child of the repository: $Path"
    }

    $cursor = $pathFull
    while (-not [string]::Equals($cursor, $rootFull, [System.StringComparison]::OrdinalIgnoreCase)) {
        if (Test-Path -LiteralPath $cursor) {
            $item = Get-Item -LiteralPath $cursor -Force
            if (Test-IsReparsePoint -Item $item) {
                throw "Refusing a path that contains a reparse point: $Path"
            }
        }
        $parent = [System.IO.Directory]::GetParent($cursor)
        if ($null -eq $parent) {
            throw "Unable to validate repository ancestry for: $Path"
        }
        $cursor = $parent.FullName.TrimEnd('\', '/')
    }

    return $pathFull
}

function Convert-ToGitPath {
    param(
        [Parameter(Mandatory = $true)][string]$Root,
        [Parameter(Mandatory = $true)][string]$Path
    )

    $safePath = Assert-SafePath -Root $Root -Path $Path
    return $safePath.Substring($Root.Length).TrimStart('\', '/').Replace('\', '/')
}

function Test-DirectoryContainsTrackedFiles {
    param(
        [Parameter(Mandatory = $true)][string]$Root,
        [Parameter(Mandatory = $true)][string]$Path
    )

    $relativePath = Convert-ToGitPath -Root $Root -Path $Path
    $tracked = @(& git -c core.quotepath=false -C $Root ls-files -- "$relativePath/")
    if ($LASTEXITCODE -ne 0) {
        throw "git ls-files failed while checking: $relativePath"
    }
    return ($tracked.Count -gt 0)
}

function Get-DirectoryMeasurement {
    param([Parameter(Mandatory = $true)][string]$Path)

    $fileCount = [int64]0
    $directoryCount = [int64]0
    $bytes = [int64]0
    $containsSensitiveEntry = $false
    $protectedReasons = New-Object 'System.Collections.Generic.HashSet[string]' ([System.StringComparer]::OrdinalIgnoreCase)
    $rootName = (Split-Path -Leaf $Path).ToLowerInvariant()
    $isGenericOutput = $rootName -in @('logs', 'tmp', 'temp', '.tmp', 'cache', '.cache')
    $stack = New-Object 'System.Collections.Generic.Stack[string]'
    $stack.Push($Path)

    while ($stack.Count -gt 0) {
        $current = $stack.Pop()
        $directoryCount++
        foreach ($child in @(Get-ChildItem -LiteralPath $current -Force -ErrorAction Stop)) {
            if (Test-IsReparsePoint -Item $child) {
                $containsSensitiveEntry = $true
                [void]$protectedReasons.Add('reparse point')
                continue
            }
            if ($child.PSIsContainer) {
                if ($child.Name.ToLowerInvariant() -eq '.git') {
                    $containsSensitiveEntry = $true
                    [void]$protectedReasons.Add('nested Git metadata')
                    continue
                }
                if ($isGenericOutput -and $child.Name.ToLowerInvariant() -in @(
                    'src', 'public', 'data', 'prisma', 'schema', 'schemas',
                    'migration', 'migrations', 'laws-fulltext'
                )) {
                    $containsSensitiveEntry = $true
                    [void]$protectedReasons.Add('source or runtime directory')
                    continue
                }
                $stack.Push($child.FullName)
            }
            else {
                $fileCount++
                $bytes += [int64]$child.Length

                $lowerName = $child.Name.ToLowerInvariant()
                $lowerExtension = $child.Extension.ToLowerInvariant()
                if (
                    $lowerName -eq '.env' -or
                    $lowerName.StartsWith('.env.') -or
                    $lowerExtension -eq '.pem' -or
                    $lowerExtension -eq '.key' -or
                    $lowerExtension -eq '.pfx' -or
                    $lowerExtension -eq '.p12' -or
                    $lowerExtension -eq '.cer' -or
                    $lowerExtension -eq '.crt'
                ) {
                    $containsSensitiveEntry = $true
                    [void]$protectedReasons.Add('environment, certificate, or key file')
                }
                if ($lowerName -eq '.git') {
                    $containsSensitiveEntry = $true
                    [void]$protectedReasons.Add('nested Git metadata')
                }
                if ($isGenericOutput -and (
                    $lowerExtension -in @(
                        '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
                        '.css', '.scss', '.sass', '.less', '.md', '.mdx',
                        '.json', '.yaml', '.yml', '.toml', '.xml', '.prisma',
                        '.sql', '.sqlite', '.sqlite3', '.db',
                        '.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.ico'
                    ) -or
                    $lowerName -in @(
                        'package.json', 'package-lock.json', 'tsconfig.json',
                        'next.config.js', 'next.config.mjs', 'next.config.ts'
                    )
                )) {
                    $containsSensitiveEntry = $true
                    [void]$protectedReasons.Add('source, runtime data, asset, or configuration file in a generic output directory')
                }
            }
        }
    }

    return [pscustomobject]@{
        Bytes = $bytes
        FileCount = $fileCount
        DirectoryCount = $directoryCount
        ContainsSensitiveEntry = $containsSensitiveEntry
        ProtectedReasons = @($protectedReasons)
    }
}

function Test-IsAllowedOutputDirectoryName {
    param([Parameter(Mandatory = $true)][string]$Name)

    $lower = $Name.ToLowerInvariant()
    if ($lower -in @(
        '.next',
        'out',
        'build',
        'dist',
        'coverage',
        'playwright-report',
        'screenshots',
        'trace',
        'traces',
        'videos',
        'logs',
        'tmp',
        'temp',
        '.tmp',
        'cache',
        '.cache',
        '.turbo',
        '.lighthouseci',
        'lighthouse-results',
        'audit-out',
        '.bench',
        '.genquality',
        '.loop-eval',
        '.r4-screens',
        '.r8-screens',
        '.maintenance-snapshots',
        'local-snapshots',
        'benchmark-output',
        '.benchmark-output'
    )) {
        return $true
    }

    if ($lower -match '^test-results(?:-.+)?$') {
        return $true
    }
    if ($lower -match '^playwright-report(?:-.+)?$') {
        return $true
    }
    if ($lower -match '^lighthouse-(?:raw|trace)(?:-.+)?$') {
        return $true
    }
    return $false
}

function Get-GeneratedDirectoryCandidates {
    param([Parameter(Mandatory = $true)][string]$Root)

    $parents = @($Root)
    $webRoot = Join-Path -Path $Root -ChildPath 'web'
    if (Test-Path -LiteralPath $webRoot -PathType Container) {
        $parents += $webRoot
    }

    $candidates = New-Object 'System.Collections.Generic.List[string]'
    foreach ($parent in $parents) {
        $safeParent = if ([string]::Equals($parent, $Root, [System.StringComparison]::OrdinalIgnoreCase)) {
            $Root
        }
        else {
            Assert-SafePath -Root $Root -Path $parent
        }
        foreach ($directory in @(Get-ChildItem -LiteralPath $safeParent -Force -Directory -ErrorAction Stop)) {
            if ((Test-IsAllowedOutputDirectoryName -Name $directory.Name) -and -not (Test-IsReparsePoint -Item $directory)) {
                [void]$candidates.Add($directory.FullName)
            }
        }

        $vercelOutput = Join-Path -Path $safeParent -ChildPath '.vercel\output'
        if (Test-Path -LiteralPath $vercelOutput -PathType Container) {
            [void]$candidates.Add((Assert-SafePath -Root $Root -Path $vercelOutput))
        }
    }

    return @($candidates | Sort-Object -Unique)
}

function Get-UntrackedEvidencePaths {
    param([Parameter(Mandatory = $true)][string]$Root)

    $evidenceRoot = Join-Path -Path $Root -ChildPath 'docs\audits\evidence'
    if (-not (Test-Path -LiteralPath $evidenceRoot -PathType Container)) {
        return @()
    }

    $relativeEvidenceRoot = 'docs/audits/evidence'
    $normalUntracked = @(& git -c core.quotepath=false -C $Root ls-files --others --exclude-standard -- $relativeEvidenceRoot)
    if ($LASTEXITCODE -ne 0) {
        throw 'git ls-files failed while listing untracked evidence.'
    }
    $ignoredUntracked = @(& git -c core.quotepath=false -C $Root ls-files --others --ignored --exclude-standard -- $relativeEvidenceRoot)
    if ($LASTEXITCODE -ne 0) {
        throw 'git ls-files failed while listing ignored evidence.'
    }

    return @($normalUntracked + $ignoredUntracked | Sort-Object -Unique)
}

function Get-EmptyEvidenceDirectoryCandidates {
    param(
        [Parameter(Mandatory = $true)][string]$Root,
        [Parameter(Mandatory = $true)]
        [AllowEmptyCollection()]
        [string[]]$ScheduledFilePaths
    )

    $evidenceRoot = Join-Path -Path $Root -ChildPath 'docs\audits\evidence'
    if (-not (Test-Path -LiteralPath $evidenceRoot -PathType Container)) {
        return @()
    }

    $scheduled = New-Object 'System.Collections.Generic.HashSet[string]' ([System.StringComparer]::OrdinalIgnoreCase)
    foreach ($path in $ScheduledFilePaths) {
        [void]$scheduled.Add([System.IO.Path]::GetFullPath($path))
    }
    $empty = New-Object 'System.Collections.Generic.HashSet[string]' ([System.StringComparer]::OrdinalIgnoreCase)
    $result = New-Object 'System.Collections.Generic.List[string]'
    $directories = @(Get-ChildItem -LiteralPath $evidenceRoot -Recurse -Force -Directory -ErrorAction Stop |
        Where-Object { -not (Test-IsReparsePoint -Item $_) } |
        Sort-Object { $_.FullName.Length } -Descending)

    foreach ($directory in $directories) {
        $canRemove = $true
        foreach ($child in @(Get-ChildItem -LiteralPath $directory.FullName -Force -ErrorAction Stop)) {
            if (Test-IsReparsePoint -Item $child) {
                $canRemove = $false
                break
            }
            if ($child.PSIsContainer) {
                if (-not $empty.Contains($child.FullName)) {
                    $canRemove = $false
                    break
                }
            }
            elseif (-not $scheduled.Contains($child.FullName)) {
                $canRemove = $false
                break
            }
        }
        if ($canRemove) {
            [void]$empty.Add($directory.FullName)
            [void]$result.Add($directory.FullName)
        }
    }

    return $result.ToArray()
}

function Test-IsRawEvidence {
    param(
        [Parameter(Mandatory = $true)][string]$RelativePath,
        [Parameter(Mandatory = $true)][System.IO.FileInfo]$Item,
        [Parameter(Mandatory = $true)][DateTime]$CutoffUtc
    )

    if ($Item.LastWriteTimeUtc -ge $CutoffUtc) {
        return $false
    }

    $normalized = $RelativePath.Replace('\', '/').ToLowerInvariant()
    $isProtectedLegalSource = (
        $normalized -match '(^|/)(external-sources?|official-sources?)(/|$)' -or
        $normalized -match '(^|/)[^/]*(law|legal|official)[-_ ]sources?[^/]*(/|$)' -or
        $normalized -match '(^|/)[^/]*sources?[-_ ]snapshots?[^/]*(/|$)' -or
        $normalized -match '(^|/)[^/]*sources?[-_ ](hash|checksum|manifest)[^/]*(/|$)'
    )
    $isProtectedRollback = $normalized -match '(^|/)[^/]*rollback[^/]*(/|$)'
    if ($isProtectedLegalSource -or $isProtectedRollback) {
        return $false
    }
    if ($Item.Name -eq '.env' -or $Item.Name.ToLowerInvariant().StartsWith('.env.')) {
        return $false
    }
    if ($Item.Extension.ToLowerInvariant() -in @('.pem', '.key', '.pfx', '.p12', '.cer', '.crt')) {
        return $false
    }

    # Anything untracked under the evidence root is local evidence. Once it is
    # older than the retention window, only verified legal-source material and
    # rollback records remain eligible for protection; current summaries belong
    # in the tracked current-state files instead of this raw store.
    return $true
}

$repositoryRoot = Resolve-RepositoryRoot
$mode = if ($Apply) { 'apply' } else { 'dry-run' }
$cutoffUtc = [DateTime]::UtcNow.AddDays(-1 * $EvidenceRetentionDays)
$targets = New-Object 'System.Collections.Generic.List[object]'
$skipped = New-Object 'System.Collections.Generic.List[object]'

foreach ($directoryPath in @(Get-GeneratedDirectoryCandidates -Root $repositoryRoot)) {
    try {
        $safePath = Assert-SafePath -Root $repositoryRoot -Path $directoryPath
        if (Test-DirectoryContainsTrackedFiles -Root $repositoryRoot -Path $safePath) {
            [void]$skipped.Add([pscustomobject]@{
                Path = Convert-ToGitPath -Root $repositoryRoot -Path $safePath
                Reason = 'contains tracked files'
                Disposition = 'KEEP'
            })
            continue
        }
        $measurement = Get-DirectoryMeasurement -Path $safePath
        if ($measurement.ContainsSensitiveEntry) {
            [void]$skipped.Add([pscustomobject]@{
                Path = Convert-ToGitPath -Root $repositoryRoot -Path $safePath
                Reason = 'contains protected content: ' + ($measurement.ProtectedReasons -join ', ')
                Disposition = 'REVIEW_REQUIRED'
            })
            continue
        }

        [void]$targets.Add([pscustomobject]@{
            Kind = 'generated-directory'
            Path = Convert-ToGitPath -Root $repositoryRoot -Path $safePath
            FullPath = $safePath
            Bytes = [int64]$measurement.Bytes
            FileCount = [int64]$measurement.FileCount
            DirectoryCount = [int64]$measurement.DirectoryCount
        })
    }
    catch {
        [void]$skipped.Add([pscustomobject]@{
            Path = $directoryPath
            Reason = $_.Exception.Message
            Disposition = 'REVIEW_REQUIRED'
        })
    }
}

foreach ($relativePath in @(Get-UntrackedEvidencePaths -Root $repositoryRoot)) {
    if ([string]::IsNullOrEmpty([string]$relativePath)) {
        continue
    }
    try {
        $fullPath = Assert-SafePath -Root $repositoryRoot -Path (Join-Path -Path $repositoryRoot -ChildPath ([string]$relativePath))
        if (-not (Test-Path -LiteralPath $fullPath -PathType Leaf)) {
            continue
        }
        $item = Get-Item -LiteralPath $fullPath -Force
        if (Test-IsReparsePoint -Item $item) {
            throw "Refusing an evidence reparse point: $relativePath"
        }
        if (-not (Test-IsRawEvidence -RelativePath ([string]$relativePath) -Item $item -CutoffUtc $cutoffUtc)) {
            continue
        }
        [void]$targets.Add([pscustomobject]@{
            Kind = 'expired-untracked-evidence'
            Path = ([string]$relativePath).Replace('\', '/')
            FullPath = $fullPath
            Bytes = [int64]$item.Length
            FileCount = [int64]1
            DirectoryCount = [int64]0
        })
    }
    catch {
        [void]$skipped.Add([pscustomobject]@{
            Path = [string]$relativePath
            Reason = $_.Exception.Message
            Disposition = 'REVIEW_REQUIRED'
        })
    }
}

$scheduledEvidenceFiles = @($targets | Where-Object {
    $_.Kind -eq 'expired-untracked-evidence'
} | ForEach-Object { [string]$_.FullPath })
foreach ($directoryPath in @(Get-EmptyEvidenceDirectoryCandidates -Root $repositoryRoot -ScheduledFilePaths $scheduledEvidenceFiles)) {
    $safePath = Assert-SafePath -Root $repositoryRoot -Path $directoryPath
    [void]$targets.Add([pscustomobject]@{
        Kind = 'empty-evidence-directory'
        Path = Convert-ToGitPath -Root $repositoryRoot -Path $safePath
        FullPath = $safePath
        Bytes = [int64]0
        FileCount = [int64]0
        DirectoryCount = [int64]1
    })
}

$deletedBytes = [int64]0
$deletedFiles = [int64]0
$deletedDirectories = [int64]0
$failed = New-Object 'System.Collections.Generic.List[object]'

foreach ($target in $targets) {
    if ($Apply) {
        try {
            $safeDeletePath = Assert-SafePath -Root $repositoryRoot -Path $target.FullPath
            Remove-Item -LiteralPath $safeDeletePath -Force -Recurse -ErrorAction Stop
        }
        catch {
            [void]$failed.Add([pscustomobject]@{
                Path = $target.Path
                Reason = $_.Exception.Message
            })
            continue
        }
    }

    $deletedBytes += [int64]$target.Bytes
    $deletedFiles += [int64]$target.FileCount
    $deletedDirectories += [int64]$target.DirectoryCount
}

$publicTargets = @()
foreach ($target in $targets) {
    $publicTargets += [pscustomobject]@{
        Kind = $target.Kind
        Path = $target.Path
        Bytes = [int64]$target.Bytes
        FileCount = [int64]$target.FileCount
        DirectoryCount = [int64]$target.DirectoryCount
    }
}

$skippedOutput = @()
foreach ($entry in $skipped) {
    $skippedOutput += $entry
}
$failedOutput = @()
foreach ($entry in $failed) {
    $failedOutput += $entry
}

$result = [pscustomobject]@{
    GeneratedAtUtc = [DateTime]::UtcNow.ToString('o')
    Mode = $mode
    RepositoryRoot = $repositoryRoot
    EvidenceRetentionDays = $EvidenceRetentionDays
    EligibleBytes = $deletedBytes
    EligibleFileCount = $deletedFiles
    EligibleDirectoryCount = $deletedDirectories
    TargetCount = $publicTargets.Count
    FailedCount = $failed.Count
    ReviewRequiredCount = @($skippedOutput | Where-Object { $_.Disposition -eq 'REVIEW_REQUIRED' }).Count
    Targets = $publicTargets
    Skipped = $skippedOutput
    Failed = $failedOutput
}

if ($Json) {
    $result | ConvertTo-Json -Depth 6
}
else {
    "Mode: $mode"
    "Repository: $repositoryRoot"
    "Raw evidence retention: $EvidenceRetentionDays day(s)"
    if ($publicTargets.Count -gt 0) {
        $publicTargets | Format-Table -AutoSize Kind, Path, Bytes, FileCount, DirectoryCount
    }
    else {
        'No eligible cleanup targets were found.'
    }
    "Eligible bytes: $($result.EligibleBytes)"
    "Eligible files: $($result.EligibleFileCount)"
    "Eligible directories: $($result.EligibleDirectoryCount)"
    "Skipped targets: $($result.Skipped.Count)"
    "Failed targets: $($result.FailedCount)"
    "Review required: $($result.ReviewRequiredCount)"
    if (-not $Apply) {
        'Dry run only. Re-run with -Apply to remove the listed targets.'
    }
}

if ($failed.Count -gt 0) {
    exit 1
}
if ($result.ReviewRequiredCount -gt 0) {
    exit 2
}
