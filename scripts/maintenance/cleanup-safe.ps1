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

    $insideWorkTree = @(& git -C $candidate rev-parse --is-inside-work-tree 2>$null)
    if ($LASTEXITCODE -ne 0 -or $insideWorkTree.Count -ne 1 -or $insideWorkTree[0] -ne 'true') {
        throw "Unable to verify the Git work tree from: $candidate"
    }
    $prefix = @(& git -C $candidate rev-parse --show-prefix 2>$null)
    if ($LASTEXITCODE -ne 0 -or -not [string]::IsNullOrEmpty(($prefix -join ''))) {
        throw "The script-derived repository path is not the Git work-tree root: $candidate"
    }

    return $candidate.TrimEnd('\', '/')
}

function Invoke-GitUtf8PathList {
    param(
        [Parameter(Mandatory = $true)][string]$Root,
        [Parameter(Mandatory = $true)][string]$Arguments
    )

    # Windows PowerShell 5.1 decodes native stdout with the active console code
    # page. Read Git's NUL-delimited bytes directly so Japanese paths remain
    # lossless regardless of CP932/UTF-8 console settings.
    $startInfo = New-Object System.Diagnostics.ProcessStartInfo
    $startInfo.FileName = 'git'
    $startInfo.Arguments = $Arguments
    $startInfo.WorkingDirectory = $Root
    $startInfo.UseShellExecute = $false
    $startInfo.CreateNoWindow = $true
    $startInfo.RedirectStandardOutput = $true
    $startInfo.RedirectStandardError = $true

    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $startInfo
    $memory = New-Object System.IO.MemoryStream
    try {
        if (-not $process.Start()) {
            throw 'Unable to start Git.'
        }
        $errorTask = $process.StandardError.ReadToEndAsync()
        $process.StandardOutput.BaseStream.CopyTo($memory)
        $process.WaitForExit()
        [void]$errorTask.Result
        if ($process.ExitCode -ne 0) {
            throw "Git path listing failed with exit code $($process.ExitCode)."
        }

        $decoded = [System.Text.Encoding]::UTF8.GetString($memory.ToArray())
        if ($decoded.Length -eq 0) {
            return @()
        }
        return @($decoded.Split([char]0, [System.StringSplitOptions]::RemoveEmptyEntries))
    }
    finally {
        $memory.Dispose()
        $process.Dispose()
    }
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
    if ($relativePath -match '[\s"]') {
        throw "Unexpected generated-output path syntax: $relativePath"
    }
    $tracked = @(Invoke-GitUtf8PathList -Root $Root -Arguments "ls-files -z -- $relativePath/")
    return ($tracked.Count -gt 0)
}

