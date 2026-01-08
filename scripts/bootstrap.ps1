#
# ARTK Bootstrap Script (PowerShell)
# Usage: .\bootstrap.ps1 -TargetPath C:\path\to\target-project [-SkipNpm]
#
# This is the ONLY script you need to run. It does everything:
# 1. Creates artk-e2e/ directory structure
# 2. Copies @artk/core to vendor/
# 3. Installs prompts to .github/prompts/
# 4. Creates package.json, playwright.config.ts, artk.config.yml
# 5. Runs npm install
#

param(
    [Parameter(Mandatory=$true, Position=0)]
    [string]$TargetPath,

    [switch]$SkipNpm
)

$ErrorActionPreference = "Stop"

# Get script location (ARTK repo)
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ArtkRepo = Split-Path -Parent $ScriptDir
$ArtkCore = Join-Path $ArtkRepo "core\typescript"
$ArtkPrompts = Join-Path $ArtkRepo "prompts"

function Resolve-GitHubRepo {
    param([string]$RepoRoot)

    if ($env:ARTK_PLAYWRIGHT_BROWSERS_REPO) {
        return $env:ARTK_PLAYWRIGHT_BROWSERS_REPO
    }

    if (-not $RepoRoot) {
        return $null
    }

    try {
        $originUrl = git -C $RepoRoot remote get-url origin 2>$null
    } catch {
        return $null
    }

    if (-not $originUrl) {
        return $null
    }

    if ($originUrl -match 'github\.com[:/](?<repo>[^/]+/[^/]+?)(\.git)?$') {
        return $Matches.repo
    }

    return $null
}

