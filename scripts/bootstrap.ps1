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
$ArtkAutogen = Join-Path $ArtkCore "autogen"
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

    $timeoutSec = 30
    if ($env:ARTK_PLAYWRIGHT_BROWSERS_TIMEOUT_SEC) {
        try {
            $timeoutSec = [int]$env:ARTK_PLAYWRIGHT_BROWSERS_TIMEOUT_SEC
        } catch {
            $timeoutSec = 30
        }
    }

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
        Invoke-WebRequest -Uri "$baseUrl/$asset" -OutFile $zipPath -UseBasicParsing -TimeoutSec $timeoutSec
        Invoke-WebRequest -Uri "$baseUrl/$asset.sha256" -OutFile $shaPath -UseBasicParsing -TimeoutSec $timeoutSec

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

function Get-BrowserVersionResult {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    if (-not (Test-Path $Path)) {
        return @{ Version = $null; Error = "not found" }
    }

    try {
        $info = [System.Diagnostics.FileVersionInfo]::GetVersionInfo($Path)
        $raw = $info.ProductVersion
        if ([string]::IsNullOrWhiteSpace($raw)) {
            $raw = $info.FileVersion
        }

        if ([string]::IsNullOrWhiteSpace($raw)) {
            return @{ Version = $null; Error = "no file version" }
        }

        # Accept both 3-part and 4-part versions (some channels/installs vary).
        $match = [regex]::Match($raw, '\d+\.\d+\.\d+(?:\.\d+)?')
        if ($match.Success) {
            return @{ Version = $match.Value; Error = $null }
        }

        # Fall back to the raw version string if it exists.
        return @{ Version = $raw.Trim(); Error = $null }
    } catch {
        return @{ Version = $null; Error = $_.Exception.Message }
    }
}

