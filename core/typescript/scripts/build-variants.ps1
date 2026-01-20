<#
.SYNOPSIS
    ARTK Multi-Variant Build Script
    Builds all 4 variants: modern-esm, modern-cjs, legacy-16, legacy-14

.PARAMETER Variant
    Build only a specific variant (modern-esm|modern-cjs|legacy-16|legacy-14)

.PARAMETER Clean
    Clean dist directories before building

.PARAMETER Parallel
    Build variants in parallel (faster but uses more CPU)

.EXAMPLE
    .\build-variants.ps1
    Builds all variants sequentially

.EXAMPLE
    .\build-variants.ps1 -Variant legacy-16
    Builds only the legacy-16 variant

.EXAMPLE
    .\build-variants.ps1 -Clean -Parallel
    Cleans and rebuilds all variants in parallel
#>

param(
    [ValidateSet('modern-esm', 'modern-cjs', 'legacy-16', 'legacy-14')]
    [string]$Variant,

    [switch]$Clean,

    [switch]$Parallel
)

$ErrorActionPreference = 'Stop'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Split-Path -Parent $ScriptDir

Push-Location $ProjectDir

try {
    # Clean if requested
    if ($Clean) {
        Write-Host "Cleaning dist directories..." -ForegroundColor Yellow
        Remove-Item -Path "dist", "dist-cjs", "dist-legacy-16", "dist-legacy-14" -Recurse -Force -ErrorAction SilentlyContinue
    }

    $StartTime = Get-Date

    function Build-Variant {
        param([string]$VariantName)

        $variantStart = Get-Date

        switch ($VariantName) {
            'modern-esm' {
                Write-Host "Building modern-esm variant (tsup -> dist/)..." -ForegroundColor Cyan
                npm run build
                if ($LASTEXITCODE -ne 0) { throw "modern-esm build failed" }
            }
            'modern-cjs' {
                Write-Host "Building modern-cjs variant (tsc -> dist-cjs/)..." -ForegroundColor Cyan
                npm run build:cjs
                if ($LASTEXITCODE -ne 0) { throw "modern-cjs build failed" }
            }
            'legacy-16' {
                Write-Host "Building legacy-16 variant (tsc -> dist-legacy-16/)..." -ForegroundColor Cyan
                npm run build:legacy-16
                if ($LASTEXITCODE -ne 0) { throw "legacy-16 build failed" }
            }
            'legacy-14' {
                Write-Host "Building legacy-14 variant (tsc -> dist-legacy-14/)..." -ForegroundColor Cyan
                npm run build:legacy-14
                if ($LASTEXITCODE -ne 0) { throw "legacy-14 build failed" }
            }
        }

        $duration = (Get-Date) - $variantStart
        Write-Host "✓ $VariantName built in $([int]$duration.TotalSeconds)s" -ForegroundColor Green
    }

    if ($Variant) {
        # Build single variant
        Build-Variant -VariantName $Variant
    }
    else {
        # Build all variants
        Write-Host "╔════════════════════════════════════════════╗" -ForegroundColor Green
        Write-Host "║       ARTK Multi-Variant Build             ║" -ForegroundColor Green
        Write-Host "╚════════════════════════════════════════════╝" -ForegroundColor Green
        Write-Host ""

        if ($Parallel) {
            Write-Host "Building all 4 variants in parallel..." -ForegroundColor Yellow
            Write-Host ""

            $jobs = @()
            $jobs += Start-Job -ScriptBlock { Set-Location $using:ProjectDir; npm run build }
            $jobs += Start-Job -ScriptBlock { Set-Location $using:ProjectDir; npm run build:cjs }
            $jobs += Start-Job -ScriptBlock { Set-Location $using:ProjectDir; npm run build:legacy-16 }
            $jobs += Start-Job -ScriptBlock { Set-Location $using:ProjectDir; npm run build:legacy-14 }

            $variantNames = @('modern-esm', 'modern-cjs', 'legacy-16', 'legacy-14')

            for ($i = 0; $i -lt $jobs.Count; $i++) {
                $job = $jobs[$i]
                $result = Wait-Job -Job $job
                if ($result.State -eq 'Completed' -and (Receive-Job -Job $job -ErrorAction SilentlyContinue)) {
                    Write-Host "✓ $($variantNames[$i]) complete" -ForegroundColor Green
                }
                else {
                    Write-Host "✗ $($variantNames[$i]) failed" -ForegroundColor Red
                }
                Remove-Job -Job $job
            }
        }
        else {
            Write-Host "Building all 4 variants sequentially..." -ForegroundColor Yellow
            Write-Host ""

            Build-Variant -VariantName 'modern-esm'
            Build-Variant -VariantName 'modern-cjs'
            Build-Variant -VariantName 'legacy-16'
            Build-Variant -VariantName 'legacy-14'
        }
    }

    # Summary
    $TotalTime = (Get-Date) - $StartTime

    Write-Host ""
    Write-Host "╔════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║       Build Complete                       ║" -ForegroundColor Green
    Write-Host "╚════════════════════════════════════════════╝" -ForegroundColor Green
    Write-Host ""
    Write-Host "Outputs:" -ForegroundColor Cyan

    if (Test-Path "dist") { Write-Host "  dist/              - Modern ESM (Node 18+, ESM)" }
    if (Test-Path "dist-cjs") { Write-Host "  dist-cjs/          - Modern CJS (Node 18+, CommonJS)" }
    if (Test-Path "dist-legacy-16") { Write-Host "  dist-legacy-16/    - Legacy 16 (Node 16+, Playwright 1.49)" }
    if (Test-Path "dist-legacy-14") { Write-Host "  dist-legacy-14/    - Legacy 14 (Node 14+, Playwright 1.33)" }

    Write-Host ""
    Write-Host "Total build time: $([int]$TotalTime.TotalSeconds)s" -ForegroundColor Cyan

    # Check if we're within the 5-minute requirement
    if ($TotalTime.TotalSeconds -gt 300) {
        Write-Host "⚠️  Build exceeded 5-minute target ($([int]$TotalTime.TotalSeconds)s > 300s)" -ForegroundColor Yellow
    }
    else {
        Write-Host "✓ Build within 5-minute target" -ForegroundColor Green
    }
}
finally {
    Pop-Location
}
