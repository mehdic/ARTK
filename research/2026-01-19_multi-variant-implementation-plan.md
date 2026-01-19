# ARTK Multi-Variant Build System - Implementation Plan

**Date:** 2026-01-19
**Author:** Claude (Ultrathink Analysis)
**Status:** PLANNING
**Confidence:** 0.92

---

## Executive Summary

This plan details the implementation of a 3-variant ARTK build system to support Node.js 14, 16, 18, 20, and 22 across ESM and CommonJS project types. The goal is to eliminate runtime compatibility issues by providing pre-built variants that "just work" without AI agents modifying code.

---

## Table of Contents

1. [Variant Matrix](#1-variant-matrix)
2. [Directory Structure](#2-directory-structure)
3. [Build System Changes](#3-build-system-changes)
4. [Package.json Updates](#4-packagejson-updates)
5. [Bootstrap Script Updates](#5-bootstrap-script-updates)
6. [CLI Updates](#6-cli-updates)
7. [Prompt Updates](#7-prompt-updates)
8. [Testing Strategy](#8-testing-strategy)
9. [CI/CD Pipeline](#9-cicd-pipeline)
10. [Documentation Updates](#10-documentation-updates)
11. [Migration Guide](#11-migration-guide)
12. [Implementation Phases](#12-implementation-phases)
13. [Risk Assessment](#13-risk-assessment)
14. [Rollback Plan](#14-rollback-plan)

---

## 1. Variant Matrix

### 1.1 Final Variant Specification

| Variant | ID | Playwright | Node.js | TypeScript Target | Module System |
|---------|-----|------------|---------|-------------------|---------------|
| **Modern** | `modern` | 1.57.x | 18, 20, 22 | ES2022 | ESM + CJS |
| **Legacy Node 16** | `legacy-16` | 1.49.x | 16, 18, 20 | ES2021 | CJS only |
| **Legacy Node 14** | `legacy-14` | 1.33.x | 14, 16, 18 | ES2020 | CJS only |

### 1.2 Feature Compatibility

| Feature | modern | legacy-16 | legacy-14 |
|---------|--------|-----------|-----------|
| `?.` optional chaining | ✅ | ✅ | ✅ |
| `??` nullish coalescing | ✅ | ✅ | ✅ |
| Top-level await (ESM) | ✅ | ✅ | ❌ |
| `Promise.any` | ✅ | ✅ | ❌ |
| `String.replaceAll` | ✅ | ✅ | ❌ |
| ESM native imports | ✅ | ❌ | ❌ |
| Conditional exports | ✅ | ✅ | ✅ |

### 1.3 Playwright Feature Differences

| Feature | 1.57 (modern) | 1.49 (legacy-16) | 1.33 (legacy-14) |
|---------|---------------|------------------|------------------|
| ARIA snapshots | ✅ | ✅ | ❌ |
| Clock API | ✅ | ✅ | ❌ |
| Route from HAR | ✅ | ✅ | ✅ |
| Web-first assertions | ✅ | ✅ | ✅ |
| Trace viewer | ✅ | ✅ | ✅ |
| Component testing | ✅ | ✅ | Limited |

---

## 2. Directory Structure

### 2.1 Core Package Structure (After Build)

```
core/typescript/
├── dist/                          # Modern ESM (default)
│   ├── index.js
│   ├── index.d.ts
│   ├── config/
│   ├── auth/
│   ├── fixtures/
│   └── ...
├── dist-cjs/                      # Modern CommonJS
│   ├── index.cjs
│   ├── config/
│   └── ...
├── dist-legacy-16/                # Legacy Node 16 (CJS)
│   ├── index.cjs
│   ├── config/
│   └── ...
├── dist-legacy-14/                # Legacy Node 14 (CJS)
│   ├── index.cjs
│   ├── config/
│   └── ...
├── package.json                   # With conditional exports
├── package-legacy-16.json         # Variant-specific package.json
├── package-legacy-14.json         # Variant-specific package.json
├── tsconfig.json                  # Modern ESM config
├── tsconfig.cjs.json              # Modern CJS config
├── tsconfig.legacy-16.json        # Legacy 16 config
├── tsconfig.legacy-14.json        # Legacy 14 config
└── scripts/
    ├── build-variants.sh          # Builds all variants
    ├── build-variants.ps1         # Windows version
    └── test-variants.sh           # Tests all variants
```

### 2.2 Installed Structure (Client Project)

```
artk-e2e/
├── vendor/
│   └── artk-core/                 # Selected variant copied here
│       ├── dist/                  # Only selected variant
│       ├── package.json           # Variant-appropriate package.json
│       └── templates/
├── package.json                   # References vendor/artk-core
└── ...
```

---

## 3. Build System Changes

### 3.1 New Files to Create

#### 3.1.1 `core/typescript/tsconfig.cjs.json`

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "CommonJS",
    "moduleResolution": "Node",
    "outDir": "./dist-cjs",
    "declaration": true,
    "declarationDir": "./dist-cjs",
    "target": "ES2022"
  },
  "exclude": ["node_modules", "dist", "dist-*", "**/*.test.ts", "**/__tests__/**"]
}
```

#### 3.1.2 `core/typescript/tsconfig.legacy-16.json`

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "CommonJS",
    "moduleResolution": "Node",
    "outDir": "./dist-legacy-16",
    "declaration": true,
    "declarationDir": "./dist-legacy-16",
    "target": "ES2021",
    "lib": ["ES2021", "DOM"]
  },
  "exclude": ["node_modules", "dist", "dist-*", "**/*.test.ts", "**/__tests__/**"]
}
```

#### 3.1.3 `core/typescript/tsconfig.legacy-14.json`

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "CommonJS",
    "moduleResolution": "Node",
    "outDir": "./dist-legacy-14",
    "declaration": true,
    "declarationDir": "./dist-legacy-14",
    "target": "ES2020",
    "lib": ["ES2020", "DOM"]
  },
  "exclude": ["node_modules", "dist", "dist-*", "**/*.test.ts", "**/__tests__/**"]
}
```

#### 3.1.4 `core/typescript/scripts/build-variants.sh`

```bash
#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$ROOT_DIR"

echo "=========================================="
echo "ARTK Core - Building All Variants"
echo "=========================================="

# Clean previous builds
echo ""
echo "[1/6] Cleaning previous builds..."
rm -rf dist dist-cjs dist-legacy-16 dist-legacy-14

# Build modern ESM (default)
echo ""
echo "[2/6] Building modern-esm variant (ES2022, ESM)..."
npx tsup --config tsup.config.ts
echo "  ✓ dist/ created"

# Build modern CJS
echo ""
echo "[3/6] Building modern-cjs variant (ES2022, CommonJS)..."
npx tsc -p tsconfig.cjs.json
# Rename .js to .cjs for explicit CommonJS
find dist-cjs -name "*.js" -type f | while read file; do
  mv "$file" "${file%.js}.cjs"
done
# Update internal imports to use .cjs extension
find dist-cjs -name "*.cjs" -type f -exec sed -i '' 's/from "\.\//from ".\//g; s/\.js"/\.cjs"/g' {} \;
echo "  ✓ dist-cjs/ created"

# Build legacy-16
echo ""
echo "[4/6] Building legacy-16 variant (ES2021, CommonJS, Playwright 1.49)..."
npx tsc -p tsconfig.legacy-16.json
find dist-legacy-16 -name "*.js" -type f | while read file; do
  mv "$file" "${file%.js}.cjs"
done
find dist-legacy-16 -name "*.cjs" -type f -exec sed -i '' 's/\.js"/\.cjs"/g' {} \;
echo "  ✓ dist-legacy-16/ created"

# Build legacy-14
echo ""
echo "[5/6] Building legacy-14 variant (ES2020, CommonJS, Playwright 1.33)..."
npx tsc -p tsconfig.legacy-14.json
find dist-legacy-14 -name "*.js" -type f | while read file; do
  mv "$file" "${file%.js}.cjs"
done
find dist-legacy-14 -name "*.cjs" -type f -exec sed -i '' 's/\.js"/\.cjs"/g' {} \;
echo "  ✓ dist-legacy-14/ created"

# Copy templates to all variants
echo ""
echo "[6/6] Copying templates to all variants..."
for dir in dist dist-cjs dist-legacy-16 dist-legacy-14; do
  if [ -d "templates" ]; then
    cp -r templates "$dir/"
  fi
done
echo "  ✓ Templates copied"

echo ""
echo "=========================================="
echo "Build Complete!"
echo "=========================================="
echo ""
echo "Variants built:"
echo "  - dist/           (modern-esm: Node 18+, ESM)"
echo "  - dist-cjs/       (modern-cjs: Node 18+, CommonJS)"
echo "  - dist-legacy-16/ (legacy-16: Node 16+, CommonJS)"
echo "  - dist-legacy-14/ (legacy-14: Node 14+, CommonJS)"
echo ""
```

#### 3.1.5 `core/typescript/scripts/build-variants.ps1`

```powershell
#Requires -Version 5.1
<#
.SYNOPSIS
    Builds all ARTK Core variants for different Node.js versions.
.DESCRIPTION
    Creates four distribution variants:
    - modern-esm (Node 18+, ESM)
    - modern-cjs (Node 18+, CommonJS)
    - legacy-16 (Node 16+, CommonJS, Playwright 1.49)
    - legacy-14 (Node 14+, CommonJS, Playwright 1.33)
#>

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir

Set-Location $RootDir

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "ARTK Core - Building All Variants" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Clean previous builds
Write-Host ""
Write-Host "[1/6] Cleaning previous builds..." -ForegroundColor Yellow
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue dist, dist-cjs, dist-legacy-16, dist-legacy-14

# Build modern ESM (default)
Write-Host ""
Write-Host "[2/6] Building modern-esm variant (ES2022, ESM)..." -ForegroundColor Yellow
npx tsup --config tsup.config.ts
if ($LASTEXITCODE -ne 0) { throw "ESM build failed" }
Write-Host "  ✓ dist/ created" -ForegroundColor Green

# Build modern CJS
Write-Host ""
Write-Host "[3/6] Building modern-cjs variant (ES2022, CommonJS)..." -ForegroundColor Yellow
npx tsc -p tsconfig.cjs.json
if ($LASTEXITCODE -ne 0) { throw "CJS build failed" }
# Rename .js to .cjs
Get-ChildItem -Path dist-cjs -Filter "*.js" -Recurse | ForEach-Object {
    $newName = $_.FullName -replace '\.js$', '.cjs'
    Rename-Item $_.FullName $newName
}
Write-Host "  ✓ dist-cjs/ created" -ForegroundColor Green

# Build legacy-16
Write-Host ""
Write-Host "[4/6] Building legacy-16 variant (ES2021, CommonJS)..." -ForegroundColor Yellow
npx tsc -p tsconfig.legacy-16.json
if ($LASTEXITCODE -ne 0) { throw "Legacy-16 build failed" }
Get-ChildItem -Path dist-legacy-16 -Filter "*.js" -Recurse | ForEach-Object {
    $newName = $_.FullName -replace '\.js$', '.cjs'
    Rename-Item $_.FullName $newName
}
Write-Host "  ✓ dist-legacy-16/ created" -ForegroundColor Green

# Build legacy-14
Write-Host ""
Write-Host "[5/6] Building legacy-14 variant (ES2020, CommonJS)..." -ForegroundColor Yellow
npx tsc -p tsconfig.legacy-14.json
if ($LASTEXITCODE -ne 0) { throw "Legacy-14 build failed" }
Get-ChildItem -Path dist-legacy-14 -Filter "*.js" -Recurse | ForEach-Object {
    $newName = $_.FullName -replace '\.js$', '.cjs'
    Rename-Item $_.FullName $newName
}
Write-Host "  ✓ dist-legacy-14/ created" -ForegroundColor Green

# Copy templates
Write-Host ""
Write-Host "[6/6] Copying templates to all variants..." -ForegroundColor Yellow
@("dist", "dist-cjs", "dist-legacy-16", "dist-legacy-14") | ForEach-Object {
    if (Test-Path "templates") {
        Copy-Item -Recurse -Force "templates" "$_/"
    }
}
Write-Host "  ✓ Templates copied" -ForegroundColor Green

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Build Complete!" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Variants built:"
Write-Host "  - dist/           (modern-esm: Node 18+, ESM)" -ForegroundColor White
Write-Host "  - dist-cjs/       (modern-cjs: Node 18+, CommonJS)" -ForegroundColor White
Write-Host "  - dist-legacy-16/ (legacy-16: Node 16+, CommonJS)" -ForegroundColor White
Write-Host "  - dist-legacy-14/ (legacy-14: Node 14+, CommonJS)" -ForegroundColor White
```

### 3.2 Variant-Specific package.json Files

#### 3.2.1 `core/typescript/package-legacy-16.json`

```json
{
  "name": "@artk/core",
  "version": "1.0.0",
  "description": "ARTK Core v1 - Legacy Node 16 variant",
  "main": "./dist/index.cjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    },
    "./config": {
      "require": "./dist/config/index.cjs",
      "types": "./dist/config/index.d.ts"
    },
    "./auth": {
      "require": "./dist/auth/index.cjs",
      "types": "./dist/auth/index.d.ts"
    },
    "./fixtures": {
      "require": "./dist/fixtures/index.cjs",
      "types": "./dist/fixtures/index.d.ts"
    },
    "./locators": {
      "require": "./dist/locators/index.cjs",
      "types": "./dist/locators/index.d.ts"
    },
    "./assertions": {
      "require": "./dist/assertions/index.cjs",
      "types": "./dist/assertions/index.d.ts"
    },
    "./grid": {
      "require": "./dist/grid/index.cjs",
      "types": "./dist/grid/index.d.ts"
    }
  },
  "dependencies": {
    "@playwright/test": "~1.49.0",
    "otplib": "^12.0.1",
    "yaml": "^2.3.4",
    "zod": "^3.22.4"
  },
  "engines": {
    "node": ">=16.0.0"
  },
  "_artk": {
    "variant": "legacy-16",
    "playwrightVersion": "1.49.x",
    "nodeRange": "16, 18, 20"
  }
}
```

#### 3.2.2 `core/typescript/package-legacy-14.json`

```json
{
  "name": "@artk/core",
  "version": "1.0.0",
  "description": "ARTK Core v1 - Legacy Node 14 variant",
  "main": "./dist/index.cjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    },
    "./config": {
      "require": "./dist/config/index.cjs",
      "types": "./dist/config/index.d.ts"
    },
    "./auth": {
      "require": "./dist/auth/index.cjs",
      "types": "./dist/auth/index.d.ts"
    },
    "./fixtures": {
      "require": "./dist/fixtures/index.cjs",
      "types": "./dist/fixtures/index.d.ts"
    },
    "./locators": {
      "require": "./dist/locators/index.cjs",
      "types": "./dist/locators/index.d.ts"
    },
    "./assertions": {
      "require": "./dist/assertions/index.cjs",
      "types": "./dist/assertions/index.d.ts"
    },
    "./grid": {
      "require": "./dist/grid/index.cjs",
      "types": "./dist/grid/index.d.ts"
    }
  },
  "dependencies": {
    "@playwright/test": "~1.33.0",
    "otplib": "^12.0.1",
    "yaml": "^2.3.4",
    "zod": "^3.22.4"
  },
  "engines": {
    "node": ">=14.0.0"
  },
  "_artk": {
    "variant": "legacy-14",
    "playwrightVersion": "1.33.x",
    "nodeRange": "14, 16, 18"
  }
}
```

### 3.3 Update Main package.json

Add conditional exports to `core/typescript/package.json`:

```json
{
  "name": "@artk/core",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist-cjs/index.cjs",
      "types": "./dist/index.d.ts"
    },
    "./config": {
      "import": "./dist/config/index.js",
      "require": "./dist-cjs/config/index.cjs",
      "types": "./dist/config/index.d.ts"
    }
    // ... other exports
  },
  "scripts": {
    "build": "npm run build:variants",
    "build:modern": "tsup --config tsup.config.ts",
    "build:variants": "bash scripts/build-variants.sh || powershell -File scripts/build-variants.ps1",
    "test:variants": "bash scripts/test-variants.sh"
  },
  "_artk": {
    "variant": "modern",
    "playwrightVersion": "1.57.x",
    "nodeRange": "18, 20, 22"
  }
}
```

---

## 4. Package.json Updates

### 4.1 Files to Modify

| File | Changes |
|------|---------|
| `core/typescript/package.json` | Add conditional exports, build scripts, `_artk` metadata |
| `cli/package.json` | Add variant selection logic dependencies |

### 4.2 New Build Scripts

Add to `core/typescript/package.json`:

```json
{
  "scripts": {
    "build": "npm run build:all",
    "build:all": "npm run build:modern && npm run build:cjs && npm run build:legacy-16 && npm run build:legacy-14",
    "build:modern": "tsup --config tsup.config.ts",
    "build:cjs": "tsc -p tsconfig.cjs.json && node scripts/rename-to-cjs.js dist-cjs",
    "build:legacy-16": "tsc -p tsconfig.legacy-16.json && node scripts/rename-to-cjs.js dist-legacy-16",
    "build:legacy-14": "tsc -p tsconfig.legacy-14.json && node scripts/rename-to-cjs.js dist-legacy-14",
    "build:variants": "bash scripts/build-variants.sh",
    "test:variants": "npm run test:variant:modern && npm run test:variant:legacy-16 && npm run test:variant:legacy-14",
    "test:variant:modern": "node --version && npm run test:unit",
    "test:variant:legacy-16": "echo 'Requires Node 16 environment'",
    "test:variant:legacy-14": "echo 'Requires Node 14 environment'"
  }
}
```

---

## 5. Bootstrap Script Updates

### 5.1 Files to Modify

| File | Purpose |
|------|---------|
| `scripts/bootstrap.sh` | Unix variant selection |
| `scripts/bootstrap.ps1` | Windows variant selection |

### 5.2 Variant Selection Logic

#### 5.2.1 Add to `scripts/bootstrap.sh`

Insert after line ~50 (after `ARTK_ROOT` detection):

```bash
# ============================================================
# VARIANT SELECTION
# ============================================================

detect_variant() {
    # Get Node.js major version
    local NODE_VERSION
    NODE_VERSION=$(node -v 2>/dev/null | sed 's/v//' | cut -d. -f1)

    if [ -z "$NODE_VERSION" ]; then
        echo "modern"  # Default if Node not found (will fail later anyway)
        return
    fi

    # Get project module type
    local PROJECT_TYPE="commonjs"
    if [ -f "$TARGET_PATH/package.json" ]; then
        PROJECT_TYPE=$(node -pe "try { JSON.parse(require('fs').readFileSync('$TARGET_PATH/package.json')).type || 'commonjs' } catch(e) { 'commonjs' }" 2>/dev/null)
    fi

    echo "  Node.js version: $NODE_VERSION" >&2
    echo "  Project type: $PROJECT_TYPE" >&2

    # Selection logic
    if [ "$NODE_VERSION" -lt 14 ]; then
        echo "ERROR: Node.js $NODE_VERSION is not supported. Minimum is Node 14." >&2
        exit 1
    elif [ "$NODE_VERSION" -lt 16 ]; then
        echo "legacy-14"
    elif [ "$NODE_VERSION" -lt 18 ]; then
        echo "legacy-16"
    else
        # Node 18+
        if [ "$PROJECT_TYPE" = "module" ]; then
            echo "modern-esm"
        else
            echo "modern-cjs"
        fi
    fi
}

copy_variant() {
    local VARIANT="$1"
    local SOURCE_DIR
    local PACKAGE_JSON

    case "$VARIANT" in
        "modern-esm")
            SOURCE_DIR="$ARTK_CORE_SOURCE/dist"
            PACKAGE_JSON="$ARTK_CORE_SOURCE/package.json"
            ;;
        "modern-cjs")
            SOURCE_DIR="$ARTK_CORE_SOURCE/dist-cjs"
            PACKAGE_JSON="$ARTK_CORE_SOURCE/package.json"
            ;;
        "legacy-16")
            SOURCE_DIR="$ARTK_CORE_SOURCE/dist-legacy-16"
            PACKAGE_JSON="$ARTK_CORE_SOURCE/package-legacy-16.json"
            ;;
        "legacy-14")
            SOURCE_DIR="$ARTK_CORE_SOURCE/dist-legacy-14"
            PACKAGE_JSON="$ARTK_CORE_SOURCE/package-legacy-14.json"
            ;;
        *)
            echo "ERROR: Unknown variant: $VARIANT" >&2
            exit 1
            ;;
    esac

    # Verify source exists
    if [ ! -d "$SOURCE_DIR" ]; then
        echo "ERROR: Variant '$VARIANT' not built. Run 'npm run build:variants' in ARTK repo first." >&2
        exit 1
    fi

    # Copy variant
    echo "  Copying $VARIANT variant..."
    mkdir -p "$ARTK_ROOT/vendor/artk-core/dist"
    cp -r "$SOURCE_DIR/"* "$ARTK_ROOT/vendor/artk-core/dist/"
    cp "$PACKAGE_JSON" "$ARTK_ROOT/vendor/artk-core/package.json"

    # Copy templates if they exist
    if [ -d "$ARTK_CORE_SOURCE/templates" ]; then
        cp -r "$ARTK_CORE_SOURCE/templates" "$ARTK_ROOT/vendor/artk-core/"
    fi

    echo "  ✓ Variant '$VARIANT' installed"
}

# Detect and install appropriate variant
echo ""
echo "Detecting appropriate variant..."
SELECTED_VARIANT=$(detect_variant)
echo "  Selected variant: $SELECTED_VARIANT"
copy_variant "$SELECTED_VARIANT"

# Store variant info in context
if [ -f "$ARTK_ROOT/.artk/context.json" ]; then
    # Update existing context
    node -e "
        const fs = require('fs');
        const ctx = JSON.parse(fs.readFileSync('$ARTK_ROOT/.artk/context.json'));
        ctx.variant = '$SELECTED_VARIANT';
        ctx.variantInstalledAt = new Date().toISOString();
        fs.writeFileSync('$ARTK_ROOT/.artk/context.json', JSON.stringify(ctx, null, 2));
    "
fi
```

#### 5.2.2 Add to `scripts/bootstrap.ps1`

Insert equivalent PowerShell logic:

```powershell
# ============================================================
# VARIANT SELECTION
# ============================================================

function Get-ArtkVariant {
    param([string]$TargetPath)

    # Get Node.js major version
    $nodeVersionRaw = node -v 2>$null
    if (-not $nodeVersionRaw) {
        Write-Warning "Node.js not found, defaulting to 'modern'"
        return "modern-cjs"
    }

    $nodeVersion = [int]($nodeVersionRaw -replace 'v(\d+)\..*', '$1')

    # Get project module type
    $projectType = "commonjs"
    $pkgPath = Join-Path $TargetPath "package.json"
    if (Test-Path $pkgPath) {
        try {
            $pkg = Get-Content $pkgPath -Raw | ConvertFrom-Json
            if ($pkg.type) { $projectType = $pkg.type }
        } catch {
            # Ignore parse errors
        }
    }

    Write-Host "  Node.js version: $nodeVersion" -ForegroundColor Gray
    Write-Host "  Project type: $projectType" -ForegroundColor Gray

    # Selection logic
    if ($nodeVersion -lt 14) {
        throw "Node.js $nodeVersion is not supported. Minimum is Node 14."
    } elseif ($nodeVersion -lt 16) {
        return "legacy-14"
    } elseif ($nodeVersion -lt 18) {
        return "legacy-16"
    } else {
        # Node 18+
        if ($projectType -eq "module") {
            return "modern-esm"
        } else {
            return "modern-cjs"
        }
    }
}

function Copy-ArtkVariant {
    param(
        [string]$Variant,
        [string]$ArtkCoreSource,
        [string]$ArtkRoot
    )

    $sourceDir = switch ($Variant) {
        "modern-esm"  { Join-Path $ArtkCoreSource "dist" }
        "modern-cjs"  { Join-Path $ArtkCoreSource "dist-cjs" }
        "legacy-16"   { Join-Path $ArtkCoreSource "dist-legacy-16" }
        "legacy-14"   { Join-Path $ArtkCoreSource "dist-legacy-14" }
        default       { throw "Unknown variant: $Variant" }
    }

    $packageJson = switch ($Variant) {
        "modern-esm"  { Join-Path $ArtkCoreSource "package.json" }
        "modern-cjs"  { Join-Path $ArtkCoreSource "package.json" }
        "legacy-16"   { Join-Path $ArtkCoreSource "package-legacy-16.json" }
        "legacy-14"   { Join-Path $ArtkCoreSource "package-legacy-14.json" }
    }

    # Verify source exists
    if (-not (Test-Path $sourceDir)) {
        throw "Variant '$Variant' not built. Run 'npm run build:variants' in ARTK repo first."
    }

    # Copy variant
    Write-Host "  Copying $Variant variant..." -ForegroundColor Yellow
    $destDir = Join-Path $ArtkRoot "vendor/artk-core/dist"
    New-Item -ItemType Directory -Force -Path $destDir | Out-Null
    Copy-Item -Path "$sourceDir/*" -Destination $destDir -Recurse -Force
    Copy-Item -Path $packageJson -Destination (Join-Path $ArtkRoot "vendor/artk-core/package.json") -Force

    # Copy templates
    $templatesDir = Join-Path $ArtkCoreSource "templates"
    if (Test-Path $templatesDir) {
        Copy-Item -Path $templatesDir -Destination (Join-Path $ArtkRoot "vendor/artk-core/") -Recurse -Force
    }

    Write-Host "  ✓ Variant '$Variant' installed" -ForegroundColor Green
}

# Main variant selection
Write-Host ""
Write-Host "Detecting appropriate variant..." -ForegroundColor Cyan
$SelectedVariant = Get-ArtkVariant -TargetPath $TargetPath
Write-Host "  Selected variant: $SelectedVariant" -ForegroundColor White
Copy-ArtkVariant -Variant $SelectedVariant -ArtkCoreSource $ArtkCoreSource -ArtkRoot $ArtkRoot
```

---

## 6. CLI Updates

### 6.1 Files to Modify

| File | Changes |
|------|---------|
| `cli/src/commands/init.ts` | Add variant selection |
| `cli/src/commands/doctor.ts` | Add variant compatibility check |
| `cli/src/commands/upgrade.ts` | Handle variant changes on upgrade |
| `cli/src/utils/variant-detector.ts` | New file for detection logic |

### 6.2 New File: `cli/src/utils/variant-detector.ts`

```typescript
import * as fs from 'fs';
import * as path from 'path';

export type ArtkVariant = 'modern-esm' | 'modern-cjs' | 'legacy-16' | 'legacy-14';

export interface VariantInfo {
  variant: ArtkVariant;
  nodeVersion: number;
  projectType: 'module' | 'commonjs';
  playwrightVersion: string;
}

export function detectVariant(targetPath: string): VariantInfo {
  // Get Node.js major version
  const nodeVersion = parseInt(process.version.slice(1).split('.')[0], 10);

  // Get project module type
  let projectType: 'module' | 'commonjs' = 'commonjs';
  const pkgPath = path.join(targetPath, 'package.json');

  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      projectType = pkg.type === 'module' ? 'module' : 'commonjs';
    } catch {
      // Ignore parse errors
    }
  }

  // Selection logic
  let variant: ArtkVariant;
  let playwrightVersion: string;

  if (nodeVersion < 14) {
    throw new Error(`Node.js ${nodeVersion} is not supported. Minimum is Node 14.`);
  } else if (nodeVersion < 16) {
    variant = 'legacy-14';
    playwrightVersion = '1.33.x';
  } else if (nodeVersion < 18) {
    variant = 'legacy-16';
    playwrightVersion = '1.49.x';
  } else {
    variant = projectType === 'module' ? 'modern-esm' : 'modern-cjs';
    playwrightVersion = '1.57.x';
  }

  return { variant, nodeVersion, projectType, playwrightVersion };
}

