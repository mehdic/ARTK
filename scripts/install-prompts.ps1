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
Write-Host "Usage:" -ForegroundColor Yellow
Write-Host "  1. Open GitHub Copilot Chat in VS Code"
Write-Host "  2. Type a command like: /artk.init"
Write-Host "  3. Copilot will use the prompt to guide the operation"
Write-Host ""
