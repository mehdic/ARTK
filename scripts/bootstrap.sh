#!/bin/bash
#
# ARTK Bootstrap Script
# Usage: ./bootstrap.sh /path/to/target-project [--skip-npm]
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

    if command -v curl >/dev/null 2>&1; then
        curl -fsSL "$url" -o "$dest"
        return $?
    fi

    if command -v wget >/dev/null 2>&1; then
        wget -q "$url" -O "$dest"
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

# Parse arguments
TARGET=""
SKIP_NPM=false

for arg in "$@"; do
    case $arg in
        --skip-npm)
            SKIP_NPM=true
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
    echo "Usage: $0 /path/to/target-project [--skip-npm]"
    echo ""
    echo "Example:"
    echo "  $0 ~/projects/my-app"
    echo "  $0 . --skip-npm"
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

# Step 1: Build @artk/core if needed
if [ ! -d "$ARTK_CORE/dist" ]; then
    echo -e "${YELLOW}[1/6] Building @artk/core...${NC}"
    cd "$ARTK_CORE"
    npm install
    npm run build
else
    echo -e "${CYAN}[1/6] @artk/core already built ✓${NC}"
fi

# Step 2: Create artk-e2e structure
echo -e "${YELLOW}[2/6] Creating artk-e2e/ structure...${NC}"
mkdir -p "$ARTK_E2E"/{vendor/artk-core,tests,docs,journeys,.auth-states}

# Step 3: Copy @artk/core to vendor
echo -e "${YELLOW}[3/6] Installing @artk/core to vendor/...${NC}"
cp -r "$ARTK_CORE/dist" "$ARTK_E2E/vendor/artk-core/"
cp "$ARTK_CORE/package.json" "$ARTK_E2E/vendor/artk-core/"
cp "$ARTK_CORE/version.json" "$ARTK_E2E/vendor/artk-core/" 2>/dev/null || true
cp "$ARTK_CORE/README.md" "$ARTK_E2E/vendor/artk-core/" 2>/dev/null || true

# Step 4: Install prompts
echo -e "${YELLOW}[4/6] Installing prompts to .github/prompts/...${NC}"
PROMPTS_TARGET="$TARGET_PROJECT/.github/prompts"
mkdir -p "$PROMPTS_TARGET"

for file in "$ARTK_PROMPTS"/artk.*.md; do
    if [ -f "$file" ]; then
        filename=$(basename "$file")
        newname="${filename%.md}.prompt.md"
        cp "$file" "$PROMPTS_TARGET/$newname"
    fi
done

# Step 5: Create configuration files
echo -e "${YELLOW}[5/6] Creating configuration files...${NC}"

# Detect project name from target directory
PROJECT_NAME=$(basename "$TARGET_PROJECT")

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
    "test:ui": "playwright test --ui",
    "report": "playwright show-report"
  },
  "devDependencies": {
    "@artk/core": "file:./vendor/artk-core",
    "@playwright/test": "^1.57.0",
    "typescript": "^5.3.0"
  }
}
PKGJSON

# playwright.config.ts
cat > "$ARTK_E2E/playwright.config.ts" << 'PWCONFIG'
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
PWCONFIG

# tsconfig.json
cat > "$ARTK_E2E/tsconfig.json" << 'TSCONFIG'
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
TSCONFIG

# artk.config.yml
cat > "$ARTK_E2E/artk.config.yml" << ARTKCONFIG
# ARTK Configuration
# Generated by bootstrap.sh on $(date -Iseconds)

version: "1.0"

app:
  name: "$PROJECT_NAME"
  type: web
  description: "E2E tests for $PROJECT_NAME"

environments:
  local:
    baseUrl: \${ARTK_BASE_URL:-http://localhost:3000}
  intg:
    baseUrl: \${ARTK_INTG_URL:-https://intg.example.com}
  ctlq:
    baseUrl: \${ARTK_CTLQ_URL:-https://ctlq.example.com}
  prod:
    baseUrl: \${ARTK_PROD_URL:-https://example.com}

auth:
  provider: oidc
  storageStateDir: ./.auth-states
  # roles:
  #   admin:
  #     username: \${ADMIN_USER}
  #     password: \${ADMIN_PASS}

settings:
  parallel: true
  retries: 2
  timeout: 30000
  traceOnFailure: true
ARTKCONFIG

# Create context file
mkdir -p "$TARGET_PROJECT/.artk"
cat > "$TARGET_PROJECT/.artk/context.json" << CONTEXT
{
  "version": "1.0",
  "projectRoot": "$TARGET_PROJECT",
  "artkRoot": "$ARTK_E2E",
  "initialized_at": "$(date -Iseconds)",
  "bootstrap_script": "$SCRIPT_DIR/bootstrap.sh",
  "artk_repo": "$ARTK_REPO",
  "next_suggested": "/artk.init-playbook"
}
CONTEXT

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
    echo -e "${YELLOW}[6/6] Running npm install...${NC}"
    cd "$ARTK_E2E"
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install --legacy-peer-deps

    BROWSERS_CACHE_DIR="$TARGET_PROJECT/.artk/browsers"
    mkdir -p "$BROWSERS_CACHE_DIR"
    export PLAYWRIGHT_BROWSERS_PATH="$BROWSERS_CACHE_DIR"

    if download_playwright_browsers "$BROWSERS_CACHE_DIR"; then
        export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
        echo -e "${CYAN}Using release-hosted Playwright browsers cache.${NC}"
    else
        echo -e "${YELLOW}Release cache unavailable; installing Playwright browsers...${NC}"
        unset PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD
        npx playwright install chromium
    fi
else
    echo -e "${CYAN}[6/6] Skipping npm install (--skip-npm)${NC}"
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         ARTK Installation Complete!        ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}Created:${NC}"
echo "  artk-e2e/              - E2E test workspace"
echo "  artk-e2e/vendor/       - @artk/core library"
echo "  .github/prompts/       - Copilot prompts"
echo "  .artk/context.json     - ARTK context"
echo ""
echo -e "${CYAN}Next steps:${NC}"
echo "  1. cd artk-e2e"
echo "  2. Open VS Code and use /artk.init-playbook in Copilot Chat"
echo ""
echo -e "${CYAN}Run tests:${NC}"
echo "  cd artk-e2e && npm test"
echo ""
