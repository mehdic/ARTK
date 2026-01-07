#!/bin/bash
#
# Apply patches from Company PC to Home PC
# Usage: ./apply-patches.sh
#
# This script:
# 1. Checks for patch files in ./patches/
# 2. Applies them using git am
# 3. Pushes to GitHub
# 4. Archives applied patches
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

PATCHES_DIR="./patches"
ARCHIVE_DIR="./patches/.applied"

echo -e "${CYAN}╔════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     ARTK Patch Application Script         ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════╝${NC}"
echo ""

# Check if patches directory exists
if [ ! -d "$PATCHES_DIR" ]; then
    echo -e "${RED}Error: patches/ directory not found${NC}"
    echo "No patches to apply."
    exit 0
fi

# Find patch files
PATCH_FILES=$(find "$PATCHES_DIR" -maxdepth 1 -name "*.patch" -type f 2>/dev/null | sort)

if [ -z "$PATCH_FILES" ]; then
    echo -e "${GREEN}✓ No new patches to apply${NC}"
    exit 0
fi

# Count patches
PATCH_COUNT=$(echo "$PATCH_FILES" | wc -l | tr -d ' ')
echo -e "${YELLOW}Found $PATCH_COUNT patch file(s) to apply:${NC}"
echo "$PATCH_FILES" | while read -r patch; do
    echo "  - $(basename "$patch")"
done
echo ""

# Check git status
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${RED}Error: Working directory not clean${NC}"
    echo "Please commit or stash your changes first."
    git status --short
    exit 1
fi

# Pull latest changes
echo -e "${CYAN}Pulling latest changes from remote...${NC}"
git pull

# Apply patches
echo -e "${CYAN}Applying patches...${NC}"
if git am "$PATCHES_DIR"/*.patch; then
    echo -e "${GREEN}✓ All patches applied successfully${NC}"
else
    echo -e "${RED}Error: Patch application failed${NC}"
    echo ""
    echo "To see the failed patch:"
    echo "  git am --show-current-patch"
    echo ""
    echo "To abort:"
    echo "  git am --abort"
    exit 1
fi

# Show what was applied
echo ""
echo -e "${CYAN}Applied commits:${NC}"
git log --oneline -${PATCH_COUNT}
echo ""

# Push to remote
echo -e "${CYAN}Pushing to GitHub...${NC}"
git push

echo ""
echo -e "${GREEN}✓ Patches applied and pushed successfully!${NC}"
echo ""

# Delete applied patches
echo -e "${CYAN}Cleaning up patches...${NC}"

echo "$PATCH_FILES" | while read -r patch; do
    rm "$patch"
    echo "  → Deleted $(basename "$patch")"
done

# Delete README.txt if present
if [ -f "$PATCHES_DIR/README.txt" ]; then
    rm "$PATCHES_DIR/README.txt"
    echo "  → Deleted README.txt"
fi

echo -e "${GREEN}✓ Patches cleaned up${NC}"
echo ""

echo -e "${CYAN}╔════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║           All Done! ✓                      ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════╝${NC}"