function Resolve-OsArch {
    $osName = "unknown"
    if ($IsWindows -eq $true) {
        $osName = "windows"
    } elseif ($IsMacOS -eq $true) {
        $osName = "macos"
    } elseif ($IsLinux -eq $true) {
        $osName = "linux"
    } elseif ($env:OS -eq "Windows_NT") {
        $osName = "windows"
    }

    $archName = "unknown"
    $runtimeArch = $null
    try {
        $runtimeArch = [System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture.ToString()
    } catch {
        $runtimeArch = $null
    }

    if ($runtimeArch) {
        $archName = switch ($runtimeArch) {
            "X64" { "x64" }
            "Arm64" { "arm64" }
            "X86" { "x86" }
            default { "unknown" }
        }
    } else {
        $archRaw = $env:PROCESSOR_ARCHITEW6432
        if (-not $archRaw) {
            $archRaw = $env:PROCESSOR_ARCHITECTURE
        }
        if ($archRaw) {
            $archName = switch ($archRaw.ToLowerInvariant()) {
                "amd64" { "x64" }
                "x64" { "x64" }
                "arm64" { "arm64" }
                "x86" { "x86" }
                default { "unknown" }
            }
        }
    }

    return @{
        Os = $osName
        Arch = $archName
    }
}

function Resolve-PlaywrightVersion {
    param([string]$ArtkE2e)

    $paths = @(
        (Join-Path $ArtkE2e "node_modules\@playwright\test\package.json"),
        (Join-Path $ArtkE2e "node_modules\playwright-core\package.json")
    )

    foreach ($path in $paths) {
        if (Test-Path $path) {
            return (Get-Content $path -Raw | ConvertFrom-Json).version
        }
    }

    return $null
}

function Resolve-ChromiumRevision {
    param([string]$ArtkE2e)

    $browsersJson = Join-Path $ArtkE2e "node_modules\playwright-core\browsers.json"
    if (-not (Test-Path $browsersJson)) {
        return $null
    }

    $data = Get-Content $browsersJson -Raw | ConvertFrom-Json
    $chromium = $data.browsers | Where-Object { $_.name -eq "chromium" } | Select-Object -First 1
    return $chromium.revision
}

function Download-PlaywrightBrowsers {
    param(
        [string]$ArtkE2e,
        [string]$ArtkRepo,
        [string]$BrowsersPath
    )

    $repo = Resolve-GitHubRepo -RepoRoot $ArtkRepo
    if (-not $repo) {
        Write-Host "Release repo not set; skipping Playwright browser cache download." -ForegroundColor Yellow
        return $false
    }

    $playwrightVersion = Resolve-PlaywrightVersion -ArtkE2e $ArtkE2e
    $chromiumRevision = Resolve-ChromiumRevision -ArtkE2e $ArtkE2e

    if (-not $chromiumRevision) {
        Write-Host "Unable to determine Chromium revision; skipping Playwright browser cache download." -ForegroundColor Yellow
        return $false
    }

    $osArch = Resolve-OsArch
    if ($osArch.Os -eq "unknown" -or $osArch.Arch -eq "unknown") {
        Write-Host "Unsupported OS/arch ($($osArch.Os)/$($osArch.Arch)); skipping Playwright browser cache download." -ForegroundColor Yellow
        return $false
    }

    $tag = if ($env:ARTK_PLAYWRIGHT_BROWSERS_TAG) { $env:ARTK_PLAYWRIGHT_BROWSERS_TAG } elseif ($playwrightVersion) { "playwright-browsers-$playwrightVersion" } else { $null }
    if (-not $tag) {
        Write-Host "Release tag not set; skipping Playwright browser cache download." -ForegroundColor Yellow
        return $false
    }

    $asset = "chromium-$chromiumRevision-$($osArch.Os)-$($osArch.Arch).zip"
    $baseUrl = "https://github.com/$repo/releases/download/$tag"
    $zipPath = Join-Path $BrowsersPath $asset
    $shaPath = "$zipPath.sha256"

    New-Item -ItemType Directory -Force -Path $BrowsersPath | Out-Null

    if (Test-Path (Join-Path $BrowsersPath "chromium-$chromiumRevision")) {
        Write-Host "Playwright browsers already cached for revision $chromiumRevision." -ForegroundColor Cyan
        return $true
    }

    try {
        Write-Host "Downloading Playwright browsers from release cache..." -ForegroundColor Yellow
        Invoke-WebRequest -Uri "$baseUrl/$asset" -OutFile $zipPath -UseBasicParsing
        Invoke-WebRequest -Uri "$baseUrl/$asset.sha256" -OutFile $shaPath -UseBasicParsing

        $expectedHash = ((Get-Content $shaPath -Raw) -split '\s+')[0].Trim().ToLowerInvariant()
        $actualHash = (Get-FileHash $zipPath -Algorithm SHA256).Hash.ToLowerInvariant()
        if (-not $expectedHash -or $expectedHash -ne $actualHash) {
            throw "Playwright browser cache checksum mismatch."
        }

        Expand-Archive -Path $zipPath -DestinationPath $BrowsersPath -Force
        Remove-Item $zipPath, $shaPath -Force -ErrorAction SilentlyContinue
        return $true
    } catch {
        Write-Host "Release cache download failed: $($_.Exception.Message)" -ForegroundColor Yellow
        Remove-Item $zipPath, $shaPath -Force -ErrorAction SilentlyContinue
        return $false
    }
}

# Resolve target path
try {
    $TargetProject = (Resolve-Path $TargetPath).Path
} catch {
    Write-Host "Error: Target directory does not exist: $TargetPath" -ForegroundColor Red
    exit 1
}

$ArtkE2e = Join-Path $TargetProject "artk-e2e"

Write-Host "==========================================" -ForegroundColor Green
Write-Host " ARTK Bootstrap Installation" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "ARTK Source: $ArtkRepo"
Write-Host "Target:      $TargetProject"
Write-Host ""

# Step 1: Build @artk/core if needed
$CoreDist = Join-Path $ArtkCore "dist"
if (-not (Test-Path $CoreDist)) {
    Write-Host "[1/6] Building @artk/core..." -ForegroundColor Yellow
    Push-Location $ArtkCore
    try {
        npm install
        npm run build
    } finally {
        Pop-Location
    }
} else {
  Write-Host "[1/6] @artk/core already built" -ForegroundColor Cyan
}

# Step 2: Create artk-e2e structure
Write-Host "[2/6] Creating artk-e2e/ structure..." -ForegroundColor Yellow
@(
    "vendor\artk-core",
    "tests",
    "docs",
    "journeys",
    ".auth-states"
) | ForEach-Object {
    $dir = Join-Path $ArtkE2e $_
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
}

# Step 3: Copy @artk/core to vendor
Write-Host "[3/6] Installing @artk/core to vendor/..." -ForegroundColor Yellow
$VendorTarget = Join-Path $ArtkE2e "vendor\artk-core"
Copy-Item -Path (Join-Path $ArtkCore "dist") -Destination $VendorTarget -Recurse -Force
Copy-Item -Path (Join-Path $ArtkCore "package.json") -Destination $VendorTarget -Force
$VersionJson = Join-Path $ArtkCore "version.json"
if (Test-Path $VersionJson) {
    Copy-Item -Path $VersionJson -Destination $VendorTarget -Force
}
$ReadmePath = Join-Path $ArtkCore "README.md"
if (Test-Path $ReadmePath) {
    Copy-Item -Path $ReadmePath -Destination $VendorTarget -Force
}

# Step 4: Install prompts
Write-Host "[4/6] Installing prompts to .github/prompts/..." -ForegroundColor Yellow
$PromptsTarget = Join-Path $TargetProject ".github\prompts"
New-Item -ItemType Directory -Force -Path $PromptsTarget | Out-Null

Get-ChildItem -Path $ArtkPrompts -Filter "artk.*.md" | ForEach-Object {
    $filename = $_.Name
    $newname = $filename -replace '\.md$', '.prompt.md'
    Copy-Item $_.FullName -Destination (Join-Path $PromptsTarget $newname) -Force
}

# Step 5: Create configuration files
Write-Host "[5/6] Creating configuration files..." -ForegroundColor Yellow

# Detect project name from target directory
$ProjectName = Split-Path -Leaf $TargetProject

# package.json
$PackageJson = @"
{
  "name": "artk-e2e",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "test": "playwright test",
    "test:smoke": "playwright test --grep @smoke",
    "test:release": "playwright test --grep @release",
    "test:ui": "playwright test --ui",
    "report": "playwright show-report"
  },
  "devDependencies": {
    "@artk/core": "file:./vendor/artk-core",
    "@playwright/test": "^1.40.0",
    "typescript": "^5.3.0"
  }
}
"@
Set-Content -Path (Join-Path $ArtkE2e "package.json") -Value $PackageJson

