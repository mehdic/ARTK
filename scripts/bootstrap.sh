#!/bin/bash
#
# ARTK Bootstrap Script
# Usage: ./bootstrap.sh /path/to/target-project [options]
#
# Options:
#   --skip-npm                Skip npm install
#   --variant=<variant>       Force specific variant (modern-esm, modern-cjs, legacy-16, legacy-14)
#   --force-detect            Force environment re-detection
#   --skip-validation         Skip validation of generated code
#   --template-variant=<v>    Legacy option (use --variant instead)
#
# This is the ONLY script you need to run. It does everything:
# 1. Creates artk-e2e/ directory structure
# 2. Copies @artk/core to vendor/
# 3. Installs prompts to .github/prompts/
# 4. Creates package.json, playwright.config.ts, artk.config.yml
# 5. Runs npm install
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Get script location (ARTK repo)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ARTK_REPO="$(dirname "$SCRIPT_DIR")"
ARTK_CORE="$ARTK_REPO/core/typescript"
ARTK_PROMPTS="$ARTK_REPO/prompts"

# Helpers for Playwright browser cache
infer_github_repo() {
    local origin_url
    origin_url=$(git -C "$ARTK_REPO" remote get-url origin 2>/dev/null || true)
    if [ -z "$origin_url" ]; then
        return 1
    fi

    origin_url="${origin_url%.git}"
    if [[ "$origin_url" == git@github.com:* ]]; then
        echo "${origin_url#git@github.com:}"
        return 0
    fi

    if [[ "$origin_url" == https://github.com/* ]]; then
        echo "${origin_url#https://github.com/}"
        return 0
    fi

    if [[ "$origin_url" == http://github.com/* ]]; then
        echo "${origin_url#http://github.com/}"
        return 0
    fi

    return 1
}

detect_os_arch() {
    local os_name
    local arch_name

    case "$(uname -s)" in
        Darwin) os_name="macos" ;;
        Linux) os_name="linux" ;;
        *) os_name="unknown" ;;
    esac

    case "$(uname -m)" in
        x86_64|amd64) arch_name="x64" ;;
        arm64|aarch64) arch_name="arm64" ;;
        *) arch_name="unknown" ;;
    esac

    echo "$os_name" "$arch_name"
}

download_file() {
    local url="$1"
    local dest="$2"

    local timeout_sec="${ARTK_PLAYWRIGHT_BROWSERS_TIMEOUT_SEC:-30}"

    if command -v curl >/dev/null 2>&1; then
        curl -fsSL --max-time "$timeout_sec" "$url" -o "$dest"
        return $?
    fi

    if command -v wget >/dev/null 2>&1; then
        wget -q --timeout="$timeout_sec" --tries=1 "$url" -O "$dest"
        return $?
    fi

    return 1
}

sha256_file() {
    local file="$1"

    if command -v sha256sum >/dev/null 2>&1; then
        sha256sum "$file" | awk '{print $1}'
        return 0
    fi

    if command -v shasum >/dev/null 2>&1; then
        shasum -a 256 "$file" | awk '{print $1}'
        return 0
    fi

    return 1
}

download_playwright_browsers() {
    local browsers_path="$1"
    local repo="${ARTK_PLAYWRIGHT_BROWSERS_REPO:-}"

    if [ -z "$repo" ]; then
        repo="$(infer_github_repo || true)"
    fi

    if [ -z "$repo" ]; then
        echo -e "${YELLOW}Release repo not set; skipping Playwright browser cache download.${NC}"
        return 1
    fi

    local playwright_version_path="$ARTK_E2E/node_modules/@playwright/test/package.json"
    local playwright_core_path="$ARTK_E2E/node_modules/playwright-core/package.json"
    local browsers_json_path="$ARTK_E2E/node_modules/playwright-core/browsers.json"

    if [ ! -f "$browsers_json_path" ]; then
        echo -e "${YELLOW}Missing browsers.json; skipping Playwright browser cache download.${NC}"
        return 1
    fi

    local playwright_version=""
    if [ -f "$playwright_version_path" ]; then
        playwright_version=$(node -e "const pkg=require(process.argv[1]); console.log(pkg.version);" "$playwright_version_path" 2>/dev/null || true)
    elif [ -f "$playwright_core_path" ]; then
        playwright_version=$(node -e "const pkg=require(process.argv[1]); console.log(pkg.version);" "$playwright_core_path" 2>/dev/null || true)
    fi

    local chromium_rev
    chromium_rev=$(node -e "const fs=require('fs'); const data=JSON.parse(fs.readFileSync(process.argv[1],'utf8')); const chromium=data.browsers.find(b=>b.name==='chromium'); if (!chromium) process.exit(1); console.log(chromium.revision);" "$browsers_json_path" 2>/dev/null || true)

    if [ -z "$chromium_rev" ]; then
        echo -e "${YELLOW}Unable to determine Chromium revision; skipping Playwright browser cache download.${NC}"
        return 1
    fi

    local os_arch
    os_arch=$(detect_os_arch)
    local os_name
    local arch_name
    os_name=$(echo "$os_arch" | awk '{print $1}')
    arch_name=$(echo "$os_arch" | awk '{print $2}')

    if [ "$os_name" = "unknown" ] || [ "$arch_name" = "unknown" ]; then
        echo -e "${YELLOW}Unsupported OS/arch ($os_name/$arch_name); skipping Playwright browser cache download.${NC}"
        return 1
    fi

    local tag="${ARTK_PLAYWRIGHT_BROWSERS_TAG:-}"
    if [ -z "$tag" ] && [ -n "$playwright_version" ]; then
        tag="playwright-browsers-$playwright_version"
    fi

    if [ -z "$tag" ]; then
        echo -e "${YELLOW}Release tag not set; skipping Playwright browser cache download.${NC}"
        return 1
    fi

    local asset="chromium-$chromium_rev-$os_name-$arch_name.zip"
    local base_url="https://github.com/$repo/releases/download/$tag"
    local zip_path="$browsers_path/$asset"
    local sha_path="$zip_path.sha256"

    mkdir -p "$browsers_path"

    if [ -d "$browsers_path/chromium-$chromium_rev" ]; then
        echo -e "${CYAN}Playwright browsers already cached for revision $chromium_rev.${NC}"
        return 0
    fi

    echo -e "${YELLOW}Downloading Playwright browsers from release cache...${NC}"
    if ! download_file "$base_url/$asset" "$zip_path"; then
        echo -e "${YELLOW}Failed to download $asset${NC}"
        return 1
    fi

    if ! download_file "$base_url/$asset.sha256" "$sha_path"; then
        echo -e "${YELLOW}Failed to download $asset.sha256${NC}"
        return 1
    fi

    local expected_hash
    expected_hash=$(awk '{print $1}' "$sha_path" | tr -d '\r')
    local actual_hash
    actual_hash=$(sha256_file "$zip_path" || true)

    if [ -z "$expected_hash" ] || [ -z "$actual_hash" ] || [ "$expected_hash" != "$actual_hash" ]; then
        echo -e "${YELLOW}Playwright browser cache checksum mismatch.${NC}"
        return 1
    fi

    if command -v unzip >/dev/null 2>&1; then
        unzip -q "$zip_path" -d "$browsers_path" || return 1
    elif command -v bsdtar >/dev/null 2>&1; then
        bsdtar -xf "$zip_path" -C "$browsers_path" || return 1
    else
        echo -e "${YELLOW}unzip or bsdtar is required to extract Playwright browsers.${NC}"
        return 1
    fi

    rm -f "$zip_path" "$sha_path"
    return 0
}

