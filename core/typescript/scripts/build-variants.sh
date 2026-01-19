#!/bin/bash
#
# ARTK Multi-Variant Build Script
# Builds all 4 variants: modern-esm, modern-cjs, legacy-16, legacy-14
#
# Usage: ./scripts/build-variants.sh [--variant <variant>] [--clean]
#
# Options:
#   --variant <name>   Build only a specific variant (modern-esm|modern-cjs|legacy-16|legacy-14)
#   --clean            Clean dist directories before building
#   --parallel         Build variants in parallel (faster but uses more CPU)
#   --help             Show this help message
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
AUTOGEN_DIR="$PROJECT_DIR/autogen"

cd "$PROJECT_DIR"

# Parse arguments
VARIANT=""
CLEAN=false
PARALLEL=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --variant)
            VARIANT="$2"
            shift 2
            ;;
        --clean)
            CLEAN=true
            shift
            ;;
        --parallel)
            PARALLEL=true
            shift
            ;;
        --help)
            echo "ARTK Multi-Variant Build Script"
            echo ""
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --variant <name>   Build only a specific variant"
            echo "                     Values: modern-esm, modern-cjs, legacy-16, legacy-14"
            echo "  --clean            Clean dist directories before building"
            echo "  --parallel         Build variants in parallel"
            echo "  --help             Show this help message"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Validate variant if specified
if [ -n "$VARIANT" ]; then
    case $VARIANT in
        modern-esm|modern-cjs|legacy-16|legacy-14)
            ;;
        *)
            echo -e "${RED}Invalid variant: $VARIANT${NC}"
            echo "Valid variants: modern-esm, modern-cjs, legacy-16, legacy-14"
            exit 1
            ;;
    esac
fi

# Clean if requested
if [ "$CLEAN" = true ]; then
    echo -e "${YELLOW}Cleaning dist directories...${NC}"
    rm -rf dist dist-cjs dist-legacy-16 dist-legacy-14
    if [ -d "$AUTOGEN_DIR" ]; then
        echo -e "${YELLOW}Cleaning autogen dist directories...${NC}"
        cd "$AUTOGEN_DIR"
        rm -rf dist dist-cjs dist-legacy-16 dist-legacy-14
        cd "$PROJECT_DIR"
    fi
fi

# Track build times
START_TIME=$(date +%s)

build_variant() {
    local variant="$1"
    local start=$(date +%s)

    # Build core package
    case $variant in
        modern-esm)
            echo -e "${CYAN}Building modern-esm variant (tsup → dist/)...${NC}"
            npm run build
            ;;
        modern-cjs)
            echo -e "${CYAN}Building modern-cjs variant (tsc → dist-cjs/)...${NC}"
            npm run build:cjs
            ;;
        legacy-16)
            echo -e "${CYAN}Building legacy-16 variant (tsc → dist-legacy-16/)...${NC}"
            npm run build:legacy-16
            ;;
        legacy-14)
            echo -e "${CYAN}Building legacy-14 variant (tsc → dist-legacy-14/)...${NC}"
            npm run build:legacy-14
            ;;
    esac

    # Build autogen package for the same variant
    if [ -d "$AUTOGEN_DIR" ]; then
        echo -e "${CYAN}Building autogen $variant variant...${NC}"
        cd "$AUTOGEN_DIR"
        case $variant in
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
        cd "$PROJECT_DIR"
    fi

    local end=$(date +%s)
    local duration=$((end - start))
    echo -e "${GREEN}✓ $variant (core + autogen) built in ${duration}s${NC}"
}

if [ -n "$VARIANT" ]; then
    # Build single variant
    build_variant "$VARIANT"
else
    # Build all variants
    echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║       ARTK Multi-Variant Build             ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
    echo ""

    if [ "$PARALLEL" = true ]; then
        echo -e "${YELLOW}Building all 4 variants in parallel...${NC}"
        echo ""

        # Run builds in parallel
        npm run build &
        PID_ESM=$!

        npm run build:cjs &
        PID_CJS=$!

        npm run build:legacy-16 &
        PID_L16=$!

        npm run build:legacy-14 &
        PID_L14=$!

        # Wait for all to complete
        wait $PID_ESM && echo -e "${GREEN}✓ modern-esm complete${NC}" || echo -e "${RED}✗ modern-esm failed${NC}"
        wait $PID_CJS && echo -e "${GREEN}✓ modern-cjs complete${NC}" || echo -e "${RED}✗ modern-cjs failed${NC}"
        wait $PID_L16 && echo -e "${GREEN}✓ legacy-16 complete${NC}" || echo -e "${RED}✗ legacy-16 failed${NC}"
        wait $PID_L14 && echo -e "${GREEN}✓ legacy-14 complete${NC}" || echo -e "${RED}✗ legacy-14 failed${NC}"
    else
        echo -e "${YELLOW}Building all 4 variants sequentially...${NC}"
        echo ""

        build_variant "modern-esm"
        build_variant "modern-cjs"
        build_variant "legacy-16"
        build_variant "legacy-14"
    fi
fi

# Summary
END_TIME=$(date +%s)
TOTAL_TIME=$((END_TIME - START_TIME))

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║       Build Complete                       ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}Outputs:${NC}"
[ -d "dist" ] && echo "  dist/              - Modern ESM (Node 18+, ESM)"
[ -d "dist-cjs" ] && echo "  dist-cjs/          - Modern CJS (Node 18+, CommonJS)"
[ -d "dist-legacy-16" ] && echo "  dist-legacy-16/    - Legacy 16 (Node 16+, Playwright 1.49)"
[ -d "dist-legacy-14" ] && echo "  dist-legacy-14/    - Legacy 14 (Node 14+, Playwright 1.33)"
echo ""
echo -e "${CYAN}Total build time: ${TOTAL_TIME}s${NC}"

# Check if we're within the 5-minute requirement
if [ "$TOTAL_TIME" -gt 300 ]; then
    echo -e "${YELLOW}⚠️  Build exceeded 5-minute target (${TOTAL_TIME}s > 300s)${NC}"
else
    echo -e "${GREEN}✓ Build within 5-minute target${NC}"
fi