export function getVariantSourceDir(variant: ArtkVariant): string {
  switch (variant) {
    case 'modern-esm': return 'dist';
    case 'modern-cjs': return 'dist-cjs';
    case 'legacy-16': return 'dist-legacy-16';
    case 'legacy-14': return 'dist-legacy-14';
  }
}

export function getVariantPackageJson(variant: ArtkVariant): string {
  switch (variant) {
    case 'modern-esm': return 'package.json';
    case 'modern-cjs': return 'package.json';
    case 'legacy-16': return 'package-legacy-16.json';
    case 'legacy-14': return 'package-legacy-14.json';
  }
}
```

### 6.3 Update `cli/src/commands/init.ts`

Add variant selection to the init command:

```typescript
import { detectVariant, getVariantSourceDir, getVariantPackageJson } from '../utils/variant-detector';

// In the init function:
async function init(targetPath: string, options: InitOptions) {
  // ... existing code ...

  // Detect appropriate variant
  console.log('\nDetecting appropriate variant...');
  const variantInfo = detectVariant(targetPath);
  console.log(`  Node.js version: ${variantInfo.nodeVersion}`);
  console.log(`  Project type: ${variantInfo.projectType}`);
  console.log(`  Selected variant: ${variantInfo.variant}`);
  console.log(`  Playwright version: ${variantInfo.playwrightVersion}`);

  // Copy variant-specific files
  const sourceDir = getVariantSourceDir(variantInfo.variant);
  const packageJson = getVariantPackageJson(variantInfo.variant);

  // ... copy logic ...

  // Update context.json with variant info
  const contextPath = path.join(artkRoot, '.artk/context.json');
  const context = fs.existsSync(contextPath)
    ? JSON.parse(fs.readFileSync(contextPath, 'utf-8'))
    : {};

  context.variant = variantInfo.variant;
  context.variantInstalledAt = new Date().toISOString();
  context.nodeVersion = variantInfo.nodeVersion;
  context.playwrightVersion = variantInfo.playwrightVersion;

  fs.writeFileSync(contextPath, JSON.stringify(context, null, 2));
}
```

### 6.4 Add `--variant` Override Option

Allow users to force a specific variant:

```typescript
// In cli/src/commands/init.ts
interface InitOptions {
  // ... existing options ...
  variant?: 'modern-esm' | 'modern-cjs' | 'legacy-16' | 'legacy-14' | 'auto';
}

