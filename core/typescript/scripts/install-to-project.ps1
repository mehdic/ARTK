<#
.SYNOPSIS
    ARTK Core Vendor Installation Script (PowerShell)
.DESCRIPTION
    Copies @artk/core to the target project's vendor directory
    and updates package.json to reference it.
.PARAMETER TargetProject
    Path to the target project directory
.EXAMPLE
    .\install-to-project.ps1 -TargetProject "C:\projects\my-playwright-project"
    .\install-to-project.ps1 .
#>

param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$TargetProject
)

$ErrorActionPreference = "Stop"

# Get the directory where this script lives
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ArtkCoreDir = Split-Path -Parent $ScriptDir

# Resolve target project path
try {
    $TargetProject = Resolve-Path $TargetProject -ErrorAction Stop | Select-Object -ExpandProperty Path
} catch {
    Write-Host "Error: Target directory does not exist: $TargetProject" -ForegroundColor Red
    exit 1
}

Write-Host "ARTK Core Vendor Installation" -ForegroundColor Green
Write-Host "================================"
Write-Host "Source: $ArtkCoreDir"
Write-Host "Target: $TargetProject"
Write-Host ""

# Check if dist exists, if not build it
$DistPath = Join-Path $ArtkCoreDir "dist"
if (-not (Test-Path $DistPath)) {
    Write-Host "Building @artk/core (dist not found)..." -ForegroundColor Yellow
    Push-Location $ArtkCoreDir
    try {
        npm install
        npm run build
    } finally {
        Pop-Location
    }
    Write-Host ""
}

# Check target has package.json
$PackageJsonPath = Join-Path $TargetProject "package.json"
if (-not (Test-Path $PackageJsonPath)) {
    Write-Host "Error: No package.json found in target project" -ForegroundColor Red
    Write-Host "Run 'npm init -y' in your project first."
    exit 1
}

# Create vendor directory
$VendorDir = Join-Path $TargetProject "vendor" "artk-core"
Write-Host "Creating vendor directory..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path $VendorDir -Force | Out-Null

# Copy files
Write-Host "Copying @artk/core files..." -ForegroundColor Yellow
Copy-Item -Path (Join-Path $ArtkCoreDir "dist") -Destination $VendorDir -Recurse -Force
Copy-Item -Path (Join-Path $ArtkCoreDir "package.json") -Destination $VendorDir -Force
Copy-Item -Path (Join-Path $ArtkCoreDir "version.json") -Destination $VendorDir -Force
$ReadmePath = Join-Path $ArtkCoreDir "README.md"
if (Test-Path $ReadmePath) {
    Copy-Item -Path $ReadmePath -Destination $VendorDir -Force
}

# Update package.json
Write-Host "Updating package.json..." -ForegroundColor Yellow
Push-Location $TargetProject
try {
    $packageContent = Get-Content $PackageJsonPath -Raw

    # Use Node.js to update package.json properly
    $nodeScript = @'
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.devDependencies = pkg.devDependencies || {};
pkg.devDependencies['@artk/core'] = 'file:./vendor/artk-core';
// Sort devDependencies
const sorted = {};
Object.keys(pkg.devDependencies).sort().forEach(k => sorted[k] = pkg.devDependencies[k]);
pkg.devDependencies = sorted;
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
'@

    node -e $nodeScript
} finally {
    Pop-Location
}

Write-Host ""
Write-Host "✅ @artk/core installed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Note:" -ForegroundColor Yellow -NoNewline
Write-Host " Run 'npm install' in your project when ready."
Write-Host "      The @artk/core package will be linked from vendor/artk-core/"
Write-Host ""
Write-Host "Vendor location: $VendorDir"
Write-Host ""
Write-Host "You can now import from @artk/core:"
Write-Host "  import { loadConfig } from '@artk/core/config';"
Write-Host "  import { test, expect } from '@artk/core/fixtures';"
Write-Host "  import { createPlaywrightConfig } from '@artk/core/harness';"
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Create artk.config.yml in your project root"
Write-Host "  2. Update playwright.config.ts to use createPlaywrightConfig()"
Write-Host "  3. Write tests using @artk/core/fixtures"
Write-Host ""
