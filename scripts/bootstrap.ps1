#
# ARTK Bootstrap Script (PowerShell)
# Usage: .\bootstrap.ps1 -TargetPath C:\path\to\target-project [options]
#
# Options:
#   -SkipNpm                   Skip npm install
#   -Variant <variant>         Force specific variant (modern-esm, modern-cjs, legacy-16, legacy-14)
#   -ForceDetect               Force environment re-detection
#   -SkipValidation            Skip validation of generated code
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

    [switch]$SkipNpm,

    [ValidateSet("modern-esm", "modern-cjs", "legacy-16", "legacy-14", "")]
    [string]$Variant = "",

    [switch]$ForceDetect,

    [switch]$SkipValidation
)

# Multi-variant support functions
$ValidVariants = @("modern-esm", "modern-cjs", "legacy-16", "legacy-14")

function Get-NodeMajorVersion {
    try {
        $versionOutput = node -e "console.log(process.version.slice(1).split('.')[0])" 2>$null
        return [int]$versionOutput
    } catch {
        return 0
    }
}

function Get-ModuleSystem {
    param([string]$ProjectPath)

    # Resolve to absolute path
    $CurrentPath = $null
    try {
        $CurrentPath = (Resolve-Path $ProjectPath -ErrorAction Stop).Path
    } catch {
        $CurrentPath = $ProjectPath
    }

    # Walk up the directory tree to find nearest package.json (monorepo support)
    while ($CurrentPath -and $CurrentPath -ne [System.IO.Path]::GetPathRoot($CurrentPath)) {
        $pkgJson = Join-Path $CurrentPath "package.json"
        if (Test-Path $pkgJson) {
            try {
                $pkg = Get-Content $pkgJson -Raw | ConvertFrom-Json
                if ($pkg.type -eq "module") {
                    return "esm"
                }
                # Found package.json without "type": "module", so it's CJS
                return "cjs"
            } catch {
                # If parsing fails, continue walking up
            }
        }
        $CurrentPath = Split-Path -Parent $CurrentPath
    }

    # Check root directory as well
    if ($CurrentPath) {
        $pkgJson = Join-Path $CurrentPath "package.json"
        if (Test-Path $pkgJson) {
            try {
                $pkg = Get-Content $pkgJson -Raw | ConvertFrom-Json
                if ($pkg.type -eq "module") {
                    return "esm"
                }
            } catch { }
        }
    }

    return "cjs"
}

function Select-Variant {
    param([int]$NodeMajor, [string]$ModuleSystem)

    if ($NodeMajor -ge 18) {
        if ($ModuleSystem -eq "esm") {
            return "modern-esm"
        } else {
            return "modern-cjs"
        }
    } elseif ($NodeMajor -ge 16) {
        return "legacy-16"
    } elseif ($NodeMajor -ge 14) {
        return "legacy-14"
    } else {
        return ""
    }
}

function Get-VariantDistDir {
    param([string]$VariantId)

    switch ($VariantId) {
        "modern-esm" { return "dist" }
        "modern-cjs" { return "dist-cjs" }
        "legacy-16" { return "dist-legacy-16" }
        "legacy-14" { return "dist-legacy-14" }
        default { return "dist" }
    }
}

function Get-VariantPlaywrightVersion {
    param([string]$VariantId)

    switch ($VariantId) {
        { $_ -in @("modern-esm", "modern-cjs") } { return "1.57.x" }
        "legacy-16" { return "1.49.x" }
        "legacy-14" { return "1.33.x" }
        default { return "1.57.x" }
    }
}

function Test-VariantCompatibility {
    param(
        [string]$VariantId,
        [int]$NodeMajor
    )

    switch ($VariantId) {
        { $_ -in @("modern-esm", "modern-cjs") } {
            return $NodeMajor -ge 18
        }
        "legacy-16" {
            return ($NodeMajor -ge 16) -and ($NodeMajor -le 20)
        }
        "legacy-14" {
            return ($NodeMajor -ge 14) -and ($NodeMajor -le 18)
        }
        default {
            return $false
        }
    }
}

