#
# detect-env.ps1 - Environment detection script for Windows PowerShell
# Detects CommonJS vs ESM module system and outputs JSON result
#
# Usage:
#   .\detect-env.ps1 [-ProjectRoot <path>]
#
# Output: JSON object with detection results
#

param(
    [string]$ProjectRoot = "."
)

$ErrorActionPreference = "Stop"

# Ensure project root exists
if (-not (Test-Path $ProjectRoot)) {
    $error = @{
        error = "Project root does not exist: $ProjectRoot"
    } | ConvertTo-Json -Compress
    Write-Error $error
    exit 1
}

# Change to project root
Push-Location $ProjectRoot

try {
    # Function to detect module system from package.json
    function Get-PackageType {
        if (-not (Test-Path "package.json")) {
            return "unknown"
        }

        try {
            $pkg = Get-Content "package.json" -Raw | ConvertFrom-Json
            if ($pkg.type) {
                return $pkg.type
            }
            return "commonjs"
        }
        catch {
            return "unknown"
        }
    }

    # Function to detect module system from tsconfig.json
    function Get-TsConfigModule {
        if (-not (Test-Path "tsconfig.json")) {
            return "unknown"
        }

        try {
            # Read and strip comments
            $content = Get-Content "tsconfig.json" -Raw

            # Simple comment stripping (not perfect but good enough)
            $content = $content -replace '//.*', ''
            $content = $content -replace '/\*[\s\S]*?\*/', ''

            $tsconfig = $content | ConvertFrom-Json
            if ($tsconfig.compilerOptions.module) {
                return $tsconfig.compilerOptions.module
            }
            return "unknown"
        }
        catch {
            return "unknown"
        }
    }

    # Function to determine final module system
    function Get-ModuleSystem {
        param(
            [string]$PackageType,
            [string]$TsModule
        )

        # ESM indicators
        if ($PackageType -eq "module") {
            return "esm"
        }

        if ($TsModule -match "^(ESNext|ES2020|ES2022|NodeNext)$") {
            return "esm"
        }

        # CommonJS indicators
        if ($PackageType -eq "commonjs") {
            return "commonjs"
        }

        if ($TsModule -eq "CommonJS") {
            return "commonjs"
        }

        # Default
        return "unknown"
    }

    # Function to determine confidence
    function Get-Confidence {
        param(
            [string]$PackageType,
            [string]$TsModule,
            [string]$ModuleSystem
        )

        # High confidence: both package.json and tsconfig.json agree
        if ($ModuleSystem -eq "esm") {
            if (($PackageType -eq "module") -and ($TsModule -match "^(ESNext|ES2020|ES2022|NodeNext)$")) {
                return "high"
            }
        }

        if ($ModuleSystem -eq "commonjs") {
            if (($PackageType -eq "commonjs") -and ($TsModule -eq "CommonJS")) {
                return "high"
            }
        }

        # Medium confidence: one indicator
        if (($PackageType -ne "unknown") -or ($TsModule -ne "unknown")) {
            return "medium"
        }

        # Low confidence: no indicators
        return "low"
    }

    # Main detection
    # Detect Node.js version
    $nodeVersion = "unknown"
    try {
        $nodeVersionOutput = node --version 2>$null
        if ($nodeVersionOutput) {
            $nodeVersion = $nodeVersionOutput.TrimStart('v')
        }
    }
    catch {
        $nodeVersion = "unknown"
    }

    # Detect from package.json
    $packageType = Get-PackageType

    # Detect from tsconfig.json
    $tsModule = Get-TsConfigModule

    # Determine final module system
    $moduleSystem = Get-ModuleSystem -PackageType $packageType -TsModule $tsModule

    # Determine confidence
    $confidence = Get-Confidence -PackageType $packageType -TsModule $tsModule -ModuleSystem $moduleSystem

    # Build result object
    $result = @{
        projectRoot = (Get-Location).Path
        detection = @{
            nodeVersion = $nodeVersion
            moduleSystem = $moduleSystem
            packageType = if ($packageType -eq "unknown") { $null } else { $packageType }
            tsConfigModule = if ($tsModule -eq "unknown") { $null } else { $tsModule }
            confidence = $confidence
        }
        validation = @{
            timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
            valid = $true
            errors = @()
        }
    }

    # Output JSON
    $result | ConvertTo-Json -Depth 10

}
finally {
    Pop-Location
}
