#
# Build Playwright browser cache assets for GitHub Releases.
# Usage: .\build-playwright-browsers-release.ps1 [-ProjectDir C:\path] [-OutputDir C:\path] [-BrowsersPath C:\path] [-KeepBrowsers]
#

param(
    [string]$ProjectDir = (Get-Location).Path,
    [string]$OutputDir,
    [string]$BrowsersPath,
    [switch]$KeepBrowsers
)

$ErrorActionPreference = "Stop"

if (-not $OutputDir) {
    $OutputDir = Join-Path $ProjectDir "playwright-browsers-release"
}

$cleanupBrowsers = $false
if (-not $BrowsersPath) {
    $BrowsersPath = Join-Path ([System.IO.Path]::GetTempPath()) ("artk-browsers-" + [guid]::NewGuid())
    $cleanupBrowsers = $true
}

if ($KeepBrowsers) {
    $cleanupBrowsers = $false
}

function Resolve-OsArch {
    if ($IsWindows) {
        $osName = "windows"
    } elseif ($IsMacOS) {
        $osName = "macos"
    } elseif ($IsLinux) {
        $osName = "linux"
    } else {
        $osName = "unknown"
    }

    $archName = switch ([System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture) {
        "X64" { "x64" }
        "Arm64" { "arm64" }
        "X86" { "x86" }
        default { "unknown" }
    }

    return @{
        Os = $osName
        Arch = $archName
    }
}

$osArch = Resolve-OsArch
if ($osArch.Os -eq "unknown" -or $osArch.Arch -eq "unknown") {
    Write-Host "Unsupported OS/arch ($($osArch.Os)/$($osArch.Arch))." -ForegroundColor Red
    exit 1
}

if (-not (Get-Command npx -ErrorAction SilentlyContinue)) {
    Write-Host "npx is required to install Playwright browsers." -ForegroundColor Red
    exit 1
}

Write-Host "Installing Playwright browsers..." -ForegroundColor Yellow
Push-Location $ProjectDir
try {
    New-Item -ItemType Directory -Force -Path $BrowsersPath | Out-Null
    $env:PLAYWRIGHT_BROWSERS_PATH = $BrowsersPath
    npx playwright install chromium

    $browsersJson = Join-Path $ProjectDir "node_modules\playwright-core\browsers.json"
    if (-not (Test-Path $browsersJson)) {
        throw "Missing browsers.json at $browsersJson"
    }

    $data = Get-Content $browsersJson -Raw | ConvertFrom-Json
    $chromium = $data.browsers | Where-Object { $_.name -eq "chromium" } | Select-Object -First 1
    if (-not $chromium) {
        throw "Unable to determine Chromium revision."
    }

    $revision = $chromium.revision
    $asset = "chromium-$revision-$($osArch.Os)-$($osArch.Arch).zip"

    New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
    $zipPath = Join-Path $OutputDir $asset

    Write-Host "Creating asset: $asset" -ForegroundColor Cyan
    Compress-Archive -Path (Join-Path $BrowsersPath '*') -DestinationPath $zipPath -Force

    $hash = (Get-FileHash $zipPath -Algorithm SHA256).Hash.ToLowerInvariant()
    Set-Content -Path "$zipPath.sha256" -Value "$hash  $asset"
} finally {
    Pop-Location
}

if ($cleanupBrowsers) {
    Remove-Item $BrowsersPath -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host "Output:" -ForegroundColor Green
Write-Host "  $zipPath"
Write-Host "  $zipPath.sha256"