is_ci_environment() {
    [ -n "$CI" ] || \
    [ -n "$GITHUB_ACTIONS" ] || \
    [ -n "$GITLAB_CI" ] || \
    [ -n "$JENKINS_HOME" ] || \
    [ -n "$CIRCLECI" ] || \
    [ -n "$TRAVIS" ] || \
    [ -n "$TF_BUILD" ] || \
    [ "$USER" = "jenkins" ] || \
    [ "$USER" = "gitlab-runner" ] || \
    [ "$USER" = "circleci" ]
}

detect_available_browser() {
    # Returns JSON: { "channel": "msedge|chrome|bundled", "version": "...", "path": "..." }

    local timeout_cmd=""
    if command -v timeout >/dev/null 2>&1; then
        timeout_cmd="timeout"
    elif command -v gtimeout >/dev/null 2>&1; then
        timeout_cmd="gtimeout"
    fi

    test_browser() {
        local browser_path="$1"
        local timeout_duration=5
        local version_output=""

        if [ ! -x "$browser_path" ] && ! command -v "$browser_path" >/dev/null 2>&1; then
            return 1
        fi

        local tmp_output
        tmp_output=$(mktemp)

        if [ -n "$timeout_cmd" ]; then
            if "$timeout_cmd" "$timeout_duration" "$browser_path" --version >"$tmp_output" 2>/dev/null; then
                version_output=$(cat "$tmp_output")
            fi
        else
            "$browser_path" --version >"$tmp_output" 2>/dev/null &
            local pid=$!
            local elapsed=0

            while kill -0 "$pid" 2>/dev/null; do
                if [ "$elapsed" -ge "$timeout_duration" ]; then
                    kill "$pid" 2>/dev/null || true
                    wait "$pid" 2>/dev/null || true
                    rm -f "$tmp_output"
                    return 1
                fi
                sleep 1
                elapsed=$((elapsed + 1))
            done

            wait "$pid" 2>/dev/null
            if [ $? -eq 0 ]; then
                version_output=$(cat "$tmp_output")
            fi
        fi

        rm -f "$tmp_output"

        if [ -n "$version_output" ]; then
            echo "$version_output"
            return 0
        fi
        return 1
    }

    local edge_paths=(
        "microsoft-edge"
        "microsoft-edge-stable"
        "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"
        "/snap/bin/microsoft-edge"
        "/var/lib/flatpak/exports/bin/com.microsoft.Edge"
    )

    for edge_path in "${edge_paths[@]}"; do
        local version
        version=$(test_browser "$edge_path")
        if [ $? -eq 0 ]; then
            local version_num
            version_num=$(echo "$version" | grep -oE '[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+' | head -1)
            echo "{\"channel\":\"msedge\",\"version\":\"$version_num\",\"path\":\"$edge_path\"}"
            return 0
        fi
    done

    local chrome_paths=(
        "google-chrome"
        "google-chrome-stable"
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
        "/usr/bin/google-chrome-stable"
        "/snap/bin/chromium"
        "/var/lib/flatpak/exports/bin/com.google.Chrome"
        "/usr/local/bin/chrome"
    )

    for chrome_path in "${chrome_paths[@]}"; do
        local version
        version=$(test_browser "$chrome_path")
        if [ $? -eq 0 ]; then
            local version_num
            version_num=$(echo "$version" | grep -oE '[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+' | head -1)
            echo "{\"channel\":\"chrome\",\"version\":\"$version_num\",\"path\":\"$chrome_path\"}"
            return 0
        fi
    done

    echo "{\"channel\":\"bundled\",\"version\":null,\"path\":null}"
    return 0
}

ensure_artk_config_has_browsers_section() {
        local config_path="$1"
        local channel="${2:-bundled}"
        local strategy="${3:-auto}"

        [ -f "$config_path" ] || return 0

        if grep -Eq '^[[:space:]]*browsers[[:space:]]*:' "$config_path"; then
                return 0
        fi

        cat >> "$config_path" <<EOF

browsers:
    enabled:
        - chromium
    channel: $channel
    strategy: $strategy
    viewport:
        width: 1280
        height: 720
    headless: true
EOF
}

set_artk_config_browsers_channel() {
        local config_path="$1"
        local channel="$2"

        [ -f "$config_path" ] || return 1
        grep -Eq '^[[:space:]]*browsers[[:space:]]*:' "$config_path" || return 1

        # Replace the first "channel:" line that appears under the browsers block.
        # This is a pragmatic approach; config is generated by ARTK templates.
        awk -v new_channel="$channel" '
                BEGIN{in_browsers=0; updated=0}
                /^[[:space:]]*browsers[[:space:]]*:/ {in_browsers=1; print; next}
                in_browsers && /^[^[:space:]]/ {in_browsers=0}
                in_browsers && !updated && /^[[:space:]]*channel[[:space:]]*:/ {sub(/:.*/, ": " new_channel); updated=1; print; next}
                {print}
        ' "$config_path" > "$config_path.bak" && mv "$config_path.bak" "$config_path"

        return 0
}

