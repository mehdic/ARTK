# Build all AutoGen variants
$ErrorActionPreference = "Stop"

Write-Host "Building AutoGen variants..."

# Clean previous builds
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue dist, dist-cjs, dist-legacy-16, dist-legacy-14

# Build each variant
Write-Host "Building modern-esm..."
npm run build:esm

Write-Host "Building modern-cjs..."
npm run build:cjs

Write-Host "Building legacy-16..."
npm run build:legacy-16

Write-Host "Building legacy-14..."
npm run build:legacy-14

Write-Host "All variants built successfully!"