// Add to command definition
.option('--variant <type>', 'Force specific variant (auto, modern-esm, modern-cjs, legacy-16, legacy-14)', 'auto')

// In init function
const variantInfo = options.variant === 'auto'
  ? detectVariant(targetPath)
  : { variant: options.variant, /* ... */ };
```

---

## 7. Prompt Updates

### 7.1 Files to Modify

| File | Changes |
|------|---------|
| `prompts/artk.init-playbook.md` | Document variant selection |
| `CLAUDE.md` | Update installation instructions |
| `prompts/artk.discover-foundation.md` | Add variant-aware guidance |

### 7.2 Update `prompts/artk.init-playbook.md`

Add new section after Step 4 (Core Installation):

```markdown
### Step 4B) Variant Selection (Automatic)

ARTK automatically selects the appropriate variant based on the target project's environment:

| Detection | Result |
|-----------|--------|
| Node 18+ AND `"type": "module"` in package.json | `modern-esm` variant |
| Node 18+ AND no `"type": "module"` | `modern-cjs` variant |
| Node 16-17 | `legacy-16` variant (Playwright 1.49) |
| Node 14-15 | `legacy-14` variant (Playwright 1.33) |
| Node < 14 | ❌ Not supported |

**Variant stored in:** `.artk/context.json` → `variant` field