log_browser_metadata() {
    local browser_info="$1"
    local context_file="$TARGET_PROJECT/.artk/context.json"

    local channel
    channel=$(echo "$browser_info" | sed -n 's/.*"channel":"\([^"]*\)".*/\1/p' | head -1)
    local version
    version=$(echo "$browser_info" | sed -n 's/.*"version":"\([^"]*\)".*/\1/p' | head -1)
    local path
    path=$(echo "$browser_info" | sed -n 's/.*"path":"\([^"]*\)".*/\1/p' | head -1)

    local context="{}"
    if [ -f "$context_file" ]; then
        context=$(cat "$context_file")
    fi

    if command -v jq >/dev/null 2>&1; then
        echo "$context" | jq \
            --arg channel "$channel" \
            --arg version "$version" \
            --arg path "$path" \
            --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
            '.browser = {channel: $channel, version: $version, path: $path, detected_at: $timestamp}' \
            > "$context_file"
    else
        cat > "$context_file" <<EOF
{
  "version": "1.0",
  "browser": {
    "channel": "$channel",
    "version": "$version",
    "path": "$path",
    "detected_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  }
}
EOF
    fi
}

# Multi-variant support: Valid variant IDs
VALID_VARIANTS=("modern-esm" "modern-cjs" "legacy-16" "legacy-14")

validate_variant() {
    local variant="$1"
    for v in "${VALID_VARIANTS[@]}"; do
        if [ "$v" = "$variant" ]; then
            return 0
        fi
    done
    return 1
}

get_node_major_version() {
    node -e "console.log(process.version.slice(1).split('.')[0])" 2>/dev/null || echo "0"
}

detect_module_system() {
    local project_path="$1"
    local pkg_json="$project_path/package.json"

    if [ -f "$pkg_json" ]; then
        local type_field
        type_field=$(node -e "const p=require('$pkg_json'); console.log(p.type || '')" 2>/dev/null || echo "")
        if [ "$type_field" = "module" ]; then
            echo "esm"
            return
        fi
    fi
    echo "cjs"
}

select_variant() {
    local node_major="$1"
    local module_system="$2"

    if [ "$node_major" -ge 18 ]; then
        if [ "$module_system" = "esm" ]; then
            echo "modern-esm"
        else
            echo "modern-cjs"
        fi
    elif [ "$node_major" -ge 16 ]; then
        echo "legacy-16"
    elif [ "$node_major" -ge 14 ]; then
        echo "legacy-14"
    else
        echo ""
    fi
}

get_variant_dist_dir() {
    local variant="$1"
    case "$variant" in
        modern-esm) echo "dist" ;;
        modern-cjs) echo "dist-cjs" ;;
        legacy-16) echo "dist-legacy-16" ;;
        legacy-14) echo "dist-legacy-14" ;;
        *) echo "dist" ;;
    esac
}

get_variant_playwright_version() {
    local variant="$1"
    case "$variant" in
        modern-esm|modern-cjs) echo "1.57.x" ;;
        legacy-16) echo "1.49.x" ;;
        legacy-14) echo "1.33.x" ;;
        *) echo "1.57.x" ;;
    esac
}

# Parse arguments
TARGET=""
SKIP_NPM=false
FORCE_DETECT=false
SKIP_VALIDATION=false
TEMPLATE_VARIANT=""
FORCED_VARIANT=""

for arg in "$@"; do
    case $arg in
        --skip-npm)
            SKIP_NPM=true
            ;;
        --force-detect)
            FORCE_DETECT=true
            ;;
        --skip-validation)
            SKIP_VALIDATION=true
            ;;
        --variant=*)
            FORCED_VARIANT="${arg#*=}"
            if ! validate_variant "$FORCED_VARIANT"; then
                echo -e "${RED}Error: Invalid variant '$FORCED_VARIANT'${NC}"
                echo ""
                echo "Valid variants:"
                for v in "${VALID_VARIANTS[@]}"; do
                    echo "  - $v"
                done
                exit 1
            fi
            ;;
        --template-variant=*)
            # Legacy option - map to new variant system
            TEMPLATE_VARIANT="${arg#*=}"
            echo -e "${YELLOW}Warning: --template-variant is deprecated. Use --variant instead.${NC}"
            ;;
        *)
            if [ -z "$TARGET" ]; then
                TARGET="$arg"
            fi
            ;;
    esac
done

if [ -z "$TARGET" ]; then
    echo -e "${RED}Error: Target project path required${NC}"
    echo ""
    echo "Usage: $0 /path/to/target-project [options]"
    echo ""
    echo "Options:"
    echo "  --skip-npm                    Skip npm install"
    echo "  --variant=<variant>           Force specific variant (overrides auto-detection)"
    echo "  --force-detect                Force environment re-detection"
    echo "  --skip-validation             Skip validation of generated code"
    echo ""
    echo "Available variants:"
    echo "  modern-esm   Node 18+, ESM, Playwright 1.57.x"
    echo "  modern-cjs   Node 18+, CJS, Playwright 1.57.x"
    echo "  legacy-16    Node 16+, CJS, Playwright 1.49.x"
    echo "  legacy-14    Node 14+, CJS, Playwright 1.33.x"
    echo ""
    echo "Examples:"
    echo "  $0 ~/projects/my-app"
    echo "  $0 . --skip-npm"
    echo "  $0 ~/projects/legacy --variant=legacy-16"
    echo "  $0 ~/projects/existing --force-detect"
    exit 1
fi

TARGET_PROJECT="$(cd "$TARGET" 2>/dev/null && pwd)" || {
    echo -e "${RED}Error: Target directory does not exist: $TARGET${NC}"
    exit 1
}

ARTK_E2E="$TARGET_PROJECT/artk-e2e"

echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║       ARTK Bootstrap Installation          ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
echo ""
echo "ARTK Source: $ARTK_REPO"
echo "Target:      $TARGET_PROJECT"
echo ""