function Resolve-AvailableBrowser {
    param(
        [string]$LogPath
    )

    $logLines = New-Object System.Collections.Generic.List[string]

    $programFilesX86 = [System.Environment]::GetEnvironmentVariable('ProgramFiles(x86)')
    if ([string]::IsNullOrWhiteSpace($programFilesX86)) {
        $programFilesX86 = "C:\Program Files (x86)"
    }

    $programFiles64 = $env:ProgramW6432
    if ([string]::IsNullOrWhiteSpace($programFiles64)) {
        $programFiles64 = $env:ProgramFiles
    }

    $edgePaths = @(
        "$programFilesX86\Microsoft\Edge\Application\msedge.exe",
        "$programFiles64\Microsoft\Edge\Application\msedge.exe",
        "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
        "$env:LOCALAPPDATA\Microsoft\Edge\Application\msedge.exe",
        "$env:USERPROFILE\AppData\Local\Microsoft\Edge\Application\msedge.exe"
    )

    foreach ($path in $edgePaths) {
        $result = Get-BrowserVersionResult -Path $path
        if (Test-Path $path) {
            return @{
                Channel = "msedge"
                Version = $result.Version
                Path = $path
            }
        }

        $logLines.Add("msedge: $path => $($result.Error)")
    }

    $chromePaths = @(
        "$programFiles64\Google\Chrome\Application\chrome.exe",
        "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
        "$programFilesX86\Google\Chrome\Application\chrome.exe",
        "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe",
        "$env:USERPROFILE\AppData\Local\Google\Chrome\Application\chrome.exe"
    )

    foreach ($path in $chromePaths) {
        $result = Get-BrowserVersionResult -Path $path
        if (Test-Path $path) {
            return @{
                Channel = "chrome"
                Version = $result.Version
                Path = $path
            }
        }

        $logLines.Add("chrome: $path => $($result.Error)")
    }

    if ($LogPath) {
        try {
            $header = "System browser detection log (" + (Get-Date -Format "yyyy-MM-ddTHH:mm:ssK") + ")"
            $content = @($header, "") + $logLines.ToArray()
            $content | Set-Content -Path $LogPath
        } catch {
            # Best-effort only.
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

function Ensure-ArtkConfigHasBrowsersSection {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ConfigPath,

        [string]$Channel = "bundled",
        [string]$Strategy = "auto"
    )

    if (-not (Test-Path $ConfigPath)) {
        return
    }

    $existing = Get-Content -Path $ConfigPath -Raw
    if ([string]::IsNullOrWhiteSpace($existing)) {
        return
    }

    if ([regex]::IsMatch($existing, '(?m)^\s*browsers\s*:')) {
        return
    }

    $browsersBlock = @"

browsers:
  enabled:
    - chromium
  channel: $Channel
  strategy: $Strategy
  viewport:
    width: 1280
    height: 720
  headless: true
"@

    Set-Content -Path $ConfigPath -Value ($existing.TrimEnd() + $browsersBlock)
}

function Set-ArtkConfigBrowsersChannel {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ConfigPath,

        [Parameter(Mandatory = $true)]
        [string]$Channel
    )

    if (-not (Test-Path $ConfigPath)) {
        return $false
    }

    $existing = Get-Content -Path $ConfigPath -Raw
    if ([string]::IsNullOrWhiteSpace($existing)) {
        return $false
    }

    if (-not [regex]::IsMatch($existing, '(?m)^\s*browsers\s*:')) {
        return $false
    }

    $pattern = '(?ms)(^\s*browsers\s*:\s*\r?\n.*?^\s*channel\s*:\s*)([^\r\n]+)'
    $re = [regex]::new(
        $pattern,
        [System.Text.RegularExpressions.RegexOptions]::Multiline -bor [System.Text.RegularExpressions.RegexOptions]::Singleline
    )

    if ($re.IsMatch($existing)) {
        $updated = $re.Replace($existing, "`$1$Channel", 1)
        if ($updated -ne $existing) {
            Set-Content -Path $ConfigPath -Value $updated
            return $true
        }

        return $false
    }

    # browsers block exists but has no channel line; insert directly under it.
    $insertPattern = '(?m)^(\s*browsers\s*:\s*)$'
    $insertRe = [regex]::new($insertPattern, [System.Text.RegularExpressions.RegexOptions]::Multiline)
    if ($insertRe.IsMatch($existing)) {
        $updated = $insertRe.Replace($existing, "`$1`r`n  channel: $Channel", 1)
        if ($updated -ne $existing) {
            Set-Content -Path $ConfigPath -Value $updated
            return $true
        }
    }

    return $false
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
    Write-Host "[1/7] Building @artk/core..." -ForegroundColor Yellow
    Push-Location $ArtkCore
    try {
        npm install
        npm run build
    } finally {
        Pop-Location
    }
} else {
    Write-Host "[1/7] @artk/core already built" -ForegroundColor Cyan
}

# Step 2: Create artk-e2e structure
Write-Host "[2/7] Creating artk-e2e/ structure..." -ForegroundColor Yellow
@(
    "vendor\artk-core",
    "vendor\artk-core-autogen",
    "tests",
    "docs",
    "journeys",
    ".auth-states"
) | ForEach-Object {
    $dir = Join-Path $ArtkE2e $_
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
}

# Step 3: Copy @artk/core to vendor
Write-Host "[3/7] Installing @artk/core to vendor/..." -ForegroundColor Yellow
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

Write-Host "[3/7] Installing @artk/core-autogen to vendor/..." -ForegroundColor Yellow
$AutogenVendorTarget = Join-Path $ArtkE2e "vendor\artk-core-autogen"
$AutogenDist = Join-Path $ArtkAutogen "dist"
if (-not (Test-Path $AutogenDist)) {
    Write-Host "Error: Missing @artk/core-autogen dist output at $AutogenDist" -ForegroundColor Red
    Write-Host "Build it first (from ARTK repo):" -ForegroundColor Yellow
    Write-Host "  cd $ArtkAutogen; npm install; npm run build" -ForegroundColor Yellow
    exit 1
}
Copy-Item -Path $AutogenDist -Destination $AutogenVendorTarget -Recurse -Force
Copy-Item -Path (Join-Path $ArtkAutogen "package.json") -Destination $AutogenVendorTarget -Force
$AutogenReadmePath = Join-Path $ArtkAutogen "README.md"
if (Test-Path $AutogenReadmePath) {
    Copy-Item -Path $AutogenReadmePath -Destination $AutogenVendorTarget -Force
}

# Step 4: Install prompts
Write-Host "[4/7] Installing prompts to .github/prompts/..." -ForegroundColor Yellow
$PromptsTarget = Join-Path $TargetProject ".github\prompts"
New-Item -ItemType Directory -Force -Path $PromptsTarget | Out-Null

Get-ChildItem -Path $ArtkPrompts -Filter "artk.*.md" | ForEach-Object {
    $filename = $_.Name
    $newname = $filename -replace '\.md$', '.prompt.md'
    Copy-Item $_.FullName -Destination (Join-Path $PromptsTarget $newname) -Force
}

# Step 5: Create configuration files
Write-Host "[5/7] Creating configuration files..." -ForegroundColor Yellow

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
        "@artk/core-autogen": "file:./vendor/artk-core-autogen",
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
    $channel = if ($env:ARTK_BROWSER_CHANNEL) { $env:ARTK_BROWSER_CHANNEL } else { "bundled" }
    $strategy = if ($env:ARTK_BROWSER_STRATEGY) { $env:ARTK_BROWSER_STRATEGY } else { "auto" }

    $existingConfig = Get-Content -Path $configPath -Raw
    if (-not [regex]::IsMatch($existingConfig, '(?m)^\s*browsers\s*:')) {
        Write-Host "artk.config.yml exists but browsers config is missing - adding browsers section" -ForegroundColor Yellow
        Ensure-ArtkConfigHasBrowsersSection -ConfigPath $configPath -Channel $channel -Strategy $strategy
    } else {
        Write-Host "artk.config.yml already exists - preserving existing configuration" -ForegroundColor Cyan
    }
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
    Write-Host "[6/7] Running npm install..." -ForegroundColor Yellow
    Push-Location $ArtkE2e
    try {
        # Install npm deps without triggering Playwright browser download.
        $env:PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = "1"

        $logsDir = Join-Path $TargetProject ".artk\logs"
        New-Item -ItemType Directory -Force -Path $logsDir | Out-Null
        $npmLogOut = Join-Path $logsDir "npm-install.out.log"
        $npmLogErr = Join-Path $logsDir "npm-install.err.log"

        $exitCode = 1
        try {
            $proc = Start-Process -FilePath "npm" -ArgumentList @("install", "--legacy-peer-deps") -NoNewWindow -Wait -PassThru -RedirectStandardOutput $npmLogOut -RedirectStandardError $npmLogErr
            $exitCode = $proc.ExitCode
        } catch {
            $exitCode = 1
            "Start-Process failed: $($_.Exception.Message)" | Set-Content -Path $npmLogErr
        }

        if ($exitCode -eq 0) {
            Write-Host "npm install: SUCCESS" -ForegroundColor Green
        } else {
            $errSnippet = $null
            try {
                if (Test-Path $npmLogErr) {
                    $errSnippet = (Get-Content -Path $npmLogErr -Tail 12 -ErrorAction SilentlyContinue) -join "`n"
                }
                if ([string]::IsNullOrWhiteSpace($errSnippet) -and (Test-Path $npmLogOut)) {
                    $errSnippet = (Get-Content -Path $npmLogOut -Tail 12 -ErrorAction SilentlyContinue) -join "`n"
                }
            } catch {
                $errSnippet = $null
            }

            Write-Host "npm install: FAILURE (exit code $exitCode)" -ForegroundColor Red
            if ($errSnippet) {
                Write-Host $errSnippet -ForegroundColor Red
            }
            Write-Host "Details saved to: $npmLogOut" -ForegroundColor DarkGray
            Write-Host "Details saved to: $npmLogErr" -ForegroundColor DarkGray
            exit 1
        }

        Remove-Item Env:PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD -ErrorAction SilentlyContinue
    } finally {
        Pop-Location
    }
} else {
    Write-Host "[6/7] Skipping npm install (-SkipNpm)" -ForegroundColor Cyan
}