**To force a specific variant:**
```bash
artk init /path/to/project --variant legacy-16
```

**Variant capabilities:**

| Feature | modern | legacy-16 | legacy-14 |
|---------|--------|-----------|-----------|
| ESM imports | ✅ | ❌ | ❌ |
| Playwright ARIA snapshots | ✅ | ✅ | ❌ |
| Playwright Clock API | ✅ | ✅ | ❌ |
| AG Grid helpers | ✅ | ✅ | ✅ |
```

### 7.3 Update `CLAUDE.md`

Update the Quick Reference section:

```markdown
## Quick Reference: Install ARTK to a Client Project

### Using CLI (Recommended)

```bash
# Auto-detects Node version and selects appropriate variant
npx @artk/cli init /path/to/your-project

# Force specific variant (for testing or override)
npx @artk/cli init /path/to/project --variant legacy-16
```

**Variants:**
| Variant | Node.js | Playwright | Use Case |
|---------|---------|------------|----------|
| `modern-esm` | 18+ | 1.57 | New ESM projects |
| `modern-cjs` | 18+ | 1.57 | New CommonJS projects |
| `legacy-16` | 16+ | 1.49 | Legacy projects |
| `legacy-14` | 14+ | 1.33 | Very old projects |
```

---

## 8. Testing Strategy

### 8.1 Test Matrix

| Test Suite | modern-esm | modern-cjs | legacy-16 | legacy-14 |
|------------|------------|------------|-----------|-----------|
| Unit tests | ✅ | ✅ | ✅ | ✅ |
| Integration tests | ✅ | ✅ | ✅ | ✅ |
| E2E (real browser) | ✅ | ✅ | ✅ | ✅ |
| Import/require tests | ✅ | ✅ | ✅ | ✅ |
| TypeScript compilation | ✅ | ✅ | ✅ | ✅ |

### 8.2 New Test Files

#### 8.2.1 `core/typescript/tests/variants/variant-import.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';