# Early variant detection (needed for correct dist directory)
SELECTED_VARIANT=""
OVERRIDE_USED="false"
NODE_MAJOR=$(get_node_major_version)
MODULE_SYSTEM=$(detect_module_system "$TARGET_PROJECT")

# Check Node.js version first
if [ "$NODE_MAJOR" -lt 14 ]; then
    echo -e "${RED}Error: Node.js $NODE_MAJOR is not supported. ARTK requires Node.js 14 or higher.${NC}"
    exit 1
fi

if [ -n "$FORCED_VARIANT" ]; then
    SELECTED_VARIANT="$FORCED_VARIANT"
    OVERRIDE_USED="true"
    echo -e "${CYAN}Using forced variant: $SELECTED_VARIANT${NC}"
elif [ -n "$TEMPLATE_VARIANT" ]; then
    case "$TEMPLATE_VARIANT" in
        esm) SELECTED_VARIANT="modern-esm" ;;
        commonjs|cjs) SELECTED_VARIANT="modern-cjs" ;;
        *) SELECTED_VARIANT=$(select_variant "$NODE_MAJOR" "$MODULE_SYSTEM") ;;
    esac
elif [ -f "$TARGET_PROJECT/.artk/context.json" ] && [ "$FORCE_DETECT" != true ]; then
    SELECTED_VARIANT=$(grep -o '"variant":"[^"]*"' "$TARGET_PROJECT/.artk/context.json" | cut -d'"' -f4 || echo "")
    if [ -z "$SELECTED_VARIANT" ]; then
        SELECTED_VARIANT=$(select_variant "$NODE_MAJOR" "$MODULE_SYSTEM")
    fi
else
    SELECTED_VARIANT=$(select_variant "$NODE_MAJOR" "$MODULE_SYSTEM")
fi

if [ -z "$SELECTED_VARIANT" ]; then
    SELECTED_VARIANT="modern-cjs"
fi

VARIANT_DIST_DIR=$(get_variant_dist_dir "$SELECTED_VARIANT")
VARIANT_PW_VERSION=$(get_variant_playwright_version "$SELECTED_VARIANT")

echo -e "${CYAN}Environment: Node $NODE_MAJOR, $MODULE_SYSTEM${NC}"
echo -e "${CYAN}Variant:     $SELECTED_VARIANT (Playwright $VARIANT_PW_VERSION)${NC}"
echo ""

# Step 1: Build @artk/core if needed
if [ ! -d "$ARTK_CORE/dist" ]; then
    echo -e "${YELLOW}[1/7] Building @artk/core...${NC}"
    cd "$ARTK_CORE"
    npm install
    npm run build
else
    echo -e "${CYAN}[1/7] @artk/core already built ✓${NC}"
fi

# Step 2: Create artk-e2e structure
echo -e "${YELLOW}[2/7] Creating artk-e2e/ structure...${NC}"
mkdir -p "$ARTK_E2E"/{vendor/artk-core,vendor/artk-core-autogen,docs,journeys,.auth-states}
mkdir -p "$ARTK_E2E"/reports/{discovery,testid,validation,verification}

# Create foundation module structure (discover-foundation expects this)
mkdir -p "$ARTK_E2E"/src/modules/foundation/{auth,navigation,selectors,data}
mkdir -p "$ARTK_E2E"/src/modules/features
mkdir -p "$ARTK_E2E"/config
mkdir -p "$ARTK_E2E"/tests/{setup,foundation,smoke,release,regression,journeys}

# Create foundation index stub
cat > "$ARTK_E2E/src/modules/foundation/index.ts" << 'FOUNDATIONINDEX'
/**
 * Foundation Modules - Core testing infrastructure
 *
 * These modules are populated by /artk.discover-foundation and provide:
 * - Auth: Login flows and storage state management
 * - Navigation: Route helpers and URL builders
 * - Selectors: Locator utilities and data-testid helpers
 * - Data: Test data builders and cleanup
 */

// Exports will be populated by /artk.discover-foundation
export * from './auth';
export * from './navigation';
export * from './selectors';
export * from './data';
FOUNDATIONINDEX

# Create module stubs to prevent import errors
for module in auth navigation selectors data; do
    cat > "$ARTK_E2E/src/modules/foundation/$module/index.ts" << MODULESTUB
/**
 * Foundation Module: $module
 *
 * This file will be populated by /artk.discover-foundation
 */

// Placeholder export to prevent import errors
export {};
MODULESTUB
done

# Create features index stub
cat > "$ARTK_E2E/src/modules/features/index.ts" << 'FEATURESINDEX'
/**
 * Feature Modules - Journey-specific page objects
 *
 * These modules are created as Journeys are implemented and provide
 * page objects and flows for specific feature areas.
 */

// Exports will be added as features are implemented
export {};
FEATURESINDEX

# Create config env stub
cat > "$ARTK_E2E/config/env.ts" << 'CONFIGENV'
/**
 * Environment Configuration Loader
 *
 * Loads environment-specific config from artk.config.yml
 * This stub is replaced by /artk.discover-foundation with project-specific config.
 */
import * as fs from 'fs';
import * as path from 'path';

export interface EnvironmentConfig {
  name: string;
  baseUrl: string;
}

/**
 * Get base URL for the specified environment
 */
export function getBaseUrl(env?: string): string {
  const targetEnv = env || process.env.ARTK_ENV || 'local';

  // Try to load from artk.config.yml
  const configPath = path.join(__dirname, '..', 'artk.config.yml');
  if (fs.existsSync(configPath)) {
    const yaml = require('yaml');
    const config = yaml.parse(fs.readFileSync(configPath, 'utf8'));
    return config.environments?.[targetEnv]?.baseUrl || 'http://localhost:3000';
  }

  // Fallback defaults
  const defaults: Record<string, string> = {
    local: 'http://localhost:3000',
    intg: 'https://intg.example.com',
    ctlq: 'https://ctlq.example.com',
    prod: 'https://example.com',
  };

  return defaults[targetEnv] || defaults.local;
}

/**
 * Get the current environment name
 */
export function getCurrentEnv(): string {
  return process.env.ARTK_ENV || 'local';
}
CONFIGENV

