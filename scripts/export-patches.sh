#!/bin/bash
#
# Export local commits as patches for syncing to another PC
# Usage: ./export-patches.sh [output_dir]
#
# This script exports all commits that exist locally but not on origin/main
# as patch files, ready to be synced and applied on another PC.
#

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Default output directory
OUTPUT_DIR="${1:-./patches}"

echo -e "${CYAN}╔════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     ARTK Patch Export Script               ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════╝${NC}"
echo ""

# Get current branch
BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo -e "${CYAN}Current branch:${NC} $BRANCH"

# Check if we have upstream
if ! git rev-parse --verify origin/$BRANCH >/dev/null 2>&1; then
    echo -e "${YELLOW}Warning: No upstream branch origin/$BRANCH${NC}"
    UPSTREAM="origin/main"
else
    UPSTREAM="origin/$BRANCH"
fi

# Count commits ahead
COMMITS_AHEAD=$(git rev-list --count $UPSTREAM..HEAD 2>/dev/null || echo "0")

if [ "$COMMITS_AHEAD" = "0" ]; then
    echo -e "${GREEN}✓ No local commits to export (already pushed)${NC}"
    exit 0
fi

echo -e "${YELLOW}Found $COMMITS_AHEAD local commit(s) to export${NC}"
echo ""

# Show commits that will be exported
echo -e "${CYAN}Commits to export:${NC}"
git log --oneline $UPSTREAM..HEAD
echo ""

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Export patches
echo -e "${CYAN}Exporting patches to: $OUTPUT_DIR${NC}"
git format-patch $UPSTREAM -o "$OUTPUT_DIR"

# Create README
TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")
cat > "$OUTPUT_DIR/README.txt" << EOF
ARTK Patch Export
===============

Created:  $TIMESTAMP
Branch:   $BRANCH
Upstream: $UPSTREAM
Commits:  $COMMITS_AHEAD
Output:   $OUTPUT_DIR

Patch files:
$(find "$OUTPUT_DIR" -name "*.patch" -type f | sed 's/^/  - /')

Apply on another PC:
  1) Sync this folder to the other PC (your sync tool handles this)
  2) In the repo on the other PC:
       ./scripts/apply-patches.sh
     Or manually:
       git am patches/*.patch
       git push

If git am fails, abort with:
  git am --abort
EOF

echo ""
echo -e "${GREEN}✓ Exported $COMMITS_AHEAD patch(es)${NC}"
echo ""
echo -e "${CYAN}Next steps:${NC}"
echo "  1. Your sync tool will sync the patches folder to Home PC"
echo "  2. On Home PC, run: ./scripts/apply-patches.sh"
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         Export Complete! ✓                 ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
