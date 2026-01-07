<#
ARTK Export Patches Script

Exports all commits that exist locally but are not in the upstream tracking branch
into .patch files for transfer to another PC.

Usage:
    .\scripts\export-patches.ps1
    .\scripts\export-patches.ps1 -OutputDir .\patches
    .\scripts\export-patches.ps1 -OutputDir C:\temp\artk-patches
#>

param(
    [string]$OutputDir = ".\patches"
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " ARTK Patch Export Script" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

function Fail([string]$Message) {
    Write-Host "Error: $Message" -ForegroundColor Red
    exit 1
}

# Verify git repo
try {
    git rev-parse --git-dir | Out-Null
} catch {
    Fail "Not in a git repository. Run this from inside the repo."
}

$CurrentBranch = (git rev-parse --abbrev-ref HEAD).Trim()
if (-not $CurrentBranch) {
    Fail "Unable to determine current branch."
}

# Determine upstream (preferred) or fall back to origin/<branch>, then origin/main.
$Upstream = $null
try {
    $Upstream = (git rev-parse --abbrev-ref "@{upstream}" 2>$null).Trim()
} catch {
    $Upstream = $null
}

if (-not $Upstream) {
    $candidate = "origin/$CurrentBranch"
    git rev-parse --verify $candidate 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) {
        $Upstream = $candidate
    } else {
        $Upstream = "origin/main"
    }
}

# Ensure upstream exists (otherwise format-patch range will fail)
git rev-parse --verify $Upstream 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
    Fail "Upstream '$Upstream' not found. Run 'git fetch' and/or set upstream."
}

# Collect unpushed commits
$commitList = @(git rev-list --reverse "$Upstream..HEAD" 2>$null)
if ($LASTEXITCODE -ne 0) {
    Fail "Failed to compute commit range '$Upstream..HEAD'."
}

if ($commitList.Count -eq 0) {
    Write-Host "No unpushed commits found. Nothing to export." -ForegroundColor Green
    exit 0
}

Write-Host "Branch:   $CurrentBranch" -ForegroundColor Cyan
Write-Host "Upstream: $Upstream" -ForegroundColor Cyan
Write-Host "Commits:  $($commitList.Count)" -ForegroundColor Yellow

# Prepare output directory
if (Test-Path $OutputDir) {
    Get-ChildItem -Path $OutputDir -File -Filter "*.patch" -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue
    Remove-Item -Path (Join-Path $OutputDir "README.txt") -Force -ErrorAction SilentlyContinue
} else {
    New-Item -ItemType Directory -Path $OutputDir | Out-Null
}

# Generate patches
$patchFiles = @(git format-patch "$Upstream..HEAD" -o $OutputDir)
if ($LASTEXITCODE -ne 0 -or $patchFiles.Count -eq 0) {
    Fail "Failed to generate patch files via git format-patch."
}

$outputDirFull = (Resolve-Path -Path $OutputDir).Path
$patchFilesFull = @(
    $patchFiles | ForEach-Object {
        try {
            (Resolve-Path -Path $_).Path
        } catch {
            # git may return a relative filename; fall back to joining with output dir
            (Join-Path -Path $outputDirFull -ChildPath (Split-Path -Leaf $_))
        }
    }
)

$readmePath = Join-Path $OutputDir "README.txt"
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$readme = @(
    "ARTK Patch Export"
    "==============="
    ""
    "Created:  $timestamp"
    "Branch:   $CurrentBranch"
    "Upstream: $Upstream"
    "Commits:  $($commitList.Count)"
    "Output:   $outputDirFull"
    ""
    "Patch files:"
)

$readme += @(
    $patchFilesFull | ForEach-Object { "  - $_" }
)

$readme += @(
    ""
    "Apply on another PC:"
    "  1) Copy this folder to the other PC"
    "  2) In the repo on the other PC:"
    "       git am patches/*.patch"
    "  3) Then push:"
    "       git push"
    ""
    "If git am fails, abort with:"
    "  git am --abort"
)

Set-Content -Path $readmePath -Value ($readme -join "`r`n") -Encoding UTF8

Write-Host "" 
Write-Host "Created patch files in: $OutputDir" -ForegroundColor Green
Write-Host "" 
Write-Host "Next:" -ForegroundColor Cyan
Write-Host "  - Transfer '$OutputDir' to your other PC"
Write-Host "  - Apply: git am patches/*.patch"

# Open instructions in Notepad for convenience
try {
    Start-Process -FilePath "notepad.exe" -ArgumentList @($readmePath) | Out-Null
} catch {
    Write-Host "Note: Could not open Notepad automatically. README is at: $readmePath" -ForegroundColor Yellow
}