# Create test tier stubs
for tier in smoke release regression; do
    cat > "$ARTK_E2E/tests/$tier/.gitkeep" << TIERSTUB
# $tier tier tests
# Tests in this directory should be tagged with @$tier
TIERSTUB
done

echo -e "${CYAN}  ✓ Created foundation module structure${NC}"

# Step 3: Copy @artk/core to vendor (using variant-specific dist)
echo -e "${YELLOW}[3/7] Installing @artk/core ($SELECTED_VARIANT) to vendor/...${NC}"

# Check if variant dist exists, fall back to default dist
VARIANT_DIST_PATH="$ARTK_CORE/$VARIANT_DIST_DIR"
if [ ! -d "$VARIANT_DIST_PATH" ]; then
    echo -e "${YELLOW}Warning: Variant dist directory not found: $VARIANT_DIST_PATH${NC}"
    if [ -d "$ARTK_CORE/dist" ]; then
        echo -e "${YELLOW}Falling back to default dist directory${NC}"
        VARIANT_DIST_PATH="$ARTK_CORE/dist"
    else
        echo -e "${RED}Error: No dist directory found. Build @artk/core first:${NC}"
        echo "  cd $ARTK_CORE && npm install && npm run build:variants"
        exit 1
    fi
fi

cp -r "$VARIANT_DIST_PATH"/* "$ARTK_E2E/vendor/artk-core/dist/" 2>/dev/null || cp -r "$VARIANT_DIST_PATH" "$ARTK_E2E/vendor/artk-core/dist"
cp "$ARTK_CORE/package.json" "$ARTK_E2E/vendor/artk-core/"
cp "$ARTK_CORE/version.json" "$ARTK_E2E/vendor/artk-core/" 2>/dev/null || true
cp "$ARTK_CORE/README.md" "$ARTK_E2E/vendor/artk-core/" 2>/dev/null || true

# Add AI protection markers
echo -e "${CYAN}  Adding AI protection markers...${NC}"

# READONLY.md
cat > "$ARTK_E2E/vendor/artk-core/READONLY.md" << READONLYEOF
# ⚠️ DO NOT MODIFY THIS DIRECTORY

## Variant Information

| Property | Value |
|----------|-------|
| **Variant** | $SELECTED_VARIANT |
| **Node.js Version** | $NODE_MAJOR |
| **Playwright Version** | $VARIANT_PW_VERSION |
| **Module System** | $MODULE_SYSTEM |
| **Installed At** | $(date -Iseconds) |
| **Install Method** | bootstrap.sh |

**DO NOT modify files in this directory.**

If you need different functionality:
1. Check if the correct variant is installed: \`cat .artk/context.json | jq .variant\`
2. Reinstall with correct variant: \`artk init --force\`
3. Check feature availability: \`cat vendor/artk-core/variant-features.json\`

---

*Generated by ARTK Bootstrap v1.0.0*
READONLYEOF

# .ai-ignore
cat > "$ARTK_E2E/vendor/artk-core/.ai-ignore" << AIIGNOREEOF
# AI agents should not modify files in this directory
# This is vendored code managed by ARTK CLI

*
AIIGNOREEOF

# variant-features.json
cat > "$ARTK_E2E/vendor/artk-core/variant-features.json" << FEATURESEOF
{
  "variant": "$SELECTED_VARIANT",
  "playwrightVersion": "$VARIANT_PW_VERSION",
  "nodeVersion": $NODE_MAJOR,
  "moduleSystem": "$MODULE_SYSTEM",
  "generatedAt": "$(date -Iseconds)",
  "features": {
    "route_from_har": { "available": true },
    "locator_filter": { "available": true },
    "web_first_assertions": { "available": true },
    "trace_viewer": { "available": true },
    "api_testing": { "available": true }
  }
}
FEATURESEOF

echo -e "${YELLOW}[3/7] Installing @artk/core-autogen to vendor/...${NC}"
if [ ! -d "$ARTK_CORE/autogen/dist" ]; then
    echo -e "${RED}Error: Missing @artk/core-autogen dist output at $ARTK_CORE/autogen/dist${NC}"
    echo -e "${YELLOW}Build it first (from ARTK repo):${NC}"
    echo "  cd $ARTK_CORE/autogen && npm install && npm run build"
    exit 1
fi
cp -r "$ARTK_CORE/autogen/dist" "$ARTK_E2E/vendor/artk-core-autogen/"
cp "$ARTK_CORE/autogen/package.json" "$ARTK_E2E/vendor/artk-core-autogen/"
cp "$ARTK_CORE/autogen/README.md" "$ARTK_E2E/vendor/artk-core-autogen/" 2>/dev/null || true

# Step 4: Install prompts
echo -e "${YELLOW}[4/7] Installing prompts to .github/prompts/...${NC}"
PROMPTS_TARGET="$TARGET_PROJECT/.github/prompts"
mkdir -p "$PROMPTS_TARGET"

for file in "$ARTK_PROMPTS"/artk.*.md; do
    if [ -f "$file" ]; then
        filename=$(basename "$file")
        newname="${filename%.md}.prompt.md"
        cp "$file" "$PROMPTS_TARGET/$newname"
    fi
done

COMMON_PROMPTS_SOURCE="$ARTK_PROMPTS/common"
COMMON_PROMPTS_TARGET="$PROMPTS_TARGET/common"
if [ -d "$COMMON_PROMPTS_SOURCE" ]; then
    mkdir -p "$COMMON_PROMPTS_TARGET"
    cp "$COMMON_PROMPTS_SOURCE"/GENERAL_RULES.md "$COMMON_PROMPTS_TARGET/" 2>/dev/null || true
fi

write_artk_config() {
    local project_name="$1"
    local channel="${2:-bundled}"
    local strategy="${3:-auto}"
    local timestamp
    timestamp=$(date -Iseconds)

    cat > "$ARTK_E2E/artk.config.yml" << 'ARTKCONFIG'
# ARTK Configuration
# Generated by bootstrap.sh on __TIMESTAMP__

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
  channel: __CHANNEL__
  strategy: __STRATEGY__
  viewport:
    width: 1280
    height: 720
  headless: true
ARTKCONFIG

    # Perform safe substitutions
    sed -i.bak \
        -e "s|__TIMESTAMP__|${timestamp}|g" \
        -e "s|__PROJECT_NAME__|${project_name}|g" \
        -e "s|__CHANNEL__|${channel}|g" \
        -e "s|__STRATEGY__|${strategy}|g" \
        "$ARTK_E2E/artk.config.yml"
    rm -f "$ARTK_E2E/artk.config.yml.bak"
}

# Step 5: Create configuration files
echo -e "${YELLOW}[5/7] Creating configuration files...${NC}"

# Detect project name from target directory
PROJECT_NAME=$(basename "$TARGET_PROJECT")

CONFIG_GENERATED=false

# package.json
cat > "$ARTK_E2E/package.json" << 'PKGJSON'
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
PKGJSON

# playwright.config.ts - Uses inline config for reliability with vendored packages
cat > "$ARTK_E2E/playwright.config.ts" << 'PWCONFIG'
/**
 * Playwright Configuration for ARTK E2E Tests
 *
 * Note: Uses inline config loading to avoid ESM/CommonJS resolution issues
 * with vendored @artk/core packages.
 */
