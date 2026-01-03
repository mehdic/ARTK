#!/bin/bash
#
# ARTK Prompts Installation Script
# Usage: ./install-prompts.sh /path/to/target-project
#
# Installs everything needed for ARTK prompts to work:
# 1. Copies prompt files to .github/prompts/
# 2. Bundles @artk/core to .artk/core/ so /init can use it
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Get the directory where this script lives
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ARTK_ROOT="$(dirname "$SCRIPT_DIR")"
PROMPTS_SOURCE="$ARTK_ROOT/prompts"
ARTK_CORE_SOURCE="$ARTK_ROOT/core/typescript"

# Check arguments
if [ -z "$1" ]; then
    echo -e "${RED}Error: Target project path required${NC}"
    echo ""
    echo "Usage: $0 /path/to/target-project"
    echo ""
    echo "Example:"
    echo "  $0 ~/projects/my-app"
    echo "  $0 ."
    exit 1
fi

TARGET_PROJECT="$(cd "$1" 2>/dev/null && pwd)" || {
    echo -e "${RED}Error: Target directory does not exist: $1${NC}"
    exit 1
}

echo -e "${GREEN}ARTK Prompts Installation${NC}"
echo "================================"
echo "Source: $PROMPTS_SOURCE"
echo "Target: $TARGET_PROJECT/.github/prompts/"
echo ""

# Check source prompts exist
if [ ! -d "$PROMPTS_SOURCE" ]; then
    echo -e "${RED}Error: Prompts directory not found: $PROMPTS_SOURCE${NC}"
    exit 1
fi

# Create target directory
PROMPTS_TARGET="$TARGET_PROJECT/.github/prompts"
echo -e "${YELLOW}Creating prompts directory...${NC}"
mkdir -p "$PROMPTS_TARGET"

# Copy prompt files
echo -e "${YELLOW}Copying ARTK prompt files...${NC}"
echo ""

count=0
for file in "$PROMPTS_SOURCE"/artk.*.md; do
    if [ -f "$file" ]; then
        filename=$(basename "$file")
        # Convert artk.command.md to artk.command.prompt.md for Copilot
        newname="${filename%.md}.prompt.md"
        cp "$file" "$PROMPTS_TARGET/$newname"
        echo -e "  ${CYAN}✓${NC} $newname"
        ((count++))
    fi
done


echo ""

# Bundle @artk/core so /init prompt can use it
echo -e "${YELLOW}Bundling @artk/core...${NC}"

# Build if needed
if [ ! -d "$ARTK_CORE_SOURCE/dist" ]; then
    echo -e "${YELLOW}Building @artk/core (dist not found)...${NC}"
    cd "$ARTK_CORE_SOURCE"
    npm install
    npm run build
fi

# Copy to .artk/core/
CORE_TARGET="$TARGET_PROJECT/.artk/core"
mkdir -p "$CORE_TARGET"
cp -r "$ARTK_CORE_SOURCE/dist" "$CORE_TARGET/"
cp "$ARTK_CORE_SOURCE/package.json" "$CORE_TARGET/"
cp "$ARTK_CORE_SOURCE/version.json" "$CORE_TARGET/" 2>/dev/null || true
cp "$ARTK_CORE_SOURCE/README.md" "$CORE_TARGET/" 2>/dev/null || true
echo -e "  ${CYAN}✓${NC} @artk/core bundled to .artk/core/"

# Bundle @artk/core-autogen
echo -e "${YELLOW}Bundling @artk/core-autogen...${NC}"
AUTOGEN_SOURCE="$ARTK_ROOT/core/typescript/autogen"

# Build autogen if needed
if [ ! -d "$AUTOGEN_SOURCE/dist" ]; then
    echo -e "${YELLOW}Building @artk/core-autogen (dist not found)...${NC}"
    cd "$AUTOGEN_SOURCE"
    npm install
    npm run build
fi

# Copy to .artk/autogen/
AUTOGEN_TARGET="$TARGET_PROJECT/.artk/autogen"
mkdir -p "$AUTOGEN_TARGET"
cp -r "$AUTOGEN_SOURCE/dist" "$AUTOGEN_TARGET/"
cp "$AUTOGEN_SOURCE/package.json" "$AUTOGEN_TARGET/"
cp "$AUTOGEN_SOURCE/README.md" "$AUTOGEN_TARGET/" 2>/dev/null || true
echo -e "  ${CYAN}✓${NC} @artk/core-autogen bundled to .artk/autogen/"

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║      ARTK Installation Complete!           ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}Installed:${NC}"
echo "  .github/prompts/  - $count Copilot prompts"
echo "  .artk/core/       - @artk/core library"
echo "  .artk/autogen/    - @artk/core-autogen CLI"
echo ""
echo -e "${CYAN}Next step:${NC}"
echo "  Open VS Code, launch Copilot Chat, and run: /artk.init"
echo ""
echo -e "${CYAN}Available commands:${NC}"
for file in "$PROMPTS_TARGET"/*.prompt.md; do
    if [ -f "$file" ]; then
        filename=$(basename "$file" .prompt.md)
        echo "  /$filename"
    fi
done
echo ""
