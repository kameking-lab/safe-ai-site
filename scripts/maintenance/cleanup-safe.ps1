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

function Test-IsSafeGeneratedReparsePoint {
    param(
        [Parameter(Mandatory = $true)][string]$Root,
        [Parameter(Mandatory = $true)][System.IO.FileSystemInfo]$Item
    )

    if (-not (Test-IsReparsePoint -Item $Item)) {
        return $false
    }

    $rootFull = [System.IO.Path]::GetFullPath($Root).TrimEnd('\', '/')
    $rootPrefix = $rootFull + [System.IO.Path]::DirectorySeparatorChar
    $targets = @($Item.Target)
    if ($targets.Count -eq 0) {
        return $false
    }

    foreach ($target in $targets) {
        if ([string]::IsNullOrWhiteSpace([string]$target)) {
            return $false
        }
        $targetPath = if ([System.IO.Path]::IsPathRooted([string]$target)) {
            [System.IO.Path]::GetFullPath([string]$target)
        }
        else {
            [System.IO.Path]::GetFullPath((Join-Path -Path $Item.DirectoryName -ChildPath ([string]$target)))
        }
        if (
            [string]::Equals($targetPath.TrimEnd('\', '/'), $rootFull, [System.StringComparison]::OrdinalIgnoreCase) -or
            -not $targetPath.StartsWith($rootPrefix, [System.StringComparison]::OrdinalIgnoreCase)
        ) {
            return $false
        }
    }

    return $true
}

function Get-StringListSha256 {
    param(
        [Parameter(Mandatory = $true)]
        [AllowEmptyCollection()]
        [string[]]$Values
    )

    $joined = [string]::Join("`n", @($Values | Sort-Object))
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($joined)
    $sha256 = [System.Security.Cryptography.SHA256]::Create()
    try {
        return ([System.BitConverter]::ToString($sha256.ComputeHash($bytes))).Replace('-', '')
    }
    finally {
        $sha256.Dispose()
    }
}

function Get-FileSha256 {
    param([Parameter(Mandatory = $true)][string]$Path)

    $stream = [System.IO.File]::Open($Path, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::Read)
    $sha256 = [System.Security.Cryptography.SHA256]::Create()
    try {
        return ([System.BitConverter]::ToString($sha256.ComputeHash($stream))).Replace('-', '')
    }
    finally {
        $sha256.Dispose()
        $stream.Dispose()
    }
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

function Test-IsTrackedPath {
    param(
        [Parameter(Mandatory = $true)][string]$Root,
        [Parameter(Mandatory = $true)][string]$Path
    )

    $relativePath = Convert-ToGitPath -Root $Root -Path $Path
    if ($relativePath -match '[\s"]') {
        throw "Unexpected path syntax while checking tracked state: $relativePath"
    }
    $tracked = @(Invoke-GitUtf8PathList -Root $Root -Arguments "ls-files -z -- $relativePath")
    return ($tracked.Count -gt 0)
}

function Test-PathIndicatesProtectedMaterial {
    param([Parameter(Mandatory = $true)][string]$Path)

    $normalized = $Path.Replace('\', '/').ToLowerInvariant()
    # Keep this script ASCII-only so Windows PowerShell 5.1 reads it correctly
    # even when the host code page is CP932. .NET regular expressions expand
    # these Unicode escapes at match time.
    $protectedJapanese = '(?:\u6cd5\u4ee4\u539f\u5178|\u6cd5\u6e90|\u4e00\u6b21\u8cc7\u6599|\u516c\u5f0f\u539f\u6587|\u6b63\u672c|\u5b98\u5831|\u901a\u9054|\u544a\u793a|\u539a\u751f\u52b4\u50cd\u7701|\u30ed\u30fc\u30eb\u30d0\u30c3\u30af|\u672c\u756a\u5fa9\u65e7|\u5fa9\u5143\u7528|\u30c1\u30a7\u30c3\u30af\u30b5\u30e0|\u30cf\u30c3\u30b7\u30e5)'
    $protectedAscii = '(?:(?:external|official|primary|law|legal)[-_ ]?sources?|sources?[-_ ]?(?:snapshots?|hash(?:es)?|checksums?|manifests?)|e[-_ ]?gov|mhlw|kanpou|gazette|rollback|production[-_ ]?rollback|rollback[-_ ]?(?:info|metadata|manifest)|checksum[-_ ]?manifest|hash[-_ ]?manifest)'
    return (
        $normalized -match "(^|/)$protectedAscii(/|$)" -or
        $normalized -match "(^|/)[^/]*$protectedAscii[^/]*(/|$)" -or
        $normalized -match "(^|/)$protectedJapanese(/|$)" -or
        $normalized -match "(^|/)[^/]*$protectedJapanese[^/]*(/|$)" -or
        $normalized -match '(^|/)(dpl|bld)_[a-z0-9]+(?:\.[^/]*)?($|/)' -or
        $normalized -match '(^|/)[^/]*(runtime-dataset|canonical-dataset|database-backup|repository\.bundle)[^/]*(/|$)'
    )
}

function Get-DirectoryMeasurement {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$RepositoryRoot,
        [switch]$TrustKnownGeneratedContent
    )

    $fileCount = [int64]0
    $directoryCount = [int64]0
    $bytes = [int64]0
    $newestWriteTimeUtc = [DateTime]::MinValue
    $newestShortRawWriteTimeUtc = [DateTime]::MinValue
    $newestSevenDayRawWriteTimeUtc = [DateTime]::MinValue
    $containsSensitiveEntry = $false
    $protectedReasons = New-Object 'System.Collections.Generic.HashSet[string]' ([System.StringComparer]::OrdinalIgnoreCase)
    $safeReparsePoints = New-Object 'System.Collections.Generic.List[string]'
    $fingerprintEntries = New-Object 'System.Collections.Generic.List[string]'
    $rootName = (Split-Path -Leaf $Path).ToLowerInvariant()
    $isAmbiguousOutput = -not $TrustKnownGeneratedContent -and $rootName -in @(
        'out', 'build', 'dist', 'tmp', 'temp', '.tmp', 'cache', '.cache',
        '.maintenance-snapshots', 'local-snapshots'
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
                $relativeChild = $child.FullName.Substring($Path.Length).TrimStart('\', '/').Replace('\', '/')
                [void]$fingerprintEntries.Add("L|$relativeChild|$(@($child.Target) -join '|')")
                if (
                    $TrustKnownGeneratedContent -and
                    (Test-IsSafeGeneratedReparsePoint -Root $RepositoryRoot -Item $child)
                ) {
                    [void]$safeReparsePoints.Add($child.FullName)
                }
                else {
                    $containsSensitiveEntry = $true
                    [void]$protectedReasons.Add('reparse point outside the repository or with an unreadable target')
                }
                continue
            }
            if ($child.PSIsContainer) {
                $relativeChild = $child.FullName.Substring($Path.Length).TrimStart('\', '/').Replace('\', '/')
                [void]$fingerprintEntries.Add("D|$relativeChild")
                if (-not $TrustKnownGeneratedContent -and (Test-PathIndicatesProtectedMaterial -Path $child.FullName)) {
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
                if (-not $TrustKnownGeneratedContent -and $child.Name.ToLowerInvariant() -in @(
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
                $relativeChild = $child.FullName.Substring($Path.Length).TrimStart('\', '/').Replace('\', '/')
                $contentSha256 = Get-FileSha256 -Path $child.FullName
                [void]$fingerprintEntries.Add("F|$relativeChild|$($child.Length)|$($child.LastWriteTimeUtc.Ticks)|$contentSha256")
                $fileCount++
                $bytes += [int64]$child.Length
                if ($child.LastWriteTimeUtc -gt $newestWriteTimeUtc) {
                    $newestWriteTimeUtc = $child.LastWriteTimeUtc
                }

                $lowerName = $child.Name.ToLowerInvariant()
                $lowerExtension = $child.Extension.ToLowerInvariant()
                $isShortRawFile = $lowerExtension -in @(
                    '.har', '.trace', '.png', '.jpg', '.jpeg', '.gif', '.svg',
                    '.webp', '.avif', '.mp4', '.webm'
                )
                if ($isShortRawFile -and $child.LastWriteTimeUtc -gt $newestShortRawWriteTimeUtc) {
                    $newestShortRawWriteTimeUtc = $child.LastWriteTimeUtc
                }
                elseif (-not $isShortRawFile -and $child.LastWriteTimeUtc -gt $newestSevenDayRawWriteTimeUtc) {
                    $newestSevenDayRawWriteTimeUtc = $child.LastWriteTimeUtc
                }
                if (-not $TrustKnownGeneratedContent -and (Test-PathIndicatesProtectedMaterial -Path $child.FullName)) {
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
                $normalizedChildPath = $child.FullName.Replace('\', '/').ToLowerInvariant()
                $isTrustedCompiledOutput = (
                    $rootName -eq '.next' -or
                    $normalizedChildPath -match '/\.vercel/output/'
                )
                $isKnownCoverageReportFile = (
                    $rootName -eq 'coverage' -and (
                        $lowerName -in @('coverage-final.json', 'clover.xml', 'lcov.info') -or
                        $normalizedChildPath -match '/coverage/lcov-report/.+\.(?:html|htm)$' -or
                        $lowerName -in @(
                            'base.css', 'block-navigation.js', 'favicon.png',
                            'prettify.css', 'prettify.js', 'sort-arrow-sprite.png',
                            'sorter.js'
                        )
                    )
                )
                $isKnownPlaywrightReportFile = (
                    $rootName -match '^playwright-report(?:-.+)?$' -and
                    $lowerName -eq 'index.html'
                )
                $isKnownGeneratedReportFile = (
                    (
                        $rootName -in @(
                            '.bench', '.genquality', '.loop-eval', '.r4-screens', '.r8-screens',
                            'benchmark-output', '.benchmark-output', 'logs', 'audit-out'
                        ) -or
                        $rootName -match '^test-results(?:-.+)?$' -or
                        $rootName -match '^lighthouse-(?:raw|trace)(?:-.+)?$'
                    ) -and
                    $lowerExtension -in @(
                        '.json', '.jsonl', '.csv', '.html', '.htm', '.xml', '.md', '.txt',
                        '.log', '.lcov', '.trace', '.har', '.png', '.jpg', '.jpeg', '.gif',
                        '.svg', '.webp', '.avif', '.mp4', '.webm'
                    )
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
                    -not $TrustKnownGeneratedContent -and
                    -not $isAmbiguousOutput -and
                    -not $isKnownGeneratedExtension -and
                    -not $isKnownGeneratedNoExtension -and
                    -not $isNextGeneratedType -and
                    -not $isKnownGeneratedReportFile
                ) {
                    $containsSensitiveEntry = $true
                    [void]$protectedReasons.Add('unrecognized file type inside generated output')
                }
                if (
                    -not $TrustKnownGeneratedContent -and
                    -not $isAmbiguousOutput -and
                    -not $isKnownGeneratedReportFile -and
                    $lowerExtension -in @(
                        '.js', '.mjs', '.cjs', '.json', '.css', '.html', '.htm',
                        '.tsx', '.jsx', '.py', '.pyw', '.ps1', '.psm1', '.psd1',
                        '.go', '.rs', '.java', '.kt', '.kts', '.cs', '.c', '.h',
                        '.cpp', '.hpp', '.rb', '.php', '.sh', '.bash', '.zsh',
                        '.prisma', '.sql', '.sqlite', '.sqlite3', '.db',
                        '.yaml', '.yml', '.toml', '.xml', '.md', '.mdx'
                    ) -and
                    -not $isTrustedCompiledOutput -and
                    -not $isKnownCoverageReportFile -and
                    -not $isKnownPlaywrightReportFile -and
                    -not $isKnownGeneratedReportFile
                ) {
                    $containsSensitiveEntry = $true
                    [void]$protectedReasons.Add('source or runtime data inside generated output')
                }
                if (-not $TrustKnownGeneratedContent -and -not $isAmbiguousOutput -and $lowerExtension -eq '.ts' -and -not $isNextGeneratedType) {
                    $containsSensitiveEntry = $true
                    [void]$protectedReasons.Add('unrecognized TypeScript source inside generated output')
                }
                if (
                    -not $TrustKnownGeneratedContent -and
                    -not $isAmbiguousOutput -and
                    $lowerExtension -in @(
                        '.zip', '.tar', '.tgz', '.7z', '.rar', '.bundle', '.pdf',
                        '.csv', '.geojson', '.parquet', '.xlsx', '.xls', '.doc', '.docx'
                    )
                ) {
                    $containsSensitiveEntry = $true
                    [void]$protectedReasons.Add('opaque archive, document, or dataset inside generated output')
                }
                if (-not $TrustKnownGeneratedContent -and $isAmbiguousOutput -and (
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
        NewestShortRawWriteTimeUtc = $newestShortRawWriteTimeUtc
        NewestSevenDayRawWriteTimeUtc = $newestSevenDayRawWriteTimeUtc
        ContainsSensitiveEntry = $containsSensitiveEntry
        ProtectedReasons = @($protectedReasons)
        SafeReparsePoints = @($safeReparsePoints)
        Fingerprint = Get-StringListSha256 -Values @($fingerprintEntries)
    }
}

function Test-IsValidatedNextOutputRoot {
    param([Parameter(Mandatory = $true)][string]$Path)

    $normalized = $Path.Replace('\', '/').ToLowerInvariant().TrimEnd('/')
    $name = Split-Path -Leaf $normalized
    if ($name -ne '.next' -or -not (Test-Path -LiteralPath $Path -PathType Container)) {
        return $false
    }

    $allowedDirectories = New-Object 'System.Collections.Generic.HashSet[string]' ([System.StringComparer]::OrdinalIgnoreCase)
    foreach ($entryName in @(
        'build', 'cache', 'dev', 'diagnostics', 'node_modules', 'server',
        'standalone', 'static', 'types'
    )) {
        [void]$allowedDirectories.Add($entryName)
    }
    $allowedFiles = New-Object 'System.Collections.Generic.HashSet[string]' ([System.StringComparer]::OrdinalIgnoreCase)
    foreach ($entryName in @(
        'BUILD_ID', 'app-build-manifest.json', 'app-path-routes-manifest.json',
        'build-manifest.json', 'export-marker.json', 'fallback-build-manifest.json',
        'images-manifest.json', 'next-minimal-server.js.nft.json',
        'next-server.js.nft.json', 'package.json', 'prerender-manifest.json',
        'react-loadable-manifest.json', 'required-server-files.js',
        'required-server-files.json', 'routes-manifest.json',
        'server-reference-manifest.json'
    )) {
        [void]$allowedFiles.Add($entryName)
    }
    $flexibleGeneratedEntries = @('trace', 'trace-build', 'turbopack')

    $entries = @{}
    foreach ($entry in @(Get-ChildItem -LiteralPath $Path -Force -ErrorAction Stop)) {
        $entries[$entry.Name] = $entry
        if ($allowedDirectories.Contains($entry.Name) -and -not $entry.PSIsContainer) {
            return $false
        }
        if ($allowedFiles.Contains($entry.Name) -and $entry.PSIsContainer) {
            return $false
        }
        if (
            -not $allowedDirectories.Contains($entry.Name) -and
            -not $allowedFiles.Contains($entry.Name) -and
            $entry.Name -notin $flexibleGeneratedEntries
        ) {
            return $false
        }
    }

    $hasProductionManifest = $entries.ContainsKey('BUILD_ID') -or $entries.ContainsKey('build-manifest.json')
    $hasProductionTree = (
        $entries.ContainsKey('server') -or $entries.ContainsKey('static') -or
        $entries.ContainsKey('build')
    )
    if ($hasProductionManifest -and $hasProductionTree) {
        return $true
    }

    if (-not $entries.ContainsKey('dev') -or -not $entries['dev'].PSIsContainer) {
        return $false
    }
    $devPath = $entries['dev'].FullName
    $devManifest = Test-Path -LiteralPath (Join-Path -Path $devPath -ChildPath 'build-manifest.json') -PathType Leaf
    $devTree = (
        (Test-Path -LiteralPath (Join-Path -Path $devPath -ChildPath 'server') -PathType Container) -or
        (Test-Path -LiteralPath (Join-Path -Path $devPath -ChildPath 'static') -PathType Container)
    )
    return ($devManifest -and $devTree)
}

function Test-IsKnownGeneratedContentRoot {
    param([Parameter(Mandatory = $true)][string]$Path)

    return (Test-IsValidatedNextOutputRoot -Path $Path)
}

function Test-IsShortRawRetentionRoot {
    param([Parameter(Mandatory = $true)][string]$Path)

    $name = (Split-Path -Leaf $Path).ToLowerInvariant()
    return (
        $name -in @(
            'screenshots', 'trace', 'traces', 'videos', '.r4-screens', '.r8-screens',
            '.bench', '.genquality', '.loop-eval', 'benchmark-output', '.benchmark-output'
        ) -or
        $name -match '^test-results(?:-.+)?$' -or
        $name -match '^playwright-report(?:-.+)?$' -or
        $name -match '^lighthouse-(?:raw|trace)(?:-.+)?$'
    )
}

function Test-IsSevenDayRawRetentionRoot {
    param([Parameter(Mandatory = $true)][string]$Path)

    $name = (Split-Path -Leaf $Path).ToLowerInvariant()
    return ($name -in @('logs', 'audit-out'))
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
    $evidenceRootItem = Get-Item -LiteralPath $evidenceRoot -Force -ErrorAction Stop
    if (Test-IsReparsePoint -Item $evidenceRootItem) {
        throw 'Evidence root is a reparse point.'
    }
    $evidenceReparsePoints = @(Get-ChildItem -LiteralPath $evidenceRoot -Recurse -Force -ErrorAction Stop |
        Where-Object { Test-IsReparsePoint -Item $_ })
    if ($evidenceReparsePoints.Count -gt 0) {
        throw 'Evidence tree contains a reparse point.'
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
        '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.avif',
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
        $trustKnownGeneratedContent = Test-IsKnownGeneratedContentRoot -Path $safePath
        if (
            (Split-Path -Leaf $safePath).ToLowerInvariant() -eq '.next' -and
            -not $trustKnownGeneratedContent
        ) {
            [void]$skipped.Add([pscustomobject]@{
                Path = Convert-ToGitPath -Root $repositoryRoot -Path $safePath
                Reason = 'Next.js output markers are missing or an unexpected top-level entry exists'
                Disposition = 'REVIEW_REQUIRED'
            })
            continue
        }
        $measurement = Get-DirectoryMeasurement `
            -Path $safePath `
            -RepositoryRoot $repositoryRoot `
            -TrustKnownGeneratedContent:$trustKnownGeneratedContent
        if ($measurement.ContainsSensitiveEntry) {
            [void]$skipped.Add([pscustomobject]@{
                Path = Convert-ToGitPath -Root $repositoryRoot -Path $safePath
                Reason = 'contains protected content: ' + ($measurement.ProtectedReasons -join ', ')
                Disposition = 'REVIEW_REQUIRED'
            })
            continue
        }
        if (
            (
                (Test-IsShortRawRetentionRoot -Path $safePath) -or
                (Test-IsSevenDayRawRetentionRoot -Path $safePath)
            ) -and
            $measurement.NewestShortRawWriteTimeUtc -gt [DateTime]::MinValue -and
            $measurement.NewestShortRawWriteTimeUtc -ge $shortRawCutoffUtc
        ) {
            [void]$skipped.Add([pscustomobject]@{
                Path = Convert-ToGitPath -Root $repositoryRoot -Path $safePath
                Reason = 'contains screenshot, trace, HAR, or video within 3-day retention'
                Disposition = 'KEEP'
            })
            continue
        }
        if (
            (Test-IsSevenDayRawRetentionRoot -Path $safePath) -and
            $measurement.NewestSevenDayRawWriteTimeUtc -gt [DateTime]::MinValue -and
            $measurement.NewestSevenDayRawWriteTimeUtc -ge $cutoffUtc
        ) {
            [void]$skipped.Add([pscustomobject]@{
                Path = Convert-ToGitPath -Root $repositoryRoot -Path $safePath
                Reason = 'contains raw log output within 7-day retention'
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
            SafeReparsePoints = @($measurement.SafeReparsePoints)
            TrustKnownGeneratedContent = [bool]$trustKnownGeneratedContent
            Fingerprint = [string]$measurement.Fingerprint
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
            '.har', '.trace', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.avif', '.mp4', '.webm'
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
            LastWriteTimeUtcTicks = [int64]$item.LastWriteTimeUtc.Ticks
            ContentSha256 = Get-FileSha256 -Path $fullPath
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
            $freshMeasurement = $null
            if ($target.Kind -eq 'generated-directory') {
                if (Test-DirectoryContainsTrackedFiles -Root $repositoryRoot -Path $safeDeletePath) {
                    throw 'Generated output gained a tracked file after the dry-run measurement.'
                }
                $freshTrust = Test-IsKnownGeneratedContentRoot -Path $safeDeletePath
                if (
                    (Split-Path -Leaf $safeDeletePath).ToLowerInvariant() -eq '.next' -and
                    -not $freshTrust
                ) {
                    throw 'Next.js output markers changed after the dry-run measurement.'
                }
                $freshMeasurement = Get-DirectoryMeasurement `
                    -Path $safeDeletePath `
                    -RepositoryRoot $repositoryRoot `
                    -TrustKnownGeneratedContent:$freshTrust
                if ($freshMeasurement.ContainsSensitiveEntry) {
                    throw 'Generated output gained protected content after the dry-run measurement.'
                }
                if ([string]$freshMeasurement.Fingerprint -ne [string]$target.Fingerprint) {
                    throw 'Generated output changed after the dry-run measurement.'
                }
                if (
                    (
                        (Test-IsShortRawRetentionRoot -Path $safeDeletePath) -or
                        (Test-IsSevenDayRawRetentionRoot -Path $safeDeletePath)
                    ) -and
                    $freshMeasurement.NewestShortRawWriteTimeUtc -gt [DateTime]::MinValue -and
                    $freshMeasurement.NewestShortRawWriteTimeUtc -ge $shortRawCutoffUtc
                ) {
                    throw 'Generated output gained short-retention raw evidence after the dry-run measurement.'
                }
                if (
                    (Test-IsSevenDayRawRetentionRoot -Path $safeDeletePath) -and
                    $freshMeasurement.NewestSevenDayRawWriteTimeUtc -gt [DateTime]::MinValue -and
                    $freshMeasurement.NewestSevenDayRawWriteTimeUtc -ge $cutoffUtc
                ) {
                    throw 'Generated output gained raw logs within the retention window.'
                }
            }
            elseif ($target.Kind -eq 'expired-untracked-evidence') {
                if (-not (Test-Path -LiteralPath $safeDeletePath -PathType Leaf)) {
                    throw 'Evidence file no longer exists as a regular file.'
                }
                $freshEvidence = Get-Item -LiteralPath $safeDeletePath -Force
                if (Test-IsReparsePoint -Item $freshEvidence) {
                    throw 'Evidence file changed into a reparse point.'
                }
                if (Test-IsTrackedPath -Root $repositoryRoot -Path $safeDeletePath) {
                    throw 'Evidence file became tracked after the dry-run measurement.'
                }
                if (
                    [int64]$freshEvidence.Length -ne [int64]$target.Bytes -or
                    [int64]$freshEvidence.LastWriteTimeUtc.Ticks -ne [int64]$target.LastWriteTimeUtcTicks -or
                    (Get-FileSha256 -Path $safeDeletePath) -ne [string]$target.ContentSha256
                ) {
                    throw 'Evidence file changed after the dry-run measurement.'
                }
                $freshEvidenceCutoffUtc = if ($freshEvidence.Extension.ToLowerInvariant() -in @(
                    '.har', '.trace', '.png', '.jpg', '.jpeg', '.gif', '.svg',
                    '.webp', '.avif', '.mp4', '.webm'
                )) { $shortRawCutoffUtc } else { $cutoffUtc }
                if (-not (Test-IsRawEvidence -RelativePath ([string]$target.Path) -Item $freshEvidence -CutoffUtc $freshEvidenceCutoffUtc)) {
                    throw 'Evidence file no longer satisfies the retention rule.'
                }
                if (Test-IsProtectedEvidenceContent -RelativePath ([string]$target.Path) -Item $freshEvidence) {
                    throw 'Evidence file became protected after the dry-run measurement.'
                }
            }
            elseif ($target.Kind -eq 'empty-evidence-directory') {
                if (-not (Test-Path -LiteralPath $safeDeletePath -PathType Container)) {
                    throw 'Evidence directory no longer exists as a directory.'
                }
                $freshDirectory = Get-Item -LiteralPath $safeDeletePath -Force
                if (Test-IsReparsePoint -Item $freshDirectory) {
                    throw 'Evidence directory changed into a reparse point.'
                }
                if (@(Get-ChildItem -LiteralPath $safeDeletePath -Force -ErrorAction Stop).Count -ne 0) {
                    throw 'Evidence directory is no longer empty.'
                }
            }
            $safeReparsePoints = if ($null -ne $freshMeasurement) {
                @($freshMeasurement.SafeReparsePoints)
            }
            elseif ($target.PSObject.Properties.Name -contains 'SafeReparsePoints') {
                @($target.SafeReparsePoints)
            }
            else {
                @()
            }
            if ($target.Kind -eq 'generated-directory') {
                foreach ($reparsePath in @($safeReparsePoints | Sort-Object { $_.Length } -Descending)) {
                    $reparseFull = [System.IO.Path]::GetFullPath([string]$reparsePath)
                    $deletePrefix = $safeDeletePath.TrimEnd('\', '/') + [System.IO.Path]::DirectorySeparatorChar
                    if (-not $reparseFull.StartsWith($deletePrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
                        throw "Refusing a generated-output link outside its deletion root: $reparsePath"
                    }
                    if (Test-Path -LiteralPath $reparseFull) {
                        $reparseItem = Get-Item -LiteralPath $reparseFull -Force
                        if (
                            -not (Test-IsReparsePoint -Item $reparseItem) -or
                            -not (Test-IsSafeGeneratedReparsePoint -Root $repositoryRoot -Item $reparseItem)
                        ) {
                            throw "Generated-output link changed after inspection: $reparsePath"
                        }
                        if ($reparseItem.PSIsContainer) {
                            [System.IO.Directory]::Delete($reparseFull, $false)
                        }
                        else {
                            [System.IO.File]::Delete($reparseFull)
                        }
                    }
                }
                Remove-Item -LiteralPath $safeDeletePath -Force -Recurse -ErrorAction Stop
            }
            elseif ($target.Kind -eq 'expired-untracked-evidence') {
                [System.IO.File]::Delete($safeDeletePath)
            }
            elseif ($target.Kind -eq 'empty-evidence-directory') {
                [System.IO.Directory]::Delete($safeDeletePath, $false)
            }
            else {
                throw "Unknown cleanup target kind: $($target.Kind)"
            }
        }
        catch {
            [void]$failed.Add([pscustomobject]@{
                Path = $target.Path
                Reason = $_.Exception.Message
                ScriptStackTrace = $_.ScriptStackTrace
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
