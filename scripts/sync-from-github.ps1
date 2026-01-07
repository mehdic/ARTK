<#
ARTK Sync from GitHub (Company PC)

Use this on the Company PC after patches were applied on the Home PC and pushed.

Why:
  git am creates new commit hashes. After pulling, you can end up with duplicate
  logical changes (same patch content, different commit IDs). This script detects
  that situation and resets to origin/<branch> only when safe.

Usage:
  powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\sync-from-github.ps1
#>

$ErrorActionPreference = "Stop"

function Fail([string]$Message) {
    Write-Host "Error: $Message" -ForegroundColor Red
    exit 1
}

function CleanupPatches() {
    if (Test-Path "patches") {
        Remove-Item -Path "patches/*.patch" -Force -ErrorAction SilentlyContinue
        Remove-Item -Path "patches/README.txt" -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " ARTK Sync from GitHub (Company PC)" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

$Branch = (git rev-parse --abbrev-ref HEAD).Trim()
if (-not $Branch) {
    Fail "Unable to determine current branch."
}

$Upstream = "origin/$Branch"

Write-Host "" 
Write-Host "Current branch: $Branch" -ForegroundColor Cyan
Write-Host "Fetching latest from GitHub..." -ForegroundColor Cyan
git fetch origin | Out-Null

git rev-parse --verify $Upstream 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
    Fail "Upstream '$Upstream' not found. Did you fetch the branch?"
}

$ahead = [int](git rev-list --count "$Upstream..HEAD")
$behind = [int](git rev-list --count "HEAD..$Upstream")

Write-Host "" 
Write-Host "Status:" -ForegroundColor Yellow
Write-Host ("  Local commits ahead:  {0}" -f $ahead)
Write-Host ("  Remote commits ahead: {0}" -f $behind)

if ($ahead -eq 0 -and $behind -eq 0) {
    Write-Host "" 
    Write-Host "Already up to date." -ForegroundColor Green
    CleanupPatches
    exit 0
}

if ($ahead -eq 0 -and $behind -gt 0) {
    Write-Host "" 
    Write-Host "Fast-forwarding to latest remote..." -ForegroundColor Yellow
    git pull --ff-only | Out-Null
    CleanupPatches
    Write-Host "Synchronized with $Upstream." -ForegroundColor Green
    exit 0
}

if ($ahead -gt 0 -and $behind -eq 0) {
    Write-Host "" 
    Write-Host "You have local commits not on remote yet." -ForegroundColor Yellow
    Write-Host "Next:" -ForegroundColor Cyan
    Write-Host "  1) Run: powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\export-patches.ps1"
    Write-Host "  2) Apply on Home PC and push"
    Write-Host "  3) Re-run this sync script"
    exit 0
}

# Diverged: check if local-only commits were applied via patches (same patch-id exists remotely)
$base = (git merge-base HEAD $Upstream).Trim()
if (-not $base) {
    Fail "Unable to compute merge-base between HEAD and $Upstream."
}

$localOnly = @(git rev-list --reverse "$base..HEAD")
$remoteOnly = @(git rev-list --reverse "$base..$Upstream")

function GetPatchId([string]$CommitHash) {
    # patch-id is stable for equivalent diffs and ignores commit metadata
    $out = (git show $CommitHash --no-color | git patch-id --stable)
    if (-not $out) { return $null }
    return ($out.ToString().Split(" ")[0]).Trim()
}

$remotePatchIds = @{}
foreach ($c in $remoteOnly) {
    $pid = GetPatchId $c
    if ($pid) { $remotePatchIds[$pid] = $true }
}

$allLocalApplied = $true
$missing = @()
foreach ($c in $localOnly) {
    $pid = GetPatchId $c
    if (-not $pid) { $allLocalApplied = $false; $missing += $c; continue }
    if (-not $remotePatchIds.ContainsKey($pid)) {
        $allLocalApplied = $false
        $missing += $c
    }
}

Write-Host "" 

if ($allLocalApplied -and $localOnly.Count -gt 0) {
    Write-Host "Detected that local commits were applied on remote via patches." -ForegroundColor Yellow
    Write-Host "Resetting to $Upstream to remove duplicates..." -ForegroundColor Yellow
    git reset --hard $Upstream | Out-Null
    CleanupPatches
    Write-Host "Synchronized with $Upstream; duplicate commits removed." -ForegroundColor Green
    exit 0
}

Write-Host "Branch is diverged and local commits do not fully match remote patches." -ForegroundColor Yellow
Write-Host "Missing (not found on remote by patch-id):" -ForegroundColor Cyan
foreach ($c in $missing) {
    $subject = (git log -1 --format="%s" $c)
    Write-Host ("  - {0} {1}" -f $c.Substring(0,7), $subject)
}

Write-Host "" 
Write-Host "Recommended next steps:" -ForegroundColor Cyan
Write-Host "  1) Review: git log --oneline $Upstream..HEAD"
Write-Host "  2) Export remaining commits: .\scripts\export-patches.ps1"
Write-Host "  3) Or discard local commits: git reset --hard $Upstream"
