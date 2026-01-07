#
# Export local commits as patches for syncing to another PC (PowerShell)
# Usage: .\export-patches.ps1 [-OutputDir "C:\path\to\output"]
#
# This script exports all commits that exist locally but not on origin/main
# as patch files, ready to be synced and applied on another PC.
#

param(
    [string]$OutputDir = ".\patches"
)

$ErrorActionPreference = "Stop"

Write-Host "╔════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     ARTK Patch Export Script               ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Get current branch
$Branch = git rev-parse --abbrev-ref HEAD
Write-Host "Current branch: " -ForegroundColor Cyan -NoNewline
Write-Host $Branch

# Check if we have upstream
$UpstreamExists = git rev-parse --verify "origin/$Branch" 2>$null
if (-not $UpstreamExists) {
    Write-Host "Warning: No upstream branch origin/$Branch" -ForegroundColor Yellow
    $Upstream = "origin/main"
} else {
    $Upstream = "origin/$Branch"
}

# Count commits ahead
try {
    $CommitsAhead = [int](git rev-list --count "$Upstream..HEAD" 2>$null)
} catch {
    $CommitsAhead = 0
}

if ($CommitsAhead -eq 0) {
    Write-Host "✓ No local commits to export (already pushed)" -ForegroundColor Green
    exit 0
}

Write-Host "Found $CommitsAhead local commit(s) to export" -ForegroundColor Yellow
Write-Host ""

# Show commits that will be exported
Write-Host "Commits to export:" -ForegroundColor Cyan
git log --oneline "$Upstream..HEAD"
Write-Host ""

# Create output directory
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

# Export patches
Write-Host "Exporting patches to: $OutputDir" -ForegroundColor Cyan
git format-patch $Upstream -o $OutputDir

# Get list of exported patches
$PatchFiles = Get-ChildItem -Path $OutputDir -Filter "*.patch" | ForEach-Object { "  - $($_.FullName)" }

# Create README
$Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$OutputDirFull = (Resolve-Path $OutputDir).Path
$ReadmeContent = @"
ARTK Patch Export
===============

Created:  $Timestamp
Branch:   $Branch
Upstream: $Upstream
Commits:  $CommitsAhead
Output:   $OutputDirFull

Patch files:
$($PatchFiles -join "`n")

Apply on another PC:
  1) Sync this folder to the other PC (your sync tool handles this)
  2) In the repo on the other PC:
       .\scripts\apply-patches.ps1
     Or manually:
       git am patches\*.patch
       git push

If git am fails, abort with:
  git am --abort
"@

Set-Content -Path (Join-Path $OutputDir "README.txt") -Value $ReadmeContent

Write-Host ""
Write-Host "✓ Exported $CommitsAhead patch(es)" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Your sync tool will sync the patches folder to Home PC"
Write-Host "  2. On Home PC, run: .\scripts\apply-patches.ps1"
Write-Host ""
Write-Host "╔════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║         Export Complete! ✓                 ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════╝" -ForegroundColor Green
