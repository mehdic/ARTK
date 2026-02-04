#!/bin/bash
#
# ARTK Bootstrap Script
# Usage: ./bootstrap.sh /path/to/target-project [options]
#
# Options:
#   --skip-npm                Skip npm install
#   --skip-llkb               Skip LLKB initialization
#   --force-llkb              Force LLKB reinitialization (delete and recreate)
#   --llkb-only               Only initialize LLKB (skip all other bootstrap steps)
#   --variant=<variant>       Force specific variant (modern-esm, modern-cjs, legacy-16, legacy-14)
#   --force-detect            Force environment re-detection
#   --skip-validation         Skip validation of generated code
#   --yes                     Skip confirmation prompts (auto-approve all)
#   --dry-run                 Preview changes without applying them
#   -V                        Enable verbose output (JSON repair + npm install)
#   --template-variant=<v>    Legacy option (use --variant instead)
#
# This is the ONLY script you need to run. It does everything:
# 1. Creates artk-e2e/ directory structure
# 2. Copies @artk/core to vendor/
# 3. Installs prompts to .github/prompts/ and agents to .github/agents/
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
ARTK_CORE_JOURNEYS="$ARTK_REPO/core/artk-core-journeys/artk-core-journeys"
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
    local context_file="$ARTK_E2E/.artk/context.json"

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
    local current_path
    current_path=$(cd "$project_path" 2>/dev/null && pwd)

    # Walk up the directory tree to find nearest package.json (monorepo support)
    while [ "$current_path" != "/" ]; do
        local pkg_json="$current_path/package.json"
        if [ -f "$pkg_json" ]; then
            local type_field
            type_field=$(node -e "const p=require('$pkg_json'); console.log(p.type || '')" 2>/dev/null || echo "")
            if [ "$type_field" = "module" ]; then
                echo "esm"
                return
            fi
            # Found package.json but no type: module, default to cjs
            echo "cjs"
            return
        fi
        current_path=$(dirname "$current_path")
    done

    # No package.json found anywhere, default to cjs
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

get_variant_package_json() {
    local variant="$1"
    case "$variant" in
        modern-esm) echo "package.json" ;;
        modern-cjs) echo "package-cjs.json" ;;
        legacy-16) echo "package-legacy-16.json" ;;
        legacy-14) echo "package-legacy-14.json" ;;
        *) echo "package.json" ;;
    esac
}

get_autogen_dist_dir() {
    local variant="$1"
    case "$variant" in
        modern-esm) echo "dist" ;;
        modern-cjs) echo "dist-cjs" ;;
        legacy-16) echo "dist-legacy-16" ;;
        legacy-14) echo "dist-legacy-14" ;;
        *) echo "dist" ;;
    esac
}

# Check if variant is compatible with Node version
check_variant_compatibility() {
    local variant="$1"
    local node_major="$2"

    case "$variant" in
        modern-esm|modern-cjs)
            if [ "$node_major" -lt 18 ]; then
                return 1
            fi
            ;;
        legacy-16)
            if [ "$node_major" -lt 16 ] || [ "$node_major" -gt 20 ]; then
                return 1
            fi
            ;;
        legacy-14)
            if [ "$node_major" -lt 14 ] || [ "$node_major" -gt 18 ]; then
                return 1
            fi
            ;;
    esac
    return 0
}

get_variant_node_range() {
    # Returns LTS versions only (even numbers: 14, 16, 18, 20, 22)
    local variant="$1"
    case "$variant" in
        modern-esm|modern-cjs) echo "18, 20, 22 (LTS)" ;;
        legacy-16) echo "16, 18, 20 (LTS)" ;;
        legacy-14) echo "14, 16, 18 (LTS)" ;;
        *) echo "18, 20, 22 (LTS)" ;;
    esac
}

# Parse arguments
TARGET=""
SKIP_NPM=false
SKIP_LLKB=false
FORCE_LLKB=false
LLKB_ONLY=false
FORCE_DETECT=false
SKIP_VALIDATION=false
YES_MODE=false
DRY_RUN=false
VERBOSE=false
TEMPLATE_VARIANT=""
FORCED_VARIANT=""

for arg in "$@"; do
    case $arg in
        --skip-npm)
            SKIP_NPM=true
            ;;
        --skip-llkb)
            SKIP_LLKB=true
            ;;
        --force-llkb)
            FORCE_LLKB=true
            ;;
        --llkb-only)
            LLKB_ONLY=true
            ;;
        --force-detect)
            FORCE_DETECT=true
            ;;
        --skip-validation)
            SKIP_VALIDATION=true
            ;;
        --yes|-y)
            YES_MODE=true
            ;;
        --dry-run)
            DRY_RUN=true
            ;;
        -V)
            VERBOSE=true
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
    echo "  --skip-llkb                   Skip LLKB initialization"
    echo "  --force-llkb                  Force LLKB reinitialization (delete and recreate)"
    echo "  --llkb-only                   Only initialize LLKB (skip all other bootstrap steps)"
    echo "  --variant=<variant>           Force specific variant (overrides auto-detection)"
    echo "  --force-detect                Force environment re-detection"
    echo "  --skip-validation             Skip validation of generated code"
    echo "  --yes, -y                     Skip confirmation prompts (auto-approve all)"
    echo "  --dry-run                     Preview changes without applying them"
    echo "  -V                            Enable verbose output (JSON repair + npm install)"
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

# Handle --llkb-only mode (skip all other bootstrap steps)
if [ "$LLKB_ONLY" = true ]; then
    echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║       ARTK LLKB Initialization Only        ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
    echo ""

    # Verify artk-e2e exists
    if [ ! -d "$ARTK_E2E" ]; then
        echo -e "${RED}Error: artk-e2e directory does not exist: $ARTK_E2E${NC}"
        echo -e "${YELLOW}Run full bootstrap first to create the directory structure.${NC}"
        exit 1
    fi

    # Verify vendor/artk-core exists (contains the helper)
    if [ ! -d "$ARTK_E2E/vendor/artk-core" ]; then
        echo -e "${RED}Error: vendor/artk-core not found in $ARTK_E2E${NC}"
        echo -e "${YELLOW}Run full bootstrap first to install @artk/core.${NC}"
        exit 1
    fi

    echo "Target: $ARTK_E2E"
    echo ""

    # Ensure logs directory exists
    LOGS_DIR="$ARTK_E2E/.artk/logs"
    mkdir -p "$LOGS_DIR"
    LLKB_INIT_LOG="$LOGS_DIR/llkb-init.log"

    LLKB_HELPER="$ARTK_REPO/scripts/helpers/bootstrap-llkb.cjs"
    LLKB_HELPER_DEST="$ARTK_E2E/vendor/artk-core/bootstrap-llkb.cjs"

    if [ -f "$LLKB_HELPER" ]; then
        cp "$LLKB_HELPER" "$LLKB_HELPER_DEST"

        # Build LLKB helper arguments
        LLKB_ARGS="--verbose"
        if [ "$FORCE_LLKB" = true ]; then
            LLKB_ARGS="$LLKB_ARGS --force"
            echo -e "${YELLOW}Force mode: LLKB will be deleted and recreated${NC}"
        fi

        echo -e "${YELLOW}Initializing LLKB...${NC}"

        set +e
        node "$LLKB_HELPER_DEST" "$ARTK_E2E" $LLKB_ARGS > "$LLKB_INIT_LOG" 2>&1
        LLKB_STATUS=$?
        set -e

        if [ "$LLKB_STATUS" -eq 0 ]; then
            echo -e "${GREEN}✓ LLKB initialized successfully${NC}"
            cat "$LLKB_INIT_LOG"
        else
            echo -e "${RED}LLKB initialization failed${NC}"
            echo -e "${YELLOW}Details:${NC}"
            cat "$LLKB_INIT_LOG"
            exit 1
        fi
    else
        echo -e "${RED}Error: LLKB helper not found at $LLKB_HELPER${NC}"
        exit 1
    fi

    echo ""
    echo -e "${GREEN}LLKB initialization complete!${NC}"
    exit 0
