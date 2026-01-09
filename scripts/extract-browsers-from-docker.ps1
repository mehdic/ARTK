#
# Extract Playwright browsers from Docker image (PowerShell)
# Usage: .\extract-browsers-from-docker.ps1 [-Version "v1.57.0"]
#

param(
    [string]$Version = "v1.57.0"
)

$ErrorActionPreference = "Stop"

$Image = "mcr.microsoft.com/playwright:$Version-focal"
$Output = "playwright-browsers-$Version.tar.gz"

Write-Host "╔════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Extract Playwright Browsers from Docker  ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is installed
try {
    docker --version | Out-Null
} catch {
    Write-Host "❌ Error: Docker is not installed" -ForegroundColor Red
    Write-Host "Install Docker from: https://www.docker.com/get-started"
    exit 1
}

# Pull Docker image
Write-Host "📥 Pulling Docker image: $Image" -ForegroundColor Yellow
Write-Host "   (This may take a few minutes, ~2GB download)" -ForegroundColor Gray
docker pull $Image

Write-Host ""
Write-Host "📦 Creating temporary container..." -ForegroundColor Yellow
docker create --name playwright-extract $Image

Write-Host ""
Write-Host "📂 Extracting browsers from container..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path "playwright-browsers" | Out-Null
docker cp playwright-extract:/ms-playwright ./playwright-browsers/

Write-Host ""
Write-Host "🧹 Cleaning up container..." -ForegroundColor Yellow
docker rm playwright-extract

Write-Host ""
Write-Host "🗜️  Creating tarball: $Output" -ForegroundColor Yellow
tar -czf $Output playwright-browsers/

Write-Host ""
Write-Host "🧹 Cleaning up temp directory..." -ForegroundColor Yellow
Remove-Item -Recurse -Force playwright-browsers/

$Size = (Get-Item $Output).Length / 1MB

Write-Host ""
Write-Host "╔════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║              Extraction Complete!          ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "✓ Created: $Output" -ForegroundColor Green
Write-Host "✓ Size: $([math]::Round($Size, 2)) MB" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Transfer $Output to your company PC"
Write-Host "  2. Extract: tar -xzf $Output"
Write-Host "  3. Copy browsers to cache:"
Write-Host ""
Write-Host "     Windows (PowerShell):" -ForegroundColor Yellow
Write-Host "     `$PlaywrightCache = `"`$env:LOCALAPPDATA\ms-playwright`""
Write-Host "     New-Item -ItemType Directory -Force -Path `$PlaywrightCache"
Write-Host "     Copy-Item -Path `"playwright-browsers\ms-playwright\*`" -Destination `$PlaywrightCache -Recurse -Force"
Write-Host ""
Write-Host "  4. Install npm packages with:"
Write-Host "     `$env:PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = `"1`""
Write-Host "     npm install @playwright/test@$($Version.TrimStart('v'))"
Write-Host ""
