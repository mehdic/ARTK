#
# validate-generated.ps1 - Validation script for generated foundation modules
# Validates that generated code matches the detected environment
#
# Usage:
#   .\validate-generated.ps1 [-ProjectRoot <path>]
#
# Exit codes:
#   0 - Validation passed
#   1 - Validation failed
#

param(
    [string]$ProjectRoot = "."
)

$ErrorActionPreference = "Stop"

# Ensure project root exists
if (-not (Test-Path $ProjectRoot)) {
    Write-Host "✗ Project root does not exist: $ProjectRoot" -ForegroundColor Red
    exit 1
}

# Change to project root
Push-Location $ProjectRoot

try {
    Write-Host "Validating generated foundation modules..."
    Write-Host "Project root: $(Get-Location)"
    Write-Host ""

    # Check if artk-e2e directory exists
    if (-not (Test-Path "artk-e2e")) {
        Write-Host "⚠ No artk-e2e directory found. Skipping validation." -ForegroundColor Yellow
        exit 0
    }

    # Check if foundation modules exist
    $foundationDir = "artk-e2e/foundation"
    if (-not (Test-Path $foundationDir)) {
        Write-Host "⚠ No foundation directory found. Skipping validation." -ForegroundColor Yellow
        exit 0
    }

    # Run validation using Node.js
    $validationScript = @"
const path = require('path');
const fs = require('fs');

// Import validation runner
const validationModule = require('@artk/core/validation');
const { runValidation } = validationModule;

// Run validation
const projectRoot = process.cwd();
runValidation(projectRoot)
  .then(result => {
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.valid ? 0 : 1);
  })
  .catch(error => {
    console.error(JSON.stringify({
      valid: false,
      errors: [{
        rule: 'validation-error',
        file: 'unknown',
        message: error.message
      }]
    }, null, 2));
    process.exit(1);
  });
"@

    $validationResult = ""
    $validationExitCode = 0

    try {
        $validationResult = node -e $validationScript 2>&1
        $validationExitCode = $LASTEXITCODE
    }
    catch {
        $validationResult = @{
            valid = $false
            errors = @(
                @{
                    rule = "script-error"
                    message = "Validation script failed: $_"
                }
            )
        } | ConvertTo-Json
        $validationExitCode = 1
    }

    # Parse validation result
    $result = $null
    try {
        $result = $validationResult | ConvertFrom-Json
    }
    catch {
        $result = @{
            valid = $false
            errors = @(
                @{
                    rule = "parse-error"
                    message = "Failed to parse validation result"
                }
            )
        }
    }

    # Check result
    if ($result.valid) {
        Write-Host "✓ Validation passed" -ForegroundColor Green
        Write-Host ""
        Write-Host "Generated foundation modules are compatible with detected environment."
        exit 0
    }
    else {
        Write-Host "✗ Validation failed" -ForegroundColor Red
        Write-Host ""
        Write-Host "Errors found:"
        if ($result.errors -and $result.errors.Count -gt 0) {
            foreach ($error in $result.errors) {
                Write-Host "  - $($error.file): $($error.message)"
            }
        }
        Write-Host ""
        Write-Host "Generated code does not match detected environment."
        Write-Host "Run with --force-detect to re-detect and regenerate."
        exit 1
    }
}
finally {
    Pop-Location
}
