# Sync prompts from source to VS Code extension assets
# This ensures the extension installer has the latest prompts

param(
    [switch]$Verbose
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent $ScriptDir

$SourceDir = Join-Path $RepoRoot "prompts"
$TargetDir = Join-Path $RepoRoot "packages\vscode-extension\assets\prompts"

Write-Host "Syncing VS Code extension prompts..."

# Sync main prompt files
$PromptFiles = Get-ChildItem -Path $SourceDir -Filter "artk.*.md" -ErrorAction SilentlyContinue
foreach ($file in $PromptFiles) {
    $destPath = Join-Path $TargetDir $file.Name
    Copy-Item -Path $file.FullName -Destination $destPath -Force
    if ($Verbose) {
        Write-Host "  Copied: $($file.Name)"
    }
}

# Sync next-commands directory
$NextCommandsSource = Join-Path $SourceDir "next-commands"
$NextCommandsTarget = Join-Path $TargetDir "next-commands"
if (Test-Path $NextCommandsSource) {
    if (-not (Test-Path $NextCommandsTarget)) {
        New-Item -ItemType Directory -Path $NextCommandsTarget -Force | Out-Null
    }
    $TxtFiles = Get-ChildItem -Path $NextCommandsSource -Filter "*.txt" -ErrorAction SilentlyContinue
    foreach ($file in $TxtFiles) {
        $destPath = Join-Path $NextCommandsTarget $file.Name
        Copy-Item -Path $file.FullName -Destination $destPath -Force
        if ($Verbose) {
            Write-Host "  Copied: next-commands/$($file.Name)"
        }
    }
}

# Sync common directory
$CommonSource = Join-Path $SourceDir "common"
$CommonTarget = Join-Path $TargetDir "common"
if (Test-Path $CommonSource) {
    if (-not (Test-Path $CommonTarget)) {
        New-Item -ItemType Directory -Path $CommonTarget -Force | Out-Null
    }
    $MdFiles = Get-ChildItem -Path $CommonSource -Filter "*.md" -ErrorAction SilentlyContinue
    foreach ($file in $MdFiles) {
        $destPath = Join-Path $CommonTarget $file.Name
        Copy-Item -Path $file.FullName -Destination $destPath -Force
        if ($Verbose) {
            Write-Host "  Copied: common/$($file.Name)"
        }
    }
}

Write-Host "✓ VS Code extension prompts synced" -ForegroundColor Green