const VARIANTS = ['dist', 'dist-cjs', 'dist-legacy-16', 'dist-legacy-14'];

describe('Variant Import Tests', () => {
  VARIANTS.forEach(variant => {
    describe(`${variant}`, () => {
      const variantPath = path.join(__dirname, '../../..', variant);

      it('should have index file', () => {
        const indexFile = fs.readdirSync(variantPath)
          .find(f => f.startsWith('index.'));
        expect(indexFile).toBeDefined();
      });

      it('should have all required submodules', () => {
        const requiredModules = ['config', 'auth', 'fixtures', 'locators', 'assertions'];
        requiredModules.forEach(mod => {
          const modPath = path.join(variantPath, mod);
          expect(fs.existsSync(modPath), `Missing ${mod} in ${variant}`).toBe(true);
        });
      });

      it('should have valid package.json reference', () => {
        // Variant-specific package.json check
        if (variant === 'dist-legacy-16') {
          expect(fs.existsSync(path.join(__dirname, '../../../package-legacy-16.json'))).toBe(true);
        } else if (variant === 'dist-legacy-14') {
          expect(fs.existsSync(path.join(__dirname, '../../../package-legacy-14.json'))).toBe(true);
        }
      });
    });
  });
});
```

#### 8.2.2 `core/typescript/scripts/test-variants.sh`

```bash
#!/bin/bash
set -e

