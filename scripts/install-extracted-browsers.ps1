#
# Install extracted Playwright browsers on Company PC
# Usage: .\install-extracted-browsers.ps1 [-TarballPath "playwright-browsers-v1.57.0.tar.gz"]
#
# This script:
# 1. Extracts browsers from tarball
# 2. Copies them to Playwright cache directory
# 3. Sets environment variable to skip browser download
#

param(
    [string]$TarballPath = "playwright-browsers-v1.57.0.tar.gz"
)

$ErrorActionPreference = "Stop"

Write-Host "╔════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   Install Playwright Browsers (Offline)   ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Check if tarball exists
if (-not (Test-Path $TarballPath)) {
    Write-Host "❌ Error: Tarball not found: $TarballPath" -ForegroundColor Red
    Write-Host ""
    Write-Host "Expected file: $TarballPath"
    Write-Host ""
    Write-Host "Did you transfer the file from your personal PC?"
    exit 1
}

# Extract tarball
Write-Host "📂 Extracting browsers from tarball..." -ForegroundColor Yellow
tar -xzf $TarballPath

if (-not (Test-Path "playwright-browsers/ms-playwright")) {
    Write-Host "❌ Error: Invalid tarball structure" -ForegroundColor Red
    Write-Host "Expected: playwright-browsers/ms-playwright/"
    exit 1
}

# Set up Playwright cache directory
$PlaywrightCache = "$env:LOCALAPPDATA\ms-playwright"
Write-Host ""
Write-Host "📁 Installing browsers to: $PlaywrightCache" -ForegroundColor Yellow

New-Item -ItemType Directory -Force -Path $PlaywrightCache | Out-Null

# Copy browsers
Write-Host "📋 Copying browser binaries..." -ForegroundColor Yellow
Copy-Item -Path "playwright-browsers\ms-playwright\*" -Destination $PlaywrightCache -Recurse -Force

# Clean up extracted folder
Write-Host ""
Write-Host "🧹 Cleaning up..." -ForegroundColor Yellow
Remove-Item -Recurse -Force playwright-browsers/

# Verify installation
Write-Host ""
Write-Host "✓ Browsers installed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Installed browsers:" -ForegroundColor Cyan
Get-ChildItem $PlaywrightCache -Directory | ForEach-Object {
    $Size = (Get-ChildItem $_.FullName -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
    Write-Host ("  - {0} ({1:N0} MB)" -f $_.Name, $Size)
}

Write-Host ""
Write-Host "╔════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║         Installation Complete!             ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Install npm packages WITHOUT downloading browsers:"
Write-Host ""
Write-Host "     `$env:PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = `"1`""
Write-Host "     npm install"
Write-Host ""
Write-Host "  2. Or add to your PowerShell profile for permanent use:"
Write-Host ""
Write-Host "     Add-Content `$PROFILE `"``$env:PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = '1'`""
Write-Host ""
Write-Host "  3. Verify installation:"
Write-Host ""
Write-Host "     npx playwright --version"
Write-Host ""
