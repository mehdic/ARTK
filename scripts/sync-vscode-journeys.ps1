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
    Write-Error "ERROR: Source directory not found: $SourceDir"
    exit 1
}

# Atomic operation: remove old directory completely and recreate
# This ensures hidden files are also removed (unlike rm -rf /*)
if (Test-Path $TargetDir) {
    Remove-Item -Recurse -Force $TargetDir
}
New-Item -ItemType Directory -Force -Path $TargetDir | Out-Null

# Copy journey core files
Copy-Item -Recurse -Force "$SourceDir\*" $TargetDir

# Remove .DS_Store files (in case they were copied from macOS)
Get-ChildItem -Path $TargetDir -Recurse -Force -Filter ".DS_Store" -ErrorAction SilentlyContinue |
    Remove-Item -Force -ErrorAction SilentlyContinue

Write-Host "Done: VS Code extension journeys synced"
