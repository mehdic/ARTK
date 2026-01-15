#
# ARTK Uninstall Script (PowerShell)
# Usage: .\artk-uninstall.ps1 [-DryRun] [-Yes] [-Root <path>]
#
# This script removes ARTK-installed assets from a client repo.
# It is destructive and requires confirmation unless -Yes is provided.
#

param(
    [string]$Root,
    [switch]$DryRun,
    [switch]$Yes
)

$ErrorActionPreference = "Stop"

function Resolve-RepoRoot {
    param([string]$RootArg)

    if ($RootArg) {
        return (Resolve-Path -LiteralPath $RootArg).Path
    }

    try {
        $gitRoot = git -C . rev-parse --show-toplevel 2>$null
        if ($gitRoot) {
            return (Resolve-Path -LiteralPath $gitRoot).Path
        }
    } catch {
        # ignore
    }

    return (Get-Location).Path
}

function Read-ContextArtkRoot {
    param([string]$RepoRoot)

    $contextPath = Join-Path $RepoRoot ".artk\context.json"
    if (-not (Test-Path $contextPath)) {
        return $null
    }

    try {
        $data = Get-Content $contextPath -Raw | ConvertFrom-Json
        if ($data.artkRoot) {
            return $data.artkRoot
        }
    } catch {
        return $null
    }

    return $null
}

function Normalize-Path {
    param([string]$PathValue, [string]$RepoRoot)

    if (-not $PathValue) {
        return $null
    }

    if ([System.IO.Path]::IsPathRooted($PathValue)) {
        return $PathValue
    }

    return (Join-Path $RepoRoot $PathValue)
}

function Is-WithinRoot {
    param([string]$PathValue, [string]$RepoRoot)

    if (-not $PathValue) {
        return $false
    }

    $full = [System.IO.Path]::GetFullPath($PathValue)
    $rootFull = [System.IO.Path]::GetFullPath($RepoRoot)

    if ($full -eq $rootFull) {
        return $true
    }

    return $full.StartsWith($rootFull, [System.StringComparison]::OrdinalIgnoreCase)
}

function Remove-ArtkSectionFromInstructions {
    param([string]$RepoRoot, [switch]$DryRun)

    $instructionsPath = Join-Path $RepoRoot ".github\copilot-instructions.md"
    if (-not (Test-Path $instructionsPath)) {
        return $false
    }

    $lines = Get-Content $instructionsPath
    $startIndex = $lines | Select-String -Pattern '^## ARTK E2E Testing Framework' -List
    if (-not $startIndex) {
        return $false
    }

    if ($DryRun) {
        Write-Host "DRY RUN: Would remove ARTK section from .github\copilot-instructions.md" -ForegroundColor Yellow
        return $true
    }

    $output = New-Object System.Collections.Generic.List[string]
    $skip = $false

    foreach ($line in $lines) {
        if ($line -match '^## ARTK E2E Testing Framework') {
            $skip = $true
            continue
        }

        if ($skip -and $line -match '^## ') {
            $skip = $false
        }

        if (-not $skip) {
            $output.Add($line)
        }
    }

    Set-Content -Path $instructionsPath -Value $output -Encoding UTF8
    Write-Host "Updated .github\copilot-instructions.md (removed ARTK section)" -ForegroundColor Green
    return $true
}

function Remove-ArtkDependencies {
    param([string]$RepoRoot, [switch]$DryRun)

    $pkgPath = Join-Path $RepoRoot "package.json"
    if (-not (Test-Path $pkgPath)) {
        return $false
    }

    if ($DryRun) {
        Write-Host "DRY RUN: Would remove @artk/core dependencies from package.json" -ForegroundColor Yellow
        return $true
    }

    $pkg = Get-Content $pkgPath -Raw | ConvertFrom-Json
    $fields = @('dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies')
    $changed = $false

    foreach ($field in $fields) {
        if ($pkg.$field) {
            if ($pkg.$field.PSObject.Properties.Name -contains '@artk/core') {
                $pkg.$field.PSObject.Properties.Remove('@artk/core')
                $changed = $true
            }
            if ($pkg.$field.PSObject.Properties.Name -contains '@artk/core-autogen') {
                $pkg.$field.PSObject.Properties.Remove('@artk/core-autogen')
                $changed = $true
            }
            if ($pkg.$field.PSObject.Properties.Count -eq 0) {
                $pkg.PSObject.Properties.Remove($field)
                $changed = $true
            }
        }
    }

    if ($changed) {
        $json = $pkg | ConvertTo-Json -Depth 20
        Set-Content -Path $pkgPath -Value $json -Encoding UTF8
        Write-Host "Updated package.json (removed @artk/core dependencies)" -ForegroundColor Green
    } else {
        Write-Host "package.json unchanged (no @artk/core dependencies found)" -ForegroundColor Cyan
    }

    return $changed
}