# Step 7: Configure/install browsers
if (-not $SkipNpm) {
    Write-Host "[7/7] Configuring browsers..." -ForegroundColor Yellow
    Push-Location $ArtkE2e
    try {
        $finalBrowserChannel = "bundled"
        $finalBrowserStrategy = "auto"
        $finalBrowserPath = $null

        # Use a repo-local cache so developers don't fight global caches.
        $browsersCacheDir = Join-Path $TargetProject ".artk\browsers"
        New-Item -ItemType Directory -Force -Path $browsersCacheDir | Out-Null
        $env:PLAYWRIGHT_BROWSERS_PATH = $browsersCacheDir

        $browsersReady = $false

        # Prefer GitHub release-hosted browser cache if available; otherwise fallback to standard install.
        if (Download-PlaywrightBrowsers -ArtkE2e $ArtkE2e -ArtkRepo $ArtkRepo -BrowsersPath $browsersCacheDir) {
            $env:PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = "1"
            Write-Host "Using release-hosted Playwright browsers cache." -ForegroundColor Cyan
            $browsersReady = $true
            $finalBrowserChannel = "bundled"
            $finalBrowserStrategy = "release-cache"
        } else {
            Write-Host "Release cache unavailable; installing Playwright browsers..." -ForegroundColor Yellow
            Remove-Item Env:PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD -ErrorAction SilentlyContinue

            $logsDir = Join-Path $TargetProject ".artk\logs"
            New-Item -ItemType Directory -Force -Path $logsDir | Out-Null
            $pwInstallLogOut = Join-Path $logsDir "playwright-browser-install.out.log"
            $pwInstallLogErr = Join-Path $logsDir "playwright-browser-install.err.log"

            # The Playwright installer can emit very noisy download errors on restricted networks.
            # Using Start-Process avoids PowerShell surfacing stderr as a terminating NativeCommandError.
            $exitCode = 1
            try {
                $proc = Start-Process -FilePath "npx" -ArgumentList @("playwright", "install", "chromium") -NoNewWindow -Wait -PassThru -RedirectStandardOutput $pwInstallLogOut -RedirectStandardError $pwInstallLogErr
                $exitCode = $proc.ExitCode
            } catch {
                $exitCode = 1
                "Start-Process failed: $($_.Exception.Message)" | Set-Content -Path $pwInstallLogErr
            }

            if ($exitCode -eq 0) {
                $browsersReady = $true
                $finalBrowserChannel = "bundled"
                $finalBrowserStrategy = "bundled-install"
            } else {
                Write-Host "Failed to install Playwright browsers (exit code $exitCode)." -ForegroundColor Yellow
                Write-Host "Details saved to: $pwInstallLogOut" -ForegroundColor DarkGray
                Write-Host "Details saved to: $pwInstallLogErr" -ForegroundColor DarkGray
            }
        }

        if (-not $browsersReady) {
            $detectLog = $null
            try {
                $logsDir2 = Join-Path $TargetProject ".artk\logs"
                New-Item -ItemType Directory -Force -Path $logsDir2 | Out-Null
                $detectLog = Join-Path $logsDir2 "system-browser-detect.log"
            } catch {
                $detectLog = $null
            }

            $fallback = Resolve-AvailableBrowser -LogPath $detectLog
            if ($fallback -and $fallback.Channel -and $fallback.Channel -ne "bundled") {
                # Ensure config has browsers section, then force channel to system browser.
                Ensure-ArtkConfigHasBrowsersSection -ConfigPath $configPath -Channel $fallback.Channel -Strategy "system"
                $changed = Set-ArtkConfigBrowsersChannel -ConfigPath $configPath -Channel $fallback.Channel

                $finalBrowserChannel = $fallback.Channel
                $finalBrowserStrategy = "system"
                $finalBrowserPath = $fallback.Path

                if ($fallback.Channel -eq "msedge") {
                    Write-Host "Playwright browsers could not be downloaded. Using Microsoft Edge (msedge) as the default browser channel." -ForegroundColor Yellow
                } else {
                    Write-Host "Playwright browsers could not be downloaded. Using system browser channel '$($fallback.Channel)' as the default." -ForegroundColor Yellow
                }

                if ($fallback.Path) {
                    Write-Host "Detected browser: $($fallback.Path)" -ForegroundColor Cyan
                }
            } else {
                Write-Host "Playwright browsers could not be downloaded and no system browser was detected. Tests may not run until browsers are installed." -ForegroundColor Yellow
                if ($detectLog) {
                    Write-Host "System browser detection details saved to: $detectLog" -ForegroundColor DarkGray
                }
            }
        }

        # Persist for final summary outside the Push-Location scope.
        $script:FinalBrowserChannel = $finalBrowserChannel
        $script:FinalBrowserStrategy = $finalBrowserStrategy
        $script:FinalBrowserPath = $finalBrowserPath
        $script:BrowsersCacheDir = $browsersCacheDir
    } finally {
        Pop-Location
    }
} else {
    Write-Host "[7/7] Skipping browser installation (-SkipNpm)" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host " ARTK Installation Complete!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Installed:" -ForegroundColor Cyan
Write-Host "  artk-e2e/                             - E2E test workspace"
Write-Host "  artk-e2e/vendor/artk-core/            - @artk/core (vendored)"
Write-Host "  artk-e2e/vendor/artk-core-autogen/    - @artk/core-autogen (vendored)"
Write-Host "  artk-e2e/package.json                 - Test workspace dependencies"
Write-Host "  artk-e2e/playwright.config.ts         - Playwright configuration"
Write-Host "  artk-e2e/tsconfig.json                - TypeScript configuration"
Write-Host "  artk-e2e/artk.config.yml              - ARTK configuration"
Write-Host "  .github/prompts/                      - Copilot prompts"
Write-Host "  .artk/context.json                    - ARTK context"
Write-Host "  .artk/browsers/                       - Playwright browsers cache (repo-local)"
Write-Host "  .artk/logs/                           - Bootstrap logs (npm + Playwright)"

if ($script:FinalBrowserChannel) {
    Write-Host "" 
    Write-Host "Browser configuration:" -ForegroundColor Cyan
    Write-Host "  channel:  $($script:FinalBrowserChannel)"
    Write-Host "  strategy: $($script:FinalBrowserStrategy)"
    if ($script:FinalBrowserPath) {
        Write-Host "  path:     $($script:FinalBrowserPath)"
    }
}
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. cd artk-e2e"
Write-Host "  2. Open VS Code and use /artk.init-playbook in Copilot Chat"
Write-Host ""
Write-Host "Run tests:" -ForegroundColor Cyan
Write-Host "  cd artk-e2e; npm test"
Write-Host ""