echo "=========================================="
echo "ARTK Core - Testing All Variants"
echo "=========================================="

# Test modern variant with current Node
echo ""
echo "[1/4] Testing modern variant..."
npm run test:unit
echo "  ✓ Modern tests passed"

# For legacy variants, we need Docker or nvm
echo ""
echo "[2/4] Testing legacy-16 variant..."
if command -v nvm &> /dev/null; then
    nvm use 16 && npm run test:unit -- --config vitest.legacy-16.config.ts
    echo "  ✓ Legacy-16 tests passed"
else
    echo "  ⚠ Skipped (nvm not available - test in CI)"
fi

echo ""
echo "[3/4] Testing legacy-14 variant..."
if command -v nvm &> /dev/null; then
    nvm use 14 && npm run test:unit -- --config vitest.legacy-14.config.ts
    echo "  ✓ Legacy-14 tests passed"
else
    echo "  ⚠ Skipped (nvm not available - test in CI)"
fi

echo ""
echo "[4/4] Testing import compatibility..."
node scripts/test-imports.js
echo "  ✓ Import tests passed"

echo ""
echo "=========================================="
echo "All Variant Tests Complete!"
echo "=========================================="
```

### 8.3 Docker-based Testing

Create `core/typescript/docker/test-legacy.dockerfile`:

```dockerfile
# Test legacy-14 variant
FROM node:14-alpine AS test-legacy-14
WORKDIR /app
COPY dist-legacy-14 ./dist
COPY package-legacy-14.json ./package.json
COPY tests/variants ./tests
RUN npm install
RUN npm test

# Test legacy-16 variant
FROM node:16-alpine AS test-legacy-16
WORKDIR /app
COPY dist-legacy-16 ./dist
COPY package-legacy-16.json ./package.json
COPY tests/variants ./tests
RUN npm install
RUN npm test
```

---

## 9. CI/CD Pipeline

### 9.1 GitHub Actions Workflow

Create `.github/workflows/build-variants.yml`:

```yaml
name: Build & Test Variants

on:
  push:
    branches: [main]
    paths:
      - 'core/typescript/**'
  pull_request:
    branches: [main]
    paths:
      - 'core/typescript/**'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node 20
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: core/typescript/package-lock.json

      - name: Install dependencies
        working-directory: core/typescript
        run: npm ci

      - name: Build all variants
        working-directory: core/typescript
        run: npm run build:variants

      - name: Upload variants
        uses: actions/upload-artifact@v4
        with:
          name: artk-variants
          path: |
            core/typescript/dist
            core/typescript/dist-cjs
            core/typescript/dist-legacy-16
            core/typescript/dist-legacy-14
            core/typescript/package*.json

  test-modern:
    needs: build
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20, 22]
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}

      - name: Download variants
        uses: actions/download-artifact@v4
        with:
          name: artk-variants
          path: core/typescript

      - name: Install and test
        working-directory: core/typescript
        run: |
          npm ci
          npm run test:unit

  test-legacy-16:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node 16
        uses: actions/setup-node@v4
        with:
          node-version: '16'

      - name: Download variants
        uses: actions/download-artifact@v4
        with:
          name: artk-variants
          path: core/typescript

      - name: Test legacy-16 variant
        working-directory: core/typescript
        run: |
          npm ci
          node -e "require('./dist-legacy-16/index.cjs')"
          echo "✓ Import test passed"

  test-legacy-14:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node 14
        uses: actions/setup-node@v4
        with:
          node-version: '14'

      - name: Download variants
        uses: actions/download-artifact@v4
        with:
          name: artk-variants
          path: core/typescript

      - name: Test legacy-14 variant
        working-directory: core/typescript
        run: |
          npm ci
          node -e "require('./dist-legacy-14/index.cjs')"
          echo "✓ Import test passed"
```

---

## 10. Documentation Updates

### 10.1 Files to Create/Update

| File | Action |
|------|--------|
| `core/typescript/README.md` | Add variant documentation |
| `docs/COMPATIBILITY.md` | New file - full compatibility matrix |
| `docs/UPGRADING.md` | Add variant migration notes |

### 10.2 New File: `docs/COMPATIBILITY.md`

```markdown
# ARTK Compatibility Matrix

## Supported Environments

| Node.js | npm | Variant | Playwright | Status |
|---------|-----|---------|------------|--------|
| 22.x | 10.x | modern | 1.57.x | ✅ Full support |
| 20.x | 10.x | modern | 1.57.x | ✅ Full support |
| 18.x | 9.x/10.x | modern | 1.57.x | ✅ Full support |
| 16.x | 8.x | legacy-16 | 1.49.x | ⚠️ Limited support |
| 14.x | 6.x/7.x | legacy-14 | 1.33.x | ⚠️ Legacy support |
| < 14 | - | - | - | ❌ Not supported |

## Variant Feature Matrix

| Feature | modern | legacy-16 | legacy-14 |
|---------|--------|-----------|-----------|
| ESM imports | ✅ | ❌ | ❌ |
| CommonJS require | ✅ | ✅ | ✅ |
| TypeScript types | ✅ | ✅ | ✅ |
| ARIA snapshots | ✅ | ✅ | ❌ |
| Clock API | ✅ | ✅ | ❌ |
| Route from HAR | ✅ | ✅ | ✅ |
| AG Grid helpers | ✅ | ✅ | ✅ |
| LLKB (Lessons Learned) | ✅ | ✅ | ✅ |

## Automatic Variant Selection

ARTK CLI automatically selects the appropriate variant:

```bash
# Auto-detect
npx @artk/cli init /path/to/project

# Force specific variant
npx @artk/cli init /path/to/project --variant legacy-16
```

## Checking Installed Variant