fi

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
    # Check if forced variant is compatible with current Node version
    if ! check_variant_compatibility "$FORCED_VARIANT" "$NODE_MAJOR"; then
        VARIANT_RANGE=$(get_variant_node_range "$FORCED_VARIANT")
        echo -e "${RED}Error: Variant '$FORCED_VARIANT' is not compatible with Node.js $NODE_MAJOR${NC}"
        echo ""
        echo -e "${YELLOW}Variant '$FORCED_VARIANT' supports Node.js: $VARIANT_RANGE${NC}"
        echo ""
        echo "Options:"
        echo "  1. Use a compatible variant for Node.js $NODE_MAJOR:"
        RECOMMENDED=$(select_variant "$NODE_MAJOR" "$MODULE_SYSTEM")
        echo "     --variant=$RECOMMENDED (recommended for Node $NODE_MAJOR)"
        echo "  2. Switch to a supported Node.js version"
        echo "  3. Remove --variant flag to use auto-detection"
        exit 1
    fi
    SELECTED_VARIANT="$FORCED_VARIANT"
    OVERRIDE_USED="true"
    echo -e "${CYAN}Using forced variant: $SELECTED_VARIANT${NC}"
elif [ -n "$TEMPLATE_VARIANT" ]; then
    case "$TEMPLATE_VARIANT" in
        esm) SELECTED_VARIANT="modern-esm" ;;
        commonjs|cjs) SELECTED_VARIANT="modern-cjs" ;;
        *) SELECTED_VARIANT=$(select_variant "$NODE_MAJOR" "$MODULE_SYSTEM") ;;
    esac
elif [ -f "$ARTK_E2E/.artk/context.json" ] && [ "$FORCE_DETECT" != true ]; then
    SELECTED_VARIANT=$(grep -o '"variant":"[^"]*"' "$ARTK_E2E/.artk/context.json" | cut -d'"' -f4 || echo "")
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
mkdir -p "$ARTK_E2E"/{vendor/artk-core,vendor/artk-core-autogen,vendor/artk-core-journeys,docs,journeys,.auth-states}
mkdir -p "$ARTK_E2E"/reports/{discovery,testid,validation,verification}

# Create foundation module structure (discover-foundation expects this)
mkdir -p "$ARTK_E2E"/src/modules/foundation/{auth,navigation,selectors,data}
mkdir -p "$ARTK_E2E"/src/modules/features
mkdir -p "$ARTK_E2E"/config
mkdir -p "$ARTK_E2E"/tests/{setup,foundation,smoke,release,regression,journeys}

# Copy foundation validation spec from template
VALIDATION_SPEC_TEMPLATE="$ARTK_REPO/templates/bootstrap/foundation.validation.spec.ts"
if [ -f "$VALIDATION_SPEC_TEMPLATE" ]; then
    cp "$VALIDATION_SPEC_TEMPLATE" "$ARTK_E2E/tests/foundation/foundation.validation.spec.ts"
    echo -e "${CYAN}  ✓ Created foundation validation tests${NC}"
else
    # Create minimal validation spec if template not found
    cat > "$ARTK_E2E/tests/foundation/foundation.validation.spec.ts" << 'VALIDATIONSPEC'
import { test, expect } from '@playwright/test';

