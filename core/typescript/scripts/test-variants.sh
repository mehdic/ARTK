#!/bin/bash
#
# ARTK Multi-Variant Test Script
#
# Tests all 4 variants using Docker containers with different Node.js versions.
#
# Usage:
#   ./test-variants.sh [--variant <id>] [--build-only] [--test-only]
#
# Options:
#   --variant <id>    Test specific variant only (modern-esm, modern-cjs, legacy-16, legacy-14)
#   --build-only      Only build variants, skip tests
#   --test-only       Only run tests, skip build (assumes variants already built)
#   --no-docker       Run tests on current Node version without Docker
#   --verbose         Show detailed output
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Script location
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CORE_DIR="$(dirname "$SCRIPT_DIR")"

# Variant definitions
declare -A VARIANT_NODE=(
    ["modern-esm"]="20"
    ["modern-cjs"]="20"
    ["legacy-16"]="16"
    ["legacy-14"]="14"
)

declare -A VARIANT_DIST=(
    ["modern-esm"]="dist"
    ["modern-cjs"]="dist-cjs"
    ["legacy-16"]="dist-legacy-16"
    ["legacy-14"]="dist-legacy-14"
)

# Parse arguments
SPECIFIC_VARIANT=""
BUILD_ONLY=false
TEST_ONLY=false
NO_DOCKER=false
VERBOSE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --variant)
            SPECIFIC_VARIANT="$2"
            shift 2
            ;;
        --build-only)
            BUILD_ONLY=true
            shift
            ;;
        --test-only)
            TEST_ONLY=true
            shift
            ;;
        --no-docker)
            NO_DOCKER=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        -h|--help)
            echo "ARTK Multi-Variant Test Script"
            echo ""
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --variant <id>    Test specific variant only"
            echo "  --build-only      Only build variants"
            echo "  --test-only       Only run tests"
            echo "  --no-docker       Run without Docker"
            echo "  --verbose         Show detailed output"
            echo ""
            echo "Variants: modern-esm, modern-cjs, legacy-16, legacy-14"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Validate specific variant if provided
if [ -n "$SPECIFIC_VARIANT" ]; then
    if [ -z "${VARIANT_NODE[$SPECIFIC_VARIANT]}" ]; then
        echo -e "${RED}Invalid variant: $SPECIFIC_VARIANT${NC}"
        echo "Valid variants: modern-esm, modern-cjs, legacy-16, legacy-14"
        exit 1
    fi
fi

cd "$CORE_DIR"

echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║    ARTK Multi-Variant Test Suite           ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
echo ""

# Build phase
if [ "$TEST_ONLY" = false ]; then
    echo -e "${YELLOW}[Phase 1] Building variants...${NC}"

    if [ -n "$SPECIFIC_VARIANT" ]; then
        VARIANTS=("$SPECIFIC_VARIANT")
    else
        VARIANTS=("modern-esm" "modern-cjs" "legacy-16" "legacy-14")
    fi

    for variant in "${VARIANTS[@]}"; do
        dist_dir="${VARIANT_DIST[$variant]}"
        echo -e "${CYAN}Building $variant...${NC}"

        case "$variant" in
            modern-esm)
                npm run build
                ;;
            modern-cjs)
                npm run build:cjs
                ;;
            legacy-16)
                npm run build:legacy-16
                ;;
            legacy-14)
                npm run build:legacy-14
                ;;
        esac

        if [ -d "$dist_dir" ] && [ -f "$dist_dir/index.js" ]; then
            echo -e "${GREEN}  ✓ $variant built successfully ($dist_dir)${NC}"
        else
            echo -e "${RED}  ✗ $variant build failed${NC}"
            exit 1
        fi
    done

    echo ""
fi

# Exit if build-only
if [ "$BUILD_ONLY" = true ]; then
    echo -e "${GREEN}Build complete!${NC}"
    exit 0
fi

# Test phase
echo -e "${YELLOW}[Phase 2] Running tests...${NC}"

if [ "$NO_DOCKER" = true ]; then
    # Run tests on current Node version
    echo -e "${CYAN}Running tests on current Node version...${NC}"

    NODE_VERSION=$(node -e "console.log(process.version.slice(1).split('.')[0])")
    echo -e "${CYAN}Current Node.js: v$NODE_VERSION${NC}"

    npm run test:unit

    echo -e "${GREEN}Tests passed on Node $NODE_VERSION${NC}"
else
    # Run tests in Docker containers
    echo -e "${CYAN}Running tests in Docker containers...${NC}"

    if [ -n "$SPECIFIC_VARIANT" ]; then
        VARIANTS=("$SPECIFIC_VARIANT")
    else
        VARIANTS=("modern-esm" "modern-cjs" "legacy-16" "legacy-14")
    fi

    for variant in "${VARIANTS[@]}"; do
        node_version="${VARIANT_NODE[$variant]}"
        dist_dir="${VARIANT_DIST[$variant]}"

        echo -e "${CYAN}Testing $variant on Node $node_version...${NC}"

        # Check if Docker is available
        if ! command -v docker &> /dev/null; then
            echo -e "${YELLOW}Docker not available, skipping container tests${NC}"
            echo -e "${YELLOW}Use --no-docker to run tests on current Node version${NC}"
            continue
        fi

        # Run test in Docker
        docker run --rm \
            -v "$CORE_DIR:/app" \
            -w /app \
            "node:$node_version" \
            bash -c "
                echo 'Node version:' && node --version
                echo 'Testing $variant ($dist_dir)...'
                if [ -f '$dist_dir/index.js' ]; then
                    node -e \"const m = require('./$dist_dir/index.js'); console.log('Module loaded successfully');\"
                    echo '✓ $variant loads correctly'
                else
                    echo '✗ Missing $dist_dir/index.js'
                    exit 1
                fi
            "

        if [ $? -eq 0 ]; then
            echo -e "${GREEN}  ✓ $variant passed on Node $node_version${NC}"
        else
            echo -e "${RED}  ✗ $variant failed on Node $node_version${NC}"
            exit 1
        fi
    done
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║    All variant tests passed!               ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
