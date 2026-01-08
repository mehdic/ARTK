#!/bin/bash
#
# Build Playwright browser cache assets for GitHub Releases.
# Usage: ./build-playwright-browsers-release.sh [--project-dir path] [--output-dir path] [--browsers-path path] [--keep-browsers]
#

set -e

PROJECT_DIR=""
OUTPUT_DIR=""
BROWSERS_PATH=""
KEEP_BROWSERS=false

while [ $# -gt 0 ]; do
    case "$1" in
        --project-dir)
            PROJECT_DIR="$2"
            shift 2
            ;;
        --output-dir)
            OUTPUT_DIR="$2"
            shift 2
            ;;
        --browsers-path)
            BROWSERS_PATH="$2"
            shift 2
            ;;
        --keep-browsers)
            KEEP_BROWSERS=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

if [ -z "$PROJECT_DIR" ]; then
    PROJECT_DIR="$(pwd)"
fi

if [ -z "$OUTPUT_DIR" ]; then
    OUTPUT_DIR="$PROJECT_DIR/playwright-browsers-release"
fi

cleanup_browsers=false
if [ -z "$BROWSERS_PATH" ]; then
    BROWSERS_PATH="$(mktemp -d)"
    cleanup_browsers=true
else
    mkdir -p "$BROWSERS_PATH"
fi

if [ "$KEEP_BROWSERS" = true ]; then
    cleanup_browsers=false
fi

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

os_arch=$(detect_os_arch)
os_name=$(echo "$os_arch" | awk '{print $1}')
arch_name=$(echo "$os_arch" | awk '{print $2}')

if [ "$os_name" = "unknown" ] || [ "$arch_name" = "unknown" ]; then
    echo "Unsupported OS/arch ($os_name/$arch_name)."
    exit 1
fi

if ! command -v npx >/dev/null 2>&1; then
    echo "npx is required to install Playwright browsers."
    exit 1
fi

if ! command -v zip >/dev/null 2>&1; then
    echo "zip is required to create release assets."
    exit 1
fi

echo "Installing Playwright browsers..."
pushd "$PROJECT_DIR" >/dev/null
PLAYWRIGHT_BROWSERS_PATH="$BROWSERS_PATH" npx playwright install chromium

browsers_json="$PROJECT_DIR/node_modules/playwright-core/browsers.json"
if [ ! -f "$browsers_json" ]; then
    echo "Missing browsers.json at $browsers_json"
    popd >/dev/null
    exit 1
fi

chromium_rev=$(node -e "const fs=require('fs'); const data=JSON.parse(fs.readFileSync(process.argv[1],'utf8')); const chromium=data.browsers.find(b=>b.name==='chromium'); if (!chromium) process.exit(1); console.log(chromium.revision);" "$browsers_json")
if [ -z "$chromium_rev" ]; then
    echo "Unable to determine Chromium revision."
    popd >/dev/null
    exit 1
fi

asset="chromium-$chromium_rev-$os_name-$arch_name.zip"
mkdir -p "$OUTPUT_DIR"

echo "Creating asset: $asset"
(cd "$BROWSERS_PATH" && zip -q -r "$OUTPUT_DIR/$asset" .)

hash=$(sha256_file "$OUTPUT_DIR/$asset")
if [ -z "$hash" ]; then
    echo "Unable to compute SHA256 for $asset"
    popd >/dev/null
    exit 1
fi

echo "$hash  $asset" > "$OUTPUT_DIR/$asset.sha256"
popd >/dev/null

if [ "$cleanup_browsers" = true ]; then
    rm -rf "$BROWSERS_PATH"
fi

echo "Output:"
echo "  $OUTPUT_DIR/$asset"
echo "  $OUTPUT_DIR/$asset.sha256"
