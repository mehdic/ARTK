#
# Sync Company PC with GitHub after patches were applied on Home PC
# Usage: .\sync-from-github.ps1
#
# This script:
# 1. Fetches latest changes from GitHub
# 2. Detects if local commits were already applied via patches
# 3. Automatically resets branch to origin (discards duplicate commits)
# 4. Cleans up any remaining patch files
#

$ErrorActionPreference = "Stop"

Write-Host "╔════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   ARTK Sync from GitHub (Company PC)      ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Get current branch
$Branch = git rev-parse --abbrev-ref HEAD
Write-Host "Current branch: " -ForegroundColor Cyan -NoNewline
Write-Host $Branch

# Fetch latest from remote
Write-Host ""
Write-Host "Fetching latest changes from GitHub..." -ForegroundColor Cyan
git fetch origin

# Check if we have local commits ahead of origin
$CommitsAhead = 0
try {
    $CommitsAhead = [int](git rev-list --count "origin/$Branch..HEAD" 2>$null)
} catch {
    $CommitsAhead = 0
}

if ($CommitsAhead -eq 0) {
    Write-Host "✓ Already up to date with origin/$Branch" -ForegroundColor Green

    # Clean up any leftover patch files
    if (Test-Path "patches") {
        $PatchFiles = Get-ChildItem -Path "patches" -Filter "*.patch" -ErrorAction SilentlyContinue
        if ($PatchFiles) {
            Write-Host ""
            Write-Host "Cleaning up leftover patch files..." -ForegroundColor Yellow
            Remove-Item -Path "patches/*.patch" -Force -ErrorAction SilentlyContinue
            Remove-Item -Path "patches/README.txt" -Force -ErrorAction SilentlyContinue
            Write-Host "✓ Patches cleaned up" -ForegroundColor Green
        }
    }

    exit 0
}

# Check if we're behind origin (need to pull)
$CommitsBehind = 0
try {
    $CommitsBehind = [int](git rev-list --count "HEAD..origin/$Branch" 2>$null)
} catch {
    $CommitsBehind = 0
}

Write-Host ""
Write-Host "Status:" -ForegroundColor Yellow
Write-Host "  Local commits ahead:  $CommitsAhead"
Write-Host "  Remote commits ahead: $CommitsBehind"

# Get local commit messages
$LocalCommits = @()
if ($CommitsAhead -gt 0) {
    $LocalCommits = git log --format="%s" "origin/$Branch..HEAD"
}

# Get remote commit messages
$RemoteCommits = @()
if ($CommitsBehind -gt 0) {
    $RemoteCommits = git log --format="%s" "HEAD..origin/$Branch"
}

# Check if local commits match recent remote commits (were applied via patches)
$AllCommitsApplied = $true
$MatchedCommits = 0

foreach ($localMsg in $LocalCommits) {
    $Found = $false
    foreach ($remoteMsg in $RemoteCommits) {
        if ($remoteMsg -eq $localMsg) {
            $Found = $true
            $MatchedCommits++
            break
        }
    }
    if (-not $Found) {
        $AllCommitsApplied = $false
        break
    }
}

Write-Host ""

if ($AllCommitsApplied -and $MatchedCommits -eq $CommitsAhead) {
    # All local commits were applied via patches - safe to reset
    Write-Host "✓ Detected that your $CommitsAhead local commit(s) were applied via patches on Home PC" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Your local commits:" -ForegroundColor Cyan
    foreach ($msg in $LocalCommits) {
        Write-Host "  - $msg"
    }
    Write-Host ""
    Write-Host "These are now on origin/$Branch with different commit hashes (from git am)" -ForegroundColor Yellow
    Write-Host "Resetting your branch to origin/$Branch to avoid duplicates..." -ForegroundColor Yellow
    Write-Host ""

    # Reset to origin
    git reset --hard "origin/$Branch"

    Write-Host ""
    Write-Host "✓ Branch synchronized with origin/$Branch" -ForegroundColor Green
    Write-Host "✓ Duplicate commits removed" -ForegroundColor Green

    # Clean up patch files
    if (Test-Path "patches") {
        Write-Host ""
        Write-Host "Cleaning up patch files..." -ForegroundColor Yellow
        Remove-Item -Path "patches/*.patch" -Force -ErrorAction SilentlyContinue
        Remove-Item -Path "patches/README.txt" -Force -ErrorAction SilentlyContinue
        Write-Host "✓ Patches cleaned up" -ForegroundColor Green
    }

} elseif ($CommitsAhead -gt 0 -and $CommitsBehind -eq 0) {
    # Have local commits but they're not on remote yet
    Write-Host "⚠ You have $CommitsAhead local commit(s) that haven't been applied via patches yet:" -ForegroundColor Yellow
    Write-Host ""
    foreach ($msg in $LocalCommits) {
        Write-Host "  - $msg"
    }
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Run: .\scripts\export-patches.ps1"
    Write-Host "  2. Wait for patches to sync to Home PC"
    Write-Host "  3. On Home PC, run: /apply-patches"
    Write-Host "  4. Then run this script again: .\scripts\sync-from-github.ps1"

} else {
    # Mixed state - some commits applied, some not, or diverged
    Write-Host "⚠ Your branch has diverged from origin/$Branch" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "This usually means:" -ForegroundColor Cyan
    Write-Host "  - Some commits were applied via patches, others weren't"
    Write-Host "  - Or you made new commits after exporting patches"
    Write-Host ""
    Write-Host "Recommended action:" -ForegroundColor Cyan
    Write-Host "  1. Check which commits you want to keep: git log origin/$Branch..HEAD"
    Write-Host "  2. If you want to keep them: .\scripts\export-patches.ps1"
    Write-Host "  3. If you want to discard them: git reset --hard origin/$Branch"
}

Write-Host ""
Write-Host "╔════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║              Sync Complete                 ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════╝" -ForegroundColor Cyan