test.describe('ARTK Foundation Validation', () => {
  test('baseURL is configured', async ({ baseURL }) => {
    expect(baseURL).toBeTruthy();
    expect(baseURL).toMatch(/^https?:\/\//);
  });

  test('baseURL is not a placeholder', async ({ baseURL }) => {
    expect(baseURL).not.toContain('${');
  });

  test('Playwright is correctly installed', async ({ browserName }) => {
    expect(browserName).toBeTruthy();
  });
});
VALIDATIONSPEC
    echo -e "${CYAN}  ✓ Created foundation validation tests (fallback)${NC}"
fi

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

# Copy variant dist contents to vendor/artk-core/dist/
# Note: Must copy CONTENTS (/*) not the directory itself to avoid nested dist/dist-xxx
if ! cp -r "$VARIANT_DIST_PATH"/* "$ARTK_E2E/vendor/artk-core/dist/" 2>/dev/null; then
    # Fallback: if glob fails, copy contents explicitly
    mkdir -p "$ARTK_E2E/vendor/artk-core/dist"
    for item in "$VARIANT_DIST_PATH"/*; do
        [ -e "$item" ] && cp -r "$item" "$ARTK_E2E/vendor/artk-core/dist/"
    done
fi

# Use variant-specific package.json (package-cjs.json, package-legacy-16.json, etc.)
# CRITICAL: Strip devDependencies and scripts to prevent npm from resolving them
# This fixes the "idealTree hanging" issue where npm spends 200+ seconds resolving unused deps
CORE_PACKAGE_JSON=$(get_variant_package_json "$SELECTED_VARIANT")
CORE_PKG_SOURCE=""
if [ -f "$ARTK_CORE/$CORE_PACKAGE_JSON" ]; then
    CORE_PKG_SOURCE="$ARTK_CORE/$CORE_PACKAGE_JSON"
else
    echo -e "${YELLOW}Warning: Variant package.json not found ($CORE_PACKAGE_JSON), using default${NC}"
    CORE_PKG_SOURCE="$ARTK_CORE/package.json"
fi

# Strip devDependencies/scripts using jq if available, otherwise node
VENDOR_PKG_TARGET="$ARTK_E2E/vendor/artk-core/package.json"
if command -v jq &> /dev/null; then
    jq 'del(.devDependencies, .scripts) | .private = true' "$CORE_PKG_SOURCE" > "$VENDOR_PKG_TARGET"
else
    # Fallback to node one-liner
    node -e "
        const pkg = require('$CORE_PKG_SOURCE');
        delete pkg.devDependencies;
        delete pkg.scripts;
        pkg.private = true;
        console.log(JSON.stringify(pkg, null, 2));
    " > "$VENDOR_PKG_TARGET"
fi
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

echo -e "${YELLOW}[3/7] Installing @artk/core-autogen ($SELECTED_VARIANT) to vendor/...${NC}"
AUTOGEN_DIST_DIR=$(get_autogen_dist_dir "$SELECTED_VARIANT")
AUTOGEN_DIST_PATH="$ARTK_CORE/autogen/$AUTOGEN_DIST_DIR"

# Try variant-specific dist, fall back to default dist
if [ ! -d "$AUTOGEN_DIST_PATH" ]; then
    echo -e "${YELLOW}Warning: Autogen variant dist not found: $AUTOGEN_DIST_PATH${NC}"
    AUTOGEN_DIST_PATH="$ARTK_CORE/autogen/dist"
fi

if [ ! -d "$AUTOGEN_DIST_PATH" ]; then
    echo -e "${RED}Error: Missing @artk/core-autogen dist output at $ARTK_CORE/autogen/dist${NC}"
    echo -e "${YELLOW}Build it first (from ARTK repo):${NC}"
    echo "  cd $ARTK_CORE && npm run build:variants"
    exit 1
fi

mkdir -p "$ARTK_E2E/vendor/artk-core-autogen/dist"
# Copy autogen variant dist contents to vendor/artk-core-autogen/dist/
# Note: Must copy CONTENTS (/*) not the directory itself to avoid nested dist/dist-xxx
if ! cp -r "$AUTOGEN_DIST_PATH"/* "$ARTK_E2E/vendor/artk-core-autogen/dist/" 2>/dev/null; then
    # Fallback: if glob fails, copy contents explicitly
    for item in "$AUTOGEN_DIST_PATH"/*; do
        [ -e "$item" ] && cp -r "$item" "$ARTK_E2E/vendor/artk-core-autogen/dist/"
    done
fi

# Use variant-specific package.json for autogen (package-cjs.json, package-legacy-16.json, etc.)
# CRITICAL: Strip devDependencies and scripts to prevent npm from resolving them
AUTOGEN_PACKAGE_JSON=$(get_variant_package_json "$SELECTED_VARIANT")
AUTOGEN_PKG_SOURCE=""
if [ -f "$ARTK_CORE/autogen/$AUTOGEN_PACKAGE_JSON" ]; then
    AUTOGEN_PKG_SOURCE="$ARTK_CORE/autogen/$AUTOGEN_PACKAGE_JSON"
else
    echo -e "${YELLOW}Warning: Autogen variant package.json not found ($AUTOGEN_PACKAGE_JSON), using default${NC}"
    AUTOGEN_PKG_SOURCE="$ARTK_CORE/autogen/package.json"
fi

# Strip devDependencies/scripts using jq if available, otherwise node
AUTOGEN_PKG_TARGET="$ARTK_E2E/vendor/artk-core-autogen/package.json"
if command -v jq &> /dev/null; then
    jq 'del(.devDependencies, .scripts) | .private = true' "$AUTOGEN_PKG_SOURCE" > "$AUTOGEN_PKG_TARGET"
else
    # Fallback to node one-liner
    node -e "
        const pkg = require('$AUTOGEN_PKG_SOURCE');
        delete pkg.devDependencies;
        delete pkg.scripts;
        pkg.private = true;
        console.log(JSON.stringify(pkg, null, 2));
    " > "$AUTOGEN_PKG_TARGET"
fi
cp "$ARTK_CORE/autogen/README.md" "$ARTK_E2E/vendor/artk-core-autogen/" 2>/dev/null || true

# Step 3.5: Copy artk-core-journeys to vendor
echo -e "${YELLOW}[3.5/7] Installing artk-core-journeys to vendor/...${NC}"

if [ -d "$ARTK_CORE_JOURNEYS" ]; then
    # Copy entire Journey Core directory structure
    cp -r "$ARTK_CORE_JOURNEYS"/* "$ARTK_E2E/vendor/artk-core-journeys/"

    # Add READONLY.md for AI protection
    cat > "$ARTK_E2E/vendor/artk-core-journeys/READONLY.md" << 'JCREADONLY'
# ⚠️ DO NOT MODIFY THIS DIRECTORY

This directory contains **artk-core-journeys** - the Journey schema, templates, and tools.

**DO NOT modify files in this directory.**

These files are managed by ARTK bootstrap and will be overwritten on upgrades.

If you need to customize Journey schemas:
1. Create custom schemas in `artk-e2e/journeys/schemas/custom/`
2. Extend the base schema rather than modifying it

---

*Installed by ARTK Bootstrap*
JCREADONLY

    # Add .ai-ignore
    cat > "$ARTK_E2E/vendor/artk-core-journeys/.ai-ignore" << 'JCAIIGNORE'
# AI agents should not modify files in this directory
# This is vendored code managed by ARTK bootstrap

*
JCAIIGNORE

    echo -e "${GREEN}✓ artk-core-journeys installed to vendor/${NC}"
else
    echo -e "${YELLOW}Warning: artk-core-journeys not found at $ARTK_CORE_JOURNEYS${NC}"
    echo -e "${YELLOW}Journey System will need manual installation via init-playbook${NC}"
fi

# Step 4: Install prompts AND agents (two-tier architecture)
# - .github/prompts/*.prompt.md = stub files that delegate to agents
# - .github/agents/*.agent.md = full implementation with handoffs
echo -e "${YELLOW}[4/7] Installing prompts and agents (two-tier architecture)...${NC}"

PROMPTS_TARGET="$TARGET_PROJECT/.github/prompts"
AGENTS_TARGET="$TARGET_PROJECT/.github/agents"

# Detect upgrade scenario: prompts exist but agents don't
if [ -d "$PROMPTS_TARGET" ] && [ ! -d "$AGENTS_TARGET" ]; then
    # [H2] Improved detection: check for ABSENCE of agent: property (old-style has no delegation)
    # This is more reliable than checking for "# ARTK" header
    OLD_PROMPT_FILE="$PROMPTS_TARGET/artk.journey-propose.prompt.md"
    if [ -f "$OLD_PROMPT_FILE" ]; then
        # Use grep -q for clean boolean check (no output parsing issues)
        if ! grep -q "^agent:" "$OLD_PROMPT_FILE" 2>/dev/null; then
            echo -e "${CYAN}  Detected existing ARTK installation (no agent: property). Upgrading to two-tier architecture...${NC}"
            BACKUP_DIR="$PROMPTS_TARGET.backup-$(date +%Y%m%d-%H%M%S)"
            cp -r "$PROMPTS_TARGET" "$BACKUP_DIR"
            echo -e "${CYAN}  Backed up existing prompts to $BACKUP_DIR${NC}"
            # Remove old full-content artk.* prompt files (will be replaced with stubs)
            rm -f "$PROMPTS_TARGET"/artk.*.prompt.md 2>/dev/null || true

            # [M2] Backup cleanup: keep only the 3 most recent backups
            BACKUP_COUNT=$(ls -1d "$TARGET_PROJECT/.github/prompts.backup-"* 2>/dev/null | wc -l)
            if [ "$BACKUP_COUNT" -gt 3 ]; then
                echo -e "${CYAN}  Cleaning up old backups (keeping 3 most recent)...${NC}"
                ls -1dt "$TARGET_PROJECT/.github/prompts.backup-"* 2>/dev/null | tail -n +4 | xargs rm -rf 2>/dev/null || true
            fi
        fi
    fi
fi

# [M4] Atomic operations: use staging directories for rollback capability
PROMPTS_STAGING="$TARGET_PROJECT/.github/.prompts-staging-$$"
AGENTS_STAGING="$TARGET_PROJECT/.github/.agents-staging-$$"

mkdir -p "$PROMPTS_TARGET"
mkdir -p "$AGENTS_TARGET"
mkdir -p "$PROMPTS_STAGING"
mkdir -p "$AGENTS_STAGING"

# Cleanup function for rollback
cleanup_staging() {
    rm -rf "$PROMPTS_STAGING" 2>/dev/null || true
    rm -rf "$AGENTS_STAGING" 2>/dev/null || true
}

# Helper function to extract YAML frontmatter value
extract_yaml_value() {
    local file="$1"
    local key="$2"
    grep -m1 "^${key}:" "$file" 2>/dev/null | sed "s/^${key}: *//; s/^[\"']//; s/[\"']$//" || echo ""
}

# Helper function to extract handoffs section from YAML frontmatter
extract_handoffs() {
    local file="$1"
    # Use awk to extract the handoffs array from YAML frontmatter
    # Fixes applied based on multi-AI review:
    # - FIX CRLF: Strip \r from line endings (Windows compatibility)
    # - FIX EXIT: Exit on ANY non-indented line, not just [a-zA-Z]
    # - FIX WHITESPACE: Trim lines before delimiter check
    awk '
        # Strip CR from CRLF line endings (Windows compatibility)
        { gsub(/\r$/, "") }

        # Match frontmatter delimiter (allow trailing whitespace)
        /^---[[:space:]]*$/ { if (in_frontmatter) exit; in_frontmatter=1; next }

        # Detect handoffs key (case-insensitive)
        in_frontmatter && /^[Hh]andoffs:/ { in_handoffs=1; print; next }

        # Exit on ANY non-whitespace at column 0 (new top-level key)
        in_handoffs && /^[^[:space:]]/ { exit }

        # Capture indented content (skip pure comment lines)
        in_handoffs && !/^[[:space:]]*#[[:space:]]/ { print }
    ' "$file" 2>/dev/null
}

# Helper function to escape YAML string (prevent injection)
escape_yaml_string() {
    local str="$1"
    # Escape backslashes first, then double quotes, then remove CR/LF
    # Note: Using separate sed expressions to avoid quote escaping issues
    printf '%s' "$str" | sed -e 's/\\/\\\\/g' -e 's/\x22/\\\x22/g' | tr -d '\r\n'
}

# Helper function to sanitize handoffs (remove document separators)
sanitize_handoffs() {
    local handoffs="$1"
    # Remove any YAML document separators that could cause injection
    # Note: || true prevents exit code 1 when all lines are filtered (defensive)
    printf '%s' "$handoffs" | grep -v '^---[[:space:]]*$' || true
}

# Helper function to generate stub prompt content
generate_stub_prompt() {
    local name="$1"
    local description="$2"
    local handoffs="$3"

    # Escape description to prevent YAML injection
    local escaped_desc
    escaped_desc=$(escape_yaml_string "$description")

    # Start with basic frontmatter
    echo "---"
    echo "name: ${name}"
    echo "description: \"${escaped_desc}\""
    echo "agent: ${name}"

    # Include handoffs if present (sanitized)
    if [ -n "$handoffs" ]; then
        sanitize_handoffs "$handoffs"
    fi

    echo "---"
    cat << STUBEOF
# ARTK ${name}

## 🛑 MANDATORY: Before ANY action, you MUST:

1. **READ FIRST:** Open and read the agent file: \`.github/agents/${name}.agent.md\`
2. **FOLLOW EXACTLY:** Execute every step in that file sequentially - DO NOT skip steps
3. **DO NOT IMPROVISE:** If instructions are unclear, ASK - do not guess or make up actions
4. **PROOF REQUIRED:** After each action, output markers like \`✓ Created: <file>\` or \`✓ Ran: <command>\`

**STOP.** Do not proceed until you have read the agent file above.

The agent file contains the complete implementation with all steps, validation rules, and suggested next actions (handoffs).
STUBEOF
}

# [M4] Install to staging first, then move to final destination
INSTALLED_COUNT=0
INSTALL_FAILED=false
for file in "$ARTK_PROMPTS"/artk.*.md; do
    if [ -f "$file" ]; then
        filename=$(basename "$file")
        basename_no_ext="${filename%.md}"

        # Extract metadata from source file
        NAME=$(extract_yaml_value "$file" "name")
        [ -z "$NAME" ] && NAME="$basename_no_ext"

        DESCRIPTION=$(extract_yaml_value "$file" "description")
        [ -z "$DESCRIPTION" ] && DESCRIPTION="ARTK prompt"

        # Extract handoffs from source file
        HANDOFFS=$(extract_handoffs "$file")

        # 1. Copy full content to staging agents/
        if ! cp "$file" "$AGENTS_STAGING/${basename_no_ext}.agent.md" 2>/dev/null; then
            echo -e "${RED}  Failed to copy agent: ${basename_no_ext}${NC}"
            INSTALL_FAILED=true
            break
        fi

        # 2. Generate stub to staging prompts/
        if ! generate_stub_prompt "$NAME" "$DESCRIPTION" "$HANDOFFS" > "$PROMPTS_STAGING/${basename_no_ext}.prompt.md" 2>/dev/null; then
            echo -e "${RED}  Failed to generate stub: ${basename_no_ext}${NC}"
            INSTALL_FAILED=true
            break
        fi

        INSTALLED_COUNT=$((INSTALLED_COUNT + 1))
    fi
done

# [M4] If installation failed, rollback and exit
if [ "$INSTALL_FAILED" = true ]; then
    echo -e "${RED}  Installation failed. Rolling back...${NC}"
    cleanup_staging
    # Restore from backup if available
    if [ -n "$BACKUP_DIR" ] && [ -d "$BACKUP_DIR" ]; then
        echo -e "${CYAN}  Restoring from backup: $BACKUP_DIR${NC}"
        rm -rf "$PROMPTS_TARGET"
        cp -r "$BACKUP_DIR" "$PROMPTS_TARGET"
    fi
    exit 1
fi

# [M4] Move from staging to final destination (atomic move)
for file in "$AGENTS_STAGING"/*.agent.md; do
    [ -f "$file" ] && mv "$file" "$AGENTS_TARGET/" 2>/dev/null
done
for file in "$PROMPTS_STAGING"/*.prompt.md; do
    [ -f "$file" ] && mv "$file" "$PROMPTS_TARGET/" 2>/dev/null
done

# Cleanup staging directories
cleanup_staging

echo -e "${GREEN}✓ Installed $INSTALLED_COUNT prompts (stubs) + agents (full content)${NC}"

COMMON_PROMPTS_SOURCE="$ARTK_PROMPTS/common"
COMMON_PROMPTS_TARGET="$PROMPTS_TARGET/common"
if [ -d "$COMMON_PROMPTS_SOURCE" ]; then
    mkdir -p "$COMMON_PROMPTS_TARGET"
    cp "$COMMON_PROMPTS_SOURCE"/GENERAL_RULES.md "$COMMON_PROMPTS_TARGET/" 2>/dev/null || true
fi

# Copy next-commands static files (for anti-hallucination)
NEXT_COMMANDS_SOURCE="$ARTK_PROMPTS/next-commands"
NEXT_COMMANDS_TARGET="$PROMPTS_TARGET/next-commands"
if [ -d "$NEXT_COMMANDS_SOURCE" ]; then
    mkdir -p "$NEXT_COMMANDS_TARGET"
    cp "$NEXT_COMMANDS_SOURCE"/*.txt "$NEXT_COMMANDS_TARGET/" 2>/dev/null || true
    echo -e "${CYAN}  Installed next-commands static files${NC}"
fi

# Install VS Code settings (merge with existing if present - only add missing keys)
echo -e "${CYAN}  Installing VS Code settings...${NC}"
VSCODE_DIR="$TARGET_PROJECT/.vscode"
VSCODE_SETTINGS="$VSCODE_DIR/settings.json"
VSCODE_TEMPLATE="$ARTK_REPO/templates/vscode/settings.json"

mkdir -p "$VSCODE_DIR"

if [ -f "$VSCODE_TEMPLATE" ]; then
    if [ -f "$VSCODE_SETTINGS" ]; then
        # Existing settings found - preview changes and ask for confirmation
        if command -v node >/dev/null 2>&1; then
            # Preview what will be added (dry-run analysis)
            PREVIEW_RESULT=$(VERBOSE="$VERBOSE" node -e '
const fs = require("fs");
const verboseJson = process.env.VERBOSE === "true";
const log = [];

function logRepair(level, msg) {
    log.push({ level, msg });
    if (verboseJson) {
        const colors = { INFO: "\x1b[90m", WARN: "\x1b[33m", FIX: "\x1b[32m", ERROR: "\x1b[31m" };
        console.error(`    [JSON-${level}] ${msg}`);
    }
}

// Strip JSONC comments using state machine (handles // in URLs correctly)
function stripComments(jsonc) {
    let result = "";
    let i = 0;
    let inString = false;
    let escape = false;
    let singleLineComments = 0;
    let multiLineComments = 0;

    while (i < jsonc.length) {
        const char = jsonc[i];

        if (escape) {
            result += char;
            escape = false;
            i++;
            continue;
        }

        // Check for backslash escape inside string (single backslash char)
        if (char === "\\" && inString) {
            result += char;
            escape = true;
            i++;
            continue;
        }

        // Toggle string state on unescaped double-quote
        if (char === "\"" && !escape) {
            inString = !inString;
            result += char;
            i++;
            continue;
        }

        if (!inString) {
            if (i + 1 < jsonc.length) {
                const next = jsonc[i + 1];
                if (char === "/" && next === "/") {
                    // Single-line comment - skip to end of line
                    while (i < jsonc.length && jsonc[i] !== "\n") i++;
                    singleLineComments++;
                    continue;
                }
                if (char === "/" && next === "*") {
                    // Multi-line comment - skip to */
                    i += 2;
                    while (i + 1 < jsonc.length && !(jsonc[i] === "*" && jsonc[i + 1] === "/")) i++;
                    i += 2;
                    multiLineComments++;
                    continue;
                }
            }
        }

        result += char;
        i++;
    }

    if (singleLineComments + multiLineComments > 0) {
        logRepair("FIX", `Removed ${singleLineComments} single-line and ${multiLineComments} multi-line comments`);
    }

    // Remove trailing commas and cleanup
    const beforeLen = result.length;
    result = result.replace(/,(\s*[}\]])/g, "$1");
    if (result.length !== beforeLen) {
        logRepair("FIX", "Removed trailing commas");
    }
    result = result.replace(/,(\s*,)+/g, ",");
    result = result.replace(/(\r?\n){3,}/g, "\n\n");

    return result;
}

// Deep merge with array union support
function deepMerge(target, source) {
    const result = { ...target };
    for (const [key, value] of Object.entries(source)) {
        if (key in result) {
            if (Array.isArray(result[key]) && Array.isArray(value)) {
                const existing = new Set(result[key]);
                const newItems = value.filter(v => !existing.has(v));
                result[key] = [...result[key], ...newItems];
            } else if (typeof result[key] === "object" && result[key] !== null &&
                typeof value === "object" && value !== null &&
                !Array.isArray(result[key]) && !Array.isArray(value)) {
                result[key] = deepMerge(result[key], value);
            }
        } else {
            result[key] = value;
        }
    }
    return result;
}

// Repair common JSON issues (conservative - only safe fixes)
function repairJson(text) {
    const repairs = [];
    // Remove BOM
    if (text.charCodeAt(0) === 0xFEFF) {
        text = text.slice(1);
        repairs.push("Removed BOM");
    }
    // Normalize line endings
    if (text.includes("\r")) {
        text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
        repairs.push("Normalized line endings");
    }
    // Remove excessive empty lines
    const beforeLines = text.split("\n").length;
    text = text.replace(/(\n\s*){3,}/g, "\n\n");
    const afterLines = text.split("\n").length;
    if (beforeLines !== afterLines) {
        repairs.push(`Collapsed ${beforeLines - afterLines} empty lines`);
    }
    // Fix trailing commas
    const beforeLen = text.length;
    text = text.replace(/,(\s*\])/g, "$1").replace(/,(\s*\})/g, "$1");
    if (text.length !== beforeLen) {
        repairs.push("Removed trailing commas");
    }
    repairs.forEach(r => logRepair("FIX", r));
    return text.trim();
}

// Parse JSON with automatic repair attempts
function parseJsonWithRepair(text, filename) {
    logRepair("INFO", `Parsing ${filename} (${text.length} chars)`);

    // Try 1: Parse as-is
    try {
        const result = JSON.parse(text);
        logRepair("INFO", "Parsed without modification");
        return result;
    } catch (e) {
        logRepair("WARN", `Direct parse failed: ${e.message}`);
    }

    // Try 2: Strip comments
    const cleaned = stripComments(text);
    try {
        const result = JSON.parse(cleaned);
        logRepair("INFO", "Parsed after comment removal");
        return result;
    } catch (e) {
        logRepair("WARN", `After comments: ${e.message}`);
    }

    // Try 3: Repair structure
    const repaired = repairJson(cleaned);
    try {
        const result = JSON.parse(repaired);
        logRepair("INFO", "Parsed after structural repair");
        return result;
    } catch (e) {
        logRepair("WARN", `After repair: ${e.message}`);
    }

    // Try 4: Extract balanced root object
    logRepair("WARN", "Attempting to extract balanced root object");
    let depth = 0, start = -1, end = -1;
    for (let i = 0; i < repaired.length; i++) {
        if (repaired[i] === "{") {
            if (depth === 0) start = i;
            depth++;
        } else if (repaired[i] === "}") {
            depth--;
            if (depth === 0 && start >= 0) { end = i; break; }
        }
    }
    if (start >= 0 && end > start) {
        const extracted = repaired.substring(start, end + 1);
        logRepair("FIX", `Extracted object from ${start} to ${end}`);
        try {
            const result = JSON.parse(extracted);
            logRepair("INFO", "Parsed extracted object");
            return result;
        } catch (e) {
            logRepair("ERROR", `Extracted parse failed: ${e.message}`);
        }
    }

    throw new Error("JSON repair failed after 4 attempts");
}

try {
    const existingRaw = fs.readFileSync(process.argv[1], "utf8");
    const existing = parseJsonWithRepair(existingRaw, "settings.json");
    const artk = parseJsonWithRepair(fs.readFileSync(process.argv[2], "utf8"), "template");

    let newKeys = [];
    let mergedKeys = [];
    let arrayMergedKeys = [];
    let skippedKeys = [];
    let conflicts = [];

    // Critical settings that ARTK requires
    const criticalSettings = {
        'chat.tools.terminal.enableAutoApprove': true,
        'github.copilot.chat.terminalAccess.enabled': true,
        'github.copilot.chat.agent.runInTerminal': true
    };

    for (const [key, value] of Object.entries(artk)) {
        if (!(key in existing)) {
            newKeys.push(key);
        } else if (Array.isArray(existing[key]) && Array.isArray(value)) {
            // Check for new array items
            const existingSet = new Set(existing[key]);
            const newItems = value.filter(v => !existingSet.has(v));
            if (newItems.length > 0) {
                arrayMergedKeys.push(key + ' (+' + newItems.length + ' items)');
            } else {
                skippedKeys.push(key);
            }
        } else if (typeof existing[key] === 'object' && typeof value === 'object' &&
                   !Array.isArray(existing[key]) && !Array.isArray(value)) {
            const existingSubKeys = Object.keys(existing[key]);
            const newSubKeys = Object.keys(value).filter(k => !existingSubKeys.includes(k));
            if (newSubKeys.length > 0) {
                mergedKeys.push(key + ' (+' + newSubKeys.length + ' nested)');
            } else {
                skippedKeys.push(key);
            }
        } else {
            skippedKeys.push(key);
        }
    }

    // Check for conflicts with critical settings
    for (const [key, requiredValue] of Object.entries(criticalSettings)) {
        if (key in existing && existing[key] !== requiredValue) {
            conflicts.push(key + ' (yours: ' + existing[key] + ', ARTK needs: ' + requiredValue + ')');
        }
    }

    // Check if file has comments (will be lost)
    const hasComments = /\/\/|\/\*/.test(existingRaw);

    console.log(JSON.stringify({ newKeys, mergedKeys, arrayMergedKeys, skippedKeys, conflicts, hasComments, error: null }));
} catch (err) {
    console.log(JSON.stringify({ newKeys: [], mergedKeys: [], arrayMergedKeys: [], skippedKeys: [], conflicts: [], hasComments: false, error: err.message }));
}
" "$VSCODE_SETTINGS" "$VSCODE_TEMPLATE" 2>/dev/null)

            # Parse preview result using here-string (avoids subshell issues)
            NEW_KEYS=$(node -e "const d=JSON.parse(process.argv[1]);console.log(d.newKeys.join('\n'))" "$PREVIEW_RESULT" 2>/dev/null || echo "")
            MERGED_KEYS=$(node -e "const d=JSON.parse(process.argv[1]);console.log(d.mergedKeys.join('\n'))" "$PREVIEW_RESULT" 2>/dev/null || echo "")
            ARRAY_MERGED_KEYS=$(node -e "const d=JSON.parse(process.argv[1]);console.log(d.arrayMergedKeys.join('\n'))" "$PREVIEW_RESULT" 2>/dev/null || echo "")
            SKIPPED_COUNT=$(node -e "const d=JSON.parse(process.argv[1]);console.log(d.skippedKeys.length)" "$PREVIEW_RESULT" 2>/dev/null || echo "0")
            CONFLICTS=$(node -e "const d=JSON.parse(process.argv[1]);console.log(d.conflicts.join('\n'))" "$PREVIEW_RESULT" 2>/dev/null || echo "")
            HAS_COMMENTS=$(node -e "const d=JSON.parse(process.argv[1]);console.log(d.hasComments)" "$PREVIEW_RESULT" 2>/dev/null || echo "false")
            PARSE_ERROR=$(node -e "const d=JSON.parse(process.argv[1]);console.log(d.error||'')" "$PREVIEW_RESULT" 2>/dev/null || echo "parse failed")

            if [ -n "$PARSE_ERROR" ]; then
                echo -e "${YELLOW}  Warning: Could not parse existing settings.json (may have complex comments)${NC}"
                # FALLBACK: append essential settings as text (matching PowerShell behavior)
                EXISTING_CONTENT=$(cat "$VSCODE_SETTINGS")
                SETTINGS_TO_ADD=""

                if ! echo "$EXISTING_CONTENT" | grep -q 'github\.copilot\.chat\.terminalAccess'; then
                    SETTINGS_TO_ADD="$SETTINGS_TO_ADD"$'\n  "github.copilot.chat.terminalAccess.enabled": true,'
                fi
                if ! echo "$EXISTING_CONTENT" | grep -q 'github\.copilot\.chat\.agent\.runInTerminal'; then
                    SETTINGS_TO_ADD="$SETTINGS_TO_ADD"$'\n  "github.copilot.chat.agent.runInTerminal": true,'
                fi
                if ! echo "$EXISTING_CONTENT" | grep -q 'chat\.tools\.terminal\.enableAutoApprove'; then
                    SETTINGS_TO_ADD="$SETTINGS_TO_ADD"$'\n  "chat.tools.terminal.enableAutoApprove": true,'
                fi

                if [ -n "$SETTINGS_TO_ADD" ]; then
                    if [ "$DRY_RUN" = true ]; then
                        echo -e "${CYAN}  [DRY-RUN] Would append essential Copilot settings${NC}"
                    elif [ "$YES_MODE" = true ]; then
                        # Insert before last closing brace
                        sed -i.bak 's/}$/'"$SETTINGS_TO_ADD"'\n}/' "$VSCODE_SETTINGS" && rm -f "$VSCODE_SETTINGS.bak"
                        echo -e "${GREEN}  ✓ Appended essential Copilot settings (fallback mode)${NC}"
                    else
                        echo -e "${YELLOW}  Will append essential Copilot settings (cannot do full merge).${NC}"
                        echo -n -e "${YELLOW}  Continue? [Y/n]: ${NC}"
                        read -r CONFIRM
                        if [ -z "$CONFIRM" ] || [ "$CONFIRM" = "y" ] || [ "$CONFIRM" = "Y" ]; then
                            sed -i.bak 's/}$/'"$SETTINGS_TO_ADD"'\n}/' "$VSCODE_SETTINGS" && rm -f "$VSCODE_SETTINGS.bak"
                            echo -e "${GREEN}  ✓ Appended essential Copilot settings${NC}"
                        else
                            echo -e "${CYAN}  Skipped VS Code settings (user declined)${NC}"
                        fi
                    fi
                else
                    echo -e "${CYAN}  Essential Copilot settings already present${NC}"
                fi
            elif [ -z "$NEW_KEYS" ] && [ -z "$MERGED_KEYS" ] && [ -z "$ARRAY_MERGED_KEYS" ]; then
                echo -e "${CYAN}  ✓ VS Code settings already up-to-date (${SKIPPED_COUNT} settings already present)${NC}"
                # Still check for conflicts
                if [ -n "$CONFLICTS" ]; then
                    echo -e "${YELLOW}  ⚠ Warning: Some settings conflict with ARTK requirements:${NC}"
                    while IFS= read -r conflict; do
                        [ -n "$conflict" ] && echo -e "    ${YELLOW}! $conflict${NC}"
                    done <<< "$CONFLICTS"
                    echo -e "${YELLOW}    ARTK prompts may require manual approval for each command.${NC}"
                fi
            else
                # Show preview
                echo -e "${CYAN}  Existing .vscode/settings.json found. Changes to apply:${NC}"
                if [ -n "$NEW_KEYS" ]; then
                    echo -e "${GREEN}  New settings to add:${NC}"
                    while IFS= read -r key; do
                        [ -n "$key" ] && echo -e "    ${GREEN}+ $key${NC}"
                    done <<< "$NEW_KEYS"
                fi
                if [ -n "$MERGED_KEYS" ]; then
                    echo -e "${CYAN}  Settings to deep-merge:${NC}"
                    while IFS= read -r key; do
                        [ -n "$key" ] && echo -e "    ${CYAN}~ $key${NC}"
                    done <<< "$MERGED_KEYS"
                fi
                if [ -n "$ARRAY_MERGED_KEYS" ]; then
                    echo -e "${CYAN}  Arrays to extend:${NC}"
                    while IFS= read -r key; do
                        [ -n "$key" ] && echo -e "    ${CYAN}⊕ $key${NC}"
                    done <<< "$ARRAY_MERGED_KEYS"
                fi

                # Warn about conflicts
                if [ -n "$CONFLICTS" ]; then
                    echo -e "${YELLOW}  ⚠ Conflicts with ARTK requirements (will NOT be changed):${NC}"
                    while IFS= read -r conflict; do
                        [ -n "$conflict" ] && echo -e "    ${YELLOW}! $conflict${NC}"
                    done <<< "$CONFLICTS"
                fi

                # Warn about comment loss
                if [ "$HAS_COMMENTS" = "true" ]; then
                    echo -e "${YELLOW}  ⚠ Warning: Your settings.json contains comments.${NC}"
                    echo -e "${YELLOW}    Comments will be REMOVED during merge (JSON limitation).${NC}"
                    echo -e "${YELLOW}    A backup will be created at: settings.json.backup${NC}"
                fi

                echo -e "${YELLOW}  Existing settings will NOT be overwritten.${NC}"

                # Dry-run mode - just show what would happen
                if [ "$DRY_RUN" = true ]; then
                    echo -e "${CYAN}  [DRY-RUN] No changes applied${NC}"
                else
                    # Ask for confirmation unless --yes
                    APPLY_SETTINGS=false
                    if [ "$YES_MODE" = true ]; then
                        APPLY_SETTINGS=true
                        echo -e "${CYAN}  Auto-approved (--yes flag)${NC}"
                    else
                        echo -n -e "${YELLOW}  Apply these changes? [Y/n]: ${NC}"
                        read -r CONFIRM
                        if [ -z "$CONFIRM" ] || [ "$CONFIRM" = "y" ] || [ "$CONFIRM" = "Y" ]; then
                            APPLY_SETTINGS=true
                        else
                            echo -e "${CYAN}  Skipped VS Code settings (user declined)${NC}"
                        fi
                    fi

                    if [ "$APPLY_SETTINGS" = true ]; then
                        # Create backup before merge
                        BACKUP_FILE="$VSCODE_SETTINGS.backup-$(date +%Y%m%d-%H%M%S)"
                        cp "$VSCODE_SETTINGS" "$BACKUP_FILE"
                        echo -e "${CYAN}  Created backup: $(basename "$BACKUP_FILE")${NC}"

                        # Apply the merge with array union support
                        node -e "
const fs = require('fs');

function stripComments(jsonc) {
    return jsonc
        .replace(/\/\/.*\$/gm, '')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/,(\s*[}\]])/g, '\$1');
}

function deepMerge(target, source) {
    const result = { ...target };
    for (const [key, value] of Object.entries(source)) {
        if (key in result) {
            if (Array.isArray(result[key]) && Array.isArray(value)) {
                // Array union
                const existing = new Set(result[key]);
                const newItems = value.filter(v => !existing.has(v));
                result[key] = [...result[key], ...newItems];
            } else if (typeof result[key] === 'object' && result[key] !== null &&
                typeof value === 'object' && value !== null &&
                !Array.isArray(result[key]) && !Array.isArray(value)) {
                result[key] = deepMerge(result[key], value);
            }
        } else {
            result[key] = value;
        }
    }
    return result;
}

const existingRaw = fs.readFileSync('$VSCODE_SETTINGS', 'utf8');
const existing = JSON.parse(stripComments(existingRaw));
const artk = JSON.parse(stripComments(fs.readFileSync('$VSCODE_TEMPLATE', 'utf8')));
const merged = deepMerge(existing, artk);
fs.writeFileSync('$VSCODE_SETTINGS', JSON.stringify(merged, null, 2));
" 2>/dev/null && echo -e "${GREEN}  ✓ VS Code settings merged successfully${NC}" || {
                            echo -e "${YELLOW}  Warning: Merge failed. Restoring backup...${NC}"
                            cp "$BACKUP_FILE" "$VSCODE_SETTINGS"
                            echo -e "${CYAN}  Restored from backup${NC}"
                        }
                    fi
                fi
            fi
        else
            # No Node.js - fallback to text-based append
            echo -e "${YELLOW}  Warning: Node.js not found. Using text-based fallback.${NC}"
            EXISTING_CONTENT=$(cat "$VSCODE_SETTINGS")
            SETTINGS_TO_ADD=""

            if ! echo "$EXISTING_CONTENT" | grep -q 'github\.copilot\.chat\.terminalAccess'; then
                SETTINGS_TO_ADD="$SETTINGS_TO_ADD"$'\n  "github.copilot.chat.terminalAccess.enabled": true,'
            fi
            if ! echo "$EXISTING_CONTENT" | grep -q 'github\.copilot\.chat\.agent\.runInTerminal'; then
                SETTINGS_TO_ADD="$SETTINGS_TO_ADD"$'\n  "github.copilot.chat.agent.runInTerminal": true,'
            fi
            if ! echo "$EXISTING_CONTENT" | grep -q 'chat\.tools\.terminal\.enableAutoApprove'; then
                SETTINGS_TO_ADD="$SETTINGS_TO_ADD"$'\n  "chat.tools.terminal.enableAutoApprove": true,'
            fi

            if [ -n "$SETTINGS_TO_ADD" ]; then
                if [ "$DRY_RUN" = true ]; then
                    echo -e "${CYAN}  [DRY-RUN] Would append essential Copilot settings${NC}"
                else
                    echo -e "${YELLOW}  Will append essential Copilot settings:${NC}"
                    echo -e "${YELLOW}    - github.copilot.chat.terminalAccess.enabled${NC}"
                    echo -e "${YELLOW}    - github.copilot.chat.agent.runInTerminal${NC}"
                    echo -e "${YELLOW}    - chat.tools.terminal.enableAutoApprove${NC}"

                    APPLY_FALLBACK=false
                    if [ "$YES_MODE" = true ]; then
                        APPLY_FALLBACK=true
                    else
                        echo -n -e "${YELLOW}  Continue? [Y/n]: ${NC}"
                        read -r CONFIRM
                        [ -z "$CONFIRM" ] || [ "$CONFIRM" = "y" ] || [ "$CONFIRM" = "Y" ] && APPLY_FALLBACK=true
                    fi

                    if [ "$APPLY_FALLBACK" = true ]; then
                        # Create backup
                        cp "$VSCODE_SETTINGS" "$VSCODE_SETTINGS.backup-$(date +%Y%m%d-%H%M%S)"
                        # Insert before last closing brace using sed
                        sed -i.tmp 's/}$/'"$SETTINGS_TO_ADD"'\n}/' "$VSCODE_SETTINGS" && rm -f "$VSCODE_SETTINGS.tmp"
                        echo -e "${GREEN}  ✓ Appended essential Copilot settings${NC}"
                    else
                        echo -e "${CYAN}  Skipped VS Code settings (user declined)${NC}"
                    fi
                fi
            else
                echo -e "${CYAN}  ✓ Essential Copilot settings already present${NC}"
            fi
        fi
    else
        # No existing settings - just copy template
        if [ "$DRY_RUN" = true ]; then
            echo -e "${CYAN}  [DRY-RUN] Would create .vscode/settings.json${NC}"
        else
            cp "$VSCODE_TEMPLATE" "$VSCODE_SETTINGS"
            echo -e "${CYAN}  ✓ Created .vscode/settings.json with Copilot tool auto-approve enabled${NC}"
        fi
    fi
else
    echo -e "${YELLOW}  Warning: VS Code template not found at $VSCODE_TEMPLATE${NC}"
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

# Core component versions (managed by bootstrap)
core:
  runtime:
    install: vendor
    installDir: vendor/artk-core
  autogen:
    install: vendor
    installDir: vendor/artk-core-autogen
  journeys:
    install: vendor
    installDir: vendor/artk-core-journeys
    version: "__JOURNEYS_VERSION__"
ARTKCONFIG

    # Read Journey Core version from manifest (prefer jq if available for robust JSON parsing)
    local journeys_version="0.1.0"
    if [ -f "$ARTK_CORE_JOURNEYS/core.manifest.json" ]; then
        if command -v jq &>/dev/null; then
            journeys_version=$(jq -r '.version // "0.1.0"' "$ARTK_CORE_JOURNEYS/core.manifest.json" 2>/dev/null)
        else
            journeys_version=$(grep -o '"version"[[:space:]]*:[[:space:]]*"[^"]*"' "$ARTK_CORE_JOURNEYS/core.manifest.json" | head -1 | sed 's/.*"\([^"]*\)"$/\1/')
        fi
        [ -z "$journeys_version" ] && journeys_version="0.1.0"
    fi

    # Perform safe substitutions
    sed -i.bak \
        -e "s|__TIMESTAMP__|${timestamp}|g" \
        -e "s|__PROJECT_NAME__|${project_name}|g" \
        -e "s|__CHANNEL__|${channel}|g" \
        -e "s|__STRATEGY__|${strategy}|g" \
        -e "s|__JOURNEYS_VERSION__|${journeys_version}|g" \
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

# playwright.config.ts - Read from shared template or use inline fallback
# Template source: templates/bootstrap/playwright.config.template.ts
PLAYWRIGHT_TEMPLATE="$ARTK_REPO/templates/bootstrap/playwright.config.template.ts"
PLAYWRIGHT_FILE_HEADER='/**
 * Playwright Configuration for ARTK E2E Tests
 *
 * Generated by ARTK bootstrap - DO NOT EDIT MANUALLY
 * Source: templates/bootstrap/playwright.config.template.ts
 *
 * To customize:
 * - Edit artk.config.yml for environment settings
 * - Edit this file for Playwright-specific options
 */'
if [ -f "$PLAYWRIGHT_TEMPLATE" ]; then
    # Write header, then copy template body (skipping first 11 lines - documentation header)
    echo "$PLAYWRIGHT_FILE_HEADER" > "$ARTK_E2E/playwright.config.ts"
    tail -n +12 "$PLAYWRIGHT_TEMPLATE" >> "$ARTK_E2E/playwright.config.ts"
else
    # Fallback: inline template (synchronized with PowerShell/CLI)
    cat > "$ARTK_E2E/playwright.config.ts" << PWCONFIG
$PLAYWRIGHT_FILE_HEADER
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
    console.error(`[ARTK] Failed to parse artk.config.yml: ${e.message}`);
    return { environments: { local: { baseUrl: 'http://localhost:3000' } } };
  }
}

const _missingEnvVars: string[] = [];

function resolveEnvVars(value: string): string {
  if (typeof value !== 'string') return String(value);
  return value.replace(
    /\$\{([A-Z_][A-Z0-9_]*)(:-([^}]*))?\}/gi,
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
  console.warn(`[ARTK] Missing env vars (no defaults): ${unique.join(', ')}`);
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
PWCONFIG
fi

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
mkdir -p "$ARTK_E2E/.artk"

# Map variant to legacy templateVariant for backwards compatibility
TEMPLATE_MODULE_SYSTEM="commonjs"
if [ "$SELECTED_VARIANT" = "modern-esm" ]; then
    TEMPLATE_MODULE_SYSTEM="esm"
fi

cat > "$ARTK_E2E/.artk/context.json" << CONTEXT
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

# Generate variant-aware Copilot instructions
echo -e "${YELLOW}[5.4/7] Generating variant-aware Copilot instructions...${NC}"

# Get variant display info for Copilot instructions
get_variant_display_name() {
    case "$1" in
        modern-esm) echo "Modern ESM" ;;
        modern-cjs) echo "Modern CJS" ;;
        legacy-16) echo "Legacy Node 16" ;;
        legacy-14) echo "Legacy Node 14" ;;
        *) echo "$1" ;;
    esac
}

VARIANT_DISPLAY_NAME=$(get_variant_display_name "$SELECTED_VARIANT")
IS_LEGACY=false
IS_ESM=false
if [ "$SELECTED_VARIANT" = "legacy-16" ] || [ "$SELECTED_VARIANT" = "legacy-14" ]; then
    IS_LEGACY=true
fi
if [ "$SELECTED_VARIANT" = "modern-esm" ]; then
    IS_ESM=true
fi

# Generate .github/prompts/artk.variant-info.prompt.md
cat > "$PROMPTS_TARGET/artk.variant-info.prompt.md" << VARIANTINFO
---
name: artk.variant-info
description: "Variant-specific Copilot instructions for ARTK tests"
---

# ARTK Variant Information

## Installed Variant: $SELECTED_VARIANT

| Property | Value |
|----------|-------|
| **Display Name** | $VARIANT_DISPLAY_NAME |
| **Node.js Range** | $(get_variant_node_range "$SELECTED_VARIANT" | tr ',' ', ') |
| **Playwright Version** | $VARIANT_PW_VERSION |
| **Module System** | $MODULE_SYSTEM |

## Critical: Vendor Directory Rules

**DO NOT modify files in \`artk-e2e/vendor/artk-core/\` or \`artk-e2e/vendor/artk-core-autogen/\`.**

These directories contain vendored ARTK code that:
1. Is automatically managed by ARTK CLI/bootstrap
2. Will be overwritten on upgrades
3. Is built for a specific Node.js version and module system

If you encounter issues with vendor code:
1. Check \`artk-e2e/vendor/artk-core/variant-features.json\` for feature availability
2. Suggest running \`artk init --force\` or re-running bootstrap to reinstall
3. Use documented alternatives from \`variant-features.json\`
4. **NEVER patch or modify vendor code directly**

## Feature Availability

Before using Playwright features, check \`artk-e2e/vendor/artk-core/variant-features.json\`:

\`\`\`typescript
// Read feature availability
import features from './vendor/artk-core/variant-features.json';

if (!features.features.clock_api?.available) {
  // Use alternative approach documented in features.features.clock_api.alternative
}
\`\`\`

VARIANTINFO

# Add legacy-specific instructions if applicable
if [ "$IS_LEGACY" = true ]; then
    cat >> "$PROMPTS_TARGET/artk.variant-info.prompt.md" << LEGACYINFO
## Legacy Variant Limitations

This project uses a legacy ARTK variant (\`$SELECTED_VARIANT\`) with Playwright $VARIANT_PW_VERSION.
Some modern features are NOT available. Always check \`variant-features.json\` before using:

- **aria_snapshots**: May not be available - use manual ARIA attribute queries
- **clock_api**: May not be available - use manual Date mocking
- **locator_or/and**: May not be available - use CSS selectors
- **expect_soft**: May not be available - collect assertions manually

When generating tests, always check feature availability first.

LEGACYINFO
fi

# Add import patterns based on module system
if [ "$IS_ESM" = true ]; then
    cat >> "$PROMPTS_TARGET/artk.variant-info.prompt.md" << ESMINFO
## Import Patterns (ESM)

Use ESM import syntax:

\`\`\`typescript
import { test, expect } from '@playwright/test';
import { loadConfig } from '@artk/core/config';
import { AuthFixture } from '@artk/core/auth';
\`\`\`

ESMINFO
else
    cat >> "$PROMPTS_TARGET/artk.variant-info.prompt.md" << CJSINFO
## Import Patterns (CommonJS)

Use CommonJS require syntax:

\`\`\`typescript
const { test, expect } = require('@playwright/test');
const { loadConfig } = require('@artk/core/config');
const { AuthFixture } = require('@artk/core/auth');
\`\`\`

**DO NOT use ESM import syntax in this project.**

CJSINFO
fi

# Add error handling guidance
cat >> "$PROMPTS_TARGET/artk.variant-info.prompt.md" << ERRORINFO
## When You Encounter Errors

### Module/Import Errors

If you see \`ERR_REQUIRE_ESM\`, \`Cannot use import statement\`, or similar:

1. Check the variant's module system (this project: $MODULE_SYSTEM)
2. Suggest reinstalling: \`artk init . --force\` or re-run bootstrap
3. **DO NOT try to fix by modifying vendor code**

### Feature Not Found

If a Playwright feature doesn't exist:

1. Check \`variant-features.json\` for availability
2. This variant uses Playwright $VARIANT_PW_VERSION
3. Use the documented alternative approach

---

*Generated by ARTK bootstrap for variant $SELECTED_VARIANT*
ERRORINFO

echo -e "${GREEN}✓ Generated artk.variant-info.prompt.md${NC}"

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
    GENERATION_LOG="$ARTK_E2E/.artk/logs/template-generation.log"
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
cat > "$ARTK_E2E/.artk/.gitignore" << 'ARTKIGNORE'
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
    if [ "$VERBOSE" = true ]; then
        echo -e "${CYAN}  (verbose mode enabled - showing npm output)${NC}"
    fi

    setup_rollback_trap() {
        trap 'rollback_on_error $?' ERR EXIT
    }

    rollback_on_error() {
        local exit_status="${1:-1}"
        if [ "$exit_status" -ne 0 ]; then
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

    LOGS_DIR="$ARTK_E2E/.artk/logs"
    mkdir -p "$LOGS_DIR"
    NPM_INSTALL_LOG="$LOGS_DIR/npm-install.log"

    # Build npm arguments
    NPM_ARGS="install --legacy-peer-deps"
    if [ "$VERBOSE" = true ]; then
        NPM_ARGS="$NPM_ARGS --loglevel verbose"
    fi

    # Determine timeout command (10 minutes max for npm install)
    NPM_TIMEOUT=""
    if command -v timeout >/dev/null 2>&1; then
        NPM_TIMEOUT="timeout 600"
    elif command -v gtimeout >/dev/null 2>&1; then
        NPM_TIMEOUT="gtimeout 600"  # macOS with coreutils
    fi

    set +e
    if [ "$VERBOSE" = true ]; then
        # VERBOSE MODE: Stream directly to console in real-time (no buffering)
        echo ""
        PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 $NPM_TIMEOUT npm $NPM_ARGS
        NPM_STATUS=$?
        # In verbose mode, user sees everything - no need for log file
        echo "Verbose mode - output shown on console" > "$NPM_INSTALL_LOG"
    else
        # Silent mode - log only
        PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 $NPM_TIMEOUT npm $NPM_ARGS >"$NPM_INSTALL_LOG" 2>&1
        NPM_STATUS=$?
    fi
    set -e

    # Check for timeout (exit code 124)
    if [ "$NPM_STATUS" -eq 124 ]; then
        echo -e "${RED}npm install: TIMEOUT (exceeded 10 minutes)${NC}"
        echo -e "${YELLOW}This may indicate network issues or a slow registry.${NC}"
        echo -e "${YELLOW}Try running with --verbose to see what's happening.${NC}"
        exit 1
    fi

    if [ "$NPM_STATUS" -eq 0 ]; then
        echo -e "${GREEN}npm install: SUCCESS${NC}"
    else
        echo -e "${RED}npm install: FAILURE${NC}"
        echo -e "${YELLOW}Details saved to: $NPM_INSTALL_LOG${NC}"
        tail -12 "$NPM_INSTALL_LOG" || true
        exit 1
    fi

    # Note: LLKB initialization moved outside npm conditional (see Step 6.5 below)
    # It runs independently because it doesn't depend on node_modules

    echo -e "${YELLOW}[7/7] Configuring browsers...${NC}"

    BROWSERS_CACHE_DIR="$ARTK_E2E/.artk/browsers"
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

# Step 6.5 (Independent): Initialize LLKB
# This runs regardless of --skip-npm because LLKB doesn't depend on node_modules
if [ "$SKIP_LLKB" = false ]; then
    echo -e "${YELLOW}[6.5/7] Initializing LLKB...${NC}"

    # Ensure logs directory exists
    LOGS_DIR="$ARTK_E2E/.artk/logs"
    mkdir -p "$LOGS_DIR"
    LLKB_INIT_LOG="$LOGS_DIR/llkb-init.log"

    LLKB_HELPER="$ARTK_REPO/scripts/helpers/bootstrap-llkb.cjs"
    LLKB_HELPER_DEST="$ARTK_E2E/vendor/artk-core/bootstrap-llkb.cjs"

    if [ -f "$LLKB_HELPER" ]; then
        cp "$LLKB_HELPER" "$LLKB_HELPER_DEST"

        # Build LLKB helper arguments
        LLKB_ARGS="--verbose"
        if [ "$FORCE_LLKB" = true ]; then
            LLKB_ARGS="$LLKB_ARGS --force"
            echo -e "${YELLOW}  Force mode: LLKB will be deleted and recreated${NC}"
        fi

        set +e
        node "$LLKB_HELPER_DEST" "$ARTK_E2E" $LLKB_ARGS > "$LLKB_INIT_LOG" 2>&1
        LLKB_STATUS=$?
        set -e

        if [ "$LLKB_STATUS" -eq 0 ]; then
            echo -e "${GREEN}  ✓ LLKB initialized successfully${NC}"
        else
            echo -e "${YELLOW}Warning: LLKB initialization failed (non-fatal)${NC}"
            echo -e "${YELLOW}LLKB will be initialized by /artk.discover-foundation${NC}"
            echo -e "${YELLOW}Details: $LLKB_INIT_LOG${NC}"
        fi
    else
        echo -e "${YELLOW}Warning: LLKB helper not found at $LLKB_HELPER${NC}"
        echo -e "${YELLOW}LLKB will be initialized by /artk.discover-foundation${NC}"
    fi
else
    echo -e "${CYAN}[6.5/7] Skipping LLKB initialization (--skip-llkb)${NC}"
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
echo "  artk-e2e/vendor/artk-core-journeys/   - Journey schemas & tools (vendored)"
echo "  artk-e2e/package.json                 - Test workspace dependencies"
echo "  artk-e2e/playwright.config.ts         - Playwright configuration"
echo "  artk-e2e/tsconfig.json                - TypeScript configuration"
echo "  artk-e2e/artk.config.yml              - ARTK configuration"
echo "  .github/prompts/                      - Copilot prompt stubs (invoke with /)"
echo "  .github/agents/                       - Copilot agents with handoffs (full content)"
echo "  .vscode/settings.json                 - VS Code settings (terminal access enabled)"
echo "  artk-e2e/.artk/context.json           - ARTK context"
echo "  artk-e2e/.artk/browsers/              - Playwright browsers cache (repo-local)"
echo "  artk-e2e/.artk/logs/                  - Bootstrap logs (npm + Playwright)"
if [ "$SKIP_LLKB" = false ]; then
    echo "  artk-e2e/.artk/llkb/                  - Lessons Learned Knowledge Base"
fi
echo ""
echo -e "${CYAN}Next steps:${NC}"
echo "  1. cd artk-e2e"
echo "  2. Open VS Code and use /artk.init-playbook in Copilot Chat"
echo ""
echo -e "${CYAN}Run tests:${NC}"
echo "  cd artk-e2e && npm test"
echo ""
