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

function Test-CiEnvironment {
    return (-not [string]::IsNullOrWhiteSpace($env:CI)) -or
        (-not [string]::IsNullOrWhiteSpace($env:GITHUB_ACTIONS)) -or
        (-not [string]::IsNullOrWhiteSpace($env:GITLAB_CI)) -or
        (-not [string]::IsNullOrWhiteSpace($env:JENKINS_HOME)) -or
        (-not [string]::IsNullOrWhiteSpace($env:CIRCLECI)) -or
        (-not [string]::IsNullOrWhiteSpace($env:TRAVIS)) -or
        (-not [string]::IsNullOrWhiteSpace($env:TF_BUILD)) -or
        ($env:USERNAME -in @("jenkins", "gitlab-runner", "circleci"))
}

function Get-BrowserVersion {
    param([string]$Path)

    if (-not (Test-Path $Path)) {
        return $null
    }

    try {
        $job = Start-Job -ScriptBlock { param($exe) & $exe --version } -ArgumentList $Path
        $completed = Wait-Job $job -Timeout 5
        if (-not $completed) {
            Stop-Job $job -Force
            Remove-Job $job
            return $null
        }

        $output = Receive-Job $job -ErrorAction SilentlyContinue
        Remove-Job $job

        if ($output) {
            $match = [regex]::Match($output, '\d+\.\d+\.\d+\.\d+')
            if ($match.Success) {
                return $match.Value
            }
        }
    } catch {
        return $null
    }

    return $null
}

function Resolve-AvailableBrowser {
    $edgePaths = @(
        "$env:ProgramFiles(x86)\Microsoft\Edge\Application\msedge.exe",
        "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
        "$env:LOCALAPPDATA\Microsoft\Edge\Application\msedge.exe",
        "$env:USERPROFILE\AppData\Local\Microsoft\Edge\Application\msedge.exe"
    )

    foreach ($path in $edgePaths) {
        $version = Get-BrowserVersion -Path $path
        if ($version) {
            return @{
                Channel = "msedge"
                Version = $version
                Path = $path
            }
        }
    }

    $chromePaths = @(
        "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
        "$env:ProgramFiles(x86)\Google\Chrome\Application\chrome.exe",
        "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe",
        "$env:USERPROFILE\AppData\Local\Google\Chrome\Application\chrome.exe"
    )

    foreach ($path in $chromePaths) {
        $version = Get-BrowserVersion -Path $path
        if ($version) {
            return @{
                Channel = "chrome"
                Version = $version
                Path = $path
            }
        }
    }

    return @{
        Channel = "bundled"
        Version = $null
        Path = $null
    }
}

function Write-BrowserMetadata {
    param(
        [string]$ContextPath,
        [hashtable]$BrowserInfo
    )

    $context = @{}
    if (Test-Path $ContextPath) {
        try {
            $context = Get-Content $ContextPath -Raw | ConvertFrom-Json
        } catch {
            $context = @{}
        }
    }

    $context.browser = @{
        channel = $BrowserInfo.Channel
        version = $BrowserInfo.Version
        path = $BrowserInfo.Path
        detected_at = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
    }

    $context | ConvertTo-Json -Depth 6 | Set-Content $ContextPath
}