import { defineConfig, devices } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// Load ARTK config from artk.config.yml
function loadArtkConfig(): Record<string, any> {
  const configPath = path.join(__dirname, 'artk.config.yml');
  if (!fs.existsSync(configPath)) {
    console.warn(`ARTK config not found: ${configPath}, using defaults`);
    return { environments: { local: { baseUrl: 'http://localhost:3000' } } };
  }

  // Use dynamic require for yaml to avoid ESM issues
  const yaml = require('yaml');
  return yaml.parse(fs.readFileSync(configPath, 'utf8'));
}

const artkConfig = loadArtkConfig();
const env = process.env.ARTK_ENV || 'local';
const baseURL = artkConfig.environments?.[env]?.baseUrl || 'http://localhost:3000';
const browserChannel = artkConfig.browsers?.channel;

// Build browser use config
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
    // Auth setup project - runs first to create storage states
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    // Main browser project with auth dependency
    {
      name: 'chromium',
      use: browserUse,
      dependencies: ['setup'],
    },
    // Validation project - no auth needed
    {
      name: 'validation',
      testMatch: /foundation\.validation\.spec\.ts/,
      use: browserUse,
    },
  ],
});
PWCONFIG

# tsconfig.json - Use CommonJS for Playwright compatibility
cat > "$ARTK_E2E/tsconfig.json" << 'TSCONFIG'
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
  "include": ["tests/**/*", "src/**/*", "config/**/*", "*.ts"],
  "exclude": ["node_modules", "dist", "vendor"]
}
TSCONFIG

# artk.config.yml
if [ -f "$ARTK_E2E/artk.config.yml" ]; then
    if ! grep -Eq '^[[:space:]]*browsers[[:space:]]*:' "$ARTK_E2E/artk.config.yml"; then
        echo -e "${YELLOW}artk.config.yml exists but browsers config is missing - adding browsers section${NC}"
        ensure_artk_config_has_browsers_section "$ARTK_E2E/artk.config.yml" "${ARTK_BROWSER_CHANNEL:-bundled}" "${ARTK_BROWSER_STRATEGY:-auto}"
    else
        echo -e "${CYAN}artk.config.yml already exists - preserving existing configuration${NC}"
    fi
else
    write_artk_config "$PROJECT_NAME" "${ARTK_BROWSER_CHANNEL:-bundled}" "${ARTK_BROWSER_STRATEGY:-auto}"
    CONFIG_GENERATED=true
fi

# Create context file (variant already detected at script start)
mkdir -p "$TARGET_PROJECT/.artk"

# Map variant to legacy templateVariant for backwards compatibility
TEMPLATE_MODULE_SYSTEM="commonjs"
if [ "$SELECTED_VARIANT" = "modern-esm" ]; then
    TEMPLATE_MODULE_SYSTEM="esm"
fi

cat > "$TARGET_PROJECT/.artk/context.json" << CONTEXT
{
  "version": "1.0",
  "variant": "$SELECTED_VARIANT",
  "variantInstalledAt": "$(date -Iseconds)",
  "nodeVersion": $NODE_MAJOR,
  "moduleSystem": "$MODULE_SYSTEM",
  "playwrightVersion": "$VARIANT_PW_VERSION",
  "artkVersion": "1.0.0",
  "installMethod": "bootstrap",
  "overrideUsed": $OVERRIDE_USED,
  "projectRoot": "$TARGET_PROJECT",
  "artkRoot": "$ARTK_E2E",
  "bootstrap_script": "$SCRIPT_DIR/bootstrap.sh",
  "artk_repo": "$ARTK_REPO",
  "templateVariant": "$TEMPLATE_MODULE_SYSTEM",
  "next_suggested": "/artk.init-playbook"
}
CONTEXT

# Generate foundation modules from templates
echo -e "${YELLOW}[5.5/7] Generating foundation modules...${NC}"

GENERATION_SCRIPT="$ARTK_CORE/scripts/generate-foundation.ts"

if [ ! -f "$GENERATION_SCRIPT" ]; then
    echo -e "${YELLOW}⚠️  Generation script not found, skipping foundation module generation${NC}"
    echo -e "${YELLOW}   Expected: $GENERATION_SCRIPT${NC}"