# playwright.config.ts
$PlaywrightConfig = @"
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: process.env.ARTK_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
"@
Set-Content -Path (Join-Path $ArtkE2e "playwright.config.ts") -Value $PlaywrightConfig

# tsconfig.json
$TsConfig = @"
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "./dist",
    "rootDir": ".",
    "declaration": true,
    "resolveJsonModule": true
  },
  "include": ["tests/**/*", "src/**/*"],
  "exclude": ["node_modules", "dist"]
}
"@
Set-Content -Path (Join-Path $ArtkE2e "tsconfig.json") -Value $TsConfig

# artk.config.yml (literal to avoid `${...}` parsing in PowerShell)
$ArtkConfig = @'
# ARTK Configuration
# Generated by bootstrap.ps1 on $(Get-Date -Format "yyyy-MM-ddTHH:mm:ssK")

version: "1.0"

app:
  name: "$ProjectName"
  type: web
  description: "E2E tests for $ProjectName"

environments:
  local:
    baseUrl: ${ARTK_BASE_URL:-http://localhost:3000}
  intg:
    baseUrl: ${ARTK_INTG_URL:-https://intg.example.com}
  ctlq:
    baseUrl: ${ARTK_CTLQ_URL:-https://ctlq.example.com}
  prod:
    baseUrl: ${ARTK_PROD_URL:-https://example.com}

auth:
  provider: oidc
  storageStateDir: ./.auth-states
  # roles:
  #   admin:
  #     username: ${ADMIN_USER}
  #     password: ${ADMIN_PASS}

settings:
  parallel: true
  retries: 2
  timeout: 30000
  traceOnFailure: true
'@
Set-Content -Path (Join-Path $ArtkE2e "artk.config.yml") -Value $ArtkConfig

# Create context file
$ArtkDir = Join-Path $TargetProject ".artk"
New-Item -ItemType Directory -Force -Path $ArtkDir | Out-Null
$ContextJson = @"
{
  "version": "1.0",
  "projectRoot": "$($TargetProject -replace '\\', '\\')",
  "artkRoot": "$($ArtkE2e -replace '\\', '\\')",
  "initialized_at": "$(Get-Date -Format "yyyy-MM-ddTHH:mm:ssK")",
  "bootstrap_script": "$($ScriptDir -replace '\\', '\\')\\bootstrap.ps1",
  "artk_repo": "$($ArtkRepo -replace '\\', '\\')",
  "next_suggested": "/artk.init-playbook"
}
"@
Set-Content -Path (Join-Path $ArtkDir "context.json") -Value $ContextJson

# .artk/.gitignore
$ArtkGitIgnore = @"
# ARTK temporary files
browsers/
heal-logs/
*.heal.json
selector-catalog.local.json
"@
Set-Content -Path (Join-Path $ArtkDir ".gitignore") -Value $ArtkGitIgnore

# .gitignore additions
$GitIgnore = @"
node_modules/
dist/
test-results/
playwright-report/
.auth-states/
*.local
"@
Set-Content -Path (Join-Path $ArtkE2e ".gitignore") -Value $GitIgnore

# Step 6: Run npm install
if (-not $SkipNpm) {
    Write-Host "[6/6] Running npm install..." -ForegroundColor Yellow
    Push-Location $ArtkE2e
    try {
        $env:PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = "1"
        npm install --legacy-peer-deps
        Remove-Item Env:PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD -ErrorAction SilentlyContinue

        $browsersCacheDir = Join-Path $TargetProject ".artk\browsers"
        New-Item -ItemType Directory -Force -Path $browsersCacheDir | Out-Null
        $env:PLAYWRIGHT_BROWSERS_PATH = $browsersCacheDir

        if (Download-PlaywrightBrowsers -ArtkE2e $ArtkE2e -ArtkRepo $ArtkRepo -BrowsersPath $browsersCacheDir) {
            $env:PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = "1"
            Write-Host "Using release-hosted Playwright browsers cache." -ForegroundColor Cyan
        } else {
            Write-Host "Release cache unavailable; installing Playwright browsers..." -ForegroundColor Yellow
            Remove-Item Env:PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD -ErrorAction SilentlyContinue
            npx playwright install chromium
        }
    } finally {
        Pop-Location
    }
} else {
    Write-Host "[6/6] Skipping npm install (-SkipNpm)" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host " ARTK Installation Complete!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Created:" -ForegroundColor Cyan
Write-Host "  artk-e2e/              - E2E test workspace"
Write-Host "  artk-e2e/vendor/       - @artk/core library"
Write-Host "  .github/prompts/       - Copilot prompts"
Write-Host "  .artk/context.json     - ARTK context"
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. cd artk-e2e"
Write-Host "  2. Open VS Code and use /artk.init-playbook in Copilot Chat"
Write-Host ""
Write-Host "Run tests:" -ForegroundColor Cyan
Write-Host "  cd artk-e2e; npm test"
Write-Host ""