$RepoRoot = Resolve-RepoRoot -RootArg $Root
Write-Host "Repo root: $RepoRoot" -ForegroundColor Cyan

$ContextRootRaw = Read-ContextArtkRoot -RepoRoot $RepoRoot
$ContextRoot = Normalize-Path -PathValue $ContextRootRaw -RepoRoot $RepoRoot

$ArtkRoots = @()
if ($ContextRoot -and (Is-WithinRoot -PathValue $ContextRoot -RepoRoot $RepoRoot)) {
    $ArtkRoots += $ContextRoot
}

$artkE2e = Join-Path $RepoRoot "artk-e2e"
if (Test-Path $artkE2e) {
    $ArtkRoots += $artkE2e
}

try {
    $configs = Get-ChildItem -Path $RepoRoot -Recurse -Depth 4 -Filter "artk.config.yml" -File -ErrorAction SilentlyContinue |
        Where-Object { $_.FullName -notmatch '\\node_modules\\' -and $_.FullName -notmatch '\\.git\\' -and $_.FullName -notmatch '\\dist\\' }
    foreach ($cfg in $configs) {
        $ArtkRoots += $cfg.Directory.FullName
    }
} catch {
    # ignore
}

$ArtkRoots = $ArtkRoots | Sort-Object -Unique

if ($ArtkRoots.Count -gt 0) {
    Write-Host "Detected ARTK roots:" -ForegroundColor Cyan
    $ArtkRoots | ForEach-Object { Write-Host "  - $_" }
} else {
    Write-Host "Detected ARTK roots: (none)" -ForegroundColor Cyan
}

$RootLevelArtk = $false
if (Test-Path (Join-Path $RepoRoot "artk.config.yml")) {
    $RootLevelArtk = $true
}
if ($ContextRoot) {
    $contextFull = [System.IO.Path]::GetFullPath($ContextRoot)
    $repoFull = [System.IO.Path]::GetFullPath($RepoRoot)
    if ($contextFull -eq $repoFull) {
        $RootLevelArtk = $true
    }
}

$RemoveDirs = @(
    (Join-Path $RepoRoot ".artk"),
    (Join-Path $RepoRoot "vendor\artk-core"),
    (Join-Path $RepoRoot "vendor\artk-core-autogen")
)

$RemoveFiles = @(
    (Join-Path $RepoRoot "artk.config.yml")
)

if ($RootLevelArtk) {
    $RemoveDirs += @(
        (Join-Path $RepoRoot "journeys"),
        (Join-Path $RepoRoot "tools\journeys"),
        (Join-Path $RepoRoot "docs\discovery")
    )
    $RemoveFiles += @(
        (Join-Path $RepoRoot "journeys.config.yml"),
        (Join-Path $RepoRoot "docs\PLAYBOOK.md"),
        (Join-Path $RepoRoot "docs\DISCOVERY.md"),
        (Join-Path $RepoRoot "docs\TESTABILITY.md")
    )
}

foreach ($root in $ArtkRoots) {
    if (-not $root) {
        continue
    }
    $rootFull = [System.IO.Path]::GetFullPath($root)
    $repoFull = [System.IO.Path]::GetFullPath($RepoRoot)
    if ($rootFull -ne $repoFull) {
        $RemoveDirs += $root
    }
}

$promptFiles = Get-ChildItem -Path (Join-Path $RepoRoot ".github\prompts") -Filter "artk.*.prompt.md" -File -ErrorAction SilentlyContinue
foreach ($file in $promptFiles) {
    $RemoveFiles += $file.FullName
}

