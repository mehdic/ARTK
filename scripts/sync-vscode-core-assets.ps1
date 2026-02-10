# Sync Core dist, AutoGen dist, and bootstrap templates to VS Code extension assets
# PowerShell equivalent of sync-vscode-core-assets.sh for Windows compatibility

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent $ScriptDir

$CoreSource = Join-Path $RepoRoot "core\typescript"
$AutogenSource = Join-Path $RepoRoot "core\typescript\autogen"
$BootstrapSource = Join-Path $RepoRoot "templates\bootstrap"
$AssetsDir = Join-Path $RepoRoot "packages\vscode-extension\assets"

$CoreTarget = Join-Path $AssetsDir "core"
$AutogenTarget = Join-Path $AssetsDir "autogen"
$BootstrapTarget = Join-Path $AssetsDir "bootstrap-templates"

Write-Host "Syncing VS Code extension core assets..."

# ── Verify source directories ──────────────────────────────────────

$CoreDist = Join-Path $CoreSource "dist"
if (-not (Test-Path $CoreDist)) {
    Write-Error "ERROR: Core dist not found at: $CoreDist`nRun 'npm run build' in core/typescript/ first."
    exit 1
}

$AutogenDist = Join-Path $AutogenSource "dist"
if (-not (Test-Path $AutogenDist)) {
    Write-Error "ERROR: AutoGen dist not found at: $AutogenDist`nRun 'npm run build' in core/typescript/autogen/ first."
    exit 1
}

if (-not (Test-Path $BootstrapSource)) {
    Write-Error "ERROR: Bootstrap templates not found at: $BootstrapSource"
    exit 1
}

# FIX EDGE-01: Check for empty source directories
$bootstrapContents = Get-ChildItem -Path $BootstrapSource -Force -ErrorAction SilentlyContinue
if (-not $bootstrapContents -or $bootstrapContents.Count -eq 0) {
    Write-Error "ERROR: Bootstrap templates directory is empty: $BootstrapSource"
    exit 1
}

# ── Security checks on targets ─────────────────────────────────────

foreach ($target in @($CoreTarget, $AutogenTarget, $BootstrapTarget)) {
    if (Test-Path $target) {
        $item = Get-Item $target -Force
        if ($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint) {
            Write-Error "ERROR: Target is a symlink/junction, refusing to continue for security: $target"
            exit 1
        }
    }
}

# ── Strip package.json helper ──────────────────────────────────────

function Copy-PackageJsonStripped {
    param([string]$Src, [string]$Dest)
    if (-not (Test-Path $Src)) {
        Write-Error "ERROR: Source package.json not found: $Src"
        exit 1
    }
    $pkg = Get-Content $Src -Raw | ConvertFrom-Json
    $pkg.PSObject.Properties.Remove('devDependencies')
    $pkg.PSObject.Properties.Remove('scripts')
    $pkg | Add-Member -NotePropertyName 'private' -NotePropertyValue $true -Force
    # FIX PS-04: Use .NET to write UTF-8 without BOM (works on both PS 5.x and 7+)
    $json = $pkg | ConvertTo-Json -Depth 10
    [System.IO.File]::WriteAllText($Dest, $json, [System.Text.UTF8Encoding]::new($false))
}

# ── Helper: Remove .DS_Store files ─────────────────────────────────

function Remove-DSStore {
    param([string]$Dir)
    Get-ChildItem -Path $Dir -Recurse -Force -Filter ".DS_Store" -ErrorAction SilentlyContinue |
        Remove-Item -Force -ErrorAction SilentlyContinue
}

# ── Helper: Clean leftover staging dirs ────────────────────────────

function Remove-StaleStagingDirs {
    param([string]$ParentDir, [string]$Prefix)
    Get-ChildItem -Path $ParentDir -Filter "$Prefix.staging.*" -Directory -ErrorAction SilentlyContinue |
        Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
}

# FIX ATM-02: Safe atomic swap using rename-old pattern instead of rm-then-mv
function Invoke-AtomicSwap {
    param([string]$Staging, [string]$Target)
    $oldDir = "$Target.old.$PID"
    if (Test-Path $Target) {
        Rename-Item -Path $Target -NewName (Split-Path $oldDir -Leaf)
    }
    Rename-Item -Path $Staging -NewName (Split-Path $Target -Leaf)
    if (Test-Path $oldDir) {
        Remove-Item -Recurse -Force $oldDir -ErrorAction SilentlyContinue
    }
}

# ── 1. Sync Core ───────────────────────────────────────────────────

Write-Host "  1/3 Syncing @artk/core..."

$CoreStaging = "$CoreTarget.staging.$PID"
Remove-StaleStagingDirs -ParentDir $AssetsDir -Prefix "core"
New-Item -ItemType Directory -Force -Path $CoreStaging | Out-Null