function Test-PathIndicatesProtectedMaterial {
    param([Parameter(Mandatory = $true)][string]$Path)

    $normalized = $Path.Replace('\', '/').ToLowerInvariant()
    return (
        $normalized -match '(^|/)(external-sources?|official-sources?|primary-sources?)(/|$)' -or
        $normalized -match '(^|/)[^/]*(legal-source|official-source|source-snapshot|e-gov|mhlw|kanpou|gazette|rollback|production-rollback|checksum-manifest|source-manifest)[^/]*(/|$)' -or
        $normalized -match '(^|/)(法令原典|法源|一次資料|公式原文|正本|官報|通達|告示|厚生労働省|ロールバック|本番復旧|復元用|チェックサム|ハッシュ)(/|$)' -or
        $normalized -match '(^|/)[^/]*(法令原典|法源|一次資料|公式原文|正本|官報|通達|告示|厚生労働省|ロールバック|本番復旧|チェックサム|ハッシュ)[^/]*(/|$)' -or
        $normalized -match '(^|/)(dpl|bld)_[a-z0-9]+(?:\.[^/]*)?($|/)' -or
        $normalized -match '(^|/)[^/]*(runtime-dataset|canonical-dataset|database-backup|repository\.bundle)[^/]*(/|$)'
    )
}

function Get-DirectoryMeasurement {
    param([Parameter(Mandatory = $true)][string]$Path)

    $fileCount = [int64]0
    $directoryCount = [int64]0
    $bytes = [int64]0
    $newestWriteTimeUtc = [DateTime]::MinValue
    $containsSensitiveEntry = $false
    $protectedReasons = New-Object 'System.Collections.Generic.HashSet[string]' ([System.StringComparer]::OrdinalIgnoreCase)
    $rootName = (Split-Path -Leaf $Path).ToLowerInvariant()
    $isAmbiguousOutput = $rootName -in @(
        'out', 'build', 'dist', 'logs', 'tmp', 'temp', '.tmp', 'cache', '.cache',
        'audit-out', '.maintenance-snapshots', 'local-snapshots',
        'benchmark-output', '.benchmark-output', '.bench', '.genquality',
        '.loop-eval', '.r4-screens', '.r8-screens'
    )
    if ($isAmbiguousOutput) {
        $containsSensitiveEntry = $true
        [void]$protectedReasons.Add('ambiguous output requires an explicit regeneration or retention review')
    }
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
                if (Test-PathIndicatesProtectedMaterial -Path $child.FullName) {
                    $containsSensitiveEntry = $true
                    [void]$protectedReasons.Add('legal source, official record, rollback, or canonical material')
                    continue
                }
                if (
                    $child.Name.ToLowerInvariant() -eq '.git' -or
                    $child.Name.ToLowerInvariant().EndsWith('.git')
                ) {
                    $containsSensitiveEntry = $true
                    [void]$protectedReasons.Add('nested Git metadata')
                    continue
                }
                if ($child.Name.ToLowerInvariant() -in @(
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
                if ($child.LastWriteTimeUtc -gt $newestWriteTimeUtc) {
                    $newestWriteTimeUtc = $child.LastWriteTimeUtc
                }

                $lowerName = $child.Name.ToLowerInvariant()
                $lowerExtension = $child.Extension.ToLowerInvariant()
                if (Test-PathIndicatesProtectedMaterial -Path $child.FullName) {
                    $containsSensitiveEntry = $true
                    [void]$protectedReasons.Add('legal source, official record, rollback, or canonical material')
                }
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
                $isNextGeneratedType = (
                    $rootName -eq '.next' -and
                    $lowerExtension -eq '.ts' -and
                    $child.FullName.Replace('\', '/').ToLowerInvariant() -match '/\.next/(dev/)?types/'
                )
                $isKnownGeneratedExtension = $lowerExtension -in @(
                    '.js', '.mjs', '.cjs', '.json', '.map', '.sst', '.meta',
                    '.avif', '.gz', '.body', '.css', '.png', '.jpg', '.jpeg',
                    '.gif', '.webp', '.svg', '.ico', '.rsc', '.html', '.htm',
                    '.wasm', '.old', '.rscinfo', '.tsbuildinfo', '.ttf', '.woff',
                    '.woff2', '.previewinfo', '.log', '.trace', '.har', '.lcov',
                    '.mp4', '.webm'
                )
                $isKnownGeneratedNoExtension = (
                    [string]::IsNullOrEmpty($lowerExtension) -and (
                        $lowerName -in @('build_id', 'trace', 'trace-build', 'turbopack', 'current', 'log') -or
                        $lowerName -match '^[a-f0-9]{64}$'
                    )
                )
                if (
                    -not $isAmbiguousOutput -and
                    -not $isKnownGeneratedExtension -and
                    -not $isKnownGeneratedNoExtension -and
                    -not $isNextGeneratedType
                ) {
                    $containsSensitiveEntry = $true
                    [void]$protectedReasons.Add('unrecognized file type inside generated output')
                }
                if (
                    -not $isAmbiguousOutput -and
                    $lowerExtension -in @(
                        '.tsx', '.jsx', '.py', '.pyw', '.ps1', '.psm1', '.psd1',
                        '.go', '.rs', '.java', '.kt', '.kts', '.cs', '.c', '.h',
                        '.cpp', '.hpp', '.rb', '.php', '.sh', '.bash', '.zsh',
                        '.prisma', '.sql', '.sqlite', '.sqlite3', '.db'
                    )
                ) {
                    $containsSensitiveEntry = $true
                    [void]$protectedReasons.Add('source or runtime data inside generated output')
                }
                if (-not $isAmbiguousOutput -and $lowerExtension -eq '.ts' -and -not $isNextGeneratedType) {
                    $containsSensitiveEntry = $true
                    [void]$protectedReasons.Add('unrecognized TypeScript source inside generated output')
                }
                if (
                    -not $isAmbiguousOutput -and
                    $lowerExtension -in @(
                        '.zip', '.tar', '.tgz', '.7z', '.rar', '.bundle', '.pdf',
                        '.csv', '.geojson', '.parquet', '.xlsx', '.xls', '.doc', '.docx'
                    )
                ) {
                    $containsSensitiveEntry = $true
                    [void]$protectedReasons.Add('opaque archive, document, or dataset inside generated output')
                }
                if ($isAmbiguousOutput -and (
                    $lowerExtension -in @(
                        '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
                        '.py', '.pyw', '.ps1', '.psm1', '.psd1', '.go', '.rs',
                        '.java', '.kt', '.kts', '.cs', '.c', '.h', '.cpp', '.hpp',
                        '.rb', '.php', '.sh', '.bash', '.zsh',
                        '.css', '.scss', '.sass', '.less', '.md', '.mdx',
                        '.json', '.yaml', '.yml', '.toml', '.xml', '.prisma',
                        '.sql', '.sqlite', '.sqlite3', '.db',
                        '.zip', '.tar', '.gz', '.tgz', '.7z', '.rar',
                        '.exe', '.dll', '.so', '.dylib', '.wasm', '.jar', '.class', '.bin',
                        '.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.ico'
                    ) -or
                    $lowerName -in @(
                        'package.json', 'package-lock.json', 'tsconfig.json',
                        'next.config.js', 'next.config.mjs', 'next.config.ts'
                    ) -or
                    [string]::IsNullOrEmpty($lowerExtension)
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
        NewestWriteTimeUtc = $newestWriteTimeUtc
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
            if (Test-IsAllowedOutputDirectoryName -Name $directory.Name) {
                [void]$candidates.Add($directory.FullName)
            }
        }

        $vercelOutput = Join-Path -Path $safeParent -ChildPath '.vercel\output'
        if (Test-Path -LiteralPath $vercelOutput -PathType Container) {
            # Validation is centralized in the caller so a reparse point is
            # reported as REVIEW_REQUIRED instead of terminating the run.
            [void]$candidates.Add($vercelOutput)
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
    [void](Assert-SafePath -Root $Root -Path $evidenceRoot)

    $relativeEvidenceRoot = 'docs/audits/evidence'
    $normalUntracked = @(Invoke-GitUtf8PathList -Root $Root -Arguments "ls-files -z --others --exclude-standard -- $relativeEvidenceRoot")
    $ignoredUntracked = @(Invoke-GitUtf8PathList -Root $Root -Arguments "ls-files -z --others --ignored --exclude-standard -- $relativeEvidenceRoot")

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
    $evidenceRoot = Assert-SafePath -Root $Root -Path $evidenceRoot
    $evidenceMeasurement = Get-DirectoryMeasurement -Path $evidenceRoot
    if ($evidenceMeasurement.ContainsSensitiveEntry) {
        throw 'Evidence tree contains protected content: ' + ($evidenceMeasurement.ProtectedReasons -join ', ')
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

    if (Test-PathIndicatesProtectedMaterial -Path $RelativePath) {
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

function Test-IsProtectedEvidenceContent {
    param(
        [Parameter(Mandatory = $true)][string]$RelativePath,
        [Parameter(Mandatory = $true)][System.IO.FileInfo]$Item
    )

    $normalized = $RelativePath.Replace('\', '/').ToLowerInvariant()
    if ($normalized -match '(^|/)(?:\.git|[^/]+\.git)(/|$)') {
        return $true
    }

    $extension = $Item.Extension.ToLowerInvariant()
    $isExplicitRawTree = $normalized -match '(^|/)(raw|screenshots|traces?|videos|playwright-report|test-results|lighthouse-runs?|logs|coverage)(/|$)'
    if (-not $isExplicitRawTree) {
        return $true
    }
    $transparentRawExtensions = @(
        '.har', '.trace', '.log', '.html', '.htm', '.lcov',
        '.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif',
        '.mp4', '.webm'
    )
    if ($extension -in $transparentRawExtensions) {
        return $false
    }

    # Structured dumps are eligible only inside a directory that explicitly
    # identifies them as raw output. Else they may be canonical/runtime data.
    if ($isExplicitRawTree -and $extension -in @('.json', '.jsonl', '.csv')) {
        return $false
    }

    # Fail closed for source, configuration, datasets, archives, PDFs and any
    # future opaque format. A reviewer may archive/delete them after inspection.
    return $true
}

$repositoryRoot = Resolve-RepositoryRoot
$mode = if ($Apply) { 'apply' } else { 'dry-run' }
$cutoffUtc = [DateTime]::UtcNow.AddDays(-1 * $EvidenceRetentionDays)
$shortRawCutoffUtc = [DateTime]::UtcNow.AddDays(-3)
$targets = New-Object 'System.Collections.Generic.List[object]'
$skipped = New-Object 'System.Collections.Generic.List[object]'

$generatedDirectoryPaths = @()
try {
    $generatedDirectoryPaths = @(Get-GeneratedDirectoryCandidates -Root $repositoryRoot)
}
catch {
    [void]$skipped.Add([pscustomobject]@{
        Path = 'generated-output-roots'
        Reason = $_.Exception.Message
        Disposition = 'REVIEW_REQUIRED'
    })
}
foreach ($directoryPath in $generatedDirectoryPaths) {
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
        $generatedRootName = (Split-Path -Leaf $safePath).ToLowerInvariant()
        if (
            $generatedRootName -in @('screenshots', 'trace', 'traces', 'videos') -and
            $measurement.FileCount -gt 0 -and
            $measurement.NewestWriteTimeUtc -ge $shortRawCutoffUtc
        ) {
            [void]$skipped.Add([pscustomobject]@{
                Path = Convert-ToGitPath -Root $repositoryRoot -Path $safePath
                Reason = 'within 3-day screenshot, trace, or video retention'
                Disposition = 'KEEP'
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

$untrackedEvidencePaths = @()
try {
    $untrackedEvidencePaths = @(Get-UntrackedEvidencePaths -Root $repositoryRoot)
}
catch {
    [void]$skipped.Add([pscustomobject]@{
        Path = 'docs/audits/evidence'
        Reason = $_.Exception.Message
        Disposition = 'REVIEW_REQUIRED'
    })
}
foreach ($relativePath in $untrackedEvidencePaths) {
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
        $itemCutoffUtc = if ($item.Extension.ToLowerInvariant() -in @(
            '.har', '.trace', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.mp4', '.webm'
        )) { $shortRawCutoffUtc } else { $cutoffUtc }
        if (-not (Test-IsRawEvidence -RelativePath ([string]$relativePath) -Item $item -CutoffUtc $itemCutoffUtc)) {
            continue
        }
        if (Test-IsProtectedEvidenceContent -RelativePath ([string]$relativePath) -Item $item) {
            throw "Refusing source, runtime data, or Git metadata under evidence: $relativePath"
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
$emptyEvidenceDirectories = @()
try {
    $emptyEvidenceDirectories = @(Get-EmptyEvidenceDirectoryCandidates -Root $repositoryRoot -ScheduledFilePaths $scheduledEvidenceFiles)
}
catch {
    [void]$skipped.Add([pscustomobject]@{
        Path = 'docs/audits/evidence'
        Reason = $_.Exception.Message
        Disposition = 'REVIEW_REQUIRED'
    })
}
foreach ($directoryPath in $emptyEvidenceDirectories) {
    try {
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
    catch {
        [void]$skipped.Add([pscustomobject]@{
            Path = $directoryPath
            Reason = $_.Exception.Message
            Disposition = 'REVIEW_REQUIRED'
        })
    }
}

$deletedBytes = [int64]0
$deletedFiles = [int64]0
$deletedDirectories = [int64]0
$failed = New-Object 'System.Collections.Generic.List[object]'
$reviewRequiredCount = @($skipped | Where-Object { $_.Disposition -eq 'REVIEW_REQUIRED' }).Count
$applyBlocked = $Apply -and $reviewRequiredCount -gt 0

foreach ($target in $targets) {
    if ($Apply -and -not $applyBlocked) {
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
    ApplyBlocked = $applyBlocked
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
    if ($applyBlocked) {
        'Apply was blocked before deletion because REVIEW_REQUIRED items exist.'
    }
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