else
    # Check if Node.js is available
    if ! command -v node >/dev/null 2>&1; then
        echo -e "${RED}Error: Node.js is required but not found${NC}"
        exit 1
    fi

    # Build the TypeScript if needed (for development)
    if [ -f "$ARTK_CORE/tsconfig.json" ] && [ ! -f "$ARTK_CORE/dist/templates/generator.js" ]; then
        echo -e "${YELLOW}Building @artk/core...${NC}"
        cd "$ARTK_CORE"
        npm run build >/dev/null 2>&1 || true
        cd "$TARGET_PROJECT"
    fi

    # Run generation script
    set +e
    GENERATION_LOG="$TARGET_PROJECT/.artk/logs/template-generation.log"
    mkdir -p "$(dirname "$GENERATION_LOG")"

    node "$GENERATION_SCRIPT" \
        --projectRoot="$TARGET_PROJECT" \
        --variant="$TEMPLATE_MODULE_SYSTEM" \
        --verbose \
        > "$GENERATION_LOG" 2>&1

    GENERATION_STATUS=$?
    set -e

    if [ "$GENERATION_STATUS" -eq 0 ]; then
        echo -e "${GREEN}✓ Foundation modules generated successfully (variant: $SELECTED_VARIANT)${NC}"

        # Show what was generated
        if [ -d "$ARTK_E2E/foundation" ]; then
            echo -e "${CYAN}  Generated modules:${NC}"
            find "$ARTK_E2E/foundation" -name "*.ts" -type f | while read -r file; do
                echo -e "${CYAN}    - ${file#$ARTK_E2E/}${NC}"
            done
        fi
    else
        echo -e "${RED}✗ Foundation module generation failed${NC}"
        echo -e "${YELLOW}Details saved to: $GENERATION_LOG${NC}"
        tail -20 "$GENERATION_LOG" || true

        if [ "$SKIP_VALIDATION" = false ]; then
            echo -e "${RED}Aborting bootstrap due to generation failure${NC}"
            exit 1
        else
            echo -e "${YELLOW}Continuing despite generation failure (--skip-validation)${NC}"
        fi
    fi
fi

# .artk/.gitignore
cat > "$TARGET_PROJECT/.artk/.gitignore" << 'ARTKIGNORE'
# ARTK temporary files
browsers/
heal-logs/
*.heal.json
selector-catalog.local.json
ARTKIGNORE

# .gitignore additions
cat > "$ARTK_E2E/.gitignore" << 'GITIGNORE'
node_modules/
dist/
test-results/
playwright-report/
.auth-states/
*.local
GITIGNORE

