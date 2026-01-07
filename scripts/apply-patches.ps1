#
# Apply patches from Company PC to Home PC (PowerShell version)
# Usage: .\apply-patches.ps1
#
# This script:
# 1. Checks for patch files in .\patches\
# 2. Applies them using git am
# 3. Pushes to GitHub
# 4. Archives applied patches
#

$ErrorActionPreference = "Stop"

$PatchesDir = ".\patches"
$ArchiveDir = ".\patches\.applied"

Write-Host "╔════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     ARTK Patch Application Script         ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Check if patches directory exists
if (-not (Test-Path $PatchesDir)) {
    Write-Host "Error: patches\ directory not found" -ForegroundColor Red
    Write-Host "No patches to apply."
    exit 0
}

# Find patch files
$PatchFiles = Get-ChildItem -Path $PatchesDir -Filter "*.patch" -File | Sort-Object Name

if ($PatchFiles.Count -eq 0) {
    Write-Host "✓ No new patches to apply" -ForegroundColor Green
    exit 0
}

# Show patches to apply
Write-Host "Found $($PatchFiles.Count) patch file(s) to apply:" -ForegroundColor Yellow
$PatchFiles | ForEach-Object {
    Write-Host "  - $($_.Name)"
}
Write-Host ""

# Check git status
$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Host "Error: Working directory not clean" -ForegroundColor Red
    Write-Host "Please commit or stash your changes first."
    git status --short
    exit 1
}

# Pull latest changes
Write-Host "Pulling latest changes from remote..." -ForegroundColor Cyan
git pull

# Apply patches
Write-Host "Applying patches..." -ForegroundColor Cyan
try {
    git am "$PatchesDir\*.patch"
    Write-Host "✓ All patches applied successfully" -ForegroundColor Green
} catch {
    Write-Host "Error: Patch application failed" -ForegroundColor Red
    Write-Host ""
    Write-Host "To see the failed patch:"
    Write-Host "  git am --show-current-patch"
    Write-Host ""
    Write-Host "To abort:"
    Write-Host "  git am --abort"
    exit 1
}

# Show what was applied
Write-Host ""
Write-Host "Applied commits:" -ForegroundColor Cyan
git log --oneline -$($PatchFiles.Count)
Write-Host ""

# Push to remote
Write-Host "Pushing to GitHub..." -ForegroundColor Cyan
git push

Write-Host ""
Write-Host "✓ Patches applied and pushed successfully!" -ForegroundColor Green
Write-Host ""

# Archive applied patches
Write-Host "Archiving applied patches..." -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path $ArchiveDir | Out-Null
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$ArchiveSubdir = Join-Path $ArchiveDir $Timestamp
New-Item -ItemType Directory -Force -Path $ArchiveSubdir | Out-Null

$PatchFiles | ForEach-Object {
    Move-Item $_.FullName -Destination $ArchiveSubdir
    Write-Host "  → $($_.Name)"
}

# Move README.txt if present
$ReadmePath = Join-Path $PatchesDir "README.txt"
if (Test-Path $ReadmePath) {
    Move-Item $ReadmePath -Destination $ArchiveSubdir
}

Write-Host "✓ Patches archived to: $ArchiveSubdir" -ForegroundColor Green
Write-Host ""

Write-Host "╔════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║           All Done! ✓                      ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════╝" -ForegroundColor Cyan