```bash
# Using CLI
artk doctor /path/to/project

# Or check context.json
cat artk-e2e/.artk/context.json | jq .variant
```
```

---

## 11. Migration Guide

### 11.1 Migrating Existing Installations

For projects that were installed with the old single-variant approach:

```bash
# Check current state
artk doctor /path/to/project

# Upgrade to variant-aware installation
artk upgrade /path/to/project

# Force specific variant if needed
artk upgrade /path/to/project --variant legacy-16
```

### 11.2 Handling Variant Changes

If a project's Node.js version changes (e.g., upgrade from 16 to 20):

```bash
# Re-run init to get the appropriate variant
artk init /path/to/project --force
```

---

## 12. Implementation Phases

### Phase 1: Build System (4-6 hours)
**Priority: Critical**

| Task | Est. Time | Dependencies |
|------|-----------|--------------|
| Create `tsconfig.cjs.json` | 30 min | None |
| Create `tsconfig.legacy-16.json` | 30 min | None |
| Create `tsconfig.legacy-14.json` | 30 min | None |
| Create `build-variants.sh` | 1 hour | tsconfig files |
| Create `build-variants.ps1` | 1 hour | tsconfig files |
| Create `package-legacy-16.json` | 30 min | None |
| Create `package-legacy-14.json` | 30 min | None |
| Update main `package.json` | 30 min | All above |
| Test build locally | 1 hour | All above |

### Phase 2: Bootstrap Scripts (3-4 hours)
**Priority: Critical**

| Task | Est. Time | Dependencies |
|------|-----------|--------------|
| Add variant detection to `bootstrap.sh` | 1.5 hours | Phase 1 |
| Add variant detection to `bootstrap.ps1` | 1.5 hours | Phase 1 |
| Test on multiple Node versions | 1 hour | Above |

### Phase 3: CLI Updates (3-4 hours)
**Priority: High**

| Task | Est. Time | Dependencies |
|------|-----------|--------------|
| Create `variant-detector.ts` | 1 hour | None |
| Update `init.ts` | 1 hour | variant-detector |
| Update `doctor.ts` | 30 min | variant-detector |
| Update `upgrade.ts` | 30 min | variant-detector |
| Add `--variant` option | 30 min | All above |
| Test CLI commands | 30 min | All above |

### Phase 4: Testing Infrastructure (4-5 hours)
**Priority: High**

| Task | Est. Time | Dependencies |
|------|-----------|--------------|
| Create variant import tests | 1 hour | Phase 1 |
| Create `test-variants.sh` | 1 hour | Phase 1 |
| Create Docker test files | 1 hour | Phase 1 |
| Create GitHub Actions workflow | 1.5 hours | All above |
| Run full test matrix | 1 hour | All above |

### Phase 5: Documentation & Prompts (2-3 hours)
**Priority: Medium**

| Task | Est. Time | Dependencies |
|------|-----------|--------------|
| Update `CLAUDE.md` | 30 min | None |
| Update `artk.init-playbook.md` | 30 min | None |
| Create `docs/COMPATIBILITY.md` | 1 hour | None |
| Update `core/typescript/README.md` | 30 min | None |

### Phase 6: Validation (2-3 hours)
**Priority: Critical**

| Task | Est. Time | Dependencies |
|------|-----------|--------------|
| Test on Node 14 project | 30 min | All phases |
| Test on Node 16 project | 30 min | All phases |
| Test on Node 18 ESM project | 30 min | All phases |
| Test on Node 20 CJS project | 30 min | All phases |
| Fix any issues found | 1 hour | Above |

---

## 13. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Legacy Playwright API differences | Medium | High | Document breaking changes per variant |
| Build script fails on Windows | Low | Medium | Test on Windows early |
| TypeScript target causes runtime errors | Medium | High | Thorough testing on target Node versions |
| Variant detection incorrect | Low | Medium | Add `--variant` override option |
| CI matrix too slow | Medium | Low | Parallelize jobs, cache aggressively |
| Legacy projects have other incompatibilities | Medium | Medium | Document known limitations |

---

## 14. Rollback Plan

If issues are discovered after deployment:

1. **Immediate**: Revert to single-variant build
   ```bash
   git revert <commit-sha>
   ```

2. **Bootstrap scripts**: Old scripts don't break - they just copy modern variant

3. **CLI**: `--variant auto` falls back to modern variant if detection fails

4. **Existing installations**: Unaffected - only new installations use variants

---

---

## 15. Autogen Package Variants

The `@artk/core-autogen` package must also be built with the same variant strategy.

### 15.1 Autogen Variant Matrix

| Variant | Location | Playwright | Node.js |
|---------|----------|------------|---------|
| modern-esm | `autogen/dist/` | 1.57.x | 18+ |
| modern-cjs | `autogen/dist-cjs/` | 1.57.x | 18+ |
| legacy-16 | `autogen/dist-legacy-16/` | 1.49.x | 16+ |
| legacy-14 | `autogen/dist-legacy-14/` | 1.33.x | 14+ |

### 15.2 Files to Create for Autogen

| File | Purpose |
|------|---------|
| `core/typescript/autogen/tsconfig.cjs.json` | CommonJS build config |
| `core/typescript/autogen/tsconfig.legacy-16.json` | Legacy 16 config |
| `core/typescript/autogen/tsconfig.legacy-14.json` | Legacy 14 config |
| `core/typescript/autogen/package-legacy-16.json` | Legacy 16 package.json |
| `core/typescript/autogen/package-legacy-14.json` | Legacy 14 package.json |
| `core/typescript/autogen/scripts/build-variants.sh` | Build all variants |

### 15.3 Bootstrap Script Update for Autogen

The bootstrap scripts must copy BOTH packages with matching variants:

```bash
# In bootstrap.sh - add after core installation

# Copy autogen with same variant
echo "Installing @artk/core-autogen ($SELECTED_VARIANT)..."
AUTOGEN_SOURCE="$ARTK_REPO/core/typescript/autogen"
AUTOGEN_DEST="$ARTK_ROOT/vendor/artk-core-autogen"

case "$SELECTED_VARIANT" in
    "modern-esm")
        cp -r "$AUTOGEN_SOURCE/dist/"* "$AUTOGEN_DEST/dist/"
        cp "$AUTOGEN_SOURCE/package.json" "$AUTOGEN_DEST/"
        ;;
    "modern-cjs")
        cp -r "$AUTOGEN_SOURCE/dist-cjs/"* "$AUTOGEN_DEST/dist/"
        cp "$AUTOGEN_SOURCE/package.json" "$AUTOGEN_DEST/"
        ;;
    "legacy-16")
        cp -r "$AUTOGEN_SOURCE/dist-legacy-16/"* "$AUTOGEN_DEST/dist/"
        cp "$AUTOGEN_SOURCE/package-legacy-16.json" "$AUTOGEN_DEST/package.json"
        ;;
    "legacy-14")
        cp -r "$AUTOGEN_SOURCE/dist-legacy-14/"* "$AUTOGEN_DEST/dist/"
        cp "$AUTOGEN_SOURCE/package-legacy-14.json" "$AUTOGEN_DEST/package.json"
        ;;
