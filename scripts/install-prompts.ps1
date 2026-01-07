#
# ARTK Prompts Installation Script (PowerShell)
# Usage: .\install-prompts.ps1 -TargetPath C:\path\to\target-project
#
# Installs everything needed for ARTK prompts to work:
# 1. Copies prompt files to .github\prompts\
# 2. Bundles @artk/core to .artk\core\ so /init-playbook can use it
# 3. Bundles @artk/core-autogen to .artk\autogen\ for Journey System CLI tools
# 4. Configures VS Code prompt recommendations
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

# Bundle @artk/core so /init-playbook can use it
Write-Host "Bundling @artk/core..." -ForegroundColor Yellow
$ArtkCoreSource = Join-Path $ArtkRoot "core\typescript"

# Build if needed
$CoreDist = Join-Path $ArtkCoreSource "dist"
if (-not (Test-Path $CoreDist)) {
    Write-Host "Building @artk/core (dist not found)..." -ForegroundColor Yellow
    Push-Location $ArtkCoreSource
    try {
        npm install
        npm run build
    } finally {
        Pop-Location
    }
}

# Copy to .artk/core/
$CoreTarget = Join-Path $TargetProject ".artk\core"
New-Item -ItemType Directory -Force -Path $CoreTarget | Out-Null
Copy-Item -Path (Join-Path $ArtkCoreSource "dist") -Destination $CoreTarget -Recurse -Force
Copy-Item -Path (Join-Path $ArtkCoreSource "package.json") -Destination $CoreTarget -Force
$VersionJson = Join-Path $ArtkCoreSource "version.json"
if (Test-Path $VersionJson) {
    Copy-Item -Path $VersionJson -Destination $CoreTarget -Force
}
$ReadmePath = Join-Path $ArtkCoreSource "README.md"
if (Test-Path $ReadmePath) {
    Copy-Item -Path $ReadmePath -Destination $CoreTarget -Force
}
Write-Host "  ✓ @artk/core bundled to .artk\core\" -ForegroundColor Cyan

# Bundle @artk/core-autogen
Write-Host "Bundling @artk/core-autogen..." -ForegroundColor Yellow
$AutogenSource = Join-Path $ArtkRoot "core\typescript\autogen"

# Build autogen if needed
$AutogenDist = Join-Path $AutogenSource "dist"
if (-not (Test-Path $AutogenDist)) {
    Write-Host "Building @artk/core-autogen (dist not found)..." -ForegroundColor Yellow
    Push-Location $AutogenSource
    try {
        npm install
        npm run build
    } finally {
        Pop-Location
    }
}

# Copy to .artk/autogen/
$AutogenTarget = Join-Path $TargetProject ".artk\autogen"
New-Item -ItemType Directory -Force -Path $AutogenTarget | Out-Null
Copy-Item -Path (Join-Path $AutogenSource "dist") -Destination $AutogenTarget -Recurse -Force
Copy-Item -Path (Join-Path $AutogenSource "package.json") -Destination $AutogenTarget -Force
$AutogenReadme = Join-Path $AutogenSource "README.md"
if (Test-Path $AutogenReadme) {
    Copy-Item -Path $AutogenReadme -Destination $AutogenTarget -Force
}
Write-Host "  ✓ @artk/core-autogen bundled to .artk\autogen\" -ForegroundColor Cyan

Write-Host ""
Write-Host "╔════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║      ARTK Installation Complete!           ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "Installed:" -ForegroundColor Cyan
Write-Host "  .github\prompts\  - $count Copilot prompts"
Write-Host "  .artk\core\       - @artk/core library"
Write-Host "  .artk\autogen\    - @artk/core-autogen CLI"
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
