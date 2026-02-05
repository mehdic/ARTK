# Sync Journey Core to VS Code extension assets
# PowerShell equivalent of sync-vscode-journeys.sh for Windows compatibility

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent $ScriptDir

$SourceDir = Join-Path $RepoRoot "core\artk-core-journeys\artk-core-journeys"
$TargetDir = Join-Path $RepoRoot "packages\vscode-extension\assets\journeys"

Write-Host "Syncing VS Code extension journeys..."

# Verify source exists
if (-not (Test-Path $SourceDir)) {
    Write-Error "ERROR: Journey Core not found at: $SourceDir"
    Write-Error "Expected structure: core\artk-core-journeys\artk-core-journeys\"
    exit 1
}

# FIX Issue 3: Verify source is not empty
$sourceContents = Get-ChildItem -Path $SourceDir -Force -ErrorAction SilentlyContinue
if (-not $sourceContents -or $sourceContents.Count -eq 0) {
    Write-Error "ERROR: Source directory is empty: $SourceDir"
    exit 1
}

# FIX Issue 7: Check if target is a symlink (security check)
if (Test-Path $TargetDir) {
    $targetItem = Get-Item $TargetDir -Force
    if ($targetItem.Attributes -band [System.IO.FileAttributes]::ReparsePoint) {
        Write-Error "ERROR: Target is a symlink/junction, refusing to continue for security: $TargetDir"
        exit 1
    }
}

# FIX Issue 1: Atomic operation using staging directory (matches bash script)
$StagingDir = "$TargetDir.staging.$PID"

# Clean up any leftover staging directories from previous runs
Get-ChildItem -Path (Split-Path $TargetDir -Parent) -Filter "journeys.staging.*" -Directory -ErrorAction SilentlyContinue |
    Remove-Item -Recurse -Force -ErrorAction SilentlyContinue

# Create staging directory
New-Item -ItemType Directory -Force -Path $StagingDir | Out-Null

try {
    # Copy journey core files to staging
    Copy-Item -Recurse -Force "$SourceDir\*" $StagingDir

    # Remove .DS_Store files from staging (in case they were copied from macOS)
    Get-ChildItem -Path $StagingDir -Recurse -Force -Filter ".DS_Store" -ErrorAction SilentlyContinue |
        Remove-Item -Force -ErrorAction SilentlyContinue

    # FIX Issue 2: Post-copy verification for critical files
    $criticalFiles = @(
        "core.manifest.json",
        "journeys\schema\journey.frontmatter.schema.json"
    )
    foreach ($file in $criticalFiles) {
        $filePath = Join-Path $StagingDir $file
        if (-not (Test-Path $filePath)) {
            throw "Post-copy verification failed: $file not found at $filePath"
        }
    }

    # Atomic swap: remove old, rename staging to target
    if (Test-Path $TargetDir) {
        Remove-Item -Recurse -Force $TargetDir
    }
    Rename-Item -Path $StagingDir -NewName (Split-Path $TargetDir -Leaf)

    Write-Host "Done: VS Code extension journeys synced"
}
catch {
    # Cleanup staging directory on failure
    if (Test-Path $StagingDir) {
        Remove-Item -Recurse -Force $StagingDir -ErrorAction SilentlyContinue
    }
    Write-Error "ERROR: Sync failed - $_"
    exit 1
}