# Step 6: Run npm install
if [ "$SKIP_NPM" = false ]; then
    echo -e "${YELLOW}[6/7] Running npm install...${NC}"

    setup_rollback_trap() {
        trap 'rollback_on_error' ERR EXIT
    }

    rollback_on_error() {
        if [ $? -ne 0 ]; then
            echo -e "${RED}Bootstrap failed, rolling back changes...${NC}"
            if [ -f "$ARTK_E2E/artk.config.yml.bootstrap-backup" ]; then
                mv "$ARTK_E2E/artk.config.yml.bootstrap-backup" "$ARTK_E2E/artk.config.yml"
                echo -e "${YELLOW}Config rolled back${NC}"
            fi
        fi
        trap - ERR EXIT
    }

    install_bundled_chromium() {
        local log_file="$1"
        npx playwright install chromium >"$log_file" 2>&1
        return $?
    }

    cd "$ARTK_E2E"

    if [ -f "$ARTK_E2E/artk.config.yml" ]; then
        cp "$ARTK_E2E/artk.config.yml" "$ARTK_E2E/artk.config.yml.bootstrap-backup"
    fi

    setup_rollback_trap

    LOGS_DIR="$TARGET_PROJECT/.artk/logs"
    mkdir -p "$LOGS_DIR"
    NPM_INSTALL_LOG="$LOGS_DIR/npm-install.log"

    set +e
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install --legacy-peer-deps >"$NPM_INSTALL_LOG" 2>&1
    NPM_STATUS=$?
    set -e

    if [ "$NPM_STATUS" -eq 0 ]; then
        echo -e "${GREEN}npm install: SUCCESS${NC}"
    else
        echo -e "${RED}npm install: FAILURE${NC}"
        echo -e "${YELLOW}Details saved to: $NPM_INSTALL_LOG${NC}"
        tail -12 "$NPM_INSTALL_LOG" || true
        exit 1
    fi

    echo -e "${YELLOW}[7/7] Configuring browsers...${NC}"

    BROWSERS_CACHE_DIR="$TARGET_PROJECT/.artk/browsers"
    mkdir -p "$BROWSERS_CACHE_DIR"
    export PLAYWRIGHT_BROWSERS_PATH="$BROWSERS_CACHE_DIR"

    PW_INSTALL_LOG="$LOGS_DIR/playwright-browser-install.log"

    BROWSER_CHANNEL="bundled"
    BROWSER_STRATEGY="auto"
    BROWSER_INFO="{\"channel\":\"bundled\",\"version\":null,\"path\":null}"

    if [ -f "$ARTK_E2E/artk.config.yml" ]; then
        EXISTING_STRATEGY=$(grep "^  strategy:" "$ARTK_E2E/artk.config.yml" | awk '{print $2}' 2>/dev/null || echo "auto")
        if [ -n "$EXISTING_STRATEGY" ] && [ "$EXISTING_STRATEGY" != "auto" ]; then
            BROWSER_STRATEGY="$EXISTING_STRATEGY"
            echo -e "${CYAN}Respecting existing strategy preference: $BROWSER_STRATEGY${NC}"
        fi
    fi

    if is_ci_environment && [ "$BROWSER_STRATEGY" != "system-only" ]; then
        echo -e "${CYAN}CI environment detected - using bundled browsers for reproducibility${NC}"
        BROWSER_CHANNEL="bundled"
    elif [ "$BROWSER_STRATEGY" = "bundled-only" ]; then
        echo -e "${CYAN}Strategy 'bundled-only' - forcing bundled browser install${NC}"
        unset PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD
        if install_bundled_chromium "$PW_INSTALL_LOG"; then
            BROWSER_CHANNEL="bundled"
        else
            echo -e "${RED}ERROR: Bundled Chromium install failed and strategy is 'bundled-only'${NC}"
            echo -e "${YELLOW}Details saved to: $PW_INSTALL_LOG${NC}"
            exit 1
        fi
    elif [ "$BROWSER_STRATEGY" = "system-only" ]; then
        echo -e "${CYAN}Strategy 'system-only' - detecting system browsers${NC}"
        BROWSER_INFO=$(detect_available_browser)
        BROWSER_CHANNEL=$(echo "$BROWSER_INFO" | sed -n 's/.*"channel":"\([^"]*\)".*/\1/p' | head -1)
        if [ "$BROWSER_CHANNEL" = "bundled" ]; then
            echo -e "${RED}ERROR: No system browsers found and strategy is 'system-only'${NC}"
            echo -e "${YELLOW}Solutions:${NC}"
            echo -e "  1. Install Microsoft Edge: https://microsoft.com/edge"
            echo -e "  2. Install Google Chrome: https://google.com/chrome"
            echo -e "  3. Change strategy in artk.config.yml to 'auto' or 'prefer-bundled'"
            exit 1
        fi
    elif download_playwright_browsers "$BROWSERS_CACHE_DIR"; then
        echo -e "${CYAN}✓ Using pre-built browser cache from release${NC}"
        export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
        BROWSER_CHANNEL="bundled"
    elif [ "$BROWSER_STRATEGY" = "prefer-system" ]; then
        echo -e "${CYAN}Strategy 'prefer-system' - checking system browsers first${NC}"
        BROWSER_INFO=$(detect_available_browser)
        BROWSER_CHANNEL=$(echo "$BROWSER_INFO" | sed -n 's/.*"channel":"\([^"]*\)".*/\1/p' | head -1)

        if [ "$BROWSER_CHANNEL" != "bundled" ]; then
            echo -e "${CYAN}✓ Using system browser: $BROWSER_CHANNEL${NC}"
        else
            echo -e "${YELLOW}No system browsers found, attempting bundled install...${NC}"
            unset PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD
            if install_bundled_chromium "$PW_INSTALL_LOG"; then
                BROWSER_CHANNEL="bundled"
            else
                echo -e "${RED}ERROR: Both system and bundled browsers unavailable${NC}"
                echo -e "${YELLOW}Details saved to: $PW_INSTALL_LOG${NC}"
                exit 1
            fi
        fi
    else
        echo -e "${YELLOW}Release cache unavailable. Attempting bundled Chromium install...${NC}"
        unset PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD

        if install_bundled_chromium "$PW_INSTALL_LOG"; then
            echo -e "${CYAN}✓ Bundled Chromium installed successfully${NC}"
            BROWSER_CHANNEL="bundled"
        else
            echo -e "${YELLOW}Bundled install failed. Detecting system browsers...${NC}"
            echo -e "${YELLOW}Bundled install details saved to: $PW_INSTALL_LOG${NC}"
            BROWSER_INFO=$(detect_available_browser)
            BROWSER_CHANNEL=$(echo "$BROWSER_INFO" | sed -n 's/.*"channel":"\([^"]*\)".*/\1/p' | head -1)

            if [ "$BROWSER_CHANNEL" = "msedge" ]; then
                echo -e "${CYAN}✓ Microsoft Edge detected - using system browser${NC}"
            elif [ "$BROWSER_CHANNEL" = "chrome" ]; then
                echo -e "${CYAN}✓ Google Chrome detected - using system browser${NC}"
            else
                echo -e "${RED}ERROR: No browsers available${NC}"
                echo -e "${YELLOW}ARTK tried:${NC}"
                echo -e "  1. Pre-built browser cache: Unavailable"
                echo -e "  2. Bundled Chromium install: Failed"
                echo -e "${YELLOW}Details saved to: $PW_INSTALL_LOG${NC}"
                echo -e "  3. System Microsoft Edge: Not found"
                echo -e "  4. System Google Chrome: Not found"
                echo -e "${YELLOW}Solutions:${NC}"
                echo -e "  1. Install Microsoft Edge: https://microsoft.com/edge"
                echo -e "  2. Install Google Chrome: https://google.com/chrome"
                echo -e "  3. Grant permissions for Playwright browser installation"
                echo -e "  4. Contact your IT administrator for assistance"
                exit 1
            fi
        fi
    fi

    if [ "$CONFIG_GENERATED" = true ]; then
        write_artk_config "$PROJECT_NAME" "$BROWSER_CHANNEL" "$BROWSER_STRATEGY"
    else
        # Preserve existing config, but if we selected a system browser channel, reflect that.
        if [ "$BROWSER_CHANNEL" != "bundled" ] && [ -f "$ARTK_E2E/artk.config.yml" ]; then
            ensure_artk_config_has_browsers_section "$ARTK_E2E/artk.config.yml" "$BROWSER_CHANNEL" "system"
            set_artk_config_browsers_channel "$ARTK_E2E/artk.config.yml" "$BROWSER_CHANNEL" || true
        fi
    fi

    log_browser_metadata "$BROWSER_INFO"

    rm -f "$ARTK_E2E/artk.config.yml.bootstrap-backup"
    trap - ERR EXIT

    export ARTK_BROWSER_CHANNEL="$BROWSER_CHANNEL"
    export ARTK_BROWSER_STRATEGY="$BROWSER_STRATEGY"

    cd "$TARGET_PROJECT"

    echo -e "${GREEN}Browser configuration complete: channel=$BROWSER_CHANNEL, strategy=$BROWSER_STRATEGY${NC}"
else
    echo -e "${CYAN}[6/7] Skipping npm install (--skip-npm)${NC}"
    echo -e "${CYAN}[7/7] Skipping browser installation (--skip-npm)${NC}"
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         ARTK Installation Complete!        ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}Installed:${NC}"
echo "  artk-e2e/                             - E2E test workspace"
echo "  artk-e2e/vendor/artk-core/            - @artk/core (vendored)"
echo "  artk-e2e/vendor/artk-core-autogen/    - @artk/core-autogen (vendored)"
echo "  artk-e2e/package.json                 - Test workspace dependencies"
echo "  artk-e2e/playwright.config.ts         - Playwright configuration"
echo "  artk-e2e/tsconfig.json                - TypeScript configuration"
echo "  artk-e2e/artk.config.yml              - ARTK configuration"
echo "  .github/prompts/                      - Copilot prompts"
echo "  .artk/context.json                    - ARTK context"
echo "  .artk/browsers/                       - Playwright browsers cache (repo-local)"
echo "  .artk/logs/                           - Bootstrap logs (npm + Playwright)"
echo ""
echo -e "${CYAN}Next steps:${NC}"
echo "  1. cd artk-e2e"
echo "  2. Open VS Code and use /artk.init-playbook in Copilot Chat"
echo ""
echo -e "${CYAN}Run tests:${NC}"
echo "  cd artk-e2e && npm test"
echo ""