function Get-VariantNodeRange {
    # Returns LTS versions only (even numbers: 14, 16, 18, 20, 22)
    param([string]$VariantId)

    switch ($VariantId) {
        { $_ -in @("modern-esm", "modern-cjs") } { return "18, 20, 22 (LTS)" }
        "legacy-16" { return "16, 18, 20 (LTS)" }
        "legacy-14" { return "14, 16, 18 (LTS)" }
        default { return "18, 20, 22 (LTS)" }
    }
}

function Get-VariantPackageJson {
    param([string]$VariantId)

    switch ($VariantId) {
        "modern-esm" { return "package.json" }
        "modern-cjs" { return "package-cjs.json" }
        "legacy-16" { return "package-legacy-16.json" }
        "legacy-14" { return "package-legacy-14.json" }
        default { return "package.json" }
    }
}

function Get-AutogenDistDir {
    param([string]$VariantId)

    switch ($VariantId) {
        "modern-esm" { return "dist" }
        "modern-cjs" { return "dist-cjs" }
        "legacy-16" { return "dist-legacy-16" }
        "legacy-14" { return "dist-legacy-14" }
        default { return "dist" }
    }
}

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

# Guard: Prevent running bootstrap inside an existing artk-e2e folder
$TargetFolderName = Split-Path $TargetProject -Leaf
if ($TargetFolderName -eq "artk-e2e") {
    Write-Host ""
    Write-Host "ERROR: You are inside an artk-e2e folder!" -ForegroundColor Red
    Write-Host ""
    Write-Host "  Current path: $TargetProject" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Running bootstrap here would create a nested artk-e2e/artk-e2e/ structure." -ForegroundColor Yellow
    Write-Host "  Please run bootstrap from the PARENT project folder instead:" -ForegroundColor Yellow
    Write-Host ""
    $ParentPath = Split-Path $TargetProject -Parent
    Write-Host "  cd `"$ParentPath`"" -ForegroundColor Cyan
    Write-Host "  .\path\to\bootstrap.ps1 -TargetPath ." -ForegroundColor Cyan
    Write-Host ""
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

# Early variant detection (needed for correct dist directory)
$script:NodeMajor = Get-NodeMajorVersion
$script:ModuleSystem = Get-ModuleSystem -ProjectPath $TargetProject
$script:OverrideUsed = $false

# Check Node.js version
if ($NodeMajor -lt 14) {
    Write-Host "Error: Node.js $NodeMajor is not supported. ARTK requires Node.js 14 or higher." -ForegroundColor Red
    exit 1
}

# Determine variant
if ($Variant) {
    # Check if forced variant is compatible with current Node version
    if (-not (Test-VariantCompatibility -VariantId $Variant -NodeMajor $NodeMajor)) {
        $variantRange = Get-VariantNodeRange -VariantId $Variant
        $recommendedVariant = Select-Variant -NodeMajor $NodeMajor -ModuleSystem $ModuleSystem
        Write-Host "Error: Variant '$Variant' is not compatible with Node.js $NodeMajor" -ForegroundColor Red
        Write-Host ""
        Write-Host "Variant '$Variant' supports Node.js: $variantRange" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Options:"
        Write-Host "  1. Use a compatible variant for Node.js ${NodeMajor}:"
        Write-Host "     -Variant $recommendedVariant (recommended for Node $NodeMajor)"
        Write-Host "  2. Switch to a supported Node.js version"
        Write-Host "  3. Remove -Variant flag to use auto-detection"
        exit 1
    }
    $script:SelectedVariant = $Variant
    $script:OverrideUsed = $true
    Write-Host "Using forced variant: $SelectedVariant" -ForegroundColor Cyan
} elseif (-not $ForceDetect -and (Test-Path (Join-Path $TargetProject ".artk\context.json"))) {
    try {
        $existingContext = Get-Content (Join-Path $TargetProject ".artk\context.json") -Raw | ConvertFrom-Json
        $script:SelectedVariant = $existingContext.variant
        if (-not $SelectedVariant) {
            $script:SelectedVariant = Select-Variant -NodeMajor $NodeMajor -ModuleSystem $ModuleSystem
        }
        Write-Host "Using existing variant: $SelectedVariant" -ForegroundColor Cyan
    } catch {
        $script:SelectedVariant = Select-Variant -NodeMajor $NodeMajor -ModuleSystem $ModuleSystem
    }
} else {
    $script:SelectedVariant = Select-Variant -NodeMajor $NodeMajor -ModuleSystem $ModuleSystem
    Write-Host "Auto-selected variant: $SelectedVariant" -ForegroundColor Green
}

if (-not $SelectedVariant) {
    $script:SelectedVariant = "modern-cjs"
    Write-Host "Warning: Defaulting to modern-cjs variant" -ForegroundColor Yellow
}

$script:VariantDistDir = Get-VariantDistDir -VariantId $SelectedVariant
$script:VariantPwVersion = Get-VariantPlaywrightVersion -VariantId $SelectedVariant

Write-Host "Environment: Node $NodeMajor, $ModuleSystem" -ForegroundColor Cyan
Write-Host "Variant:     $SelectedVariant (Playwright $VariantPwVersion)" -ForegroundColor Cyan
Write-Host ""

# Step 1: Build @artk/core if needed (including variant-specific builds)
$CoreDist = Join-Path $ArtkCore "dist"
$CoreVariantDist = Join-Path $ArtkCore $VariantDistDir
$AutogenVariantDist = Join-Path $ArtkAutogen $VariantDistDir

# Check if default ESM build exists
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

# Build variant-specific dist if needed (e.g., dist-cjs for modern-cjs)
if ($VariantDistDir -ne "dist" -and -not (Test-Path $CoreVariantDist)) {
    Write-Host "[1/7] Building @artk/core variant ($SelectedVariant)..." -ForegroundColor Yellow
    Push-Location $ArtkCore
    try {
        $buildScript = switch ($SelectedVariant) {
            "modern-cjs" { "build:cjs" }
            "legacy-16" { "build:legacy-16" }
            "legacy-14" { "build:legacy-14" }
            default { $null }
        }
        if ($buildScript) {
            npm run $buildScript 2>&1 | Out-Null
            if ($LASTEXITCODE -ne 0) {
                Write-Host "Warning: Failed to build variant $SelectedVariant, falling back to ESM" -ForegroundColor Yellow
            } else {
                Write-Host "  Built $VariantDistDir successfully" -ForegroundColor Green
            }
        }
    } finally {
        Pop-Location
    }
}

# Build autogen variant if needed
if ($VariantDistDir -ne "dist" -and -not (Test-Path $AutogenVariantDist)) {
    Write-Host "[1/7] Building @artk/core-autogen variant ($SelectedVariant)..." -ForegroundColor Yellow
    Push-Location $ArtkAutogen
    try {
        # Ensure dependencies are installed
        if (-not (Test-Path "node_modules")) {
            npm install 2>&1 | Out-Null
        }
        $buildScript = switch ($SelectedVariant) {
            "modern-cjs" { "build:cjs" }
            "legacy-16" { "build:legacy-16" }
            "legacy-14" { "build:legacy-14" }
            default { $null }
        }
        if ($buildScript) {
            npm run $buildScript 2>&1 | Out-Null
            if ($LASTEXITCODE -ne 0) {
                Write-Host "Warning: Failed to build autogen variant $SelectedVariant" -ForegroundColor Yellow
            } else {
                Write-Host "  Built autogen $VariantDistDir successfully" -ForegroundColor Green
            }
        }
    } finally {
        Pop-Location
    }
}

# Step 2: Create artk-e2e structure
Write-Host "[2/7] Creating artk-e2e/ structure..." -ForegroundColor Yellow
@(
    "vendor\artk-core",
    "vendor\artk-core-autogen",
    "src\modules\foundation\auth",
    "src\modules\foundation\navigation",
    "src\modules\foundation\selectors",
    "src\modules\foundation\data",
    "src\modules\features",
    "config",
    "tests\setup",
    "tests\foundation",
    "tests\smoke",
    "tests\release",
    "tests\regression",
    "tests\journeys",
    "docs",
    "journeys",
    ".auth-states",
    "reports\discovery",
    "reports\testid",
    "reports\validation",
    "reports\verification"
) | ForEach-Object {
    $dir = Join-Path $ArtkE2e $_
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
}

# Copy foundation validation spec from template
$ValidationSpecTemplate = Join-Path $ArtkRepo "templates\bootstrap\foundation.validation.spec.ts"
$ValidationSpecDest = Join-Path $ArtkE2e "tests\foundation\foundation.validation.spec.ts"
if (Test-Path $ValidationSpecTemplate) {
    Copy-Item -Path $ValidationSpecTemplate -Destination $ValidationSpecDest -Force
    Write-Host "  Created foundation validation tests" -ForegroundColor Cyan
} else {
    # Create minimal validation spec if template not found
    $MinimalValidationSpec = @"
import { test, expect } from '@playwright/test';

test.describe('ARTK Foundation Validation', () => {
  test('baseURL is configured', async ({ baseURL }) => {
    expect(baseURL).toBeTruthy();
    expect(baseURL).toMatch(/^https?:\/\//);
  });

  test('baseURL is not a placeholder', async ({ baseURL }) => {
    expect(baseURL).not.toContain('\`$\{');
  });

  test('Playwright is correctly installed', async ({ browserName }) => {
    expect(browserName).toBeTruthy();
  });
});
"@
    Set-Content -Path $ValidationSpecDest -Value $MinimalValidationSpec
    Write-Host "  Created foundation validation tests (fallback)" -ForegroundColor Cyan
}

# Step 3: Copy @artk/core to vendor (using variant-specific dist)
Write-Host "[3/7] Installing @artk/core ($SelectedVariant) to vendor/..." -ForegroundColor Yellow
$VendorTarget = Join-Path $ArtkE2e "vendor\artk-core"

# Check if variant dist exists, fall back to default dist
$VariantDistPath = Join-Path $ArtkCore $VariantDistDir
if (-not (Test-Path $VariantDistPath)) {
    Write-Host "Warning: Variant dist directory not found: $VariantDistPath" -ForegroundColor Yellow
    $VariantDistPath = Join-Path $ArtkCore "dist"
    if (-not (Test-Path $VariantDistPath)) {
        Write-Host "Error: No dist directory found. Build @artk/core first:" -ForegroundColor Red
        Write-Host "  cd $ArtkCore; npm install; npm run build:variants" -ForegroundColor Yellow
        exit 1
    }
    Write-Host "Falling back to default dist directory" -ForegroundColor Yellow
}

$DistTarget = Join-Path $VendorTarget "dist"
New-Item -ItemType Directory -Force -Path $DistTarget | Out-Null
# Copy contents of variant dist to target dist (flatten, don't nest)
$CopyResult = Copy-Item -Path (Join-Path $VariantDistPath "*") -Destination $DistTarget -Recurse -Force -ErrorAction SilentlyContinue -PassThru
if (-not $CopyResult -or $CopyResult.Count -eq 0) {
    # Fallback: copy contents individually to avoid nesting
    Get-ChildItem -Path $VariantDistPath | ForEach-Object {
        Copy-Item -Path $_.FullName -Destination $DistTarget -Recurse -Force
    }
}

# Use variant-specific package.json (package-cjs.json, package-legacy-16.json, etc.)
$CorePackageJsonName = Get-VariantPackageJson -VariantId $SelectedVariant
$CorePackageJsonPath = Join-Path $ArtkCore $CorePackageJsonName
if (Test-Path $CorePackageJsonPath) {
    Copy-Item -Path $CorePackageJsonPath -Destination (Join-Path $VendorTarget "package.json") -Force
} else {
    Write-Host "Warning: Variant package.json not found ($CorePackageJsonName), using default" -ForegroundColor Yellow
    Copy-Item -Path (Join-Path $ArtkCore "package.json") -Destination $VendorTarget -Force
}
$VersionJson = Join-Path $ArtkCore "version.json"
if (Test-Path $VersionJson) {
    Copy-Item -Path $VersionJson -Destination $VendorTarget -Force
}
$ReadmePath = Join-Path $ArtkCore "README.md"
if (Test-Path $ReadmePath) {
    Copy-Item -Path $ReadmePath -Destination $VendorTarget -Force
}

# Add AI protection markers
Write-Host "  Adding AI protection markers..." -ForegroundColor Cyan

# READONLY.md
$ReadonlyContent = @"
# ⚠️ DO NOT MODIFY THIS DIRECTORY

## Variant Information

| Property | Value |
|----------|-------|
| **Variant** | $SelectedVariant |
| **Node.js Version** | $NodeMajor |
| **Playwright Version** | $VariantPwVersion |
| **Module System** | $ModuleSystem |
| **Installed At** | $(Get-Date -Format "o") |
| **Install Method** | bootstrap.ps1 |

**DO NOT modify files in this directory.**

If you need different functionality:
1. Check if the correct variant is installed: ``Get-Content .artk\context.json | ConvertFrom-Json | Select variant``
2. Reinstall with correct variant: ``artk init --force``
3. Check feature availability: ``Get-Content vendor\artk-core\variant-features.json``

---

*Generated by ARTK Bootstrap v1.0.0*
"@
Set-Content -Path (Join-Path $VendorTarget "READONLY.md") -Value $ReadonlyContent

# .ai-ignore
$AiIgnoreContent = @"
# AI agents should not modify files in this directory
# This is vendored code managed by ARTK CLI

*
"@
Set-Content -Path (Join-Path $VendorTarget ".ai-ignore") -Value $AiIgnoreContent

# variant-features.json
$VariantFeatures = @{
    variant = $SelectedVariant
    playwrightVersion = $VariantPwVersion
    nodeVersion = $NodeMajor
    moduleSystem = $ModuleSystem
    generatedAt = (Get-Date -Format "o")
    features = @{
        route_from_har = @{ available = $true }
        locator_filter = @{ available = $true }
        web_first_assertions = @{ available = $true }
        trace_viewer = @{ available = $true }
        api_testing = @{ available = $true }
    }
}
$VariantFeatures | ConvertTo-Json -Depth 4 | Set-Content -Path (Join-Path $VendorTarget "variant-features.json")

Write-Host "[3/7] Installing @artk/core-autogen ($SelectedVariant) to vendor/..." -ForegroundColor Yellow
$AutogenVendorTarget = Join-Path $ArtkE2e "vendor\artk-core-autogen"
$AutogenDistDir = Get-AutogenDistDir -VariantId $SelectedVariant
$AutogenDist = Join-Path $ArtkAutogen $AutogenDistDir

# Try variant-specific dist, fall back to default dist
if (-not (Test-Path $AutogenDist)) {
    Write-Host "Warning: Autogen variant dist not found: $AutogenDist" -ForegroundColor Yellow
    $AutogenDist = Join-Path $ArtkAutogen "dist"
}

if (-not (Test-Path $AutogenDist)) {
    Write-Host "Error: Missing @artk/core-autogen dist output at $AutogenDist" -ForegroundColor Red
    Write-Host "Build it first (from ARTK repo):" -ForegroundColor Yellow
    Write-Host "  cd $ArtkCore; npm run build:variants" -ForegroundColor Yellow
    exit 1
}

$AutogenDistTarget = Join-Path $AutogenVendorTarget "dist"
New-Item -ItemType Directory -Force -Path $AutogenDistTarget | Out-Null
Copy-Item -Path (Join-Path $AutogenDist "*") -Destination $AutogenDistTarget -Recurse -Force -ErrorAction SilentlyContinue
if (-not (Test-Path $AutogenDistTarget)) {
    Copy-Item -Path $AutogenDist -Destination $AutogenDistTarget -Recurse -Force
}

# Use variant-specific package.json for autogen (package-cjs.json, package-legacy-16.json, etc.)
$AutogenPackageJsonName = Get-VariantPackageJson -VariantId $SelectedVariant
$AutogenPackageJsonPath = Join-Path $ArtkAutogen $AutogenPackageJsonName
if (Test-Path $AutogenPackageJsonPath) {
    Copy-Item -Path $AutogenPackageJsonPath -Destination (Join-Path $AutogenVendorTarget "package.json") -Force
} else {
    Write-Host "Warning: Autogen variant package.json not found ($AutogenPackageJsonName), using default" -ForegroundColor Yellow
    Copy-Item -Path (Join-Path $ArtkAutogen "package.json") -Destination $AutogenVendorTarget -Force
}
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

$CommonPromptsSource = Join-Path $ArtkPrompts "common"
$CommonPromptsTarget = Join-Path $PromptsTarget "common"
if (Test-Path $CommonPromptsSource) {
    New-Item -ItemType Directory -Force -Path $CommonPromptsTarget | Out-Null
    $GeneralRulesPath = Join-Path $CommonPromptsSource "GENERAL_RULES.md"
    if (Test-Path $GeneralRulesPath) {
        Copy-Item $GeneralRulesPath -Destination (Join-Path $CommonPromptsTarget "GENERAL_RULES.md") -Force
    }
}

# Step 5: Create configuration files
Write-Host "[5/7] Creating configuration files..." -ForegroundColor Yellow

# Detect project name from target directory
$ProjectName = Split-Path -Leaf $TargetProject

# package.json - synchronized with bash/CLI templates
$PackageJson = @"
{
  "name": "artk-e2e",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "test": "playwright test",
    "test:smoke": "playwright test --grep @smoke",
    "test:release": "playwright test --grep @release",
    "test:regression": "playwright test --grep @regression",
    "test:validation": "playwright test --project=validation",
    "test:ui": "playwright test --ui",
    "report": "playwright show-report",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "yaml": "^2.3.4"
  },
  "devDependencies": {
    "@artk/core": "file:./vendor/artk-core",
    "@artk/core-autogen": "file:./vendor/artk-core-autogen",
    "@playwright/test": "^1.57.0",
    "@types/node": "^20.10.0",
    "typescript": "^5.3.0"
  }
}
"@
Set-Content -Path (Join-Path $ArtkE2e "package.json") -Value $PackageJson

# playwright.config.ts - Read from shared template or use inline fallback
# Template source: templates/bootstrap/playwright.config.template.ts
$PlaywrightTemplatePath = Join-Path $ArtkRepo "templates\bootstrap\playwright.config.template.ts"
if (Test-Path $PlaywrightTemplatePath) {
    $PlaywrightConfig = Get-Content -Path $PlaywrightTemplatePath -Raw
    # Remove the template header comment (first 10 lines are documentation)
    $PlaywrightConfig = ($PlaywrightConfig -split "`n" | Select-Object -Skip 10) -join "`n"
} else {
    # Fallback: inline template (synchronized with bash/CLI)
    $PlaywrightConfig = @"
import { defineConfig, devices } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

function loadArtkConfig(): Record<string, any> {
  const configPath = path.join(__dirname, 'artk.config.yml');
  if (!fs.existsSync(configPath)) {
    console.warn('[ARTK] Config not found, using defaults');
    return { environments: { local: { baseUrl: 'http://localhost:3000' } } };
  }
  try {
    const yaml = require('yaml');
    return yaml.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (e: any) {
    console.error('[ARTK] Failed to parse artk.config.yml: ' + e.message);
    return { environments: { local: { baseUrl: 'http://localhost:3000' } } };
  }
}

const _missingEnvVars: string[] = [];

function resolveEnvVars(value: string): string {
  if (typeof value !== 'string') return String(value);
  return value.replace(
    /\`$\{([A-Z_][A-Z0-9_]*)(:-([^}]*))?\}/gi,
    (match, varName, _hasDefault, defaultValue) => {
      const envValue = process.env[varName];
      if (envValue !== undefined && envValue !== '') return envValue;
      if (defaultValue !== undefined) return defaultValue;
      _missingEnvVars.push(varName);
      return '';
    }
  );
}

const artkConfig = loadArtkConfig();
const env = process.env.ARTK_ENV || 'local';
const rawBaseUrl = artkConfig.environments?.[env]?.baseUrl || 'http://localhost:3000';
const baseURL = resolveEnvVars(rawBaseUrl);
const browserChannel = artkConfig.browsers?.channel;

if (_missingEnvVars.length > 0) {
  const unique = [...new Set(_missingEnvVars)];
  console.warn('[ARTK] Missing env vars (no defaults): ' + unique.join(', '));
}

const browserUse: Record<string, any> = { ...devices['Desktop Chrome'] };
if (browserChannel && browserChannel !== 'bundled') {
  browserUse.channel = browserChannel;
}

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { open: 'never' }]],
  timeout: artkConfig.settings?.timeout || 30000,
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    { name: 'chromium', use: browserUse, dependencies: ['setup'] },
    { name: 'validation', testMatch: /foundation\.validation\.spec\.ts/, use: { ...browserUse, baseURL } },
  ],
});
"@
}
Set-Content -Path (Join-Path $ArtkE2e "playwright.config.ts") -Value $PlaywrightConfig

# tsconfig.json - Use CommonJS for Playwright compatibility
# Note: Playwright's test runner transforms TypeScript internally and works best with CommonJS.
# The artk-e2e package is isolated from the client project's module system.
$TsConfig = @"
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "Node",
    "lib": ["ES2022", "DOM"],
    "strict": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist",
    "rootDir": ".",
    "declaration": true,
    "resolveJsonModule": true,
    "baseUrl": ".",
    "paths": {
      "@artk/core": ["./vendor/artk-core/dist"],
      "@artk/core/*": ["./vendor/artk-core/dist/*"]
    }
  },
  "include": ["tests/**/*", "src/**/*", "config/**/*"],
  "exclude": ["node_modules", "dist", "vendor"]
}
"@
Set-Content -Path (Join-Path $ArtkE2e "tsconfig.json") -Value $TsConfig

# Foundation module index stub
$FoundationIndex = @"
/**
 * Foundation Modules - Core testing infrastructure
 *
 * These modules are created by /artk.discover-foundation and provide:
 * - Auth: Login flows and storage state management
 * - Navigation: Route helpers and URL builders
 * - Selectors: Locator utilities and data-testid helpers
 * - Data: Test data builders and cleanup
 */

// Export will be populated by /artk.discover-foundation
export {};
"@
Set-Content -Path (Join-Path $ArtkE2e "src\modules\foundation\index.ts") -Value $FoundationIndex

# Config env stub
$ConfigEnv = @"
/**
 * Environment Configuration Loader
 *
 * Loads environment-specific config from artk.config.yml
 */
import * as fs from 'fs';
import * as path from 'path';

export function getBaseUrl(env?: string): string {
  const targetEnv = env || process.env.ARTK_ENV || 'local';

  // Will be configured by /artk.discover-foundation
  const defaults: Record<string, string> = {
    local: 'http://localhost:3000',
    intg: 'https://intg.example.com',
  };

  return defaults[targetEnv] || defaults.local;
}
"@
Set-Content -Path (Join-Path $ArtkE2e "config\env.ts") -Value $ConfigEnv

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

# Map variant to legacy templateVariant for backwards compatibility
$TemplateModuleSystem = if ($SelectedVariant -eq "modern-esm") { "esm" } else { "commonjs" }

$ContextJson = @"
{
  "version": "1.0",
  "variant": "$SelectedVariant",
  "variantInstalledAt": "$(Get-Date -Format "o")",
  "nodeVersion": $NodeMajor,
  "moduleSystem": "$ModuleSystem",
  "playwrightVersion": "$VariantPwVersion",
  "artkVersion": "1.0.0",
  "installMethod": "bootstrap",
  "overrideUsed": $($OverrideUsed.ToString().ToLower()),
  "projectRoot": "$($TargetProject -replace '\\', '\\')",
  "artkRoot": "$($ArtkE2e -replace '\\', '\\')",
  "initialized_at": "$(Get-Date -Format "yyyy-MM-ddTHH:mm:ssK")",
  "bootstrap_script": "$($ScriptDir -replace '\\', '\\')\\bootstrap.ps1",
  "artk_repo": "$($ArtkRepo -replace '\\', '\\')",
  "templateVariant": "$TemplateModuleSystem",
  "next_suggested": "/artk.init-playbook"
}
"@
Set-Content -Path (Join-Path $ArtkDir "context.json") -Value $ContextJson

# Generate variant-aware Copilot instructions
Write-Host "[5.4/7] Generating variant-aware Copilot instructions..." -ForegroundColor Yellow

function Get-VariantDisplayName {
    param([string]$Variant)
    switch ($Variant) {
        "modern-esm" { return "Modern ESM" }
        "modern-cjs" { return "Modern CJS" }
        "legacy-16" { return "Legacy Node 16" }
        "legacy-14" { return "Legacy Node 14" }
        default { return $Variant }
    }
}

$VariantDisplayName = Get-VariantDisplayName -Variant $SelectedVariant
$IsLegacy = ($SelectedVariant -eq "legacy-16" -or $SelectedVariant -eq "legacy-14")
$IsESM = ($SelectedVariant -eq "modern-esm")
$VariantNodeRangeStr = (Get-VariantNodeRange -Variant $SelectedVariant) -join ", "

$VariantInfoPrompt = @"
---
name: artk.variant-info
description: "Variant-specific Copilot instructions for ARTK tests"
---

# ARTK Variant Information

## Installed Variant: $SelectedVariant

| Property | Value |
|----------|-------|
| **Display Name** | $VariantDisplayName |
| **Node.js Range** | $VariantNodeRangeStr |
| **Playwright Version** | $VariantPwVersion |
| **Module System** | $ModuleSystem |

## Critical: Vendor Directory Rules

**DO NOT modify files in ``artk-e2e/vendor/artk-core/`` or ``artk-e2e/vendor/artk-core-autogen/``.**

These directories contain vendored ARTK code that:
1. Is automatically managed by ARTK CLI/bootstrap
2. Will be overwritten on upgrades
3. Is built for a specific Node.js version and module system

If you encounter issues with vendor code:
1. Check ``artk-e2e/vendor/artk-core/variant-features.json`` for feature availability
2. Suggest running ``artk init --force`` or re-running bootstrap to reinstall
3. Use documented alternatives from ``variant-features.json``
4. **NEVER patch or modify vendor code directly**

## Feature Availability

Before using Playwright features, check ``artk-e2e/vendor/artk-core/variant-features.json``:

```typescript
// Read feature availability
import features from './vendor/artk-core/variant-features.json';

if (!features.features.clock_api?.available) {
  // Use alternative approach documented in features.features.clock_api.alternative
}
```

"@

# Add legacy-specific instructions if applicable
if ($IsLegacy) {
    $VariantInfoPrompt += @"
## Legacy Variant Limitations

This project uses a legacy ARTK variant (``$SelectedVariant``) with Playwright $VariantPwVersion.
Some modern features are NOT available. Always check ``variant-features.json`` before using:

- **aria_snapshots**: May not be available - use manual ARIA attribute queries
- **clock_api**: May not be available - use manual Date mocking
- **locator_or/and**: May not be available - use CSS selectors
- **expect_soft**: May not be available - collect assertions manually

When generating tests, always check feature availability first.

"@
}

# Add import patterns based on module system
if ($IsESM) {
    $VariantInfoPrompt += @"
## Import Patterns (ESM)

Use ESM import syntax:

```typescript
import { test, expect } from '@playwright/test';
import { loadConfig } from '@artk/core/config';
import { AuthFixture } from '@artk/core/auth';
```

"@
} else {
    $VariantInfoPrompt += @"
## Import Patterns (CommonJS)

Use CommonJS require syntax:

```typescript
const { test, expect } = require('@playwright/test');
const { loadConfig } = require('@artk/core/config');
const { AuthFixture } = require('@artk/core/auth');
```

**DO NOT use ESM import syntax in this project.**

"@
}

# Add error handling guidance
$VariantInfoPrompt += @"
## When You Encounter Errors

### Module/Import Errors

If you see ``ERR_REQUIRE_ESM``, ``Cannot use import statement``, or similar:

1. Check the variant's module system (this project: $ModuleSystem)
2. Suggest reinstalling: ``artk init . --force`` or re-run bootstrap
3. **DO NOT try to fix by modifying vendor code**

### Feature Not Found

If a Playwright feature doesn't exist:

1. Check ``variant-features.json`` for availability
2. This variant uses Playwright $VariantPwVersion
3. Use the documented alternative approach

---

*Generated by ARTK bootstrap for variant $SelectedVariant*
"@

$PromptsTarget = Join-Path $TargetProject ".github\prompts"
Set-Content -Path (Join-Path $PromptsTarget "artk.variant-info.prompt.md") -Value $VariantInfoPrompt
Write-Host "Generated artk.variant-info.prompt.md" -ForegroundColor Green

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
            # Detect if npm is a PowerShell script (e.g., nvm4w) vs executable/cmd
            $npmCmd = Get-Command npm -ErrorAction SilentlyContinue
            if ($npmCmd -and $npmCmd.Path -match '\.ps1$') {
                # npm is a PowerShell script (nvm4w), use direct invocation with output capture
                Write-Host "  (detected nvm4w/PowerShell npm)" -ForegroundColor DarkGray
                $output = & npm install --legacy-peer-deps 2>&1
                $exitCode = $LASTEXITCODE
                $output | Out-File -FilePath $npmLogOut -Encoding utf8
            } else {
                # Standard npm.cmd or npm.exe, use Start-Process for proper output redirection
                $proc = Start-Process -FilePath "npm" -ArgumentList @("install", "--legacy-peer-deps") -NoNewWindow -Wait -PassThru -RedirectStandardOutput $npmLogOut -RedirectStandardError $npmLogErr
                $exitCode = $proc.ExitCode
            }
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