$commonPromptFiles = @(
    (Join-Path $RepoRoot ".github\prompts\common\GENERAL_RULES.md")
)
foreach ($file in $commonPromptFiles) {
    $RemoveFiles += $file
}

$instructionCandidates = @(
    (Join-Path $RepoRoot ".github\instructions\artk.instructions.md"),
    (Join-Path $RepoRoot ".github\instructions\artk.instructions.md.backup"),
    (Join-Path $RepoRoot ".github\instructions\journeys.instructions.md"),
    (Join-Path $RepoRoot ".github\instructions\journeys.instructions.md.backup")
)
foreach ($file in $instructionCandidates) {
    $RemoveFiles += $file
}

Write-Host "";
Write-Host "Directories to remove:" -ForegroundColor Yellow
$RemoveDirs | Where-Object { Test-Path $_ } | ForEach-Object { Write-Host "  - $_" }
if (-not ($RemoveDirs | Where-Object { Test-Path $_ })) {
    Write-Host "  (none)"
}

Write-Host "";
Write-Host "Files to remove:" -ForegroundColor Yellow
$RemoveFiles | Where-Object { Test-Path $_ } | ForEach-Object { Write-Host "  - $_" }
if (-not ($RemoveFiles | Where-Object { Test-Path $_ })) {
    Write-Host "  (none)"
}

Write-Host "";
if (Test-Path (Join-Path $RepoRoot ".github\copilot-instructions.md")) {
    if (Select-String -Path (Join-Path $RepoRoot ".github\copilot-instructions.md") -Pattern '^## ARTK E2E Testing Framework' -Quiet) {
        Write-Host "Will edit .github\copilot-instructions.md (remove ARTK section)" -ForegroundColor Yellow
    } else {
        Write-Host "Copilot instructions file found; no ARTK section detected" -ForegroundColor Cyan
    }
} else {
    Write-Host "Copilot instructions file not found" -ForegroundColor Cyan
}

if ($DryRun) {
    Write-Host "";
    Write-Host "Dry run only. No changes were made." -ForegroundColor Cyan
    exit 0
}

if (-not $Yes) {
    Write-Host "";
    Write-Host "This will permanently delete ARTK assets." -ForegroundColor Yellow
    $confirm = Read-Host "Type 'yes' to continue"
    if ($confirm -ne "yes") {
        Write-Host "Aborted. No changes were made." -ForegroundColor Red
        exit 1
    }
}

$removed = 0
$skipped = 0

function Remove-PathSafe {
    param([string]$PathValue, [string]$RepoRoot)

    if (-not $PathValue) {
        return
    }

    if (-not (Is-WithinRoot -PathValue $PathValue -RepoRoot $RepoRoot)) {
        Write-Host "Skipping path outside repo root: $PathValue" -ForegroundColor Yellow
        $script:skipped++
        return
    }

    $fullPath = [System.IO.Path]::GetFullPath($PathValue)
    $rootFull = [System.IO.Path]::GetFullPath($RepoRoot)
    if ($fullPath -eq $rootFull) {
        Write-Host "Skipping repo root: $PathValue" -ForegroundColor Yellow
        $script:skipped++
        return
    }

    if (-not (Test-Path $PathValue)) {
        $script:skipped++
        return
    }

    Remove-Item -LiteralPath $PathValue -Recurse -Force
    $script:removed++
}

foreach ($file in $RemoveFiles) {
    Remove-PathSafe -PathValue $file -RepoRoot $RepoRoot
}

foreach ($dir in $RemoveDirs) {
    Remove-PathSafe -PathValue $dir -RepoRoot $RepoRoot
}

Remove-ArtkSectionFromInstructions -RepoRoot $RepoRoot -DryRun:$DryRun | Out-Null
Remove-ArtkDependencies -RepoRoot $RepoRoot -DryRun:$DryRun | Out-Null

Write-Host "";
Write-Host "ARTK uninstall complete." -ForegroundColor Green
Write-Host "Removed entries: $removed" -ForegroundColor Green
Write-Host "Skipped entries: $skipped" -ForegroundColor Yellow
Write-Host "";
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  - Review changes and run npm install if dependencies were removed."
Write-Host "  - Commit or discard the changes as needed."