try {
    # Copy dist
    Copy-Item -Recurse -Force (Join-Path $CoreSource "dist") (Join-Path $CoreStaging "dist")

    # Copy templates
    $templatesPath = Join-Path $CoreSource "templates"
    if (Test-Path $templatesPath) {
        Copy-Item -Recurse -Force $templatesPath (Join-Path $CoreStaging "templates")
    }

    # Copy version.json
    $versionPath = Join-Path $CoreSource "version.json"
    if (Test-Path $versionPath) {
        Copy-Item -Force $versionPath (Join-Path $CoreStaging "version.json")
    }

    # Strip and copy package.json
    Copy-PackageJsonStripped -Src (Join-Path $CoreSource "package.json") -Dest (Join-Path $CoreStaging "package.json")

    # Remove .DS_Store files
    Remove-DSStore -Dir $CoreStaging

    # Verify critical files
    $coreCritical = @(
        "dist\index.js",
        "dist\llkb\index.js",
        "package.json"
    )
    foreach ($file in $coreCritical) {
        $filePath = Join-Path $CoreStaging $file
        if (-not (Test-Path $filePath)) {
            throw "Post-copy verification failed: core/$file not found at $filePath"
        }
    }

    # Atomic swap (rename-old pattern)
    Invoke-AtomicSwap -Staging $CoreStaging -Target $CoreTarget

    Write-Host "     core/dist/, templates/, package.json (stripped), version.json"
}
catch {
    if (Test-Path $CoreStaging) {
        Remove-Item -Recurse -Force $CoreStaging -ErrorAction SilentlyContinue
    }
    # Clean up .old dir if swap partially completed
    $coreOld = "$CoreTarget.old.$PID"
    if (Test-Path $coreOld) {
        Remove-Item -Recurse -Force $coreOld -ErrorAction SilentlyContinue
    }
    Write-Error "ERROR: Core sync failed - $_"
    exit 1
}

# ── 2. Sync AutoGen ────────────────────────────────────────────────

Write-Host "  2/3 Syncing @artk/core-autogen..."

$AutogenStaging = "$AutogenTarget.staging.$PID"
Remove-StaleStagingDirs -ParentDir $AssetsDir -Prefix "autogen"
New-Item -ItemType Directory -Force -Path $AutogenStaging | Out-Null

try {
    # Copy dist
    Copy-Item -Recurse -Force (Join-Path $AutogenSource "dist") (Join-Path $AutogenStaging "dist")

    # Strip and copy package.json
    Copy-PackageJsonStripped -Src (Join-Path $AutogenSource "package.json") -Dest (Join-Path $AutogenStaging "package.json")

    # Remove .DS_Store files
    Remove-DSStore -Dir $AutogenStaging

    # Verify critical files
    $autogenCritical = @(
        "dist\cli\index.js",
        "dist\mapping\index.js",
        "package.json"
    )
    foreach ($file in $autogenCritical) {
        $filePath = Join-Path $AutogenStaging $file
        if (-not (Test-Path $filePath)) {
            throw "Post-copy verification failed: autogen/$file not found at $filePath"
        }
    }

    # Atomic swap (rename-old pattern)
    Invoke-AtomicSwap -Staging $AutogenStaging -Target $AutogenTarget

    Write-Host "     autogen/dist/, package.json (stripped)"
}
catch {
    if (Test-Path $AutogenStaging) {
        Remove-Item -Recurse -Force $AutogenStaging -ErrorAction SilentlyContinue
    }
    $autogenOld = "$AutogenTarget.old.$PID"
    if (Test-Path $autogenOld) {
        Remove-Item -Recurse -Force $autogenOld -ErrorAction SilentlyContinue
    }
    Write-Error "ERROR: AutoGen sync failed - $_"
    exit 1
}

# ── 3. Sync Bootstrap Templates ────────────────────────────────────

Write-Host "  3/3 Syncing bootstrap templates..."

$BootstrapStaging = "$BootstrapTarget.staging.$PID"
Remove-StaleStagingDirs -ParentDir $AssetsDir -Prefix "bootstrap-templates"
New-Item -ItemType Directory -Force -Path $BootstrapStaging | Out-Null

try {
    # Copy bootstrap template files
    Copy-Item -Recurse -Force "$BootstrapSource\*" $BootstrapStaging

    # Remove .DS_Store files
    Remove-DSStore -Dir $BootstrapStaging

    # FIX EDGE-03: Verify critical bootstrap template files
    $playwrightTemplate = Join-Path $BootstrapStaging "playwright.config.template.ts"
    if (-not (Test-Path $playwrightTemplate)) {
        throw "Post-copy verification failed: bootstrap-templates/playwright.config.template.ts not found"
    }

    # Atomic swap (rename-old pattern)
    Invoke-AtomicSwap -Staging $BootstrapStaging -Target $BootstrapTarget

    Write-Host "     bootstrap-templates/"
}
catch {
    if (Test-Path $BootstrapStaging) {
        Remove-Item -Recurse -Force $BootstrapStaging -ErrorAction SilentlyContinue
    }
    $bootstrapOld = "$BootstrapTarget.old.$PID"
    if (Test-Path $bootstrapOld) {
        Remove-Item -Recurse -Force $bootstrapOld -ErrorAction SilentlyContinue
    }
    Write-Error "ERROR: Bootstrap templates sync failed - $_"
    exit 1
}

Write-Host "Done: VS Code extension core assets synced"
