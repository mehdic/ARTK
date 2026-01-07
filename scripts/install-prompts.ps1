#
# ARTK Prompts Installation Script (PowerShell)
# Usage: .\install-prompts.ps1 -TargetPath C:\path\to\target-project
#
# Copies ARTK prompt files to the target project's .github\prompts\ directory
# for use with GitHub Copilot.
#

param(
    [Parameter(Mandatory=$true, Position=0)]
    [string]$TargetPath
)

$ErrorActionPreference = "Stop"

# Get script location
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ArtkRoot = Split-Path -Parent $ScriptDir
$PromptsSource = Join-Path $ArtkRoot "prompts"

# Resolve target path
try {
    $TargetProject = (Resolve-Path $TargetPath).Path
} catch {
    Write-Host "Error: Target directory does not exist: $TargetPath" -ForegroundColor Red
    exit 1
}

Write-Host "ARTK Prompts Installation" -ForegroundColor Green
Write-Host "================================"
Write-Host "Source: $PromptsSource"
Write-Host "Target: $TargetProject\.github\prompts\"
Write-Host ""

# Check source prompts exist
if (-not (Test-Path $PromptsSource)) {
    Write-Host "Error: Prompts directory not found: $PromptsSource" -ForegroundColor Red
    exit 1
}

# Create target directory
$PromptsTarget = Join-Path $TargetProject ".github\prompts"
Write-Host "Creating prompts directory..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path $PromptsTarget | Out-Null

# Copy prompt files
Write-Host "Copying ARTK prompt files..." -ForegroundColor Yellow
Write-Host ""

$count = 0
Get-ChildItem -Path $PromptsSource -Filter "artk.*.md" | ForEach-Object {
    $filename = $_.Name
    # Convert artk.command.md to artk.command.prompt.md for Copilot
    $newname = $filename -replace '\.md$', '.prompt.md'
    Copy-Item $_.FullName -Destination (Join-Path $PromptsTarget $newname)
    Write-Host "  ✓ $newname" -ForegroundColor Cyan
    $count++
}

# Configure VS Code prompt recommendations
Write-Host "Configuring VS Code prompt recommendations..." -ForegroundColor Yellow
$VscodeDir = Join-Path $TargetProject ".vscode"
$SettingsPath = Join-Path $VscodeDir "settings.json"
$PromptRecs = @{
    "artk.init-playbook" = $true
    "artk.discover-foundation" = $true
    "artk.journey-propose" = $true
    "artk.journey-define" = $true
    "artk.journey-clarify" = $true
    "artk.testid-audit" = $true
    "artk.journey-implement" = $true
    "artk.journey-validate" = $true
    "artk.journey-verify" = $true
}

if (-not (Test-Path $VscodeDir)) {
    New-Item -ItemType Directory -Force -Path $VscodeDir | Out-Null
}

$Settings = @{}
if (Test-Path $SettingsPath) {
    try {
        $Loaded = Get-Content $SettingsPath -Raw | ConvertFrom-Json
        if ($Loaded) {
            $Loaded.psobject.Properties | ForEach-Object {
                $Settings[$_.Name] = $_.Value
            }
        }
    } catch {
        $Settings = @{}
    }
}

$ExistingRecs = @{}
if ($Settings.ContainsKey('chat.promptFilesRecommendations')) {
    $Settings['chat.promptFilesRecommendations'].psobject.Properties | ForEach-Object {
        $ExistingRecs[$_.Name] = $_.Value
    }
}

$MergedRecs = @{}
$ExistingRecs.GetEnumerator() | ForEach-Object { $MergedRecs[$_.Key] = $_.Value }
$PromptRecs.GetEnumerator() | ForEach-Object { $MergedRecs[$_.Key] = $_.Value }

$Settings['chat.promptFilesRecommendations'] = $MergedRecs
$Settings | ConvertTo-Json -Depth 10 | Set-Content -Path $SettingsPath
Write-Host "  ✓ Updated .vscode\\settings.json prompt recommendations" -ForegroundColor Cyan

# Also copy init.prompt.md if it exists
$initPrompt = Join-Path $PromptsSource "init.prompt.md"
if (Test-Path $initPrompt) {
    Copy-Item $initPrompt -Destination (Join-Path $PromptsTarget "artk.init-alt.prompt.md")
    Write-Host "  ✓ artk.init-alt.prompt.md" -ForegroundColor Cyan
    $count++
}

Write-Host ""
Write-Host "✅ Installed $count prompt files successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Prompts location: $PromptsTarget" -ForegroundColor Yellow
Write-Host ""
Write-Host "Available commands in GitHub Copilot Chat:" -ForegroundColor Yellow
Write-Host ""
Get-ChildItem -Path $PromptsTarget -Filter "*.prompt.md" | ForEach-Object {
    $command = $_.BaseName -replace '\.prompt$', ''
    Write-Host "  /$command"
}
Write-Host ""
Write-Host "Next step:" -ForegroundColor Cyan
Write-Host "  Open VS Code, launch Copilot Chat, and run: /artk.init-playbook"
Write-Host ""