function Write-ArtkConfig {
    param(
        [string]$ConfigPath,
        [string]$ProjectName,
        [string]$Channel = "bundled",
        [string]$Strategy = "auto"
    )

    $template = @'
# ARTK Configuration
# Generated by bootstrap.ps1 on __TIMESTAMP__

version: "1.0"

app:
  name: "__PROJECT_NAME__"
  type: web
  description: "E2E tests for __PROJECT_NAME__"

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

browsers:
  enabled:
    - chromium
  channel: __BROWSER_CHANNEL__
  strategy: __BROWSER_STRATEGY__
  viewport:
    width: 1280
    height: 720
  headless: true
'@

    $content = $template.Replace("__PROJECT_NAME__", $ProjectName)
    $content = $content.Replace("__TIMESTAMP__", (Get-Date -Format "yyyy-MM-ddTHH:mm:ssK"))
    $content = $content.Replace("__BROWSER_CHANNEL__", $Channel)
    $content = $content.Replace("__BROWSER_STRATEGY__", $Strategy)

    Set-Content -Path $ConfigPath -Value $content
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
    "@playwright/test": "^1.57.0",
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

# artk.config.yml
$configGenerated = $false
$configPath = Join-Path $ArtkE2e "artk.config.yml"
if (Test-Path $configPath) {
    Write-Host "artk.config.yml already exists - preserving existing configuration" -ForegroundColor Cyan
} else {
    $channel = if ($env:ARTK_BROWSER_CHANNEL) { $env:ARTK_BROWSER_CHANNEL } else { "bundled" }
    $strategy = if ($env:ARTK_BROWSER_STRATEGY) { $env:ARTK_BROWSER_STRATEGY } else { "auto" }
    Write-ArtkConfig -ConfigPath $configPath -ProjectName $ProjectName -Channel $channel -Strategy $strategy
    $configGenerated = $true
}

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
    Write-Host "[6/6] Running npm install and configuring browsers..." -ForegroundColor Yellow
    Push-Location $ArtkE2e
    $configBackup = "$configPath.bootstrap-backup"
    $bootstrapSucceeded = $false

    if (Test-Path $configPath) {
        Copy-Item -Path $configPath -Destination $configBackup -Force
    }

    function Install-BundledChromium {
        param([string]$LogPath)

        $output = & npx playwright install chromium 2>&1
        $exitCode = $LASTEXITCODE
        $output | Set-Content -Path $LogPath
        return ($exitCode -eq 0)
    }

    $installLog = Join-Path ([System.IO.Path]::GetTempPath()) "playwright-install.log"
    try {
        $env:PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = "1"
        npm install --legacy-peer-deps
        Remove-Item Env:PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD -ErrorAction SilentlyContinue

        $browsersCacheDir = Join-Path $TargetProject ".artk\browsers"
        New-Item -ItemType Directory -Force -Path $browsersCacheDir | Out-Null
        $env:PLAYWRIGHT_BROWSERS_PATH = $browsersCacheDir

        $browserChannel = "bundled"
        $browserStrategy = "auto"
        $browserInfo = @{
            Channel = "bundled"
            Version = $null
            Path = $null
        }

        if (Test-Path $configPath) {
            $match = Select-String -Path $configPath -Pattern '^\s*strategy:\s*([a-z-]+)' | Select-Object -First 1
            if ($match -and $match.Matches.Count -gt 0) {
                $existingStrategy = $match.Matches[0].Groups[1].Value
                if ($existingStrategy -and $existingStrategy -ne "auto") {
                    $browserStrategy = $existingStrategy
                    Write-Host "Respecting existing strategy preference: $browserStrategy" -ForegroundColor Cyan
                }
            }
        }

        if (Test-CiEnvironment -and $browserStrategy -ne "system-only") {
            Write-Host "CI environment detected - using bundled browsers for reproducibility" -ForegroundColor Cyan
            $browserChannel = "bundled"
        } elseif ($browserStrategy -eq "bundled-only") {
            Write-Host "Strategy 'bundled-only' - forcing bundled browser install" -ForegroundColor Cyan
            Remove-Item Env:PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD -ErrorAction SilentlyContinue
            if (Install-BundledChromium -LogPath $installLog) {
                $browserChannel = "bundled"
            } else {
                Write-Host "ERROR: Bundled Chromium install failed and strategy is 'bundled-only'" -ForegroundColor Red
                if (Test-Path $installLog) {
                    Get-Content $installLog -Tail 10 | ForEach-Object { Write-Host $_ }
                }
                throw "Bundled Chromium install failed"
            }
        } elseif ($browserStrategy -eq "system-only") {
            Write-Host "Strategy 'system-only' - detecting system browsers" -ForegroundColor Cyan
            $browserInfo = Resolve-AvailableBrowser
            $browserChannel = $browserInfo.Channel
            if ($browserChannel -eq "bundled") {
                Write-Host "ERROR: No system browsers found and strategy is 'system-only'" -ForegroundColor Red
                Write-Host "Solutions:" -ForegroundColor Yellow
                Write-Host "  1. Install Microsoft Edge: https://microsoft.com/edge"
                Write-Host "  2. Install Google Chrome: https://google.com/chrome"
                Write-Host "  3. Change strategy in artk.config.yml to 'auto' or 'prefer-bundled'"
                throw "No system browsers found"
            }
        } elseif (Download-PlaywrightBrowsers -ArtkE2e $ArtkE2e -ArtkRepo $ArtkRepo -BrowsersPath $browsersCacheDir) {
            Write-Host "✓ Using pre-built browser cache from release" -ForegroundColor Cyan
            $env:PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = "1"
            $browserChannel = "bundled"
        } elseif ($browserStrategy -eq "prefer-system") {
            Write-Host "Strategy 'prefer-system' - checking system browsers first" -ForegroundColor Cyan
            $browserInfo = Resolve-AvailableBrowser
            $browserChannel = $browserInfo.Channel

            if ($browserChannel -ne "bundled") {
                Write-Host "✓ Using system browser: $browserChannel" -ForegroundColor Cyan
            } else {
                Write-Host "No system browsers found, attempting bundled install..." -ForegroundColor Yellow
                Remove-Item Env:PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD -ErrorAction SilentlyContinue
                if (Install-BundledChromium -LogPath $installLog) {
                    $browserChannel = "bundled"
                } else {
                    Write-Host "ERROR: Both system and bundled browsers unavailable" -ForegroundColor Red
                    throw "No available browsers"
                }
            }
        } else {
            Write-Host "Release cache unavailable. Attempting bundled Chromium install..." -ForegroundColor Yellow
            Remove-Item Env:PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD -ErrorAction SilentlyContinue

            if (Install-BundledChromium -LogPath $installLog) {
                Write-Host "✓ Bundled Chromium installed successfully" -ForegroundColor Cyan
                $browserChannel = "bundled"
            } else {
                Write-Host "Bundled install failed. Detecting system browsers..." -ForegroundColor Yellow
                $browserInfo = Resolve-AvailableBrowser
                $browserChannel = $browserInfo.Channel

                if ($browserChannel -eq "msedge") {
                    Write-Host "✓ Microsoft Edge detected - using system browser" -ForegroundColor Cyan
                } elseif ($browserChannel -eq "chrome") {
                    Write-Host "✓ Google Chrome detected - using system browser" -ForegroundColor Cyan
                } else {
                    Write-Host "ERROR: No browsers available" -ForegroundColor Red
                    Write-Host "ARTK tried:" -ForegroundColor Yellow
                    Write-Host "  1. Pre-built browser cache: Unavailable"
                    Write-Host "  2. Bundled Chromium install: Failed"
                    if (Test-Path $installLog) {
                        Get-Content $installLog -Tail 5 | ForEach-Object { Write-Host $_ }
                    }
                    Write-Host "  3. System Microsoft Edge: Not found"
                    Write-Host "  4. System Google Chrome: Not found"
                    Write-Host "Solutions:" -ForegroundColor Yellow
                    Write-Host "  1. Install Microsoft Edge: https://microsoft.com/edge"
                    Write-Host "  2. Install Google Chrome: https://google.com/chrome"
                    Write-Host "  3. Grant permissions for Playwright browser installation"
                    Write-Host "  4. Contact your IT administrator for assistance"
                    throw "No browsers available"
                }
            }
        }

        if ($configGenerated) {
            Write-ArtkConfig -ConfigPath $configPath -ProjectName $ProjectName -Channel $browserChannel -Strategy $browserStrategy
        }

        $contextPath = Join-Path $TargetProject ".artk\context.json"
        Write-BrowserMetadata -ContextPath $contextPath -BrowserInfo $browserInfo

        $env:ARTK_BROWSER_CHANNEL = $browserChannel
        $env:ARTK_BROWSER_STRATEGY = $browserStrategy

        $bootstrapSucceeded = $true
        Write-Host "Browser configuration complete: channel=$browserChannel, strategy=$browserStrategy" -ForegroundColor Green
    } finally {
        if (-not $bootstrapSucceeded) {
            Write-Host "Bootstrap failed, rolling back changes..." -ForegroundColor Red
            if (Test-Path $configBackup) {
                Move-Item -Path $configBackup -Destination $configPath -Force
                Write-Host "Config rolled back" -ForegroundColor Yellow
            }
        } elseif (Test-Path $configBackup) {
            Remove-Item $configBackup -Force
        }
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