esac
echo "  ✓ @artk/core-autogen installed"
```

---

## 16. AI Non-Modification Instructions

### 16.1 Problem Statement

AI agents (GitHub Copilot, Claude, etc.) have been modifying `vendor/artk-core/` and `vendor/artk-core-autogen/` files to fix compatibility issues. This is wrong - these packages should be **immutable** after installation.

### 16.2 Copilot Instructions Update

Add to `.github/copilot-instructions.md` template in `artk.init-playbook.md`:

```markdown
### CRITICAL: Immutable Vendor Packages

**NEVER modify files in these directories:**
- `vendor/artk-core/` - ARTK Core library (immutable)
- `vendor/artk-core-autogen/` - ARTK AutoGen library (immutable)

These packages are pre-built for your Node.js version and module system. If you encounter compatibility issues:

1. **DO NOT** edit files in `vendor/`
2. **DO NOT** add polyfills or patches to vendor code
3. **DO** report the issue to the ARTK team
4. **DO** check if the correct variant is installed: `cat .artk/context.json | jq .variant`
5. **DO** re-run `artk init --force` if variant is wrong

**Why:** The variant system ensures compatibility. Manual edits break this guarantee and cause cascading issues.
```

### 16.3 Add .ai-ignore File

Create `vendor/artk-core/.ai-ignore` and `vendor/artk-core-autogen/.ai-ignore`:

```
# AI agents should not modify files in this directory
# This package is pre-built for your Node.js version
#
# If you encounter issues:
# 1. Check variant: cat ../.artk/context.json
# 2. Re-install: artk init --force
# 3. Report bug: https://github.com/[repo]/issues
*
```

### 16.4 Add READONLY Marker Files

Create `vendor/artk-core/READONLY.md`:

```markdown
# ⚠️ DO NOT MODIFY THIS DIRECTORY

This directory contains the pre-built `@artk/core` library.

## For AI Agents (Copilot, Claude, etc.)

**You MUST NOT edit any files in this directory.**

If you encounter import errors, TypeScript errors, or runtime issues:

1. Check the installed variant: `cat ../.artk/context.json`
2. Verify Node.js version matches variant requirements
3. Re-run installation: `artk init /path/to/project --force`
4. Report the issue if problems persist

## Variant Information

This installation uses variant: `{VARIANT}`
- Node.js range: `{NODE_RANGE}`
- Playwright version: `{PLAYWRIGHT_VERSION}`
- Installed at: `{INSTALL_DATE}`

## Why Immutable?

The variant system pre-builds code for your specific Node.js version and module system.
Manual modifications break compatibility guarantees and cause cascading failures.
```

### 16.5 Update Bootstrap to Create Markers

Add to `bootstrap.sh` after variant installation:

```bash
# Create immutability markers
cat > "$ARTK_ROOT/vendor/artk-core/READONLY.md" << EOF
# ⚠️ DO NOT MODIFY THIS DIRECTORY

This directory contains the pre-built \`@artk/core\` library.

## For AI Agents (Copilot, Claude, etc.)

**You MUST NOT edit any files in this directory.**

If you encounter import errors, TypeScript errors, or runtime issues:

1. Check the installed variant: \`cat ../.artk/context.json\`
2. Verify Node.js version matches variant requirements
3. Re-run installation: \`artk init /path/to/project --force\`
4. Report the issue if problems persist

## Variant Information

- Variant: \`$SELECTED_VARIANT\`
- Installed at: \`$(date -Iseconds)\`
EOF

# Same for autogen
cp "$ARTK_ROOT/vendor/artk-core/READONLY.md" "$ARTK_ROOT/vendor/artk-core-autogen/"

# Create .ai-ignore files
echo "# AI agents must not modify this directory - see READONLY.md" > "$ARTK_ROOT/vendor/artk-core/.ai-ignore"
echo "*" >> "$ARTK_ROOT/vendor/artk-core/.ai-ignore"
cp "$ARTK_ROOT/vendor/artk-core/.ai-ignore" "$ARTK_ROOT/vendor/artk-core-autogen/"
```

### 16.6 Update Prompt Templates

#### Update `prompts/artk.init-playbook.md`

Add to the copilot-instructions template section:

```markdown
### Immutable Vendor Packages

**⚠️ CRITICAL: Never modify these directories:**

| Directory | Package | Status |
|-----------|---------|--------|
| `vendor/artk-core/` | @artk/core | 🔒 READONLY |
| `vendor/artk-core-autogen/` | @artk/core-autogen | 🔒 READONLY |

**If compatibility issues occur:**
1. Check variant: `cat .artk/context.json | jq .variant`
2. Re-install with correct variant: `artk init . --force`
3. Never patch vendor code manually

**Rationale:** These packages are pre-built for your Node.js version. Manual edits break the variant system and cause cascading failures.
```

#### Update `prompts/artk.discover-foundation.md`

Add warning near the top:

```markdown
## ⚠️ Immutable Packages Warning

Before making any changes, verify you are NOT modifying:
- `vendor/artk-core/` - Pre-built, do not edit
- `vendor/artk-core-autogen/` - Pre-built, do not edit

If you see errors from these packages, the solution is to re-install with the correct variant, NOT to patch the code.
```

### 16.7 Implementation Tasks for AI Instructions

| Task | Est. Time | File |
|------|-----------|------|
| Update copilot-instructions template | 30 min | `prompts/artk.init-playbook.md` |
| Add READONLY.md template | 15 min | `scripts/bootstrap.sh` |
| Add .ai-ignore creation | 15 min | `scripts/bootstrap.sh` |
| Update discover-foundation prompt | 15 min | `prompts/artk.discover-foundation.md` |
| Add warning to journey-implement | 15 min | `prompts/artk.journey-implement.md` |
| Test AI behavior with markers | 30 min | Manual testing |

---

## Summary

**Total Estimated Time:** 22-30 hours (updated with autogen + AI instructions)

**Files to Create:** 22 (including autogen variants)
**Files to Modify:** 12

**Key Deliverables:**
1. ✅ 4 build variants for @artk/core (modern-esm, modern-cjs, legacy-16, legacy-14)
2. ✅ 4 build variants for @artk/core-autogen (matching)
3. ✅ Automatic variant detection in bootstrap scripts
4. ✅ CLI variant selection with override option
5. ✅ Full test coverage for all variants
6. ✅ CI/CD pipeline for multi-Node testing
7. ✅ Updated documentation and prompts
8. ✅ AI non-modification instructions and markers

**Success Criteria:**
- `artk init` works on Node 14, 16, 18, 20, 22
- ESM and CJS projects both work without modification
- **No AI agent modification of installed code** (enforced by markers + instructions)
- All tests pass on all supported Node versions
- Both @artk/core and @artk/core-autogen use matching variants
